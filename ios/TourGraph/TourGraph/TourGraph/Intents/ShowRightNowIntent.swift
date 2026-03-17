import AppIntents

struct ShowRightNowIntent: AppIntent {
    static var title: LocalizedStringResource = "What's Happening Right Now"
    static var description = IntentDescription("See tours in golden-hour cities around the world")
    static var openAppWhenRun = true

    func perform() async throws -> some IntentResult {
        await MainActor.run {
            DeepLinkManager.shared.pendingTab = .discover
            DeepLinkManager.shared.pendingDiscoverSection = .rightNow
        }
        return .result()
    }
}
