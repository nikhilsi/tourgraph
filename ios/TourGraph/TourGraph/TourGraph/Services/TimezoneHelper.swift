import Foundation

/// Port of the web app's timezone.ts — golden hour detection using Foundation.
enum TimezoneHelper {
    // Golden windows
    private static let goldenMorningStart = 6
    private static let goldenMorningEnd = 8
    private static let goldenEveningStart = 16
    private static let goldenEveningEnd = 18

    // Pleasant daytime fallback
    private static let pleasantStart = 9
    private static let pleasantEnd = 15

    static func getCurrentHour(tz: String) -> Int? {
        guard let timeZone = TimeZone(identifier: tz) else { return nil }
        let calendar = Calendar.current
        let components = calendar.dateComponents(in: timeZone, from: Date())
        return components.hour
    }

    static func formatLocalTime(tz: String) -> String {
        guard let timeZone = TimeZone(identifier: tz) else { return "" }
        let formatter = DateFormatter()
        formatter.timeZone = timeZone
        formatter.dateFormat = "h:mm a"
        return formatter.string(from: Date()).lowercased()
    }

    static func getTimeOfDayLabel(hour: Int) -> String {
        switch hour {
        case goldenMorningStart...goldenMorningEnd: return "sunrise"
        case goldenEveningStart...goldenEveningEnd: return "golden hour"
        case 9...11: return "morning"
        case 12...15: return "afternoon"
        case 19...21: return "evening"
        default: return "night"
        }
    }

    static func isGoldenHour(_ hour: Int) -> Bool {
        (goldenMorningStart...goldenMorningEnd).contains(hour) ||
        (goldenEveningStart...goldenEveningEnd).contains(hour)
    }

    static func isPleasantTime(_ hour: Int) -> Bool {
        (pleasantStart...pleasantEnd).contains(hour)
    }

    /// Returns timezone strings where it's currently golden hour.
    static func getGoldenTimezones(from allTimezones: [String]) -> [String] {
        allTimezones.filter { tz in
            guard let hour = getCurrentHour(tz: tz) else { return false }
            return isGoldenHour(hour)
        }
    }

    /// Fallback: timezones where it's pleasant daytime (9-15).
    static func getPleasantTimezones(from allTimezones: [String]) -> [String] {
        allTimezones.filter { tz in
            guard let hour = getCurrentHour(tz: tz) else { return false }
            return isPleasantTime(hour)
        }
    }
}
