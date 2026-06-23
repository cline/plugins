# notifier

Sends a cross-platform OS notification when a Cline run completes.

## What It Does

Registers an `afterRun` hook that sends a native desktop notification on run completion. Uses a strategy pattern with notification systems:

- `NotificationCenter` -- macOS native alerts
- `NotifySend` -- Linux desktop notifications (libnotify)
- `WindowsToaster` -- Windows toast notifications (Windows 8+)

The appropriate strategy is automatically selected based on the current platform.

## Install

```bash
cline plugin install notifier
```

For local development from this repository:

```bash
cline plugin install ./plugins/notifier --cwd .
```

## Example Usage

After installation, ask Cline:

```text
Run the test suite and let me know when the task is complete.
```

When the Cline run completes, `notifier` sends a native desktop notification with a short completion summary.

## Requirements

- macOS, Linux, or Windows.
- Linux requires `libnotify-bin` or equivalent (`notify-send` command).
- No API keys or external services.

## Security Notes

Notification text can include task output. Avoid enabling it if completion summaries may contain sensitive information.
