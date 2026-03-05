import SwiftUI

/// Photo-dominant tour card matching the web's dark theme design.
struct TourCardView: View {
    let tour: Tour
    var favorites: Favorites? = nil
    @State private var heartScale: CGFloat = 1.0

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Photo with gradient overlay + favorite button
            ZStack(alignment: .topTrailing) {
                AsyncImage(url: tour.imageURL) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .aspectRatio(3/2, contentMode: .fill)
                            .clipped()
                    case .failure:
                        photoPlaceholder
                    case .empty:
                        photoPlaceholder
                            .overlay {
                                ProgressView()
                                    .tint(.white.opacity(0.6))
                            }
                    @unknown default:
                        photoPlaceholder
                    }
                }
                .frame(maxWidth: .infinity)
                .aspectRatio(3/2, contentMode: .fit)
                .overlay(alignment: .bottom) {
                    // Gradient for text readability below photo
                    LinearGradient(
                        colors: [.clear, .black.opacity(0.3)],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                    .frame(height: 40)
                }
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))

                // Favorite button
                if let favorites {
                    Button {
                        let wasAdding = !favorites.contains(tour.id)
                        favorites.toggle(tour.id)
                        if wasAdding {
                            HapticManager.favorite()
                            SpotlightService.indexTour(id: tour.id, title: tour.title, oneLiner: tour.oneLiner, destinationName: tour.destinationName, rating: tour.rating)
                            withAnimation(.spring(response: 0.3, dampingFraction: 0.5)) {
                                heartScale = 1.3
                            }
                            withAnimation(.spring(response: 0.3, dampingFraction: 0.5).delay(0.15)) {
                                heartScale = 1.0
                            }
                        } else {
                            HapticManager.unfavorite()
                            SpotlightService.deindexTour(id: tour.id)
                        }
                    } label: {
                        Image(systemName: favorites.contains(tour.id) ? "heart.fill" : "heart")
                            .font(.body)
                            .foregroundStyle(favorites.contains(tour.id) ? .red : .white.opacity(0.8))
                            .scaleEffect(heartScale)
                            .padding(8)
                            .background(.ultraThinMaterial, in: Circle())
                    }
                    .accessibilityLabel(favorites.contains(tour.id) ? "Remove from favorites" : "Add to favorites")
                    .padding(8)
                }
            }

            // Content below photo
            VStack(alignment: .leading, spacing: 8) {
                Text(tour.title)
                    .font(.headline)
                    .foregroundStyle(.white)
                    .lineLimit(2)

                if let oneLiner = tour.oneLiner, !oneLiner.isEmpty {
                    Text(oneLiner)
                        .font(.subheadline)
                        .foregroundStyle(.white.opacity(0.7))
                        .italic()
                        .lineLimit(2)
                }

                if let dest = tour.destinationName, !dest.isEmpty {
                    HStack(spacing: 4) {
                        Image(systemName: "mappin")
                            .font(.caption2)
                        Text([dest, tour.country].compactMap { $0 }.filter { !$0.isEmpty }.joined(separator: ", "))
                            .font(.caption)
                    }
                    .foregroundStyle(.white.opacity(0.5))
                }

                // Stats row
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
                            .foregroundStyle(.white.opacity(0.5))
                    }
                }
                .font(.caption)
            }
            .padding(.top, 12)
        }
    }

    private var photoPlaceholder: some View {
        Rectangle()
            .fill(Color.white.opacity(0.1))
            .aspectRatio(3/2, contentMode: .fit)
            .overlay {
                Image(systemName: "photo")
                    .font(.largeTitle)
                    .foregroundStyle(.white.opacity(0.2))
            }
    }
}
