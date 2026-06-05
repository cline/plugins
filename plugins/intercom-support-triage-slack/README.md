# intercom-support-triage-slack

Fetches Intercom support conversations and posts triage summaries to Slack.

## What It Does

Registers `fetch_intercom_conversations` and `post_slack_summary`. The intended workflow is to fetch recent Intercom conversations, classify them, then post grouped Slack blocks with links back to Intercom.

## Install

```bash
cline plugin install intercom-support-triage-slack
```

For local development from this repository:

```bash
cline plugin install ./plugins/intercom-support-triage-slack --cwd .
```

## Example Usage

After installation, ask Cline:

```text
Fetch today's open Intercom conversations, group them by refund, account deletion, product support, and spam, then post the summary to Slack.
```

Cline can use `fetch_intercom_conversations` to retrieve support threads and `post_slack_summary` to publish the grouped triage summary.

## Requirements

- `INTERCOM_API_TOKEN`
- `SLACK_BOT_TOKEN`
- `SLACK_CHANNEL`, unless each tool call provides a channel override.

## Security Notes

This plugin reads support content from Intercom and posts summaries to Slack. Only enable it in workspaces authorized for customer support data.
