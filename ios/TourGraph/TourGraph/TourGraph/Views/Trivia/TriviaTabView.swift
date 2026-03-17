import SwiftUI

/// Main trivia tab: daily challenge, practice mode, streak & Travel IQ display.
struct TriviaTabView: View {
    let triviaState: TriviaState
    let settings: AppSettings

    @State private var showPractice = false
    @State private var practiceFormat: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    // Travel IQ + Streak header
                    headerCard

                    // Daily Challenge
                    dailyChallengeSection

                    // Practice Mode
                    practiceSection
                }
                .padding(.horizontal, 20)
                .padding(.vertical, 16)
            }
            .background(Color.black)
            .navigationTitle("Trivia")
            .navigationBarTitleDisplayMode(.large)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .sheet(isPresented: $showPractice) {
                PracticeModeView(triviaState: triviaState, settings: settings, initialFormat: practiceFormat)
            }
            .task {
                await triviaState.loadDaily()
            }
        }
    }

    // MARK: - Header Card

    private var headerCard: some View {
        HStack(spacing: 0) {
            // Travel IQ
            VStack(spacing: 6) {
                Image(systemName: triviaState.travelIQ.icon)
                    .font(.title)
                    .foregroundStyle(.cyan)
                Text(triviaState.travelIQ.title)
                    .font(.headline)
                    .foregroundStyle(.white)
                Text("\(triviaState.totalPoints) pts")
                    .font(.caption)
                    .foregroundStyle(.white.opacity(0.5))
            }
            .frame(maxWidth: .infinity)

            Divider()
                .frame(height: 50)
                .overlay(Color.white.opacity(0.15))

            // Streak
            VStack(spacing: 6) {
                Image(systemName: "flame.fill")
                    .font(.title)
                    .foregroundStyle(triviaState.currentStreak > 0 ? .orange : .white.opacity(0.3))
                Text("\(triviaState.currentStreak)")
                    .font(.headline)
                    .foregroundStyle(.white)
                Text("Day Streak")
                    .font(.caption)
                    .foregroundStyle(.white.opacity(0.5))
            }
            .frame(maxWidth: .infinity)

            Divider()
                .frame(height: 50)
                .overlay(Color.white.opacity(0.15))

            // Games played
            VStack(spacing: 6) {
                Image(systemName: "gamecontroller.fill")
                    .font(.title)
                    .foregroundStyle(.green)
                Text("\(triviaState.totalGamesPlayed)")
                    .font(.headline)
                    .foregroundStyle(.white)
                Text("Played")
                    .font(.caption)
                    .foregroundStyle(.white.opacity(0.5))
            }
            .frame(maxWidth: .infinity)
        }
        .padding(.vertical, 20)
        .background(Color.white.opacity(0.06))
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    }

    // MARK: - Daily Challenge

    private var dailyChallengeSection: some View {
        VStack(spacing: 16) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Daily Challenge")
                        .font(.title2.bold())
                        .foregroundStyle(.white)
                    Text("5 questions, same for everyone")
                        .font(.subheadline)
                        .foregroundStyle(.white.opacity(0.5))
                }
                Spacer()
            }

            if triviaState.isLoading {
                ProgressView()
                    .tint(.white)
                    .frame(maxWidth: .infinity, minHeight: 100)
            } else if let error = triviaState.loadError {
                VStack(spacing: 12) {
                    Image(systemName: "wifi.slash")
                        .font(.title2)
                        .foregroundStyle(.white.opacity(0.4))
                    Text(error)
                        .font(.subheadline)
                        .foregroundStyle(.white.opacity(0.5))
                        .multilineTextAlignment(.center)
                    Button("Try Again") {
                        Task { await triviaState.loadDaily() }
                    }
                    .font(.subheadline.bold())
                    .foregroundStyle(.blue)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 20)
            } else if triviaState.dailyCompleted {
                // Already played today — show results summary
                NavigationLink {
                    TriviaResultsView(triviaState: triviaState, settings: settings)
                } label: {
                    HStack(spacing: 16) {
                        ZStack {
                            Circle()
                                .stroke(Color.white.opacity(0.1), lineWidth: 4)
                                .frame(width: 56, height: 56)
                            Circle()
                                .trim(from: 0, to: CGFloat(triviaState.score) / 5.0)
                                .stroke(scoreColor, style: StrokeStyle(lineWidth: 4, lineCap: .round))
                                .frame(width: 56, height: 56)
                                .rotationEffect(.degrees(-90))
                            Text("\(triviaState.score)/5")
                                .font(.subheadline.bold())
                                .foregroundStyle(.white)
                        }

                        VStack(alignment: .leading, spacing: 4) {
                            Text("Completed!")
                                .font(.headline)
                                .foregroundStyle(.white)
                            Text("Come back tomorrow for a new challenge")
                                .font(.caption)
                                .foregroundStyle(.white.opacity(0.5))
                        }

                        Spacer()

                        Image(systemName: "chevron.right")
                            .font(.caption)
                            .foregroundStyle(.white.opacity(0.3))
                    }
                    .padding(16)
                    .background(Color.white.opacity(0.06))
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                }
            } else if !triviaState.dailyQuestions.isEmpty {
                // Ready to play
                NavigationLink {
                    DailyChallengeView(triviaState: triviaState, settings: settings)
                } label: {
                    HStack(spacing: 14) {
                        Image(systemName: "play.circle.fill")
                            .font(.system(size: 44))
                            .foregroundStyle(.blue)

                        VStack(alignment: .leading, spacing: 4) {
                            Text("Play Today's Challenge")
                                .font(.headline)
                                .foregroundStyle(.white)
                            Text(triviaState.dailyDate)
                                .font(.caption)
                                .foregroundStyle(.white.opacity(0.5))
                        }

                        Spacer()

                        Image(systemName: "chevron.right")
                            .font(.caption)
                            .foregroundStyle(.white.opacity(0.3))
                    }
                    .padding(16)
                    .background(Color.blue.opacity(0.15))
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: 14, style: .continuous)
                            .strokeBorder(Color.blue.opacity(0.3), lineWidth: 1)
                    )
                }
            }
        }
    }

    private var scoreColor: Color {
        switch triviaState.score {
        case 5: .green
        case 4: .cyan
        case 3: .yellow
        case 2: .orange
        default: .red
        }
    }

    // MARK: - Practice Section

    private var practiceSection: some View {
        VStack(spacing: 16) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Practice")
                        .font(.title2.bold())
                        .foregroundStyle(.white)
                    Text("Unlimited questions, no pressure")
                        .font(.subheadline)
                        .foregroundStyle(.white.opacity(0.5))
                }
                Spacer()
            }

            // Quick play button
            Button {
                practiceFormat = nil
                showPractice = true
            } label: {
                HStack(spacing: 14) {
                    Image(systemName: "shuffle")
                        .font(.title3)
                        .foregroundStyle(.purple)
                        .frame(width: 36)

                    VStack(alignment: .leading, spacing: 2) {
                        Text("Random Question")
                            .font(.headline)
                            .foregroundStyle(.white)
                        Text("Any format, surprise me")
                            .font(.caption)
                            .foregroundStyle(.white.opacity(0.5))
                    }

                    Spacer()

                    Image(systemName: "chevron.right")
                        .font(.caption)
                        .foregroundStyle(.white.opacity(0.3))
                }
                .padding(14)
                .background(Color.white.opacity(0.06))
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            }

            // Format-specific buttons
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                ForEach(TriviaFormat.allCases, id: \.rawValue) { format in
                    Button {
                        practiceFormat = format.rawValue
                        showPractice = true
                    } label: {
                        VStack(spacing: 8) {
                            Image(systemName: format.icon)
                                .font(.title3)
                                .foregroundStyle(.white.opacity(0.7))
                            Text(format.displayName)
                                .font(.caption.bold())
                                .foregroundStyle(.white.opacity(0.8))
                                .lineLimit(1)
                                .minimumScaleFactor(0.8)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(Color.white.opacity(0.06))
                        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                    }
                }
            }
        }
    }
}

