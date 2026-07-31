import Foundation
import FamilyControls

/// A named set of restrictions. Only one mode is active at a time.
struct Mode: Codable, Identifiable, Hashable {
    var id: String
    var name: String

    /// Apps, categories and web domains to block. The tokens inside are opaque —
    /// they can be stored and shielded but never resolved back to an app name,
    /// which is why the picker is the only way to build this set.
    var selection: FamilyActivitySelection

    /// When set, the mode turns itself on and off every day at these times.
    var schedule: DailySchedule?

    /// Fallback length when the mode is started by hand.
    var defaultDurationMinutes: Int

    init(
        id: String = UUID().uuidString,
        name: String,
        selection: FamilyActivitySelection = FamilyActivitySelection(),
        schedule: DailySchedule? = nil,
        defaultDurationMinutes: Int = 90
    ) {
        self.id = id
        self.name = name
        self.selection = selection
        self.schedule = schedule
        self.defaultDurationMinutes = defaultDurationMinutes
    }

    var isEmpty: Bool {
        selection.applicationTokens.isEmpty
            && selection.categoryTokens.isEmpty
            && selection.webDomainTokens.isEmpty
    }
}

struct DailySchedule: Codable, Hashable {
    var startHour: Int
    var startMinute: Int
    var endHour: Int
    var endMinute: Int

    var start: DateComponents { DateComponents(hour: startHour, minute: startMinute) }
    var end: DateComponents { DateComponents(hour: endHour, minute: endMinute) }

    /// True for windows that run past midnight, like 23:00–07:00.
    var crossesMidnight: Bool {
        (endHour * 60 + endMinute) <= (startHour * 60 + startMinute)
    }

    var displayText: String {
        String(format: "%02d:%02d – %02d:%02d", startHour, startMinute, endHour, endMinute)
    }
}

extension Mode {
    /// The three modes the app ships with. Each starts with an empty selection —
    /// apps get attached on first edit, since tokens only come from the picker.
    static var starterSet: [Mode] {
        [
            Mode(
                id: "sleep",
                name: "שינה",
                schedule: DailySchedule(startHour: 23, startMinute: 0, endHour: 7, endMinute: 0),
                defaultDurationMinutes: 480
            ),
            Mode(id: "class", name: "שיעור", defaultDurationMinutes: 90),
            Mode(id: "focus", name: "עבודה", defaultDurationMinutes: 60),
        ]
    }
}
