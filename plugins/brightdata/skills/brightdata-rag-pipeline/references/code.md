# RAG pipeline -- code

Runnable patterns for both architectures. The Bright Data Discover calls are
exact (verified against `@brightdata/sdk` / the Python SDK). The embedder and
vector store are intentionally pluggable -- swap in your provider (OpenAI/Cohere/
local for embeddings; pgvector/Pinecone/Qdrant/Chroma for storage). Don't hardwire
one; the interface below is what the pipeline depends on.

```
EmbedFn:     (texts: string[]) => Promise<number[][]>      // batch embed
VectorStore: upsert(items: {id, vector, text, metadata}[]) // persist
             query(vector, k) => {text, metadata, score}[] // nearest neighbors
```

---

## Live retrieval (JS) -- web-grounded answer with citations

```javascript
import { bdclient } from '@brightdata/sdk';
const client = new bdclient(); // BRIGHTDATA_API_TOKEN

const BLOCK = /just a moment|captcha|access denied|cf-browser-verification/i;

// VERIFIED against @brightdata/sdk v1.1.0: discover() returns a WRAPPER object
//   { success, data: [ {link,title,description,relevance_score,content?} ], totalResults, cost, taskId, ... }
// Rows are in `.data` (NOT a bare array, and NOT `.results` -- CLI/REST use `.results`).
async function retrieve(question, k = 6) {
  const res = await client.discover(question, {
    intent: `authoritative, primary sources that directly answer: ${question}`,
    includeContent: true,
    numResults: Math.min(k * 2, 20),   // over-fetch then trim
  });
  if (!res.success) throw new Error(`discover failed: ${res.error ?? 'unknown'}`);
  return (res.data ?? [])
    // content-quality gate: a high relevance_score can still be a 404 stub or nav-only page
    .filter(r => r.content && !BLOCK.test(r.content) && r.content.length > 200)
    .sort((a, b) => b.relevance_score - a.relevance_score)
    .slice(0, k);
}

function buildPrompt(question, sources) {
  const ctx = sources
    .map((s, i) => `[${i + 1}] ${s.title} -- ${s.link}\n${s.content.slice(0, 4000)}`)
    .join('\n\n---\n\n');
  return [
    'Answer ONLY from the sources below. Cite with [n]. If the answer is not in',
    'the sources, say so -- do not use prior knowledge.',
    `\nQuestion: ${question}\n\nSources:\n${ctx}`,
  ].join('\n');
}

// usage
const sources = await retrieve('How does MiCA treat stablecoin reserves?');
const prompt = buildPrompt('How does MiCA treat stablecoin reserves?', sources);
// const answer = await yourLLM(prompt);   // model answers with [n] -> sources[n-1].link
await client.close();
```

---

## Ingestion (JS) -- discover -> dedup -> chunk -> embed -> upsert

```javascript
import { bdclient } from '@brightdata/sdk';
const client = new bdclient();
const BLOCK = /just a moment|captcha|access denied|cf-browser-verification/i;

const normUrl = u => { const x = new URL(u); return (x.host + x.pathname).toLowerCase().replace(/\/$/, ''); };

function chunk(text, size = 1200, overlap = 150) {
  const out = [];
  // split on blank lines first, then pack paragraphs up to ~size chars
  let buf = '';
  for (const para of text.split(/\n{2,}/)) {
    if ((buf + '\n\n' + para).length > size) {
      if (buf) out.push(buf);
      buf = buf.length > overlap ? buf.slice(-overlap) + '\n\n' + para : para;
    } else buf = buf ? buf + '\n\n' + para : para;
  }
  if (buf) out.push(buf);
  return out;
}

// topics: string[] of angle queries that define the knowledge base
async function ingest(topics, { embed, store }) {
  const seen = new Set();
  for (const topic of topics) {
    const res = await client.discover(topic, {
      intent: `comprehensive, authoritative pages about: ${topic}`,
      includeContent: true,
      numResults: 20,
    });
    if (!res.success) continue;            // skip a failed angle, keep ingesting the rest
    const pages = (res.data ?? []).filter(r =>   // rows in `.data`, not the bare return
      r.content && !BLOCK.test(r.content) && r.content.length > 200
      && !seen.has(normUrl(r.link)) && seen.add(normUrl(r.link)));

    for (const p of pages) {
      const chunks = chunk(p.content);
      const vectors = await embed(chunks);
      await store.upsert(chunks.map((text, i) => ({
        id: `${normUrl(p.link)}#${i}`,
        vector: vectors[i],
        text,
        metadata: { link: p.link, title: p.title, relevance_score: p.relevance_score, chunk: i },
      })));
    }
  }
  await client.close();
}

// serve
async function answerFromIndex(question, { embed, store }, k = 6) {
  const [qvec] = await embed([question]);
  const hits = await store.query(qvec, k);            // optionally rerank hits here
  return hits; // -> assemble a prompt like buildPrompt() above, then call your LLM
}
```

---

## A concrete `embed` + `store` (ONE swappable implementation)

The pipeline above only needs the `EmbedFn` + `VectorStore` interface. Here is one
working wiring -- OpenAI embeddings + Postgres/pgvector -- to make it runnable.
Swap either half freely (Cohere/Voyage/local for embeddings; Pinecone/Qdrant/Chroma
for storage); the `ingest`/`retrieve` code above doesn't change.

> Versions drift -- confirm the current `openai` and `pg` / pgvector APIs before
> shipping. This is illustrative glue, not a pinned contract.

```javascript
import OpenAI from 'openai';
import pg from 'pg';

