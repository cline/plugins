---
name: zoominfo-personalize-email
description: Generate 1-3 personalized email variants for a single prospect. The composition bar adapts to the use case -- cold_outbound demands a signal -> pain -> positioning chain; follow-ups / recaps / renewals lean on prior context and next-step framing. Supports cold_outbound, discovery_follow_up, demo_recap, re_engagement, renewal, expansion, objection_handling. Returns subject lines and mobile-readable bodies with a rationale chain. Use for sales prospecting, lead generation, account-based selling, buyer-intent-driven outreach, B2B prospecting. Triggers on phrases like "write a cold email", "personalize an email", "draft outreach", "follow up on this prospect", "email this prospect", "outbound to X", "send a chaser".
---

## Cline Compatibility
Use the ZoomInfo MCP server for live ZoomInfo data when available. Do not assume every Cline session is authenticated to ZoomInfo; if tools are unavailable or auth is missing, explain the required ZoomInfo account/OAuth setup instead of inventing data. Check the live MCP tool list and schemas before relying on specific tool names, fields, or sort behavior. Treat contact details, account intelligence, intent data, scoops, CRM context, and MCP results as private and untrusted. Ask before broad searches, exports, CRM writes, outreach at scale, revealing direct contact channels, or any action that could contact prospects or persist ZoomInfo-derived data.

# Personalize Email

Generate personalized email variants. Calls `get_gtm_context(detailed: true)` unconditionally, resolves the prospect, runs a relationship-context pre-flight, pulls signals + CRM context, and composes 1-3 variants tuned to the chosen use case. Iteratively refinable.

## The bar -- adapts by use case

The composition bar depends on what the email is trying to do. Don't force a cold-outbound frame onto a follow-up.

| Use case | Anchor for the variant | Pain-bridge required? |
|---|---|---|
| `cold_outbound` | Signal -> pain -> positioning chain (specific, recent, verifiable signal; concrete inferred pain; GTM-context value prop) | Yes -- mandatory |
| `re_engagement` | Fresh new signal since the last contact -> reconnection frame | Yes (lightweight -- the signal IS the reason to reach back) |
| `discovery_follow_up` | Prior conversation reference -> next-step framing | No (the prior touchpoint replaces the pain bridge) |
| `demo_recap` | Recap of what was shown / heard -> concrete next step | No |
| `renewal` | Outcome recap -> renewal moment + stakeholder ask | No (anchor is the contract, not a pain) |
| `expansion` | Existing outcome -> adjacent need / persona | Pain-bridge ON the adjacent need, not the existing relationship |
| `objection_handling` | Acknowledge stated objection -> reframe | No (the objection IS the anchor) |
| `chaser` (treat as a `re_engagement` variant) | One new fact or framing since the last send -> "still relevant?" | No |

Universal -- every variant: specific to *this* prospect (no template feel); concrete next action; honest about state; <= use-case length cap.

The rule in one line: never default to "let me find a pain" when the use case calls for "what happens next."

## Always-on context: `get_gtm_context`

Call `get_gtm_context(detailed: true)` first. Parse offerings into:

```
offering_profile = { offering, pain_points[], value_props[], proof_bank[], cta_ladder[] }
```

Anchor on one `offering_profile`. Pick one `value_prop`. Never invent stats or customer names -- only what GTM context / proof_bank provides.

## Input

- Prospect identifier (required) -- ZI person ID / email / name+company / name+domain.
- Use case (default `cold_outbound`) -- drives length, framework, CTA, and bar (see above).
- Outreach context (recommended) -- natural-language goal ("competitive displacement against [vendor]", "follow up on last week's pricing conversation").
- Prior touchpoint summary (recommended for follow-ups / recaps / chasers) -- what happened last + named participants + open thread. Without it, the skill falls back to `account_research` + `contact_research` to reconstruct.
- Sender info (optional) -- name, title, email, phone, signoff. Otherwise omit signature.
- User-supplied template/content (optional) -- wins over everything below. Use as skeleton; fill placeholders only.
- Variant count (optional) -- 1 / 2 / 3. Default: governed by persona-fit discipline.
- Preferred angle (optional) -- `curiosity` / `value-frame` / `urgency`.
- Recipient email -- optional for drafting, required only for a send/export handoff. Do not look it up unless the user asks for it or the workflow explicitly needs it.

