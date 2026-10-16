---
name: postiz-cli
description: Use Postiz from Cline through the user's Postiz CLI for authentication, integration discovery, media upload, post scheduling, post management, and analytics. Use when the user wants to publish, schedule, inspect, or analyze social content across connected Postiz channels.
---

# Postiz CLI

Use the user's own `postiz` CLI for live work. Do not install it, authenticate it, upload media, schedule content, delete posts, or write credential files unless the user has asked for that action.

## Setup Checks

1. Check whether the CLI exists with `postiz --help` or `command -v postiz`.
2. Check authentication with `postiz auth:status`.
3. If auth is missing, offer either `postiz auth:login` for the device flow or `POSTIZ_API_KEY` for API-key use.
4. Ask before running `postiz auth:login`, because it stores OAuth credentials in the user's home directory.
5. Ask before persisting credentials to shell profiles or config files.

For custom or self-managed Postiz instances, use `POSTIZ_API_URL`. Do not invent the URL. Ask the user or read it from an existing project config only when that config is relevant to the user's task.

## Safe Workflow

Use this order for most tasks:

1. Discover connected channels with `postiz integrations:list`.
2. Get platform requirements with `postiz integrations:settings <integration-id>`.
3. Fetch dynamic platform data with `postiz integrations:trigger <integration-id> <method>` when the settings mention required lookup data.
4. Upload media with `postiz upload <file>` before using it in a post.
5. Create a draft first when the user is still reviewing wording, targeting, timing, or media.
6. Schedule only after the user confirms the final content, platform list, time, and media.
7. Use analytics commands after publishing to inspect performance or resolve missing release IDs.

## Common Commands

Authentication:

```bash
postiz auth:status
postiz auth:login
postiz auth:logout
```

Integration discovery:

```bash
postiz integrations:list
postiz integrations:groups
postiz integrations:settings <integration-id>
postiz integrations:trigger <integration-id> <method-name> -d '{"key":"value"}'
```

Post creation:

```bash
postiz posts:create -c "Content" -s "2026-12-31T12:00:00Z" -t draft -i "integration-id"
postiz posts:create --json post.json
```

Post management:

```bash
postiz posts:list
postiz posts:status <post-id> --status draft
postiz posts:status <post-id> --status schedule
postiz posts:delete <post-id>
```

Analytics:

```bash
postiz analytics:platform <integration-id> -d 30
postiz analytics:post <post-id> -d 30
postiz posts:missing <post-id>
postiz posts:connect <post-id> --release-id "<content-id>"
```

## Confirmation Gates

Ask for explicit confirmation before:

- Uploading media to Postiz.
- Running `postiz auth:login`.
- Creating scheduled posts.
- Promoting drafts into scheduled posts.
- Deleting posts.
- Connecting missing platform content to a Postiz post.
- Running broad analytics or exports across many customer groups.
- Persisting `POSTIZ_API_KEY`, OAuth credentials, or `POSTIZ_API_URL`.

## Media Rule

Do not pass raw local file paths or arbitrary external URLs directly as post media. Upload the file first:

```bash
UPLOAD_JSON=$(postiz upload ./asset.mp4)
MEDIA_URL=$(printf '%s' "$UPLOAD_JSON" | jq -r '.path // .url')
postiz posts:create -c "Launch video" -m "$MEDIA_URL" -s "2026-12-31T12:00:00Z" -i "integration-id"
```

If `jq` is not available, inspect the upload response and use the returned Postiz media path or URL manually.

## Analytics Missing Release IDs

Some platforms publish successfully but do not immediately return a platform post ID. If `postiz analytics:post <post-id>` reports missing content:

1. Run `postiz posts:missing <post-id>`.
2. Show the candidate platform content to the user.
3. Ask which item to connect.
4. Run `postiz posts:connect <post-id> --release-id "<content-id>"` only after confirmation.

## Error Handling

- Auth failures usually mean the CLI has no valid OAuth credential or `POSTIZ_API_KEY`.
- Invalid integration IDs should route back to `postiz integrations:list`.
- Platform settings errors should route back to `postiz integrations:settings <integration-id>`.
- Media errors should route back to `postiz upload`.
- Shell quoting errors are common with JSON settings. Prefer JSON files for complex multi-platform posts.
