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
                VStack(spacing: 16) {
                    ForEach(tours) { tour in
                        NavigationLink {
                            TourDetailView(tourId: tour.id, database: database, favorites: favorites, enrichmentService: enrichmentService)
                        } label: {
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
        .onChange(of: favorites.tourIds) {
            loadFavorites()
        }
        .onAppear {
            loadFavorites()
        }
    }

    private func loadFavorites() {
        tours = favorites.tourIds.compactMap { id in
            try? database.getTourById(id)
        }
    }
}
