import SwiftUI

enum AppTab: String {
    case roulette, discover, worldMap, trivia, profile
}

struct ContentView: View {
    let database: DatabaseService
    let settings: AppSettings
    let favorites: Favorites
    let rouletteState: RouletteState
    let enrichmentService: TourEnrichmentService
    let exploredDestinations: ExploredDestinations
    let triviaState: TriviaState
    let travelService: TravelAwarenessService
    let visitHistory: CityVisitHistory

    @Binding var selectedTab: AppTab
    @Binding var discoverSection: DiscoverSection

    var body: some View {
        TabView(selection: $selectedTab) {
            RouletteView(rouletteState: rouletteState, settings: settings, favorites: favorites, enrichmentService: enrichmentService)
                .tabItem {
                    Label("Roulette", systemImage: "dice")
                }
                .tag(AppTab.roulette)

            DiscoverView(database: database, favorites: favorites, settings: settings, enrichmentService: enrichmentService, section: $discoverSection)
                .tabItem {
                    Label("Discover", systemImage: "binoculars")
                }
                .tag(AppTab.discover)

            WorldMapView(database: database, favorites: favorites, settings: settings, enrichmentService: enrichmentService, exploredDestinations: exploredDestinations, travelService: travelService, visitHistory: visitHistory)
                .tabItem {
                    Label("World Map", systemImage: "globe")
                }
                .tag(AppTab.worldMap)

            TriviaTabView(triviaState: triviaState, settings: settings)
                .tabItem {
                    Label("Trivia", systemImage: "questionmark.bubble")
                }
                .tag(AppTab.trivia)

            ProfileView(database: database, favorites: favorites, settings: settings, enrichmentService: enrichmentService, triviaState: triviaState, exploredDestinations: exploredDestinations, travelService: travelService, visitHistory: visitHistory)
                .tabItem {
                    Label("Profile", systemImage: "person.crop.circle")
                }
                .tag(AppTab.profile)
        }
        .tint(.white)
    }
}
