import SwiftUI

struct MilestoneToast: View {
    let message: String
    let icon: String
    var isWelcome: Bool = false

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundStyle(.yellow)
            Text(message)
                .font(.subheadline.bold())
                .foregroundStyle(.white)
            Spacer()
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 16)
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(Color.black.opacity(0.85))
                .shadow(color: .black.opacity(0.4), radius: 12)
        )
        .padding(.horizontal, 16)
    }
}

struct MilestoneConfig {
    let message: String
    let icon: String

    static func check(count: Int) -> MilestoneConfig? {
        switch count {
        case 1:
            return MilestoneConfig(message: "Your journey begins.", icon: "sparkles")
        case 5:
            return MilestoneConfig(message: "5 destinations. Warming up!", icon: "flame")
        case 10:
            return MilestoneConfig(message: "Double digits! 10 explored.", icon: "star.fill")
        case 25:
            return MilestoneConfig(message: "25! You're a real explorer.", icon: "globe.americas.fill")
        case 50:
            return MilestoneConfig(message: "50 destinations explored!", icon: "trophy")
        case 100:
            return MilestoneConfig(message: "100! More than most will ever see.", icon: "crown")
        case 250:
            return MilestoneConfig(message: "250. You're relentless.", icon: "bolt.fill")
        case 500:
            return MilestoneConfig(message: "500! Half the world explored.", icon: "globe")
        case 1000:
            return MilestoneConfig(message: "1,000. Legendary explorer.", icon: "medal")
        default:
            return nil
        }
    }

    static let welcome = MilestoneConfig(
        message: "Tap a destination to start exploring.",
        icon: "hand.tap"
    )
}
