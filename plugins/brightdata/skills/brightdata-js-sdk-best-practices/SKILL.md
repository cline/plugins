---
name: brightdata-js-sdk-best-practices
description: |
  Web data extraction and discovery using the Bright Data JavaScript/TypeScript
  SDK (`@brightdata/sdk`). Use when the user is working in Node.js/TypeScript and
  asks to "scrape", "get data from", "extract", "search for", or "find"
  information from websites. Also use when the user mentions specific platforms
  like Amazon, LinkedIn, Instagram, Facebook, TikTok, YouTube, Reddit, Pinterest,
  ChatGPT, Perplexity, or DigiKey, or asks for "bulk data", "historical data", or
  "dataset" from JS. Covers scraping, SERP search, AI discovery, datasets,
  browser automation, and Scraper Studio. For Python, use brightdata-sdk; for the
  terminal CLI, use brightdata-cli.
metadata:
  author: brightdata
  version: "1.0"
  package: "@brightdata/sdk"
  repository: https://github.com/brightdata/sdk-js
---

# Bright Data JavaScript SDK

Access web data through a unified Node.js/TypeScript SDK (`@brightdata/sdk`). One
client, several services: web unlocking (`scrapeUrl`), platform scraping
(`scrape.<platform>`), SERP search (`search.google/bing/yandex`), AI discovery
(`discover`), datasets, browser automation, and Scraper Studio.

Requires Node.js >= 20. Ships ESM + CommonJS with full TypeScript types. The
client is exported as `bdclient` (lowercase -- not a typo).

## Setup gate (do first)

```bash
npm install @brightdata/sdk     # or: pnpm add / yarn add
```

The client reads the `BRIGHTDATA_API_TOKEN` env var, or you pass `{ apiKey }`.
Get a token at https://brightdata.com/cp/setting/users.

```javascript
// ESM (package.json "type": "module", or .mjs)
import { bdclient } from '@brightdata/sdk';

// CommonJS (.cjs / "type": "commonjs")
const { bdclient } = require('@brightdata/sdk');

const client = new bdclient();             // reads BRIGHTDATA_API_TOKEN
// const client = new bdclient({ apiKey: '...' });
try {
  const html = await client.scrapeUrl('https://example.com');
} finally {
  await client.close();                    // always close (or `await using`)
}
```

`await using client = new bdclient()` (TS 5.2+ / Node >=20) auto-closes at scope end.

## Service Selection (decide first, then look up the method)

Pick the service BEFORE reaching for a specific method. Most routing mistakes
come from skipping this step and pattern-matching on keywords.

```
Have a URL?
  +++++-++- On a supported platform (Amazon, LinkedIn, Facebook, Instagram, YouTube,
  ++|   TikTok, Reddit, Pinterest, ChatGPT, Perplexity, DigiKey)?
  ++|     -> Platform scraping: client.scrape.<platform>.<method>(urls, opts?)
  ++|
  +++++-++- Generic page (no dedicated platform scraper)?
  ++|     -> Web unlocker: client.scrapeUrl(url, { dataFormat: 'markdown' })
  ++|
  +++++-++- Need login / JS / click-scroll-fill / CAPTCHA / multi-step nav?
        -> Browser API: client.browser.getConnectUrl() (connect via Playwright)

No URL?
  +++++-++- Want entities matching natural-language criteria
  ++|   ("find AI startups in Berlin", "competitors of Acme")?
  ++|     -> Discover: client.discover(query, { intent })
  ++|
  +++++-++- Want web pages / search-result links ("search Google for X")?
  ++|     -> SERP: client.search.google(query) [or .bing / .yandex]
  ++|
  +++++-++- Want to search WITHIN a platform ("Amazon products by keyword",
  ++|   "LinkedIn jobs", "Instagram reels by profile")?
  ++|     -> Platform discovery: client.scrape.<platform>.discover*(filters)
  ++|       or amazon.productSearch(...)  (NOTE: client.search is SERP-only here)
  ++|
  +++++-++- Want bulk/historical data at scale?
        -> Datasets: client.datasets.<name>.query(filter) -> .download(snapshotId)
```

