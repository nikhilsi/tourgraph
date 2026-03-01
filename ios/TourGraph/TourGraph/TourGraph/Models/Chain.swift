import Foundation
import GRDB

/// Raw row from the `six_degrees_chains` table.
struct ChainRow: Identifiable, Codable, FetchableRecord, Sendable {
    let id: Int
    let cityFrom: String
    let cityTo: String
    let chainJson: String
    let generatedAt: String?

    enum CodingKeys: String, CodingKey, ColumnExpression {
        case id
        case cityFrom = "city_from"
        case cityTo = "city_to"
        case chainJson = "chain_json"
        case generatedAt = "generated_at"
    }
}

/// One link in a Six Degrees chain.
struct ChainLink: Codable, Sendable {
    let city: String
    let country: String
    let tourTitle: String
    let tourId: Int?
    let connectionToNext: String?
    let theme: String

    enum CodingKeys: String, CodingKey {
        case city, country, theme
        case tourTitle = "tour_title"
        case tourId = "tour_id"
        case connectionToNext = "connection_to_next"
    }
}

/// Parsed chain data from the JSON blob.
struct ChainData: Codable, Sendable {
    let cityFrom: String
    let cityTo: String
    let chain: [ChainLink]
    let summary: String

    enum CodingKeys: String, CodingKey {
        case cityFrom = "city_from"
        case cityTo = "city_to"
        case chain, summary
    }
}

/// Full chain with metadata, ready for display.
struct Chain: Identifiable, Sendable {
    let id: Int
    let cityFrom: String
    let cityTo: String
    let summary: String
    let links: [ChainLink]
    let slug: String
    let generatedAt: String?

    init(row: ChainRow) {
        self.id = row.id
        self.generatedAt = row.generatedAt

        let data = (try? JSONDecoder().decode(ChainData.self, from: Data(row.chainJson.utf8)))
        self.cityFrom = data?.cityFrom ?? row.cityFrom
        self.cityTo = data?.cityTo ?? row.cityTo
        self.summary = data?.summary ?? ""
        self.links = data?.chain ?? []

        let slugText = "\(self.cityFrom)-\(self.cityTo)"
            .lowercased()
            .replacingOccurrences(of: " ", with: "-")
        self.slug = slugText.filter { $0.isLetter || $0.isNumber || $0 == "-" }
    }
}
