import SwiftUI

struct RightNowMoment: Identifiable {
    let tour: Tour
    let timezone: String
    let localTime: String
    let timeOfDay: String
    var id: Int { tour.id }
}

// MARK: - Standalone tab

struct RightNowTab: View {
    let database: DatabaseService
    let favorites: Favorites
    let settings: AppSettings
    let enrichmentService: TourEnrichmentService
    @State private var showSettings = false

    var body: some View {
        NavigationStack {
            ScrollView {
                RightNowSection(database: database)
                    .padding(.vertical, 16)
            }
            .background(Color.black)
            .navigationTitle("Right Now")
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

struct RightNowSection: View {
    let database: DatabaseService
    @State private var moments: [RightNowMoment] = []
    @State private var isLoading = true
    @State private var loadError: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Tours happening where it's golden hour")
                .font(.subheadline)
                .foregroundStyle(.white.opacity(0.5))
                .padding(.horizontal, 20)

            if isLoading {
                ProgressView()
                    .tint(.white)
                    .frame(maxWidth: .infinity, minHeight: 120)
            } else if let loadError {
                VStack(spacing: 8) {
                    Text(loadError)
                        .font(.caption)
                        .foregroundStyle(.white.opacity(0.5))
                    Button("Try Again") { Task { await loadMoments() } }
                        .font(.caption.bold())
                        .foregroundStyle(.white)
                }
                .frame(maxWidth: .infinity, minHeight: 120)
            } else if moments.isEmpty {
                Text("No golden-hour moments right now. Check back soon!")
                    .foregroundStyle(.white.opacity(0.5))
                    .padding(.horizontal, 20)
            } else {
                ForEach(moments) { moment in
                    NavigationLink(value: moment.tour.id) {
                        MomentCardView(moment: moment)
                    }
                    .buttonStyle(.plain)
                    .padding(.horizontal, 20)
                }
            }
        }
        .task {
            await loadMoments()
        }
    }

    private func loadMoments() async {
        isLoading = true
        loadError = nil
        do {
            let allTimezones = try database.getDistinctTimezones()

            var goldenTZs = TimezoneHelper.getGoldenTimezones(from: allTimezones)
            if goldenTZs.count < 6 {
                let pleasant = TimezoneHelper.getPleasantTimezones(from: allTimezones)
                goldenTZs.append(contentsOf: pleasant.filter { !goldenTZs.contains($0) })
            }

            let tours = try database.getRightNowTours(timezones: goldenTZs, count: 6)

            moments = tours.compactMap { tour in
                guard let tz = tour.timezone else { return nil }
                guard let hour = TimezoneHelper.getCurrentHour(tz: tz) else { return nil }
                return RightNowMoment(
                    tour: tour,
                    timezone: tz,
                    localTime: TimezoneHelper.formatLocalTime(tz: tz),
                    timeOfDay: TimezoneHelper.getTimeOfDayLabel(hour: hour)
                )
            }
        } catch {
            loadError = "Could not load moments"
        }
        isLoading = false
    }
}

struct MomentCardView: View {
    let moment: RightNowMoment

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("Right now in \(moment.tour.destinationName ?? "somewhere")")
                    .font(.caption)
                    .foregroundStyle(.white.opacity(0.5))
                Spacer()
                Text("\(moment.localTime) · \(moment.timeOfDay)")
                    .font(.caption)
                    .foregroundStyle(.yellow.opacity(0.8))
            }

            TourCardView(tour: moment.tour)
        }
        .padding(16)
        .background(Color.white.opacity(0.05))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}