// --- EmbedFn: (texts) => number[][] ---
const openai = new OpenAI();                  // OPENAI_API_KEY
const EMBED_MODEL = 'text-embedding-3-small'; // 1536 dims
const embed = async (texts) => {
  const { data } = await openai.embeddings.create({ model: EMBED_MODEL, input: texts });
  return data.map(d => d.embedding);          // order matches input order
};

// --- VectorStore over pgvector ---
// one-time: CREATE EXTENSION vector;
//   CREATE TABLE chunks (id text PRIMARY KEY, embedding vector(1536), text text, metadata jsonb);
//   CREATE INDEX ON chunks USING hnsw (embedding vector_cosine_ops);
const pool = new pg.Pool();                   // PG* env vars
const toVec = v => `[${v.join(',')}]`;        // pgvector literal
const store = {
  async upsert(items) {
    for (const it of items) {
      await pool.query(
        `INSERT INTO chunks (id, embedding, text, metadata) VALUES ($1,$2,$3,$4)
         ON CONFLICT (id) DO UPDATE SET embedding=$2, text=$3, metadata=$4`,
        [it.id, toVec(it.vector), it.text, it.metadata]);
    }
  },
  async query(vector, k) {
    const { rows } = await pool.query(
      `SELECT text, metadata, 1 - (embedding <=> $1) AS score
       FROM chunks ORDER BY embedding <=> $1 LIMIT $2`,
      [toVec(vector), k]);
    return rows;                              // [{ text, metadata:{link,title,...}, score }]
  },
};

// now: await ingest(topics, { embed, store });  /  await answerFromIndex(q, { embed, store });
```

The `metadata.link` carried through `upsert` is what lets the LLM cite sources --
keep it. Match the `vector(N)` dimension to your embedding model (1536 here).

---

## Ingestion (Python) -- same shape

```python
import os, re
from urllib.parse import urlparse
from brightdata import BrightDataClient  # see python-sdk-best-practices for client choice

BLOCK = re.compile(r"just a moment|captcha|access denied|cf-browser-verification", re.I)

def norm_url(u: str) -> str:
    p = urlparse(u)
    return (p.netloc + p.path).lower().rstrip("/")

def chunk(text: str, size: int = 1200, overlap: int = 150):
    out, buf = [], ""
    for para in re.split(r"\n{2,}", text):
        if len(buf) + len(para) + 2 > size:
            if buf:
                out.append(buf)
            buf = (buf[-overlap:] + "\n\n" + para) if len(buf) > overlap else para
        else:
            buf = (buf + "\n\n" + para) if buf else para
    if buf:
        out.append(buf)
    return out

async def ingest(topics, embed, store):
    seen = set()
    async with BrightDataClient() as client:
        for topic in topics:
            resp = await client.discover(
                query=topic,
                intent=f"comprehensive, authoritative pages about: {topic}",
                include_content=True,
                num_results=20,
            )
            # NOTE: the JS SDK wraps rows in `.data`. The Python SDK's exact return
            # shape was NOT verified here -- confirm in python-sdk-best-practices
            # whether discover() returns rows directly, under `.data`, or `.results`,
            # and adjust the line below. (REST/CLI use `.results`.)
            rows = getattr(resp, "data", None) or resp.get("data") or resp.get("results") or resp
            for r in rows:
                c = r.get("content")
                if c is not None and len(c) < 200:   # skip 404 stubs / nav-only pages
                    continue
                nu = norm_url(r["link"])
                if not c or BLOCK.search(c) or nu in seen:
                    continue
                seen.add(nu)
                chunks = chunk(c)
                vectors = await embed(chunks)              # your embedder
                store.upsert([
                    {"id": f"{nu}#{i}", "vector": vectors[i], "text": ch,
                     "metadata": {"link": r["link"], "title": r.get("title"),
                                  "relevance_score": r.get("relevance_score"), "chunk": i}}
                    for i, ch in enumerate(chunks)
                ])
```

> Python SDK method/option names (`client.discover`, sync vs async client, exact
> kwargs) -- confirm in the `brightdata-python-sdk-best-practices` skill. JS names are
> verified in `brightdata-js-sdk-best-practices`.

---

## Bulk corpus via REST `zeroRanking` (max volume)

For breadth-first ingestion, trigger with `"mode":"zeroRanking"` (raw volume, no
ranking). It ignores `num_results` and does not return content, so use it to
gather URLs, then fetch bodies separately (Discover `standard` with
`include_content`, or the `brightdata-scrape` skill).

```bash
task_id=$(curl -s -X POST https://api.brightdata.com/discover \
  -H "Authorization: Bearer $BRIGHTDATA_API_TOKEN" -H "Content-Type: application/json" \
  -d '{"query":"vector database benchmarks","intent":"engineering comparisons","mode":"zeroRanking"}' \
  | jq -r '.task_id')
# poll GET ?task_id=... until status:"done" (see discover-api), then take .results[].link
```

See the `brightdata-discover-api` skill for the full trigger/poll mechanics and the
per-surface parameter matrix.
