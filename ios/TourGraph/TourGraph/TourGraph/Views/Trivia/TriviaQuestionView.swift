import SwiftUI

/// Displays a single trivia question with animated option selection.
struct TriviaQuestionView: View {
    let question: TriviaQuestion
    let questionNumber: Int
    let totalQuestions: Int
    let answer: TriviaAnswerResult?
    let onSelect: (Int) -> Void
    let onContinue: () -> Void

    @State private var selectedIndex: Int?
    @State private var showReveal = false

    private var format: TriviaFormat? {
        TriviaFormat(rawValue: question.format)
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Progress + format badge
                HStack {
                    if totalQuestions > 0 {
                        Text("\(questionNumber)/\(totalQuestions)")
                            .font(.subheadline.bold())
                            .foregroundStyle(.white.opacity(0.5))
                    } else {
                        Text("Q\(questionNumber)")
                            .font(.subheadline.bold())
                            .foregroundStyle(.white.opacity(0.5))
                    }

                    Spacer()

                    if let format {
                        Label(format.displayName, systemImage: format.icon)
                            .font(.caption.bold())
                            .foregroundStyle(.white.opacity(0.8))
                            .padding(.horizontal, 10)
                            .padding(.vertical, 5)
                            .background(Color.white.opacity(0.1))
                            .clipShape(Capsule())
                    }
                }

                // Question
                Text(question.question)
                    .font(.title3.bold())
                    .foregroundStyle(.white)
                    .multilineTextAlignment(.leading)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.vertical, 4)

                // Options
                ForEach(Array(question.options.enumerated()), id: \.element.id) { index, option in
                    OptionButton(
                        label: option.label,
                        text: option.text,
                        state: optionState(for: index),
                        action: { selectOption(index) }
                    )
                }

                // Reveal
                if let answer, showReveal {
                    RevealCard(answer: answer)
                        .transition(.move(edge: .bottom).combined(with: .opacity))

                    Button(action: onContinue) {
                        Text(totalQuestions > 0 && questionNumber >= totalQuestions ? "See Results" : "Next Question")
                            .font(.headline)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                            .background(Color.blue)
                            .foregroundStyle(.white)
                            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                    }
                    .padding(.top, 4)
                }
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 16)
        }
        .onChange(of: answer) { _, newAnswer in
            if newAnswer != nil {
                withAnimation(.spring(duration: 0.4)) {
                    showReveal = true
                }
            }
        }
        .onChange(of: question.id) { _, _ in
            selectedIndex = nil
            showReveal = false
        }
    }

    private func selectOption(_ index: Int) {
        guard answer == nil else { return }
        selectedIndex = index
        onSelect(index)
    }

    fileprivate enum OptionState {
        case idle, selected, correct, wrong
    }

    private func optionState(for index: Int) -> OptionState {
        guard let answer else {
            return selectedIndex == index ? .selected : .idle
        }
        if index == answer.correctIndex { return .correct }
        if index == answer.selectedIndex && !answer.correct { return .wrong }
        return .idle
    }
}

// MARK: - Option Button

private struct OptionButton: View {
    let label: String
    let text: String
    let state: TriviaQuestionView.OptionState
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 12) {
                Text(label)
                    .font(.subheadline.bold().monospaced())
                    .foregroundStyle(labelColor)
                    .frame(width: 28, height: 28)
                    .background(labelBackground)
                    .clipShape(Circle())

                Text(text)
                    .font(.subheadline)
                    .foregroundStyle(.white)
                    .multilineTextAlignment(.leading)
                    .frame(maxWidth: .infinity, alignment: .leading)

                if state == .correct {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundStyle(.green)
                } else if state == .wrong {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundStyle(.red)
                }
            }
            .padding(14)
            .background(backgroundStyle)
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .strokeBorder(borderColor, lineWidth: borderWidth)
            )
        }
        .disabled(state == .correct || state == .wrong)
        .animation(.easeInOut(duration: 0.2), value: state)
    }

    private var labelColor: Color {
        switch state {
        case .idle: .white.opacity(0.6)
        case .selected: .white
        case .correct: .white
        case .wrong: .white
        }
    }

    private var labelBackground: Color {
        switch state {
        case .idle: .white.opacity(0.1)
        case .selected: .blue.opacity(0.6)
        case .correct: .green.opacity(0.8)
        case .wrong: .red.opacity(0.8)
        }
    }

    private var backgroundStyle: Color {
        switch state {
        case .idle: .white.opacity(0.05)
        case .selected: .blue.opacity(0.1)
        case .correct: .green.opacity(0.1)
        case .wrong: .red.opacity(0.1)
        }
    }

    private var borderColor: Color {
        switch state {
        case .idle: .white.opacity(0.1)
        case .selected: .blue.opacity(0.4)
        case .correct: .green.opacity(0.5)
        case .wrong: .red.opacity(0.5)
        }
    }

    private var borderWidth: CGFloat {
        state == .idle ? 1 : 2
    }
}

// MARK: - Reveal Card

private struct RevealCard: View {
    let answer: TriviaAnswerResult

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 8) {
                Image(systemName: answer.correct ? "checkmark.circle.fill" : "xmark.circle.fill")
                    .foregroundStyle(answer.correct ? .green : .red)
                    .font(.title3)

                Text(answer.correct ? "Correct!" : "Not quite!")
                    .font(.headline)
                    .foregroundStyle(.white)
            }

            Text(answer.reveal.fact)
                .font(.subheadline)
                .foregroundStyle(.white.opacity(0.8))
                .fixedSize(horizontal: false, vertical: true)

            if let imageUrl = answer.reveal.imageUrl, let url = URL(string: imageUrl) {
                AsyncImage(url: url) { phase in
                    if let image = phase.image {
                        image
                            .resizable()
                            .aspectRatio(3/2, contentMode: .fill)
                            .frame(maxHeight: 160)
                            .clipped()
                            .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                    }
                }
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.white.opacity(0.08))
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    }
}
