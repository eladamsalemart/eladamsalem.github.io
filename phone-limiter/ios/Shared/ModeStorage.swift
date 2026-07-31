import Foundation

/// Reads and writes modes in the shared app group so the app and the
/// DeviceActivity extension always see the same state.
enum ModeStorage {
    static func loadModes() -> [Mode] {
        guard let data = AppGroup.defaults.data(forKey: AppGroup.Key.modes),
              let modes = try? JSONDecoder().decode([Mode].self, from: data)
        else {
            return Mode.starterSet
        }
        return modes
    }

    static func saveModes(_ modes: [Mode]) {
        guard let data = try? JSONEncoder().encode(modes) else { return }
        AppGroup.defaults.set(data, forKey: AppGroup.Key.modes)
    }

    static func mode(withID id: String) -> Mode? {
        loadModes().first { $0.id == id }
    }

    static var activeModeID: String? {
        get { AppGroup.defaults.string(forKey: AppGroup.Key.activeModeID) }
        set { AppGroup.defaults.set(newValue, forKey: AppGroup.Key.activeModeID) }
    }

    static var activeUntil: Date? {
        get { AppGroup.defaults.object(forKey: AppGroup.Key.activeUntil) as? Date }
        set { AppGroup.defaults.set(newValue, forKey: AppGroup.Key.activeUntil) }
    }

    static func clearActive() {
        AppGroup.defaults.removeObject(forKey: AppGroup.Key.activeModeID)
        AppGroup.defaults.removeObject(forKey: AppGroup.Key.activeUntil)
    }
}
