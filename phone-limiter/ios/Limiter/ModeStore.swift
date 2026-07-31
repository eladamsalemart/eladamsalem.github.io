import Foundation

@MainActor
final class ModeStore: ObservableObject {
    @Published var modes: [Mode]
    @Published private(set) var activeModeID: String?
    @Published private(set) var activeUntil: Date?
    @Published var lastError: String?

    init() {
        modes = ModeStorage.loadModes()
        activeModeID = ModeStorage.activeModeID
        activeUntil = ModeStorage.activeUntil
    }

    var activeMode: Mode? {
        guard let activeModeID else { return nil }
        return modes.first { $0.id == activeModeID }
    }

    func refresh() {
        modes = ModeStorage.loadModes()
        activeModeID = ModeStorage.activeModeID
        activeUntil = ModeStorage.activeUntil
    }

    func update(_ mode: Mode) {
        if let index = modes.firstIndex(where: { $0.id == mode.id }) {
            modes[index] = mode
        } else {
            modes.append(mode)
        }
        ModeStorage.saveModes(modes)

        // Keep the running block in step with an edit made while it is on.
        if mode.id == activeModeID {
            ShieldController.apply(mode)
        }
    }

    func delete(at offsets: IndexSet) {
        for index in offsets where modes[index].id == activeModeID {
            deactivate()
        }
        modes.remove(atOffsets: offsets)
        ModeStorage.saveModes(modes)
    }

    /// Turns a mode on now. `minutes` overrides the mode's default length.
    func activate(_ mode: Mode, minutes: Int? = nil) {
        let duration = minutes ?? mode.defaultDurationMinutes

        // Switching modes: retire the old window first, or its intervalDidEnd
        // will fire later and lift the new mode's block.
        if let current = activeModeID, current != mode.id {
            ScheduleManager.stop(current)
        }

        do {
            try ScheduleManager.startTimed(mode, minutes: duration)
        } catch {
            lastError = error.localizedDescription
            return
        }

        ShieldController.apply(mode)

        activeModeID = mode.id
        activeUntil = Date().addingTimeInterval(TimeInterval(duration * 60))
        ModeStorage.activeModeID = activeModeID
        ModeStorage.activeUntil = activeUntil
        lastError = nil
    }

    func deactivate() {
        if let activeModeID {
            ScheduleManager.stop(activeModeID)
        }
        ShieldController.clear()
        ModeStorage.clearActive()
        activeModeID = nil
        activeUntil = nil
    }

    /// Registers every mode that runs on a daily window, so the system turns it
    /// on even when the app has not been opened.
    func syncDailySchedules() {
        for mode in modes {
            guard let schedule = mode.schedule else {
                if ScheduleManager.isMonitoring(mode.id) && mode.id != activeModeID {
                    ScheduleManager.stop(mode.id)
                }
                continue
            }
            guard !mode.isEmpty else { continue }

            do {
                try ScheduleManager.startDaily(mode, schedule: schedule)
            } catch {
                lastError = error.localizedDescription
            }
        }
    }
}
