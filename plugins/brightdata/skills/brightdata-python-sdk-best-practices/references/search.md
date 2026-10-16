# Web Search (SERP) & Discover API

This file covers web-level search (SERP) and AI-powered discovery. For platform-specific search (Amazon products, LinkedIn profiles, YouTube videos, etc.), see `scrapers.md` -- search methods are listed under each platform.

---

## Web Search (SERP)

Search the web via major search engines. Returns structured results: links, titles, snippets, rankings.

### Google
`client.search.google(query, location=, language="en", device="desktop", num_results=10, zone=)` -> SearchResult

### Bing
`client.search.bing(query, location=, language="en", num_results=10, zone=)` -> SearchResult

### Yandex
`client.search.yandex(query, location=, language="ru", num_results=10, zone=)` -> SearchResult

### SearchResult fields
- `.data` -- list of result entries (title, URL, snippet, position)
- `.total_results` -- total number of results found
- `.query` -- the query that was executed

### When to use SERP
- User wants web search results (links, snippets, rankings)
- User asks "search Google for..." or "find pages about..."
- Cheapest search option after datasets

---

## Discover API (AI-Powered)

Find entities (companies, people, products, places) matching natural language intent. Unlike SERP which returns web pages, Discover returns structured entity data.

### Quick (blocking)
`client.discover(query, intent=, include_content=False, country=, city=, language=, filter_keywords=, num_results=, format="json", timeout=60, poll_interval=2)` -> DiscoverResult

### Trigger (non-blocking)
`client.discover_trigger(query, intent=, include_content=False, country=, city=, language=, filter_keywords=, num_results=, format="json")` -> DiscoverJob

### DiscoverJob methods
- `job.status()` -- check current status
- `job.wait(timeout=60, poll_interval=2)` -- block until complete
- `job.fetch()` -- get raw data
- `job.to_result()` -> DiscoverResult -- get structured result

### DiscoverResult fields
- `.data` -- list of discovered entities
- `.query` -- the query used
- `.intent` -- the intent used
- `.total_results` -- number of entities found
- `.duration_seconds` -- how long the search took
- `.task_id` -- unique task identifier

### Key parameters
- `query` -- what to search for (required)
- `intent` -- natural language description of what kind of results you want. CRITICAL: Discover requires an intent phrase, not just keywords. "Find technology companies founded after 2020" works. "tech companies" alone is too vague.
- `include_content` -- if True, fetches full page content for each result (slower, more expensive)
- `filter_keywords` -- additional keywords to filter results
- `num_results` -- limit number of results returned

### When to use Discover vs SERP
- Use SERP when you want web search results (pages, articles, links)
- Use Discover when you want to find entities matching criteria (companies in an industry, people with a role, products with features)
- Discover is more expensive than SERP but returns structured entity data
- Discover results often include URLs you can then scrape for deeper data
