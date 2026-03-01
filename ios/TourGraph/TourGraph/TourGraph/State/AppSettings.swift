import Foundation

@Observable
final class AppSettings: Sendable {
    var hapticsEnabled: Bool {
        didSet { UserDefaults.standard.set(hapticsEnabled, forKey: "hapticsEnabled") }
    }

    init() {
        // Default to true if never set
        if UserDefaults.standard.object(forKey: "hapticsEnabled") == nil {
            UserDefaults.standard.set(true, forKey: "hapticsEnabled")
        }
        self.hapticsEnabled = UserDefaults.standard.bool(forKey: "hapticsEnabled")
    }
}
