# exa

Adds Exa web search and page extraction to Cline through Exa's MCP server, plus a bundled research workflow skill.

## What It Does

Registers an `exa` MCP server for web search and fetching page content. Use it for current web research, source discovery, code and documentation lookup, competitive research, literature scans, company research, and targeted extraction from known URLs.

The bundled `exa-research` skill helps Cline plan searches, avoid leaking private data in queries, filter sources, deduplicate results, and synthesize answers with clear source handling. A Cline rule reinforces the data-sharing boundary before private text, private URLs, customer data, or secrets are sent to Exa.

## Install

```bash
cline plugin install exa
```

For local development from this repository:

```bash
cline plugin install ./plugins/exa --cwd .
```

## Example Usage

After installation, ask Cline:

```text
Use Exa to find current sources on TypeScript build tooling adoption, then summarize the most relevant findings.
```

```text
Research competitors to this company and return a table with product focus, target users, funding status, and source URLs.
```

## Requirements

- Exa account authentication for higher limits and authenticated features.
- The MCP server may allow anonymous use with rate limits, but users should expect to authorize Exa through Cline's MCP auth flow if the server requests it.
- Network access to Exa and the public web.

## Security Notes

Search queries and fetched URLs are sent to Exa. Do not include private code, secrets, customer data, internal URLs, unreleased plans, or confidential text in queries unless the user explicitly accepts that data-sharing boundary.

## Attribution

The MCP endpoint and research patterns are adapted from Exa Labs' `exa-mcp-server`, licensed under MIT. See `LICENSE.exa-mcp-server` and `NOTICE.exa-mcp-server`.
