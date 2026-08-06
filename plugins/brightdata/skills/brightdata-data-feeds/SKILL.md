---
name: brightdata-data-feeds
description: Extract structured data from 40+ supported platforms (Amazon, LinkedIn, Instagram, TikTok, Facebook, YouTube, Reddit, and more) via the Bright Data CLI (`bdata pipelines`). Use when the user wants clean JSON from a known platform URL rather than raw HTML. Hands off to `brightdata-scrape` for unsupported URLs and to `brightdata-search` when target URLs must be discovered first. Requires the Bright Data CLI; proactively guides install + login if missing.
---

# Bright Data -- Data Feeds (Pipelines)

Extract structured data from supported platforms via `bdata pipelines`. One call, clean JSON, no scraping logic. For unsupported URLs, hand off to `brightdata-scrape`. To find target URLs first, hand off to `brightdata-search`.

## Setup gate (run first)

```bash
if ! command -v bdata >/dev/null 2>&1; then
    echo "bdata CLI not installed -- see brightdata-best-practices/references/cli-setup.md"
elif ! bdata zones >/dev/null 2>&1; then
    echo "bdata not authenticated -- run: bdata login  (or: bdata login --device for SSH)"
fi
```

Halt and route to `../brightdata-best-practices/references/cli-setup.md` if either check fails.

## Supported pipeline types (verified 2026-04-19)

Always verify with `bdata pipelines list` before hardcoding names -- they change. Current 43 types:

`amazon_product`, `amazon_product_reviews`, `amazon_product_search`, `apple_app_store`, `bestbuy_products`, `booking_hotel_listings`, `crunchbase_company`, `ebay_product`, `etsy_products`, `facebook_company_reviews`, `facebook_events`, `facebook_marketplace_listings`, `facebook_posts`, `github_repository_file`, `google_maps_reviews`, `google_play_store`, `google_shopping`, `homedepot_products`, `instagram_comments`, `instagram_posts`, `instagram_profiles`, `instagram_reels`, `linkedin_company_profile`, `linkedin_job_listings`, `linkedin_people_search`, `linkedin_person_profile`, `linkedin_posts`, `reddit_posts`, `reuter_news`, `tiktok_comments`, `tiktok_posts`, `tiktok_profiles`, `tiktok_shop`, `walmart_product`, `walmart_seller`, `x_posts`, `yahoo_finance_business`, `youtube_comments`, `youtube_profiles`, `youtube_videos`, `zara_products`, `zillow_properties_listing`, `zoominfo_company_profile`

Naming note: inconsistent across platforms. `amazon_product` (singular), `tiktok_profiles` (plural), `linkedin_person_profile` (not `linkedin_profile`). Always copy from `bdata pipelines list`.

## Pick your path

| Situation | Action |
|---|---|
| Know the platform + have URL(s) | `bdata pipelines <type> <url>` |
| Don't know which pipeline fits | `bdata pipelines list` first |
| Pipeline takes keyword or multi-arg input | See "Keyword- and multi-arg pipelines" below |
| Multiple URLs on the same pipeline type | shell loop with parallelism cap (see `references/patterns.md`) |
| Long job (reviews, company employees, big post feeds) | raise `--timeout 1800` |
| URL is on an unsupported platform | stop -- hand off to `brightdata-scrape` |
| Need to find URLs first | hand off to `brightdata-search` |

## Keyword- and multi-arg pipelines (do NOT take a single URL)

A few pipelines take non-URL or multi-positional inputs. Invoke with no args to see the exact usage line from the CLI:

| Pipeline | Args |
|---|---|
| `amazon_product_search` | `<keyword> <domain_url>` -- e.g., `"running shoes" https://www.amazon.com` |
| `linkedin_people_search` | `<url> <first_name> <last_name>` -- search a company/school/URL for a named person |
| `facebook_company_reviews` | `<url> [num_reviews]` -- optional num_reviews defaults to `10` |
| `google_maps_reviews` | `<url> [days_limit]` -- optional days_limit defaults to `3` |
| `youtube_comments` | `<url> [num_comments]` -- optional num_comments defaults to `10` |

All other 37 pipelines take a single URL.

## Action

Core commands:

