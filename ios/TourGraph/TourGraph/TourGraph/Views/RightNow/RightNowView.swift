import SwiftUI

struct RightNowMoment: Identifiable {
    let tour: Tour
    let timezone: String
    let localTime: String
    let timeOfDay: String
    var id: Int { tour.id }
}

struct RightNowView: View {
    let database: DatabaseService
    @State private var moments: [RightNowMoment] = []
    @State private var isLoading = true

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text("Right Now Somewhere...")
                    .font(.title2.bold())
                    .foregroundStyle(.white)
                    .padding(.horizontal, 20)

                Text("Tours happening where it's golden hour")
                    .font(.subheadline)
                    .foregroundStyle(.white.opacity(0.5))
                    .padding(.horizontal, 20)

                if isLoading {
                    ProgressView()
                        .tint(.white)
                        .frame(maxWidth: .infinity, minHeight: 200)
                } else if moments.isEmpty {
                    Text("No golden-hour moments right now. Check back soon!")
                        .foregroundStyle(.white.opacity(0.5))
                        .padding(20)
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
            .padding(.vertical, 16)
        }
        .task {
            await loadMoments()
        }
    }

    private func loadMoments() async {
        do {
            let allTimezones = try database.getDistinctTimezones()

            // Golden hour first, then pleasant fallback
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
            isLoading = false
        } catch {
            isLoading = false
        }
    }
}

struct MomentCardView: View {
    let moment: RightNowMoment

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Time header
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
