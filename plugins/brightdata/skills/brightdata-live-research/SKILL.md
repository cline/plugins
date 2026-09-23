---
name: brightdata-live-research
description: |
  Produce a deep, multi-source, cited research brief on a topic from live web
  data using Bright Data's Discover API (intent-ranked web search + parsed page
  content). Use when the user wants "live research", to "research <topic> deeply",
  "research the latest on", "write a report on", "give me a briefing / literature
  review / market scan", "find and synthesize everything about", or otherwise
  wants a synthesized, source-grounded answer rather than a list of links. Decomposes the question into multiple intent-ranked Discover
  queries, pulls page content, deduplicates and ranks by relevance, then
  synthesizes a structured brief with inline citations. Built on the
  `brightdata-discover-api` skill. For competitor-specific intel use `brightdata-competitive-intel`;
  for social/brand sentiment use `brightdata-brand-listening`; for a retrieval *system* (not
  a one-off report) use `brightdata-rag-pipeline`.
metadata:
  author: Bright Data
  version: "1.0"
---

# Bright Data -- Live Research

Turn one research question into a cited, synthesized brief by fanning out
intent-ranked Discover queries, reading the best sources, and writing up findings
with inline citations. This is a *workflow* on top of the `brightdata-discover-api` skill
-- read that for the API mechanics, modes, and parameters.

Use this when the deliverable is *understanding* (a report/briefing), not a link
list (that's `brightdata-search`/`brightdata-discover-api`) and not a standing system (that's
`brightdata-rag-pipeline`).

## Setup gate

Discover must be reachable. Quick check (CLI path):
```bash
command -v bdata >/dev/null 2>&1 || echo "CLI missing -- see brightdata-best-practices/references/cli-setup.md"
bdata zones >/dev/null 2>&1 || echo "not authenticated -- run: bdata login"
```
(SDK/REST paths just need `BRIGHTDATA_API_TOKEN`.)

## The method

### Step 1 -- Scope the question (do this first, don't skip)
If the question is broad or ambiguous, ask 2-3 clarifying questions before
spending API calls: time horizon, geography/market, depth, and what decision the
research supports. A sharp scope is what makes the `intent` parameters good.

### Step 2 -- Decompose into sub-questions
Break the topic into 4-8 angles (definitions, key players, mechanisms, evidence,
counter-evidence, recent developments, risks). Each angle becomes one Discover
call with its own tailored `intent`. This beats one broad query -- `num_results`
is capped at 20, so coverage comes from *breadth of queries*, not one big call.

### Step 3 -- Run Discover per angle (in parallel), with content
```bash
# one call per angle; --include-content so you read sources in the same pass
bdata discover "stablecoin regulation 2026" \
  --intent "recent regulatory actions and proposed legislation, primary sources" \
  --include-content --num-results 15 -o angle_regulation.json &

bdata discover "stablecoin reserve transparency" \
  --intent "audits, attestations, reserve composition disclosures" \
  --include-content --num-results 15 -o angle_reserves.json &
wait
```
For *maximum* coverage on a hard topic, use the raw REST flow with `"mode":"deep"`
(see `brightdata-discover-api`) -- `deep` is exhaustive but slower and REST-only.

### Step 4 -- Merge, dedup, rank, quality-gate
- Each `bdata discover -o` file is an object `{status, results: [...]}` -- flatten `.results[]` from every file before merging.
- Dedup by URL (normalize: strip query/fragment, lowercase host).
- Sort by `relevance_score` desc.
- Quality-gate the content (a high `relevance_score` can still be a 404 stub or a nav-only page): drop rows where `content` is `null`, matches a block-page signature, is shorter than ~200 chars, or looks like "not found".
```bash
# VERIFIED: this is the correct merge. `jq -s 'add | unique_by(.link)'` does NOT work --
# each file is {results:[...]}, so you must flatten .results[] first.
jq -s '
  [ .[].results[] ]                                   # flatten results from all files
  | unique_by(.link)                                  # dedup by URL
  | map(select(
      .content != null
      and (.content | length) > 200                   # drop empty / 404 stubs
      and ((.content | test("just a moment|captcha|access denied|cf-browser|page not found|post not found"; "i")) | not)
    ))
  | sort_by(-.relevance_score)
' angle_*.json > corpus.json
echo "kept $(jq length corpus.json) sources"
```
Or just run the helper (same logic, tested): `scripts/merge_corpus.sh -o corpus.json angle_*.json`
(`-m <n>` sets the min content length). Copying the jq by hand is error-prone -- prefer the script.

> Note: with `--include-content`, the leading part of `content` is usually page
> nav/boilerplate (menus, logos). When extracting claims (Step 5), skip past the
> chrome to the article body.

### Step 5 -- Read & extract claims
From each kept source's `content`, pull the specific claims, numbers, dates, and
quotes that answer a sub-question. Track which URL each claim came from -- you'll
cite it.

### Step 6 -- Synthesize the brief
Write the structured brief (template in `references/brief-template.md`). Every
non-obvious claim gets an inline citation `[n]` mapping to a numbered source list.
Note disagreements between sources rather than averaging them away.

### Step 7 -- Verify before delivering
- Every claim traceable to a source in the list? (no orphan claims)
- Conflicting sources surfaced, not hidden?
- Gaps named explicitly ("no primary source found for X")?
- Recency stated -- when was this collected, how fresh are the sources?

## Quality bar

- Breadth via queries, depth via content. Many sharp `intent`s > one vague query.
- Cite everything. A research brief with uncited claims is an opinion. Map each `[n]` to a real URL from the corpus.
- Prefer primary sources. Rank filings/docs/announcements over aggregators when `relevance_score` is comparable.
- Surface dissent. If sources conflict, say so and attribute both sides.
- Name the gaps. "Couldn't find ..." is a finding, not a failure to hide.

## Red flags

- One broad Discover call and calling it "live research" -- decompose into angles.
- Writing claims from memory/training data instead of from retrieved `content` -- every claim must come from the corpus.
- Fabricating citations or `relevance_score`s -- if a call failed, report the gap.
- Ignoring `--include-content` and just listing links -- that's `brightdata-discover-api`, not research.
- Averaging away contradictions between sources.
- Forgetting to dedup -- the same article via 3 aggregators inflates apparent consensus.

## References

- [`references/brief-template.md`](references/brief-template.md) -- the output structure (exec summary, findings per sub-question, contradictions, gaps, numbered sources) and a worked citation example.
- [`scripts/merge_corpus.sh`](scripts/merge_corpus.sh) -- Step 4 as a tested one-liner: flatten `.results[]` across angle files, dedup by URL, quality-gate (null/short/404/block-page), sort by `relevance_score`.

## Related skills

- `brightdata-discover-api` -- the underlying API (modes, params, trigger/poll). Read first.
- `brightdata-rag-pipeline` -- when the user wants a reusable retrieval *system*, not a one-time report.
- `brightdata-competitive-intel` -- competitor-focused research (pricing, hiring, positioning).
- `brightdata-brand-listening` -- social/sentiment research across Reddit/X/TikTok/etc.
