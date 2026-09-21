---
name: hermoso-product-photoshoot
description: >-
  Brand-quality product photography with Hermoso: drop a real product photo into studio, lifestyle, or hero-banner
  scenes via reference-image compositing, so the packaging/label stays accurate. Use when the user wants
  "product shots", "a photoshoot for my product", "lifestyle images of <product>", "hero banner", or "a pack of
  ad images" from a real product image. NOT for: video (use hermoso-generate) or research (use hermoso-research).
argument-hint: "[product image + scene, e.g. './bag.png as a sunlit kitchen hero shot']"
allowed-tools: Bash
---

# Hermoso: product photoshoot

Use Hermoso's reference-image compositing so the real product (label, colours, shape) is preserved while the
scene around it is generated. Drive the Hermoso CLI.

## Setup (once)
- Run the CLI through npx: `npx -y hermoso <command>`. The commands below are written `hermoso …`; if `hermoso` is not on PATH (`npm install -g hermoso` puts it there), prefix them with `npx -y`. No MCP server is needed.
- Sign in once: `npx -y hermoso auth login` (opens a browser; nothing to paste). On a machine with no browser: `npx -y hermoso auth login --token <your key>`, using a key from app.hermoso.ai under MCP & CLI. No account at all? An agent can sign itself up on a paid plan with `POST /v1/signup` at app.hermoso.ai; see the Hermoso README.
- Run `hermoso capabilities` once to see image model ids and recipes. For anything these steps do not cover: `hermoso tools --search <what you want>` finds the tool, `hermoso tools <name>` prints its arguments, `hermoso call <name> --json '{...}'` runs it.

## Procedure
1. Get the product image path/URL from the user. This is the `--ref`, it forces product-accurate compositing.
2. Pick a mode and write the prompt accordingly (compose for ads: off-center hero, depth, directional light, negative space for copy):
   - `product_shot`: clean studio packshot on a seamless backdrop.
   - `lifestyle_scene`: the product in a real in-use setting (kitchen, desk, outdoors).
   - `hero_banner`: wide banner composition with room for a headline.
   - `social_carousel`: several angles/scenes of the same product (run the command N times with varied prompts).
   - `ad_creative_pack`: a few finished ad images with on-image copy.
3. Render: `hermoso generate image --prompt "<scene + composition + any on-image text>" --ref <product image> [--model <id>] [--aspect 1:1|4:5|16:9]`
   - Prefer the `★best` image model for hero work; a faster model is fine for bulk variations.
4. For a pack, loop: vary the scene/angle/aspect per call, collect the URLs, and present them together.
5. Report each served image URL; offer to `hermoso fetch` them to disk or to tweak a scene.

## Notes
- Keep the product as the hero; never let generated text garble the real label, describe the product as "the exact product in the reference, label unchanged."
- `--ref` takes a local path (read + sent) or a URL.
