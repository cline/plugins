---
name: lumen-reindex
description: Refresh or rebuild the Lumen semantic code search index for the current project.
---

# Lumen Reindex

Use this skill when the user asks to refresh, rebuild, or troubleshoot a stale Lumen index.

## Steps

1. Call the Lumen MCP `index_status` tool for the current workspace directory so you can report the current state first.
2. For a normal refresh, call the Lumen MCP `semantic_search` tool with a broad query for the current project. Lumen refreshes stale or missing indexes automatically.
3. If the user asks for a clean rebuild, first explain that this plugin installs Lumen as a private MCP server, not as a `lumen` shell command on `PATH`.
4. If the user separately installed the Lumen CLI and explicitly wants a shell rebuild, ask for confirmation before running:
   - `lumen purge . && lumen index .` removes and rebuilds only the current project index.
   - `lumen purge && lumen index .` removes every cached Lumen index on the host. Use this only when the user explicitly asks for a full wipe.
5. Call `index_status` again and report what changed.

## Notes

- Prefer MCP-driven refreshes before shell commands.
- Do not assume `lumen` is available on `PATH`.
- Do not wipe all cached indexes unless the user clearly asked for that scope.
