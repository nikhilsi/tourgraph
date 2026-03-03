import SwiftUI
import UIKit

/// Downloads tour images and renders share cards using ImageRenderer.
@MainActor
struct ShareCardRenderer {

    /// Render a tour share card (Roulette, Right Now, World's Most, Detail).
    static func renderTourCard(
        tour: Tour,
        badge: String = "TOUR ROULETTE",
        statHighlight: String? = nil
    ) async -> UIImage? {
        let heroImage = await downloadImage(url: tour.imageURL)

        let view = TourShareCardView(
            tour: tour,
            heroImage: heroImage,
            badge: badge,
            statHighlight: statHighlight
        )

        let renderer = ImageRenderer(content: view)
        renderer.scale = 2.0
        return renderer.uiImage
    }

    /// Render a chain share card (Six Degrees).
    static func renderChainCard(chain: Chain) -> UIImage? {
        let view = ChainShareCardView(chain: chain)
        let renderer = ImageRenderer(content: view)
        renderer.scale = 2.0
        return renderer.uiImage
    }

    // MARK: - Private

    private static func downloadImage(url: URL?) async -> UIImage? {
        guard let url else { return nil }
        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            return UIImage(data: data)
        } catch {
            return nil
        }
    }
}
