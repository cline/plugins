---
name: brightdata-agent-onboarding
description: |
  Onboard an agent to Bright Data. Use when a coding agent first
  encounters Bright Data -- for live web work (search, scrape,
  structured data), for wiring Bright Data into product code, for
  choosing Bright Data primitives, or for getting an API key. Guides
  CLI, MCP, SDK/API, and auth paths without installing extra skills.
  Routes the reader to the right path: live tools, app integration,
  MCP, auth-only, or direct REST without any install.
---

# Bright Data -- Agent Onboarding

Bright Data gives agents reliable access to the open web: SERP results
that look like a real browser, clean markdown from any URL (with
CAPTCHA + JS handled), structured datasets for 40+ platforms (Amazon,
LinkedIn, Instagram, TikTok, YouTube, Reddit, Crunchbase, ...), and a
Browser API for pages that need real interaction.

This skill is the entry point. Read it once, pick a path, then hand
off to the narrower skill that owns that path.

## Install The CLI

Only install the CLI when the user wants live Bright Data work from the
terminal. Explain that install commands mutate the user's machine and ask
before running them.

```bash
# macOS / Linux -- fastest install
curl -fsSL https://cli.brightdata.com/install.sh | bash

# Cross-platform (or if you don't want the install script)
npm install -g @brightdata/cli

# One-off, no install
npx --yes --package @brightdata/cli brightdata <command>
```

Requires Node.js >= 20. After install, both `brightdata` and `bdata`
(shorthand) are available.

Then authenticate once:

```bash
bdata login
```

This single command:

1. Opens the browser for OAuth (or use `bdata login --device` on
   headless / SSH machines)
2. Saves the API key locally -- you never need to paste a token again
3. Auto-creates the required proxy zones (`cli_unlocker`,
   `cli_browser`)
4. Sets sensible default configuration

For non-interactive setups you can pass the key directly:

```bash
bdata login --api-key <key>
# or
export BRIGHTDATA_API_KEY=<key>
```

Verify the install before doing real work:

```bash
bdata version
bdata config            # confirms auth + zones
bdata zones             # should list cli_unlocker, cli_browser
bdata budget            # confirms account + balance
```

If any of these fail, route to Path C (auth) before continuing.

## Bundled Cline Skills

This plugin already bundles the Cline skills for Bright Data. Do not run
external skill installers from Cline. Hand off to the bundled skills below,
such as `brightdata-scrape`, `brightdata-search`,
`brightdata-data-feeds`, `brightdata-scraper-builder`, `brightdata-cli`, and
`brightdata-mcp`.

## Choose your path

All paths share the same install + auth above. The difference is what
you do next.

| Situation | Path |
|---|---|
| Need web data during this session | Path A -- live CLI tools |
| Need to add Bright Data to app code | Path B -- SDK / REST integration |
| Want a drop-in tool layer for Cline | Path M -- MCP server |
| Need an API key first | Path C -- auth only |
| Don't want to install anything | Path D -- REST API directly |

If your task spans paths, do them in order: auth -> live tools to
explore -> app integration once the shape is known.

---

## Path A -- Live web tools (CLI)

Use this when the agent itself needs web data right now: discovering
URLs, fetching clean content, pulling structured records from a known
platform, or running a quick competitive scan.

After install + login, hand off to the narrower skills:

- `brightdata-cli` -- overall command surface (`brightdata-scrape`, `brightdata-search`,
  `pipelines`, `status`, `zones`, `budget`, `config`)
- `brightdata-search` -- discovery via `bdata search` (Google / Bing / Yandex
  SERP, structured JSON)
- `brightdata-scrape` -- clean content from a known URL via `bdata scrape`
  (markdown / HTML / JSON / screenshot)
- `brightdata-data-feeds` -- structured records from 40+ supported platforms via
  `bdata pipelines <type>` (Amazon, LinkedIn, Instagram, TikTok,
  YouTube, Reddit, Crunchbase, Google Maps, ...)
- `brightdata-competitive-intel` -- packaged competitor / pricing / review /
  hiring / SEO analyses on top of the CLI
- `brightdata-seo-audit` -- sitemap-stratified live SEO audits

Default flow for live web work:

1. Search first when you need discovery
   `bdata search "query" --json`
2. Pipelines next if the target is a supported platform -- you get
   structured JSON with no parsing
   `bdata pipelines amazon_product "https://amazon.com/dp/..."`
