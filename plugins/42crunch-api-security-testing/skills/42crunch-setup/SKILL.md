---
name: 42crunch-setup
description: >
  Set up the 42Crunch environment so that audit and scan skills can run
  without friction. Use this skill whenever the user wants to configure
  42Crunch for the first time, install or update the 42c-ast binary, configure
  an API key, or troubleshoot missing credentials or binary errors. Triggers
  on phrases like "setup 42crunch", "configure 42crunch", "install 42c-ast",
  "update 42c-ast", "set api key", "42crunch not working", "binary not found",
  or any request to prepare the environment before running an audit or scan.
---

# 42Crunch Setup

## Cline Compatibility

When this workflow mentions `AskUserQuestion`, ask the user normally in Cline or use the host's question UI. Do not assume a separate tool named `AskUserQuestion` exists. Do not ask users to paste API keys, tokens, passwords, or cookies into chat; use existing 42Crunch config files, environment variables, user-created local files, or a secure host prompt when available. Confirm live scan targets and every audit/scan/code fix before running commands or editing files.

Prepares the environment for 42Crunch audit and scan workflows in two phases:
1. Ensure the `42c-ast` binary is installed at the canonical path.
2. Configure and store credentials.

---

## Entry Point

> Caller context: This skill may be invoked directly by the user or as a
> subroutine by another skill (e.g. `pre-flight`). Check whether a caller was
> passed. Steps 1 and 6 behave differently depending on this context -- see each
> step for details.

### Step 1 -- Introduce the setup

If called directly by the user (no caller context), greet the user and
explain what they'll be able to do once setup is complete:

> Welcome -- let me get your 42Crunch environment ready. This is a one-time
> setup that takes about two minutes. Once done, you'll be able to:
>
> - Audit any OpenAPI file for security issues and get a scored, actionable report
> - Scan a live API to catch BOLA, BFLA, and conformance problems
> - Fix SQG-blocking issues automatically, with your approval at every step
>
> I'll handle this in two quick steps:
> 1. Install the `42c-ast` analysis binary on this machine.
> 2. Connect your 42Crunch credentials (existing platform account or free account).
>
> Let's go.

If called as a subroutine (caller context is set), skip this greeting entirely and proceed directly to Step 2.

### Step 2 -- Binary setup

Follow `../../references/binary-setup.md` completely (verbose mode -- announce each major step to the user).

Stop and surface a clear error if the binary cannot be installed. Do not proceed to Step 3.

### Step 3 -- Credential setup

Follow `../../references/credential-setup.md` completely.

The procedure covers, in order:
- Silently check whether credentials are already present in
  `~/.42crunch/conf/env` (macOS/Linux) or `%APPDATA%\42Crunch\conf\env`
  (Windows). If already configured: show mode + masked key, offer to keep or replace.
- If not configured (or replacing): walk the user through the guided flow:
  - Are you an existing 42Crunch user?
    - Yes -> enter API Key -> select Platform URL (US / EU / Other)
    - No -> Are you a registered 42Crunch Free Trial user?
      - Yes -> enter Free Trial Token
      - No -> show registration link (`[42Crunch Free Trial](https://42crunch.com/freemium/?source=cline)`) and stop
- Write credentials to `~/.42crunch/conf/env` only after explicit confirmation, set `chmod 600` on macOS/Linux, and never echo secrets in chat or command output.

### Step 4 -- Final verification

Run a quick end-to-end check:

```bash
# Binary (macOS / Linux)
"$HOME/.42crunch/bin/42c-ast" --version
```

```powershell
# Binary (Windows)
& "$env:APPDATA\42Crunch\bin\42c-ast.exe" --version
```

```bash
# Credentials (macOS / Linux)
grep -qE "^(API_KEY|TRIAL_TOKEN)=" "$HOME/.42crunch/conf/env"
```

```powershell
# Credentials (Windows)
Select-String -Path "$env:APPDATA\42Crunch\conf\env" -Pattern "^(API_KEY|TRIAL_TOKEN)=" -Quiet
```

If either check fails, report the specific failure and guide the user to resolve
it before continuing.

### Step 5 -- Present summary

Display the setup summary (see Output Format below).

### Step 6 -- Recommend next steps

If called as a subroutine (caller context is set), skip the next-steps
prompt entirely. Announce `"Setup complete -- continuing."` and return control
to the caller. The caller (e.g. `pre-flight`) will resume from where it left
off.

If called directly by the user (no caller context), present the following:

> You're all set. Here's what you can do right now:
>
> - `42crunch-audit` -- Hand me an OpenAPI file and I'll score it, classify
>   every security issue by severity, and fix the SQG-blocking ones with your
>   approval. A good first step if you haven't audited this API before.
>
> - `42crunch-scan` -- Run a live conformance and authorization test against
>   a running API. I'll check for BOLA, BFLA, and response-contract violations.
>   Best run after the audit passes.
>
> - `42crunch-api-security-testing` -- Runs both audit and scan back-to-back. The recommended
>   workflow when you want the full picture in one session.
>
> Which would you like to start with?

---

## Output Format

```
## 42Crunch Setup Complete

| Item             | Status                                              |
|------------------|-----------------------------------------------------|
| Binary           | <BINARY_PATH> v<version>                            |
| Credential mode  | <Platform \| Free Trial>                            |
| API key / Token  | Platform: `api_<masked>` or `ide_<masked>`  |
|                  | Free Trial: `<first-4-chars><masked>`       |
|                  | (stored in <path>)                                  |
| Platform host    | <url>  <- omit this row for free trial mode          |

```

---

## General Constraints

- All detection steps (binary check, credential check) run silently. Surface
  output only on failure or when prompting the user.
- Never print the API key or Free Trial token in plaintext after the user enters
  it. Always mask it (`api_<masked>` / `ide_<masked>` for platform tokens -- keep
  prefix, replace rest; `<first-4-chars><masked>` for free trial tokens, e.g.
  `eyJh<masked>`).
- Use the `Bash` tool for all shell commands; use the `Edit` or `Write`
  tools when writing config files -- never shell redirection.
- Use `curl` for downloads; fall back to `wget` if `curl` is unavailable. On
  Windows use `Invoke-WebRequest`.
- On Windows: binary filename is `42c-ast.exe`, paths use `\`, config lives in
  `%APPDATA%\42Crunch\conf\env`, skip `chmod 600` (Windows ACLs protect `APPDATA`).

## Environment Variables

| Variable        | Default                          | Mode            |
|-----------------|----------------------------------|-----------------|
| `API_KEY`       | *(required)*                     | Platform        |
| `PLATFORM_HOST` | *(set during setup)*             | Platform only   |
| `TRIAL_TOKEN`.  | *(required)*                     | Free Trial      |
