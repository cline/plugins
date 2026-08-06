# `bdata pipelines` -- flag reference

Verified against `@brightdata/cli` v0.1.8 on 2026-04-19.

Usage: `bdata pipelines [options] <type> [params...]`

## Flags

| Flag | Values | Default | When to use |
|---|---|---|---|
| `--format <fmt>` | `json`, `csv`, `ndjson`, `jsonl` | `json` | `json` for most; `ndjson` or `jsonl` for big result sets you'll stream-process line-by-line. `csv` for spreadsheet consumers. |
| `--timeout <seconds>` | integer | `600` (or `$BRIGHTDATA_POLLING_TIMEOUT`) | Max seconds to poll for completion. Raise to `1200`-`1800` for reviews, company employees, or long post feeds. |
| `-o, --output <path>` | file path | stdout | Write to file. Recommended for any result > 1KB. |
| `--json` | (flag) | off | Force JSON envelope. |
| `--pretty` | (flag) | off | Pretty-print JSON. |
| `--timing` | (flag) | off | Stderr timing breakdown. Debug only. |
| `-k, --api-key <key>` | API key | saved / env | Per-command override. |

## Pipeline types -- input shape (verified 2026-04-19)

Always cross-check with `bdata pipelines list` before hardcoding names. All 43 types:

### URL-input pipelines (single `<url>`)

| Pipeline | Typical URL shape |
|---|---|
| `amazon_product` | `https://www.amazon.<tld>/dp/<ASIN>` |
| `amazon_product_reviews` | `https://www.amazon.<tld>/dp/<ASIN>` |
| `apple_app_store` | app page URL |
| `bestbuy_products` | product page URL |
| `booking_hotel_listings` | listing URL |
| `crunchbase_company` | company page URL |
| `ebay_product` | product URL |
| `etsy_products` | product URL |
| `facebook_events` | event URL |
| `facebook_marketplace_listings` | listing URL |
| `facebook_posts` | page or post URL |
| `github_repository_file` | file URL |
| `google_play_store` | app URL |
| `google_shopping` | product URL |
| `homedepot_products` | product URL |
| `instagram_comments` | post URL |
| `instagram_posts` | profile or post URL |
| `instagram_profiles` | profile URL |
| `instagram_reels` | profile or reel URL |
| `linkedin_company_profile` | `https://www.linkedin.com/company/<slug>` |
| `linkedin_job_listings` | job URL |
| `linkedin_person_profile` | `https://www.linkedin.com/in/<slug>` |
| `linkedin_posts` | profile URL |
| `reddit_posts` | subreddit or post URL |
| `reuter_news` | article URL |
| `tiktok_comments` | video URL |
| `tiktok_posts` | profile or post URL |
| `tiktok_profiles` | `https://www.tiktok.com/@<handle>` |
| `tiktok_shop` | product URL |
| `walmart_product` | product URL |
| `walmart_seller` | seller URL |
| `x_posts` | profile or post URL |
| `yahoo_finance_business` | company page URL |
| `youtube_profiles` | channel URL |
| `youtube_videos` | video URL |
| `zara_products` | product URL |
| `zillow_properties_listing` | listing URL |
| `zoominfo_company_profile` | company URL |

### Keyword / multi-arg pipelines (NOT a single URL)

| Pipeline | Args | Notes |
|---|---|---|
| `amazon_product_search` | `<keyword> <domain_url>` | Two positional args. `pages_to_search` is hardcoded to `1` by the CLI; extra args are ignored. |
| `linkedin_people_search` | `<url> <first_name> <last_name>` | Three positional args -- search the given company/school/URL for a named person. |
| `facebook_company_reviews` | `<url> [num_reviews]` | Optional second arg; defaults to `10`. |
| `google_maps_reviews` | `<url> [days_limit]` | Optional second arg; defaults to `3`. |
| `youtube_comments` | `<url> [num_comments]` | Optional second arg; defaults to `10`. |

When in doubt about a pipeline's args, invoke it with no params -- the CLI prints the expected usage line.

## Timeout guidance

| Pipeline category | Suggested `--timeout` |
|---|---|
| Single-item products / profiles | `600` (default) |
| Post / video feeds | `900`-`1200` |
| Reviews, comments, large employee lists | `1200`-`1800` |
| Company crawls (Crunchbase, ZoomInfo) | `1200`+ |

`BRIGHTDATA_POLLING_TIMEOUT=1800 bdata pipelines ...` also works as an env-var default.
