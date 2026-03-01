import SwiftUI

@main
struct TourGraphApp: App {
    @State private var database: DatabaseService?
    @State private var settings = AppSettings()
    @State private var rouletteState: RouletteState?
    @State private var loadError: String?

    var body: some Scene {
        WindowGroup {
            Group {
                if let database, let rouletteState {
                    ContentView(
                        database: database,
                        settings: settings,
                        rouletteState: rouletteState
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
                        VStack(spacing: 16) {
                            ProgressView()
                                .tint(.white)
                            Text("Loading tours...")
                                .font(.subheadline)
                                .foregroundStyle(.white.opacity(0.5))
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
                } catch {
                    loadError = error.localizedDescription
                }
            }
        }
    }
}
