# Data-feeds -- patterns

## Verification checklist (shared across all Bright Data CLI skills)

Before claiming a pipeline succeeded:

1. JSON parses cleanly (`jq . <output>` for json; line-by-line for ndjson).
2. Record count matches expected. Partial failures are silent -- count explicitly.
3. No top-level `error` key on object-shaped outputs.
4. No per-record `error` key on array-shaped outputs.
5. Core fields present for the pipeline type -- spot-check with `jq keys` on record 0.

## Sync timeout tuning

```bash
# Default -- good for products / profiles
bdata pipelines amazon_product "<url>" -o out.json

# Long jobs -- reviews, comment feeds, company employees
bdata pipelines amazon_product_reviews "<url>" --timeout 1800 -o out.json

# Or set a session default
export BRIGHTDATA_POLLING_TIMEOUT=1800
bdata pipelines linkedin_posts "<url>" -o out.json
```

## Batching same pipeline across many URLs (parallelism-capped)

```bash
mkdir -p out
xargs -a urls.txt -n 1 -P 2 -I {} bash -c '
    url="$1"
    hash=$(printf "%s" "$url" | md5sum | cut -c1-8)
    bdata pipelines linkedin_company_profile "$url" \
        --timeout 900 -o "out/${hash}.json" || echo "FAIL: $url" >&2
' _ {}
```

`-P 2` -- keep parallelism LOW for pipelines. Each call can trigger a long server-side job; over-provisioning wastes quota and triggers rate limits.

## NDJSON verification (line-by-line parsing)

For `--format ndjson` output, each line must independently parse as JSON:

```bash
bad=0
while IFS= read -r line; do
    jq -e . <<<"$line" >/dev/null || { echo "BAD LINE"; bad=$((bad+1)); }
done < out.ndjson
echo "$bad malformed lines"
```

## Partial-failure detection

Partial failures are silent. Run this check after any batch:

```bash
for f in out/*.json; do
    # 1. Parseable?
    if ! jq . "$f" >/dev/null 2>&1; then
        echo "PARSE FAIL: $f"; continue
    fi
    # 2. Top-level error?
    if jq -e 'if type == "object" then has("error") else false end' "$f" >/dev/null; then
        echo "ERROR: $f -> $(jq -r .error "$f")"; continue
    fi
    # 3. Per-record error in arrays?
    if jq -e 'if type == "array" then map(has("error")) | any else false end' "$f" >/dev/null; then
        echo "PARTIAL FAIL: $f"
    fi
done
```

## Pipeline-type resolution workflow

When the user names a platform but not a pipeline type:

```bash
# 1. Get the source of truth
bdata pipelines list > types.txt

# 2. Grep by platform
grep '^linkedin' types.txt
# -> linkedin_company_profile
# -> linkedin_job_listings
# -> linkedin_people_search
# -> linkedin_person_profile
# -> linkedin_posts

# 3. Pick by intent:
#    - Profile of a person -> linkedin_person_profile
#    - Profile of a company -> linkedin_company_profile
#    - Job postings for a company -> linkedin_job_listings
#    - Posts from a profile -> linkedin_posts
#    - Search for people by attributes -> linkedin_people_search
```

## Keyword- and multi-arg pipeline cheatsheet

These pipelines take non-URL or multi-positional inputs. Verify with the CLI error message if unsure -- invoke with no args:

```bash
# amazon_product_search -- search Amazon by keyword on a given domain
bdata pipelines amazon_product_search \
    "running shoes" "https://www.amazon.com" \
    -o search.json

# linkedin_people_search -- find a named person on a company/school URL
bdata pipelines linkedin_people_search \
    "https://www.linkedin.com/company/example" "Jane" "Doe" \
    -o people.json

# google_maps_reviews -- reviews for a place; optional days_limit defaults to 3
bdata pipelines google_maps_reviews \
    "https://maps.google.com/?cid=1234567890" 90 \
    -o gmaps-reviews.json

# facebook_company_reviews -- optional num_reviews defaults to 10
bdata pipelines facebook_company_reviews \
    "https://www.facebook.com/example" 50 \
    -o fb-reviews.json

# youtube_comments -- optional num_comments defaults to 10
bdata pipelines youtube_comments \
    "https://www.youtube.com/watch?v=abc123" 100 \
    -o yt-comments.json
```

When unsure about args, invoke with none -- CLI prints the expected usage.

## Legacy `curl` fallback (deprecated)

Only when CLI cannot be installed. Pipelines map to the `/datasets/v3/trigger` + `/datasets/v3/snapshot` endpoints; the polling loop is non-trivial. If this path is truly needed, check the git history for the old `scripts/datasets.sh` (removed in this revision) as a starting point. Prefer the CLI.
