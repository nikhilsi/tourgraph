import SwiftUI

enum AppTab: String {
    case roulette, rightNow, worldsMost, sixDegrees
}

struct ContentView: View {
    let database: DatabaseService
    let settings: AppSettings
    let favorites: Favorites
    let rouletteState: RouletteState
    let enrichmentService: TourEnrichmentService

    @Binding var selectedTab: AppTab

    var body: some View {
        TabView(selection: $selectedTab) {
            RouletteView(rouletteState: rouletteState, settings: settings, favorites: favorites, enrichmentService: enrichmentService)
                .tabItem {
                    Label("Roulette", systemImage: "dice")
                }
                .tag(AppTab.roulette)

            RightNowTab(database: database, favorites: favorites, settings: settings, enrichmentService: enrichmentService)
                .tabItem {
                    Label("Right Now", systemImage: "sun.horizon")
                }
                .tag(AppTab.rightNow)

            WorldsMostTab(database: database, favorites: favorites, settings: settings, enrichmentService: enrichmentService)
                .tabItem {
                    Label("World's Most", systemImage: "trophy")
                }
                .tag(AppTab.worldsMost)

            SixDegreesTab(database: database, favorites: favorites, settings: settings, enrichmentService: enrichmentService)
                .tabItem {
                    Label("Six Degrees", systemImage: "point.3.connected.trianglepath.dotted")
                }
                .tag(AppTab.sixDegrees)
        }
        .tint(.white)
    }
}
