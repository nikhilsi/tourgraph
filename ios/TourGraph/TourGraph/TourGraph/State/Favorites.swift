import Foundation

@Observable
final class Favorites: Sendable {
    private static let key = "favoriteTourIds"

    private(set) var tourIds: Set<Int> {
        didSet { persist() }
    }

    var count: Int { tourIds.count }

    init() {
        let stored = UserDefaults.standard.array(forKey: Self.key) as? [Int] ?? []
        self.tourIds = Set(stored)
    }

    func contains(_ tourId: Int) -> Bool {
        tourIds.contains(tourId)
    }

    func toggle(_ tourId: Int) {
        if tourIds.contains(tourId) {
            tourIds.remove(tourId)
        } else {
            tourIds.insert(tourId)
        }
    }

    private func persist() {
        UserDefaults.standard.set(Array(tourIds), forKey: Self.key)
    }
}
