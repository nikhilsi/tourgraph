import SwiftUI

struct SettingsView: View {
    let settings: AppSettings
    let database: DatabaseService

    @State private var tourCount: Int = 0
    @State private var destinationCount: Int = 0

    var body: some View {
        NavigationStack {
            List {
                Section("Preferences") {
                    Toggle("Haptic Feedback", isOn: Binding(
                        get: { settings.hapticsEnabled },
                        set: { settings.hapticsEnabled = $0 }
                    ))
                }

                Section("About") {
                    HStack {
                        Text("Tours")
                        Spacer()
                        Text("\(tourCount.formatted())")
                            .foregroundStyle(.secondary)
                    }
                    HStack {
                        Text("Destinations")
                        Spacer()
                        Text("\(destinationCount.formatted())")
                            .foregroundStyle(.secondary)
                    }
                    Link("Visit tourgraph.ai", destination: URL(string: "https://tourgraph.ai")!)
                }

                Section("Legal") {
                    Text("Tour data provided by Viator")
                        .foregroundStyle(.secondary)
                        .font(.caption)
                }
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.large)
            .task {
                tourCount = (try? database.tourCount()) ?? 0
                destinationCount = (try? database.destinationCount()) ?? 0
            }
        }
    }
}
