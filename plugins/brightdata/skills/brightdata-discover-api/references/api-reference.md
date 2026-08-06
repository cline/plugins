# Discover API -- full reference

Endpoint, per-surface parameter matrix, errors, and limits.
Docs: https://docs.brightdata.com/api-reference/discover/overview

## REST endpoints

### Trigger
```
POST https://api.brightdata.com/discover
Authorization: Bearer <BRIGHTDATA_API_TOKEN>
Content-Type: application/json
```
Body: see the parameter matrix below. Response:
```json
{ "status": "ok", "task_id": "bde85a92-3232-4f26-98f6-5ed0328b8288" }
```

### Retrieve results
```
GET https://api.brightdata.com/discover?task_id=<task_id>
Authorization: Bearer <BRIGHTDATA_API_TOKEN>
```
Response while running:
```json
{ "status": "processing", "duration_seconds": 4.1 }
```
Response when complete:
```json
{
  "status": "done",
  "duration_seconds": 12.4,
  "results": [
    { "link": "...", "title": "...", "description": "...", "relevance_score": 0.87, "content": "..." }
  ]
}
```
- `status`: `"processing"` -> `"done"`.
- Poll on an interval (2-5s is reasonable). Tasks can expire after a period -- retrieve promptly.

## Parameter matrix (which surface exposes what)

Legend: yes exposed  - no not exposed (use raw REST).

CLI column verified against `bdata discover --help` (brightdata CLI v0.3.1).

| Param (REST) | Type / range | REST | CLI `bdata discover` | JS SDK (`client.discover`) | Python SDK |
|---|---|:--:|:--:|:--:|:--:|
| `query` | string <=1500 (required) | yes | yes positional | yes `query` | yes `query` |
| `intent` | string <=3000 | yes | yes `--intent` | yes `intent` | yes `intent` |
| `num_results` | int 1-20 | yes | yes `--num-results` | yes `numResults` | yes |
| `filter_keywords` | string[] | yes | yes `--filter-keywords` (comma-separated) | yes `filterKeywords` | yes |
| `include_content` | bool | yes | yes `--include-content` | yes `includeContent` | yes |
| `country` | ISO code (default US) | yes | yes `--country` | yes `country` (lowercased) | yes |
| `city` | string | yes | yes `--city` | yes `city` | yes |
| `language` | string (31 langs) | yes | yes `--language` | yes `language` | yes |
| `start_date` / `end_date` | `YYYY-MM-DD` | yes | yes `--start-date`/`--end-date` | no | no |
| `remove_duplicates` | bool (default true) | yes | yes `--no-remove-duplicates` (to disable) | no | no |
| `format` | `json`\|`md` | yes | Warning: `--json` only (no `md`) | Warning: `'json'` only | yes |
| `mode` | `standard`\|`zeroRanking`\|`deep`\|`fast` | yes | no | no | no |
| `include_images` | bool | yes | no | no | no |
| `timeout` (poll budget) | CLI: seconds (600)  - SDK: ms (60000) | n/a | yes `--timeout` | yes `timeout` | yes |
| `pollInterval` | ms | n/a | n/a | yes `pollInterval` (2000) | n/a |

Other verified CLI-only flags: `--pretty`, `--timing`, `-o/--output`, `-k/--api-key`
(note: in some environments `-k` is ignored and the stored `bdata login` credential
is used instead).

Bottom line: `mode` and `include_images` are REST-only -- the CLI and SDKs
don't expose them. For those, use the raw `curl` flow in the SKILL.

Return shape differs by surface (verified): REST + CLI return rows under
`.results` inside `{status, duration_seconds, timestamp, results:[...]}`. The JS SDK
returns rows under `.data` inside `{success, data:[...], totalResults, cost, taskId,
durationSeconds, ...}` -- check `success` first. See the SKILL's "Result shape".

## Modes -- detail

| Mode | Behavior | `num_results` | `include_content` |
|---|---|---|---|
| `standard` (default) | balanced depth + AI ranking | honored | supported |
| `deep` | exhaustive/broader; slower; best topic coverage | honored | supported |
| `fast` | lowest latency | honored | supported |
| `zeroRanking` | no AI ranking, max raw volume | ignored | unsupported |

Documented use cases (from the API overview): investment-analysis RAG systems,
developer knowledge bases / engineering troubleshooting, VC financial research,
senior-engineer internal resources.

## Limits & constraints

- `query` <= 1500 chars; `intent` <= 3000 chars.
- `num_results` 1-20 (per request). Need more coverage -> multiple queries + dedup.
- `include_content`: parses pages and PDFs; PDF cap 50 MB / 30s parse -- oversized -> empty/null `content`.
- 31 languages supported via `language`.

## Errors

| Code | Meaning | Fix |
|---|---|---|
| 400 | missing `task_id` (retrieve) or bad body | include `task_id` / fix JSON body |
| 401 | missing/invalid credentials | check `BRIGHTDATA_API_TOKEN` |
| 403 | Discover not enabled on account | enable API access in the dashboard |
| 404 | invalid/expired `task_id` | re-trigger; retrieve sooner |
| 429 | rate / concurrency exceeded | back off and retry; reduce parallel triggers |

`content` returns empty for block pages or oversized PDFs -- validate before use
(grep for captcha / "Just a moment" / "Access Denied" signatures).

### Transient failures (observed in testing)

Discover occasionally returns a failed job even on a valid request -- over the
JS SDK this shows as `{ success: false, data: <non-array>, totalResults: null }`
with no useful `error`; over REST/CLI a job can come back `done` with an empty
`results`. This is intermittent (seen when firing several calls in quick
succession -- likely transient load / soft rate-limiting), not a bad request.

Handle it: treat `success === false` (SDK) or empty `results` (REST/CLI) as a
retry-once condition with a short backoff, rather than surfacing it as a hard
error. Don't retry more than ~2x -- a persistent empty result usually means the
`query`/`intent` is too narrow (loosen it) or the account lacks Discover access (403).

```js
async function discoverWithRetry(client, query, opts, tries = 2) {
  for (let i = 0; i < tries; i++) {
    const res = await client.discover(query, opts);
    if (res.success && Array.isArray(res.data)) return res.data;
    await new Promise(r => setTimeout(r, 1500 * (i + 1)));   // linear backoff
  }
  throw new Error('discover failed after retries (check intent breadth / account access)');
}
```
