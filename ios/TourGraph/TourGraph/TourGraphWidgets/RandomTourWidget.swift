import WidgetKit
import SwiftUI
import UIKit

// MARK: - Timeline Entry

struct RandomTourEntry: TimelineEntry {
    let date: Date
    let tourTitle: String
    let oneLiner: String?
    let destinationName: String
    let rating: String
    let price: String
    let imageData: Data?
    let tourId: Int?
    let isEmpty: Bool

    static var placeholder: RandomTourEntry {
        RandomTourEntry(
            date: .now,
            tourTitle: "Helicopter Over the Grand Canyon",
            oneLiner: "Because some canyons are too grand for legs",
            destinationName: "Las Vegas",
            rating: "\u{2605} 4.8",
            price: "$399",
            imageData: nil,
            tourId: nil,
            isEmpty: false
        )
    }

    static var empty: RandomTourEntry {
        RandomTourEntry(
            date: .now,
            tourTitle: "Open TourGraph",
            oneLiner: "Launch the app to load tour data",
            destinationName: "",
            rating: "",
            price: "",
            imageData: nil,
            tourId: nil,
            isEmpty: true
        )
    }
}

// MARK: - Timeline Provider

struct RandomTourProvider: AppIntentTimelineProvider {
    let db = WidgetDatabase()

    func placeholder(in context: Context) -> RandomTourEntry {
        .placeholder
    }

    func snapshot(for configuration: RandomTourIntent, in context: Context) async -> RandomTourEntry {
        if context.isPreview { return .placeholder }
        return makeEntry()
    }

    func timeline(for configuration: RandomTourIntent, in context: Context) async -> Timeline<RandomTourEntry> {
        let entry = makeEntry()
        // Refresh every hour
        let nextUpdate = Calendar.current.date(byAdding: .hour, value: 1, to: .now)!
        return Timeline(entries: [entry], policy: .after(nextUpdate))
    }

    private func makeEntry() -> RandomTourEntry {
        guard let tour = db.getRandomTour() else {
            return .empty
        }

        var imageData: Data?
        if let url = tour.imageURL {
            imageData = try? Data(contentsOf: url)
        }

        return RandomTourEntry(
            date: .now,
            tourTitle: tour.title,
            oneLiner: tour.oneLiner,
            destinationName: tour.destinationName ?? "Somewhere",
            rating: tour.displayRating.isEmpty ? "" : "\u{2605} \(tour.displayRating)",
            price: tour.displayPrice,
            imageData: imageData,
            tourId: tour.id,
            isEmpty: false
        )
    }
}

// MARK: - Interactive Intent (iOS 17+ "Surprise Me" button)

import AppIntents

struct RandomTourIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "Random Tour"
    static var description = IntentDescription("Show a random tour from around the world")
}

struct SurpriseMeIntent: AppIntent {
    static var title: LocalizedStringResource = "Surprise Me"
    static var description = IntentDescription("Load a new random tour")

    func perform() async throws -> some IntentResult {
        // Invalidate the widget timeline to trigger a refresh
        WidgetCenter.shared.reloadTimelines(ofKind: "RandomTourWidget")
        return .result()
    }
}

// MARK: - Widget Views

struct RandomTourSmallView: View {
    let entry: RandomTourEntry

