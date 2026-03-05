import Foundation

enum SuperlativeType: String, CaseIterable, Sendable {
    case mostExpensive = "most-expensive"
    case cheapest5Star = "cheapest-5star"
    case longest
    case shortest
    case mostReviewed = "most-reviewed"
    case hiddenGem = "hidden-gem"

    var displayTitle: String {
        switch self {
        case .mostExpensive: "Most Expensive"
        case .cheapest5Star: "Cheapest 5-Star"
        case .longest: "Longest"
        case .shortest: "Shortest"
        case .mostReviewed: "Most Reviewed"
        case .hiddenGem: "Hidden Gem"
        }
    }

    var emoji: String {
        switch self {
        case .mostExpensive: "💎"
        case .cheapest5Star: "🏷️"
        case .longest: "⏳"
        case .shortest: "⚡"
        case .mostReviewed: "🗣️"
        case .hiddenGem: "🌟"
        }
    }

    var statLabel: String {
        switch self {
        case .mostExpensive: "price"
        case .cheapest5Star: "price"
        case .longest: "duration"
        case .shortest: "duration"
        case .mostReviewed: "reviews"
        case .hiddenGem: "rating"
        }
    }
}

struct SuperlativeResult: Identifiable, Sendable {
    let type: SuperlativeType
    let tour: Tour
    var id: String { type.rawValue }
}
