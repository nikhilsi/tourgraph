import Foundation

/// Lightweight singleton for passing navigation intent from App Intents to the main app.
/// App Intents run before the UI is ready, so we store the pending action and let
/// TourGraphApp pick it up when the scene becomes active.
@MainActor
final class DeepLinkManager {
    static let shared = DeepLinkManager()
    private init() {}

    var pendingTab: AppTab?
    var pendingDiscoverSection: DiscoverSection?
    var pendingTourId: Int?
}
