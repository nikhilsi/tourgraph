import UIKit

enum HapticManager {
    static func swipe() {
        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
    }

    static func favorite() {
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            UINotificationFeedbackGenerator().notificationOccurred(.success)
        }
    }

    static func unfavorite() {
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
    }

    static func superlativeTap() {
        UIImpactFeedbackGenerator(style: .rigid).impactOccurred()
    }

    static func showMeAnother() {
        UIImpactFeedbackGenerator(style: .soft).impactOccurred()
    }
}
