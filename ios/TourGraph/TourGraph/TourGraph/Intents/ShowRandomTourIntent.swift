import AppIntents

struct ShowRandomTourIntent: AppIntent {
    static var title: LocalizedStringResource = "Show Random Tour"
    static var description = IntentDescription("Discover a surprising tour from anywhere in the world")
    static var openAppWhenRun = true

    func perform() async throws -> some IntentResult {
        await MainActor.run {
            DeepLinkManager.shared.pendingTab = .roulette
        }
        return .result()
    }
}
