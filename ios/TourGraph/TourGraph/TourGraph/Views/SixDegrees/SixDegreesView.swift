import SwiftUI

struct SixDegreesView: View {
    let database: DatabaseService
    @State private var chains: [Chain] = []
    @State private var isLoading = true

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text("Six Degrees of Anywhere")
                    .font(.title2.bold())
                    .foregroundStyle(.white)
                    .padding(.horizontal, 20)

                Text("Cities connected through surprising tours")
                    .font(.subheadline)
                    .foregroundStyle(.white.opacity(0.5))
                    .padding(.horizontal, 20)

                if isLoading {
                    ProgressView()
                        .tint(.white)
                        .frame(maxWidth: .infinity, minHeight: 200)
                } else if chains.isEmpty {
                    Text("Chains coming soon!")
                        .foregroundStyle(.white.opacity(0.5))
                        .padding(20)
                } else {
                    ForEach(chains) { chain in
                        NavigationLink(value: chain.slug) {
                            ChainCardView(chain: chain)
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
                chains = try database.getAllChains()
            } catch {}
            isLoading = false
        }
    }
}

struct ChainCardView: View {
    let chain: Chain

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // City pair
            HStack {
                Text(chain.cityFrom)
                    .font(.headline)
                    .foregroundStyle(.white)
                Image(systemName: "arrow.right")
                    .font(.caption)
                    .foregroundStyle(.white.opacity(0.4))
                Text(chain.cityTo)
                    .font(.headline)
                    .foregroundStyle(.white)
            }

            // Summary
            if !chain.summary.isEmpty {
                Text(chain.summary)
                    .font(.subheadline)
                    .foregroundStyle(.white.opacity(0.6))
                    .italic()
                    .lineLimit(2)
            }

            // Stop count + themes
            HStack {
                Text("\(chain.links.count) stops")
                    .font(.caption)
                    .foregroundStyle(.white.opacity(0.4))

                Spacer()

                // Theme pills
                HStack(spacing: 4) {
                    ForEach(chain.links.prefix(3), id: \.city) { link in
                        Text(link.theme)
                            .font(.caption2)
                            .foregroundStyle(.white.opacity(0.6))
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color.white.opacity(0.1))
                            .clipShape(Capsule())
                    }
                }
            }
        }
        .padding(16)
        .background(Color.white.opacity(0.05))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}
