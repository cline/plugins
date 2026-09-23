# Site-Type Playbooks -- SEO Audit

Universal checks live in `audit-framework.md`. This file documents the *extra* checks per site type. Detection runs first via R-15.

A site can match multiple types (e.g., multilingual e-commerce -> run both playbooks).

## Site-Type Detection Summary (from R-15)

| Type | Detection cue from `bdata scrape <homepage> -f html` |
|---|---|
| SaaS / Product | `/pricing` URL exists; "free trial" / "sign up" CTAs in nav; description mentions software/platform/tool; JSON-LD `@type: SoftwareApplication` |
| E-commerce | `/products/`, `/shop/`, `/cart/` paths in sitemap; `Schema.org Product` JSON-LD; "Add to cart"; `?color=`, `?size=` parameters |
| Content / Blog | `/blog/`, `/articles/`, `/posts/` dominate sitemap; `<meta name="generator" content="WordPress">`; `<article>` with bylines |
| Local Business | NAP in homepage footer; `Schema.org LocalBusiness` JSON-LD; Google Maps embed; `/locations/<city>` |
| Multilingual | 2+ `<link rel="alternate" hreflang>`; locale prefixes (`/en/`, `/de/`); non-default `<html lang>` |

## SaaS / Product Playbook

Sampling: stratified pick must include `/pricing` (if present) and 1-2 feature pages.

Extra checks:
- Product page content depth -- at least 500 words on the main product page (R-24).
- Feature pages aren't thin -- flag any below 300 words.
- Comparison/alternative pages exist -- search sitemap for `/vs/` or `/alternatives/` paths.
- Glossary/educational content present.
- Blog interlinked with product pages -- check via R-10 internal-link map.

Common-issue templates:
- "Feature page `<url>` is thin (<300 words) -- see R-24."
- "No `/vs/<competitor>` or `/alternatives` pages found -- common SaaS SEO gap."
- "Blog posts and product pages not interlinked -- content marketing isn't supporting product pages."

## E-commerce Playbook

Sampling: stratified pick must include at least one category page and one product page. If sitemap is a sitemap-index, recurse via R-02.

Extra checks:
- Faceted-navigation parameters in URLs -- R-16. Warn if many `?` URLs in sitemap (crawl-budget risk).
- Product schema present -- R-07. Now directly detectable since we render JS.
- Thin category pages -- R-24. Category page <100 words is a flag.
- Duplicate product descriptions across sample -- pull description from each sampled product page (R-05) and diff.
- Out-of-stock handling -- R-17.

Common-issue templates:
- "Faceted nav creating <N> indexable parameter URLs -- robots.txt or `noindex` candidates."
- "Category page `<url>` has only <N> words -- needs intro/buyer-guide content."
- "Product pages share identical description (3 of 3 sampled)."
- "Out-of-stock product `/products/<x>` returns 200 with no canonical to category."

## Content / Blog Playbook

Sampling: stratified pick must include at least 3 blog posts.

Extra checks:
- Outdated content -- R-19. Flag posts >18 months old without update markers.
- Keyword cannibalization -- R-14, only if user provided a target keyword.
- Topical clustering -- internal links between related posts (R-10).
- Author pages reachable -- R-18.
- Author byline present per post -- R-23.
- Post-to-product internal linking for content-marketing sites.

Common-issue templates:
- "<N> posts last updated >2 years ago -- refresh candidates."
- "Posts `/blog/a` and `/blog/b` both rank for keyword 'X' -- cannibalization."
- "Author 'jane' bylined on <N> posts but `/author/jane` returns 404."
- "Post `<url>` has no detectable author byline -- E-E-A-T signal missing."

## Local Business Playbook

Sampling: stratified pick must include each `/locations/*` page found in sitemap.

Extra checks:
- NAP consistency across all sampled pages -- R-20. Compare normalized phone/address/business-name. Flag any mismatch.
- `LocalBusiness` schema on homepage -- R-07. Now directly detectable.
- Location pages exist for each location mentioned -- search sitemap for `/locations/` paths.
- Local SERP visibility -- R-21 per location.

Common-issue templates:
- "Phone on `/about` (555-1234) differs from footer (555-1235) -- NAP inconsistency."
- "No `LocalBusiness` schema on homepage."
- "Locations page lists 3 locations but only 2 have dedicated pages (`/locations/austin`, `/locations/dallas`)."
- "Search for 'plumber Austin' returns no result for example.com in top 100."

## Multilingual Playbook

Sampling: stratified pick must include each locale's homepage; ALSO sample at least one non-homepage page per locale where the budget allows.

Extra checks (folds in inspiration's international-seo.md):
- Hreflang self-reference -- R-08. Each page must include itself in the cluster.
- Hreflang reciprocity -- if A points to B, B must point back to A.
- Valid ISO codes -- `en-UK` is invalid (use `en-GB`).
- `x-default` declared somewhere in cluster.
- All hreflang targets return 200 -- sample-check via `bdata scrape`.
- Canonical URL appears in hreflang set -- otherwise the cluster is silently dropped.
- No cross-locale canonical (e.g., `/fr/x` canonicaling to `/en/x` suppresses French version).
- Locale prefix consistency -- `/en/`, `/de/`, etc., consistent across canonical, hreflang, sitemap.

Common-issue templates:
- "Hreflang missing self-reference on `/en/about` -- entire cluster ignored by Google."
- "Page `/fr/contact` canonicals to `/en/contact` -- suppresses French version."
- "Invalid hreflang code `en-UK` on `/en-gb/*` -- use `en-GB`."
- "x-default not declared anywhere in the hreflang cluster."

## Default Playbook (unknown site type)

If R-15 detection is ambiguous or returns no match:
- Run only the universal checks from `audit-framework.md` (Tiers 1-4 baseline).
- Don't fabricate type-specific findings.
- Note the ambiguity in the audit's Executive Summary so the user knows the playbook decision.

## Detection-Time Guardrail

If site-type detection is ambiguous (e.g., a CMS that also sells products), explicitly state both playbooks were applied and let the report show findings from both. Never silently pick one. The Executive Summary's "Audit scope" line should mention which playbooks ran.
