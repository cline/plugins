# chrome-devtools-mcp

Chrome browser automation and debugging for Cline through Chrome DevTools MCP.

## What It Does

Installs a pinned `chrome-devtools-mcp` server and bundles focused browser debugging skills. Cline can inspect pages, interact with elements, capture screenshots and accessibility snapshots, read console and network activity, run Lighthouse audits, record performance traces, and capture memory snapshots.

The plugin starts the MCP server with conservative defaults:

- isolated Chrome profile
- headless browser
- usage statistics disabled
- CrUX field-data lookups disabled
- update checks disabled
- network header redaction enabled

## Install

```bash
cline plugin install chrome-devtools-mcp
```

For local development from this repository:

```bash
cline plugin install ./plugins/chrome-devtools-mcp --cwd .
```

## Example Usage

After installation, ask Cline:

```text
Open my local app at http://localhost:3000, check the checkout form for accessibility issues, and suggest fixes.
```

or:

```text
Record a page-load trace for http://localhost:3000 and explain what is hurting LCP.
```

## Cline Primitives

- MCP: registers the `chrome-devtools` stdio server from the pinned `chrome-devtools-mcp` package.
- Skills: bundles guidance for general Chrome DevTools workflows, accessibility debugging, LCP optimization, memory leak debugging, and connection troubleshooting.

## Requirements

- Node.js supported by the installed Cline CLI.
- Google Chrome or Chrome for Testing available on the machine.
- Network access during plugin installation so npm can install `chrome-devtools-mcp@1.2.0`.
- Local or remote web pages that the user explicitly asks Cline to inspect.

## Security Notes

Chrome DevTools can expose page content, console logs, network metadata, screenshots, storage, and form state to the agent. Avoid using this plugin on pages containing credentials, private customer data, admin consoles, personal accounts, or unreleased confidential content unless the user explicitly accepts that context sharing.

The default plugin configuration uses an isolated headless Chrome profile and redacts sensitive network headers. It does not connect to the user's existing Chrome profile by default.
