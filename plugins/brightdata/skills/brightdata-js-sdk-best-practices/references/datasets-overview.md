# Datasets reference -- `@brightdata/sdk`

Datasets give bulk / historical data at scale, instead of scraping pages one
by one. Access via `client.datasets`.

Datasets return historical data -- for live/current data use platform scrapers
or `client.scrapeUrl()` instead.

## Lifecycle: query -> poll -> download

A query returns a `snapshotId`, not data. The snapshot goes
`scheduled -> building -> ready`; `download` blocks until ready.

```javascript
const ds = client.datasets;

// 1. discover available datasets at runtime
const all = await ds.list();                 // Promise<object[]>

// 2. (optional) inspect fields for filtering
const meta = await ds.instagramProfiles.getMetadata();   // { fields: [{ name, type, description }] }

// 3. create a filtered snapshot
const snapshotId = await ds.instagramProfiles.query(
  { url: 'https://www.instagram.com/natgeo/' },
  { records_limit: 50 },
);

// 4. (optional) check status
const status = await ds.instagramProfiles.getStatus(snapshotId);   // { status: 'running' | 'ready' | ... }

// 5. download rows (blocks until the snapshot is ready)
const rows = await ds.instagramProfiles.download(snapshotId);      // Promise<object[]>
```

## Per-dataset methods

For any `client.datasets.<name>`:

| Method | Returns | Notes |
|---|---|---|
| `.getMetadata()` | `{ fields: [...] }` | field names/types to build filters |
| `.query(filter, opts?)` | `snapshotId` (string) | `opts.records_limit` caps row count |
| `.getStatus(snapshotId)` | `{ status }` | `running` \| `ready` \| ... |
| `.download(snapshotId)` | `object[]` | blocks until ready |

And on the collection itself: `client.datasets.list()` -> all datasets.

## Dataset names (camelCase)

Names are camelCase in JS (`amazonProducts`, not `amazon_products`). Always
confirm with `client.datasets.list()` at runtime -- the set grows. Commonly available:

| Platform | Datasets |
|---|---|
| LinkedIn | `linkedinProfiles`, `linkedinCompanies` |
| Amazon | `amazonProducts`, `amazonReviews`, `amazonSellers`, `amazonBestSellers`, `amazonProductsSearch`, `amazonProductsGlobal`, `amazonWalmart` |
| Instagram | `instagramProfiles`, `instagramPosts`, `instagramComments`, `instagramReels` |
| TikTok | `tiktokProfiles`, `tiktokPosts`, `tiktokComments`, `tiktokShop` |
| X / Twitter | `xTwitterPosts`, `xTwitterProfiles` |

## Notes

- Snapshots build asynchronously. `download()` may block for up to several minutes -- do not set a tiny timeout.
- Filters are dataset-specific. Use `.getMetadata()` to see filterable fields. A filter can be a plain match object (`{ url: '...' }`) or a structured `{ name, operator, value }` clause depending on the dataset.
- `records_limit` keeps test runs cheap -- set it low while developing.
- If you get "dataset not found", the name is wrong or unavailable -- re-check `client.datasets.list()`.
