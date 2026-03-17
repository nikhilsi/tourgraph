import SwiftUI
import MapKit
import CoreLocation

struct WorldMapView: View {
    let database: DatabaseService
    let favorites: Favorites
    let settings: AppSettings
    let enrichmentService: TourEnrichmentService
    let exploredDestinations: ExploredDestinations
    let travelService: TravelAwarenessService
    let visitHistory: CityVisitHistory

    @State private var destinations: [Destination] = []
    @State private var tourCounts: [String: Int] = [:]
    @State private var selectedDestination: Destination?
    @State private var selectedTours: [Tour] = []
    @State private var showingDetail = false
    @State private var cameraPosition: MapCameraPosition = .region(MKCoordinateRegion(
        center: CLLocationCoordinate2D(latitude: 37.0, longitude: -95.0),
        span: MKCoordinateSpan(latitudeDelta: 40, longitudeDelta: 40)
    ))
    @State private var totalDestinations = 0
    @State private var visibleDestinations: [Destination] = []
    @State private var lastFollowedLocation: CLLocation?
    @State private var mapRegion = MKCoordinateRegion(
        center: CLLocationCoordinate2D(latitude: 37.0, longitude: -95.0),
        span: MKCoordinateSpan(latitudeDelta: 40, longitudeDelta: 40)
    )

    // Toast state
    @State private var toastConfig: MilestoneConfig?
    @State private var showToast = false
    @State private var isWelcomeToast = false  // Welcome stays until first tap
    @State private var pendingMilestoneCheck = false

    // Nearby alerts
    @State private var showNearbyExplainer = false

    // Track if welcome has been shown (persists across sessions)
    private static let welcomeShownKey = "worldMapWelcomeShown"

    var body: some View {
        NavigationStack {
            ZStack {
                mapView
                statsOverlay
                toastOverlay
            }
            .navigationTitle("World Map")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    Text("World Map")
                        .font(.headline)
                        .foregroundStyle(.white)
                }
                ToolbarItem(placement: .topBarLeading) {
                    Button {
                        centerOnUser()
                    } label: {
                        Image(systemName: "location")
                            .foregroundStyle(.white)
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    HStack(spacing: 12) {
                        // Nearby alerts toggle
                        Button {
                            if travelService.nearbyAlertsEnabled {
                                travelService.nearbyAlertsEnabled = false
                            } else if travelService.permissionState == .denied {
                                // Can't enable — permission denied, would need to go to Settings
                            } else {
                                showNearbyExplainer = true
                            }
                        } label: {
                            Image(systemName: travelService.nearbyAlertsEnabled ? "location.fill" : "location.slash")
                                .foregroundStyle(travelService.nearbyAlertsEnabled ? .blue : .white.opacity(0.6))
                        }

                        // Globe reset
                        Button {
                            withAnimation(.spring(response: 0.5, dampingFraction: 0.8)) {
                                cameraPosition = .region(MKCoordinateRegion(
                                    center: CLLocationCoordinate2D(latitude: 20, longitude: 0),
                                    span: MKCoordinateSpan(latitudeDelta: 140, longitudeDelta: 140)
                                ))
                            }
                        } label: {
                            Image(systemName: "globe")
                                .foregroundStyle(.white)
                        }
                    }
                }
            }
            .toolbarBackground(.ultraThinMaterial, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .task {
                await loadDestinations()
                centerOnUser()
                try? await Task.sleep(for: .milliseconds(500))
                updateVisibleDestinations()
                showWelcomeIfNeeded()
            }
            .onChange(of: travelService.lastLocation?.coordinate.latitude) { _, _ in
                autoFollowIfNeeded()
            }
            .onChange(of: travelService.lastLocation?.coordinate.longitude) { _, _ in
                autoFollowIfNeeded()
            }
            .onChange(of: showingDetail) { _, isShowing in
                if !isShowing && pendingMilestoneCheck {
                    pendingMilestoneCheck = false
                    // Small delay so the sheet fully dismisses before toast appears
                    Task {
                        try? await Task.sleep(for: .milliseconds(400))
                        checkMilestone()
                    }
                }
            }
            .sheet(isPresented: $showNearbyExplainer) {
                NearbyAlertsExplainer(travelService: travelService)
                    .presentationDetents([.medium])
                    .presentationDragIndicator(.visible)
            }
            .sheet(isPresented: $showingDetail) {
                if let dest = selectedDestination {
                    DestinationDetailSheet(
                        destination: dest,
                        tours: selectedTours,
                        tourCount: tourCounts[dest.id] ?? 0,
                        database: database,
                        favorites: favorites,
                        settings: settings,
                        enrichmentService: enrichmentService
                    )
                    .presentationDetents([.medium, .large], selection: .constant(.large))
                    .presentationDragIndicator(.visible)
                }
            }
        }
    }

    // MARK: - Map

    private var mapView: some View {
        Map(position: $cameraPosition) {
            ForEach(visibleDestinations) { dest in
                let count = tourCounts[dest.id] ?? 0
                let state: PinState = if visitHistory.visitedDestinationIds.contains(dest.id) {
                    .visited
                } else if exploredDestinations.contains(dest.id) {
                    .explored
                } else {
                    .unexplored
                }

                Annotation(dest.name, coordinate: CLLocationCoordinate2D(
                    latitude: dest.latitude ?? 0,
                    longitude: dest.longitude ?? 0
                )) {
                    MapPinView(
                        name: dest.name,
                        tourCount: count,
                        pinState: state
                    )
                    .onTapGesture {
                        selectDestination(dest)
                    }
                }
            }
        }
        .mapStyle(.imagery(elevation: .realistic))
        .ignoresSafeArea(edges: .bottom)
        .onMapCameraChange(frequency: .onEnd) { context in
            mapRegion = context.region
            updateVisibleDestinations()
        }
    }

