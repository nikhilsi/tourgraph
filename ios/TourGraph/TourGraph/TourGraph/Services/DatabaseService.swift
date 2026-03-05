import Foundation
import GRDB

/// Central SQLite connection. All queries go through here.
/// Read-write: reads for all features, writes for per-tour enrichment.
@Observable @MainActor
final class DatabaseService {
    private let db: DatabaseQueue

    init() throws {
        // Copy bundled DB to shared App Group container (widgets + main app share this)
        let fileManager = FileManager.default
        guard let dbURL = SharedConstants.sharedDBURL else {
            throw NSError(domain: "DatabaseService", code: 2,
                          userInfo: [NSLocalizedDescriptionKey: "App Group container not available"])
        }

        if !fileManager.fileExists(atPath: dbURL.path) {
            guard let bundledURL = Bundle.main.url(forResource: "tourgraph", withExtension: "db") else {
                throw NSError(domain: "DatabaseService", code: 1,
                              userInfo: [NSLocalizedDescriptionKey: "Bundled database not found"])
            }
            try fileManager.copyItem(at: bundledURL, to: dbURL)
        }

        self.db = try DatabaseQueue(path: dbURL.path)
    }

    // MARK: - Roulette

    /// Category quotas for a hand of ~20 tours (matches web algorithm)
    private static let handQuotas: [(category: String, count: Int)] = [
        ("highest_rated", 4),
        ("unique", 3),
        ("cheapest_5star", 3),
        ("most_expensive", 3),
        ("exotic_location", 3),
        ("most_reviewed", 2),
        ("wildcard", 2),
    ]

    func getRouletteHand(excludeIds: Set<Int> = [], handSize: Int = 20) throws -> [Tour] {
        try db.read { db in
            var hand: [Tour] = []
            var usedIds = excludeIds

            // Draw by category quota
            for (category, count) in Self.handQuotas {
                let placeholders = usedIds.map { _ in "?" }.joined(separator: ",")
                let excludeClause = usedIds.isEmpty ? "" : "AND id NOT IN (\(placeholders))"

                let sql = """
                    SELECT id, product_code, title, one_liner, destination_name, country,
                           continent, rating, review_count, from_price, currency,
                           duration_minutes, image_url, viator_url, weight_category
                    FROM tours
                    WHERE weight_category = ? AND status = 'active' \(excludeClause)
                    ORDER BY RANDOM()
                    LIMIT ?
                    """
                var args: [DatabaseValueConvertible] = [category]
                args.append(contentsOf: usedIds.sorted())
                args.append(count)
                let tours = try Tour.fetchAll(db, sql: sql, arguments: StatementArguments(args))
                for tour in tours {
                    hand.append(tour)
                    usedIds.insert(tour.id)
                }
            }

            // Fill remaining slots
            if hand.count < handSize {
                let remaining = handSize - hand.count
                let placeholders = usedIds.map { _ in "?" }.joined(separator: ",")
                let excludeClause = usedIds.isEmpty ? "" : "AND id NOT IN (\(placeholders))"

                let sql = """
                    SELECT id, product_code, title, one_liner, destination_name, country,
                           continent, rating, review_count, from_price, currency,
                           duration_minutes, image_url, viator_url, weight_category
                    FROM tours
                    WHERE status = 'active' \(excludeClause)
                    ORDER BY RANDOM()
                    LIMIT ?
                    """
                var args: [DatabaseValueConvertible] = Array(usedIds.sorted())
                args.append(remaining)
                let fillers = try Tour.fetchAll(db, sql: sql, arguments: StatementArguments(args))
                hand.append(contentsOf: fillers)
            }

            return sequenceHand(hand)
        }
    }

    /// Greedy nearest-neighbor sequencing for maximum contrast.
    /// Different category (+2), different continent (+2), large price gap (+1).
    private func sequenceHand(_ tours: [Tour]) -> [Tour] {
        guard tours.count > 1 else { return tours }

        var sequenced: [Tour] = []
        var remaining = tours

        let startIdx = Int.random(in: 0..<remaining.count)
        sequenced.append(remaining.remove(at: startIdx))

        while !remaining.isEmpty {
            let last = sequenced.last!
            var bestIdx = 0
            var bestScore = -1

            for (i, candidate) in remaining.enumerated() {
                var score = 0
                if candidate.weightCategory != last.weightCategory { score += 2 }
                if candidate.continent != last.continent { score += 2 }
                if let lp = last.fromPrice, let cp = candidate.fromPrice, lp > 0 {
                    let ratio = cp / lp
                    if ratio > 3 || ratio < 1.0 / 3.0 { score += 1 }
                }
                if score > bestScore {
                    bestScore = score
                    bestIdx = i
                }
            }

            sequenced.append(remaining.remove(at: bestIdx))
        }

        return sequenced
    }

    // MARK: - Tour Detail

    func getTourById(_ id: Int) throws -> Tour? {
        try db.read { db in
            try Tour.fetchOne(db, sql: "SELECT * FROM tours WHERE id = ?", arguments: [id])
        }
    }

