# Scrape -- worked examples

## Example 1 -- single page to markdown

Fetch a blog post as clean markdown and verify the output.

```bash
bdata scrape "https://engineering.example.com/posts/scaling-bigquery" \
    -f markdown -o post.md

# Verify
test -s post.md || { echo "empty output"; exit 1; }
grep -qiE 'access denied|just a moment|captcha|cloudflare' post.md \
    && { echo "block page"; exit 1; }
head -n 1 post.md   # should show the title as an h1
```

## Example 2 -- batch a list of URLs with parallelism cap

Given `urls.txt` (one URL per line), scrape all to `out/` with max 4 parallel requests:

```bash
mkdir -p out
xargs -a urls.txt -n 1 -P 4 -I {} bash -c '
    url="$1"
    hash=$(printf "%s" "$url" | md5sum | cut -c1-8)
    bdata scrape "$url" -f markdown -o "out/${hash}.md" \
        || echo "FAIL: $url" >&2
' _ {}

# Count successes / failures
ok=$(find out -name "*.md" -size +0 | wc -l)
total=$(wc -l < urls.txt)
echo "Scraped $ok of $total URLs"
```

## Example 3 -- paginated listing

Scrape every page of a paginated article index until an empty page is hit:

```bash
mkdir -p out
page=1
while :; do
    url="https://blog.example.com/archive?page=$page"
    out="out/archive-${page}.md"
    bdata scrape "$url" -f markdown -o "$out"

    if [[ ! -s "$out" ]] || ! grep -qE '\[.+\]\(/posts/' "$out"; then
        rm -f "$out"
        echo "Done after $((page - 1)) pages"
        break
    fi
    page=$((page + 1))
done
```

## Example 4 -- block-page recovery chain

Scrape a URL that's intermittently Cloudflare-gated. Try a set of exit countries; if all return block pages, hand off to `bdata browser`:

```bash
URL="https://protected.example.com/catalog"
OUT="catalog.md"

for args in "" "--country de" "--country jp" "--country gb"; do
    bdata scrape "$URL" $args -f markdown -o "$OUT" || continue
    [[ -s "$OUT" ]] || continue
    if ! grep -qiE 'access denied|just a moment|captcha|cloudflare' "$OUT"; then
        echo "Succeeded with: $args"
        exit 0
    fi
done

echo "All country rotations returned block pages -- escalating to bdata browser" >&2
# (caller hands off to the bdata browser command, documented in the brightdata-cli skill)
exit 1
```
