import Foundation

// MARK: - API Response Types

struct TriviaOption: Codable, Identifiable {
    let label: String
    let text: String
    let tourId: Int?

    var id: String { label }

    enum CodingKeys: String, CodingKey {
        case label, text, tourId
    }
}

struct TriviaQuestion: Codable, Identifiable {
    let id: Int
    let format: String
    let question: String
    let options: [TriviaOption]
}

struct TriviaDailyResponse: Codable {
    let date: String
    let questions: [TriviaQuestion]
    let questionCount: Int
}

struct TriviaReveal: Codable, Equatable {
    let fact: String
    let imageUrl: String?
    let imageUrls: [String]?
}

struct TriviaAnswerResponse: Codable {
    let correct: Bool
    let correctIndex: Int
    let reveal: TriviaReveal
}

struct TriviaScoreDistribution: Codable {
    let score: Int
    let count: Int
}

struct TriviaCountryStat: Codable {
    let countryCode: String?
    let players: Int
    let avgScore: Double?

    enum CodingKeys: String, CodingKey {
        case countryCode = "country_code"
        case players, avgScore
    }
}

struct TriviaStatsResponse: Codable {
    let date: String
    let totalPlayers: Int
    let avgScore: Double?
    let maxScore: Int?
    let minScore: Int?
    let distribution: [TriviaScoreDistribution]
    let countryStats: [TriviaCountryStat]
    let percentile: Int?
}

// MARK: - Local Types

struct TriviaAnswerResult: Identifiable, Equatable {
    let id: Int // questionId
    let selectedIndex: Int
    let correct: Bool
    let correctIndex: Int
    let reveal: TriviaReveal
}

enum TriviaFormat: String, CaseIterable {
    case higherOrLower = "higher_or_lower"
    case whereInWorld = "where_in_world"
    case realOrFake = "real_or_fake"
    case numbersGame = "numbers_game"
    case oddOneOut = "odd_one_out"
    case theConnection = "the_connection"
    case cityPersonality = "city_personality"

    var displayName: String {
        switch self {
        case .higherOrLower: "Higher or Lower"
        case .whereInWorld: "Where in the World?"
        case .realOrFake: "Real or Fake?"
        case .numbersGame: "The Numbers Game"
        case .oddOneOut: "Odd One Out"
        case .theConnection: "The Connection"
        case .cityPersonality: "City Personality"
        }
    }

    var icon: String {
        switch self {
        case .higherOrLower: "arrow.up.arrow.down"
        case .whereInWorld: "map"
        case .realOrFake: "questionmark.diamond"
        case .numbersGame: "number"
        case .oddOneOut: "circle.dashed"
        case .theConnection: "link"
        case .cityPersonality: "theatermasks"
        }
    }
}

// MARK: - Travel IQ

enum TravelIQLevel: Int, CaseIterable {
    case tourist = 0
    case explorer = 50
    case adventurer = 150
    case globetrotter = 300
    case worldExpert = 500

    var title: String {
        switch self {
        case .tourist: "Tourist"
        case .explorer: "Explorer"
        case .adventurer: "Adventurer"
        case .globetrotter: "Globetrotter"
        case .worldExpert: "World Expert"
        }
    }

    var icon: String {
        switch self {
        case .tourist: "figure.walk"
        case .explorer: "binoculars"
        case .adventurer: "mountain.2"
        case .globetrotter: "airplane"
        case .worldExpert: "globe.americas"
        }
    }

    static func forPoints(_ points: Int) -> TravelIQLevel {
        for level in Self.allCases.reversed() {
            if points >= level.rawValue { return level }
        }
        return .tourist
    }

    var next: TravelIQLevel? {
        let all = Self.allCases
        guard let idx = all.firstIndex(of: self), idx + 1 < all.count else { return nil }
        return all[idx + 1]
    }
}
