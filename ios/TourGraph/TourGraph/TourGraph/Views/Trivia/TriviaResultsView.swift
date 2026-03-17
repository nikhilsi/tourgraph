import SwiftUI

/// End-of-game results screen with score, streak, Travel IQ, and sharing.
struct TriviaResultsView: View {
    let triviaState: TriviaState
    let settings: AppSettings

    @State private var showShareSheet = false
    @State private var animateScore = false

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(spacing: 28) {
                // Score circle
                scoreCircle
                    .padding(.top, 20)

                // Streak + Travel IQ badges
                HStack(spacing: 16) {
                    statCard(
                        icon: "flame.fill",
                        title: "Streak",
                        value: "\(triviaState.currentStreak)",
                        color: .orange
                    )

                    statCard(
                        icon: triviaState.travelIQ.icon,
                        title: "Travel IQ",
                        value: triviaState.travelIQ.title,
                        color: .cyan
                    )
                }
                .padding(.horizontal, 20)

                // Per-question results
                VStack(spacing: 10) {
                    ForEach(Array(zip(triviaState.dailyQuestions, triviaState.answers)), id: \.0.id) { question, answer in
                        HStack(spacing: 12) {
                            Image(systemName: answer.correct ? "checkmark.circle.fill" : "xmark.circle.fill")
                                .foregroundStyle(answer.correct ? .green : .red)
                                .font(.body)

                            if let format = TriviaFormat(rawValue: question.format) {
                                Image(systemName: format.icon)
                                    .font(.caption)
                                    .foregroundStyle(.white.opacity(0.4))
                                    .frame(width: 20)
                            }

                            Text(question.question)
                                .font(.subheadline)
                                .foregroundStyle(.white.opacity(0.7))
                                .lineLimit(2)
                                .frame(maxWidth: .infinity, alignment: .leading)
                        }
                        .padding(.horizontal, 20)
                    }
                }

                // Stats from server (if available)
                if let stats = triviaState.stats, stats.totalPlayers > 1 {
                    serverStatsCard(stats)
                        .padding(.horizontal, 20)
                }

                // Share button
                Button {
                    showShareSheet = true
                } label: {
                    Label("Share Results", systemImage: "square.and.arrow.up")
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(Color.blue)
                        .foregroundStyle(.white)
                        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                }
                .padding(.horizontal, 20)

                // Points breakdown
                VStack(spacing: 6) {
                    Text("Points earned")
                        .font(.caption)
                        .foregroundStyle(.white.opacity(0.4))
                    Text("+\(triviaState.score * 10 + min(triviaState.currentStreak, 10))")
                        .font(.title2.bold())
                        .foregroundStyle(.cyan)
                    Text("Total: \(triviaState.totalPoints) pts")
                        .font(.caption)
                        .foregroundStyle(.white.opacity(0.5))

                    if let next = triviaState.travelIQ.next {
                        Text("\(next.rawValue - triviaState.totalPoints) pts to \(next.title)")
                            .font(.caption2)
                            .foregroundStyle(.white.opacity(0.3))
                    }
                }
                .padding(.bottom, 20)
            }
        }
        .sheet(isPresented: $showShareSheet) {
            ShareSheet(items: [triviaState.shareText])
        }
        .onAppear {
            withAnimation(.spring(duration: 0.6).delay(0.2)) {
                animateScore = true
            }
        }
    }

    // MARK: - Score Circle

    private var scoreCircle: some View {
        VStack(spacing: 8) {
            ZStack {
                Circle()
                    .stroke(Color.white.opacity(0.1), lineWidth: 8)
                    .frame(width: 120, height: 120)

                Circle()
                    .trim(from: 0, to: animateScore ? CGFloat(triviaState.score) / 5.0 : 0)
                    .stroke(scoreColor, style: StrokeStyle(lineWidth: 8, lineCap: .round))
                    .frame(width: 120, height: 120)
                    .rotationEffect(.degrees(-90))

                VStack(spacing: 2) {
                    Text("\(triviaState.score)")
                        .font(.system(size: 44, weight: .bold, design: .rounded))
                        .foregroundStyle(.white)
                    Text("of 5")
                        .font(.subheadline)
                        .foregroundStyle(.white.opacity(0.5))
                }
            }

            Text(scoreMessage)
                .font(.headline)
                .foregroundStyle(.white.opacity(0.8))
        }
    }

    private var scoreColor: Color {
        switch triviaState.score {
        case 5: .green
        case 4: .cyan
        case 3: .yellow
        case 2: .orange
        default: .red
        }
    }

    private var scoreMessage: String {
        switch triviaState.score {
        case 5: "Perfect score!"
        case 4: "Almost perfect!"
        case 3: "Solid effort!"
        case 2: "Room to grow"
        case 1: "Better luck tomorrow"
        default: "Tomorrow's a new day"
        }
    }

    // MARK: - Stat Card

    private func statCard(icon: String, title: String, value: String, color: Color) -> some View {
        VStack(spacing: 6) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundStyle(color)
            Text(value)
                .font(.headline)
                .foregroundStyle(.white)
            Text(title)
                .font(.caption)
                .foregroundStyle(.white.opacity(0.5))
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 16)
        .background(Color.white.opacity(0.06))
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }

    // MARK: - Server Stats

    private func serverStatsCard(_ stats: TriviaStatsResponse) -> some View {
        VStack(spacing: 10) {
            Text("How you compare")
                .font(.subheadline.bold())
                .foregroundStyle(.white.opacity(0.6))

            HStack(spacing: 24) {
                VStack(spacing: 2) {
                    Text("\(stats.totalPlayers)")
                        .font(.headline)
                        .foregroundStyle(.white)
                    Text("Players")
                        .font(.caption2)
                        .foregroundStyle(.white.opacity(0.4))
                }

                if let avg = stats.avgScore {
                    VStack(spacing: 2) {
                        Text(String(format: "%.1f", avg))
                            .font(.headline)
                            .foregroundStyle(.white)
                        Text("Avg Score")
                            .font(.caption2)
                            .foregroundStyle(.white.opacity(0.4))
                    }
                }

                if let percentile = stats.percentile {
                    VStack(spacing: 2) {
                        Text("Top \(100 - percentile)%")
                            .font(.headline)
                            .foregroundStyle(.cyan)
                        Text("Percentile")
                            .font(.caption2)
                            .foregroundStyle(.white.opacity(0.4))
                    }
                }
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity)
        .background(Color.white.opacity(0.06))
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }
}

