---
name: postiz-content
description: Plan Postiz social media campaigns across multiple channels, including channel-specific settings, draft-first review, media preparation, scheduling, and analytics follow-up. Use when the user asks for help turning content into Postiz-ready social posts.
---

# Postiz Content Planning

Use this skill to turn user goals into safe, reviewable Postiz campaigns. Prefer draft-first workflows unless the user explicitly asks to schedule or publish.

## Campaign Planning

Collect or infer:

- Audience and goal.
- Platforms or connected channels.
- Time zone and desired schedule.
- Required media assets.
- Whether the content should be a draft or scheduled.
- Whether posts should be identical, platform-tailored, or threaded.

When details are missing, make a reasonable draft and clearly mark assumptions before any live Postiz action.

## Channel Fit

Tailor content before scheduling:

- X: short copy, hooks, thread structure, reply settings, and community settings when needed.
- LinkedIn: professional framing, company/page selection, carousel settings when relevant.
- Reddit: subreddit, title, flair, link/text type, and community norms.
- YouTube or TikTok: title, description/caption, privacy, playlist, thumbnail, and AI-content declarations when required.
- Instagram, Facebook, Threads, Bluesky, Mastodon, Medium, Dev.to, Hashnode, WordPress, Discord, Slack, Telegram, and other channels: check integration settings rather than guessing platform-specific fields.

Use `postiz integrations:settings <integration-id>` to inspect the active schema for the user's connected channel.

## Draft-First Pattern

For non-trivial campaigns:

1. Produce the candidate copy and media plan.
2. Ask the user to approve or revise.
3. Create drafts with `postiz posts:create -t draft`.
4. List or inspect drafts if the user wants a final review.
5. Promote drafts to scheduled posts only after confirmation.

## JSON Posts

Use JSON files for complex campaigns with multiple channels, comments, platform settings, or media. Keep the file in the workspace only when the user wants a durable artifact. Do not include API keys in JSON post files.

Recommended JSON workflow:

1. Build the JSON with placeholders for integration IDs until discovery is complete.
2. Discover integration IDs and settings.
3. Upload media and replace media placeholders with Postiz media paths.
4. Ask for final review.
5. Run `postiz posts:create --json <file>`.

## Scheduling Safety

Before scheduling, restate:

- Target platforms.
- Exact scheduled time with time zone.
- Post type: draft or schedule.
- Media assets and upload status.
- Any platform-specific settings.

If the user asked for "tomorrow" or another relative date, resolve it to an exact date before scheduling.

## Analytics Follow-Up

For performance reviews:

1. Use platform analytics for channel-level trends.
2. Use post analytics for content-specific performance.
3. If analytics reports missing release data, follow the missing-release workflow in the `postiz-cli` skill.
4. Summarize results in user-facing language. Avoid dumping raw analytics unless the user asks.

## Avoid

- Scheduling content without final user confirmation.
- Guessing integration IDs or required platform settings.
- Passing raw media paths to post creation commands.
- Posting to broad groups or customer accounts without checking scope.
- Persisting credentials, tokens, or API URLs without explicit approval.
