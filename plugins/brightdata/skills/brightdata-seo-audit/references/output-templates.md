# Output Templates -- SEO Audit

This file defines the exact report structure every SEO audit must produce. The audit-framework.md and site-type-playbooks.md generate findings; this file specifies how to present them.

## Top-Level Report Structure

```markdown
# SEO Audit -- <domain or URL>

## Executive Summary
- Overall health: <Critical | Poor | Fair | Good | Excellent>
- Top priorities:
  1. <Highest-impact issue, one sentence>
  2. <...>
  3. <...>
- Quick wins: <2-4 easy/immediate fixes>
- Audit scope: <N pages sampled from sitemap of M URLs | single-page audit of <url>>

## Technical SEO Findings
<one finding block per issue, ordered by Priority (1 first); if no findings, write "No issues found in this area.">

## On-Page SEO Findings
<one finding block per issue, ordered by Priority (1 first); if no findings, write "No issues found in this area.">

## Content Findings
<one finding block per issue, ordered by Priority (1 first); if no findings, write "No issues found in this area.">

## Out-of-Scope Notes
<things to check elsewhere -- PSI, GSC, Ahrefs>

## Prioritized Action Plan
1. Critical (blocking indexation/ranking): ...
2. High-impact improvements: ...
3. Quick wins (easy, immediate benefit): ...
4. Long-term recommendations: ...
```

## Finding Block Shape

Every finding under `Technical SEO Findings`, `On-Page SEO Findings`, and `Content Findings` uses this exact shape:

````markdown
### <Short issue title>
- Issue: <What's wrong, 1-2 sentences>
- Impact: <High | Medium | Low> -- <one sentence on why this matters for SEO>
- Evidence:
  - Command: `bdata scrape https://example.com -f html`
  - Output excerpt:
    ```
    <meta name="robots" content="noindex">
    ```
  - (or, for a SERP-based finding) Command: `bdata search "site:example.com" --json | jq '.organic | length'` -> 12 (sitemap has 847 URLs)
  - (or, for a cannibalization finding) Command: `bdata search "<keyword> site:example.com" --json | jq -r '.organic[].link'` -> returned 3 URLs
- Fix: <Specific, actionable recommendation>
- Priority: <1 (critical) | 2 | 3 | 4 | 5 (nice-to-have)>
````

`Impact` and `Priority` are orthogonal: Impact rates the SEO ranking effect (High/Medium/Low); Priority weights urgency factoring in fix effort. A finding can be Impact=High, Priority=2 (severe ranking effect, but moderate effort to fix) or Impact=Medium, Priority=1 (only moderate ranking effect, but trivially fixable and blocking other work).

This shape matches the inspiration skill's report contract verbatim -- every finding is Issue / Impact / Evidence / Fix / Priority -- so existing SEO-audit evals port without rewriting. The Evidence field is the one place we improve: every finding cites the exact `bdata` command that produced the evidence and an output excerpt the user can verify by re-running the command, which is uniquely possible because of the CLI's deterministic, scriptable output.

## Out-of-Scope Notes Section

Anything `bdata` cannot directly measure goes here, with explicit pointers:

- "Core Web Vitals field data -> run PageSpeed Insights at https://pagespeed.web.dev/?url=<url>"
- "Index coverage detail -> check Google Search Console > Pages report"
- "Backlink profile -> use Ahrefs / Semrush / Moz"
- "JS-injected schema validation -> already detected via `bdata scrape -f html`; cross-validate with Rich Results Test (https://search.google.com/test/rich-results)"

## Executive Summary Rubric

- Top priorities: 3-5 items, one sentence each, ordered by impact x ease-of-fix.
- Quick wins: findings rated Priority >= 3 (Medium severity or lower, since lower-severity items take less effort to ship) AND classified as Low effort.
- Overall health:
  - Critical -- site uncrawlable or unindexed (Tier-1 failure).
  - Poor -- multiple Tier-1 or Tier-2 issues.
  - Fair -- Tier-3 issues dominate.
  - Good -- only Tier-4 / quick-win issues remain.
  - Excellent -- nothing material found.

## Mode-A vs. Mode-B Rendering

- Mode A (single-page audit): same template, "Audit scope" line says "single-page audit of <url>"; Findings sections are typically shorter; site-type playbook may not apply.
- Mode B (site-wide audit): full template; Findings include site-wide issues -- cannibalization, duplicate titles across sample, hreflang clusters, internal-link orphans.

## Priority Numbering

| Priority | Meaning |
|---|---|
| 1 | Critical -- blocks indexation or ranking. Fix immediately. |
| 2 | High -- significant ranking impact within weeks. |
| 3 | Medium -- meaningful improvement; schedule. |
| 4 | Low -- minor polish. |
| 5 | Nice-to-have -- may improve over time. |

### Mapping Priority levels to Action Plan buckets

When generating the Prioritized Action Plan section, group findings by Priority:

| Priority | Action Plan bucket |
|---|---|
| 1 | Critical (blocking indexation/ranking) |
| 2 | High-impact improvements |
| 3 | Quick wins (when also Low effort) -- otherwise High-impact improvements |
| 4 | Long-term recommendations |
| 5 | Long-term recommendations |
