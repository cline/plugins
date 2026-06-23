/**
 * Notifier Plugin
 *
 * Cross-platform OS notifications when a Cline run completes.
 * Uses a strategy pattern where notification strategies are named after
 * their respective OS notification systems:
 *   - NotificationCenter (macOS)
 *   - NotifySend (Linux)
 *   - WindowsToaster (Windows)
 *
 * CLI usage:
 *   cline plugin install notifier
 *   cline -i "Run the test suite"
 */

import type { AgentPlugin, AgentRunResult } from "@cline/core";

// ---------------------------------------------------------------------------
// NotifierStrategy interface -- strategy names correspond to OS notification
// systems supported by the node-notifier library.
// ---------------------------------------------------------------------------

interface NotifierStrategy {
	/** Human-readable name of the notification system (e.g. "NotificationCenter"). */
	readonly systemName: string;

	/** Whether this notifier is supported on the current platform. */
	isSupported(): boolean;

	/** Send a notification. No-op if unsupported. */
	notify(title: string, message: string): void;
}

// ---------------------------------------------------------------------------
// Concrete strategies -- one per supported OS notification system.
// ---------------------------------------------------------------------------

/** macOS Notification Center (native alerts on darwin). */
class NotificationCenterNotifier implements NotifierStrategy {
	readonly systemName = "NotificationCenter";

	isSupported(): boolean {
		return process.platform === "darwin";
	}

	notify(title: string, message: string): void {
		if (!this.isSupported()) {
			return;
		}
		// Use dynamic import so node-notifier is only required at runtime on macOS.
		import("node-notifier")
			.then((notifier) => {
				notifier.notify({ title, message, sound: true }, (err: Error | null) => {
					if (err) {
						console.error(`[notifier] NotificationCenter error: ${err.message}`);
					}
				});
			})
			.catch((err: unknown) => {
				console.error(`[notifier] Failed to load node-notifier: ${String(err)}`);
			});
	}
}

/** Linux desktop notifications via notify-send / libnotify. */
class NotifySendNotifier implements NotifierStrategy {
	readonly systemName = "NotifySend";

	isSupported(): boolean {
		return process.platform === "linux";
	}

	notify(title: string, message: string): void {
		if (!this.isSupported()) {
			return;
		}
		import("node-notifier")
			.then((notifier) => {
				const n =
					typeof notifier.NotificationCenter === "function"
						? new notifier.NotificationCenter()
						: notifier;
				n.notify({ title, message, sound: true }, (err: Error | null) => {
					if (err) {
						console.error(`[notifier] NotifySend error: ${err.message}`);
					}
				});
			})
			.catch((err: unknown) => {
				console.error(`[notifier] Failed to load node-notifier: ${String(err)}`);
			});
	}
}

/** Windows toast notifications (Windows 8+ / Windows 10 / Windows 11). */
class WindowsToasterNotifier implements NotifierStrategy {
	readonly systemName = "WindowsToaster";

	isSupported(): boolean {
		return process.platform === "win32";
	}

	notify(title: string, message: string): void {
		if (!this.isSupported()) {
			return;
		}
		import("node-notifier")
			.then((notifier) => {
				const n =
					typeof notifier.WindowsToaster === "function"
						? new notifier.WindowsToaster()
						: notifier;
				n.notify({ title, message, sound: true }, (err: Error | null) => {
					if (err) {
						console.error(`[notifier] WindowsToaster error: ${err.message}`);
					}
				});
			})
			.catch((err: unknown) => {
				console.error(`[notifier] Failed to load node-notifier: ${String(err)}`);
			});
	}
}

// ---------------------------------------------------------------------------
// Strategy resolver -- picks the right notifier for the current platform.
// ---------------------------------------------------------------------------

const strategies: NotifierStrategy[] = [
	new NotificationCenterNotifier(),
	new NotifySendNotifier(),
	new WindowsToasterNotifier(),
];

function resolveNotifier(): NotifierStrategy | undefined {
	return strategies.find((s) => s.isSupported());
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function summarizeResult(result: AgentRunResult): string {
	const summary = result.outputText.trim();
	if (summary.length > 0) {
		return summary;
	}
	return `Completed in ${result.iterations} iteration(s).`;
}

// ---------------------------------------------------------------------------
// Plugin definition
// ---------------------------------------------------------------------------

const plugin: AgentPlugin = {
	name: "notifier-on-complete",
	manifest: {
		capabilities: ["hooks"],
	},

	hooks: {
		afterRun({ result }) {
			if (result.status !== "completed") {
				return;
			}
			const notifier = resolveNotifier();
			if (!notifier) {
				return;
			}
			notifier.notify("Cline session completed", summarizeResult(result));
		},
	},
};

export { plugin };
export default plugin;
