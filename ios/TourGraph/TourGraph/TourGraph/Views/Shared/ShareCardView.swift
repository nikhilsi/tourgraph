import SwiftUI
import UIKit

// MARK: - Brand constants

private let brandAmber = Color(red: 0.96, green: 0.62, blue: 0.04) // #f59e0b

// MARK: - Tour Share Card

/// Rendered at 1200x630 (standard OG card size) by ImageRenderer.
struct TourShareCardView: View {
    let tour: Tour
    let heroImage: UIImage?
    var badge: String = "TOUR ROULETTE"
    var statHighlight: String? = nil

    var body: some View {
        ZStack(alignment: .bottomLeading) {
            // Background photo or dark fallback
            if let heroImage {
                Image(uiImage: heroImage)
                    .resizable()
                    .aspectRatio(contentMode: .fill)
                    .frame(width: 1200, height: 630)
                    .clipped()
            } else {
                Color(red: 0.04, green: 0.04, blue: 0.04)
            }

            // Dark gradient overlay
            LinearGradient(
                colors: [
                    .clear,
                    .black.opacity(0.3),
                    .black.opacity(0.85)
                ],
                startPoint: .top,
                endPoint: .bottom
            )

            // Content
            VStack(alignment: .leading, spacing: 10) {
                Spacer()

                // Badge
                Text(badge)
                    .font(.system(size: 18, weight: .bold))
                    .tracking(2)
                    .foregroundStyle(brandAmber)

                // Stat highlight (for World's Most)
                if let stat = statHighlight {
                    Text(stat)
                        .font(.system(size: 44, weight: .bold))
                        .foregroundStyle(brandAmber)
                }

                // Title
                Text(tour.title)
                    .font(.system(size: 48, weight: .heavy))
                    .foregroundStyle(.white)
                    .lineLimit(2)

                // One-liner
                if let oneLiner = tour.oneLiner, !oneLiner.isEmpty {
                    Text(oneLiner)
                        .font(.system(size: 24))
                        .foregroundStyle(.white.opacity(0.8))
                        .italic()
                        .lineLimit(2)
                }

                // Location + Stats + Brand
                HStack(spacing: 16) {
                    if let dest = tour.destinationName, !dest.isEmpty {
                        HStack(spacing: 6) {
                            Image(systemName: "mappin")
                                .font(.system(size: 20))
                            Text([dest, tour.country].compactMap { $0 }.filter { !$0.isEmpty }.joined(separator: ", "))
                        }
                        .foregroundStyle(.white.opacity(0.7))
                    }

                    Spacer()

                    if let rating = tour.rating, rating > 0 {
                        HStack(spacing: 4) {
                            Image(systemName: "star.fill")
                                .foregroundStyle(.yellow)
                            Text(tour.displayRating)
                                .foregroundStyle(.white)
                        }
                    }

                    if let price = tour.fromPrice, price > 0 {
                        Text(tour.displayPrice)
                            .foregroundStyle(Color(red: 0.13, green: 0.77, blue: 0.37))
                    }

                    Text("tourgraph.ai")
                        .foregroundStyle(.white.opacity(0.5))
                }
                .font(.system(size: 24, weight: .semibold))
            }
            .padding(48)
        }
        .frame(width: 1200, height: 630)
        .clipped()
    }
}

// MARK: - Chain Share Card

struct ChainShareCardView: View {
    let chain: Chain

    var body: some View {
        ZStack {
            // Dark background with subtle amber radial gradient
            Color(red: 0.04, green: 0.04, blue: 0.04)
            RadialGradient(
                colors: [brandAmber.opacity(0.08), .clear],
                center: .top,
                startRadius: 0,
                endRadius: 400
            )

            VStack(spacing: 20) {
                Spacer()

                // Badge
                Text("SIX DEGREES OF ANYWHERE")
                    .font(.system(size: 18, weight: .bold))
                    .tracking(2)
                    .foregroundStyle(brandAmber)

                // City pair
                HStack(spacing: 16) {
                    Text(chain.cityFrom)
                    Text("\u{2192}")
                        .foregroundStyle(brandAmber)
                    Text(chain.cityTo)
                }
                .font(.system(size: 52, weight: .heavy))
                .foregroundStyle(.white)
                .lineLimit(1)
                .minimumScaleFactor(0.5)

                // Summary
                Text(chain.summary)
                    .font(.system(size: 26))
                    .foregroundStyle(.white.opacity(0.7))
                    .italic()
                    .multilineTextAlignment(.center)
                    .lineLimit(2)
                    .padding(.horizontal, 60)

                // Chain visualization
                ZStack {
                    // Connecting line
                    Rectangle()
                        .fill(brandAmber.opacity(0.4))
                        .frame(height: 4)
                        .padding(.horizontal, 80)

                    // Numbered circles
                    HStack {
                        ForEach(0..<chain.links.count, id: \.self) { i in
                            if i > 0 { Spacer() }
                            Circle()
                                .fill(brandAmber)
                                .frame(width: 40, height: 40)
                                .overlay {
                                    Text("\(i + 1)")
                                        .font(.system(size: 20, weight: .bold))
                                        .foregroundStyle(.black)
                                }
                        }
                    }
                    .padding(.horizontal, 60)
                }
                .frame(height: 44)
                .padding(.top, 8)

                // Footer
                HStack {
                    Text("\(chain.links.count) stops connected by theme")
                        .foregroundStyle(.white.opacity(0.5))
                    Spacer()
                    Text("tourgraph.ai")
                        .foregroundStyle(.white.opacity(0.5))
                }
                .font(.system(size: 22, weight: .semibold))
                .padding(.top, 8)

                Spacer()
            }
            .padding(48)
        }
        .frame(width: 1200, height: 630)
        .clipped()
    }
}
