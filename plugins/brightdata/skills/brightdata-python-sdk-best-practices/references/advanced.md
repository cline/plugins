# Advanced: Execution Patterns, Batch, Web Unlocker, Browser API, Scraper Studio

---

## Execution Patterns

Every scraper and the Discover API support three execution patterns. Default to Quick unless you have a specific reason to use the others.

### Quick (default -- blocking)

Call the method directly. It triggers the operation, polls for completion internally, and returns the result. Blocks for 2-10 minutes depending on platform and page complexity.

```
result = client.scrape.amazon.products(url="...")  # blocks until done
```

Use Quick for: single requests, simple workflows, when you want the result immediately.

### Trigger (non-blocking)

Add `_trigger` suffix. Returns a job object immediately without waiting. You control when to poll and fetch.

```
job = await client.scrape.amazon.products_trigger(url="...")  # returns immediately
await job.wait(timeout=300, poll_interval=10)                  # poll until ready
result = await job.to_result()                                 # get the ScrapeResult
```

Job object methods:
- `job.status(refresh=True)` -- check current status
- `job.wait(timeout=300, poll_interval=10, verbose=False)` -- block until ready or timeout
- `job.fetch(format="json")` -- get raw data
- `job.to_result()` -- get structured result (ScrapeResult)

Use Trigger for: batch operations, notebook environments, when you need non-blocking execution.

### Manual (full control)

Use the trigger pattern but call individual job methods instead of `to_result()`. The `_trigger()` method returns a `ScrapeJob` object (not a raw snapshot_id).

```
job = await client.scrape.amazon.products_trigger(url="...")  # returns ScrapeJob
status = await job.status()                                    # check current status
data = await job.fetch()                                       # download raw data when ready
# job.snapshot_id is available for external tracking
```

Use Manual for: custom polling logic, integration with external job schedulers, when you need `job.snapshot_id` for external tracking.

---

## Batch Operations

When processing multiple URLs, use trigger methods to avoid sequential blocking. Sequential quick calls on 50 URLs could take 3+ hours. Trigger methods let you fire all requests first, then collect results.

### Pattern

Step 1 -- Fire all triggers (sequential to respect rate limit):
```
jobs = []
for url in urls:
    job = await client.scrape.amazon.products_trigger(url)
    jobs.append(job)
```

Step 2 -- Wait for all to complete:
```
for job in jobs:
    await job.wait(timeout=300)
```

Step 3 -- Collect results:
```
results = []
for job in jobs:
    result = await job.to_result()
    results.append(result)
```

### Rate limit awareness
- Default: 10 requests/second
- Fire triggers sequentially (the rate limiter handles pacing)
- Do not use asyncio.gather() to fire triggers in parallel -- you will hit the rate limiter
- Polling (job.wait) can run concurrently since status checks are lightweight

### Discover API batch
The Discover API also supports the trigger pattern:
```
job = await client.discover_trigger(query="...", intent="...")
await job.wait(timeout=60)
result = await job.to_result()
```

---

## Web Unlocker

Scrape any URL with anti-bot bypass. Use for sites that don't have a dedicated platform scraper, or as a fallback when a platform scraper returns 403.

### Methods

`client.scrape_url(url, zone=, country="", response_format="raw", method="GET", timeout=, mode="sync")` -> ScrapeResult

- `url` -- single URL (string) or multiple URLs (list of strings)
- `response_format` -- `"raw"` returns HTML string, `"json"` returns parsed JSON
- `method` -- HTTP method: `"GET"` (default) or `"POST"`
- `mode` -- `"sync"` (blocking, default) or `"async"` (trigger + poll)
- `country` -- 2-letter country code for geo-targeted requests

### When to use
- URL is from a site without a dedicated scraper
- A platform scraper returned 403/blocked
- You need raw HTML rather than structured data
- You need to specify HTTP method or country targeting

---

## Browser API

Connect to a remote browser via Chrome DevTools Protocol (CDP). Use with Playwright, Puppeteer, or any CDP client. This is the most expensive option -- only use for tasks that require real browser interaction.

### Methods

`client.browser.get_connect_url(country=)` -> str

Returns a WebSocket URL: `wss://username:password@brd.superproxy.io:9222`

- `country` -- optional 2-letter country code for geo-targeting

### Usage with Playwright
```
url = client.browser.get_connect_url(country="US")
browser = await playwright.chromium.connect_over_cdp(url)
page = browser.contexts[0].pages[0]
await page.goto("https://example.com")
# ... interact with page ...
await browser.close()
```

### When to use
- Login/authentication flows
- JavaScript-heavy single-page applications
- Click, scroll, fill interactions
- CAPTCHA solving (with manual intervention)
- Screenshot/PDF generation from live pages
- Any task requiring a real browser session

### When NOT to use
- Simple product/profile/review scraping -- use platform scrapers (10x cheaper)
- Getting raw HTML -- use web unlocker
- Searching for information -- use SERP or Discover

---

## Scraper Studio

Run pre-built or custom scraping templates using collector IDs. Collectors are configured in the Bright Data dashboard.

### Methods

Quick (blocking):
`client.scraper_studio.run(collector, input, timeout=180, poll_interval=10)` -> List[Dict]

- `collector` -- collector ID (e.g., `"c_abc123"`)
- `input` -- single dict or list of dicts with scraper-specific input fields
- Returns list of scraped records

Trigger (non-blocking):
`client.scraper_studio.trigger(collector, input)` -> ScraperStudioJob

- `job.wait_and_fetch(timeout=120)` -> List[Dict]
- `job.status()` -> JobStatus
- `job.fetch()` -> List[Dict]

Status check:
`client.scraper_studio.status(job_id)` -> JobStatus

Fetch results:
`client.scraper_studio.fetch(response_id)` -> List[Dict]

### When to use
- You have a custom collector configured in Bright Data dashboard
- You need a scraping template that isn't covered by platform scrapers
- The user provides a collector ID

### When NOT to use
- Standard platform scraping -- use platform scrapers directly
- You don't have a collector ID -- this service requires pre-configured templates

---

## Default Timeouts by Platform

| Platform | Scraper Timeout | Notes |
|----------|----------------|-------|
| LinkedIn | 180s | Profiles, companies, jobs, posts |
| ChatGPT (search) | 180s | Shorter due to API nature |
| Amazon | 240s | Products, reviews, sellers |
| Facebook | 240s | Posts, comments, reels |
| Instagram | 240s | Profiles, posts, comments, reels |
| YouTube | 240s | Videos, channels, comments |
| TikTok | 240s | Profiles, posts, comments |
| Reddit | 240s | Posts, comments |
| ChatGPT (scraper) | 120s | Single prompt execution |
| Perplexity | 180s | AI search |
| Pinterest | 240s | Posts, profiles |
| DigiKey | 240s | Products, categories |
| Scraper Studio | 180s | Custom templates |
| Discover API | 60s | AI-powered search |
| Datasets (download) | 300s | Snapshot build + download |
| General (polling) | 600s | Default for unspecified operations |

Do NOT set timeouts lower than these defaults unless the user explicitly requests it. The SDK defaults are calibrated for typical response times per platform.