Edge cases:
- Supported-platform URL BUT user mentions login/click/scroll/JS -> Browser API (the interaction trumps the platform).
- Supported-platform scrape returns 403/blocked -> fall back to `client.scrapeUrl()` (web unlocker).
- "Find/research who are X" with a URL alongside ("competitors of acme.com") -> still Discover; the URL is context, not the scrape target.

## Warning: Key differences from the Python SDK

If you know the Python SDK (`brightdata-sdk`), the JS surface differs -- do not
port names blindly:

| Concept | Python | JavaScript |
|---|---|---|
| Client | `SyncBrightDataClient` / `BrightDataClient` | `bdclient` (single, all async) |
| Web unlocker | `client.scrape_url(url=...)` | `client.scrapeUrl(url, opts)` |
| Platform search | `client.search.amazon.products(...)` | none -- use `scrape.amazon.productSearch` / `discover*` |
| `client.search` | SERP and platform search | SERP only (google/bing/yandex) |
| Batch | `*_trigger` methods + `job.wait()` | pass a `string[]` to one call, or `*Trigger` + `job.wait()` |
| Naming | `snake_case` | `camelCase` |
| Datasets | `client.datasets.amazon_products` | `client.datasets.amazonProducts` |

## Method Names: Verify Before Asserting

Before claiming a platform method exists/doesn't exist, consult
`references/scrapers.md` -- it lists every platform's verified methods. The SDK
ships TypeScript types, so in a typed project you can also let the compiler/editor
confirm a method exists.

Each platform exposes up to three method styles (see `references/scrapers.md`):
- `collect<Thing>(input, opts?)` -- returns the rows directly (`object[]`).
- `<thing>(input, opts?)` -- orchestrated (trigger -> poll -> download); returns `{ data, status, rowCount }`. Default to this.
- `discover<Thing>By<X>(filters, opts?)` -- find items by keyword/category/URL filter instead of by direct URL.

Likely hallucinations (do NOT write these -- verify in `references/scrapers.md`):

| Wrong | Right |
|---|---|
| `client.search.amazon.products(...)` | `client.scrape.amazon.productSearch(...)` (no platform search router in JS) |
| `client.scrape.linkedin.people(...)` | `client.scrape.linkedin.profiles(urls)` |
| `client.scrape.chatgpt...` | `client.scrape.chatGPT...` (camelCase G+T) |
| `client.datasets.amazon_products` | `client.datasets.amazonProducts` |
| `BrightDataClient` / `new BdClient()` | `bdclient` (all lowercase) |

## Useful standalone methods

| Method | What it does |
|---|---|
| `client.scrapeUrl(url \| url[], opts?)` | Web unlocker -- any URL -> html / markdown / json / screenshot. Pass an array for parallel batch. |
| `client.search.google(q \| q[], opts?)` | SERP results (also `.bing`, `.yandex`). Array = batch. |
| `client.discover(query, { intent })` | AI-ranked entity/page discovery. |
| `client.discoverTrigger(query, opts?)` | Non-blocking discover -> `Job` with `.wait()` / `.fetch()`. |
| `client.datasets.list()` | List all available datasets at runtime. |
| `client.scraperStudio.run(collectorId, { input })` | Run a custom Scraper Studio collector. |
| `client.browser.getConnectUrl({ country })` | CDP WebSocket URL for Playwright/Puppeteer/Selenium. |
| `client.listZones()` | List active Bright Data zones. |
| `client.saveResults(data, { filename, format })` | Write results to a file. |
| `client.close()` | Close HTTP connections. Always call when done. |

## Gotchas

