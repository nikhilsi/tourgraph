import SwiftUI
import UIKit

struct RouletteView: View {
    let rouletteState: RouletteState
    let settings: AppSettings
    let favorites: Favorites
    let enrichmentService: TourEnrichmentService

    @State private var dragOffset: CGFloat = 0
    @State private var cardOpacity: Double = 1
    @State private var cardEntryOffset: CGFloat = 0
    @State private var showSettings = false
    @State private var isRenderingCard = false
    @State private var showShareSheet = false
    @State private var shareCardImage: UIImage?

    var body: some View {
        NavigationStack {
            ZStack {
                Color.black.ignoresSafeArea()

                if rouletteState.isLoading {
                    loadingView
                } else if let tour = rouletteState.currentTour {
                    cardStack(tour: tour)
                } else if let error = rouletteState.error {
                    errorView(error)
                } else {
                    initialView
                }
            }
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button { showSettings = true } label: {
                        Image(systemName: "gearshape")
                            .foregroundStyle(.white.opacity(0.6))
                    }
                    .accessibilityLabel("Settings")
                }
            }
            .sheet(isPresented: $showSettings) {
                SettingsView(settings: settings, favorites: favorites, database: rouletteState.database, enrichmentService: enrichmentService)
            }
            .sheet(isPresented: $showShareSheet) {
                if let image = shareCardImage, let tour = rouletteState.currentTour,
                   let shareURL = URL(string: "https://tourgraph.ai/roulette/\(tour.id)") {
                    ShareSheet(items: [image, shareURL])
                }
            }
            .onAppear {
                if rouletteState.currentTour == nil {
                    rouletteState.fetchHand()
                }
            }
        }
    }

    // MARK: - Card with swipe gesture

    @ViewBuilder
    private func cardStack(tour: Tour) -> some View {
        VStack(spacing: 0) {
            // Logo
            Image("LogoWhite")
                .resizable()
                .aspectRatio(contentMode: .fit)
                .frame(height: 28)
                .padding(.top, 12)
                .padding(.bottom, 16)

            // Tour card with swipe
            NavigationLink(value: tour.id) {
                TourCardView(tour: tour, favorites: favorites)
                    .padding(.horizontal, 20)
            }
            .buttonStyle(.plain)
            .offset(x: dragOffset, y: cardEntryOffset)
            .opacity(cardOpacity)
            .rotation3DEffect(
                .degrees(Double(dragOffset) / 20),
                axis: (x: 0, y: 0, z: 1)
            )
            .gesture(swipeGesture)

            Spacer(minLength: 16)

            // Bottom controls
            HStack(spacing: 24) {
                Button {
                    Task {
                        isRenderingCard = true
                        shareCardImage = await ShareCardRenderer.renderTourCard(tour: tour)
                        isRenderingCard = false
                        if shareCardImage != nil {
                            showShareSheet = true
                        }
                    }
                } label: {
                    if isRenderingCard {
                        ProgressView()
                            .tint(.white.opacity(0.6))
                    } else {
                        Label("Share", systemImage: "square.and.arrow.up")
                            .font(.subheadline)
                            .foregroundStyle(.white.opacity(0.6))
                    }
                }
                .disabled(isRenderingCard)

                Button {
                    cardOpacity = 0
                    cardEntryOffset = 30
                    nextTour()
                    withAnimation(.spring(response: 0.5, dampingFraction: 0.8)) {
                        cardOpacity = 1
                        cardEntryOffset = 0
                    }
                } label: {
                    Text("Show Me Another")
                        .font(.headline)
                        .foregroundStyle(.black)
                        .padding(.horizontal, 24)
                        .padding(.vertical, 12)
                        .background(.white)
                        .clipShape(Capsule())
                }
            }
            .padding(.bottom, 16)
        }
        .navigationDestination(for: Int.self) { tourId in
            TourDetailView(tourId: tourId, database: rouletteState.database, favorites: favorites, enrichmentService: enrichmentService)
        }
    }

    // MARK: - Swipe gesture

    private var swipeGesture: some Gesture {
        DragGesture()
            .onChanged { value in
                dragOffset = value.translation.width
                cardOpacity = 1 - abs(Double(dragOffset) / 300)
            }
            .onEnded { value in
                if abs(value.translation.width) > 100 {
                    let direction: CGFloat = value.translation.width > 0 ? 1 : -1
                    withAnimation(.easeOut(duration: 0.2)) {
                        dragOffset = direction * 400
                        cardOpacity = 0
                    }
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
                        nextTour()
                        dragOffset = 0
                        cardOpacity = 1
                        cardEntryOffset = 30
                        withAnimation(.spring(response: 0.5, dampingFraction: 0.8)) {
                            cardEntryOffset = 0
                        }
                    }
                } else {
                    withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                        dragOffset = 0
                        cardOpacity = 1
                    }
                }
            }
    }

    private func nextTour() {
        if settings.hapticsEnabled {
            rouletteState.triggerHaptic()
        }
        rouletteState.spin()
    }

    // MARK: - States

    private var loadingView: some View {
        VStack(spacing: 16) {
            ProgressView()
                .tint(.white)
            Text("Finding something amazing...")
                .font(.subheadline)
                .foregroundStyle(.white.opacity(0.5))
        }
    }

    private var initialView: some View {
        VStack(spacing: 20) {
            Text("TourGraph")
                .font(.largeTitle.bold())
                .foregroundStyle(.white)
            Text("The world's most surprising tours.\nOne tap at a time.")
                .font(.subheadline)
                .foregroundStyle(.white.opacity(0.6))
                .multilineTextAlignment(.center)
            Button("Spin") {
                rouletteState.fetchHand()
            }
            .font(.headline)
            .foregroundStyle(.black)
            .padding(.horizontal, 32)
            .padding(.vertical, 14)
            .background(.white)
            .clipShape(Capsule())
        }
    }

    private func errorView(_ message: String) -> some View {
        VStack(spacing: 16) {
            Image(systemName: "exclamationmark.triangle")
                .font(.largeTitle)
                .foregroundStyle(.yellow)
            Text(message)
                .foregroundStyle(.white.opacity(0.7))
            Button("Try Again") {
                rouletteState.fetchHand()
            }
            .foregroundStyle(.white)
        }
    }
}
