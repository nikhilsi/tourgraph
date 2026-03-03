import SwiftUI

// MARK: - Standalone tab

struct SixDegreesTab: View {
    let database: DatabaseService
    let favorites: Favorites
    let settings: AppSettings
    let enrichmentService: TourEnrichmentService
    @State private var showSettings = false

    var body: some View {
        NavigationStack {
            ScrollView {
                SixDegreesSection(database: database, favorites: favorites)
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
                SettingsView(settings: settings, favorites: favorites, database: database, enrichmentService: enrichmentService)
            }
        }
    }
}

// MARK: - Section (for embedding)

struct SixDegreesSection: View {
    let database: DatabaseService
    let favorites: Favorites
    @State private var chains: [Chain] = []
    @State private var selectedChain: Chain?
    @State private var toursByIds: [Int: Tour] = [:]
    @State private var isLoading = true

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Cities connected through surprising tours")
                .font(.subheadline)
                .foregroundStyle(.white.opacity(0.6))
                .padding(.horizontal, 20)

            if !chains.isEmpty {
                Button {
                    pickRandom()
                } label: {
                    Text("Show Me Another")
                        .font(.caption.bold())
                        .foregroundStyle(.black)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(.white)
                        .clipShape(Capsule())
                }
                .padding(.horizontal, 20)
            }

            if isLoading {
                ProgressView()
                    .tint(.white)
                    .frame(maxWidth: .infinity, minHeight: 120)
            } else if let chain = selectedChain {
                // Chain header
                VStack(alignment: .leading, spacing: 8) {
                    // City names — horizontal when fits, vertical for long names
                    ViewThatFits(in: .horizontal) {
                        HStack {
                            Text(chain.cityFrom)
                                .font(.title.bold())
                            Image(systemName: "arrow.right")
                                .foregroundStyle(.white.opacity(0.5))
                            Text(chain.cityTo)
                                .font(.title.bold())
                        }

                        VStack(alignment: .leading, spacing: 4) {
                            Text(chain.cityFrom)
                                .font(.title.bold())
                            HStack(spacing: 8) {
                                Image(systemName: "arrow.right")
                                    .foregroundStyle(.white.opacity(0.5))
                                Text(chain.cityTo)
                                    .font(.title.bold())
                            }
                        }
                    }
                    .foregroundStyle(.white)

                    if !chain.summary.isEmpty {
                        Text(chain.summary)
                            .font(.subheadline.bold())
                            .foregroundStyle(.white.opacity(0.85))
                    }
                }
                .padding(.horizontal, 20)

                // Vertical timeline
                VStack(spacing: 0) {
                    ForEach(Array(chain.links.enumerated()), id: \.offset) { index, link in
                        VStack(spacing: 0) {
                            // Stop card
                            HStack(alignment: .top, spacing: 12) {
                                // Timeline indicator
                                VStack(spacing: 0) {
                                    Circle()
                                        .fill(.white)
                                        .frame(width: 30, height: 30)
                                        .overlay {
                                            Text("\(index + 1)")
                                                .font(.caption.bold())
                                                .foregroundStyle(.black)
                                        }
                                    if index < chain.links.count - 1 {
                                        Rectangle()
                                            .fill(.white.opacity(0.3))
                                            .frame(width: 3)
                                            .frame(minHeight: 60)
                                    }
                                }

                                // Content card
                                VStack(alignment: .leading, spacing: 8) {
                                    HStack {
                                        Text(link.city)
                                            .font(.headline)
                                            .foregroundStyle(.white)
                                        if let theme = link.theme {
                                            Text(theme)
                                                .font(.caption.bold())
                                                .foregroundStyle(.orange)
                                                .padding(.horizontal, 8)
                                                .padding(.vertical, 2)
                                                .background(Color.orange.opacity(0.15))
                                                .clipShape(Capsule())
                                        }
                                    }

                                    // Tour photo with favorite button
                                    if let tour = link.tourId.flatMap({ toursByIds[$0] }),
                                       let imageURL = tour.imageURL {
                                        ZStack(alignment: .topTrailing) {
                                            AsyncImage(url: imageURL) { phase in
                                                switch phase {
                                                case .success(let image):
                                                    image
                                                        .resizable()
                                                        .aspectRatio(16/9, contentMode: .fill)
                                                        .clipped()
                                                case .failure:
                                                    stopPhotoPlaceholder
                                                case .empty:
                                                    stopPhotoPlaceholder
                                                        .overlay {
                                                            ProgressView()
                                                                .tint(.white.opacity(0.6))
                                                        }
                                                @unknown default:
                                                    stopPhotoPlaceholder
                                                }
                                            }
                                            .frame(maxWidth: .infinity)
                                            .aspectRatio(16/9, contentMode: .fit)

                                            Button {
                                                favorites.toggle(tour.id)
                                            } label: {
                                                Image(systemName: favorites.contains(tour.id) ? "heart.fill" : "heart")
                                                    .font(.body)
                                                    .foregroundStyle(favorites.contains(tour.id) ? .red : .white.opacity(0.8))
                                                    .padding(6)
                                                    .background(.ultraThinMaterial, in: Circle())
                                            }
                                            .padding(6)
                                        }
                                        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                                    }

                                    Text(link.tourTitle)
                                        .font(.subheadline)
                                        .foregroundStyle(.white)

                                    if let tour = link.tourId.flatMap({ toursByIds[$0] }),
                                       let oneLiner = tour.oneLiner {
                                        Text(oneLiner)
                                            .font(.caption)
                                            .foregroundStyle(.white.opacity(0.8))
                                            .italic()
                                    }

                                    // Tour stats
                                    if let tour = link.tourId.flatMap({ toursByIds[$0] }) {
                                        HStack(spacing: 12) {
                                            if let rating = tour.rating, rating > 0 {
                                                Label(tour.displayRating, systemImage: "star.fill")
                                                    .foregroundStyle(.yellow)
                                            }
                                            if let price = tour.fromPrice, price > 0 {
                                                Text(tour.displayPrice)
                                                    .foregroundStyle(.green)
                                            }
                                            if tour.durationMinutes != nil {
                                                Text(tour.displayDuration)
                                                    .foregroundStyle(.white.opacity(0.6))
                                            }
                                        }
                                        .font(.caption)
                                    }
                                }
                                .padding(12)
                                .background(Color.white.opacity(0.05))
                                .clipShape(RoundedRectangle(cornerRadius: 12))
                            }

                            // Connection text
                            if let connection = link.connectionToNext, index < chain.links.count - 1 {
                                HStack(alignment: .top, spacing: 12) {
                                    Image(systemName: "chevron.down")
                                        .font(.caption2.bold())
                                        .foregroundStyle(.yellow)
                                        .frame(width: 30)
                                    Text(connection)
                                        .font(.caption)
                                        .foregroundStyle(.yellow)
                                        .italic()
                                    Spacer()
                                }
                                .padding(.vertical, 8)
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

    private var stopPhotoPlaceholder: some View {
        Rectangle()
            .fill(Color.white.opacity(0.1))
            .aspectRatio(16/9, contentMode: .fit)
            .overlay {
                Image(systemName: "photo")
                    .font(.title2)
                    .foregroundStyle(.white.opacity(0.2))
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