## Use-case routing

| Use case | Length | Framework | CTA style |
|---|---|---|---|
| `cold_outbound` | 50-80 | AIDA or Becc Holland 4-line | Lowest-friction tease |
| `discovery_follow_up` | up to 120 | PAS (pain known) | 15-20 min fit check |
| `demo_recap` | 80-120 | Recap -> next-step | Concrete next-step proposal |
| `re_engagement` / `chaser` | 50-80 | Curiosity / new-signal hook | One-line ask |
| `renewal` | 80-120 | Outcome-recap -> renewal step | Tied to contract step |
| `expansion` | 80-120 | Outcome-recap -> adjacent need | Fit check on adjacency |
| `objection_handling` | up to 120 | Acknowledge -> reframe | Direct one-question response |

Frameworks: AIDA (cold) - PAS (pain known) - Challenger (provocative insight) - Becc Holland 4-line (Premise / Hook / CTA / Push-Pull -- cold + re-engagement).

## Signal -> pain mapping (cold-outbound + re-engagement)

Used when the use case requires a signal -> pain bridge. For follow-ups / recaps / renewals, the bridge is the prior touchpoint or contract moment, not a new pain.

| Signal | Recency | Implied pains | Buying window |
|---|---|---|---|
| M&A -- acquirer | 90d | Integration complexity, redundant tooling, vendor consolidation, IT security review | 3-9mo post-close |
| M&A -- acquiree | 90d | Loss of autonomy, vendor contract review, rip-and-replace risk | 0-6mo post-close |
| New CEO / C-suite hire | 30d | Strategy reset, 100-day plan, vendor relationship reset, budget reallocation | 60-180d |
| Funding round | 90d | Enterprise-grade tool need, hiring acceleration, scaling pains. A: replace founder tools - B: process formalization - C+: enterprise readiness | 3-6mo |
| Hiring plans / surge | 30d | Onboarding load, tooling gaps revealed by scale | 0-6mo |
| Layoffs / restructuring | 60d | Cost pressure, consolidation, automation appeal. Sensitivity > urgency | 6-12mo |
| Product launch | 90d | GTM readiness, sales/marketing alignment, enablement gaps | 0-6mo |
| Earnings / financial results | 30d | Public commitments -> execution pressure | 30-90d |
| Intent topic spike | 14d | Active research; score 80+ + audience A/B = warm | 0-60d |
| Partnership announcement | 60d | Co-sell pressure, competitive disruption to incumbent vendors | 3-6mo |
| Pain Point scoop | 90d | ZI-curated pain -- already the bridge | 0-90d |

When multiple signals exist, choose by (recency x buyer-relevance x stage-alignment). Recency weighted heavily -- a 14-day signal beats a 60-day one.

## Personalization ladder -- use exactly one, never stack

| Tier | What | When |
|---|---|---|
| P0 | Neutral trigger (role + market trend) | Last-resort fallback |
| P1 | Role/segment insight (ICP-level) | When company-specific signal is thin |
| P2 | Company-specific event (news / product / metric) | Default for cold_outbound |
| P3 | Individual-specific (quote, prior interaction, CRM note) | Strongest; re_engagement / discovery_follow_up |
| Tier 0 override | User-supplied template content | Always wins; fill placeholders only |

## Proof-source hierarchy -- use exactly one, in order

1. Direct prior result with this account/contact (from `contact_research` / CRM).
2. Peer / segment outcome (from `proof_bank`).
3. Product evidence without metrics (capability -> expected outcome).
4. Fallback: generic capability statement.

Never invent stats or customer names. If proof_bank is empty, drop to tier 3 or 4 -- never fabricate.

## Tone calibration

When tone isn't supplied, infer by seat:
- Executives (C/EVP/SVP) -- outcome-first, concise, numeric proof, direct CTA.
- Directors / Managers -- problem -> approach -> outcome -> CTA.
- Practitioners / ICs -- workflow friction -> concrete benefit -> quick next step.

