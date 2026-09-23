---
name: aikido-setup
description: Use this skill when setting up Aikido Security, verifying the Aikido MCP server, signing in, switching accounts, or reauthenticating.
---

# Aikido Setup

Use this skill to configure and verify Aikido Security MCP access.

## Guardrails

- Verify Node.js before troubleshooting Aikido.
- Do not ask the user to paste tokens, state values, or credentials into chat.
- Do not modify sign-in URLs returned by Aikido. Present them exactly as returned.
- Use reauthentication only when the user asks to switch accounts, refresh auth, or recover from auth failures.
- If the MCP server is unavailable, report that directly instead of inventing manual token setup.

## Setup Flow

1. Check Node.js:

```bash
node --version
```

If Node.js is missing or below 18.19.0, stop and ask the user to install or upgrade Node.js before continuing.

2. Call the `aikido_login` tool exposed by `aikido-mcp`.

- If it reports the user is already signed in, tell the user Aikido is ready.
- If it returns region-specific sign-in URLs, show the URLs exactly as returned and ask the user to open the correct region in a browser.
- If the user asked to switch accounts or reauthenticate, call `aikido_login` with `force_reauth: true`.

3. After the user confirms browser sign-in, call `aikido_login` again to verify the session.

4. If the MCP tool is unavailable, ask the user to confirm the `aikido` plugin is installed and enabled, then restart the Cline session if needed.

## Common Failure Modes

- Node.js is too old for the MCP server.
- The user has not completed browser sign-in.
- A stale session needs `force_reauth: true`.
- The MCP server was installed but the current Cline session has not loaded it yet.