    func getToursByIds(_ ids: [Int]) throws -> [Int: Tour] {
        guard !ids.isEmpty else { return [:] }
        return try db.read { db in
            let placeholders = ids.map { _ in "?" }.joined(separator: ",")
            let tours = try Tour.fetchAll(db, sql: "SELECT * FROM tours WHERE id IN (\(placeholders))", arguments: StatementArguments(ids))
            var map: [Int: Tour] = [:]
            for tour in tours {
                map[tour.id] = tour
            }
            return map
        }
    }

    // MARK: - Right Now Somewhere

    func getDistinctTimezones() throws -> [String] {
        try db.read { db in
            let rows = try String.fetchAll(db, sql: """
                SELECT DISTINCT timezone FROM tours
                WHERE status = 'active' AND timezone IS NOT NULL
                """)
            return rows
        }
    }

    func getRightNowTours(timezones: [String], count: Int) throws -> [Tour] {
        try db.read { db in
            var results: [Tour] = []
            var usedTimezones = Set<String>()
            let shuffled = timezones.shuffled()

            for tz in shuffled {
                guard !usedTimezones.contains(tz), results.count < count else { break }

                if let tour = try Tour.fetchOne(db, sql: """
                    SELECT id, product_code, title, one_liner, destination_name, country,
                           continent, rating, review_count, from_price, currency,
                           duration_minutes, image_url, viator_url, weight_category, timezone
                    FROM tours
                    WHERE status = 'active' AND timezone = ?
                      AND image_url IS NOT NULL AND rating >= 4.0
                    ORDER BY RANDOM()
                    LIMIT 1
                    """, arguments: [tz]) {
                    results.append(tour)
                    usedTimezones.insert(tz)
                }
            }

            return results
        }
    }

    // MARK: - World's Most (Superlatives)

    private static let superlativeQueries: [SuperlativeType: String] = [
        .mostExpensive: """
            SELECT * FROM tours
            WHERE status = 'active' AND from_price IS NOT NULL
              AND from_price <= 50000 AND image_url IS NOT NULL
            ORDER BY from_price DESC LIMIT 10
            """,
        .cheapest5Star: """
            SELECT * FROM tours
            WHERE status = 'active' AND rating >= 4.5
              AND from_price IS NOT NULL AND from_price > 0
              AND review_count >= 10 AND image_url IS NOT NULL
            ORDER BY from_price ASC LIMIT 10
            """,
        .longest: """
            SELECT * FROM tours
            WHERE status = 'active' AND duration_minutes IS NOT NULL
              AND duration_minutes <= 20160 AND image_url IS NOT NULL
            ORDER BY duration_minutes DESC LIMIT 10
            """,
        .shortest: """
            SELECT * FROM tours
            WHERE status = 'active' AND duration_minutes IS NOT NULL
              AND duration_minutes >= 30 AND image_url IS NOT NULL
            ORDER BY duration_minutes ASC LIMIT 10
            """,
        .mostReviewed: """
            SELECT * FROM tours
            WHERE status = 'active' AND review_count IS NOT NULL
              AND image_url IS NOT NULL
            ORDER BY review_count DESC LIMIT 10
            """,
        .hiddenGem: """
            SELECT * FROM tours
            WHERE status = 'active' AND rating >= 4.8
              AND review_count >= 10 AND review_count <= 100
              AND image_url IS NOT NULL
            ORDER BY rating DESC, review_count ASC LIMIT 10
            """,
    ]

    func getSuperlative(_ type: SuperlativeType) throws -> Tour? {
        guard let sql = Self.superlativeQueries[type] else { return nil }
        let candidates = try db.read { db in
            try Tour.fetchAll(db, sql: sql)
        }
        return candidates.randomElement()
    }

    func getAllSuperlatives() throws -> [SuperlativeResult] {
        var results: [SuperlativeResult] = []
        for type in SuperlativeType.allCases {
            if let tour = try getSuperlative(type) {
                results.append(SuperlativeResult(type: type, tour: tour))
            }
        }
        return results
    }

    // MARK: - Six Degrees Chains

    func getAllChains() throws -> [Chain] {
        try db.read { db in
            let rows = try ChainRow.fetchAll(db, sql: "SELECT * FROM six_degrees_chains ORDER BY id")
            return rows.map { Chain(row: $0) }
        }
    }

    func getChainBySlug(_ slug: String) throws -> Chain? {
        try db.read { db in
            guard let row = try ChainRow.fetchOne(db, sql: "SELECT * FROM six_degrees_chains WHERE slug = ?", arguments: [slug]) else {
                return nil
            }
            return Chain(row: row)
        }
    }

    // MARK: - Enrichment (write)

    /// Write enriched data back to local DB for a single tour.
    /// Called by TourEnrichmentService after fetching from server.
    func enrichTour(id: Int, description: String?, imageUrlsJson: String?) throws {
        try db.write { db in
            try db.execute(
                sql: "UPDATE tours SET description = ?, image_urls_json = ? WHERE id = ?",
                arguments: [description, imageUrlsJson, id]
            )
        }
    }

    // MARK: - Stats

    func tourCount() throws -> Int {
        try db.read { db in
            try Int.fetchOne(db, sql: "SELECT COUNT(*) FROM tours WHERE status = 'active'") ?? 0
        }
    }

    func destinationCount() throws -> Int {
        try db.read { db in
            try Int.fetchOne(db, sql: "SELECT COUNT(DISTINCT destination_id) FROM tours WHERE status = 'active'") ?? 0
        }
    }
}