3. Scrape when you have a URL and no platform pipeline applies
   `bdata scrape "https://example.com" -f markdown`
4. Browser API only when the page truly needs clicks, forms, or
   login (see the `brightdata-cli` skill for `bdata browser` and the
   `brightdata-best-practices` browser-api reference)

When the task shifts from "fetch data now" to "wire this into an
app," switch to Path B.

---

## Path B -- Integrate Bright Data into an app

Use this when you're building an application, agent, or workflow that
calls Bright Data from code and needs `BRIGHTDATA_API_KEY` (and a
zone) in `.env` or runtime config.

The required question on this path is:

> What should Bright Data do in the product?

Use the answer to pick the API:

| Job in product | API | Skill |
|---|---|---|
| Fetch a single page as markdown / HTML / JSON | Web Unlocker | `brightdata-best-practices` -> `web-unlocker.md` |
| Search engine results in structured JSON | SERP API | `brightdata-best-practices` -> `serp-api.md` |
| Structured records from supported platforms | Web Scraper API | `brightdata-best-practices` -> `web-scraper-api.md` |
| JS-heavy / interactive pages with Playwright/Puppeteer | Browser API | `brightdata-best-practices` -> `browser-api.md` |
| Build a custom scraper for an arbitrary site | All four, picked by site shape | `brightdata-scraper-builder` |

### Pick a stack

- Python -> use the official SDK
  ```bash
  pip install brightdata-sdk
  ```
  Hand off to `brightdata-python-sdk-best-practices` for client setup
  (async/sync), platform scrapers, SERP, datasets, Browser API, and
  error handling.

- Node / TypeScript / shell / other -> call the REST API directly
  (Path D below has the endpoints), or use the CLI as a library via
  `npx @brightdata/cli`.

- LLM tool layer in Cline or another agent -> use the MCP server
  (Path M).

### Set credentials

```dotenv
BRIGHTDATA_API_KEY=...
BRIGHTDATA_UNLOCKER_ZONE=cli_unlocker   # created automatically by `bdata login`
BRIGHTDATA_SERP_ZONE=cli_unlocker       # or a dedicated SERP zone
```

If you don't have a key yet, do Path C first.

### Smoke test before writing real code

Always run one real Bright Data request before scaling up integration
work -- catches auth, zone, and quota issues before they hide inside
your app's error paths.

```bash
# Web Unlocker via REST
curl -sS https://api.brightdata.com/request \
  -H "Authorization: Bearer $BRIGHTDATA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "zone": "'"$BRIGHTDATA_UNLOCKER_ZONE"'",
    "format": "raw",
    "data_format": "markdown"
  }' | head -40
```

If this prints clean markdown, you're wired up. If not, check the
zone name and key.

---

## Path M -- MCP server (LLM tool layer)

Use this when the consumer is an LLM agent that should call Bright
Data as tools (for example Cline or another custom agent
loops). The MCP server exposes 60+ tools -- search, scrape, structured
data per platform, browser automation -- over a single URL.

Connect with:

```
https://mcp.brightdata.com/mcp?token=YOUR_BRIGHTDATA_API_TOKEN
```

Optional URL parameters:

| Parameter | Effect |
|---|---|
| `pro=1` | Enable all 60+ Pro tools |
| `groups=<name>` | Enable a tool group (`social`, `ecommerce`, `business`, `finance`, `research`, `app_stores`, `travel`, `browser`, `advanced_scraping`) |
| `tools=<names>` | Enable a specific tool list, comma-separated |

Hand off to the `brightdata-mcp` skill for tool selection, tool-group
setup guidance, and workflow patterns. That skill maps Bright Data MCP tools
to the user's selected web-data workflow when the user chooses that surface.

---

## Path C -- Get an API key (auth only)

Use this when the human still needs to sign up, sign in, or generate
a key. Skip this path if `bdata config` already shows an authenticated
account, or if `BRIGHTDATA_API_KEY` is already set in the environment.

> Free tier -- no card needed to start. Every new account gets
> 5,000 free credits per month (~$7.50), shared across Unlocker
> API, SERP API, Web Scraper API, and Scraper Studio -- 1
> credit per request (Scraper Studio: 1 per page load). Credits reset on
> the 1st and don't roll over. With no deposited funds, a hard stop
> applies when they run out (no surprise charges). Proxy products and the
> Browser API are not covered by monthly credits -- those use separate
> trial credit ($2 for 7 days, +$5 for 30 days after adding a payment
> method). Custom-PAYG and pre-commit plans are not eligible.
> Docs: https://docs.brightdata.com/general/account/billing-and-pricing/free-tier

