# Scrape -- patterns

## Verification checklist (shared across all Bright Data CLI skills)

Before claiming a scrape succeeded:

1. Output is non-empty. `test -s "$out"` for files; for stdout, min 200 bytes.
2. Not a block page. Grep (case-insensitive) for any of:
   - `Access Denied`
   - `Just a moment`
   - `Attention Required`
   - `Checking your browser`
   - `captcha`
   - `cf-browser-verification`
   - `cloudflare` *(with < 2KB total body)*
3. Expected markers present for the task (e.g., price pattern on a product page, at least one heading in an article).

Failing any check -> retry with `--country`, then escalate to `bdata browser`.

## Small-batch shell loop (<= ~20 URLs)

```bash
mkdir -p out
while IFS= read -r url; do
    hash=$(printf '%s' "$url" | md5sum | cut -c1-8)
    bdata scrape "$url" -f markdown -o "out/${hash}.md" \
        || echo "FAIL: $url" >&2
done < urls.txt
```

The `|| echo` prevents one failure from aborting the loop; failures are visible on stderr.

## Large batch with parallelism cap (`xargs -P`)

```bash
mkdir -p out
xargs -a urls.txt -n 1 -P 4 -I {} bash -c '
    url="$1"
    hash=$(printf "%s" "$url" | md5sum | cut -c1-8)
    bdata scrape "$url" -f markdown -o "out/${hash}.md" || echo "FAIL: $url" >&2
' _ {}
```

`-P 4` caps concurrency at 4 parallel `bdata scrape` invocations. Raise cautiously -- each scrape consumes bandwidth and counts against zone budget.

## Pagination recipe (listing pages)

For a listing with `?page=N` pagination:

```bash
page=1
while :; do
    url="https://example.com/list?page=$page"
    out="out/page-${page}.md"
    bdata scrape "$url" -f markdown -o "$out"

    # Stop when the page is empty or doesn't contain an item marker
    if [[ ! -s "$out" ]] || ! grep -q '\[.*\](/item/' "$out"; then
        rm -f "$out"
        break
    fi
    page=$((page + 1))
done
```

Adapt the "contains an item marker" grep to the actual site's output.

## Retry / backoff

`bdata scrape` returns non-zero on failure. Wrap with a simple retry:

```bash
scrape_with_retry() {
    local url=$1 out=$2 attempt=1 max=3
    while (( attempt <= max )); do
        if bdata scrape "$url" -f markdown -o "$out"; then
            return 0
        fi
        sleep $((2  attempt))   # 2s, 4s, 8s
        attempt=$((attempt + 1))
    done
    return 1
}
```

## Block-page recovery chain

When a scrape returns a block-page signature:

1. Retry same URL with a different `--country` (e.g. `de` if origin is US).
2. If still blocked, escalate to `bdata browser` (real-browser with JS execution).

Example:

```bash
try_scrape() {
    local url=$1 out=$2
    for args in "" "--country de" "--country jp" "--country gb"; do
        bdata scrape "$url" $args -f markdown -o "$out" || continue
        [[ -s "$out" ]] || continue
        if ! grep -qiE 'access denied|just a moment|captcha|cloudflare' "$out"; then
            return 0
        fi
    done
    return 1
}
```

If all country rotations return block pages, hand off to the `bdata browser` command.

## Legacy `curl` fallback (deprecated)

Only when the CLI cannot be installed. Requires env vars `BRIGHTDATA_API_KEY` and `BRIGHTDATA_UNLOCKER_ZONE`:

```bash
curl -sS "https://api.brightdata.com/request" \
    -H "Authorization: Bearer $BRIGHTDATA_API_KEY" \
    -H "Content-Type: application/json" \
    -d "{
        \"zone\": \"$BRIGHTDATA_UNLOCKER_ZONE\",
        \"url\": \"$URL\",
        \"format\": \"raw\",
        \"data_format\": \"markdown\"
    }"
```

Prefer the CLI path. This block exists only for environments without Node.js.
