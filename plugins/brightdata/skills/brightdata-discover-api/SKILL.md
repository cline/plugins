---
name: brightdata-discover-api
description: |
  Use Bright Data's Discover API -- intent-ranked, AI-relevance-scored web search
  at scale (not keyword SERP). Trigger a discovery job and retrieve ranked results
  (link, title, description, relevance_score) with optional parsed page content.
  Use when the user wants semantic/intent-based web search, "find pages about
  <topic> that match <goal>", web-grounded retrieval for an LLM, or results
  filtered by relevance rather than raw keyword rank. Covers the REST API
  (POST/GET /discover), the CLI (`bdata discover`), and the Python/JS SDKs
  (`client.discover`), including the standard/zeroRanking/deep/fast modes. This is
  the foundation skill for `brightdata-live-research` and `brightdata-rag-pipeline`. For keyword SERP use
  `brightdata-search`; for structured platform data use `brightdata-data-feeds`.
metadata:
  author: Bright Data
  version: "1.0"
  documentation: https://docs.brightdata.com/api-reference/discover/overview
---

# Bright Data -- Discover API

Discover is intent-ranked semantic web search. You give it a `query` plus an
`intent`, and it returns results scored by AI relevance -- optionally with the full
parsed page content. It is the right primitive when result *quality/relevance*
matters more than raw keyword rank, and the building block for retrieval (RAG),
research, and knowledge-base pipelines.

Discover vs. the neighbors:
- Keyword "what ranks for X" SERP -> use the `brightdata-search` skill (`bdata search`).
- Structured data from a known platform (Amazon/LinkedIn/...) -> use `brightdata-data-feeds`.
- A whole research brief or a RAG/search pipeline on top of Discover -> use
  `brightdata-live-research` or `brightdata-rag-pipeline` (both call this API).

## How it works (async: trigger -> poll)

1. Trigger a job -> you get a `task_id`.
2. Poll with the `task_id` until `status` is `"done"` (intermediate: `"processing"`).
3. Read `results[]`.

The CLI and SDKs do the trigger+poll for you; the raw REST flow is shown below for
when you need parameters the wrappers don't expose (notably `mode`).

## Pick your surface

