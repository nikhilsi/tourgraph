import SwiftUI
import UIKit
import CoreSpotlight

@main
struct TourGraphApp: App {
    @State private var database: DatabaseService?
    @State private var settings = AppSettings()
    @State private var favorites = Favorites()
    @State private var exploredDestinations = ExploredDestinations()
    @State private var rouletteState: RouletteState?
    @State private var enrichmentService: TourEnrichmentService?
    @State private var loadError: String?
    @State private var selectedTab: AppTab = .roulette
    @State private var deepLinkedTourId: Int?

    var body: some Scene {
        WindowGroup {
            Group {
                if let database, let rouletteState, let enrichmentService {
                    ContentView(
                        database: database,
                        settings: settings,
                        favorites: favorites,
                        rouletteState: rouletteState,
                        enrichmentService: enrichmentService,
                        exploredDestinations: exploredDestinations,
                        selectedTab: $selectedTab
                    )
                    .fullScreenCover(isPresented: Binding(
                        get: { deepLinkedTourId != nil },
                        set: { if !$0 { deepLinkedTourId = nil } }
                    )) {
                        if let tourId = deepLinkedTourId {
                            NavigationStack {
                                TourDetailView(
                                    tourId: tourId,
                                    database: database,
                                    favorites: favorites,
                                    enrichmentService: enrichmentService
                                )
                                .toolbar {
                                    ToolbarItem(placement: .topBarLeading) {
                                        Button {
                                            deepLinkedTourId = nil
                                        } label: {
                                            Image(systemName: "xmark.circle.fill")
                                                .font(.title3)
                                                .foregroundStyle(.white.opacity(0.6))
                                        }
                                    }
                                }
                            }
                            .preferredColorScheme(.dark)
                        }
                    }
                } else if let loadError {
                    VStack(spacing: 16) {
                        Image(systemName: "exclamationmark.triangle")
                            .font(.largeTitle)
                            .foregroundStyle(.yellow)
                        Text("Failed to load database")
                            .font(.headline)
                            .foregroundStyle(.white)
                        Text(loadError)
                            .font(.caption)
                            .foregroundStyle(.white.opacity(0.5))
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(Color.black)
                } else {
                    ZStack {
                        Color.black.ignoresSafeArea()
                        VStack(spacing: 24) {
                            Image("LogoWhite")
                                .resizable()
                                .aspectRatio(contentMode: .fit)
                                .frame(width: 200)
                            ProgressView()
                                .tint(.white)
                        }
                    }
                }
            }
            .preferredColorScheme(.dark)
            .task {
                do {
                    let db = try DatabaseService()
                    database = db
                    rouletteState = RouletteState(database: db)
                    enrichmentService = TourEnrichmentService(database: db)
                } catch {
                    loadError = error.localizedDescription
                }
            }
            .onOpenURL { url in
                handleDeepLink(url)
            }
            .onReceive(NotificationCenter.default.publisher(for: UIApplication.didBecomeActiveNotification)) { _ in
                handlePendingIntent()
            }
            .onContinueUserActivity(CSSearchableItemActionType) { activity in
                if let identifier = activity.userInfo?[CSSearchableItemActivityIdentifier] as? String,
                   let idString = identifier.split(separator: "-").last,
                   let tourId = Int(idString) {
                    deepLinkedTourId = tourId
                }
            }
        }
    }

    private func handleDeepLink(_ url: URL) {
        guard url.scheme == "tourgraph" else { return }

        switch url.host {
        case "tab":
            switch url.pathComponents.last {
            case "roulette": selectedTab = .roulette
            case "rightnow": selectedTab = .rightNow
            case "worldsmost": selectedTab = .worldsMost
            case "sixdegrees": selectedTab = .sixDegrees
            case "worldmap": selectedTab = .worldMap
            default: break
            }
        case "tour":
            if let idString = url.pathComponents.last, let tourId = Int(idString) {
                if deepLinkedTourId != nil {
                    // Dismiss current modal, then present the new one after a brief delay
                    deepLinkedTourId = nil
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) {
                        deepLinkedTourId = tourId
                    }
                } else {
                    deepLinkedTourId = tourId
                }
            }
        default:
            break
        }
    }

    /// Pick up pending navigation from App Intents (which run before the UI is ready).
    private func handlePendingIntent() {
        let manager = DeepLinkManager.shared
        if let tab = manager.pendingTab {
            selectedTab = tab
            manager.pendingTab = nil
        }
        if let tourId = manager.pendingTourId {
            deepLinkedTourId = tourId
            manager.pendingTourId = nil
        }
    }
}
