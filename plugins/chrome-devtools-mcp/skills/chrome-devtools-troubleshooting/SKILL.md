---
name: chrome-devtools-troubleshooting
description: Uses Chrome DevTools MCP diagnostics and local references to troubleshoot connection, Chrome launch, target, missing tool, and server initialization issues.
---

## Troubleshooting Wizard

You are acting as a troubleshooting wizard to help the user configure and fix their Chrome DevTools MCP server setup. When this skill is triggered (e.g., because `list_pages`, `new_page`, or `navigate_page` failed, or the server wouldn't start), follow this step-by-step diagnostic process:

### Step 1: Find and Read Configuration

First identify whether the failing server is the Cline plugin-owned `chrome-devtools` MCP server or a separate user-managed Chrome DevTools MCP configuration. Check the visible Cline MCP server details, available tool list, and any startup error shown to the user.

If the user is using a separate user-managed configuration, ask them to provide the relevant MCP server JSON or point you to the local config file. Read and interpret it to identify potential issues such as:

- Incorrect arguments or flags.
- Missing environment variables.
- Usage of `--auto-connect` / `--autoConnect` in incompatible environments.

Do not silently edit MCP configuration. Explain the suggested change and ask first.

### Step 2: Triage Common Connection Errors

Before reading documentation or suggesting configuration changes, check if the error message matches one of the following common patterns.

#### Error: `Could not find DevToolsActivePort`

This error can come from different launch modes. In auto-connect mode it usually means the server cannot find the file created by a running, debuggable Chrome instance. In the Cline plugin-owned default server, it can also mean Chrome failed to launch, crashed, or was blocked by an OS/container sandbox.

First determine which mode the user is using:

- For the plugin-owned default server, check Chrome availability, OS/container sandbox restrictions, startup logs, and whether the headless isolated launch is allowed.
- For a user-managed auto-connect setup, ask the user to confirm the intended Chrome version is already running, then ask them to enable remote debugging by opening `chrome://inspect/#remote-debugging`.
- After the relevant check, call `list_pages` as the simplest verification. If it still fails, proceed to advanced steps such as suggesting `--browser-url` or checking sandbox restrictions.

#### Symptom: Server starts but creates a new empty profile

If the server starts successfully but `list_pages` returns an empty list or creates a new profile instead of connecting to the existing Chrome instance, check for typos in the arguments.

- Check for flag typos: For example, `--autoBronnect` instead of `--autoConnect`.
- Verify the configuration: Ensure the arguments match the expected flags exactly.

#### Symptom: Missing Tools / Only 9 tools available

If the server starts successfully but only a limited subset of tools (like `list_pages`, `get_console_message`, `lighthouse_audit`, `take_heapsnapshot`) are available, this is likely because the MCP client is enforcing a read-only mode.

Some MCP clients can hide write-capable tools when the session is in a read-only or planning mode. In Cline, inspect the MCP server status and actual tool list before assuming the server failed to register tools.

#### Symptom: Extension tools are missing or extensions fail to load

If the tools related to extensions (like `install_extension`) are not available, or if the extensions you load are not functioning:

1. Check for the `--category-extensions` / `--categoryExtensions` flag: Ensure this flag is passed in the MCP server configuration to enable the extension category tools.
2. Make sure the MCP server is configured to launch Chrome instead of connecting to an instance: Chrome before 149 is not able to load extensions when connecting to an existing instance (`--auto-connect`, `--browser-url` / `--browserUrl`).

#### Other Common Errors

Identify other error messages from the failed tool call or the MCP initialization logs:

- `Target closed`
- "Tool not found" (check if they are using `--slim` which only enables navigation and screenshot tools).
- `ProtocolError: Network.enable timed out` or `The socket connection was closed unexpectedly`
- `Error [ERR_MODULE_NOT_FOUND]: Cannot find module`
- Any sandboxing or host validation errors.

### Step 3: Read Known Issues

Read [references/troubleshooting.md](references/troubleshooting.md) to map the error to a known issue. Pay close attention to:

- Sandboxing restrictions (macOS Seatbelt, Linux containers).
- WSL requirements.
- `--auto-connect` / `--autoConnect` handshakes, timeouts, and requirements.

### Step 4: Formulate a Configuration

Based on the exact error and the user's environment (OS, MCP client), formulate the correct MCP configuration snippet. Check if they need to:

- Pass `--browser-url=http://127.0.0.1:9222` instead of `--auto-connect` if the MCP client cannot launch Chrome directly because of sandboxing.
- Enable remote debugging in Chrome (`chrome://inspect/#remote-debugging`) and accept the connection prompt. Ask the user to verify this is enabled if using `--auto-connect` / `--autoConnect`.
- Add `--log-file <absolute_path_to_log_file>` to capture debug logs for analysis.
- Increase startup timeout only if the user's MCP client supports such a setting.

If you are unsure of the user's configuration, ask the user to provide their current MCP server JSON configuration.

### Step 5: Run Diagnostic Commands

If the issue is still unclear, run diagnostic commands to test the server directly:

- With approval, run `npx chrome-devtools-mcp@1.2.0 --help` to verify the installation and Node.js environment.
- If you need more information, and the user approves, run `DEBUG=* npx chrome-devtools-mcp@1.2.0 --log-file=/tmp/cdm-test.log` to capture verbose logs. Analyze the output for errors and avoid sharing sensitive paths or URLs.

### Step 6: Check Existing Issues

If the bundled troubleshooting reference does not cover the specific error, ask before searching external GitHub issues or discussions. If the user approves and the `gh` CLI is available, search the GitHub repository for similar issues:
`gh issue list --repo ChromeDevTools/chrome-devtools-mcp --search "<error snippet>" --state all`

Alternatively, recommend that the user check the upstream issue tracker or discussions themselves.
