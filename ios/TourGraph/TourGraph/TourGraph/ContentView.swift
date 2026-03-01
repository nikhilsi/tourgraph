import SwiftUI

struct ContentView: View {
    let database: DatabaseService
    let settings: AppSettings
    let favorites: Favorites
    let rouletteState: RouletteState

    var body: some View {
        TabView {
            RouletteView(rouletteState: rouletteState, settings: settings, favorites: favorites)
                .tabItem {
                    Label("Roulette", systemImage: "dice")
                }

            ExploreView(database: database, favorites: favorites)
                .tabItem {
                    Label("Explore", systemImage: "safari")
                }

            SettingsView(settings: settings, favorites: favorites, database: database)
                .tabItem {
                    Label("Settings", systemImage: "gearshape")
                }
        }
        .tint(.white)
        .preferredColorScheme(.dark)
    }
}
