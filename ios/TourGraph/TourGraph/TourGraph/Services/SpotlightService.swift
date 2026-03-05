import CoreSpotlight
import UniformTypeIdentifiers

enum SpotlightService {
    static func indexTour(id: Int, title: String, oneLiner: String?, destinationName: String?, rating: Double?) {
        let attributeSet = CSSearchableItemAttributeSet(contentType: .content)
        attributeSet.title = title
        attributeSet.contentDescription = oneLiner ?? destinationName
        if let rating {
            attributeSet.rating = NSNumber(value: rating)
        }

        let item = CSSearchableItem(
            uniqueIdentifier: "tour-\(id)",
            domainIdentifier: "com.nikhilsi.TourGraph.tours",
            attributeSet: attributeSet
        )

        CSSearchableIndex.default().indexSearchableItems([item])
    }

    static func deindexTour(id: Int) {
        CSSearchableIndex.default().deleteSearchableItems(withIdentifiers: ["tour-\(id)"])
    }
}
