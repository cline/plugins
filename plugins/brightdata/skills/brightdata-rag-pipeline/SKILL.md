---
name: brightdata-rag-pipeline
description: |
  Build a RAG (retrieval-augmented generation) pipeline or a custom search engine
  on top of Bright Data's Discover API -- using intent-ranked web results + parsed
  page content as the retrieval/ingestion layer for an LLM or vector store. Use
  when the user wants to "build a RAG pipeline", "add web search to my LLM/agent",
  "ground my model in live web data", "build a search engine over the web",
  "ingest web content into a vector DB / knowledge base", or "give my chatbot
  retrieval". Covers both live retrieval (Discover at query time as a web-grounded
  retriever) and ingestion (Discover -> chunk -> embed -> vector store -> retrieve).
  Built on the `brightdata-discover-api` skill. For a one-off written report use
  `brightdata-live-research`; for raw markdown of specific known URLs use `brightdata-scrape`.
metadata:
  author: Bright Data
  version: "1.0"
---

# Bright Data -- RAG / Search-Engine Pipeline

Use Discover as the retrieval layer for an LLM app or a custom search engine.
Discover already returns *intent-ranked, relevance-scored* results with parsed
page `content`, so it does the "search + fetch + clean" stage of RAG for you. This
is a *code/architecture* skill built on the `brightdata-discover-api` skill -- read that
for API mechanics (trigger/poll, modes, params, limits).

Pick the right neighbor: a written brief -> `brightdata-live-research`; markdown of specific
URLs you already have -> `brightdata-scrape`; structured platform records -> `brightdata-data-feeds`.

## Two architectures -- choose first

```
Does the corpus change every query, or is it a stable knowledge base?

  +++++-++- Per-query, always-fresh ("ground each answer in live web data")
  ++|     -> LIVE RETRIEVAL: Discover(include_content) at query time -> top-k -> LLM
  ++|       Pros: always current, no storage. Cons: per-query latency + cost.
  ++|
  +++++-++- Reused across many queries ("build a knowledge base / search engine")
        -> INGESTION: Discover(include_content) -> chunk -> embed -> vector store
          then at query time: embed query -> vector search -> (rerank) -> LLM
          Pros: fast queries, cacheable. Cons: can go stale (re-ingest on a schedule).
```

Many systems do both: an ingested base for breadth + a live Discover call for
freshness, merged before the LLM.

## Live retrieval (web-grounded answers)

Pattern: on each user question, run Discover with a sharp `intent`, take the
top-k by `relevance_score`, and pass their `content` as context to the LLM. The
LLM cites the `link`s.

```javascript
import { bdclient } from '@brightdata/sdk';
const client = new bdclient(); // BRIGHTDATA_API_TOKEN

async function retrieve(question, k = 6) {
  const res = await client.discover(question, {
    intent: `authoritative sources that directly answer: ${question}`,
    includeContent: true,
    numResults: Math.min(k * 2, 20),  // over-fetch, then trim
  });
  // NOTE: the JS SDK returns a WRAPPER object, not a bare array:
  //   { success, data: [ {link,title,description,relevance_score,content?} ], totalResults, cost, taskId, ... }
  // The result rows are in `.data` (CLI/REST use `.results` instead -- see discover-api).
  if (!res.success) throw new Error(`discover failed: ${res.error ?? 'unknown'}`);
  return (res.data ?? [])
    .filter(r => r.content && !/just a moment|captcha|access denied|not found/i.test(r.content) && r.content.length > 200)
    .sort((a, b) => b.relevance_score - a.relevance_score)
    .slice(0, k);
}
// -> build a prompt from sources[].content, ask the LLM to answer WITH [n] citations to sources[].link
```

Full prompt-assembly + citation pattern: [`references/code.md`](references/code.md).

## Ingestion (build a vector knowledge base / search engine)

Pattern: discover broadly (high volume -- `zeroRanking` via REST is ideal here),
chunk each page's `content`, embed the chunks, upsert into a vector store with the
source URL as metadata. At query time: embed the query, vector-search, optionally
rerank, then feed to the LLM.

Stages: discover -> dedup -> chunk -> embed -> upsert (ingest), then
embed query -> search -> rerank -> generate (serve). Provider-agnostic code for
both stages, including chunking and metadata, is in
[`references/code.md`](references/code.md).

For bulk corpus building, prefer the raw REST `"mode":"zeroRanking"` flow (max raw
results, no ranking) from the `brightdata-discover-api` skill -- but note it ignores
`num_results` and does not support `include_content`, so you fetch content
separately (Discover `standard`/`deep` with content, or the `brightdata-scrape` skill).

## Design rules

- Store provenance. Every chunk keeps its source `link` (and ideally title +
  `relevance_score`). RAG without citations is unverifiable.
- Chunk for the model, not the page. ~500-1500 tokens with overlap; split on
  headings/paragraphs, not mid-sentence.
- Validate `content` before embedding. Skip block pages and empty bodies
  (oversized PDFs return null content). Embedding garbage poisons retrieval.
- Over-fetch then trim by `relevance_score`. Discover's score is a strong prior
  for top-k selection before (or instead of) a reranker.
- Re-ingest on a schedule if freshness matters -- web content drifts. The
  ingested base goes stale; live retrieval doesn't.
- Cap and dedup. `num_results` <= 20 per call; dedup by normalized URL across
  calls so one article via three aggregators isn't triple-weighted.
- Keep the embedder/vector store pluggable. Discover is the retrieval source;
  the embedding model and vector DB are your choice -- don't hardwire one.

## Verification gate

1. Retrieval returns non-empty, on-topic chunks for a known test query (eyeball top-k links).
2. No block-page / empty `content` made it into the index -- spot-check stored chunks.
3. Citations resolve -- every `[n]` the LLM emits maps to a real source `link` in the retrieved set.
4. Freshness is honored -- if the app promises current data, confirm live retrieval (or a recent re-ingest), not a stale index.
5. Grounding check -- answers are supported by retrieved content, not the model's prior; test with a question whose answer only exists in a retrieved page.

## Red flags

- Building an ingestion pipeline when the user needs *fresh* answers (use live retrieval), or hammering Discover live when a cached index would do.
- Embedding `content` without filtering block pages / nulls.
- Dropping source URLs -- you can't cite or refresh what you didn't store.
- Treating `num_results` as unlimited (cap 20) or expecting `include_content` under `zeroRanking`.
- Letting the LLM answer from training data -- enforce "answer only from provided sources; if absent, say so."
- One giant chunk per page (kills retrieval precision) or mid-sentence splits.

## References

- [`references/code.md`](references/code.md) -- runnable JS + Python for both architectures: live retrieval with prompt+citation assembly, and the full ingestion pipeline (discover -> dedup -> chunk -> embed -> upsert -> query), with a provider-agnostic embedder/vector-store interface.

## Related skills

- `brightdata-discover-api` -- the retrieval API (trigger/poll, modes, `include_content`, limits). Read first.
- `brightdata-live-research` -- one-off synthesized report instead of a standing system.
- `brightdata-scrape` -- fetch markdown for specific URLs you already have.
- `brightdata-js-sdk-best-practices` / `brightdata-python-sdk-best-practices` -- `client.discover()` option details and batch patterns.
