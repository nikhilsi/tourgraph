import SwiftUI

// MARK: - Standalone tab

struct WorldsMostTab: View {
    let database: DatabaseService
    let favorites: Favorites
    let settings: AppSettings
    let enrichmentService: TourEnrichmentService
    @State private var showSettings = false

    var body: some View {
        NavigationStack {
            ScrollView {
                WorldsMostSection(database: database)
                    .padding(.vertical, 16)
            }
            .background(Color.black)
            .navigationTitle("World's Most")
            .navigationBarTitleDisplayMode(.large)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button { showSettings = true } label: {
                        Image(systemName: "gearshape")
                            .foregroundStyle(.white.opacity(0.6))
                    }
                }
            }
            .sheet(isPresented: $showSettings) {
                SettingsView(settings: settings, favorites: favorites, database: database, enrichmentService: enrichmentService)
            }
            .navigationDestination(for: Int.self) { tourId in
                TourDetailView(tourId: tourId, database: database, favorites: favorites, enrichmentService: enrichmentService)
            }
        }
    }
}

// MARK: - Section (for embedding)

struct WorldsMostSection: View {
    let database: DatabaseService
    @State private var superlatives: [SuperlativeResult] = []
    @State private var isLoading = true

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Superlatives from 100,000+ tours")
                .font(.subheadline)
                .foregroundStyle(.white.opacity(0.5))
                .padding(.horizontal, 20)

            if isLoading {
                ProgressView()
                    .tint(.white)
                    .frame(maxWidth: .infinity, minHeight: 120)
            } else {
                ForEach(superlatives) { result in
                    NavigationLink(value: result.tour.id) {
                        SuperlativeCardView(result: result)
                    }
                    .buttonStyle(.plain)
                    .padding(.horizontal, 20)
                }
            }
        }
        .task {
            do {
                superlatives = try database.getAllSuperlatives()
            } catch {}
            isLoading = false
        }
    }
}

struct SuperlativeCardView: View {
    let result: SuperlativeResult

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                HStack(spacing: 4) {
                    Text(result.type.emoji)
                    Text(result.type.displayTitle)
                        .font(.caption.bold())
                        .foregroundStyle(.white.opacity(0.8))
                        .textCase(.uppercase)
                }

                Spacer()

                Text(superlativeStat)
                    .font(.caption.bold())
                    .foregroundStyle(.yellow)
            }

            TourCardView(tour: result.tour)
        }
        .padding(16)
        .background(Color.white.opacity(0.05))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private var superlativeStat: String {
        switch result.type {
        case .mostExpensive, .cheapest5Star:
            return result.tour.displayPrice
        case .longest, .shortest:
            return result.tour.displayDuration
        case .mostReviewed:
            if let rc = result.tour.reviewCount {
                return "\(rc.formatted()) reviews"
            }
            return ""
        case .hiddenGem:
            if let r = result.tour.rating {
                return "\(String(format: "%.1f", r))★"
            }
            return ""
        }
    }
}