| You are... | Use |
|---|---|
| In a terminal, one-off or scripted | CLI: `bdata discover` |
| Writing Node/TS code | JS SDK: `client.discover()` -- see `brightdata-js-sdk-best-practices` |
| Writing Python code | Python SDK: `client.discover()` -- see `brightdata-python-sdk-best-practices` |
| Need `mode` (deep/fast/zeroRanking) or `include_images` | Raw REST (wrappers don't expose these yet) |

### CLI -- `bdata discover`

Setup gate first:
```bash
command -v bdata >/dev/null 2>&1 || echo "CLI missing -- see brightdata-best-practices/references/cli-setup.md"
bdata zones >/dev/null 2>&1 || echo "not authenticated -- run: bdata login"
```

```bash
# Intent-ranked discovery, JSON
bdata discover "enterprise LLM platforms" \
  --intent "vendor pages with pricing" \
  --num-results 15 --json --pretty

# With parsed page content in one pass (for RAG / research)
bdata discover "webhook retry best practices" \
  --include-content --num-results 10 -o results.json

# Date-bounded
bdata discover "react server components" \
  --start-date 2025-01-01 --end-date 2025-12-31 --num-results 20 --json
```
Results live at `.results[]`; each has `title`, `link`, `description`,
`relevance_score`, and `content` when `--include-content`. Full CLI flag list:
[`brightdata-search` skill -> `references/flags.md`](../brightdata-search/references/flags.md).

### SDK (one line each)
```javascript
// JS -- see js-sdk-best-practices for all options.
// VERIFIED v1.1.0: discover() returns a WRAPPER { success, data:[...], totalResults, cost, taskId, ... }
const res = await client.discover('Tesla battery tech', { intent: 'EV battery breakthroughs', numResults: 10, includeContent: true });
const rows = res.data;   // <- rows are in .data (NOT a bare array, NOT .results)
```
```python
# Python -- see python-sdk-best-practices (confirm whether rows come back directly, under .data, or .results)
out = client.discover(query="Tesla battery tech", intent="EV battery breakthroughs")
```

### Raw REST (full control, incl. `mode`)
```bash
# 1) Trigger
task_id=$(curl -s -X POST https://api.brightdata.com/discover \
  -H "Authorization: Bearer $BRIGHTDATA_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"post-quantum cryptography adoption","intent":"enterprise migration guides","mode":"deep","num_results":20,"include_content":true}' \
  | jq -r '.task_id')

# 2) Poll until done
while :; do
  resp=$(curl -s "https://api.brightdata.com/discover?task_id=$task_id" -H "Authorization: Bearer $BRIGHTDATA_API_TOKEN")
  [ "$(echo "$resp" | jq -r '.status')" = "done" ] && break
  sleep 3
done
echo "$resp" | jq '.results'
```

## Parameters (REST body -- authoritative superset)

`query` is required; everything else is optional. The CLI/SDK expose a subset
(see `references/api-reference.md` for the exact per-surface matrix).

| Param | Type | Default | Notes |
|---|---|---|---|
| `query` | string | -- | required, <= 1500 chars |
| `intent` | string | -- | goal descriptor, <= 3000 chars; strongly recommended -- drives ranking |
| `mode` | enum | `standard` | `standard` \| `zeroRanking` \| `deep` \| `fast` (REST-only) |
| `num_results` | int | -- | 1-20; ignored in `zeroRanking` |
| `filter_keywords` | string[] | -- | exact keywords that must appear |
| `include_content` | bool | `false` | parsed page/PDF content (PDF <= 50 MB, 30s); unsupported in `zeroRanking` |
| `include_images` | bool | `false` | image array (REST-only) |
| `format` | enum | `json` | `json` \| `md` (SDK accepts only `json`) |
| `country` | string | `US` | 2-letter ISO |
| `city` | string | -- | SERP city targeting |
| `language` | string | `en` | 31 languages |
| `start_date` / `end_date` | string | -- | `YYYY-MM-DD` (REST-only) |
| `remove_duplicates` | bool | `true` | dedupe results (REST-only) |

## Modes (choose by goal)

| Mode | What it does | Use for |
|---|---|---|
| `standard` *(default)* | balanced depth + AI ranking | general intent search |
| `deep` | exhaustive, broader search; slower | `brightdata-live-research`, comprehensive topic coverage |
| `fast` | optimized for low latency | time-sensitive / interactive |
| `zeroRanking` | no AI ranking, max raw volume; ignores `num_results`, no `include_content` | bulk corpus collection for `brightdata-rag-pipeline` |

> `mode` is currently REST-only -- the CLI and SDKs don't expose it. For `deep`
> coverage via the CLI/SDK, approximate with a high `num_results` + a sharp
> `intent`; for true `deep`/`zeroRanking`, use the raw REST flow above.

## Result shape

REST + CLI (verified) -- rows live under `results`:
```json
{
  "status": "done",
  "duration_seconds": 12.4,
  "timestamp": "2026-06-08T08:36:55.709Z",
  "results": [
    { "link": "https://...", "title": "...", "description": "...",
      "relevance_score": 0.87, "content": "...(when --include-content)..." }
  ]
}
```

JS SDK (verified v1.1.0) -- rows live under `data`, inside a wrapper:
```js
{ success: true, data: [ {link, title, description, relevance_score, content?} ],
  totalResults, cost, taskId, query, intent, durationSeconds, triggerSentAt, dataFetchedAt }
```

Warning: Cross-surface gotcha: REST/CLI return rows under `.results`; the JS SDK
returns them under `.data` (and wraps everything in `{success, ...}` -- check
`success` before reading `data`). Don't assume one shape across surfaces.

`relevance_score` is a float (snake_case). Higher = more relevant to `intent`.
`content` is plain text by default (Markdown when REST `format=md`). A high
`relevance_score` does not guarantee good content -- pages can be 404 stubs or
nav-only; gate on content length + "not found"/block-page signatures before use.

## Verification gate

1. Trigger returned a `task_id` (REST: `status:"ok"`). No id -> check auth / that Discover is enabled on the account (403 if disabled).
2. Polled to `status:"done"` before reading -- never read `results` while `processing`.
3. `results[]` non-empty -- if empty, the query/intent is too narrow; loosen and retry. Don't claim success on empty.
4. `include_content` bodies aren't block pages -- grep `content` for `captcha`, `Just a moment`, `Access Denied`, `cf-browser-verification` (same list as `brightdata-scrape`). Drop poisoned rows.
5. Relevance sanity -- if top `relevance_score`s are low or off-topic, sharpen `intent` (not just `query`).

## Red flags

- Passing only `query` with no `intent` -- you lose the whole point (intent ranking). Always give an intent.
- Treating Discover as keyword SERP -- for "what ranks for X", use `brightdata-search`.
- Setting `num_results` > 20 -- capped at 20; for more, run multiple targeted queries and dedup (see `brightdata-live-research`).
- Using `zeroRanking` then expecting `include_content` or `num_results` to apply -- they don't.
- Reading results before `status:"done"`.
- Treating an intermittent `success:false` (SDK) / empty `results` (REST/CLI) as a hard error -- it's often transient; retry once with backoff first (see `references/api-reference.md` -> Transient failures).
- Fabricating `relevance_score` or `content` when a call fails -- report the failure instead.

## References

- [`references/api-reference.md`](references/api-reference.md) -- full REST endpoint spec, the exact param matrix per surface (REST vs CLI vs JS SDK vs Python SDK), error codes, and limits.

## Related skills

- `brightdata-live-research` -- multi-query Discover -> dedup -> synthesized cited brief.
- `brightdata-rag-pipeline` -- Discover (`include_content`) -> chunk -> embed -> retrieve.
- `brightdata-search` -- keyword SERP (`bdata search`) when you don't need intent ranking.
- `brightdata-js-sdk-best-practices` / `brightdata-python-sdk-best-practices` -- `client.discover()` option details.
