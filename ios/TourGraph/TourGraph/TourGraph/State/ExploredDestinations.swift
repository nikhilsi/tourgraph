import Foundation

@Observable @MainActor
final class ExploredDestinations {
    private static let key = "exploredDestinationIds"

    private(set) var destinationIds: Set<String> {
        didSet { persist() }
    }

    var count: Int { destinationIds.count }

    init() {
        let stored = UserDefaults.standard.array(forKey: Self.key) as? [String] ?? []
        self.destinationIds = Set(stored)
    }

    func contains(_ destinationId: String) -> Bool {
        destinationIds.contains(destinationId)
    }

    func markExplored(_ destinationId: String) {
        destinationIds.insert(destinationId)
    }

    private func persist() {
        UserDefaults.standard.set(Array(destinationIds), forKey: Self.key)
    }
}
