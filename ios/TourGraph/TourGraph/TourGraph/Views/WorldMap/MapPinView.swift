import SwiftUI

enum PinState {
    case visited    // Physically visited (travel detection) — blue
    case explored   // Explored in-app (tapped on map) — green
    case unexplored // Not yet touched — orange
}

struct MapPinView: View {
    let name: String
    let tourCount: Int
    let pinState: PinState

    /// Backwards-compatible init for existing code
    init(name: String, tourCount: Int, isExplored: Bool) {
        self.name = name
        self.tourCount = tourCount
        self.pinState = isExplored ? .explored : .unexplored
    }

    init(name: String, tourCount: Int, pinState: PinState) {
        self.name = name
        self.tourCount = tourCount
        self.pinState = pinState
    }

    var body: some View {
        ZStack {
            // Outer glow
            Circle()
                .fill(pinColor.opacity(0.3))
                .frame(width: pinSize + 8, height: pinSize + 8)

            // Main pin
            Circle()
                .fill(pinColor)
                .frame(width: pinSize, height: pinSize)
                .overlay {
                    Circle()
                        .strokeBorder(.white.opacity(0.6), lineWidth: 1)
                }
        }
        .shadow(color: pinColor.opacity(0.8), radius: 6)
    }

    private var pinColor: Color {
        switch pinState {
        case .visited: .blue
        case .explored: .green
        case .unexplored: .orange
        }
    }

    private var pinSize: CGFloat {
        if tourCount >= 100 { return 22 }
        if tourCount >= 50 { return 18 }
        if tourCount >= 10 { return 14 }
        return 10
    }
}
