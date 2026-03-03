import SwiftUI

struct AboutView: View {
    let database: DatabaseService

    @State private var tourCount: Int = 0
    @State private var destinationCount: Int = 0

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                // Intro
                VStack(alignment: .leading, spacing: 8) {
                    Text("About TourGraph")
                        .font(.title.bold())
                        .foregroundStyle(.white)
                    Text("TourGraph is a place you visit because it makes you smile. We surface the world's most surprising, weird, and wonderful tour experiences — from fairy hunting in Iceland to midnight street food crawls in Bangkok. No signup. No tracking. No algorithms deciding what you see. Just serendipity.")
                        .font(.subheadline)
                        .foregroundStyle(.white.opacity(0.8))
                }

                // Stats
                HStack(spacing: 0) {
                    statBlock(value: tourCount.formatted(), label: "tours")
                    statBlock(value: destinationCount.formatted(), label: "destinations")
                    statBlock(value: "205", label: "countries")
                }
                .padding(.vertical, 16)
                .background(Color.white.opacity(0.05))
                .clipShape(RoundedRectangle(cornerRadius: 12))

                // Features
                VStack(alignment: .leading, spacing: 16) {
                    Text("Features")
                        .font(.title2.bold())
                        .foregroundStyle(.white)

                    featureRow(
                        icon: "dice",
                        title: "Tour Roulette",
                        description: "One button. Random tour. Weighted toward extremes — highest rated, cheapest, weirdest, most expensive. Press again."
                    )
                    featureRow(
                        icon: "sun.horizon",
                        title: "Right Now Somewhere",
                        description: "Tours happening where it's golden hour right now. Instant teleportation feeling."
                    )
                    featureRow(
                        icon: "trophy",
                        title: "The World's Most ___",
                        description: "Superlatives from the global tour catalog. Most expensive. Cheapest 5-star. Longest. Each one shareable."
                    )
                    featureRow(
                        icon: "point.3.connected.trianglepath.dotted",
                        title: "Six Degrees of Anywhere",
                        description: "Cities connected through chains of real tours with surprising thematic links. 491 chains across 5 continents."
                    )
                }

                // How it's built
                VStack(alignment: .leading, spacing: 8) {
                    Text("How It's Built")
                        .font(.title2.bold())
                        .foregroundStyle(.white)
                    Text("Tour data from the Viator Partner API — 136,000+ experiences across 2,700+ destinations. AI-generated witty captions via Claude. Pre-built SQLite database bundled in the app for instant, offline-capable browsing. No API keys in the binary, no tracking, no accounts.")
                        .font(.subheadline)
                        .foregroundStyle(.white.opacity(0.8))
                }

                // Built by
                VStack(alignment: .leading, spacing: 8) {
                    Text("Built By")
                        .font(.title2.bold())
                        .foregroundStyle(.white)
                    Text("Nikhil Singhal — technology executive with 25+ years building products at Expedia, T-Mobile, Microsoft, and startups. Previously CTO at Tour Guy (AI-powered travel) and Imperative. Based in Seattle.")
                        .font(.subheadline)
                        .foregroundStyle(.white.opacity(0.8))
                }

                // Links
                VStack(spacing: 12) {
                    Link(destination: URL(string: "https://tourgraph.ai")!) {
                        HStack {
                            Image(systemName: "globe")
                            Text("Visit tourgraph.ai")
                            Spacer()
                            Image(systemName: "arrow.up.right")
                                .font(.caption)
                        }
                        .foregroundStyle(.white)
                        .padding(.vertical, 12)
                        .padding(.horizontal, 16)
                        .background(Color.white.opacity(0.1))
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                    }

                    Link(destination: URL(string: "https://tourgraph.ai/story")!) {
                        HStack {
                            Image(systemName: "book")
                            Text("Read the origin story")
                            Spacer()
                            Image(systemName: "arrow.up.right")
                                .font(.caption)
                        }
                        .foregroundStyle(.white)
                        .padding(.vertical, 12)
                        .padding(.horizontal, 16)
                        .background(Color.white.opacity(0.1))
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                    }
                }
            }
            .padding(20)
        }
        .background(Color.black)
        .navigationTitle("About")
        .navigationBarTitleDisplayMode(.large)
        .toolbarColorScheme(.dark, for: .navigationBar)
        .task {
            tourCount = (try? database.tourCount()) ?? 0
            destinationCount = (try? database.destinationCount()) ?? 0
        }
    }

    private func statBlock(value: String, label: String) -> some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.title2.bold())
                .foregroundStyle(.orange)
            Text(label)
                .font(.caption)
                .foregroundStyle(.white.opacity(0.6))
        }
        .frame(maxWidth: .infinity)
    }

    private func featureRow(icon: String, title: String, description: String) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundStyle(.orange)
                .frame(width: 30)
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.headline)
                    .foregroundStyle(.white)
                Text(description)
                    .font(.caption)
                    .foregroundStyle(.white.opacity(0.8))
            }
        }
    }
}
