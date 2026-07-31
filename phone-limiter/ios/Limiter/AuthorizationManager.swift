import Foundation
import FamilyControls

@MainActor
final class AuthorizationManager: ObservableObject {
    @Published private(set) var status: AuthorizationStatus
    @Published var lastError: String?

    private let center = AuthorizationCenter.shared

    init() {
        status = center.authorizationStatus
    }

    var isApproved: Bool { status == .approved }

    func request() async {
        do {
            // .individual is the self-control flavour: the phone restricts itself
            // rather than being managed by a parent's device.
            try await center.requestAuthorization(for: .individual)
            status = center.authorizationStatus
            lastError = nil
        } catch {
            lastError = error.localizedDescription
        }
    }

    func refresh() {
        status = center.authorizationStatus
    }
}
