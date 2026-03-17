import SwiftUI

struct ProfileView: View {
    let database: DatabaseService
    let favorites: Favorites
    let settings: AppSettings
    let enrichmentService: TourEnrichmentService
    let triviaState: TriviaState
    let exploredDestinations: ExploredDestinations
    let travelService: TravelAwarenessService
    let visitHistory: CityVisitHistory

    @State private var tourCount: Int = 0
    @State private var destinationCount: Int = 0

    var body: some View {
        NavigationStack {
            List {
                // Travel IQ section
                Section {
                    HStack(spacing: 16) {
                        VStack(spacing: 4) {
                            Image(systemName: triviaState.travelIQ.icon)
                                .font(.title)
                                .foregroundStyle(.cyan)
                            Text(triviaState.travelIQ.title)
                                .font(.headline)
                                .foregroundStyle(.white)
                            Text("\(triviaState.totalPoints) pts")
                                .font(.caption)
                                .foregroundStyle(.white.opacity(0.5))
                        }
                        .frame(maxWidth: .infinity)

                        VStack(spacing: 4) {
                            Image(systemName: "flame.fill")
                                .font(.title)
                                .foregroundStyle(triviaState.currentStreak > 0 ? .orange : .white.opacity(0.3))
                            Text("\(triviaState.currentStreak)")
                                .font(.headline)
                                .foregroundStyle(.white)
                            Text("Day Streak")
                                .font(.caption)
                                .foregroundStyle(.white.opacity(0.5))
                        }
                        .frame(maxWidth: .infinity)

                        VStack(spacing: 4) {
                            Image(systemName: "map.fill")
                                .font(.title)
                                .foregroundStyle(.green)
                            Text("\(exploredDestinations.count)")
                                .font(.headline)
                                .foregroundStyle(.white)
                            Text("Explored")
                                .font(.caption)
                                .foregroundStyle(.white.opacity(0.5))
                        }
                        .frame(maxWidth: .infinity)
                    }
                    .listRowBackground(Color.white.opacity(0.06))
                } header: {
                    Text("Travel IQ")
                }

                // Travel Journal
                if !visitHistory.recentVisits.isEmpty {
                    Section("Travel Journal") {
                        ForEach(visitHistory.recentVisits.prefix(10)) { visit in
                            HStack(spacing: 12) {
                                Circle()
                                    .fill(.blue)
                                    .frame(width: 8, height: 8)

                                VStack(alignment: .leading, spacing: 2) {
                                    Text(visit.cityName)
                                        .font(.subheadline)
                                        .foregroundStyle(.white)
                                    Text(visit.arrivalDate, style: .date)
                                        .font(.caption)
                                        .foregroundStyle(.white.opacity(0.5))
                                }

                                Spacer()

                                if visit.isReturn {
                                    Text("Return")
                                        .font(.caption2)
                                        .foregroundStyle(.blue)
                                        .padding(.horizontal, 6)
                                        .padding(.vertical, 2)
                                        .background(Color.blue.opacity(0.15))
                                        .clipShape(Capsule())
                                }
                            }
                        }
                    }
                }

                // Preferences
                Section("Preferences") {
                    Toggle("Haptic Feedback", isOn: Binding(
                        get: { settings.hapticsEnabled },
                        set: { settings.hapticsEnabled = $0 }
                    ))

                    Toggle("Nearby Alerts", isOn: Binding(
                        get: { travelService.nearbyAlertsEnabled },
                        set: { travelService.nearbyAlertsEnabled = $0 }
                    ))
                }

                // Your Data
                Section("Your Data") {
                    NavigationLink {
                        FavoritesListView(database: database, favorites: favorites, enrichmentService: enrichmentService)
                    } label: {
                        HStack {
                            Text("Favorites")
                            Spacer()
                            Text("\(favorites.count)")
                                .foregroundStyle(.secondary)
                        }
                    }
                }

                // About
                Section("About") {
                    NavigationLink {
                        AboutView(database: database)
                    } label: {
                        Text("About TourGraph")
                    }
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
            .navigationTitle("Profile")
            .navigationBarTitleDisplayMode(.large)
            .task {
                tourCount = (try? database.tourCount()) ?? 0
                destinationCount = (try? database.destinationCount()) ?? 0
            }
        }
    }
}
