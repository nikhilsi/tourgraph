import Foundation
import os

private let logger = Logger(subsystem: "ai.tourgraph", category: "trivia")

/// API client for trivia endpoints. All calls go to tourgraph.ai/api/v1/trivia/*.
@Observable @MainActor
final class TriviaService {
    private let baseURL: URL
    private let decoder: JSONDecoder

    init(baseURL: URL = URL(string: "https://tourgraph.ai")!) {
        self.baseURL = baseURL
        self.decoder = JSONDecoder()
    }

    // MARK: - Daily Challenge

    func fetchDaily() async throws -> TriviaDailyResponse {
        let url = baseURL.appendingPathComponent("api/v1/trivia/daily")
        let (data, _) = try await URLSession.shared.data(from: url)
        return try decoder.decode(TriviaDailyResponse.self, from: data)
    }

    // MARK: - Submit Answer

    func submitAnswer(questionId: Int, selectedIndex: Int) async throws -> TriviaAnswerResponse {
        let url = baseURL.appendingPathComponent("api/v1/trivia/answer")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body: [String: Any] = ["questionId": questionId, "selectedIndex": selectedIndex]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, _) = try await URLSession.shared.data(for: request)
        return try decoder.decode(TriviaAnswerResponse.self, from: data)
    }

    // MARK: - Submit Score

    func submitScore(date: String, score: Int, sessionHash: String, answers: [[String: Any]]) async {
        let url = baseURL.appendingPathComponent("api/v1/trivia/score")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body: [String: Any] = [
            "date": date,
            "score": score,
            "sessionHash": sessionHash,
            "answers": answers
        ]

        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
            let (_, response) = try await URLSession.shared.data(for: request)
            if let http = response as? HTTPURLResponse, http.statusCode == 409 {
                logger.debug("Score already submitted for \(date)")
            }
        } catch {
            logger.error("Failed to submit score: \(error.localizedDescription)")
        }
    }

    // MARK: - Stats

    func fetchStats(date: String, score: Int? = nil) async throws -> TriviaStatsResponse {
        var components = URLComponents(url: baseURL.appendingPathComponent("api/v1/trivia/stats"), resolvingAgainstBaseURL: false)!
        var items = [URLQueryItem(name: "date", value: date)]
        if let score { items.append(URLQueryItem(name: "score", value: String(score))) }
        components.queryItems = items

        let (data, _) = try await URLSession.shared.data(from: components.url!)
        return try decoder.decode(TriviaStatsResponse.self, from: data)
    }

    // MARK: - Practice

    func fetchPractice(format: String? = nil) async throws -> TriviaQuestion {
        var components = URLComponents(url: baseURL.appendingPathComponent("api/v1/trivia/practice"), resolvingAgainstBaseURL: false)!
        if let format {
            components.queryItems = [URLQueryItem(name: "format", value: format)]
        }

        let (data, _) = try await URLSession.shared.data(from: components.url!)
        return try decoder.decode(TriviaQuestion.self, from: data)
    }
}
