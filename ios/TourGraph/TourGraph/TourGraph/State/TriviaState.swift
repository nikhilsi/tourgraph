import Foundation
import os

private let logger = Logger(subsystem: "ai.tourgraph", category: "trivia-state")

/// Manages trivia game state: daily challenge progress, streaks, Travel IQ.
/// Persists to UserDefaults for cross-session continuity.
@Observable @MainActor
final class TriviaState {
    let service: TriviaService

    // Daily challenge
    var dailyQuestions: [TriviaQuestion] = []
    var dailyDate: String = ""
    var currentQuestionIndex: Int = 0
    var answers: [TriviaAnswerResult] = []
    var isLoading = false
    var loadError: String?
    var dailyCompleted = false
    var stats: TriviaStatsResponse?

    // Practice
    var practiceQuestion: TriviaQuestion?
    var practiceAnswer: TriviaAnswerResult?
    var practiceLoading = false

    // Persisted
    var currentStreak: Int {
        didSet { UserDefaults.standard.set(currentStreak, forKey: "trivia.streak") }
    }
    var longestStreak: Int {
        didSet { UserDefaults.standard.set(longestStreak, forKey: "trivia.longestStreak") }
    }
    var totalPoints: Int {
        didSet { UserDefaults.standard.set(totalPoints, forKey: "trivia.totalPoints") }
    }
    var totalGamesPlayed: Int {
        didSet { UserDefaults.standard.set(totalGamesPlayed, forKey: "trivia.gamesPlayed") }
    }
    var lastPlayedDate: String {
        didSet { UserDefaults.standard.set(lastPlayedDate, forKey: "trivia.lastPlayed") }
    }

    // Session hash for anonymous scoring (stable per device install)
    private let sessionHash: String

    init(service: TriviaService? = nil) {
        self.service = service ?? TriviaService()
        self.currentStreak = UserDefaults.standard.integer(forKey: "trivia.streak")
        self.longestStreak = UserDefaults.standard.integer(forKey: "trivia.longestStreak")
        self.totalPoints = UserDefaults.standard.integer(forKey: "trivia.totalPoints")
        self.totalGamesPlayed = UserDefaults.standard.integer(forKey: "trivia.gamesPlayed")
        self.lastPlayedDate = UserDefaults.standard.string(forKey: "trivia.lastPlayed") ?? ""

        // Generate or retrieve stable session hash
        if let existing = UserDefaults.standard.string(forKey: "trivia.sessionHash") {
            self.sessionHash = existing
        } else {
            let hash = UUID().uuidString.prefix(16).lowercased()
            UserDefaults.standard.set(String(hash), forKey: "trivia.sessionHash")
            self.sessionHash = String(hash)
        }
    }

