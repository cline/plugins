---
name: brightdata-mcp
description: |
  Use Bright Data MCP when the user has explicitly configured Bright Data MCP
  for Cline or asks to set it up. Covers tool selection, available tool groups,
  setup guidance, and safe fallback to the Bright Data CLI/API skills when MCP
  tools are unavailable. Do not mutate MCP settings or credential-bearing URLs
  automatically.
license: MIT
metadata:
  author: Bright Data
  version: 1.1.0
  mcp-server: brightdata-mcp
  documentation: https://docs.brightdata.com
  support: support@brightdata.com
---

# Bright Data MCP

Bright Data MCP exposes Bright Data web-data tools to Cline when the user has
configured the server with their own Bright Data token. Use it for web search,
page extraction, platform-specific structured data, and browser automation only
when the user wants Bright Data involved or has selected the MCP surface.

This plugin does not register Bright Data MCP automatically because the MCP URL
or local server environment contains user credentials. Setup remains an explicit
user action.

## Setup Status

Before relying on MCP, check which Bright Data tools are available in the
current session. If no `mcp__*BrightData__*` tools are present, tell the user
that Bright Data MCP is not connected and point them to
`references/mcp-setup.md`.

Do not edit MCP settings files, append tokenized URL parameters, or add
credential-bearing environment variables on the user's behalf. Provide the
configuration snippet or parameter they need, then let the user apply it.

## Tool Groups

Available tools depend on how the user configured the MCP server.

| Group | Platforms/Tools |
|-------|----------------|
| `social` | LinkedIn, Instagram, Facebook, TikTok, YouTube, X/Twitter, Reddit |
| `ecommerce` | Amazon, Walmart, eBay, Best Buy, Etsy, Home Depot, Zara, Google Shopping |
| `business` | Crunchbase, ZoomInfo, Google Maps, Zillow |
| `finance` | Yahoo Finance |
| `research` | Reuters, GitHub |
| `app_stores` | Google Play, Apple App Store |
| `travel` | Booking.com |
| `browser` | Browser automation tools |
| `advanced_scraping` | raw HTML, extraction, batch tools, session stats |

If a needed tool is missing, identify the group and ask the user whether they
want to enable it. For remote MCP, the user can add `groups=<group_name>` or
`tools=<tool_name>` to the Bright Data MCP URL. For local MCP, they can add
`GROUPS=<group_name>` or `PRO_MODE=true` to the server environment.

## Tool Selection

1. Check available Bright Data MCP tools.
2. Prefer a platform-specific `web_data_*` tool when it exists and matches the
   URL or entity type.
3. Use `search_engine` or `search_engine_batch` for SERP-style discovery.
4. Use `scrape_as_markdown` or `scrape_batch` for page content when structured
   tools are unavailable or not appropriate.
5. Use `scrape_as_html` only when raw DOM is needed.
6. Use browser automation tools only for tasks that need interaction, screenshots,
   or JavaScript state.

If MCP tools are unavailable and the user still wants Bright Data, route to the
CLI/API skills such as `brightdata-search`, `brightdata-scrape`,
`brightdata-data-feeds`, `brightdata-discover-api`, or the SDK skills.

## Validation

After any MCP call:

- Confirm the response contains the expected fields or page content.
- Preserve source URLs for user-facing claims.
- Report empty result sets as empty, not as a failure.
- Keep samples small before scaling up.
- Do not collect private, paid, or personal data unless the user owns it or has
  clear authorization to process it.

## References

- MCP setup: `references/mcp-setup.md`
- MCP tool catalog: `references/mcp-tools.md`
