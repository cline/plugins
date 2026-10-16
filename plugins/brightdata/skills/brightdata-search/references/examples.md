# Search -- worked examples

## Example 1 -- single Google query

```bash
bdata search "postgres jsonb index performance" \
    --engine google --country us --json --pretty -o serp.json

# Verify
jq '.organic | length' serp.json        # > 0
jq -r '.organic[0] | "\(.title)\n\(.link)"' serp.json
```

## Example 2 -- localized Bing (German)

```bash
bdata search "datenschutz-grundverordnung leitfaden" \
    --engine bing --country de --language de --json -o serp-de.json

# Sanity-check locale: top results should have .de TLDs or German text
jq -r '.organic[0:5][].link' serp-de.json
```

## Example 3 -- batch queries + dedup into URL list

Given `queries.txt` with multiple related queries:

```bash
mkdir -p out
: > out/all-urls.txt

while IFS= read -r q; do
    hash=$(printf '%s' "$q" | md5sum | cut -c1-8)
    bdata search "$q" --engine google --country us --json \
        -o "out/serp-${hash}.json"
    jq -r '.organic[].link' "out/serp-${hash}.json" >> out/all-urls.txt
done < queries.txt

sort -u out/all-urls.txt > out/unique-urls.txt
echo "Total: $(wc -l < out/all-urls.txt)  Unique: $(wc -l < out/unique-urls.txt)"
```

## Example 4 -- `discover --include-content` end-to-end

Find recent articles on a topic, with body content in one call, ready to feed into an LLM:

```bash
bdata discover "post-quantum cryptography deployment" \
    --intent "practical deployment case studies from 2025" \
    --num-results 15 \
    --start-date 2025-01-01 \
    --include-content \
    --country us --language en \
    --timeout 900 \
    --json --pretty -o pqc.json

# Verify count
jq '.results | length' pqc.json              # should be ~15
jq -r '.results[0] | .title, .link' pqc.json
jq -r '.results[0].content' pqc.json | head  # body as markdown

# Block-page sanity (no content should match)
jq -r '.results[].content // empty' pqc.json \
    | grep -iE 'access denied|just a moment|captcha|cloudflare' \
    && echo "WARN: one or more results returned a block page"
```
