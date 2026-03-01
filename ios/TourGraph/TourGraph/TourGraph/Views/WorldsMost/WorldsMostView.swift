import SwiftUI

/// Section version for embedding in ExploreView (no ScrollView).
struct WorldsMostSection: View {
    let database: DatabaseService
    @State private var superlatives: [SuperlativeResult] = []
    @State private var isLoading = true

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("The World's Most ___")
                .font(.title2.bold())
                .foregroundStyle(.white)
                .padding(.horizontal, 20)

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
            // Badge + stat highlight
            HStack {
                HStack(spacing: 4) {
                    Text(result.type.emoji)
                    Text(result.type.displayTitle)
                        .font(.caption.bold())
                        .foregroundStyle(.white.opacity(0.8))
                        .textCase(.uppercase)
                }

                Spacer()

                // The specific "most" stat — the whole point of a superlative
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
