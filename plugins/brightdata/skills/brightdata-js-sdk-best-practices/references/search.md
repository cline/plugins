# Search & Discover reference -- `@brightdata/sdk`

Two distinct services for "find things without a URL":

- SERP (`client.search.*`) -- structured search-engine results (links, titles, snippets, rankings).
- Discover (`client.discover`) -- AI-ranked discovery of pages/entities by natural-language intent.

> The JS SDK has no platform search router (no `client.search.amazon`). To
> search within a platform, use that platform's `discover*` scraper methods -- see
> `scrapers.md`.

---

## SERP -- `client.search.<engine>(query, options?)`

Engines: `google`, `bing`, `yandex`. `query` is a string or `string[]`
(array -> parallel batch). Returns `Promise<object[]>`.

| Option | Values | Notes |
|---|---|---|
| `country` | two-letter code | geo-target the SERP |
| `format` | `'json'` (and engine-native formats) | structured output |

```javascript
// single
const r = await client.search.google('best mechanical keyboards');

// batch (parallel)
const rs = await client.search.google(['pizza near me', 'sushi near me']);

// with options
const gb = await client.search.google('vat registration', { country: 'gb', format: 'json' });

// other engines
const b = await client.search.bing('quantum computing news');
const y = await client.search.yandex('weather moscow', { country: 'ru' });
```

Use SERP when the user wants web pages / links / rankings, not entities.

---

## Discover -- `client.discover(query, options?)`

AI-powered discovery with intent-based relevance ranking, across 31 languages.
Wraps Bright Data's REST Discover API (`POST https://api.brightdata.com/discover`
-> `task_id` -> `GET ?task_id=...`); the SDK handles the trigger/poll for you.

Return shape -- VERIFIED at runtime against `@brightdata/sdk` v1.1.0 (the rows
are NOT returned as a bare array):
```js
const res = await client.discover(query, { intent, includeContent: true });
// res = { success, data: [ {link, title, description, relevance_score, content?} ],
//         totalResults, cost, taskId, query, intent, durationSeconds, triggerSentAt, dataFetchedAt }
if (!res.success) throw new Error(res.error);
const rows = res.data;   // <- the result rows (REST/CLI put these under `.results` instead)
```
`relevance_score` is a float (snake_case); `content` is present only with
`includeContent: true`, and may be `null` or a 404/nav stub even when the
`relevance_score` is high -- gate on content length before using it.

Verified against the SDK schema (`src/schemas/discover.ts`) -- these are the
exact options the JS client accepts:

| Option | Type | Default | Notes |
|---|---|---|---|
| `intent` | string | -- | natural-language goal -- strongly recommended; ranks results semantically. REST max 3000 chars |
| `filterKeywords` | `string[]` | -- | exact keywords that must appear (applies `intext:` operators) |
| `numResults` | integer | -- | how many to return; REST range 1-20 |
| `includeContent` | boolean | `false` | include parsed page/PDF content per result (slower, larger) |
| `country` | string | -- | two-letter code (lowercased, exactly 2 chars) |
| `city` | string | -- | city-level geo-targeting |
| `language` | string | -- | one of 31 supported languages (e.g. `'en'`) |
| `format` | `'json'` | `'json'` | SDK accepts only `'json'` (the raw REST API also supports `'md'`) |
| `timeout` | number (ms) | `60000` | overall poll timeout |
| `pollInterval` | number (ms) | `2000` | how often the SDK polls for completion |

`query` must be non-empty (REST max 1500 chars).

> SDK vs raw REST: the REST endpoint also supports `mode`
> (`standard`/`zeroRanking`/`deep`/`fast`), `include_images`, `start_date`/`end_date`,
> and `remove_duplicates` -- the JS SDK does not expose these. If you need them,
> call the REST API directly (`POST https://api.brightdata.com/discover` with
> `Authorization: Bearer <token>`), then poll `GET ?task_id=<id>` until
> `status: "done"` (intermediate status is `"processing"`).

```javascript
// basic
const a = await client.discover('artificial intelligence trends 2026');

// with intent (preferred)
const b = await client.discover('Tesla battery technology', {
  intent: 'recent breakthroughs in EV battery chemistry',
});

// filtered + geo + count
const c = await client.discover('sustainable fashion brands', {
  intent: 'eco-friendly clothing companies',
  filterKeywords: ['sustainability', 'organic'],
  country: 'us',
  numResults: 10,
});

// include full page content
const d = await client.discover('node.js streams tutorial', { includeContent: true, numResults: 3 });

// geo + language targeting, with a longer poll budget
const e = await client.discover('mejores restaurantes', {
  intent: 'restaurantes con terraza',
  country: 'es',
  city: 'Madrid',
  language: 'es',
  timeout: 120_000,
});
```

Give `discover` an intent, not a bare keyword. Rephrase "restaurants" ->
`intent: 'find Italian restaurants with outdoor seating in downtown Austin'`.

Use Discover when the user wants entities / a curated list matching criteria
("find AI startups in Berlin", "competitors of Acme", "people who worked at X").

### Non-blocking -- `client.discoverTrigger(query, options?)`

Same options; returns a `Job` (the trigger maps to the REST `task_id`) for manual
polling. Use this to fire a discover and collect the result later.

```javascript
const job = await client.discoverTrigger('SaaS pricing strategies', { intent: 'competitor pricing pages' });
await job.wait({ timeout: 60_000 });   // polls GET ?task_id=... until status: "done"
const data = await job.fetch();
```

---

## Choosing SERP vs Discover vs platform discovery

| Want | Use |
|---|---|
| Google/Bing/Yandex result links & rankings | `client.search.google/bing/yandex(query)` |
| A ranked list of entities matching a description | `client.discover(query, { intent })` |
| Products/jobs/posts *within* a platform by keyword | `client.scrape.<platform>.discover*` / `amazon.productSearch` (see scrapers.md) |
