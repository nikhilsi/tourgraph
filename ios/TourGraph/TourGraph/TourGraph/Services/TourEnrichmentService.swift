import Foundation
import os

private let logger = Logger(subsystem: "ai.tourgraph", category: "enrichment")

/// Lazy per-tour enrichment: fetches full description + image gallery from the server
/// when the seed DB has truncated data. Writes enriched data back to local DB.
@Observable @MainActor
final class TourEnrichmentService {
    private let baseURL: URL
    private let database: DatabaseService
    private var inFlightIds = Set<Int>()

    init(baseURL: URL = URL(string: "https://tourgraph.ai")!, database: DatabaseService) {
        self.baseURL = baseURL
        self.database = database
    }

    /// Returns true if this tour needs enrichment (truncated description or missing gallery)
    func needsEnrichment(_ tour: Tour) -> Bool {
        tour.imageUrlsJson == nil || (tour.description?.hasSuffix("...") ?? false)
    }

    /// Enrich a single tour, then batch-prefetch the remaining IDs in background.
    /// Returns the enriched tour (or the original if enrichment fails/not needed).
    func enrichIfNeeded(tour: Tour, batchIds: [Int] = []) async -> Tour? {
        guard needsEnrichment(tour), !inFlightIds.contains(tour.id) else {
            if !needsEnrichment(tour) {
                logger.debug("Tour \(tour.id) already enriched")
            }
            return tour
        }

        inFlightIds.insert(tour.id)
        defer { inFlightIds.remove(tour.id) }

        // Call 1: Enrich this tour immediately
        let start = CFAbsoluteTimeGetCurrent()
        if let data = await fetchSingleTour(id: tour.id) {
            let elapsed = Int((CFAbsoluteTimeGetCurrent() - start) * 1000)
            logger.info("Tour \(tour.id) enriched in \(elapsed)ms — desc=\(data.description?.count ?? 0) chars")
            do {
                try database.enrichTour(
                    id: tour.id,
                    description: data.description,
                    imageUrlsJson: data.imageUrlsJson
                )
            } catch {
                logger.error("Tour \(tour.id) DB write failed: \(error.localizedDescription)")
            }
        } else {
            let elapsed = Int((CFAbsoluteTimeGetCurrent() - start) * 1000)
            logger.error("Tour \(tour.id) enrichment failed after \(elapsed)ms")
        }

        // Call 2: Batch prefetch other IDs in background (fire-and-forget)
        let otherIds = batchIds.filter { $0 != tour.id && !inFlightIds.contains($0) }
        if !otherIds.isEmpty {
            logger.info("Batch prefetching \(otherIds.count) tours")
            Task { await batchEnrich(ids: otherIds) }
        }

        // Return fresh tour from DB
        return try? database.getTourById(tour.id)
    }

    // MARK: - Network

    private struct SingleTourResponse: Codable {
        let id: Int
        let description: String?
        let imageUrlsJson: String?

        enum CodingKeys: String, CodingKey {
            case id
            case description
            case imageUrlsJson = "image_urls_json"
        }
    }

    private struct BatchResponse: Codable {
        let tours: [SingleTourResponse]
    }

    private func fetchSingleTour(id: Int) async -> SingleTourResponse? {
        let url = baseURL.appendingPathComponent("api/ios/tour/\(id)")
        do {
            let (data, response) = try await URLSession.shared.data(from: url)
            guard let http = response as? HTTPURLResponse, http.statusCode == 200 else { return nil }
            return try JSONDecoder().decode(SingleTourResponse.self, from: data)
        } catch {
            return nil
        }
    }

    private func batchEnrich(ids: [Int]) async {
        let url = baseURL.appendingPathComponent("api/ios/tours/batch")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body = ["ids": ids]
        guard let httpBody = try? JSONEncoder().encode(body) else { return }
        request.httpBody = httpBody

        let start = CFAbsoluteTimeGetCurrent()
        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
                logger.error("Batch failed — HTTP \((response as? HTTPURLResponse)?.statusCode ?? 0)")
                return
            }
            let batch = try JSONDecoder().decode(BatchResponse.self, from: data)
            let elapsed = Int((CFAbsoluteTimeGetCurrent() - start) * 1000)
            logger.info("Batch enriched \(batch.tours.count) tours in \(elapsed)ms")

            for tour in batch.tours {
                do {
                    try database.enrichTour(
                        id: tour.id,
                        description: tour.description,
                        imageUrlsJson: tour.imageUrlsJson
                    )
                } catch {
                    logger.error("Batch tour \(tour.id) DB write failed: \(error.localizedDescription)")
                }
            }
        } catch {
            let elapsed = Int((CFAbsoluteTimeGetCurrent() - start) * 1000)
            logger.error("Batch failed after \(elapsed)ms — \(error.localizedDescription)")
        }
    }
}
