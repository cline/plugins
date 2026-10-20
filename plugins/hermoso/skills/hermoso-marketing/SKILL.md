---
name: hermoso-marketing
description: >-
  Run a brand's whole marketing operation with Hermoso: research the ads already winning, generate the
  creative, publish and schedule it to the brand's own channels, build and manage the paid campaigns behind
  it, and read back what worked. Use when the user asks for "this week's ads", "run my marketing", "post
  this everywhere", "launch a campaign", "which ads are working", or any request that spans more than one of
  those. NOT for: a single render from a prompt (use hermoso-generate), one finished ad for a brand (use
  hermoso-ad-from-brand), product photography (use hermoso-product-photoshoot), or research alone (use
  hermoso-research).
argument-hint: "[what you want done, e.g. 'this week's ads for yourbrand.com, posted to TikTok and Instagram']"
allowed-tools: Bash
---

# Hermoso: the whole marketing loop

Drive the Hermoso CLI across all five areas: research, create, publish, paid campaigns, measure.

## Setup (once)
- Run the CLI through npx: `npx -y hermoso <command>`. The commands below are written `hermoso …`; if `hermoso` is not on PATH (`npm install -g hermoso` puts it there), prefix them with `npx -y`. No MCP server is needed.
- Sign in once: `npx -y hermoso auth login` (opens a browser; nothing to paste). On a machine with no browser: `npx -y hermoso auth login --token <your key>`, using a key from app.hermoso.ai under MCP & CLI. No account at all? An agent can sign itself up on a paid plan with `POST /v1/signup` at app.hermoso.ai; see the Hermoso README.
- Every tool is reachable, including the ones this file does not name: `hermoso tools --search <what you want>` finds the tool, `hermoso tools <name>` prints its arguments, `hermoso call <name> --json '{...}'` runs it. A tool you cannot see is still callable, so a name you do not recognise never means a missing feature.

## Five independent areas, not five steps
Nothing has to come first. Publish media the user already has, research a market with no brand set up, build a
campaign around creative you did not make here, or render one file and hand back the URL. Use one area, several,
or all of them. Researching first is a good habit when the user is starting from nothing, because winning ads are
found rather than invented, but it is never a prerequisite. Do what was asked and only that.

### 1. Research
- `hermoso competitors <domain> --json` finds the rival brands. `hermoso ads pull --company "<name>" --json` pulls their real running ads from the Meta, Google and LinkedIn libraries.
- `hermoso research "<open question>"` answers a natural-language brief over the ad libraries plus organic TikTok.
- Going deeper: `hermoso call competitor_teardown`, `mine_angles`, `search_meta_ads`, `search_google_ads`, `search_linkedin_ads`, and the organic side `search_tiktok`, `search_instagram`, `search_youtube`, `search_reddit`, `search_threads`.
- Research spends credits, so keep the platform scope to what was asked.

### 2. Create
- `hermoso capabilities` first when you need an exact model id, credit cost or duration. Do not guess one, and do not run it just to answer a request to make something: the create commands pick a sound default on their own.
- From a brand: `hermoso brand draft --domain <domain> --json`, then `hermoso create --brand "<name>" --product "<what to advertise>" --json` for the concept and copy.
- Render: `hermoso generate image --prompt "…" [--ref ./product.png]`, `hermoso generate video --prompt "…" --duration 8 --aspect 9:16 --wait`, `hermoso generate avatar --image ./face.png --script "…" --wait`. For a finished video ad through the Studio pipeline, `hermoso call render_ad`.
- Copy an ad that already works: `clone_static` rebuilds a competitor's static ad on brand, `clone_video` remakes a video from its TikTok, Reel, Facebook, X or YouTube link.
- Variants of one finished ad: `headline_variants` (same picture, new headline), `resize_ad` (recomposed for other placements, not cropped), `localize_ad` (the on-image text translated), `multiply_ad` (one winning video, new cast and set, same cut and audio), `hook_variants` (new openings on the same video), `edit_image` (a plain-language change to an image).
- Post-production: `stitch_video`, `reframe_video`, `upscale_video`, `dub_video`, `change_voice`, `recast_motion`, `finish_video`, `fix_beat`. Native HTML formats: `make_template_ad`.
- Video, avatar and stitch are job-based: keep `--wait` so the command prints the final URL, or poll with `hermoso jobs get <id> --wait`. Never report a render as done before the job finishes.

### 3. Publish and schedule
- Ten channels: `post_to_meta` (Facebook, Instagram, Threads), `post_to_tiktok`, `post_to_youtube`, `post_to_x`, `post_to_linkedin`, `post_to_pinterest`, `post_to_bluesky`, `post_to_telegram`. `schedule_post` queues one for later and `list_scheduled` shows the queue.
- `hermoso call list_connectors` says what is actually connected. A channel with no connection is not a missing feature: tell the user to connect it in the app under Settings, Connectors.
- Show the exact caption and the exact target account before publishing, and get a yes. Never rewrite or truncate what the user wrote: a channel that cannot take it refuses and says so.

### 4. Paid campaigns
- Eleven ad platforms: Meta, Google Ads, TikTok Ads, LinkedIn Ads, Reddit Ads, X Ads, Pinterest Ads, Snapchat Ads, Microsoft Advertising, Apple Search Ads and ChatGPT Ads. Find the tool with `hermoso tools --group ads --search <platform>`.
- Campaigns are created paused and read back from the platform. Report what the platform returned, never what you sent. Activating one spends real money, so it is confirm-gated and the user has to say yes.
- `check_ad_policy` before you spend, and `score_ad` on the creative, so a rejection costs nothing.

### 5. Measure
- `post_performance` ranks the organic posts by hook, subject, format or channel, and compares within a channel rather than across channels.
- `analyze_campaigns` reads every connected ad platform and answers with what to scale, pause, fix and test next, each row carrying its own numbers. It reads only and changes nothing itself, so apply a recommendation yourself once the user agrees.
- A platform whose read failed is unreadable, not zero. Say which one, and do not move budget on the strength of an absence.
- Feed the winners back into the next round.

## Notes
- Publishing, scheduling, campaign management and analytics cost no credits. Credits are spent on running a model and on research. State a render's cost before you run it.
- Text baked into an AI video frame comes out garbled, so `render_ad` composites it in post. Captions, end cards and brand lockups are opt-in: leave them off unless the user asked for them.
- One real product photo is enough. `--ref` on an image render, or `list_product_photos` / `set_product_image` to manage the brand's own.
- `get_brand` shows what the workspace already knows, and omitting `brand` on a create call uses it.
- `upload_file` turns any local or external file into a URL that every publish, schedule and ad-build tool accepts, so the user's own creative goes out through the same path.
- Report the served URL for anything rendered, and offer one concrete next step.