### Easiest: use the CLI's OAuth flow

```bash
bdata login            # browser-based OAuth
bdata login --device   # headless / SSH (device-code flow)
```

This handles signup-or-signin, key generation, zone creation, and
local config in one step. Prefer this over manual flows.

### Manual: dashboard

If the human prefers the web UI:

1. Go to https://brightdata.com/cp (sign up if needed)
2. Create a Web Unlocker zone ("Add" -> "Unlocker zone")
3. Copy the API key from the dashboard
4. Save it where the rest of the app reads secrets. Do not paste the real key
   into chat or commit it to the repository. If the app uses a `.env` file, have
   the user create or update it locally with `BRIGHTDATA_API_KEY` and
   `BRIGHTDATA_UNLOCKER_ZONE`.

### Verify

```bash
bdata budget    # any successful response means the key works
```

If verification fails, the key is wrong, the zone is wrong, or the
account has no active subscription -- surface the error to the human
rather than guessing.

---

## Path D -- Use Bright Data without installing anything

Use this when the environment can't run `npm` / `curl | bash`, or
when you only need one or two requests and don't want the CLI / SDK.
Works for both live agent work and app integration.

You still need an API key and a zone. Two ways to get them:

- Human pastes it in -- if a key already exists, set
  `BRIGHTDATA_API_KEY=...` and `BRIGHTDATA_UNLOCKER_ZONE=...` in the
  environment
- Browser flow -- do Path C; the dashboard issues both

Base URL: `https://api.brightdata.com`
Auth header: `Authorization: Bearer $BRIGHTDATA_API_KEY`

### Core endpoints

```http
# Web Unlocker -- clean content from any URL
POST /request
{
  "url": "https://target.com",
  "zone": "<unlocker-zone>",
  "format": "raw",
  "data_format": "markdown"   // or "html", "screenshot", "parsed_light"
}
```

```http
# SERP API -- structured search results
# Use the same /request endpoint with a SERP zone and a search URL,
# adding `brd_json=1` to receive parsed JSON instead of raw HTML.
POST /request
{
  "url": "https://www.google.com/search?q=web+scraping&brd_json=1",
  "zone": "<serp-zone>",
  "format": "raw"
}
```

```http
# Web Scraper API -- structured data for 40+ platforms (async)
POST /datasets/v3/trigger?dataset_id=<id>
[ { "url": "https://amazon.com/dp/B09V3KXJPB" } ]

# then poll
GET  /datasets/v3/snapshot/<snapshot_id>?format=json
```

For the full parameter surface (special headers like
`x-unblock-expect`, async response IDs, dataset progress states,
Browser API CDP commands), read the `brightdata-best-practices`
skill -- its references are the source of truth for REST-level work.

### Documentation

- Product docs: https://docs.brightdata.com
- LLM-friendly docs index: https://docs.brightdata.com/llms.txt
- Dashboard (zones, keys, billing): https://brightdata.com/cp

---

## After onboarding -- where to go next

Once the agent is set up, route the work to the narrowest skill that
fits. Quick map:

| User says... | Skill |
|---|---|
| "scrape this URL" / "get this page" | `brightdata-scrape` |
| "search Google for..." / "find URLs about..." | `brightdata-search` |
| "get Amazon / LinkedIn / Instagram / TikTok / YouTube / Reddit data" | `brightdata-data-feeds` |
| "build a scraper for <site>" | `brightdata-scraper-builder` |
| "analyze my competitor" / "compare pricing" | `brightdata-competitive-intel` |
| "audit SEO" / "rank check" / "schema check" | `brightdata-seo-audit` |
| "write Bright Data code in Python" | `brightdata-python-sdk-best-practices` |
| "plug Bright Data into my LLM agent" | `brightdata-mcp` |
| "use the CLI" / "run from terminal" | `brightdata-cli` |
| "debug a Browser API session" | `brightdata-browser-debug` |

When in doubt, prefer the more specific skill: `brightdata-data-feeds` over
`brightdata-scrape` for supported platforms, `brightdata-scraper-builder` over `brightdata-scrape` for
multi-page extraction, `brightdata-mcp` over `brightdata-cli` when
the consumer is an LLM agent rather than a human at a terminal.
