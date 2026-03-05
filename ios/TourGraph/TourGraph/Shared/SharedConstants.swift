import Foundation

enum SharedConstants {
    static let appGroupID = "group.com.nikhilsi.TourGraph"
    static let dbFilename = "tourgraph.db"

    /// Returns the shared App Group container URL for the database.
    static var sharedDBURL: URL? {
        guard let containerURL = FileManager.default.containerURL(
            forSecurityApplicationGroupIdentifier: appGroupID
        ) else { return nil }
        return containerURL.appendingPathComponent(dbFilename)
    }
}
