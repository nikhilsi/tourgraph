import Foundation
import CoreLocation
import UserNotifications
import os

private let logger = Logger(subsystem: "ai.tourgraph", category: "travel-awareness")

/// Travel Awareness: background location detection + geofenced city welcome.
///
/// Uses two CoreLocation services:
/// 1. Significant location changes (~500m, cell/Wi-Fi) — to know roughly where the user is
/// 2. CLMonitor geofencing (20 nearest destinations) — to detect city arrivals
///
/// All visit data stays on device. No server involvement.
@Observable @MainActor
final class TravelAwarenessService: NSObject, CLLocationManagerDelegate {
    // MARK: - Public State

    enum PermissionState: Equatable {
        case notDetermined
        case whenInUse
        case always
        case denied
    }

    private(set) var permissionState: PermissionState = .notDetermined
    private(set) var isMonitoring = false
    private(set) var nearbyDestinationCount = 0
    private(set) var lastLocation: CLLocation?

    /// User toggle — persisted in UserDefaults
    var nearbyAlertsEnabled: Bool {
        didSet {
            UserDefaults.standard.set(nearbyAlertsEnabled, forKey: "nearbyAlertsEnabled")
            if nearbyAlertsEnabled {
                startMonitoringIfAuthorized()
            } else {
                stopMonitoring()
            }
        }
    }

    // MARK: - Dependencies

    private let database: DatabaseService
    private let visitHistory: CityVisitHistory
    private let exploredDestinations: ExploredDestinations

    // MARK: - Private State

    private let locationManager = CLLocationManager()
    private var monitor: CLMonitor?
    private var monitorTask: Task<Void, Error>?
    private var allDestinations: [(id: String, name: String, lat: Double, lng: Double)] = []
    private var monitoredDestinationIds: Set<String> = []
    private static let maxDailyNotifications = 2
    private static let geofenceRadius: CLLocationDistance = 1500 // 1.5km

    // MARK: - Init

    init(database: DatabaseService, visitHistory: CityVisitHistory, exploredDestinations: ExploredDestinations) {
        self.database = database
        self.visitHistory = visitHistory
        self.exploredDestinations = exploredDestinations
        self.nearbyAlertsEnabled = UserDefaults.standard.bool(forKey: "nearbyAlertsEnabled")
        super.init()

        locationManager.delegate = self
        locationManager.pausesLocationUpdatesAutomatically = false

        updatePermissionState()
        configureBackgroundUpdates()
        loadDestinations()
        lastLocation = locationManager.location

        if nearbyAlertsEnabled {
            startMonitoringIfAuthorized()
        }
    }

    // MARK: - Permission Flow

    /// Step 1: Request "When In Use" authorization
    func requestWhenInUse() {
        locationManager.requestWhenInUseAuthorization()
    }

    /// Step 2: Upgrade to "Always" (after user has seen value)
    func requestAlways() {
        locationManager.requestAlwaysAuthorization()
    }

    // MARK: - CLLocationManagerDelegate