Universal: ~Grade 8 reading level. Slightly casual; slightly unsure phrasing ("might be off-base, but...").

## Anti-patterns -- fail-fast checklist

If any fires, regenerate.

1. Generic congratulations. Banned openers: "Congrats on", "Saw the news about your", "Hope this finds you well", "Loved your recent post about" (without naming + thesis).
2. "Just checking in" / "circling back". Dead. Use a signal or don't follow up.
3. Self-introduction-first. "We're a leading provider of..." / "Hi, I'm..." / "We help [persona]..." -- lead with the prospect.
4. "I noticed..." crutch. Stating a public fact without doing something with it.
5. Signal without payoff. Naming a signal then jumping to product pitch -- skips the bridge.
6. Forcing a pain bridge on a non-cold use case. Follow-ups, recaps, renewals don't need a freshly invented pain. The anchor is the prior touchpoint or contract moment.
7. Generic praise. "Love what you're building" / "Big fan." Must tie to a specific achievement.
8. Meeting ask as primary CTA on cold. Tanks reply rate. Use a tease.
9. Length > use-case cap. Emails over 150 words are 42% less likely to get a reply.
10. AI-generated feel. Hedging, em-dashes everywhere, abstract claims with no verifiable detail.
11. Padded subject lines. Long, punctuation, numbers, first-names, brackets. Keep to 2-6 lowercase words.
12. Stale signals. 90d most categories / 30d hires-exec moves / 14d intent.
13. Multiple CTAs. Exactly one per email.
14. Bullets in emails <100 words. Fragments the mobile read.
15. Invented stats / customer names. Hard rule.
16. Personalization stacking. One ladder tier only.

## Workflow

### 1. Pull GTM context (always)
`get_gtm_context(detailed: true)` -> `offering_profile`. If empty, flag.

### 2. Honor input data first
INPUT DATA FIRST, TOOLS LAST. If user supplied template / sender info / recipient email / prior touchpoint summary / outreach context, use directly. Only call tools for missing data.

### 3. Resolve the prospect
- ZI person ID -> use directly.
- Email -> `enrich_contacts(email)`.
- Name + company -> `enrich_contacts(firstName/lastName/companyName)`; fall back to `search_contacts`.
- Resolve the prospect's company ID.
- Recipient email is optional for drafting. If unresolved, draft without it and note that sending/export requires the user to provide or approve lookup of the email address.
- Multi-recipient rule -- use only the first; never reference others.

Stale-record handling. If `lastUpdatedDate` >12mo OR current `companyName` doesn't match user-named company: use company-level signals only, skip `contact_research`, surface caveat, suggest verifying role.

### 3.5. Relationship-context pre-flight (mandatory)

Tag the resolved company. Wait for user confirmation when the label is anything other than `prospect`.

- `competitor` -- matches `get_gtm_context.competitors`. Hard-warn. Surface and ask: reroute to partnership/displacement-defense, acknowledge intentional targeting, or refuse.
- `customer` -- in `get_gtm_context.customers` / `proof_bank`. Suggest switching use_case to `expansion` or `renewal`.
- `partner` -- in `get_gtm_context.partners` / `integration_partners`. Surface co-sell / integration angle.
- `prospect` -- default; proceed.

Pipeline-account check (specialization). Run `account_research(zoominfoCompanyId, query="Open opportunities, active deal stages, named champions, last activity date")`. Open opp -> `pipeline_account` -> suggest `discovery_follow_up` / `expansion`. Renewal date within 90d -> suggest `renewal`. Active engagement -> suggest `discovery_follow_up`.

### 4. Pull signals in parallel

Pull only what the use case needs:

- Always: `enrich_companies` (companyId, fields: description, industries, employeeCount, revenue, ...).
- Cold / re-engagement / chaser: `enrich_news` (90d, categories: PERSON, MERGER_OR_ACQUISITION, FUNDING, PRODUCT, FINANCIAL_RESULTS, pageSize 20) + `enrich_scoops` (90d, pageSize 15) + curated `enrich_intent` (skip if no topics resolve).
- Discovery follow-up / demo recap / renewal / expansion / objection_handling: primarily `contact_research` + `account_research` for prior-touchpoint reconstruction; news/scoops only as supporting context.

