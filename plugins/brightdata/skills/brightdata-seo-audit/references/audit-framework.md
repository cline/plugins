# Audit Framework -- SEO Audit

The auditor's brain. Five-tier priority order, every check, when to short-circuit. Recipes (concrete `bdata` commands) live in `bdata-recipes.md`. Site-type extras live in `site-type-playbooks.md`. Report shape lives in `output-templates.md`.

## Priority Order (Short-Circuiting)

The audit walks tiers top-to-bottom; lower-tier findings are partial signal until higher-tier blockers are fixed.

1. Crawlability & Indexation -- can Google find and index the site at all?
2. Technical Foundations -- is the site fast, secure, mobile-friendly?
3. On-Page Optimization -- titles, meta, headings, internal links.
4. Content Quality -- does each page deserve to rank?
5. Authority & Links -- out of scope for direct measurement; HTML red flags only.

When a Tier-1 critical issue is found (e.g., `Disallow: /` in robots.txt), the rule is: report it as the top priority, explicitly tell the user that lower-tier findings may be misleading until the Tier-1 issue is fixed, but still run lower tiers and report what you find -- caveat each downstream section so the user has a full picture without taking the findings as definitive. Lower-tier findings still require an Evidence block per the Hard Rule below; if a check cannot run because the Tier-1 blockage prevents fetching the page, omit it from the report rather than fabricate a finding.

## Tier 1 -- Crawlability & Indexation (always run)

- robots.txt -- fetch with R-01. Parse for `Disallow:` directives that match indexable paths (defined as: any path appearing in the sitemap, or the homepage, or any path matching common SEO-important patterns -- `/products/`, `/category/`, `/categories/`, `/blog/`, `/posts/`, `/articles/`, `/locations/`, `/services/`, `/about`, `/`). Standard utility paths (`/wp-admin`, `/cgi-bin`, `/api`, `/admin`, `/cart`, `/checkout`, `/account`) being disallowed is normal and should not be flagged. Also confirm a `Sitemap:` line is present.
- sitemap.xml -- fetch with R-02. Direct check: exists, parseable, contains canonical and indexable URLs, uses `<xhtml:link>` if multilingual.
- Indexation proxy -- R-12: `bdata search "site:<domain>" --json`. Approximate indexed-URL count from the SERP sample. Flag as critical when the indexed sample is below 30% of the sitemap URL count for sitemaps under 100 URLs, or when the absolute gap exceeds 100 URLs for larger sitemaps (e.g., 12 indexed vs. 847 in sitemap is critical; 6 indexed vs. 10 is not because `site:` returns a sample, not exact counts). Always note in the finding that `site:` is a sample, not a precise index count, and direct the user to Google Search Console's Coverage report for authoritative numbers (Out-of-Scope Notes).
- Per-page robots and canonical -- from rendered HTML: `<meta name="robots">`, `<link rel="canonical">`, self-referencing canonical. Flag `noindex` on indexable pages (using the same definition as the robots.txt rule above: pages that appear in the sitemap, the homepage, or pages matching common SEO-important path patterns). `noindex` on utility pages like `/cart` or `/account` is normal and should not be flagged.
- Hreflang (multilingual sites only) -- R-08: parsed from rendered HTML head and sitemap. Self-referencing entry, reciprocal links, valid ISO codes, `x-default` present.

## Tier 2 -- Technical Foundations

- HTTPS -- final URL after redirects. If `bdata scrape http://<domain>` lands on `https://`, we're fine.
- Mobile-friendliness -- viewport meta tag present, no fixed-width inline styles, responsive image markup (`srcset`, `<picture>`).
- Core Web Vitals proxies (HTML-level only -- explicit "confirm with PageSpeed Insights" caveat in every CWV finding):
  - Page weight from total HTML bytes.
  - Render-blocking -- count of synchronous `<script>` (no `async`/`defer`) and non-deferred `<link rel="stylesheet">` in `<head>`.
  - CLS risk -- `<img>` tags missing explicit `width`/`height`.
  - Resource hints -- `preconnect` / `preload` / `dns-prefetch` for critical origins.
  - Lazy loading -- `loading="lazy"` on below-fold images.
- URL structure -- readable, no parameters, hyphenated, lowercase, consistent trailing slash.

## Tier 3 -- On-Page Optimization (per sampled page)

- Title tag -- present, unique across sample, 50-60 chars, primary topic word in first half.
- Meta description -- present, unique, 150-160 chars.
- Heading structure -- exactly one H1, H1 contains primary topic, no skipped levels.
- Schema markup -- R-07: `bdata scrape -f html` (CLI renders JS, so this is a direct check). Extract `script[type="application/ld+json"]` blocks and parse with `jq` for `@type` + basic shape validity. Never claim "no schema found" without running R-07 -- the inspiration skill got bitten by `web_fetch` falsely reporting no schema.
- Image alt text -- count of `<img>` without `alt`; ratio across page.
- Internal linking -- R-10: internal-link count per page, descriptive anchor text vs. generic ("click here", "read more"), orphan-page detection across the sample.

## Tier 4 -- Content Quality

- Word count + paragraph count + heading-to-content ratio.
- E-E-A-T signals from HTML: author byline present, date published/updated visible, links to authoritative sources, contact/about reachable.
- Keyword cannibalization -- only when SERP is triggered by a signal (user named a target keyword, asked "why am I not ranking", or asked about specific page performance). R-14: `bdata search "<keyword> site:<domain>" --json` and flag if multiple URLs from the domain rank.
- AI-writing red flags -- em-dash overuse, hedge phrases ("delve", "in the realm of"). Soft signal only -- never a hard finding.

## Tier 5 -- Authority & Links

Out of scope for direct measurement. The report's `Out-of-Scope Notes` directs the user to Ahrefs / Semrush for backlink data. Flag only what HTML reveals -- testimonials, customer logos, case studies -- as "trust signals" in Tier 4.

## SERP Trigger Rules (mode-independent)

`bdata search` runs only when there is a clear signal -- regardless of whether the audit is Mode A or Mode B:

- User mentions a target keyword.
- User asks "why am I not ranking for X" / "traffic dropped" / similar diagnostic prompts.
- User asks about a specific page's performance.

Generic "audit my site" prompts do not trigger SERP queries.

The one exception that always fires: R-12 (`bdata search "site:<domain>"`) for indexation proxy in Tier 1. This is one SERP call total per audit and is too cheap to skip.

## The Hard Rule

Any check we cannot perform via `bdata` produces a clearly-labeled "out-of-scope, use [tool]" entry in `Out-of-Scope Notes` rather than a fabricated finding. Never claim a finding without an Evidence block citing a runnable command.
