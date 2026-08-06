# Desktop Commander

Desktop Commander gives Cline access to a local MCP server for persistent shell sessions, long-running processes, process inspection, SSH workflows, broad filesystem operations, structured documents, large local data files, and ripgrep-backed search.

## What It Adds

- `desktop-commander`, a stdio MCP server started from the package-local `@wonderwhy-er/desktop-commander@0.2.42` dependency.
- `desktop-commander-overview`, a skill that explains when Desktop Commander is the right tool and how its process, file, search, document, and SSH workflows compose.

## Requirements

- Node.js is required. The pinned Desktop Commander package is installed with the plugin, and Cline starts that local copy when the MCP server is enabled.
- Desktop Commander's own allowed-directory configuration controls which local paths it can access.
- SSH, process control, and filesystem changes use the permissions of the local user running Cline.

Prefer Cline's built-in workspace tools for ordinary project reads, edits, and commands. Use Desktop Commander when the task needs persistent sessions, long-running background processes, structured files such as PDF/DOCX/XLSX, large local data analysis, SSH, process management, or user-approved paths outside the current workspace.
