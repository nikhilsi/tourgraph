import SwiftUI
import UIKit

struct TourDetailView: View {
    let tourId: Int
    let database: DatabaseService
    let favorites: Favorites
    var enrichmentService: TourEnrichmentService?
    var batchIds: [Int] = []

    @State private var tour: Tour?
    @State private var isRenderingCard = false
    @State private var showShareSheet = false
    @State private var shareCardImage: UIImage?

    var body: some View {
        ScrollView {
            if let tour {
                VStack(alignment: .leading, spacing: 16) {
                    // Image gallery or single hero
                    if tour.imageURLs.count > 1 {
                        imageGallery(urls: tour.imageURLs)
                    } else {
                        heroImage(url: tour.imageURL)
                    }

                    VStack(alignment: .leading, spacing: 12) {
                        // Title + favorite
                        HStack(alignment: .top) {
                            Text(tour.title)
                                .font(.title2.bold())
                                .foregroundStyle(.white)

                            Spacer()

                            Button {
                                favorites.toggle(tour.id)
                            } label: {
                                Image(systemName: favorites.contains(tour.id) ? "heart.fill" : "heart")
                                    .font(.title3)
                                    .foregroundStyle(favorites.contains(tour.id) ? .red : .white.opacity(0.5))
                            }
                        }

                        // One-liner
                        if let oneLiner = tour.oneLiner, !oneLiner.isEmpty {
                            Text(oneLiner)
                                .font(.body)
                                .foregroundStyle(.white.opacity(0.7))
                                .italic()
                        }

                        // Location
                        if let dest = tour.destinationName, !dest.isEmpty {
                            HStack(spacing: 4) {
                                Image(systemName: "mappin.circle.fill")
                                Text([dest, tour.country].compactMap { $0 }.filter { !$0.isEmpty }.joined(separator: ", "))
                            }
                            .font(.subheadline)
                            .foregroundStyle(.white.opacity(0.5))
                        }

                        // Stats
                        HStack(spacing: 8) {
                            if let r = tour.rating, r > 0 {
                                StatBadge(icon: "star.fill", text: tour.displayRating, color: .yellow)
                            }
                            if let rc = tour.reviewCount, rc > 0 {
                                StatBadge(icon: "person.2", text: "\(rc) reviews")
                            }
                            if tour.fromPrice != nil {
                                StatBadge(icon: "dollarsign", text: tour.displayPrice, color: .green)
                            }
                            if tour.durationMinutes != nil {
                                StatBadge(icon: "clock", text: tour.displayDuration)
                            }
                        }

                        // Description
                        if let desc = tour.description, !desc.isEmpty {
                            Text(desc)
                                .font(.body)
                                .foregroundStyle(.white.opacity(0.8))
                                .padding(.top, 8)
                        }

                        // Highlights
                        if !tour.highlights.isEmpty {
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Highlights")
                                    .font(.headline)
                                    .foregroundStyle(.white)
                                ForEach(tour.highlights, id: \.self) { highlight in
                                    HStack(alignment: .top, spacing: 8) {
                                        Text("•")
                                            .foregroundStyle(.white.opacity(0.4))
                                        Text(highlight)
                                            .foregroundStyle(.white.opacity(0.7))
                                    }
                                    .font(.subheadline)
                                }
                            }
                            .padding(.top, 8)
                        }

                        // Book on Viator
                        if let url = tour.viatorURL {
                            Link(destination: url) {
                                HStack {
                                    Image(systemName: "arrow.up.right")
                                    Text("Book on Viator")
                                }
                                .font(.headline)
                                .foregroundStyle(.black)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 14)
                                .background(.white)
                                .clipShape(RoundedRectangle(cornerRadius: 12))
                            }
                            .padding(.top, 8)
                        }

                        // Share card
                        Button {
                            Task {
                                isRenderingCard = true
                                shareCardImage = await ShareCardRenderer.renderTourCard(tour: tour)
                                isRenderingCard = false
                                if shareCardImage != nil {
                                    showShareSheet = true
                                }
                            }
                        } label: {
                            HStack {
                                if isRenderingCard {
                                    ProgressView()
                                        .tint(.white)
                                } else {
                                    Image(systemName: "square.and.arrow.up")
                                }
                                Text("Share")
                            }
                            .font(.headline)
                            .foregroundStyle(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                            .background(Color.white.opacity(0.15))
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                        }
                        .disabled(isRenderingCard)
                    }
                    .padding(.horizontal, 20)
                }
            } else {
                ProgressView()
                    .tint(.white)
                    .frame(maxWidth: .infinity, minHeight: 300)
            }
        }
        .background(Color.black)
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $showShareSheet) {
            if let image = shareCardImage, let tour {
                ShareSheet(items: [image, URL(string: "https://tourgraph.ai/roulette/\(tour.id)")!])
            }
        }
        .task {
            tour = try? database.getTourById(tourId)
            // Enrich if needed (lazy fetch from server)
            if let currentTour = tour, let enrichment = enrichmentService {
                if let enriched = await enrichment.enrichIfNeeded(tour: currentTour, batchIds: batchIds) {
                    tour = enriched
                }
            }
        }
    }

    // MARK: - Image gallery

    @ViewBuilder
    private func imageGallery(urls: [URL]) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            LazyHStack(spacing: 8) {
                ForEach(urls.prefix(10), id: \.absoluteString) { url in
                    AsyncImage(url: url) { phase in
                        switch phase {
                        case .success(let image):
                            image
                                .resizable()
                                .aspectRatio(3/2, contentMode: .fill)
                                .frame(width: 300, height: 200)
                                .clipped()
                        default:
                            Rectangle()
                                .fill(Color.white.opacity(0.1))
                                .frame(width: 300, height: 200)
                        }
                    }
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }
            }
            .padding(.horizontal, 20)
        }
        .frame(height: 200)
    }

    @ViewBuilder
    private func heroImage(url: URL?) -> some View {
        AsyncImage(url: url) { phase in
            switch phase {
            case .success(let image):
                image
                    .resizable()
                    .aspectRatio(3/2, contentMode: .fill)
            default:
                Rectangle()
                    .fill(Color.white.opacity(0.1))
                    .aspectRatio(3/2, contentMode: .fit)
            }
        }
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .padding(.horizontal, 20)
    }
}
