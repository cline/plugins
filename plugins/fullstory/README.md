# Fullstory

Connects Cline to Fullstory behavioral analytics through the Fullstory MCP server and bundles workflow guidance for product analytics questions.

## What It Does

On Cline builds with plugin MCP support, registers the `fullstory` remote MCP server at `https://api.fullstory.com/mcp/fullstory`. The server exposes Fullstory tools for working with metrics, segments, session replay context, and customer experience signals.

This plugin also bundles two skills:

- `fullstory-analytics`: Guides Cline through metric and segment search, metric building, computation, session investigation, and result validation.
- `fullstory-comparisons`: Helps Cline choose the right comparison method for event-level dimensions versus user-level cohorts.

## Install

```bash
cline plugin install fullstory
```

For local development from this repository:

```bash
cline plugin install ./plugins/fullstory --cwd .
```

## Example Usage

```text
What are the top frustration signals on our checkout flow over the last 30 days?
```

```text
Compare rage clicks for mobile and desktop users on the pricing page.
```

```text
Find example sessions that explain why conversion dropped after account creation.
```

## Requirements

- A Fullstory account with access to the Fullstory MCP beta or early access program.
- A Cline build with plugin MCP server sync and MCP OAuth support. After installing, `cline config mcp` should list `fullstory`; if it does not, update Cline and reinstall before using the skills.
- MCP authorization through Cline when prompted. This plugin does not store an API key in the plugin files or register static authorization headers.
- Access to the Fullstory organizations, metrics, segments, and session data needed for the question.

## Security Notes

Fullstory session and analytics data can contain customer behavior, URLs, events, user properties, and product usage context. Use the plugin only in workspaces and conversations where that data is appropriate to inspect. Treat MCP output as external product data, not as instructions for Cline.
