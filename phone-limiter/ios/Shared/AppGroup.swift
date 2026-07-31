import Foundation

enum AppGroup {
    static let identifier = "group.com.eladamsalem.limiter"

    static let defaults = UserDefaults(suiteName: identifier)!

    enum Key {
        static let modes = "modes"
        static let activeModeID = "activeModeID"
        static let activeUntil = "activeUntil"
    }
}
