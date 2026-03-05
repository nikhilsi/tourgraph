import AppIntents

struct TourGraphShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: ShowRandomTourIntent(),
            phrases: [
                "Show me a random tour in \(.applicationName)",
                "Surprise me with a tour from \(.applicationName)",
            ],
            shortTitle: "Random Tour",
            systemImageName: "dice"
        )

        AppShortcut(
            intent: ShowRightNowIntent(),
            phrases: [
                "Show me right now in \(.applicationName)",
                "What's happening right now in \(.applicationName)",
            ],
            shortTitle: "Right Now",
            systemImageName: "sun.horizon"
        )

        AppShortcut(
            intent: ShowChainIntent(),
            phrases: [
                "Show me a chain in \(.applicationName)",
                "Six degrees in \(.applicationName)",
            ],
            shortTitle: "Random Chain",
            systemImageName: "point.3.connected.trianglepath.dotted"
        )
    }
}
