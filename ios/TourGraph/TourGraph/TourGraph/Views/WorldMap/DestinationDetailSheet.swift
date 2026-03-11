import SwiftUI

struct DestinationDetailSheet: View {
    let destination: Destination
    let tours: [Tour]
    let tourCount: Int
    let database: DatabaseService
    let favorites: Favorites
    let settings: AppSettings
    let enrichmentService: TourEnrichmentService

    @State private var selectedTourId: Int?
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    // Destination header
                    VStack(alignment: .leading, spacing: 6) {
                        Text(destination.name)
                            .font(.title.bold())
                            .foregroundStyle(.white)

                        Text("\(tourCount) tour\(tourCount == 1 ? "" : "s") available")
                            .font(.subheadline)
                            .foregroundStyle(.white.opacity(0.6))
                    }
                    .padding(.horizontal)

                    // Top tours
                    if !tours.isEmpty {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Top Tours")
                                .font(.headline)
                                .foregroundStyle(.white.opacity(0.8))
                                .padding(.horizontal)

                            ForEach(tours) { tour in
                                Button {
                                    selectedTourId = tour.id
                                } label: {
                                    TourCardView(tour: tour, favorites: favorites)
                                }
                                .buttonStyle(.plain)
                                .padding(.horizontal)
                            }
                        }
                    }
                }
                .padding(.vertical)
            }
            .background(Color.black)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                        .foregroundStyle(.white)
                }
            }
            .toolbarBackground(.ultraThinMaterial, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .fullScreenCover(isPresented: Binding(
                get: { selectedTourId != nil },
                set: { if !$0 { selectedTourId = nil } }
            )) {
                if let tourId = selectedTourId {
                    NavigationStack {
                        TourDetailView(tourId: tourId, database: database, favorites: favorites, enrichmentService: enrichmentService)
                            .toolbar {
                                ToolbarItem(placement: .topBarLeading) {
                                    Button {
                                        selectedTourId = nil
                                    } label: {
                                        Image(systemName: "xmark.circle.fill")
                                            .font(.title3)
                                            .foregroundStyle(.white.opacity(0.6))
                                    }
                                }
                            }
                    }
                    .preferredColorScheme(.dark)
                }
            }
        }
    }
}
