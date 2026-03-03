import SwiftUI

struct FavoritesListView: View {
    let database: DatabaseService
    let favorites: Favorites
    let enrichmentService: TourEnrichmentService

    @State private var tours: [Tour] = []

    var body: some View {
        ScrollView {
            if tours.isEmpty {
                VStack(spacing: 12) {
                    Image(systemName: "heart")
                        .font(.largeTitle)
                        .foregroundStyle(.white.opacity(0.3))
                    Text("No favorites yet")
                        .font(.headline)
                        .foregroundStyle(.white.opacity(0.7))
                    Text("Tap the heart on any tour to save it here.")
                        .font(.subheadline)
                        .foregroundStyle(.white.opacity(0.5))
                        .multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity, minHeight: 300)
            } else {
                LazyVStack(spacing: 16) {
                    ForEach(tours) { tour in
                        NavigationLink(value: tour.id) {
                            TourCardView(tour: tour, favorites: favorites)
                        }
                        .buttonStyle(.plain)
                        .padding(.horizontal, 20)
                    }
                }
                .padding(.vertical, 16)
            }
        }
        .background(Color.black)
        .navigationTitle("Favorites")
        .navigationBarTitleDisplayMode(.large)
        .toolbarColorScheme(.dark, for: .navigationBar)
        .navigationDestination(for: Int.self) { tourId in
            TourDetailView(tourId: tourId, database: database, favorites: favorites, enrichmentService: enrichmentService)
        }
        .task {
            loadFavorites()
        }
        .onChange(of: favorites.tourIds) {
            loadFavorites()
        }
    }

    private func loadFavorites() {
        tours = favorites.tourIds.compactMap { id in
            try? database.getTourById(id)
        }
    }
}