// MARK: - Daily Challenge Flow

struct DailyChallengeView: View {
    let triviaState: TriviaState
    let settings: AppSettings

    var body: some View {
        Group {
            if triviaState.dailyCompleted {
                TriviaResultsView(triviaState: triviaState, settings: settings)
            } else if let question = triviaState.currentQuestion {
                TriviaQuestionView(
                    question: question,
                    questionNumber: triviaState.currentQuestionIndex + 1,
                    totalQuestions: triviaState.dailyQuestions.count,
                    answer: triviaState.answers.count > triviaState.currentQuestionIndex
                        ? triviaState.answers[triviaState.currentQuestionIndex]
                        : nil,
                    onSelect: { index in
                        Task { await triviaState.submitAnswer(selectedIndex: index) }
                    },
                    onContinue: {
                        triviaState.advanceToNext()
                    }
                )
            } else {
                ProgressView()
                    .tint(.white)
            }
        }
        .background(Color.black)
        .navigationBarTitleDisplayMode(.inline)
        .navigationTitle(triviaState.dailyCompleted ? "Results" : "Daily Challenge")
        .toolbarColorScheme(.dark, for: .navigationBar)
    }
}

// MARK: - Practice Mode

struct PracticeModeView: View {
    let triviaState: TriviaState
    let settings: AppSettings
    let initialFormat: String?

    @Environment(\.dismiss) private var dismiss
    @State private var questionCount = 0

    var body: some View {
        NavigationStack {
            Group {
                if triviaState.practiceLoading {
                    VStack(spacing: 16) {
                        ProgressView()
                            .tint(.white)
                        Text("Loading question...")
                            .font(.subheadline)
                            .foregroundStyle(.white.opacity(0.5))
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if let question = triviaState.practiceQuestion {
                    TriviaQuestionView(
                        question: question,
                        questionNumber: questionCount,
                        totalQuestions: 0, // Unlimited — hides "X of Y"
                        answer: triviaState.practiceAnswer,
                        onSelect: { index in
                            Task { await triviaState.submitPracticeAnswer(selectedIndex: index) }
                        },
                        onContinue: {
                            Task {
                                questionCount += 1
                                await triviaState.loadPracticeQuestion(format: initialFormat)
                            }
                        }
                    )
                } else {
                    VStack(spacing: 16) {
                        Image(systemName: "wifi.slash")
                            .font(.title2)
                            .foregroundStyle(.white.opacity(0.4))
                        Text("Couldn't load question")
                            .font(.subheadline)
                            .foregroundStyle(.white.opacity(0.5))
                        Button("Try Again") {
                            Task { await triviaState.loadPracticeQuestion(format: initialFormat) }
                        }
                        .font(.subheadline.bold())
                        .foregroundStyle(.blue)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
            }
            .background(Color.black)
            .navigationTitle("Practice")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                        .foregroundStyle(.white.opacity(0.7))
                }
            }
        }
        .task {
            questionCount = 1
            await triviaState.loadPracticeQuestion(format: initialFormat)
        }
    }
}
