# aikido

Aikido Security support for Cline.

## What It Adds

This plugin adds the `aikido-mcp` MCP server and three bundled skills:

- `aikido-setup`: verify Node.js, start or refresh Aikido browser sign-in, and confirm the MCP server is reachable.
- `aikido-scan`: scan selected project files for SAST and secret findings through Aikido, then help fix and rescan.
- `aikido-issues`: list, count, summarize, and triage issues from the Aikido security feed.

The MCP server runs the installed `aikido-mcp` bin from the plugin package:

```bash
npx --no-install aikido-mcp
```

The Aikido MCP package is pinned as a plugin dependency, so the server does not rely on startup-time package downloads.

## Install

```bash
cline plugin install aikido
cline config mcp
cline config skills
```

For local development from this repository:

```bash
cline plugin install ./plugins/aikido --cwd .
```

## Example Usage

After installation, ask Cline:

```text
Use the aikido-setup skill to sign in to Aikido and verify the MCP server.
```

```text
Use Aikido to scan the files changed in this branch.
```

```text
Show the current high severity Aikido issues for this repository.
```

## Requirements

- Node.js 18.19.0 or newer.
- Aikido account access.
- Browser sign-in through the Aikido MCP login flow.
- User approval before sending file contents to Aikido scans.

## Security Notes

Aikido scans can send source code, dependency data, and secret-like strings to Aikido for analysis. Confirm scope before scanning, prefer changed or user-selected files over the whole repository, and avoid scanning files that the user has not approved.
