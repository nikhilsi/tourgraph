import SwiftUI

struct ContentView: View {
    let database: DatabaseService
    let settings: AppSettings
    let rouletteState: RouletteState

    var body: some View {
        TabView {
            RouletteView(rouletteState: rouletteState, settings: settings)
                .tabItem {
                    Label("Roulette", systemImage: "dice")
                }

            ExploreView(database: database)
                .tabItem {
                    Label("Explore", systemImage: "safari")
                }

            SettingsView(settings: settings, database: database)
                .tabItem {
                    Label("Settings", systemImage: "gearshape")
                }
        }
        .tint(.white)
        .preferredColorScheme(.dark)
    }
}