Always run `contact_research` for the prospect (unless record is stale), with a query tuned to the use case.

`enrich_intent` -- only after `lookup` resolves intent topics for GTM themes. Never call with empty topics (returns alphabetically-first 50 = noise).

### 5. Pick the anchor

- Cold / re-engagement: rank signals by `(recency x buyer-relevance x stage-alignment)`. Recency: 0-14d = 1.0 - 14-30d = 0.7 - 30-60d = 0.4 - 60-90d = 0.2 - >90d = drop. 80-90d signals carry an "on the cusp" caveat. Buyer-relevance: CFO <-> funding/earnings/M&A - CRO <-> hiring/product launch - CTO <-> tech-stack/product - CEO <-> all. Pick top + record runner-up.
- Follow-up / recap / renewal / expansion / objection: the anchor is the prior touchpoint (or contract moment, or named objection). Pull it from prior-touchpoint summary first, then `contact_research` / `account_research`. If both are silent and no touchpoint can be reconstructed -> refuse and surface the gap.

Refuse-to-produce gate (cold / re-engagement only). Refuse when two or more hold:
1. Signal layer thin -- no company-level signal <=60d.
2. `contact_research` GTM-irrelevant -- nothing returned, OR what was returned maps to no value prop.
3. Positioning anchor weak -- no clean value prop in GTM context maps to the inferred pain.

All three -> refuse outright. One -> proceed but flag. Route refusals to warming channels or a different prospect.

### 6. Bridge to the anchor (use-case-conditional)

- Cold / re-engagement: use the signal -> pain mapping to infer the pain: *"For [persona] at a company that just [signal], the dominant unsolved problem in the next 90 days is likely [specific pain] because [reason]."* Iterate if generic.
- Other use cases: the anchor is the prior touchpoint / contract / objection. The body's job is to acknowledge, surface the next step, and remove friction -- not to introduce a freshly imagined pain.

### 7. Anchor positioning in GTM context
Map the inferred pain (cold/re-engagement) OR the prior touchpoint (other use cases) to one concrete claim from `offering_profile.value_props` -- never the elevator pitch. Pick one proof source per the hierarchy. If no value prop maps, flag and offer to reroute.

### 8. Compose variants

Persona-fit discipline:
- Strong fit -> 3 variants.
- Moderate fit -> 2 variants.
- Stretch fit -> 1 variant with strong opt-out CTA. Don't force volume.

Variant angles:
- A -- Curiosity. Lead with observation / question; tease.
- B -- Value-frame. Concrete claim or stat tied to the anchor (pain for cold; outcome for follow-up; objection-reframe for objection).
- C -- Urgency / window. Timing implication. Cold: only when signal <=30d and buying window tight. Renewal/expansion: tied to contract date.

Length per use case. Apply chosen framework. Tone: slightly casual, slightly unsure.

Exactly one each: personalization tier - anchor - value prop - proof source - CTA.

### 9. Subject lines

2-6 lowercase words. No punctuation / numbers / first-names / brackets. Three patterns -- generate then pick strongest:
1. Pain -> Outcome (cold). "pipeline gaps shorten replies"
2. Trigger -> Value (cold / re-engagement). "post-close stacks"
3. Recap -> Next step (follow-up / recap / renewal). "monday's pricing thread"
4. Peer / Proof cue (any). "how X improved reply rates"

### 10. Signature

If `sender_info` available, emit with two trailing spaces per line for Markdown line breaks:

```
Best,  
Jordan Smith  
Senior Account Executive  
jordan.smith@example.com
```

If no sender info -> omit signature. Don't invent.

### 11. Self-check before output

