import SwiftUI

/// Small pill showing a stat (rating, price, duration).
struct StatBadge: View {
    let icon: String
    let text: String
    var color: Color = .white.opacity(0.7)

    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: icon)
                .font(.caption2)
            Text(text)
                .font(.caption)
        }
        .foregroundStyle(color)
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(Color.white.opacity(0.1))
        .clipShape(Capsule())
    }
}
