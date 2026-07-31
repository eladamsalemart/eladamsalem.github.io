import DeviceActivity
import ManagedSettings

/// Runs outside the app. The system wakes it at the edges of every scheduled
/// window, which is what makes sleep mode turn itself on and off without the
/// app being open.
class DeviceActivityMonitorExtension: DeviceActivityMonitor {

    override func intervalDidStart(for activity: DeviceActivityName) {
        super.intervalDidStart(for: activity)

        guard let modeID = ScheduleManager.modeID(from: activity),
              let mode = ModeStorage.mode(withID: modeID)
        else { return }

        ShieldController.apply(mode)
        ModeStorage.activeModeID = modeID
    }

    override func intervalDidEnd(for activity: DeviceActivityName) {
        super.intervalDidEnd(for: activity)

        guard let modeID = ScheduleManager.modeID(from: activity) else { return }

        // A stale window shouldn't unblock a mode the user started later by hand.
        guard ModeStorage.activeModeID == modeID else { return }

        ShieldController.clear()
        ModeStorage.clearActive()
    }
}
