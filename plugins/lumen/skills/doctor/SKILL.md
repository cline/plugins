---
name: lumen-doctor
description: Check whether Lumen semantic code search is ready for the current project, including embedding backend reachability and index freshness.
---

# Lumen Doctor

Use this skill when the user asks whether Lumen is working, why semantic search is failing, or whether the current project has a fresh Lumen index.

## Steps

1. Call the Lumen MCP `health_check` tool to verify the embedding backend is reachable.
2. Call the Lumen MCP `index_status` tool for the current workspace directory.
3. Summarize backend status, model, indexed files, chunk count, last indexed time, and whether the index is stale.
4. If no index exists, explain that `semantic_search` seeds or refreshes the index on first use.
5. If the user wants an eager refresh, suggest the `lumen-reindex` skill.

## Notes

- Lumen uses local embeddings through Ollama or LM Studio. Do not ask for cloud API keys.
- If the backend is down, tell the user which local service or model appears to be missing.
