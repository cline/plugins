# lumen

Adds local semantic code search through the Lumen MCP server.

## What It Does

The plugin registers a `lumen` stdio MCP server. Lumen indexes source code into local embeddings and exposes MCP tools such as `semantic_search`, `health_check`, and `index_status`.

It also bundles two Cline skills:

- `lumen-doctor` checks embedding backend health and index freshness.
- `lumen-reindex` refreshes or rebuilds the project index when the user asks.

The plugin does not auto-index on every Cline session start. Cline may start the MCP server to enumerate tools after install or when a session starts, which can download the pinned Lumen binary before the first search. Lumen seeds or refreshes the index when `semantic_search` is used, and the bundled skills make heavier maintenance actions explicit.

## Install

```bash
cline plugin install lumen
```

For local development from this repository:

```bash
cline plugin install ./plugins/lumen --cwd .
```

## Requirements

- Ollama or LM Studio running locally.
- A compatible embedding model, such as `ordis/jina-embeddings-v2-base-code` for Ollama.
- Network access to GitHub releases the first time the MCP server starts, unless the Lumen binary is already present in the plugin `bin/` directory.

Useful environment variables include `LUMEN_BACKEND`, `LUMEN_EMBED_MODEL`, `LUMEN_EMBED_DIMS`, `LUMEN_EMBED_CTX`, `OLLAMA_HOST`, and `LM_STUDIO_HOST`.

## Security Notes

Lumen runs locally and stores its indexes outside the repository in the user's data directory. Source code is sent only to the configured local embedding backend. The bundled launcher downloads the pinned Lumen binary from Ory's GitHub releases on first MCP server start, verifies its SHA256 checksum, and then executes that local binary as the MCP server.
