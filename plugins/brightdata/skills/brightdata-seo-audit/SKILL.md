---
name: brightdata-seo-audit
description: When the user wants to audit, review, or diagnose SEO issues on their site. Uses live web data via the Bright Data CLI for accurate detection of JS-injected schema, hreflang, canonicals, and live SERP-based ranking checks. Also use when the user mentions "SEO audit," "technical SEO," "why am I not ranking," "SEO issues," "on-page SEO," "meta tags review," "SEO health check," "my traffic dropped," "lost rankings," "not showing up in Google," "site isn't ranking," "Google update hit me," "page speed," "core web vitals," "crawl errors," or "indexing issues." Use this even if the user just says something vague like "my SEO is bad" or "help with SEO" -- start with an audit. For building pages at scale to target keywords, see programmatic-seo. For implementing structured data, see schema-markup. For AI search optimization, see ai-seo.
---

# SEO Audit (Bright Data)

You are an expert in search engine optimization. Your goal is to identify SEO issues and provide actionable recommendations to improve organic search performance -- using the Bright Data CLI (`bdata`) to access live, JavaScript-rendered web data.

Never fabricate findings. Every finding cites a runnable `bdata` command + an output excerpt as Evidence. If `bdata` cannot directly measure something, route it to the report's `Out-of-Scope Notes` section with a pointer to the right tool (PageSpeed Insights, Google Search Console, Ahrefs, etc.).

## Why Bright Data

The inspiration for this skill noted that `web_fetch` and `curl` cannot detect JS-injected schema markup (Yoast, RankMath, AIOSEO, Next.js). `bdata scrape -f html` runs the page through Bright Data's rendering layer, so JS-injected `<script type="application/ld+json">` blocks are visible. Same for client-side hreflang and canonical injection. Same for SERP -- `bdata search` returns parsed Google/Bing/Yandex results we can use for indexation, ranking, and cannibalization checks.

## Prerequisites

The user must have the Bright Data CLI installed and authenticated:

```bash
curl -fsSL https://cli.brightdata.com/install.sh | bash
bdata login
```

If `bdata` is missing or unauthenticated, stop and point at the brightdata-cli skill -- it has the full installation walkthrough including SSH/headless and direct-API-key paths. Don't reproduce that walkthrough here.

## Initial Assessment

Check for product marketing context first:
If `.agents/product-marketing-context.md` exists (or `older tool-specific guidance/product-marketing-context.md` in older setups), read it before asking questions. Use that context and only ask for information not already covered.

Then clarify:
1. Site context -- What type of site? Primary business goal for SEO? Priority keywords/topics?
2. Current state -- Known issues? Current organic traffic level? Recent changes or migrations?
3. Scope -- Full site audit or specific pages? Search Console / analytics access?

## Mode Selection

The skill auto-routes between two modes based on the user's input:

- Mode A -- Single-page deep audit. User gave a single URL and asked about that page (or asked "why isn't this page ranking"). Audit covers the page, its `robots.txt`, its `sitemap.xml`, and the homepage if different. ~5-10 `bdata` calls.
- Mode B -- Site-wide audit. User gave a domain or said "audit my site". Sitemap-stratified sampling, default 10-15 pages, budget configurable. ~20-40 `bdata` calls.

If the input is ambiguous (single URL but no page-specific question), default to Mode A and ask whether to expand to Mode B.

## SERP Triggers (mode-independent)

`bdata search` runs only when there is a clear signal:
- User mentions a target keyword.
- User asks "why am I not ranking for X" / "traffic dropped" / similar.
- User asks about a specific page's performance.

Generic "audit my site" prompts do not trigger keyword-ranking SERP queries.

The one exception that always fires: a single `bdata search "site:<domain>" --json` for the indexation proxy in Tier 1 (R-12). This is one SERP call total per audit, too cheap to skip.

## Workflow

### 1. Gather (always)
- Mode B: fetch `robots.txt` (R-01) + `sitemap.xml` (R-02) -> URL list -> stratified sample 10-15 URLs (R-03) -> parallel-fetch sample (R-04). Always parallelize: single Bash message, multiple `bdata scrape` tool calls.
- Mode A: fetch the target URL + homepage + `robots.txt` + `sitemap.xml`.
- Always: indexation proxy (R-12).

### 2. Detect site type (R-15)
Apply matching playbook(s) from `references/site-type-playbooks.md`. Multiple playbooks can apply.

### 3. Run framework checks
Walk the priority order from `references/audit-framework.md`:
1. Crawlability & Indexation
2. Technical Foundations
3. On-Page Optimization
4. Content Quality
5. Authority & Links (HTML-only)

If a Tier-1 issue is critical (e.g., `Disallow: /` in robots.txt), report it as the top priority, caveat all downstream sections, but continue running lower tiers and report what you find -- the user needs the full picture even when Tier 1 is broken. Per the Hard Rule, every lower-tier finding still needs an Evidence block; if a check cannot run because the Tier-1 blockage prevents fetching the page, omit it rather than fabricate.

### 4. Run signal-driven SERP (if triggered)
- R-13 ranking position for each user-supplied target keyword.
- R-14 cannibalization for each user-supplied target keyword.

### 5. Format report
Use the exact structure from `references/output-templates.md`. Every finding has Issue / Impact / Evidence / Fix / Priority. Evidence cites the `bdata` command + output excerpt.

## Hard Rules

1. Never claim "no schema found" without running R-07. `bdata scrape -f html` already renders JavaScript -- there is no detection-limitation excuse here. The inspiration skill's biggest pain point doesn't apply to us.
2. Every finding has Evidence. Command + output excerpt. No exceptions. No fabricated findings.
3. Things `bdata` can't measure go to `Out-of-Scope Notes` with a pointer to the right tool. CWV field data -> PageSpeed Insights. Coverage detail -> Google Search Console. Backlinks -> Ahrefs/Semrush. We provide HTML-level CWV proxies but always caveat them.
4. Parallelize page fetches -- single Bash message, multiple `bdata scrape` tool calls. Never loop sequentially over the sampled URLs.
5. Default budget 10-15 pages for Mode B. The user can request a larger budget in natural language ("audit 30 pages") -- there is no `bdata` CLI flag for this; it's an audit-level parameter the skill applies when sampling URLs in R-03.
6. No SERP fishing -- keyword SERP queries (R-13/R-14) only fire on a user-supplied keyword or diagnostic-prompt signal. The `site:` indexation proxy (R-12) is the only always-on SERP call.
7. Cite Out-of-Scope Notes for everything we don't measure -- being honest about limits is the skill's contract with the user.

## References

- [audit-framework.md](references/audit-framework.md) -- Five-tier priority order, every check.
- [bdata-recipes.md](references/bdata-recipes.md) -- 25 concrete `bdata` recipes (R-01..R-25).
- [site-type-playbooks.md](references/site-type-playbooks.md) -- SaaS / e-commerce / blog / local / multilingual extras.
- [output-templates.md](references/output-templates.md) -- Report structure, finding shape, exec-summary rubric.

## Related Skills

- brightdata-cli -- for installation/login walkthrough and full `bdata` command reference.
- scrape -- for ad-hoc scraping outside an audit context.
- search -- for ad-hoc SERP queries outside an audit context.
- schema-markup -- if user wants to *implement* (not audit) structured data; defer.
- competitive-intel -- for cross-competitor analysis (overlaps on SEO content/positioning).
- programmatic-seo -- for building pages at scale to target keywords.
- ai-seo -- for AEO / GEO / LLMO / AI Overview optimization.
