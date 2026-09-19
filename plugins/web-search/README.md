# web-search

Adds web search as a Cline tool, with free Parallel Search available without an API key.

## What It Does

Registers `web_search`, which searches public web results through Parallel or Exa and returns normalized result metadata. Use it to discover relevant URLs before fetching page content with normal Cline tools.

## Install

```bash
cline plugin install web-search
```

For local development from this repository:

```bash
cline plugin install ./plugins/web-search --cwd .
```

## Example Usage

After installation, ask Cline:

```text
Search the web for current Cline plugin package manifest examples and summarize the most relevant results.
```

Cline can call `web_search` to retrieve web results before deciding which public pages to inspect.

## Requirements

No search API key is required. Without `EXA_API_KEY`, the plugin uses the free Parallel Search MCP endpoint at `https://search.parallel.ai/mcp`.

Set `EXA_API_KEY` to use Exa instead. Existing Exa configurations continue to take priority.

## Security Notes

Queries are sent to Exa when `EXA_API_KEY` is configured, or to Parallel otherwise. Do not include private code, secrets, customer data, or other confidential text in search queries.