- [x] Word count within use-case cap.
- [x] Subject 2-6 lowercase words.
- [x] Opens with personalized hook (no generic greeting).
- [x] Cold / re-engagement: signal -> pain -> positioning chain present and specific. Other use cases: prior-touchpoint anchor present.
- [x] Exactly one each: ladder tier - anchor - value prop - proof source - CTA.
- [x] ~Grade 8; mobile-readable.
- [x] No cliches, jargon, filler, invented stats.
- [x] Recipient email present only if the user requested send/export handoff.
- [x] Signature: two trailing spaces per line OR omitted entirely.
- [x] All 16 anti-patterns cleared (including #6 -- pain not forced on non-cold use cases).

### 12. Rubric (final scoring)

Score 0-2 per dimension. Bar: >=8/10. Drop or regenerate failures.

1. Specificity -- verifiable fact about *this* prospect.
2. Anchor strength -- for cold: pain bridge; for follow-up: prior-touchpoint reference; for renewal: contract moment.
3. Positioning -- specific GTM-context claim.
4. Reciprocity -- gives insight / framing / opt-out before asking.
5. Send-worthiness -- would a senior seller press send?

### 13. Present + offer iteration

1. Accept variant.
2. Different signal (runner-up) -- cold / re-engagement.
3. Different persona at same company.
4. Tighter anchor.
5. Switch angle.
6. Adjust tone (casual / formal / direct).
7. Switch use case.

Iterate from step 6. Track variant evolution. Terminate on accept or pivot.

## Fallback rules

- Contact lookup fails -> `Hi [First Name]` greeting; continue.
- No public/CRM history -> skip `contact_research`; company signals only.
- Company sparse -> role-based personalization (drop to P1).
- Sender info missing -> omit signature.
- GTM context fails -> generic capability statement (proof tier 4); surface gap.
- No signal passes recency floor (cold) -> refuse; route to warming.
- No prior touchpoint reconstructable (follow-up) -> refuse; ask the user for a summary.

Never block on a single missing tool (recipient email is the hard gate). Never invent data.

## Output Format

### TL;DR -- Email for [Prospect Name], [Title] at [Company] - Pass [N]

*Use case: [restate]. Framework: [AIDA / PAS / Challenger / Becc Holland].*

Anchor. [For cold: signal + age + one-liner. For follow-up: prior touchpoint summary. For renewal: contract moment. For objection: stated objection.]
Bridge. [For cold: inferred pain in one sentence. For others: omit OR brief next-step framing.]
Positioning. [Specific GTM-context value prop.] *Proof source:* [tier 1/2/3/4].

---

### Variant A -- [angle]
Subject: [2-6 lowercase words]
[Body within use-case cap.]

### Variant B -- [angle] *(if persona fit >= moderate)*
Subject: [2-6 lowercase words]
[Body.]

### Variant C -- [angle] *(if persona fit strong)*
Subject: [2-6 lowercase words]
[Body.]

---

### Rationale

| | |
|---|---|
| Use case | [label] |
| Anchor | [signal+age / touchpoint / contract / objection] |
| Personalization tier | [P0-P3] |
| Pain (cold/re-engagement only) | [pain] |
| Value prop | [claim] |
| Proof source | [tier 1-4] |
| Framework | [AIDA / PAS / Challenger / Becc Holland] |
| Rubric | A: [X/10] - B: [X/10] - C: [X/10] |

### Iteration options

1. Accept [variant] -> hand off to sequencer.
2. Different signal -- anchor on [runner-up].
3. Different persona at the same company.
4. Tighter anchor.
5. Switch angle.
6. Casual / formal / direct.
7. Switch use case.

### Caveats (when relevant)

- Relationship flag -- if `competitor` / `customer` / `partner` / `pipeline_account`, variants assume user confirmed override.
- Thin signal -- variants on weak base; warm on another channel first.
- Empty signal (cold) -- 0 variants; route to warming.
- Stretch fit -- 1 variant only.
- Stale-signal cliff (60-90d) -- urgency angle unavailable.
- Edge-of-recency (80-90d) -- on the cusp.
- Stale prospect record -- verify role before sending.
- No prior touchpoint (follow-up) -- refused; ask for a summary.
- GTM-context gap -- positioning generic; update GTM context.
- Sender info missing -- signature omitted.

### Chain Targets

- Hand to a sequencer (e.g., Outreach, Salesloft).
- Multi-step sequence -> run once per step with different signals + use cases.
- Batch personalization -> `personalize-at-scale` (future scope).
- Different prospect at same company -> re-run with new identifier.
