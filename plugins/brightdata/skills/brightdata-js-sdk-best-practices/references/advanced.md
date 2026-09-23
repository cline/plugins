# Advanced reference -- `@brightdata/sdk`

Constructor config, batch/trigger orchestration, Browser API, Scraper Studio,
errors, and zones.

---

## Constructor options & env vars

```javascript
const client = new bdclient({
  apiKey: '...',            // or BRIGHTDATA_API_TOKEN
  timeout: 120_000,         // ms, 1000-300000 (default 120000)
  rateLimit: 0,             // max requests per period (0 = unlimited)
  ratePeriod: 1000,         // ms window for rateLimit
  autoCreateZones: true,    // auto-create zones if missing
  webUnlockerZone: '...',   // or BRIGHTDATA_WEB_UNLOCKER_ZONE
  serpZone: '...',          // or BRIGHTDATA_SERP_ZONE
  logLevel: 'INFO',         // DEBUG | INFO | WARNING | ERROR | CRITICAL
  structuredLogging: true,  // JSON logs
  verbose: false,           // or BRIGHTDATA_VERBOSE=1
  browserUsername: '...',   // Browser API -- or BRIGHTDATA_BROWSERAPI_USERNAME
  browserPassword: '...',   // or BRIGHTDATA_BROWSERAPI_PASSWORD
  browserHost: '...',
  browserPort: 9222,
});
```

| Env var | Maps to |
|---|---|
| `BRIGHTDATA_API_TOKEN` | `apiKey` |
| `BRIGHTDATA_WEB_UNLOCKER_ZONE` | `webUnlockerZone` |
| `BRIGHTDATA_SERP_ZONE` | `serpZone` |
| `BRIGHTDATA_BROWSERAPI_USERNAME` | `browserUsername` |
| `BRIGHTDATA_BROWSERAPI_PASSWORD` | `browserPassword` |
| `BRIGHTDATA_VERBOSE` | `verbose` |

Lifecycle: always `await client.close()` when done, or use
`await using client = new bdclient()` (TS 5.2+ / Node >=20) for auto-dispose. A
leaked client keeps the transport alive and can hang the process.

---

## Batch & non-blocking orchestration

Orchestrated platform methods (`products`, `profiles`, ...) trigger a job, poll, and
download -- each blocking 2-10 min. Three ways to scale:

### 1. Pass an array (simplest)
```javascript
const res = await client.scrape.amazon.products([
  'https://www.amazon.com/dp/A', 'https://www.amazon.com/dp/B',
]);
```

### 2. Tune polling
```javascript
const res = await client.scrape.linkedin.profiles(urls, { pollInterval: 5000, pollTimeout: 300_000 });
```

### 3. Trigger pattern (fire now, collect later)
Orchestrated methods have a `*Trigger` counterpart returning a `Job`:

```javascript
const jobs = [];
for (const u of urls) jobs.push(await client.scrape.amazon.productsTrigger([u])); // sequential fires respect the rate limiter
for (const job of jobs) await job.wait({ timeout: 600_000 });
const results = await Promise.all(jobs.map(j => j.fetch()));
```

Do not wrap single-item blocking calls in `Promise.all` -- you bypass the
internal rate limiter and waste credits. Fire triggers sequentially; the
parallelism happens during the cheap `wait` (status-poll) phase.

`scrapeUrl([...])` and `search.google([...])` already batch in parallel
internally -- pass arrays directly for those.

---

## Browser API (Playwright / Puppeteer / Selenium)

For login, JS-heavy SPAs, click/scroll/fill, CAPTCHA, screenshots, multi-step
flows. Most expensive option -- last resort.

```javascript
import { chromium } from 'playwright';

const cdpUrl = client.browser.getConnectUrl({ country: 'us' });   // CDP WebSocket URL (string)
const browser = await chromium.connectOverCDP(cdpUrl);
const page = await browser.newPage();
await page.goto('https://example.com/login');
await page.fill('#email', process.env.LOGIN_EMAIL);
// ... interact ...
const html = await page.content();
await browser.close();
```

Puppeteer: `puppeteer.connect({ browserWSEndpoint: cdpUrl })`. Requires Browser
API credentials (`browserUsername`/`browserPassword` or their env vars).

---

## Scraper Studio (custom collectors)

Run a collector configured in the Bright Data dashboard (id format `c_*`).

```javascript
// orchestrated: trigger -> poll -> results
const results = await client.scraperStudio.run('c_your_collector_id', {
  input: { url: 'https://example.com/product/1' },
});
// results: RunResult[] -> { input, data, error, responseId, elapsedMs }

// multiple inputs
const many = await client.scraperStudio.run('c_id', {
  input: [{ url: '.../1' }, { url: '.../2' }],
});

// manual control
const job = await client.scraperStudio.trigger('c_id', { url: '.../1' });
const data = await job.waitAndFetch();

// poll a job by id
const status = await client.scraperStudio.status('j_abc123'); // { status: 'queued'|'running'|'done'|'failed' }
```

---

## Errors

All extend `BRDError`. Import the ones you branch on:

```javascript
import {
  bdclient, BRDError, ValidationError, AuthenticationError, ZoneError,
  NetworkError, NetworkTimeoutError, TimeoutError, APIError, DataNotReadyError, FSError,
} from '@brightdata/sdk';
```

| Class | Meaning |
|---|---|
| `ValidationError` | invalid input/args |
| `AuthenticationError` | bad/expired token |
| `ZoneError` | zone missing/misconfigured |
| `NetworkError` / `NetworkTimeoutError` | transport-level failure/timeout |
| `TimeoutError` | request exceeded `timeout` |
| `APIError` | Bright Data API returned an error |
| `DataNotReadyError` | snapshot/job not ready yet |
| `FSError` | `saveResults` file I/O failure |

The transport auto-retries network/timeout errors with backoff -- don't add
your own retry loop on top.

---

## Zones & SSL

- `client.listZones()` -- list active zones.
- `autoCreateZones: true` (default) provisions a zone automatically if missing.
- `webUnlockerZone` / `serpZone` pin a specific zone for those services.
- For sandboxed/SSL-intercepted environments, configure the zone via the
  constructor; if you hit SSL errors with the Browser API, check the
  `brightdata-proxy` skill for CA-cert setup.

---

## Subpath imports (tree-shaking)

```javascript
import { ScrapeRouter } from '@brightdata/sdk/scrapers';
import { SearchRouter } from '@brightdata/sdk/search';
import { DatasetsClient } from '@brightdata/sdk/datasets';
```

Useful in bundled front-end-adjacent or size-sensitive Node builds; for most
server code, importing `bdclient` from the package root is fine.
