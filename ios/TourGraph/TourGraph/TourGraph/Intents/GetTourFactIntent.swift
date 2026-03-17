import AppIntents

struct ShowChainIntent: AppIntent {
    static var title: LocalizedStringResource = "Show Random Chain"
    static var description = IntentDescription("Discover a surprising chain of connected cities")
    static var openAppWhenRun = true

    func perform() async throws -> some IntentResult {
        await MainActor.run {
            DeepLinkManager.shared.pendingTab = .discover
            DeepLinkManager.shared.pendingDiscoverSection = .sixDegrees
        }
        return .result()
    }
}
