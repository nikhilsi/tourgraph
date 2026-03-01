import Foundation
import GRDB

struct Destination: Identifiable, Codable, FetchableRecord, Sendable {
    let id: String
    let name: String
    let parentId: String?
    let timezone: String?
    let latitude: Double?
    let longitude: Double?

    enum CodingKeys: String, CodingKey, ColumnExpression {
        case id, name
        case parentId = "parent_id"
        case timezone, latitude, longitude
    }
}
