import SwiftUI
import FamilyControls

struct ContentView: View {
    @EnvironmentObject private var auth: AuthorizationManager
    @EnvironmentObject private var store: ModeStore

    @State private var sheet: Sheet?

    /// One sheet binding rather than two. Stacking `.sheet` modifiers on the
    /// same view silently drops all but the last one.
    private enum Sheet: Identifiable {
        case edit(Mode)
        case activate(Mode)

        var id: String {
            switch self {
            case .edit(let mode): return "edit-\(mode.id)"
            case .activate(let mode): return "activate-\(mode.id)"
            }
        }
    }

    var body: some View {
        NavigationStack {
            Group {
                if auth.isApproved {
                    modeList
                } else {
                    AuthorizationGate()
                }
            }
            .navigationTitle("מצבים")
            .toolbar {
                if auth.isApproved {
                    ToolbarItem(placement: .primaryAction) {
                        Button {
                            sheet = .edit(Mode(name: "מצב חדש"))
                        } label: {
                            Label("מצב חדש", systemImage: "plus")
                        }
                    }
                }
            }
            .sheet(item: $sheet) { sheet in
                switch sheet {
                case .edit(let mode):
                    ModeEditorView(mode: mode) { store.update($0) }
                case .activate(let mode):
                    DurationSheet(mode: mode) { minutes in
                        store.activate(mode, minutes: minutes)
                    }
                }
            }
        }
        .task {
            guard auth.isApproved else { return }
            store.syncDailySchedules()
        }
    }

    private var modeList: some View {
        List {
            if let active = store.activeMode {
                Section {
                    ActiveModeBanner(mode: active, until: store.activeUntil) {
                        store.deactivate()
                    }
                }
            }

            Section("המצבים שלי") {
                ForEach(store.modes) { mode in
                    ModeRow(
                        mode: mode,
                        isActive: mode.id == store.activeModeID,
                        onActivate: { sheet = .activate(mode) },
                        onEdit: { sheet = .edit(mode) }
                    )
                }
                .onDelete { store.delete(at: $0) }
            }

            if let error = store.lastError {
                Section {
                    Text(error)
                        .font(.footnote)
                        .foregroundStyle(.red)
                }
            }
        }
    }
}

private struct ModeRow: View {
    let mode: Mode
    let isActive: Bool
    let onActivate: () -> Void
    let onEdit: () -> Void

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(mode.name)
                    .font(.headline)
                Text(subtitle)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            if isActive {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundStyle(.green)
            } else {
                Button("הפעל", action: onActivate)
                    .buttonStyle(.bordered)
                    .disabled(mode.isEmpty)
            }
        }
        .contentShape(Rectangle())
        .onTapGesture(perform: onEdit)
    }

    private var subtitle: String {
        var parts: [String] = []

        let blocked = mode.selection.applicationTokens.count
            + mode.selection.categoryTokens.count
            + mode.selection.webDomainTokens.count
        parts.append(blocked == 0 ? "לא נבחרו אפליקציות" : "\(blocked) חסומים")

        if let schedule = mode.schedule {
            parts.append(schedule.displayText)
        }
        return parts.joined(separator: " · ")
    }
}

private struct ActiveModeBanner: View {
    let mode: Mode
    let until: Date?
    let onStop: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("\(mode.name) פעיל")
                .font(.headline)

            if let until {
                Text("עד \(until.formatted(date: .omitted, time: .shortened))")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            Button("סיים עכשיו", role: .destructive, action: onStop)
                .buttonStyle(.bordered)
        }
        .padding(.vertical, 4)
    }
}

private struct AuthorizationGate: View {
    @EnvironmentObject private var auth: AuthorizationManager

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "hourglass")
                .font(.system(size: 48))
                .foregroundStyle(.secondary)

            Text("צריך הרשאת זמן מסך")
                .font(.title3.weight(.semibold))

            Text("בלי ההרשאה הזו האפליקציה לא יכולה לחסום שום דבר. היא נשארת על המכשיר ולא נשלחת לשום מקום.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)

            Button("אשר") {
                Task { await auth.request() }
            }
            .buttonStyle(.borderedProminent)

            if let error = auth.lastError {
                Text(error)
                    .font(.footnote)
                    .foregroundStyle(.red)
                    .multilineTextAlignment(.center)
            }
        }
        .padding(32)
    }
}