    var todayUTC: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.timeZone = TimeZone(identifier: "UTC")
        return formatter.string(from: Date())
    }

    var hasPlayedToday: Bool {
        lastPlayedDate == todayUTC
    }

    var currentQuestion: TriviaQuestion? {
        guard currentQuestionIndex < dailyQuestions.count else { return nil }
        return dailyQuestions[currentQuestionIndex]
    }

    var score: Int {
        answers.filter(\.correct).count
    }

    var travelIQ: TravelIQLevel {
        TravelIQLevel.forPoints(totalPoints)
    }

    var streakEmoji: String {
        switch currentStreak {
        case 0: ""
        case 1...2: "1"
        case 3...6: "3"
        case 7...13: "7"
        case 14...29: "14"
        case 30...59: "30"
        case 60...99: "60"
        default: "100"
        }
    }

    // MARK: - Daily Challenge Flow

    func loadDaily() async {
        guard !isLoading else { return }

        // If already played today, restore completed state
        if hasPlayedToday && !dailyQuestions.isEmpty {
            return
        }

        isLoading = true
        loadError = nil

        do {
            let response = try await service.fetchDaily()
            dailyQuestions = response.questions
            dailyDate = response.date
            currentQuestionIndex = 0
            answers = []
            dailyCompleted = hasPlayedToday
            isLoading = false
        } catch {
            loadError = "Couldn't load today's questions. Check your connection."
            isLoading = false
            logger.error("Failed to load daily: \(error.localizedDescription)")
        }
    }

    func submitAnswer(selectedIndex: Int) async {
        guard let question = currentQuestion else { return }

        do {
            let response = try await service.submitAnswer(
                questionId: question.id,
                selectedIndex: selectedIndex
            )

            let result = TriviaAnswerResult(
                id: question.id,
                selectedIndex: selectedIndex,
                correct: response.correct,
                correctIndex: response.correctIndex,
                reveal: response.reveal
            )
            answers.append(result)
        } catch {
            logger.error("Failed to submit answer: \(error.localizedDescription)")
            // Fail gracefully — mark wrong so the game can continue
            let result = TriviaAnswerResult(
                id: question.id,
                selectedIndex: selectedIndex,
                correct: false,
                correctIndex: -1,
                reveal: TriviaReveal(fact: "Couldn't verify your answer. Moving on!", imageUrl: nil, imageUrls: nil)
            )
            answers.append(result)
        }
    }

    func advanceToNext() {
        if currentQuestionIndex + 1 < dailyQuestions.count {
            currentQuestionIndex += 1
        } else {
            completeDaily()
        }
    }

    private func completeDaily() {
        dailyCompleted = true
        lastPlayedDate = dailyDate

        // Update streak
        let yesterday = Calendar.current.date(byAdding: .day, value: -1, to: Date())!
        let yesterdayFormatter = DateFormatter()
        yesterdayFormatter.dateFormat = "yyyy-MM-dd"
        yesterdayFormatter.timeZone = TimeZone(identifier: "UTC")
        let yesterdayStr = yesterdayFormatter.string(from: yesterday)

        let previousLastPlayed = UserDefaults.standard.string(forKey: "trivia.lastPlayed.previous") ?? ""
        if previousLastPlayed == yesterdayStr {
            currentStreak += 1
        } else {
            currentStreak = 1
        }
        UserDefaults.standard.set(dailyDate, forKey: "trivia.lastPlayed.previous")

        if currentStreak > longestStreak {
            longestStreak = currentStreak
        }

        // Points: 10 per correct answer + streak bonus
        let streakBonus = min(currentStreak, 10) // Cap bonus at 10
        totalPoints += (score * 10) + streakBonus
        totalGamesPlayed += 1

        // Submit to server (fire and forget)
        let answersPayload = answers.map { answer -> [String: Any] in
            ["questionId": answer.id, "correct": answer.correct, "answeredOption": answer.selectedIndex]
        }

        Task {
            await service.submitScore(
                date: dailyDate,
                score: score,
                sessionHash: sessionHash,
                answers: answersPayload
            )

            // Fetch stats after submitting
            if let fetchedStats = try? await service.fetchStats(date: dailyDate, score: score) {
                stats = fetchedStats
            }
        }
    }

    // MARK: - Practice Mode

    func loadPracticeQuestion(format: String? = nil) async {
        practiceLoading = true
        practiceAnswer = nil

        do {
            practiceQuestion = try await service.fetchPractice(format: format)
        } catch {
            logger.error("Failed to load practice: \(error.localizedDescription)")
        }

        practiceLoading = false
    }

    func submitPracticeAnswer(selectedIndex: Int) async {
        guard let question = practiceQuestion else { return }

        do {
            let response = try await service.submitAnswer(
                questionId: question.id,
                selectedIndex: selectedIndex
            )
            practiceAnswer = TriviaAnswerResult(
                id: question.id,
                selectedIndex: selectedIndex,
                correct: response.correct,
                correctIndex: response.correctIndex,
                reveal: response.reveal
            )

            // Award points for practice too (5 per correct)
            if response.correct {
                totalPoints += 5
            }
        } catch {
            logger.error("Failed to submit practice answer: \(error.localizedDescription)")
        }
    }

    // MARK: - Share Text

    var shareText: String {
        let emoji = answers.map { $0.correct ? "+" : "-" }
        return "TourGraph Daily \(dailyDate)\n\(score)/5 \(emoji.joined())\n\nPlay at tourgraph.ai"
    }
}
