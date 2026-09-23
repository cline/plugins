# Live research -- brief template & citation rules

Use this structure for the final deliverable. Scale section depth to the question;
keep every claim traceable.

## Template

```markdown
# Research Brief: <Question / Topic>
*Compiled: <YYYY-MM-DD>  - Sources analyzed: <N>  - Method: Bright Data Discover (intent-ranked)*

## Executive summary
3-6 sentences answering the question directly. Lead with the answer, then the
most important supporting facts. Every factual claim carries a citation [n].

## Key findings
### <Sub-question / angle 1>
- Finding with specifics (numbers, dates, names) [n]
- Finding [n][m]

### <Sub-question / angle 2>
- ...

## Contradictions & uncertainty
- Source [a] says X; source [b] says Y. <which is more credible and why>
- Open question: <what the evidence can't settle>

## Gaps
- No primary source found for <X> -- treat <related claim> as tentative.

## Sources
[1] <Title> -- <URL> -- relevance <score> -- <1-line why it matters>
[2] ...
```

## Citation rules

- Number sources once in the Sources list; reference them inline as `[n]`.
- A claim can cite multiple sources: `[2][5]`.
- Only cite URLs that are actually in your retrieved corpus (`results[].link`).
  Never invent a citation or cite from memory.
- Prefer the primary source over an aggregator reporting it, when both exist.
- Keep the `relevance_score` from Discover next to each source so the reader can
  weigh it -- but your own judgment on credibility overrides a raw score.

## Worked example (fragment)

```markdown
## Key findings
### Regulatory trajectory
- The EU's MiCA framework requires e-money token issuers to hold reserves 1:1 in
  segregated accounts, effective June 2024 [1].
- US federal stablecoin legislation remained in committee as of Q1 2026; no
  enacted federal reserve standard exists yet [3][4].

## Sources
[1] MiCA Regulation -- Title III -- https://eur-lex.europa.eu/... -- relevance 0.91 -- primary legal text
[3] Senate Banking Committee markup notice -- https://banking.senate.gov/... -- relevance 0.84 -- primary
[4] Reuters: "US stablecoin bill stalls" -- https://reuters.com/... -- relevance 0.79 -- secondary, corroborates [3]
```

Note how [4] (secondary) is used to corroborate [3] (primary), and the
contradiction/uncertainty is captured rather than smoothed over.
