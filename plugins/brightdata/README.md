# Bright Data

Bright Data adds Cline skills for building and operating web data collection workflows with Bright Data APIs, the `bdata` CLI, MCP, Discover, scraper generation, proxy setup, browser session debugging, research, SEO, and market intelligence workflows.

## Cline Primitives

- `skills`: 21 workflow skills cover onboarding, CLI/API/MCP setup, search, scraping, data feeds, Discover, SDK usage, proxy patterns, Scraper Studio, browser session debugging, design capture, live research, RAG pipelines, brand listening, competitive intelligence, price comparison, and SEO audits.

This plugin does not auto-register a Bright Data MCP server. Bright Data MCP requires user-specific credentials or URL parameters, so the MCP skill explains how to configure it explicitly when the user wants that surface.

## Install

```bash
cline plugin install brightdata
```

For local development from this repository:

```bash
cline plugin install ./plugins/brightdata --cwd .
```

## Example Usage

After installation, ask Cline:

```text
Help me set up Bright Data for a small, authorized competitor pricing research workflow.
```

## Requirements

- A Bright Data account for live API, CLI, MCP, proxy, or browser work.
- Node.js 20 or newer when using the `bdata` CLI.
- `BRIGHTDATA_API_KEY` or an authenticated `bdata login` session for CLI/API workflows.
- Optional Bright Data MCP configuration when the user wants MCP tools instead of CLI/API workflows.
- User authorization to collect data from each target site or account.

## Trust Boundaries

Bright Data operations can spend account credits, touch external websites, and collect sensitive data. The plugin asks Cline to confirm unclear scope before large jobs, avoid credential disclosure, avoid unsafe TLS workarounds, and avoid helping bypass access controls or site restrictions.
