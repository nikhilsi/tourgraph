import SwiftUI

@main
struct TourGraphApp: App {
    @State private var database: DatabaseService?
    @State private var settings = AppSettings()
    @State private var favorites = Favorites()
    @State private var rouletteState: RouletteState?
    @State private var enrichmentService: TourEnrichmentService?
    @State private var loadError: String?
    @State private var selectedTab: AppTab = .roulette

    var body: some Scene {
        WindowGroup {
            Group {
                if let database, let rouletteState, let enrichmentService {
                    ContentView(
                        database: database,
                        settings: settings,
                        favorites: favorites,
                        rouletteState: rouletteState,
                        enrichmentService: enrichmentService,
                        selectedTab: $selectedTab
                    )
                } else if let loadError {
                    VStack(spacing: 16) {
                        Image(systemName: "exclamationmark.triangle")
                            .font(.largeTitle)
                            .foregroundStyle(.yellow)
                        Text("Failed to load database")
                            .font(.headline)
                            .foregroundStyle(.white)
                        Text(loadError)
                            .font(.caption)
                            .foregroundStyle(.white.opacity(0.5))
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(Color.black)
                } else {
                    ZStack {
                        Color.black.ignoresSafeArea()
                        VStack(spacing: 24) {
                            Image("LogoWhite")
                                .resizable()
                                .aspectRatio(contentMode: .fit)
                                .frame(width: 200)
                            ProgressView()
                                .tint(.white)
                        }
                    }
                }
            }
            .preferredColorScheme(.dark)
            .task {
                do {
                    let db = try DatabaseService()
                    database = db
                    rouletteState = RouletteState(database: db)
                    enrichmentService = TourEnrichmentService(database: db)
                } catch {
                    loadError = error.localizedDescription
                }
            }
            .onOpenURL { url in
                handleDeepLink(url)
            }
        }
    }

    private func handleDeepLink(_ url: URL) {
        guard url.scheme == "tourgraph" else { return }

        switch url.host {
        case "tab":
            switch url.pathComponents.last {
            case "roulette": selectedTab = .roulette
            case "rightnow": selectedTab = .rightNow
            case "worldsmost": selectedTab = .worldsMost
            case "sixdegrees": selectedTab = .sixDegrees
            default: break
            }
        case "tour":
            // Navigate to roulette tab for tour deep links
            selectedTab = .roulette
        default:
            break
        }
    }
}
