import WidgetKit
import SwiftUI

// MARK: - Timeline Entry

struct LockScreenEntry: TimelineEntry {
    let date: Date
    let destinationName: String
    let localTime: String
    let tourTitle: String
    let rating: String
    let isEmpty: Bool

    static var placeholder: LockScreenEntry {
        LockScreenEntry(
            date: .now,
            destinationName: "Kyoto",
            localTime: "6:47am",
            tourTitle: "Forest Bathing",
            rating: "\u{2605} 4.9",
            isEmpty: false
        )
    }

    static var empty: LockScreenEntry {
        LockScreenEntry(
            date: .now,
            destinationName: "",
            localTime: "",
            tourTitle: "Open TourGraph",
            rating: "",
            isEmpty: true
        )
    }
}

// MARK: - Timeline Provider

struct LockScreenProvider: TimelineProvider {
    let db = WidgetDatabase()

    func placeholder(in context: Context) -> LockScreenEntry {
        .placeholder
    }

    func getSnapshot(in context: Context, completion: @escaping (LockScreenEntry) -> Void) {
        if context.isPreview {
            completion(.placeholder)
            return
        }
        completion(makeEntry())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<LockScreenEntry>) -> Void) {
        let entry = makeEntry()
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 30, to: .now)!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }

    private func makeEntry() -> LockScreenEntry {
        guard let result = db.getRandomGoldenHourTour() else {
            return .empty
        }
        let tour = result.tour
        let localTime = TimezoneHelper.formatLocalTime(tz: result.timezone)
        // Truncate title for lock screen
        let shortTitle = tour.title.count > 30
            ? String(tour.title.prefix(27)) + "..."
            : tour.title

        return LockScreenEntry(
            date: .now,
            destinationName: tour.destinationName ?? "Somewhere",
            localTime: localTime,
            tourTitle: shortTitle,
            rating: tour.displayRating.isEmpty ? "" : "\u{2605} \(tour.displayRating)",
            isEmpty: false
        )
    }
}

// MARK: - Widget View

struct LockScreenRectangularView: View {
    let entry: LockScreenEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            HStack(spacing: 4) {
                Image(systemName: "sun.horizon.fill")
                    .font(.caption2)
                Text("\(entry.destinationName) \u{00B7} \(entry.localTime)")
                    .font(.caption2.bold())
            }
            HStack(spacing: 4) {
                Text(entry.tourTitle)
                    .font(.caption2)
                    .lineLimit(1)
                if !entry.rating.isEmpty {
                    Text("\u{00B7} \(entry.rating)")
                        .font(.caption2)
                }
            }
        }
        .widgetURL(URL(string: "tourgraph://tab/rightnow"))
    }
}

// MARK: - Widget Definition

struct LockScreenWidget: Widget {
    let kind = "LockScreenWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: LockScreenProvider()) { entry in
            if entry.isEmpty {
                Text("Open TourGraph")
                    .font(.caption2)
                    .containerBackground(.clear, for: .widget)
            } else {
                LockScreenRectangularView(entry: entry)
                    .containerBackground(.clear, for: .widget)
            }
        }
        .configurationDisplayName("Right Now Moment")
        .description("A golden-hour tour moment on your lock screen.")
        .supportedFamilies([.accessoryRectangular])
    }
}