    // MARK: - Overlays

    private var statsOverlay: some View {
        VStack {
            Spacer()
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("\(exploredDestinations.count) of \(totalDestinations)")
                        .font(.title2.bold())
                        .foregroundStyle(.white)
                    HStack(spacing: 12) {
                        Text("explored")
                            .font(.caption)
                            .foregroundStyle(.white.opacity(0.7))
                        if visitHistory.count > 0 {
                            HStack(spacing: 4) {
                                Circle().fill(.blue).frame(width: 6, height: 6)
                                Text("\(visitHistory.count) visited")
                                    .font(.caption)
                                    .foregroundStyle(.blue)
                            }
                        }
                    }
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 12))

                Spacer()
            }
            .padding(.horizontal)
            .padding(.bottom, 8)
        }
    }

    private var toastOverlay: some View {
        VStack {
            Spacer()
            if showToast, let config = toastConfig {
                MilestoneToast(message: config.message, icon: config.icon)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
            }
        }
        .padding(.bottom, 80)  // Above the stats overlay
        .animation(.spring(response: 0.4, dampingFraction: 0.8), value: showToast)
    }

    // MARK: - Data

    private func loadDestinations() async {
        do {
            tourCounts = try database.tourCountsByDestination()
            destinations = try database.getAllDestinations().filter { tourCounts[$0.id] ?? 0 > 0 }
            totalDestinations = destinations.count
        } catch {
            print("Failed to load destinations: \(error)")
        }
    }

    private func updateVisibleDestinations() {
        let region = mapRegion
        let latMin = region.center.latitude - region.span.latitudeDelta / 2
        let latMax = region.center.latitude + region.span.latitudeDelta / 2
        let lonMin = region.center.longitude - region.span.longitudeDelta / 2
        let lonMax = region.center.longitude + region.span.longitudeDelta / 2

        let minTourCount: Int
        if region.span.latitudeDelta > 100 {
            minTourCount = 50
        } else if region.span.latitudeDelta > 40 {
            minTourCount = 10
        } else {
            minTourCount = 0
        }

        visibleDestinations = destinations.filter { dest in
            guard let lat = dest.latitude, let lon = dest.longitude else { return false }
            let inBounds = lat >= latMin && lat <= latMax && lon >= lonMin && lon <= lonMax
            let count = tourCounts[dest.id] ?? 0
            return inBounds && count >= minTourCount
        }
    }

    private func centerOnUser() {
        if let location = travelService.lastLocation {
            lastFollowedLocation = location
            withAnimation(.spring(response: 0.5, dampingFraction: 0.8)) {
                cameraPosition = .region(MKCoordinateRegion(
                    center: location.coordinate,
                    span: MKCoordinateSpan(latitudeDelta: 8, longitudeDelta: 8)
                ))
            }
        }
    }

    /// Auto-follow user location when it changes significantly, but only if they
    /// haven't manually panned the map far from their last known position.
    private func autoFollowIfNeeded() {
        guard let newLocation = travelService.lastLocation else { return }

        if let lastFollowed = lastFollowedLocation {
            let distanceMoved = newLocation.distance(from: lastFollowed)
            if distanceMoved > 1000 { // Moved > 1km — re-center
                centerOnUser()
            }
        } else {
            // First location — center on it
            centerOnUser()
        }
    }

    // MARK: - Interaction

    private func selectDestination(_ dest: Destination) {
        selectedDestination = dest

        // Dismiss welcome toast on first interaction
        if isWelcomeToast {
            withAnimation { showToast = false }
            isWelcomeToast = false
        }

        let wasAlreadyExplored = exploredDestinations.contains(dest.id)
        exploredDestinations.markExplored(dest.id)

        if settings.hapticsEnabled {
            UIImpactFeedbackGenerator(style: .medium).impactOccurred()
        }

        do {
            selectedTours = try database.getToursForDestination(dest.id, limit: 5)
        } catch {
            selectedTours = []
        }

        // Track if we need to check milestone after sheet dismisses
        pendingMilestoneCheck = !wasAlreadyExplored
        showingDetail = true
    }

    // MARK: - Milestones

    private func showWelcomeIfNeeded() {
        let shown = UserDefaults.standard.bool(forKey: Self.welcomeShownKey)
        guard !shown, exploredDestinations.count == 0 else { return }

        UserDefaults.standard.set(true, forKey: Self.welcomeShownKey)
        isWelcomeToast = true
        showToastMessage(MilestoneConfig.welcome, autoDismiss: false)
    }

    private func checkMilestone() {
        guard let config = MilestoneConfig.check(count: exploredDestinations.count) else { return }

        // Milestone haptic — stronger than a regular tap
        if settings.hapticsEnabled {
            let generator = UINotificationFeedbackGenerator()
            generator.notificationOccurred(.success)
        }

        showToastMessage(config)
    }

    private func showToastMessage(_ config: MilestoneConfig, autoDismiss: Bool = true) {
        toastConfig = config
        withAnimation {
            showToast = true
        }

        if autoDismiss {
            Task {
                try? await Task.sleep(for: .seconds(3.5))
                withAnimation {
                    showToast = false
                }
            }
        }
    }
}

