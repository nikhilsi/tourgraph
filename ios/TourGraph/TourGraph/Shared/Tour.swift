import Foundation
import GRDB

/// Core tour model — maps directly to the `tours` SQLite table.
struct Tour: Identifiable, Codable, FetchableRecord, Sendable {
    let id: Int
    let productCode: String
    let title: String
    let oneLiner: String?
    let description: String?
    let destinationId: String?
    let destinationName: String?
    let country: String?
    let continent: String?
    let timezone: String?
    let latitude: Double?
    let longitude: Double?
    let rating: Double?
    let reviewCount: Int?
    let fromPrice: Double?
    let currency: String?
    let durationMinutes: Int?
    let imageUrl: String?
    let imageUrlsJson: String?
    let highlightsJson: String?
    let inclusionsJson: String?
    let viatorUrl: String?
    let supplierName: String?
    let weightCategory: String?

    // MARK: - Column mapping (snake_case DB → camelCase Swift)

    enum CodingKeys: String, CodingKey, ColumnExpression {
        case id
        case productCode = "product_code"
        case title
        case oneLiner = "one_liner"
        case description
        case destinationId = "destination_id"
        case destinationName = "destination_name"
        case country
        case continent
        case timezone
        case latitude
        case longitude
        case rating
        case reviewCount = "review_count"
        case fromPrice = "from_price"
        case currency
        case durationMinutes = "duration_minutes"
        case imageUrl = "image_url"
        case imageUrlsJson = "image_urls_json"
        case highlightsJson = "highlights_json"
        case inclusionsJson = "inclusions_json"
        case viatorUrl = "viator_url"
        case supplierName = "supplier_name"
        case weightCategory = "weight_category"
    }

    // MARK: - Computed helpers

    var displayPrice: String {
        guard let price = fromPrice else { return "" }
        if price >= 1000 {
            return "$\(Int(price).formatted())"
        }
        return "$\(Int(price))"
    }

    var displayRating: String {
        guard let r = rating else { return "" }
        return String(format: "%.1f", r)
    }

    var displayDuration: String {
        guard let mins = durationMinutes else { return "" }
        if mins >= 1440 {
            let days = mins / 1440
            let remainingHrs = (mins % 1440) / 60
            if remainingHrs > 0 {
                return "\(days)d \(remainingHrs)h"
            }
            return "\(days) day\(days == 1 ? "" : "s")"
        } else if mins >= 60 {
            let hrs = mins / 60
            let remainingMins = mins % 60
            if remainingMins > 0 {
                return "\(hrs)h \(remainingMins)m"
            }
            return "\(hrs) hr\(hrs == 1 ? "" : "s")"
        }
        return "\(mins) min"
    }

    var imageURL: URL? {
        guard let str = imageUrl else { return nil }
        return URL(string: str)
    }

    var viatorURL: URL? {
        guard let str = viatorUrl else { return nil }
        return URL(string: str)
    }

    var highlights: [String] {
        guard let json = highlightsJson,
              let data = json.data(using: .utf8),
              let arr = try? JSONDecoder().decode([String].self, from: data)
        else { return [] }
        return arr
    }

    var imageURLs: [URL] {
        guard let json = imageUrlsJson,
              let data = json.data(using: .utf8),
              let arr = try? JSONDecoder().decode([String].self, from: data)
        else { return [] }
        return arr.compactMap { URL(string: $0) }
    }

    /// Columns needed for card display (roulette hand, superlatives, etc.)
    static let cardColumns: [CodingKeys] = [
        .id, .productCode, .title, .oneLiner, .destinationName, .country,
        .continent, .rating, .reviewCount, .fromPrice, .currency,
        .durationMinutes, .imageUrl, .viatorUrl, .weightCategory
    ]
}
