import SafariServices
import SwiftUI

/// The macOS host app. Safari installs the web extension along with it; the app
/// itself only has to point the user at Safari's Extensions settings.
@main
struct KitScrobblerApp: App {
	var body: some Scene {
		Window("Kit Scrobbler", id: "main") {
			ContentView()
		}
		.windowResizability(.contentSize)
	}
}

private struct ContentView: View {
	var body: some View {
		VStack(spacing: 14) {
			Image(systemName: "waveform")
				.font(.system(size: 46))
				.foregroundStyle(.tint)
			Text("Kit Scrobbler")
				.font(.title2.weight(.semibold))
			Text("Turn the extension on in Safari to start scrobbling.")
				.font(.callout)
				.foregroundStyle(.secondary)
				.multilineTextAlignment(.center)
			Button("Open Safari Extensions") {
				showExtensionSettings()
			}
			.buttonStyle(.borderedProminent)
		}
		.padding(30)
		.frame(width: 380)
	}
}

/// Brings up Safari's Extensions pane with Kit Scrobbler selected, which is where
/// the user ticks the switch.
private func showExtensionSettings() {
	SFSafariApplication.showPreferencesForExtension(
		withIdentifier: "mountainash.KitScrobbler.Extension"
	) { error in
		if let error {
			print("Could not open Safari settings: \(error)")
		}
	}
}
