import SwiftUI

struct WorldsMostView: View {
    let database: DatabaseService
    @State private var superlatives: [SuperlativeResult] = []
    @State private var isLoading = true

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text("The World's Most ___")
                    .font(.title2.bold())
                    .foregroundStyle(.white)
                    .padding(.horizontal, 20)

                Text("Daily superlatives from 100,000+ tours")
                    .font(.subheadline)
                    .foregroundStyle(.white.opacity(0.5))
                    .padding(.horizontal, 20)

                if isLoading {
                    ProgressView()
                        .tint(.white)
                        .frame(maxWidth: .infinity, minHeight: 200)
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
            .padding(.vertical, 16)
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
        VStack(alignment: .leading, spacing: 8) {
            // Badge
            HStack {
                Text(result.type.emoji)
                Text(result.type.displayTitle)
                    .font(.caption.bold())
                    .foregroundStyle(.white.opacity(0.8))
                    .textCase(.uppercase)
            }

            TourCardView(tour: result.tour)
        }
        .padding(16)
        .background(Color.white.opacity(0.05))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}
