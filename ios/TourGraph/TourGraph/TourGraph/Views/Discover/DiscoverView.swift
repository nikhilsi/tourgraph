import SwiftUI

enum DiscoverSection: String, CaseIterable {
    case rightNow, worldsMost, sixDegrees

    var title: String {
        switch self {
        case .rightNow: "Right Now"
        case .worldsMost: "World's Most"
        case .sixDegrees: "Six Degrees"
        }
    }
}

struct DiscoverView: View {
    let database: DatabaseService
    let favorites: Favorites
    let settings: AppSettings
    let enrichmentService: TourEnrichmentService

    @Binding var section: DiscoverSection

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Section picker
                Picker("Section", selection: $section) {
                    ForEach(DiscoverSection.allCases, id: \.self) { s in
                        Text(s.title).tag(s)
                    }
                }
                .pickerStyle(.segmented)
                .padding(.horizontal, 20)
                .padding(.vertical, 10)

                ScrollView {
                    switch section {
                    case .rightNow:
                        RightNowSection(database: database)
                            .padding(.vertical, 16)
                    case .worldsMost:
                        WorldsMostSection(database: database)
                            .padding(.vertical, 16)
                    case .sixDegrees:
                        SixDegreesSection(database: database, favorites: favorites)
                            .padding(.vertical, 16)
                    }
                }
            }
            .background(Color.black)
            .navigationTitle(section.title)
            .navigationBarTitleDisplayMode(.large)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .navigationDestination(for: Int.self) { tourId in
                TourDetailView(tourId: tourId, database: database, favorites: favorites, enrichmentService: enrichmentService)
            }
        }
    }
}
