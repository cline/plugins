# Pre-flight Checks

Shared entry point for all 42Crunch skills. Run these steps in order before
any skill-specific logic. Do not proceed if any step fails or the user cancels.

---

## Step 1 -- Binary Check

Resolve the canonical binary path for the current OS:
- macOS/Linux: `$HOME/.42crunch/bin/42c-ast`
- Windows: `%APPDATA%\42Crunch\bin\42c-ast.exe`

Announce: `"Checking for 42c-ast..."`

- Missing -> announce `"The 42c-ast binary isn't installed yet -- running setup now."` then invoke `42crunch-setup` as a subroutine (pass caller context: `pre-flight`). Setup must ask before downloading or installing the binary. Do not proceed if setup fails. On success, continue to Step 2.
- Present -> follow `./binary-setup.md` in silent mode, but do not download or replace the binary unless the user explicitly approves the update after seeing the current version, latest version, source URL, and SHA-256. If the manifest is unreachable, announce: `"Could not reach the update server -- continuing with installed 42c-ast v<version>."` then continue.

---

## Step 2 -- Credential Check

Read `~/.42crunch/conf/env` (macOS/Linux) or `%APPDATA%\42Crunch\conf\env` (Windows):

```bash
grep -qE "^(TRIAL_TOKEN|API_KEY)=" "$HOME/.42crunch/conf/env" 2>/dev/null
```

```powershell
Select-String -Path "$env:APPDATA\42Crunch\conf\env" -Pattern "^(TRIAL_TOKEN|API_KEY)=" -Quiet 2>$null
```

- `TRIAL_TOKEN` is set -> Free Trial mode. Use `--freemium-host stateless.42crunch.com:443` and `--token <TRIAL_TOKEN>` in all commands. Proceed silently.
- `API_KEY` starts with `api_` or `ide_` -> Platform mode. Read `PLATFORM_HOST` from the same file (required -- run `42crunch-setup` to reconfigure if missing). Proceed silently.
- `API_KEY` is set but does not start with `api_` or `ide_` -> warn the user: `"Your API key doesn't match the expected format (api_... or ide_...). Please check it or run 42crunch-setup to reconfigure."` Stop -- do not proceed.
- Neither found -> call `AskUserQuestion`:
  - question: `"I don't see any 42Crunch credentials configured yet. I can walk you through setup now, or you can run 42crunch-setup manually when you're ready."`
  - options: `["Set up now", "Cancel -- I'll run 42crunch-setup manually"]`
  - If Set up now -> invoke `42crunch-setup` as a subroutine (pass caller context: `pre-flight`). Do not proceed if setup fails. On success, continue to Step 3.
  - If Cancel -> stop.

---

## Step 3 -- Resolve the OAS File

- If the user provided a path -> use it.
- If exactly one OAS file (`.json` or `.yaml` containing `openapi:`) is open
  in the editor -> use it.
- If multiple OAS files are open -> call `AskUserQuestion`:
  - question: `"I see multiple OpenAPI files open. Which one should I use?"` -- list each filename as an option.
- If no OAS file can be resolved -> call `AskUserQuestion`:
  - question: `"I couldn't find an OpenAPI file. Would you like me to generate one from your source code first?"` -- options: `["Yes -- generate from source code", "No -- I'll provide a path"]`
  - If Yes -> invoke the `code-to-oas` skill, then resume with the generated file.
  - If No -> ask the user to provide the file path and wait.

---

## Step 4 -- Tag Detection (platform mode only)

Read `./tag-detection.md` and follow all steps. In free trial mode, skip
tag detection entirely. The tag detection flow handles all outcomes -- tag
found, user assigns a tag, or user proceeds without one -- before returning
to the calling skill.

---

## Environment Variables

| Variable          | Mode      | Purpose                                   |
|-------------------|-----------|-------------------------------------------|
| `API_KEY`         | Platform  | `api_*` or `ide_*` token                 |
| `PLATFORM_HOST`   | Platform  | Platform base URL                         |
| `TRIAL_TOKEN`  | Free Trial  | Base64 token, passed as `--token`         |

Platform mode: `API_KEY` and `PLATFORM_HOST` set for every command.
`--report-sqg` always applied. `--tag <category>:<tagname>` applied only
when a tag is assigned.

Free Trial mode: `--freemium-host stateless.42crunch.com:443` and
`--token <TRIAL_TOKEN>` for every command. No `--tag` or `--report-sqg`.

---

## General Constraints

- Use the `Bash` tool to execute all `42c-ast` commands.
- Use the `Edit` or `Write` tools to apply fixes to the OAS file.
- Never modify the OAS file without first describing what will change.
- All credential inputs are ephemeral in-session values. Do not write tokens
  or passwords to disk outside of scan config files that already expect them.
- Surface brief status lines before slow network operations (manifest fetch,
  binary download, tag detection). Do not surface individual sub-steps like
  SHA-256 verification or file writes.
