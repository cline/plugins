# Data-feeds -- worked examples

## Example 1 -- single Amazon product

```bash
bdata pipelines amazon_product \
    "https://www.amazon.com/dp/B08N5WRWNW" \
    --format json --pretty -o product.json

# Verify
jq . product.json >/dev/null || { echo "parse fail"; exit 1; }
jq -e 'has("error") | not' product.json >/dev/null \
    || { echo "pipeline error: $(jq -r .error product.json)"; exit 1; }
jq -r '.title, .price // .final_price' product.json
```

## Example 2 -- batch LinkedIn companies via shell loop

Given `companies.txt` (one LinkedIn company URL per line):

```bash
mkdir -p out
xargs -a companies.txt -n 1 -P 2 -I {} bash -c '
    url="$1"
    hash=$(printf "%s" "$url" | md5sum | cut -c1-8)
    bdata pipelines linkedin_company_profile "$url" \
        --timeout 900 -o "out/${hash}.json" || echo "FAIL: $url" >&2
' _ {}

# Summarize results
total=$(wc -l < companies.txt)
ok=$(find out -name "*.json" -size +0 | wc -l)
echo "Fetched $ok of $total companies"

# Partial-failure sweep
for f in out/*.json; do
    jq -e 'has("error") | not' "$f" >/dev/null \
        || echo "ERROR in $f: $(jq -r .error "$f")"
done
```

## Example 3 -- long reviews job with raised timeout

Amazon product reviews can take 10+ minutes for products with many reviews:

```bash
bdata pipelines amazon_product_reviews \
    "https://www.amazon.com/dp/B08N5WRWNW" \
    --timeout 1800 \
    --format json --pretty -o reviews.json

# Verify count
count=$(jq 'if type == "array" then length else 1 end' reviews.json)
echo "Got $count reviews"

# Check first record schema
jq '.[0] | keys' reviews.json
```

## Example 4 -- mixed platform workflow (discover types first)

User says: "Give me all the data on this TikTok profile and their recent posts."

```bash
# 1. Find the right pipelines
bdata pipelines list | grep '^tiktok'
# -> tiktok_comments, tiktok_posts, tiktok_profiles, tiktok_shop

# 2. Profile info
bdata pipelines tiktok_profiles \
    "https://www.tiktok.com/@example" -o profile.json

# 3. Recent posts
bdata pipelines tiktok_posts \
    "https://www.tiktok.com/@example" --timeout 1200 -o posts.json

# Verify both
for f in profile.json posts.json; do
    jq . "$f" >/dev/null || { echo "$f: parse fail"; exit 1; }
    jq -e 'if type == "object" then has("error") | not else true end' "$f" \
        >/dev/null || { echo "$f: pipeline error"; exit 1; }
done

echo "profile: $(jq 'keys' profile.json)"
echo "posts: $(jq 'if type == "array" then length else 1 end' posts.json) records"
```

## Example 5 -- keyword-shaped `amazon_product_search`

Search Amazon by keyword on a given domain (no URL needed, just the domain root):

```bash
bdata pipelines amazon_product_search \
    "mechanical keyboard" "https://www.amazon.com" \
    --format json --pretty -o search.json

jq 'length' search.json                                     # number of results (output is a top-level array)
jq -r '.[0:5][] | "\(.title) -- \(.price)"' search.json
```

Two positional args: `<keyword> <domain_url>`. The CLI hardcodes `pages_to_search` to `1` internally -- pass only those two args. Calling with fewer args prints the expected usage.
