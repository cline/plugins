---
name: hermoso-ad-from-brand
description: >-
  Make a finished, on-brand ad for a company end-to-end with Hermoso: onboard the brand, write the concept +
  copy, then render the image or video. Use when the user says "make an ad for <company/website>", "build a
  launch ad for my brand", or gives a domain/brand and wants a complete ad, not just research. NOT for: just
  pulling competitor ads (use hermoso-research) or rendering from a prompt you already have (use hermoso-generate).
argument-hint: "[brand or website + what to advertise, e.g. 'an ad for yourbrand.com, our best-selling olive oil']"
allowed-tools: Bash
---

# Hermoso: full ad from a brand

Drive the Hermoso CLI to go from a brand to a finished ad in three steps. Report the final media URL.

## Setup (once)
- Run the CLI through npx: `npx -y hermoso <command>`. The commands below are written `hermoso …`; if `hermoso` is not on PATH (`npm install -g hermoso` puts it there), prefix them with `npx -y`. No MCP server is needed.
- Sign in once: `npx -y hermoso auth login` (opens a browser; nothing to paste). On a machine with no browser: `npx -y hermoso auth login --token <your key>`, using a key from app.hermoso.ai under MCP & CLI. No account at all? An agent can sign itself up on a paid plan with `POST /v1/signup` at app.hermoso.ai; see the Hermoso README.
- For anything these steps do not cover: `hermoso tools --search <what you want>` finds the tool, `hermoso tools <name>` prints its arguments, `hermoso call <name> --json '{...}'` runs it. The CLI reaches every tool and costs no context until it runs.

## Procedure
1. Onboard the brand (skip if the user already gave full brand details):
   - From a website: `hermoso brand draft --domain <domain> --json`
   - No website: `hermoso brand draft --description "<what they sell, audience, voice>" --json`
   - Influencer/social: `hermoso brand draft --social <handle> --platform instagram --json`
   Keep the returned brand name/category for the next steps.
2. Plan the concept + copy: `hermoso create --brand "<name>" --product "<what to advertise + angle>" --format <auto|image|video> --json`
   - Read the result: it has the `concept`, `copy[]` (headline/primary/cta), and the resolved render model id (`imodel` for images, `vmodel` for video). Tell the user the concept + headline.
3. Render, using the model the create step resolved (or run `hermoso capabilities` for options):
   - Image: `hermoso generate image --prompt "<image_concept.prompt from step 2, it already bakes in the copy>" --model <imodel> --aspect 1:1`
   - Video: `hermoso generate video --prompt "<from the storyboard>" --model <vmodel> --aspect 9:16 --duration 8 --wait`
4. Report the served URL. Offer one concrete next step (a punchier hook, a different aspect ratio, or a variation).

## Notes
- If the brand has a real product photo and the ad features that product, pass it with `--ref ./product.png` on the image step so the packaging is accurate.
- Quality over cost: prefer the resolved/best model unless the user asks for cheap/fast.
- Renders run on Hermoso's hosted API and come back as served URLs; `hermoso fetch <url> --out <file>` saves one to disk.
