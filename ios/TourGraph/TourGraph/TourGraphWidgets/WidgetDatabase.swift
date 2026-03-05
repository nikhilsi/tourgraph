import Foundation
import GRDB

/// Lightweight read-only database for widget extension.
/// Opens the shared App Group SQLite database.
struct WidgetDatabase {
    private let db: DatabaseQueue?

    init() {
        guard let dbURL = SharedConstants.sharedDBURL,
              FileManager.default.fileExists(atPath: dbURL.path) else {
            self.db = nil
            return
        }
        self.db = try? DatabaseQueue(path: dbURL.path)
    }

    var isAvailable: Bool { db != nil }

    // MARK: - Right Now Widget

    func getRandomGoldenHourTour() -> (tour: Tour, timezone: String, hour: Int)? {
        guard let db else { return nil }
        return try? db.read { db in
            let allTimezones = try String.fetchAll(db, sql: """
                SELECT DISTINCT timezone FROM tours
                WHERE status = 'active' AND timezone IS NOT NULL
                """)

            let goldenTZs = TimezoneHelper.getGoldenTimezones(from: allTimezones)
            let usableTZs = goldenTZs.isEmpty
                ? TimezoneHelper.getPleasantTimezones(from: allTimezones)
                : goldenTZs

            guard let tz = usableTZs.randomElement(),
                  let hour = TimezoneHelper.getCurrentHour(tz: tz) else { return nil }

            let tour = try Tour.fetchOne(db, sql: """
                SELECT id, product_code, title, one_liner, destination_name, country,
                       continent, rating, review_count, from_price, currency,
                       duration_minutes, image_url, viator_url, weight_category, timezone
                FROM tours
                WHERE status = 'active' AND timezone = ?
                  AND image_url IS NOT NULL AND rating >= 4.0
                ORDER BY RANDOM()
                LIMIT 1
                """, arguments: [tz])

            guard let tour else { return nil }
            return (tour, tz, hour)
        }
    }

    // MARK: - Random Tour Widget

    func getRandomTour() -> Tour? {
        guard let db else { return nil }
        return try? db.read { db in
            try Tour.fetchOne(db, sql: """
                SELECT id, product_code, title, one_liner, destination_name, country,
                       continent, rating, review_count, from_price, currency,
                       duration_minutes, image_url, viator_url, weight_category
                FROM tours
                WHERE status = 'active' AND image_url IS NOT NULL AND rating >= 4.0
                ORDER BY RANDOM()
                LIMIT 1
                """)
        }
    }

    // MARK: - Superlative Fact (for future Siri intent)

    func getRandomSuperlativeFact() -> String? {
        guard let db else { return nil }

        let queries: [(String, String)] = [
            ("The most expensive tour on Earth", """
                SELECT title, destination_name, from_price FROM tours
                WHERE status = 'active' AND from_price IS NOT NULL AND from_price <= 50000
                ORDER BY from_price DESC LIMIT 1
                """),
            ("The cheapest 5-star experience", """
                SELECT title, destination_name, from_price FROM tours
                WHERE status = 'active' AND rating >= 4.5 AND from_price > 0 AND review_count >= 10
                ORDER BY from_price ASC LIMIT 1
                """),
            ("The most reviewed tour", """
                SELECT title, destination_name, review_count FROM tours
                WHERE status = 'active' AND review_count IS NOT NULL
                ORDER BY review_count DESC LIMIT 1
                """),
        ]

        guard let (prefix, sql) = queries.randomElement() else { return nil }

        return try? db.read { db in
            let row = try Row.fetchOne(db, sql: sql)
            guard let title = row?["title"] as? String,
                  let dest = row?["destination_name"] as? String else { return nil }
            return "\(prefix): \(title) in \(dest)"
        }
    }
}
