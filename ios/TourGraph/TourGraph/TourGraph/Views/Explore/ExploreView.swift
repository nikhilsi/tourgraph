import SwiftUI

struct ExploreView: View {
    let database: DatabaseService

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 32) {
                    RightNowView(database: database)
                    Divider().background(Color.white.opacity(0.1))
                    WorldsMostView(database: database)
                    Divider().background(Color.white.opacity(0.1))
                    SixDegreesView(database: database)
                }
            }
            .background(Color.black)
            .navigationTitle("Explore")
            .navigationBarTitleDisplayMode(.large)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .navigationDestination(for: Int.self) { tourId in
                TourDetailView(tourId: tourId, database: database)
            }
            .navigationDestination(for: String.self) { slug in
                ChainDetailView(slug: slug, database: database)
            }
        }
    }
}
