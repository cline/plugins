---
name: aws-startup-knowledge
description: "AWS Startups reference content -- Activate FAQ, credits guide, programs, partner offers, sample architectures, and hundreds of learn articles spanning generative AI, cloud architecture, cost optimization, security, fundraising, go-to-market, and real-world startup case studies. Use when the user asks factual questions about AWS Activate (eligibility, credits, programs, providers), wants a sample architecture or solution guide, or needs an AWS-curated learn article on a specific startup topic. For copy-paste AI prompts (RAG chatbot, MVP scaffold, security baseline, GPU quota, etc.), see the aws-startup-prompts skill. Do not use for: account-specific lookups (credits balance, Activate membership status, application status), real-time event listings beyond the events stub, or content not present in the bundled `references/` tree."
---

# AWS Startup Advisor -- Knowledge Base

Reference content from [aws.amazon.com/startups](https://aws.amazon.com/startups) for AWS Activate programs, credits, partner offers, sample build architectures, and a large learn-article corpus covering technical guides, business strategy, and real-world case studies.

Last updated: 2026-05-12

---

## Where to start

New-to-AWS-Startups questions -> open [`references/home.md`](references/home.md) first. It's the landing-page overview: the Activate pitch, how to join, the top-level programs (credits, accelerators, solutions), and the ~350,000-startups context. Good starting point for broad "how does AWS help startups" questions.

## Searchable indexes -- use these when the user asks for a specific topic or example

Three files are indexes, not articles. They have a Keywords column -- filter by keyword first, then open the linked detail file.

- [references/learn.md](references/learn.md) -- hundreds of learn articles across a dozen categories (genai, general, getting-started, architecture, business-growth, case-studies, cost-optimization, security, and more). Each row: title, one-line summary, keywords, link into `references/learn/<category>/<slug>.md`.
- [references/offers.md](references/offers.md) -- publicly-viewable AWS Activate partner offers with keywords + links into `references/offers/<slug>.md`. Offers that require Activate sign-in are not captured here; direct the user to `<https://aws.amazon.com/startups/offers>` for the full list.
- [references/build.md](references/build.md) -- sample architectures and solution guides. Two sub-sections:
  - Publicly-viewable solutions are listed by title, summary, keywords, and live AWS URL when available. Detail pages are not bundled locally; use the index row and `source_url`/live link rather than trying to open `references/build/<slug>.md`.
  - Sign-in required entries are gated. Recommend them by title + keywords and hand over the Live URL: _"There's a Build sample that might be useful -- please sign in to view it at [URL]."_

## Reference pages -- full-topic content, read directly

| File                                                 | Topic                                                                                                              |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| [references/faq.md](references/faq.md)               | Comprehensive Activate FAQ -- membership, Builder ID, credits, providers, offers, events, showcase, troubleshooting |
| [references/credits.md](references/credits.md)       | AWS Activate Credits -- how to apply, eligibility, package tiers, terms                                             |
| [references/programs.md](references/programs.md)     | AWS Startups programs -- Accelerators and Lofts currently running                                                   |
| [references/providers.md](references/providers.md)   | AWS Activate Providers -- accelerators, VCs, Provider Central, how to apply                                         |
| [references/contact-us.md](references/contact-us.md) | Support channels and the Ask AWS Startups assistant                                                                |

## Live-URL redirects -- point users at the live page

Two pages are deliberately minimal stubs. The live content (events, showcase directory) is location- and time-sensitive or is a large browseable catalog; a bundled snapshot goes stale fast. When these topics come up, answer with a short pointer phrase and the live URL:

- [references/events.md](references/events.md) -- AWS Startups events. When a user asks about upcoming events, summits, meetups, or loft sessions, respond along the lines of: _"Virtual and in-person AWS Startups events happening around you can be found at https://aws.amazon.com/startups/events."_
- [references/showcase.md](references/showcase.md) -- Startup Showcase directory. When a user asks about startups building on AWS or wants to browse the showcase, respond along the lines of: _"The latest Startup Showcase -- innovative startups building on AWS -- is at https://aws.amazon.com/startups/showcase. You can also promote your own startup there."_

## Companion skills -- when to defer

This skill is reference content only. Two sibling skills cover adjacent jobs:

- `aws-startup-prompts` -- copy-paste AI prompts and downloadable agents from `aws.amazon.com/startups/prompt-library` (MVP scaffolding, RAG chatbot, security baseline, cost anomaly detection, GPU quota, AWS Migration Agent, Bill Shock Preventer, etc.). When the user asks for _"a prompt for X"_ or wants an installable agent, hand off to that skill.
- `aws-startup-build` -- interactive discovery + implementation workflow (structured multiple-choice questions, then writes code). When the user wants to _build_, _scaffold_, or _expand_ an app, hand off to that skill. This skill stays in lookup mode.

Boundary cases (a query that fits two skills) -- read both. Example: _"how do I start with RAG on Bedrock?"_ -> consult this skill's `references/learn/genai/...` for an article AND `aws-startup-prompts` for a starter prompt.

## Routing hints -- common queries -> which file

| Query                                                                           | File                                                |
| ------------------------------------------------------------------------------- | --------------------------------------------------- |
| _"What is AWS Activate?" / "Should my startup use AWS?"_                        | references/home.md, then references/faq.md          |
| _"Do AWS Activate credits expire?" / any Activate-membership question_          | references/faq.md                                   |
| _"How do I apply for Activate credits?" / "What tier do I qualify for?"_        | references/credits.md                               |
| _"What accelerators / lofts are running?"_                                      | references/programs.md                              |
| _"Find an article on cost optimization for early stage"_                        | references/learn.md (keyword filter) -> article file |
| _"What partner offers help with observability / CAD / vector DB / ..."_         | references/offers.md (keyword filter) -> offer file  |
| _"Show me a sample architecture for RAG / EKS / Bedrock / observability / ..."_ | references/build.md (keyword filter) -> index row/live URL |
| _"What events are happening?"_                                                  | references/events.md -> hand over live URL           |
| _"What startups are on AWS showcase?"_                                          | references/showcase.md -> hand over live URL         |
| _"How do I contact AWS Startups?"_                                              | references/contact-us.md                            |

## Answer style

- MUST read the file before answering. Content is bundled; open it. Do not answer from memory or the description alone.
- Use short direct quotes when exact wording matters, cite `source_url`, and otherwise summarize without inventing new claims.
- Cite `source_url`. Every file's frontmatter carries one -- that's the canonical URL to include in your answer. Never construct or guess a URL.
- Diagrams, screenshots, videos live on the website. Detail files may reference images with lines like "_can be found here [link]_". Surface the `source_url` so the user can view the visuals on the live page.
- For sign-in-gated content (some build solutions, offer details, showcase-promotion page), recommend by title and keywords, then give the live URL so the user can sign in.

## Context loading rule

Open the matching index first (`learn.md`, `offers.md`, `build.md`, `faq.md`, `credits.md`, `programs.md`, `providers.md`, `contact-us.md`), filter by keyword, then open at most one detail file per question. MUST NOT speculatively load multiple detail files or category trees. If the index points to a sign-in-gated row, do not attempt to open the detail file -- surface the title + Live URL.

## Scope notes

This skill cannot:

- Answer account-specific questions (credits balance, Activate membership status, application status, eligibility check). Send the user to `<https://aws.amazon.com/startups>` to sign in.
- Provide live event listings, accelerator cohort dates, or showcase-directory entries. The events and showcase pages are deliberately minimal stubs; hand over the live URL.
- Surface content that is not in the bundled `references/` tree. If the topic is not covered, say so plainly rather than improvising.

## Freshness check -- surface after every answer

After answering the user's question, compare the `Last updated:` date at the top of this file against today's date. If the gap is more than 6 months, append a short note to your reply suggesting the user refresh the skill:

> _"This skill's content was last refreshed on `<Last updated date>`, more than 6 months ago -- some details (offers, programs, accelerator cohorts) may be out of date. To pull the latest content, run:_
>
> - _Reinstall or update the `aws-startup-advisor` plugin from its marketplace/source to refresh the bundled skill content._
>
> _Then restart your AI agent so the new content is picked up."_

Do not show this note when the skill is fresh (<=6 months). Do not repeat it within a single conversation; once is enough.
