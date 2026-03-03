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
        }
    }
}

// MARK: - Section (for embedding)

struct SixDegreesSection: View {
    let database: DatabaseService
    @State private var chains: [Chain] = []
    @State private var selectedChain: Chain?
    @State private var toursByIds: [Int: Tour] = [:]
    @State private var isLoading = true

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(alignment: .firstTextBaseline) {
                Text("Cities connected through surprising tours")
                    .font(.subheadline)
                    .foregroundStyle(.white.opacity(0.5))

                Spacer()

                if !chains.isEmpty {
                    Button {
                        pickRandom()
                    } label: {
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
            } else if let chain = selectedChain {
                // Chain header
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text(chain.cityFrom)
                            .font(.title.bold())
                        Image(systemName: "arrow.right")
                            .foregroundStyle(.white.opacity(0.4))
                        Text(chain.cityTo)
                            .font(.title.bold())
                    }
                    .foregroundStyle(.white)

                    if !chain.summary.isEmpty {
                        Text(chain.summary)
                            .font(.body)
                            .foregroundStyle(.white.opacity(0.6))
                            .italic()
                    }

                    Text("\(chain.links.count) stops")
                        .font(.caption)
                        .foregroundStyle(.white.opacity(0.4))
                }
                .padding(.horizontal, 20)

                // Vertical timeline
                VStack(spacing: 0) {
                    ForEach(Array(chain.links.enumerated()), id: \.offset) { index, link in
                        VStack(spacing: 0) {
                            // Stop card
                            HStack(alignment: .top, spacing: 16) {
                                // Timeline indicator
                                VStack(spacing: 0) {
                                    Circle()
                                        .fill(.white)
                                        .frame(width: 28, height: 28)
                                        .overlay {
                                            Text("\(index + 1)")
                                                .font(.caption.bold())
                                                .foregroundStyle(.black)
                                        }
                                    if index < chain.links.count - 1 {
                                        Rectangle()
                                            .fill(.white.opacity(0.2))
                                            .frame(width: 2)
                                            .frame(minHeight: 60)
                                    }
                                }

                                // Content
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(link.city)
                                        .font(.headline)
                                        .foregroundStyle(.white)
                                    Text(link.tourTitle)
                                        .font(.subheadline)
                                        .foregroundStyle(.white.opacity(0.7))
                                    if let tour = link.tourId.flatMap({ toursByIds[$0] }),
                                       let oneLiner = tour.oneLiner {
                                        Text(oneLiner)
                                            .font(.caption)
                                            .foregroundStyle(.white.opacity(0.5))
                                            .italic()
                                    }
                                    Text(link.theme)
                                        .font(.caption)
                                        .foregroundStyle(.white.opacity(0.5))
                                        .padding(.horizontal, 8)
                                        .padding(.vertical, 2)
                                        .background(Color.white.opacity(0.1))
                                        .clipShape(Capsule())
                                }
                                .padding(.bottom, 16)

                                Spacer()
                            }

                            // Connection text
                            if let connection = link.connectionToNext, index < chain.links.count - 1 {
                                HStack(spacing: 16) {
                                    Rectangle()
                                        .fill(.white.opacity(0.2))
                                        .frame(width: 2, height: 1)
                                        .frame(width: 28)
                                    Text(connection)
                                        .font(.caption)
                                        .foregroundStyle(.white.opacity(0.4))
                                        .italic()
                                    Spacer()
                                }
                                .padding(.bottom, 8)
                            }
                        }
                    }
                }
                .padding(.horizontal, 20)

                // Share
                if let chain = selectedChain {
                    ShareLink(
                        item: URL(string: "https://tourgraph.ai/six-degrees/\(chain.slug)")!,
                        subject: Text("\(chain.cityFrom) to \(chain.cityTo)"),
                        message: Text(chain.summary)
                    ) {
                        HStack {
                            Image(systemName: "square.and.arrow.up")
                            Text("Share This Chain")
                        }
                        .font(.headline)
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(Color.white.opacity(0.15))
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                    .padding(.horizontal, 20)
                }
            } else {
                Text("Chains coming soon!")
                    .foregroundStyle(.white.opacity(0.5))
                    .padding(.horizontal, 20)
            }
        }
        .task {
            do {
                chains = try database.getAllChains()
            } catch {}
            pickRandom()
            isLoading = false
        }
    }

    private func pickRandom() {
        selectedChain = chains.randomElement()
        toursByIds = [:]
        if let chain = selectedChain {
            for link in chain.links {
                if let tourId = link.tourId,
                   let tour = try? database.getTourById(tourId) {
                    toursByIds[tourId] = tour
                }
            }
        }
    }
}
