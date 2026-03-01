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

            RightNowTab(database: database, favorites: favorites, settings: settings)
                .tabItem {
                    Label("Right Now", systemImage: "sun.horizon")
                }

            WorldsMostTab(database: database, favorites: favorites, settings: settings)
                .tabItem {
                    Label("World's Most", systemImage: "trophy")
                }

            SixDegreesTab(database: database, favorites: favorites, settings: settings)
                .tabItem {
                    Label("Six Degrees", systemImage: "point.3.connected.trianglepath.dotted")
                }
        }
        .tint(.white)
        .preferredColorScheme(.dark)
    }
}
