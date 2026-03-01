import SwiftUI

struct ExploreView: View {
    let database: DatabaseService
    let favorites: Favorites

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 32) {
                    RightNowSection(database: database)

                    Divider()
                        .background(Color.white.opacity(0.1))
                        .padding(.horizontal, 20)

                    WorldsMostSection(database: database)

                    Divider()
                        .background(Color.white.opacity(0.1))
                        .padding(.horizontal, 20)

                    SixDegreesSection(database: database)
                }
                .padding(.vertical, 16)
            }
            .background(Color.black)
            .navigationTitle("Explore")
            .navigationBarTitleDisplayMode(.large)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .navigationDestination(for: Int.self) { tourId in
                TourDetailView(tourId: tourId, database: database, favorites: favorites)
            }
            .navigationDestination(for: String.self) { slug in
                ChainDetailView(slug: slug, database: database)
            }
        }
    }
}
