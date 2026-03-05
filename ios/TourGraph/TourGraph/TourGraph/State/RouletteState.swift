import Foundation
import UIKit

@Observable @MainActor
final class RouletteState {
    var currentTour: Tour?
    var isLoading = false
    var error: String?

    private var hand: [Tour] = []
    private var handIndex = 0
    private var seenIds = Set<Int>()
    let database: DatabaseService

    init(database: DatabaseService) {
        self.database = database
    }

    func spin() {
        // If hand is exhausted or empty, fetch a new one
        if handIndex >= hand.count {
            fetchHand()
            return
        }

        currentTour = hand[handIndex]
        if let id = currentTour?.id {
            seenIds.insert(id)
        }
        handIndex += 1

    }

    func fetchHand() {
        isLoading = currentTour == nil // Only show loading on first spin
        error = nil

        do {
            hand = try database.getRouletteHand(excludeIds: seenIds)
            handIndex = 0
            if !hand.isEmpty {
                spin()
            }
            isLoading = false
        } catch {
            self.error = "Could not load tours"
            isLoading = false
        }
    }

    func triggerHaptic() {
        HapticManager.swipe()
    }
}
