import WidgetKit
import SwiftUI
import UIKit

// MARK: - Timeline Entry

struct RightNowEntry: TimelineEntry {
    let date: Date
    let tourTitle: String
    let oneLiner: String?
    let destinationName: String
    let localTime: String
    let timeOfDay: String
    let rating: String
    let price: String
    let duration: String
    let imageData: Data?
    let tourId: Int?
    let isEmpty: Bool

    static var placeholder: RightNowEntry {
        RightNowEntry(
            date: .now,
            tourTitle: "Forest Bathing with a Buddhist Monk",
            oneLiner: "Because trees don't judge your inbox",
            destinationName: "Kyoto",
            localTime: "6:47am",
            timeOfDay: "sunrise",
            rating: "4.9",
            price: "$89",
            duration: "3 hrs",
            imageData: nil,
            tourId: nil,
            isEmpty: false
        )
    }

    static var empty: RightNowEntry {
        RightNowEntry(
            date: .now,
            tourTitle: "Open TourGraph",
            oneLiner: "Launch the app to load tour data",
            destinationName: "",
            localTime: "",
            timeOfDay: "",
            rating: "",
            price: "",
            duration: "",
            imageData: nil,
            tourId: nil,
            isEmpty: true
        )
    }
}

// MARK: - Timeline Provider

struct RightNowProvider: TimelineProvider {
    let db = WidgetDatabase()

    func placeholder(in context: Context) -> RightNowEntry {
        .placeholder
    }

    func getSnapshot(in context: Context, completion: @escaping (RightNowEntry) -> Void) {
        if context.isPreview {
            completion(.placeholder)
            return
        }
        let entry = makeEntry()
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<RightNowEntry>) -> Void) {
        let entry = makeEntry()
        // Refresh every 30 minutes (golden hour shifts)
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 30, to: .now)!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }

    private func makeEntry() -> RightNowEntry {
        guard let result = db.getRandomGoldenHourTour() else {
            return .empty
        }

        let tour = result.tour
        let localTime = TimezoneHelper.formatLocalTime(tz: result.timezone)
        let timeOfDay = TimezoneHelper.getTimeOfDayLabel(hour: result.hour)

        var imageData: Data?
        if let url = tour.imageURL {
            imageData = try? Data(contentsOf: url)
        }

        return RightNowEntry(
            date: .now,
            tourTitle: tour.title,
            oneLiner: tour.oneLiner,
            destinationName: tour.destinationName ?? "Somewhere",
            localTime: localTime,
            timeOfDay: timeOfDay,
            rating: tour.displayRating.isEmpty ? "" : "\u{2605} \(tour.displayRating)",
            price: tour.displayPrice,
            duration: tour.displayDuration,
            imageData: imageData,
            tourId: tour.id,
            isEmpty: false
        )
    }
}

// MARK: - Widget Views

struct RightNowSmallView: View {
    let entry: RightNowEntry

    var body: some View {
        ZStack {
            if let imageData = entry.imageData, let uiImage = UIImage(data: imageData) {
                Image(uiImage: uiImage)
                    .resizable()
                    .aspectRatio(contentMode: .fill)
            }
            LinearGradient(
                colors: [.black.opacity(0.2), .black.opacity(0.85)],
                startPoint: .top,
                endPoint: .bottom
            )
            VStack(alignment: .leading, spacing: 2) {
                Spacer()
                Text("Right now in \(entry.destinationName)")
                    .font(.caption2.bold())
                    .foregroundStyle(.white.opacity(0.8))
                if !entry.localTime.isEmpty {
                    Text("\(entry.localTime) \u{00B7} \(entry.timeOfDay)")
                        .font(.caption2)
                        .foregroundStyle(.white.opacity(0.6))
                }
                HStack(spacing: 4) {
                    if !entry.rating.isEmpty {
                        Text(entry.rating)
                    }
                    if !entry.price.isEmpty {
                        Text("\u{00B7} \(entry.price)")
                    }
                }
                .font(.caption2)
                .foregroundStyle(.white.opacity(0.7))
            }
            .padding(12)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .widgetURL(URL(string: "tourgraph://tab/rightnow"))
    }
}

struct RightNowMediumView: View {
    let entry: RightNowEntry

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
                        Image(systemName: "sun.horizon")
                            .font(.title2)
                            .foregroundStyle(.white.opacity(0.3))
                    }
            }

            // Info
            VStack(alignment: .leading, spacing: 4) {
                Text("Right now in \(entry.destinationName)")
                    .font(.caption2.bold())
                    .foregroundStyle(.white.opacity(0.7))

                Text(entry.tourTitle)
                    .font(.caption.bold())
                    .foregroundStyle(.white)
                    .lineLimit(2)

                if !entry.localTime.isEmpty {
                    Text("\(entry.localTime) \u{00B7} \(entry.timeOfDay)")
                        .font(.caption2)
                        .foregroundStyle(.white.opacity(0.6))
                }

                Spacer()

                HStack(spacing: 4) {
                    if !entry.rating.isEmpty {
                        Text(entry.rating)
                    }
                    if !entry.price.isEmpty {
                        Text("\u{00B7} \(entry.price)")
                    }
                    if !entry.duration.isEmpty {
                        Text("\u{00B7} \(entry.duration)")
                    }
                }
                .font(.caption2)
                .foregroundStyle(.white.opacity(0.7))
            }
            .padding(12)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .background(.black)
        .widgetURL(URL(string: "tourgraph://tab/rightnow"))
    }
}

// MARK: - Widget Definition

struct RightNowWidgetEntryView: View {
    @Environment(\.widgetFamily) var family
    let entry: RightNowEntry

    var body: some View {
        Group {
            if entry.isEmpty {
                Text("Open TourGraph to get started")
                    .font(.caption)
                    .foregroundStyle(.white.opacity(0.5))
            } else {
                switch family {
                case .systemMedium:
                    RightNowMediumView(entry: entry)
                default:
                    RightNowSmallView(entry: entry)
                }
            }
        }
        .containerBackground(.black, for: .widget)
    }
}

struct RightNowWidget: Widget {
    let kind = "RightNowWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: RightNowProvider()) { entry in
            RightNowWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Right Now Somewhere")
        .description("See golden-hour tours happening around the world right now.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
