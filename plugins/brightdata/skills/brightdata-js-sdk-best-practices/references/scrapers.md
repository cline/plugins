# Scrapers reference -- `@brightdata/sdk`

Two ways to get page data:

1. Web Unlocker -- `client.scrapeUrl(url, opts)` -- any URL, no dedicated scraper needed.
2. Platform scrapers -- `client.scrape.<platform>.<method>(input, opts?)` -- structured data from 11 supported platforms.

All methods are `async` (return Promises). Method names below are verified against the SDK source (`src/api/scrape/*.ts`).

---

## Web Unlocker -- `client.scrapeUrl(url, options?)`

Handles bot detection / CAPTCHA. `url` may be a string or `string[]` (array -> parallel batch).

| Option | Values | Default | Notes |
|---|---|---|---|
| `format` | `'raw'` \| `'json'` | `'raw'` | `'json'` returns parsed structured fields when available |
| `dataFormat` | `'html'` \| `'markdown'` \| `'screenshot'` | `'html'` | `'screenshot'` returns a PNG |
| `country` | two-letter code (e.g. `'gb'`) | -- | exit-country geo-targeting |
| `method` | HTTP method | `'GET'` | |

```javascript
const html  = await client.scrapeUrl('https://example.com');
const md    = await client.scrapeUrl('https://example.com', { dataFormat: 'markdown' });
const json  = await client.scrapeUrl('https://example.com', { format: 'json' });
const shot  = await client.scrapeUrl('https://example.com', { dataFormat: 'screenshot' });
const many  = await client.scrapeUrl(['https://a.com', 'https://b.com']); // parallel
const geo   = await client.scrapeUrl('https://example.com', { country: 'de' });
```

---

## Platform scrapers -- method styles

Each platform exposes up to three styles for a given "thing" (products, profiles, posts...):

- `collect<Thing>(input, opts?)` -- returns the rows directly: `Promise<object[]>`. `input` is usually `string[]` of URLs (some accept filter objects). `opts` is `DatasetOptions` (e.g. `{ format }`).
- `<thing>(input, opts?)` -- orchestrated (trigger -> poll -> download). Returns `{ data, status, rowCount }`. `opts` is `OrchestrateOptions` (`{ pollInterval, pollTimeout }`). Default to this unless you want raw rows or manual control.
- `discover<Thing>By<X>(filters, opts?)` -- discovery: find items by keyword / category / UPC / profile-URL filter instead of by a direct resource URL. `opts` is `DiscoverOptions`.

```javascript
// orchestrated (default)
const res = await client.scrape.amazon.products(['https://www.amazon.com/dp/B0D77BX8Y4'],
                                                { pollInterval: 5000, pollTimeout: 180_000 });
console.log(res.status, res.rowCount, res.data);

// collect (rows directly)
const rows = await client.scrape.linkedin.collectProfiles(['https://www.linkedin.com/in/satyanadella/']);

// discover (by filter)
const found = await client.scrape.amazon.discoverProductsByKeyword([{ keyword: 'laptop stand' }]);
```

---

## Verified methods per platform

Property access is `client.scrape.<platform>`. `chatGPT` is camelCase -- mind the capital G and T.

### `amazon`
- collect: `collectProducts`, `collectReviews`, `collectSellers`, `collectProductSearch`
- orchestrated: `products`, `reviews`, `sellers`, `productSearch`
- discover: `discoverProductsByKeyword`, `discoverProductsByCategoryURL`, `discoverProductsByBestSellerURL`, `discoverProductsByUPC`

### `linkedin`
- collect: `collectProfiles`, `collectCompanies`, `collectJobs`, `collectPosts`
- orchestrated: `profiles`, `companies`, `jobs`, `posts`
- discover: `discoverProfiles`, `discoverJobs`, `discoverUserPosts`, `discoverCompanyPosts`

### `instagram`
- collect: `collectProfiles`, `collectPosts`, `collectReels`, `collectComments`
- orchestrated: `profiles`, `posts`, `reels`, `comments`
- discover: `discoverPostsByProfileURL`, `discoverReelsByProfileURL`, `discoverAllReelsByProfileURL`

### `facebook`
- collect: `collectUserPosts`, `collectGroupPosts`, `collectPosts`, `collectPostComments`, `collectMarketplaceItems`, `collectEvents`, `collectUserReels`, `collectCompanyReviews`, `collectUserProfiles`
- orchestrated: `userPosts`, `groupPosts`, `postComments`, `companyReviews`
- discover: `discoverPostsByUserName`, `discoverMarketplaceItemsByKeyword`, `discoverMarketplaceItemsByURL`, `discoverEventsByURL`, `discoverEventsByVenue`

### `tiktok`
- collect: `collectPosts`, `collectProfiles`, `collectComments`, `collectPostsByProfileFast`, `collectPostsByUrlFast`, `collectPostsBySearchUrlFast`
- orchestrated: `posts`, `profiles`, `comments`, `postsByProfileFast`, `postsByUrlFast`, `postsBySearchUrlFast`

(The `*Fast` variants return results faster with a lighter payload.)

### `youtube`
- collect: `collectVideos`, `collectChannels`, `collectComments`
- orchestrated: `videos`, `channels`, `comments`

### `reddit`
- collect: `collectPosts`, `collectComments`
- orchestrated: `posts`, `comments`

### `pinterest`
- collect: `collectPosts`, `collectProfiles`
- orchestrated: `posts`, `profiles`

### `chatGPT`
- orchestrated: `brightdata-search`, `prompt`
- (no `collect*` or `discover*` variants -- these two methods are the full surface)

### `perplexity`
- collect: `collectSearch`
- orchestrated: `brightdata-search`

### `digikey`
- collect: `collectProducts`
- orchestrated: `products`
- discover: `discoverByCategory`

---

## Notes

- No `client.search.<platform>` in the JS SDK. To search *within* a platform, use that platform's `discover*` methods or `amazon.productSearch`. `client.search` is SERP-only -- see `search.md`.
- The 12th router property, `snapshot`, is an internal helper (`client.scrape.snapshot`) for re-fetching a snapshot by id -- not a content platform.
- On a 403/blocked platform scrape, fall back to `client.scrapeUrl(url)` (web unlocker).
- For many inputs, pass an array to the orchestrated method, or use the `*Trigger` + `job.wait()` pattern in `advanced.md`.