    var body: some View {
        ZStack {
            if let imageData = entry.imageData, let uiImage = UIImage(data: imageData) {
                Image(uiImage: uiImage)
                    .resizable()
                    .aspectRatio(contentMode: .fill)
            }
            LinearGradient(
                colors: [.black.opacity(0.1), .black.opacity(0.85)],
                startPoint: .top,
                endPoint: .bottom
            )
            VStack(alignment: .leading, spacing: 2) {
                Spacer()
                Text(entry.tourTitle)
                    .font(.caption.bold())
                    .foregroundStyle(.white)
                    .lineLimit(2)
                HStack(spacing: 4) {
                    if !entry.rating.isEmpty {
                        Text(entry.rating)
                    }
                    if !entry.price.isEmpty {
                        Text("\u{00B7} \(entry.price)")
                    }
                    if !entry.destinationName.isEmpty {
                        Text("\u{00B7} \(entry.destinationName)")
                            .lineLimit(1)
                    }
                }
                .font(.caption2)
                .foregroundStyle(.white.opacity(0.7))
            }
            .padding(12)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .widgetURL(widgetURL)
    }

    private var widgetURL: URL? {
        guard let tourId = entry.tourId else {
            return URL(string: "tourgraph://tab/roulette")
        }
        return URL(string: "tourgraph://tour/\(tourId)")
    }
}

struct RandomTourMediumView: View {
    let entry: RandomTourEntry

    var body: some View {
        HStack(spacing: 0) {
            // Photo
            if let imageData = entry.imageData, let uiImage = UIImage(data: imageData) {
                Image(uiImage: uiImage)
                    .resizable()
                    .aspectRatio(contentMode: .fill)
                    .frame(maxWidth: .infinity)
                    .clipped()
            } else {
                Rectangle()
                    .fill(.gray.opacity(0.3))
                    .frame(maxWidth: .infinity)
                    .overlay {
                        Image(systemName: "dice")
                            .font(.title2)
                            .foregroundStyle(.white.opacity(0.3))
                    }
            }

            // Info
            VStack(alignment: .leading, spacing: 4) {
                Text(entry.tourTitle)
                    .font(.caption.bold())
                    .foregroundStyle(.white)
                    .lineLimit(2)

                if let oneLiner = entry.oneLiner {
                    Text("\"\(oneLiner)\"")
                        .font(.caption2)
                        .foregroundStyle(.white.opacity(0.6))
                        .lineLimit(2)
                        .italic()
                }

                Spacer()

                HStack(spacing: 4) {
                    if !entry.rating.isEmpty {
                        Text(entry.rating)
                    }
                    if !entry.price.isEmpty {
                        Text("\u{00B7} \(entry.price)")
                    }
                    if !entry.destinationName.isEmpty {
                        Text("\u{00B7} \(entry.destinationName)")
                            .lineLimit(1)
                    }
                }
                .font(.caption2)
                .foregroundStyle(.white.opacity(0.7))

                // Interactive "Surprise Me" button (iOS 17+)
                Button(intent: SurpriseMeIntent()) {
                    Label("Surprise Me", systemImage: "dice")
                        .font(.caption2.bold())
                        .foregroundStyle(.black)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 4)
                        .background(.white)
                        .clipShape(Capsule())
                }
                .buttonStyle(.plain)
            }
            .padding(12)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .background(.black)
        .widgetURL(widgetURL)
    }

    private var widgetURL: URL? {
        guard let tourId = entry.tourId else {
            return URL(string: "tourgraph://tab/roulette")
        }
        return URL(string: "tourgraph://tour/\(tourId)")
    }
}

// MARK: - Widget Definition

struct RandomTourWidgetEntryView: View {
    @Environment(\.widgetFamily) var family
    let entry: RandomTourEntry

    var body: some View {
        Group {
            if entry.isEmpty {
                Text("Open TourGraph to get started")
                    .font(.caption)
                    .foregroundStyle(.white.opacity(0.5))
            } else {
                switch family {
                case .systemMedium:
                    RandomTourMediumView(entry: entry)
                default:
                    RandomTourSmallView(entry: entry)
                }
            }
        }
        .containerBackground(.black, for: .widget)
    }
}

struct RandomTourWidget: Widget {
    let kind = "RandomTourWidget"

    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: kind, intent: RandomTourIntent.self, provider: RandomTourProvider()) { entry in
            RandomTourWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Random Tour")
        .description("Discover a surprising tour from anywhere in the world. Tap Surprise Me for another!")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
