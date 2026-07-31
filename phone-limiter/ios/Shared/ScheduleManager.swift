import Foundation
import DeviceActivity

enum ScheduleError: LocalizedError {
    case tooShort

    var errorDescription: String? {
        switch self {
        case .tooShort:
            return "המערכת של אפל לא מאפשרת חלון קצר מ-\(ScheduleManager.minimumMinutes) דקות."
        }
    }
}

enum ScheduleManager {
    /// Apple's floor for a DeviceActivity interval. Anything shorter is rejected
    /// by the system, which is why per-app windows of seconds need a different
    /// mechanism than a schedule.
    static let minimumMinutes = 15

    private static let center = DeviceActivityCenter()

    static func activityName(for modeID: String) -> DeviceActivityName {
        DeviceActivityName("mode.\(modeID)")
    }

    static func modeID(from activity: DeviceActivityName) -> String? {
        let prefix = "mode."
        guard activity.rawValue.hasPrefix(prefix) else { return nil }
        return String(activity.rawValue.dropFirst(prefix.count))
    }

    /// Recurring window, e.g. sleep from 23:00 to 07:00 every day.
    static func startDaily(_ mode: Mode, schedule: DailySchedule) throws {
        let activitySchedule = DeviceActivitySchedule(
            intervalStart: schedule.start,
            intervalEnd: schedule.end,
            repeats: true
        )
        try center.startMonitoring(activityName(for: mode.id), during: activitySchedule)
    }

    /// One-off window starting now, e.g. a 90 minute class.
    static func startTimed(_ mode: Mode, minutes: Int) throws {
        guard minutes >= minimumMinutes else { throw ScheduleError.tooShort }

        let calendar = Calendar.current
        let now = Date()
        let end = now.addingTimeInterval(TimeInterval(minutes * 60))
        let fields: Set<Calendar.Component> = [.hour, .minute, .second]

        let activitySchedule = DeviceActivitySchedule(
            intervalStart: calendar.dateComponents(fields, from: now.addingTimeInterval(5)),
            intervalEnd: calendar.dateComponents(fields, from: end),
            repeats: false
        )
        try center.startMonitoring(activityName(for: mode.id), during: activitySchedule)
    }

    static func stop(_ modeID: String) {
        center.stopMonitoring([activityName(for: modeID)])
    }

    static func stopAll() {
        center.stopMonitoring()
    }

    static func isMonitoring(_ modeID: String) -> Bool {
        center.activities.contains(activityName(for: modeID))
    }
}
