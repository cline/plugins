# hermoso

Bundle the Hermoso marketing skills as an installable Cline plugin.

## What It Does

Installs five skills that drive the [Hermoso](https://hermoso.ai) CLI (`npx -y hermoso`), a marketing platform an agent can run end to end:

| Skill | What it covers |
| --- | --- |
| `hermoso-marketing` | The whole loop: research, create, publish and schedule, paid campaigns, and results. |
| `hermoso-research` | Competitors and their longest-running ads from the Meta, Google and LinkedIn ad libraries, plus the hooks worth copying. |
| `hermoso-ad-from-brand` | From a website or brand description to a finished, on-brand image or video ad. |
| `hermoso-generate` | Image, video, talking-avatar and multi-scene renders from a prompt. |
| `hermoso-product-photoshoot` | A real product photo placed into studio, lifestyle or banner scenes with the label kept accurate. |

Publishing and scheduling reach Instagram, Facebook, Threads, TikTok, YouTube, X, LinkedIn, Pinterest, Bluesky and Telegram. Paid campaigns cover eleven ad platforms, including Meta, Google Ads, TikTok Ads, LinkedIn Ads and ChatGPT Ads, and are always created paused.

## Install

```bash
cline plugin install hermoso
```

For local development from this repository:

```bash
cline plugin install ./plugins/hermoso --cwd .
```

## Example Usage

After installation, ask Cline:

```text
Find my three closest competitors, show me the ads each has run longest, and make two static ads for our launch that take the best angle.
```

```text
Schedule this week's posts: one per day at 9am on Instagram and LinkedIn, using the images in ./launch.
```

Cline picks the matching Hermoso skill and runs the `hermoso` CLI, then reports the served media URLs or the scheduled posts.

## Requirements

- Node 18 or newer. The CLI runs through `npx -y hermoso`; nothing needs to be installed globally.
- A Hermoso account. Sign in once with `npx -y hermoso auth login`, which opens a browser. On a machine with no browser, create a key in the Hermoso app on the MCP & CLI tab and run `npx -y hermoso auth login --token <key>`.
- Social and ad accounts are connected in the Hermoso app, under Settings, Connectors. Posting only reaches accounts you connected.

## Costs

Posting, scheduling, campaign management and analytics use no Hermoso credits. Credits are spent only on running an AI model (images, video, voice, text) and on ad research. New accounts start with free credits. The skills tell the agent to state a render's cost before running it.

## Security Notes

- The CLI stores its token in the user's config directory; the skills never ask for it to be printed, pasted into a prompt or committed.
- Anything outward-facing is gated: the skills tell the agent to show the exact caption and target account before publishing, and paid campaigns are created paused and need the user's explicit yes to activate.
- Destructive tools (deleting posts, campaigns or files) ask for confirmation and say what will be affected.
