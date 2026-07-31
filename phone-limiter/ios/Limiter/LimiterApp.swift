import SwiftUI

@main
struct LimiterApp: App {
    @StateObject private var auth = AuthorizationManager()
    @StateObject private var store = ModeStore()
    @Environment(\.scenePhase) private var scenePhase

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(auth)
                .environmentObject(store)
                .environment(\.layoutDirection, .rightToLeft)
                .onChange(of: scenePhase) { phase in
                    guard phase == .active else { return }
                    auth.refresh()
                    store.refresh()
                }
        }
    }
}
