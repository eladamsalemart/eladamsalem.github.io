import Foundation
import ManagedSettings

/// Applies and removes the actual block. A single unnamed store is enough
/// because only one mode is ever active; the app and the extension both write
/// to it and the system keeps them in sync through the app group.
enum ShieldController {
    private static let store = ManagedSettingsStore()

    static func apply(_ mode: Mode) {
        let selection = mode.selection

        store.shield.applications = selection.applicationTokens.isEmpty
            ? nil
            : selection.applicationTokens

        store.shield.applicationCategories = selection.categoryTokens.isEmpty
            ? nil
            : .specific(selection.categoryTokens)

        store.shield.webDomains = selection.webDomainTokens.isEmpty
            ? nil
            : selection.webDomainTokens
    }

    static func clear() {
        store.shield.applications = nil
        store.shield.applicationCategories = nil
        store.shield.webDomains = nil
    }
}
