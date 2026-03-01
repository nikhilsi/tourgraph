import SwiftUI

// MARK: - Standalone tab

struct SixDegreesTab: View {
    let database: DatabaseService
    let favorites: Favorites
    let settings: AppSettings
    @State private var showSettings = false

    var body: some View {
        NavigationStack {
            ScrollView {
                SixDegreesSection(database: database)
                    .padding(.vertical, 16)
            }
            .background(Color.black)
            .navigationTitle("Six Degrees")
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
                SettingsView(settings: settings, favorites: favorites, database: database)
            }
            .navigationDestination(for: String.self) { slug in
                ChainDetailView(slug: slug, database: database)
            }
        }
    }
}

// MARK: - Section (for embedding)

struct SixDegreesSection: View {
    let database: DatabaseService
    @State private var chains: [Chain] = []
    @State private var isLoading = true

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(alignment: .firstTextBaseline) {
                Text("Cities connected through surprising tours")
                    .font(.subheadline)
                    .foregroundStyle(.white.opacity(0.5))

                Spacer()

                if !chains.isEmpty {
                    NavigationLink(value: chains.randomElement()?.slug ?? "") {
                        Text("Surprise Me")
                            .font(.caption.bold())
                            .foregroundStyle(.black)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(.white)
                            .clipShape(Capsule())
                    }
                }
            }
            .padding(.horizontal, 20)

            if isLoading {
                ProgressView()
                    .tint(.white)
                    .frame(maxWidth: .infinity, minHeight: 120)
            } else if chains.isEmpty {
                Text("Chains coming soon!")
                    .foregroundStyle(.white.opacity(0.5))
                    .padding(.horizontal, 20)
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

            if !chain.summary.isEmpty {
                Text(chain.summary)
                    .font(.subheadline)
                    .foregroundStyle(.white.opacity(0.6))
                    .italic()
                    .lineLimit(2)
            }

            HStack {
                Text("\(chain.links.count) stops")
                    .font(.caption)
                    .foregroundStyle(.white.opacity(0.4))

                Spacer()

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
