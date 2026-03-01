import SwiftUI

struct RouletteView: View {
    let rouletteState: RouletteState
    let settings: AppSettings

    @State private var dragOffset: CGFloat = 0
    @State private var cardOpacity: Double = 1

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
                    // Initial state — prompt first spin
                    initialView
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
            // Tagline
            Text("The world's most surprising tours")
                .font(.caption)
                .foregroundStyle(.white.opacity(0.4))
                .padding(.top, 8)

            Spacer()

            // Tour card with swipe
            NavigationLink(value: tour.id) {
                TourCardView(tour: tour)
                    .padding(.horizontal, 20)
            }
            .buttonStyle(.plain)
            .offset(x: dragOffset)
            .opacity(cardOpacity)
            .gesture(swipeGesture)

            Spacer()

            // Bottom controls
            HStack(spacing: 24) {
                ShareLink(
                    item: URL(string: "https://tourgraph.ai/roulette/\(tour.id)")!,
                    subject: Text(tour.title),
                    message: Text(tour.oneLiner ?? tour.title)
                ) {
                    Label("Share", systemImage: "square.and.arrow.up")
                        .font(.subheadline)
                        .foregroundStyle(.white.opacity(0.6))
                }

                Button {
                    nextTour()
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
            TourDetailView(tourId: tourId, database: rouletteState.database)
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
                    // Swipe threshold met — animate off screen then swap
                    let direction: CGFloat = value.translation.width > 0 ? 1 : -1
                    withAnimation(.easeOut(duration: 0.2)) {
                        dragOffset = direction * 400
                        cardOpacity = 0
                    }
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
                        nextTour()
                        dragOffset = 0
                        cardOpacity = 1
                    }
                } else {
                    // Snap back
                    withAnimation(.spring()) {
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
