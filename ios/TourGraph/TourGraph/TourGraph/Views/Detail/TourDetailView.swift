import SwiftUI

struct TourDetailView: View {
    let tourId: Int
    let database: DatabaseService

    @State private var tour: Tour?

    var body: some View {
        ScrollView {
            if let tour {
                VStack(alignment: .leading, spacing: 16) {
                    // Hero image
                    AsyncImage(url: tour.imageURL) { phase in
                        switch phase {
                        case .success(let image):
                            image
                                .resizable()
                                .aspectRatio(3/2, contentMode: .fill)
                        default:
                            Rectangle()
                                .fill(Color.white.opacity(0.1))
                                .aspectRatio(3/2, contentMode: .fit)
                        }
                    }
                    .clipShape(RoundedRectangle(cornerRadius: 12))

                    VStack(alignment: .leading, spacing: 12) {
                        // Title
                        Text(tour.title)
                            .font(.title2.bold())
                            .foregroundStyle(.white)

                        // One-liner
                        if let oneLiner = tour.oneLiner, !oneLiner.isEmpty {
                            Text(oneLiner)
                                .font(.body)
                                .foregroundStyle(.white.opacity(0.7))
                                .italic()
                        }

                        // Location
                        if let dest = tour.destinationName, !dest.isEmpty {
                            HStack(spacing: 4) {
                                Image(systemName: "mappin.circle.fill")
                                Text([dest, tour.country].compactMap { $0 }.filter { !$0.isEmpty }.joined(separator: ", "))
                            }
                            .font(.subheadline)
                            .foregroundStyle(.white.opacity(0.5))
                        }

                        // Stats
                        HStack(spacing: 8) {
                            if let r = tour.rating, r > 0 {
                                StatBadge(icon: "star.fill", text: tour.displayRating, color: .yellow)
                            }
                            if let rc = tour.reviewCount, rc > 0 {
                                StatBadge(icon: "person.2", text: "\(rc) reviews")
                            }
                            if tour.fromPrice != nil {
                                StatBadge(icon: "dollarsign", text: tour.displayPrice, color: .green)
                            }
                            if tour.durationMinutes != nil {
                                StatBadge(icon: "clock", text: tour.displayDuration)
                            }
                        }

                        // Description
                        if let desc = tour.description, !desc.isEmpty {
                            Text(desc)
                                .font(.body)
                                .foregroundStyle(.white.opacity(0.8))
                                .padding(.top, 8)
                        }

                        // Highlights
                        if !tour.highlights.isEmpty {
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Highlights")
                                    .font(.headline)
                                    .foregroundStyle(.white)
                                ForEach(tour.highlights, id: \.self) { highlight in
                                    HStack(alignment: .top, spacing: 8) {
                                        Text("•")
                                            .foregroundStyle(.white.opacity(0.4))
                                        Text(highlight)
                                            .foregroundStyle(.white.opacity(0.7))
                                    }
                                    .font(.subheadline)
                                }
                            }
                            .padding(.top, 8)
                        }

                        // Book on Viator button
                        if let url = tour.viatorURL {
                            Link(destination: url) {
                                HStack {
                                    Image(systemName: "arrow.up.right")
                                    Text("Book on Viator")
                                }
                                .font(.headline)
                                .foregroundStyle(.black)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 14)
                                .background(.white)
                                .clipShape(RoundedRectangle(cornerRadius: 12))
                            }
                            .padding(.top, 8)
                        }

                        // Share
                        ShareLink(
                            item: URL(string: "https://tourgraph.ai/roulette/\(tour.id)")!,
                            subject: Text(tour.title),
                            message: Text(tour.oneLiner ?? tour.title)
                        ) {
                            HStack {
                                Image(systemName: "square.and.arrow.up")
                                Text("Share")
                            }
                            .font(.headline)
                            .foregroundStyle(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                            .background(Color.white.opacity(0.15))
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                        }
                    }
                    .padding(.horizontal, 20)
                }
            } else {
                ProgressView()
                    .tint(.white)
                    .frame(maxWidth: .infinity, minHeight: 300)
            }
        }
        .background(Color.black)
        .navigationBarTitleDisplayMode(.inline)
        .task {
            tour = try? database.getTourById(tourId)
        }
    }
}
