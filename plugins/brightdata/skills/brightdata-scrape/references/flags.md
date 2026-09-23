# `bdata scrape` -- flag reference

Verified against `@brightdata/cli` v0.1.8 on 2026-04-19.

Usage: `bdata scrape [options] <url>`

| Flag | Values | Default | When to use |
|---|---|---|---|
| `-f, --format <format>` | `markdown`, `html`, `screenshot`, `json` | `markdown` | `markdown` for readable content; `html` when you need DOM fidelity; `screenshot` to save a PNG; `json` when the Unlocker has a structured extractor for the URL. |
| `--country <code>` | ISO code (`us`, `de`, `jp`, ...) | -- | Force a geo-targeted exit. Use when the target site geoblocks, personalizes by country, or returns different content by region. |
| `--zone <name>` | Unlocker zone name | account default | Override the default zone -- e.g., when you have a dedicated zone with different residential/mobile settings. |
| `--mobile` | (flag) | off | Not functional in v0.1.8 -- flag is declared but `build_request` in the CLI does not forward it. Do not rely on it. |
| `--async` | (flag) | off | Not functional in v0.1.8 -- the Web Unlocker API currently rejects the `async` field with a validation error. Do not use until the CLI ships a fix. |
| `-o, --output <path>` | file path | stdout | Write result to a file. Required for binary formats (`screenshot`). Recommended for anything > 1KB. |
| `--json` | (flag) | off | Force JSON output envelope (metadata + content). Useful in scripts. |
| `--pretty` | (flag) | off | Pretty-print JSON. Combine with `--json` or `-f json`. |
| `--timing` | (flag) | off | Print request timing breakdown to stderr. Debugging only. |
| `-k, --api-key <key>` | API key | saved credentials or `BRIGHTDATA_API_KEY` | Per-command override. Rarely needed -- prefer `bdata login`. |

## Format decision matrix

| Goal | Format |
|---|---|
| Feed content to an LLM | `markdown` |
| Extract via selectors / regex | `html` |
| Visual regression / proof-of-view | `screenshot` (writes PNG -- use `-o` required) |
| URL has a structured extractor (Unlocker auto-parses) | `json` |
