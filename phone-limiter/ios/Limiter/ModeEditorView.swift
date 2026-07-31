import SwiftUI
import FamilyControls

struct ModeEditorView: View {
    @State private var draft: Mode
    @State private var hasSchedule: Bool
    @State private var isPickerPresented = false
    @Environment(\.dismiss) private var dismiss

    private let onSave: (Mode) -> Void

    init(mode: Mode, onSave: @escaping (Mode) -> Void) {
        _draft = State(initialValue: mode)
        _hasSchedule = State(initialValue: mode.schedule != nil)
        self.onSave = onSave
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("שם") {
                    TextField("שם המצב", text: $draft.name)
                }

                Section {
                    Button {
                        isPickerPresented = true
                    } label: {
                        HStack {
                            Text("בחר אפליקציות לחסימה")
                            Spacer()
                            Text("\(blockedCount)")
                                .foregroundStyle(.secondary)
                        }
                    }
                } header: {
                    Text("מה חסום")
                } footer: {
                    Text("כל מה שלא נבחר כאן נשאר פתוח — שיחות, מוזיקה, טיימר ושעון מעורר ימשיכו לעבוד כרגיל.")
                }

                Section {
                    Toggle("לו״ז יומי", isOn: $hasSchedule)

                    if hasSchedule {
                        DatePicker(
                            "מתחיל",
                            selection: startBinding,
                            displayedComponents: .hourAndMinute
                        )
                        DatePicker(
                            "מסתיים",
                            selection: endBinding,
                            displayedComponents: .hourAndMinute
                        )
                    }
                } header: {
                    Text("הפעלה אוטומטית")
                } footer: {
                    if hasSchedule {
                        Text("המצב יידלק וייכבה לבד בשעות האלה, גם אם האפליקציה סגורה. חלון שחוצה חצות, כמו 23:00 עד 07:00, נתמך.")
                    }
                }

                Section {
                    Stepper(
                        "\(draft.defaultDurationMinutes) דקות",
                        value: $draft.defaultDurationMinutes,
                        in: ScheduleManager.minimumMinutes...(12 * 60),
                        step: 15
                    )
                } header: {
                    Text("משך ברירת מחדל בהפעלה ידנית")
                } footer: {
                    Text("המינימום הוא \(ScheduleManager.minimumMinutes) דקות — זו מגבלה של אפל, לא בחירה שלנו.")
                }
            }
            .navigationTitle(draft.name.isEmpty ? "מצב חדש" : draft.name)
            .navigationBarTitleDisplayMode(.inline)
            .familyActivityPicker(isPresented: $isPickerPresented, selection: $draft.selection)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("ביטול") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("שמור") {
                        draft.schedule = hasSchedule ? (draft.schedule ?? defaultSchedule) : nil
                        onSave(draft)
                        dismiss()
                    }
                    .disabled(draft.name.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
        }
    }

    private var blockedCount: Int {
        draft.selection.applicationTokens.count
            + draft.selection.categoryTokens.count
            + draft.selection.webDomainTokens.count
    }

    private var defaultSchedule: DailySchedule {
        DailySchedule(startHour: 23, startMinute: 0, endHour: 7, endMinute: 0)
    }

    private var startBinding: Binding<Date> {
        Binding(
            get: { date(hour: current.startHour, minute: current.startMinute) },
            set: { newValue in
                let parts = Calendar.current.dateComponents([.hour, .minute], from: newValue)
                var schedule = current
                schedule.startHour = parts.hour ?? 0
                schedule.startMinute = parts.minute ?? 0
                draft.schedule = schedule
            }
        )
    }

    private var endBinding: Binding<Date> {
        Binding(
            get: { date(hour: current.endHour, minute: current.endMinute) },
            set: { newValue in
                let parts = Calendar.current.dateComponents([.hour, .minute], from: newValue)
                var schedule = current
                schedule.endHour = parts.hour ?? 0
                schedule.endMinute = parts.minute ?? 0
                draft.schedule = schedule
            }
        )
    }

    private var current: DailySchedule {
        draft.schedule ?? defaultSchedule
    }

    private func date(hour: Int, minute: Int) -> Date {
        Calendar.current.date(
            bySettingHour: hour,
            minute: minute,
            second: 0,
            of: Date()
        ) ?? Date()
    }
}
