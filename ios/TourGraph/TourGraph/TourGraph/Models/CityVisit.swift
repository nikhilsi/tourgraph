import Foundation

/// A record of a physical visit to a destination, detected via geofencing.
struct CityVisit: Codable, Identifiable {
    let destinationId: String
    let cityName: String
    let arrivalDate: Date
    var departureDate: Date?

    var id: String { destinationId + "_" + arrivalDate.ISO8601Format() }

    /// Whether this is a return visit (there are previous visits for this destination)
    var isReturn: Bool = false
}

/// Manages locally-stored city visit history. All data stays on device.
@Observable @MainActor
final class CityVisitHistory {
    private static let visitsKey = "cityVisitHistory"
    private static let notifCountKey = "cityVisitNotifCount"
    private static let notifDateKey = "cityVisitNotifDate"

    private(set) var visits: [CityVisit] {
        didSet {
            persistVisits()
            _visitedDestinationIds = nil // Invalidate cache
        }
    }

    /// Tracks notifications actually sent today (not just visits recorded).
    /// Resets automatically when the date changes.
    var notificationsSentToday: Int {
        get {
            let storedDate = UserDefaults.standard.string(forKey: Self.notifDateKey) ?? ""
            let today = todayString()
            if storedDate != today {
                // New day — reset count
                UserDefaults.standard.set(0, forKey: Self.notifCountKey)
                UserDefaults.standard.set(today, forKey: Self.notifDateKey)
                return 0
            }
            return UserDefaults.standard.integer(forKey: Self.notifCountKey)
        }
        set {
            UserDefaults.standard.set(newValue, forKey: Self.notifCountKey)
            UserDefaults.standard.set(todayString(), forKey: Self.notifDateKey)
        }
    }

    var recentVisits: [CityVisit] {
        visits.sorted { $0.arrivalDate > $1.arrivalDate }
    }

    /// Cached set of visited destination IDs — invalidated on visits change
    private var _visitedDestinationIds: Set<String>?
    var visitedDestinationIds: Set<String> {
        if let cached = _visitedDestinationIds { return cached }
        let ids = Set(visits.map(\.destinationId))
        _visitedDestinationIds = ids
        return ids
    }

    var count: Int { visitedDestinationIds.count }

    init() {
        if let data = UserDefaults.standard.data(forKey: Self.visitsKey),
           let decoded = try? JSONDecoder().decode([CityVisit].self, from: data) {
            self.visits = decoded
        } else {
            self.visits = []
        }
    }

    /// Record arrival at a destination. Returns the new visit, or nil if cooldown hasn't elapsed.
    @discardableResult
    func recordArrival(destinationId: String, cityName: String) -> CityVisit? {
        // 6-hour cooldown: don't re-trigger if last visit to this city ended < 6 hours ago
        let cooldown: TimeInterval = 6 * 60 * 60
        if let lastVisit = visits.last(where: { $0.destinationId == destinationId }),
           let departure = lastVisit.departureDate,
           Date().timeIntervalSince(departure) < cooldown {
            return nil
        }

        // Also skip if there's an active (no departure) visit for this destination
        if visits.contains(where: { $0.destinationId == destinationId && $0.departureDate == nil }) {
            return nil
        }

        let isReturn = visits.contains { $0.destinationId == destinationId }
        var visit = CityVisit(
            destinationId: destinationId,
            cityName: cityName,
            arrivalDate: Date()
        )
        visit.isReturn = isReturn
        visits.append(visit)
        return visit
    }

    /// Record departure from a destination (when user exits geofence).
    func recordDeparture(destinationId: String) {
        guard let index = visits.lastIndex(where: { $0.destinationId == destinationId && $0.departureDate == nil }) else { return }
        visits[index].departureDate = Date()
    }

    private func persistVisits() {
        if let data = try? JSONEncoder().encode(visits) {
            UserDefaults.standard.set(data, forKey: Self.visitsKey)
        }
    }

    private func todayString() -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: Date())
    }
}
