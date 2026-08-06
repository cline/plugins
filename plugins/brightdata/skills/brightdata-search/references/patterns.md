# Search -- patterns

## Verification checklist (shared across all Bright Data CLI skills)

Before claiming a search succeeded:

1. JSON parses cleanly (`jq . <output>` returns 0).
2. Result array non-empty -- if empty, re-check; don't claim success on zero results silently.
3. Expected fields present: `title` + `link` at `.organic[]` (`brightdata-search`) or `.results[]` (`discover`). If `discover --include-content`, results also have `content`.
4. No block-page signatures in `discover --include-content` bodies:
   - `Access Denied`
   - `Just a moment`
   - `Attention Required`
   - `Checking your browser`
   - `captcha`
   - `cf-browser-verification`
   - `cloudflare` *(with < 2KB total body)*
5. Geo sanity: result TLDs / languages match the requested `--country` / `--language`.

## Multi-query batch with dedup

Given `queries.txt` (one query per line), collect deduped result URLs:

```bash
mkdir -p out
: > out/all-urls.txt

while IFS= read -r q; do
    hash=$(printf '%s' "$q" | md5sum | cut -c1-8)
    bdata search "$q" --engine google --country us --json \
        -o "out/serp-${hash}.json"
    jq -r '.organic[].link' "out/serp-${hash}.json" >> out/all-urls.txt
done < queries.txt

sort -u out/all-urls.txt > out/urls.txt
wc -l out/urls.txt
```

`bdata search`'s JSON envelope holds the main results at `.organic[]`. Confirm once with `jq 'keys'` on any SERP output if the shape ever surprises you.

## SERP -> filter -> scrape pipeline

```bash
# 1. Search
bdata search "enterprise monitoring tools" --engine google --country us \
    --json -o serp.json

# 2. Filter (domain allowlist; relevance heuristic)
jq -r '.organic[]
    | select(.link | test("^https://(?!.*(reddit|pinterest))"))
    | select(.title | test("monitoring"; "i"))
    | .link' serp.json > urls.txt

# 3. Scrape (hands off to the brightdata-scrape skill's patterns)
mkdir -p out
xargs -a urls.txt -n 1 -P 4 -I {} bash -c '
    url="$1"
    hash=$(printf "%s" "$url" | md5sum | cut -c1-8)
    bdata scrape "$url" -f markdown -o "out/${hash}.md" || echo "FAIL: $url" >&2
' _ {}
```

## `brightdata-search` vs `discover` decision

Default to `brightdata-search` for keyword-exactness tasks (SEO research, "what ranks for X"). Default to `discover` when the user's description is a topic, intent, or concept rather than a keyword ("pages about how companies adopt LLMs", "recent articles on post-quantum crypto").

Rule of thumb: if the user's phrasing is a complete sentence or describes intent, `discover`. If it's a short keyword string, `brightdata-search`.

## Pagination with `brightdata-search`

`--page` is 0-indexed. Loop pages until empty or duplicate:

```bash
prev_hash=""
for page in 0 1 2 3 4; do
    bdata search "long tail query" --page "$page" --json -o "p${page}.json"
    hash=$(sha1sum "p${page}.json" | awk '{print $1}')
    # Same hash twice -> we're looping; break
    [[ "$hash" == "$prev_hash" ]] && { rm "p${page}.json"; break; }
    # Empty results -> break
    count=$(jq '.organic | length' "p${page}.json")
    [[ "$count" == "0" ]] && { rm "p${page}.json"; break; }
    prev_hash=$hash
done
```

## Discover: extracting links and content

```bash
# Just links (discover's array is at .results[])
bdata discover "enterprise LLM vendors" --num-results 20 --json -o disc.json
jq -r '.results[].link' disc.json > vendor-urls.txt

# Links + markdown bodies in one call
bdata discover "incident postmortems" \
    --intent "public post-mortem write-ups from 2025" \
    --num-results 15 --include-content \
    --json -o postmortems.json

# Pull just the bodies as separate markdown files
jq -r '.results[] | .link + "\n" + (.content // "")' postmortems.json
# Or write each to a file:
jq -c '.results[]' postmortems.json | while IFS= read -r row; do
    link=$(jq -r '.link' <<<"$row")
    hash=$(printf '%s' "$link" | md5sum | cut -c1-8)
    jq -r '.content // ""' <<<"$row" > "out/${hash}.md"
done
```

## Legacy `curl` fallback (deprecated)

Only when CLI cannot be installed. SERP API endpoint via Web Unlocker. The CLI's `bdata search` prefers `BRIGHTDATA_SERP_ZONE` and falls back to `BRIGHTDATA_UNLOCKER_ZONE`; pick whichever is set in your environment:

```bash
curl -sS "https://api.brightdata.com/request" \
    -H "Authorization: Bearer $BRIGHTDATA_API_KEY" \
    -H "Content-Type: application/json" \
    -d "{
        \"zone\": \"${BRIGHTDATA_SERP_ZONE:-$BRIGHTDATA_UNLOCKER_ZONE}\",
        \"url\": \"https://www.google.com/search?q=$(printf '%s' "$QUERY" | jq -sRr @uri)&brd_json=1\",
        \"format\": \"raw\"
    }"
```

Prefer the CLI path. This block exists only for environments without Node.js.
