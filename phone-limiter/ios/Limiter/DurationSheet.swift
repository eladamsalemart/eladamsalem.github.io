import SwiftUI

/// Asks how long a manually started mode should run. Presets first, because
/// the point is to decide in one tap and put the phone down.
struct DurationSheet: View {
    let mode: Mode
    let onConfirm: (Int) -> Void

    @State private var minutes: Int
    @Environment(\.dismiss) private var dismiss

    private let presets = [15, 30, 45, 60, 90, 120, 180]

    init(mode: Mode, onConfirm: @escaping (Int) -> Void) {
        self.mode = mode
        self.onConfirm = onConfirm
        _minutes = State(initialValue: mode.defaultDurationMinutes)
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("לכמה זמן") {
                    ForEach(presets, id: \.self) { preset in
                        Button {
                            minutes = preset
                        } label: {
                            HStack {
                                Text(label(for: preset))
                                    .foregroundStyle(.primary)
                                Spacer()
                                if minutes == preset {
                                    Image(systemName: "checkmark")
                                        .foregroundStyle(.tint)
                                }
                            }
                        }
                    }
                }

                Section {
                    Stepper(
                        label(for: minutes),
                        value: $minutes,
                        in: ScheduleManager.minimumMinutes...(12 * 60),
                        step: 15
                    )
                } header: {
                    Text("או משך מדויק")
                }
            }
            .navigationTitle(mode.name)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("ביטול") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("הפעל") {
                        onConfirm(minutes)
                        dismiss()
                    }
                }
            }
        }
        .presentationDetents([.medium, .large])
    }

    private func label(for minutes: Int) -> String {
        if minutes < 60 { return "\(minutes) דקות" }
        let hours = minutes / 60
        let rest = minutes % 60
        if rest == 0 { return hours == 1 ? "שעה" : "\(hours) שעות" }
        return "\(hours):\(String(format: "%02d", rest)) שעות"
    }
}
