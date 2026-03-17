import SwiftUI

/// In-app explainer shown BEFORE the system location permission dialog.
/// Builds trust by explaining what we do and don't do with location data.
struct NearbyAlertsExplainer: View {
    let travelService: TravelAwarenessService
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(spacing: 28) {
                    // Hero
                    VStack(spacing: 12) {
                        Image(systemName: "location.circle.fill")
                            .font(.system(size: 56))
                            .foregroundStyle(.blue)

                        Text("Nearby Alerts")
                            .font(.title.bold())
                            .foregroundStyle(.white)

                        Text("Your World Map lights up automatically as you travel")
                            .font(.subheadline)
                            .foregroundStyle(.white.opacity(0.6))
                            .multilineTextAlignment(.center)
                    }
                    .padding(.top, 32)

                    // What happens
                    VStack(spacing: 16) {
                        featureRow(
                            icon: "mappin.and.ellipse",
                            color: .green,
                            title: "Auto-discover destinations",
                            subtitle: "When you arrive in a city with tours, your map pin turns blue automatically"
                        )

                        featureRow(
                            icon: "bell.badge",
                            color: .orange,
                            title: "A gentle welcome",
                            subtitle: "One quiet notification per city — never spammy (max 2 per day)"
                        )

                        featureRow(
                            icon: "battery.100percent",
                            color: .cyan,
                            title: "Minimal battery impact",
                            subtitle: "Uses cell towers, not GPS — the same tech your phone already uses"
                        )
                    }
                    .padding(.horizontal, 4)

                    // Privacy promise
                    VStack(spacing: 8) {
                        HStack(spacing: 8) {
                            Image(systemName: "lock.shield")
                                .foregroundStyle(.green)
                            Text("Privacy first")
                                .font(.subheadline.bold())
                                .foregroundStyle(.white)
                        }

                        Text("Your location never leaves your device. We don't store, share, or upload it. No accounts, no tracking. You can turn this off anytime in your Profile.")
                            .font(.caption)
                            .foregroundStyle(.white.opacity(0.5))
                            .multilineTextAlignment(.center)
                    }
                    .padding(16)
                    .background(Color.white.opacity(0.06))
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                }
                .padding(.horizontal, 24)
            }

            // Action buttons
            VStack(spacing: 12) {
                Button {
                    travelService.nearbyAlertsEnabled = true
                    if travelService.permissionState == .notDetermined {
                        travelService.requestWhenInUse()
                    }
                    dismiss()
                } label: {
                    Text("Enable Nearby Alerts")
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(Color.blue)
                        .foregroundStyle(.white)
                        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                }

                Button {
                    dismiss()
                } label: {
                    Text("Not Now")
                        .font(.subheadline)
                        .foregroundStyle(.white.opacity(0.5))
                }
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 32)
            .padding(.top, 16)
        }
        .background(Color.black)
    }

    private func featureRow(icon: String, color: Color, title: String, subtitle: String) -> some View {
        HStack(alignment: .top, spacing: 14) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundStyle(color)
                .frame(width: 32)

            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.subheadline.bold())
                    .foregroundStyle(.white)
                Text(subtitle)
                    .font(.caption)
                    .foregroundStyle(.white.opacity(0.5))
            }

            Spacer()
        }
    }
}