- Always `await client.close()` (or `await using`). The client holds a keep-alive transport; leaking it hangs the process.
- `client.search` is SERP-only (google/bing/yandex). To search *within* a platform, use that platform's `discover*` / `productSearch` scraper methods -- there is no `client.search.amazon`.
- `chatGPT` is camelCase on `client.scrape` -- `client.scrape.chatGPT.search(...)`, not `.chatgpt`.
- Batch: pass an array, don't loop. `scrapeUrl([...urls])` and `search.google([...queries])` run in parallel internally. For platform scrapers with many inputs, prefer the orchestrated method with an array, or the `*Trigger` + `job.wait()` pattern (see `references/advanced.md`). Don't wrap blocking calls in `Promise.all` of single-item calls -- you'll fight the rate limiter.
- Orchestrated methods block for minutes. `products`/`profiles`/etc. trigger a job and poll until ready (often 2-10 min). Don't set tiny `pollTimeout`s; tune via `{ pollInterval, pollTimeout }`. Defaults are calibrated.
- Datasets are historical/bulk, not live. Need current data -> use platform scrapers or `scrapeUrl`. `query()` returns a `snapshotId`; `download()` blocks until the snapshot is ready.
- Web unlocker fallback on 403. If a platform scraper is blocked, retry the URL through `client.scrapeUrl()`.
- Don't add your own retry loop. The transport already retries network/timeout errors with backoff; double-retrying wastes credits. Tune `timeout` / `rateLimit` on the constructor instead.
- Cost hierarchy (cheapest first): datasets -> SERP -> platform scrapers -> web unlocker -> discover -> Scraper Studio -> Browser API. Prefer the cheapest service that satisfies the request.

## Error handling

All errors extend `BRDError`. Import the specific classes to branch:

```javascript
import { bdclient, ValidationError, AuthenticationError, BRDError } from '@brightdata/sdk';

try {
  const data = await client.scrape.amazon.products(['https://www.amazon.com/dp/B0D77BX8Y4']);
} catch (err) {
  if (err instanceof AuthenticationError) { /* bad/expired token */ }
  else if (err instanceof ValidationError) { /* bad input */ }
  else if (err instanceof BRDError) { /* any SDK error */ }
  else throw err;
}
```

Classes: `BRDError` (base), `ValidationError`, `AuthenticationError`, `ZoneError`,
`NetworkError`, `NetworkTimeoutError`, `TimeoutError`, `APIError`,
`DataNotReadyError`, `FSError`.

## Examples

### Scrape a generic page as markdown
```javascript
const md = await client.scrapeUrl('https://example.com/article', { dataFormat: 'markdown' });
```

### Get an Amazon product (orchestrated -- default)
```javascript
const res = await client.scrape.amazon.products(['https://www.amazon.com/dp/B0D77BX8Y4']);
console.log(res.status, res.rowCount, res.data);
```

### SERP, batched
```javascript
const results = await client.search.google(['best running shoes', 'best trail shoes'], { country: 'us' });
```

### Find entities (Discover)
```javascript
const startups = await client.discover('AI startups in Berlin', {
  intent: 'early-stage machine-learning companies',
  numResults: 10,
});
```

### Bulk/historical via datasets
```javascript
const ds = client.datasets;
const snapshotId = await ds.instagramProfiles.query({ url: 'https://www.instagram.com/natgeo/' }, { records_limit: 50 });
// download() blocks until the snapshot is ready
const rows = await ds.instagramProfiles.download(snapshotId);
```

## Troubleshooting

- `AuthenticationError` / 401 -- token missing or invalid. Check `BRIGHTDATA_API_TOKEN` or the `apiKey` option.
- 403 / blocked -- site blocked the scraper. Retry the URL via `client.scrapeUrl()` (web unlocker).
- Timeout -- increase `timeout` (constructor, 1000-300000 ms) or the orchestrated `pollTimeout`; do not lower it.
- "Dataset not found" -- call `client.datasets.list()`; dataset names are camelCase (`amazonProducts`, `linkedinProfiles`).
- Process hangs after work finishes -- you forgot `await client.close()`.
- SSL/proxy errors in sandboxes -- see `references/advanced.md` for zone/SSL options.
- Rate-limit errors -- set `{ rateLimit, ratePeriod }` on the constructor, or batch via arrays / the trigger pattern instead of `Promise.all`.

## When to load references

- `references/scrapers.md` -- when the user names Amazon, LinkedIn, Facebook, Instagram, YouTube, TikTok, Reddit, Pinterest, ChatGPT, Perplexity, DigiKey -- verified per-platform method tables (collect / orchestrated / discover) and the `scrapeUrl` web-unlocker options.
- `references/search.md` -- SERP engines (`search.google/bing/yandex`) and the Discover API (`discover` / `discoverTrigger`), with all options.
- `references/datasets-overview.md` -- dataset names, the `query -> getStatus -> download` lifecycle, and filters.
- `references/advanced.md` -- constructor options & env vars, batch/trigger orchestration, Browser API (Playwright/Puppeteer), Scraper Studio, error classes, and zones/SSL.