    nonisolated func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        Task { @MainActor in
            updatePermissionState()
            configureBackgroundUpdates()
            if nearbyAlertsEnabled {
                startMonitoringIfAuthorized()
            }
        }
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last else { return }
        Task { @MainActor in
            lastLocation = location
            logger.info("Significant location change: \(location.coordinate.latitude), \(location.coordinate.longitude)")
            await rotateGeofences(around: location.coordinate)
        }
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        // Silently fail — location will retry on next significant change
    }

    // MARK: - Monitoring Lifecycle

    private func startMonitoringIfAuthorized() {
        guard permissionState == .whenInUse || permissionState == .always else { return }
        guard !isMonitoring else { return }

        isMonitoring = true
        locationManager.startMonitoringSignificantLocationChanges()

        #if DEBUG
        // In debug builds, also use standard location updates so Xcode's
        // "Simulate Location" triggers geofence rotation (significant location
        // changes require real cell tower transitions which can't be simulated).
        locationManager.desiredAccuracy = kCLLocationAccuracyKilometer
        locationManager.distanceFilter = 500
        locationManager.startUpdatingLocation()
        #endif

        logger.info("Started significant location monitoring")

        // Set up CLMonitor for geofencing
        startGeofenceMonitor()

        // Do initial geofence rotation from current location
        if let location = locationManager.location {
            Task {
                await rotateGeofences(around: location.coordinate)
            }
        }
    }

    private func stopMonitoring() {
        isMonitoring = false
        locationManager.stopMonitoringSignificantLocationChanges()
        #if DEBUG
        locationManager.stopUpdatingLocation()
        #endif
        monitorTask?.cancel()
        monitorTask = nil
        monitor = nil
        monitoredDestinationIds.removeAll()
        nearbyDestinationCount = 0
        logger.info("Stopped monitoring")
    }

    // MARK: - CLMonitor Geofencing

    private func startGeofenceMonitor() {
        monitorTask?.cancel()

        monitorTask = Task { @MainActor in
            let mon = await CLMonitor("TourGraphCityMonitor")
            self.monitor = mon

            let events = await mon.events
            for try await event in events {
                guard !Task.isCancelled else { break }
                self.handleMonitorEvent(event)
            }
        }
    }

    private func handleMonitorEvent(_ event: CLMonitor.Event) {
        let id = event.identifier
        logger.info("Monitor event: \(id) state=\(String(describing: event.state))")

        switch event.state {
        case .satisfied:
            // User entered a geofence — city arrival
            Task { await handleCityArrival(destinationId: id) }
        case .unsatisfied:
            // User left a geofence — city departure
            visitHistory.recordDeparture(destinationId: id)
            logger.info("Departed: \(id)")
        default:
            break
        }
    }

    // MARK: - Nearest-20 Rotation

    private func rotateGeofences(around center: CLLocationCoordinate2D) async {
        guard let monitor else { return }

        // Pre-filter with rough bounding box (~500km ≈ ~4.5° lat, varies by longitude)
        // This avoids expensive Vincenty distance calculations for distant destinations
        let boxDegrees = 5.0
        let candidates = allDestinations.filter { dest in
            abs(dest.lat - center.latitude) < boxDegrees && abs(dest.lng - center.longitude) < boxDegrees
        }

        // If fewer than 20 in bounding box, expand to all (user is far from any destination)
        let toMeasure = candidates.count >= 20 ? candidates : allDestinations

        let centerLocation = CLLocation(latitude: center.latitude, longitude: center.longitude)
        var withDistance: [(id: String, name: String, lat: Double, lng: Double, distance: CLLocationDistance)] = []

        for dest in toMeasure {
            let destLocation = CLLocation(latitude: dest.lat, longitude: dest.lng)
            let distance = centerLocation.distance(from: destLocation)
            withDistance.append((dest.id, dest.name, dest.lat, dest.lng, distance))
        }

        // Sort by distance, take nearest 20
        withDistance.sort { $0.distance < $1.distance }
        let nearest = Array(withDistance.prefix(20))
        let nearestIds = Set(nearest.map(\.id))

        // Remove conditions no longer in the nearest 20
        for oldId in monitoredDestinationIds where !nearestIds.contains(oldId) {
            await monitor.remove(oldId)
        }

        // Add new conditions
        for dest in nearest where !monitoredDestinationIds.contains(dest.id) {
            let center = CLLocationCoordinate2D(latitude: dest.lat, longitude: dest.lng)
            let condition = CLMonitor.CircularGeographicCondition(
                center: center,
                radius: Self.geofenceRadius
            )
            await monitor.add(condition, identifier: dest.id)
        }

        monitoredDestinationIds = nearestIds
        nearbyDestinationCount = nearest.count

        if let closestDist = nearest.first?.distance {
            logger.info("Rotated geofences: 20 nearest, closest=\(Int(closestDist))m")
        }
    }

    // MARK: - City Arrival

    private func handleCityArrival(destinationId: String) async {
        guard let dest = allDestinations.first(where: { $0.id == destinationId }) else { return }

        // Record the visit (respects 6-hour cooldown internally)
        guard let visit = visitHistory.recordArrival(destinationId: destinationId, cityName: dest.name) else {
            logger.info("Arrival at \(dest.name) skipped — cooldown active")
            return
        }

        // Mark as physically visited on World Map
        exploredDestinations.markExplored(destinationId)

        // Check daily notification cap
        guard visitHistory.notificationsSentToday < Self.maxDailyNotifications else {
            logger.info("Daily notification cap reached, skipping notification for \(dest.name)")
            return
        }

        // Send local notification
        await sendWelcomeNotification(destination: dest, isReturn: visit.isReturn)
    }

    // MARK: - Notifications

    private func sendWelcomeNotification(destination: (id: String, name: String, lat: Double, lng: Double), isReturn: Bool) async {
        let center = UNUserNotificationCenter.current()

        // Request notification permission if needed (non-blocking)
        let settings = await center.notificationSettings()
        if settings.authorizationStatus == .notDetermined {
            try? await center.requestAuthorization(options: [.alert, .sound])
        }

        guard await center.notificationSettings().authorizationStatus == .authorized else { return }

        // Build notification content
        let content = UNMutableNotificationContent()

        let greeting = isReturn ? "Welcome back to \(destination.name)!" : "Welcome to \(destination.name)!"

        // Try to get tour count and a top tour one-liner
        var tourCount = 0
        var topOneLiner: String?
        if let count = try? database.tourCountForDestination(destination.id) {
            tourCount = count
        }
        if let tours = try? database.getToursForDestination(destination.id, limit: 1),
           let tour = tours.first {
            topOneLiner = tour.oneLiner
        }

        content.title = greeting
        if tourCount > 0, let oneLiner = topOneLiner {
            content.body = "\(tourCount) tours here. \(oneLiner)"
        } else if tourCount > 0 {
            content.body = "\(tourCount) tours to discover here."
        } else {
            content.body = "Tap to explore what's here."
        }
        content.sound = .default
        content.userInfo = ["destinationId": destination.id, "type": "cityWelcome"]

        let request = UNNotificationRequest(
            identifier: "cityWelcome-\(destination.id)-\(Date().timeIntervalSince1970)",
            content: content,
            trigger: nil // Deliver immediately
        )

        do {
            try await center.add(request)
            visitHistory.notificationsSentToday += 1
            logger.info("Sent welcome notification for \(destination.name)")

            // After first successful detection, prompt upgrade to "Always" for background
            promptAlwaysUpgradeIfNeeded()
        } catch {
            logger.error("Failed to send notification: \(error.localizedDescription)")
        }
    }

    // MARK: - Data Loading

    private func loadDestinations() {
        do {
            let dests = try database.getAllDestinations()
            allDestinations = dests.compactMap { dest in
                guard let lat = dest.latitude, let lng = dest.longitude else { return nil }
                return (dest.id, dest.name, lat, lng)
            }
            logger.info("Loaded \(self.allDestinations.count) destinations for geofencing")
        } catch {
            logger.error("Failed to load destinations: \(error.localizedDescription)")
        }
    }

    // MARK: - Helpers

    /// Only enable background location updates when "Always" is authorized
    private func configureBackgroundUpdates() {
        locationManager.allowsBackgroundLocationUpdates = (permissionState == .always)
    }

    /// Prompt upgrade to "Always" after user has used "When In Use" successfully.
    /// Called after the first geofence detection while app is in foreground.
    func promptAlwaysUpgradeIfNeeded() {
        guard permissionState == .whenInUse else { return }
        // iOS handles the provisional "Always" flow — just call requestAlways
        requestAlways()
    }

    private func updatePermissionState() {
        switch locationManager.authorizationStatus {
        case .notDetermined:
            permissionState = .notDetermined
        case .authorizedWhenInUse:
            permissionState = .whenInUse
        case .authorizedAlways:
            permissionState = .always
        case .denied, .restricted:
            permissionState = .denied
        @unknown default:
            permissionState = .denied
        }
    }
}