```bash
# List available pipeline types (source of truth)
bdata pipelines list

# Amazon product
bdata pipelines amazon_product \
    "https://www.amazon.com/dp/B08N5WRWNW" \
    --format json --pretty -o product.json

# Amazon product reviews (slower -- reviews can be hundreds)
bdata pipelines amazon_product_reviews \
    "https://www.amazon.com/dp/B08N5WRWNW" \
    --timeout 1200 -o reviews.json

# Amazon product search (keyword + domain URL)
bdata pipelines amazon_product_search \
    "noise cancelling headphones" "https://www.amazon.com" \
    --format json --pretty -o search.json

# LinkedIn person profile
bdata pipelines linkedin_person_profile \
    "https://www.linkedin.com/in/example" -o person.json

# LinkedIn company
bdata pipelines linkedin_company_profile \
    "https://www.linkedin.com/company/example" -o company.json

# LinkedIn people search (url + first + last name)
bdata pipelines linkedin_people_search \
    "https://www.linkedin.com/company/example" "Jane" "Doe" \
    -o people.json

# Instagram posts
bdata pipelines instagram_posts \
    "https://www.instagram.com/example/" -o posts.json

# Google Maps reviews (url + days_limit, default 3)
bdata pipelines google_maps_reviews \
    "https://maps.google.com/?cid=1234567890" 90 -o reviews.json

# YouTube comments (url + num_comments, default 10)
bdata pipelines youtube_comments \
    "https://www.youtube.com/watch?v=abc123" 100 -o yt-comments.json

# NDJSON for big feeds (one record per line)
bdata pipelines linkedin_posts "https://www.linkedin.com/in/example" \
    --format ndjson -o posts.ndjson

# Raise polling timeout for long jobs
bdata pipelines amazon_product_reviews "<url>" --timeout 1800 -o out.json
```

Full flag reference + full type table: [`references/flags.md`](references/flags.md).

## Verification gate

1. JSON parses cleanly: `jq . <output>` returns 0 (or for `--format ndjson`, each line parses).
2. Record count matches expected. One URL usually = one record, *but* reviews/posts/comments pipelines return arrays sized by what the platform shows. Always check:
   ```bash
   jq 'length' out.json                       # top-level array count
   # OR
   jq 'if type == "array" then length else 1 end' out.json
   ```
3. No top-level error:
   ```bash
   jq -e 'if type == "object" then has("error") | not else true end' out.json \
       || { echo "pipeline reported error"; exit 1; }
   ```
4. No per-record error: for array results, ensure no record has an `error` field:
   ```bash
   jq -e 'if type == "array" then map(has("error")) | any | not else true end' out.json \
       || echo "WARN: one or more records have error fields"
   ```
   Partial failures are silent -- this check is non-optional.
5. Core fields present for the pipeline type (examples):
   - `amazon_product` -> `.title` + `.price` (or `.final_price`)
   - `linkedin_person_profile` -> `.name` + `.headline` (or `.position`)
   - `instagram_posts` -> `.caption` or `.description` + `.url` or `.post_id`
   - `youtube_videos` -> `.title` + `.video_id` or `.url`

   Spot-check with `jq keys` on the first record to learn the exact schema.
6. On failure: double `--timeout` and retry once. If still failing, `bdata pipelines list` to confirm the type name hasn't changed.

## Red flags

- Using `bdata scrape` on Amazon/LinkedIn/TikTok/etc. when `bdata pipelines <type>` returns structured fields in one call. Loses structure and costs more time.
- Looping `bdata pipelines` for large jobs without rate-limiting -- each call can trigger a long-running pipeline on the server. Cap parallelism at 2-3.
- Claiming success without the record-count + per-record error check. Partial failures are silent in pipeline output.
- Hardcoding pipeline type names (`amazon_products` with an `s`, `linkedin_profile` without `_person_`, etc.) -- they're inconsistent across platforms. Always copy from `bdata pipelines list`.
- Using a tight `--timeout` on pipelines that legitimately take 5-15 minutes (reviews, company employees, big post feeds). Default 600s is a floor for small inputs; raise for long ones.
- Calling a keyword- or multi-arg pipeline (`amazon_product_search`, `linkedin_people_search`, `google_maps_reviews`, `facebook_company_reviews`, `youtube_comments`) with URL-only args -- will fail with `"Usage: ..."`. Always check `bdata pipelines <type>` error output when in doubt.
- Passing a `pages_to_search` third arg to `amazon_product_search` -- it's hardcoded to `1` by the CLI and extra args are ignored.

## References

- [`references/flags.md`](references/flags.md) -- full `pipelines` flags + complete table of all 43 types with input shapes.
- [`references/patterns.md`](references/patterns.md) -- sync timeout tuning, shell-loop batching with parallelism cap, partial-failure detection, keyword-shaped pipeline cheatsheet, legacy `curl` fallback, shared verification checklist.
- [`references/examples.md`](references/examples.md) -- (1) single Amazon product, (2) batch LinkedIn companies, (3) long reviews job with raised timeout, (4) mixed-platform workflow calling `pipelines list` first, (5) keyword-shaped `amazon_product_search`.
