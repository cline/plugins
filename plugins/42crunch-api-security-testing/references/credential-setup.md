# Credential Setup Reference

Follow this procedure to configure credentials used by all 42Crunch skills.
All detection steps run silently -- surface output only on failure or user prompts.

Credentials are stored exclusively in `~/.42crunch/conf/env` (macOS/Linux) or
`%APPDATA%\42Crunch\conf\env` (Windows). No project-level `.env` files are
used.

## Cline Credential Handling

Do not ask the user to paste API keys, trial tokens, passwords, cookies, or
bearer tokens into chat. Prefer, in order:

1. Existing `~/.42crunch/conf/env` or `%APPDATA%\42Crunch\conf\env` values.
2. Existing `API_KEY`, `PLATFORM_HOST`, or `TRIAL_TOKEN` environment variables.
3. A user-created local file that the user explicitly asks Cline to read.
4. A secure host prompt, if the current Cline host provides one.

If none of those are available, give the user exact local-file instructions and
stop rather than capturing secrets in the transcript.

---

## Step 1 -- Check for Existing Credentials

Silently check for an existing credentials file:

```bash
# macOS / Linux
grep -qE "^(TRIAL_TOKEN|API_KEY)=" "$HOME/.42crunch/conf/env" 2>/dev/null
```

```powershell
# Windows
Select-String -Path "$env:APPDATA\42Crunch\conf\env" -Pattern "^(TRIAL_TOKEN|API_KEY)=" -Quiet 2>$null
```

Mode detection from the file:

- `TRIAL_TOKEN` is present -> Free Trial mode
- `API_KEY` starts with `api_` or `ide_` -> Platform mode

If a credential is found, call `AskUserQuestion`:
- question: `"Credentials already configured in ~/.42crunch/conf/env -- running in <mode> mode. Key: <masked>. Would you like to keep the existing credentials or replace them?"`
- options: `["Keep existing credentials", "Replace credentials"]`

Masking rules: `api_<masked>` / `ide_<masked>` for platform tokens (keep
prefix, replace remaining chars); show first 4 characters plus `<masked>` for
free trial tokens (e.g. `eyJh<masked>`).

If keeping -> credential setup complete.
If replacing -> continue to Step 2.

---

## Step 2 -- Determine User Type

Call `AskUserQuestion`:
- question: `"Do you have an existing 42Crunch platform account? (Platform accounts log in to a URL like company.42crunch.cloud and use an API key. Free Trial is a free personal account that covers full audit and scan functionalities.)"`
- options: `["Yes -- I have a platform account", "No -- I'm using Free Trial"]`

---

### Path A -- Existing User (Platform mode)

Ask the user to provide the API key through an existing environment variable,
existing config file, user-created local file, or secure host prompt. Do not
capture the raw API key in chat. Then call `AskUserQuestion`:
- question: `"Which region hosts your 42Crunch platform? (Your organisation's IT or security team can confirm this -- it's also visible in the URL when you log in.)"`
- options: `["US -- https://us.42crunch.cloud/", "EU -- https://eu.42crunch.cloud/", "Other -- I'll enter my platform URL manually"]`

- If US chosen: `PLATFORM_HOST=https://us.42crunch.cloud`
- If EU chosen: `PLATFORM_HOST=https://eu.42crunch.cloud`
- If Other chosen: call `AskUserQuestion` -- question: `"Please enter your platform URL (e.g. https://your-org.42crunch.cloud):"` -- store response as `PLATFORM_HOST`. Trim any trailing slashes.

Store values as `API_KEY` and `PLATFORM_HOST` only after they were obtained
through a non-chat source and the user confirms they should be written. Continue
to Step 3.

---

### Path B -- Not an Existing User

Call `AskUserQuestion`:
- question: `"Are you a registered 42Crunch Free Trial user?"`
- options: `["Yes -- I have a token", "No -- I need to register"]`

#### Path B-1 -- Registered Free Trial user

Ask the user to provide the Free Trial token through an existing environment
variable, existing config file, user-created local file, or secure host prompt.
Do not capture the raw token in chat. Store value as `TRIAL_TOKEN` only after it
was obtained through a non-chat source and the user confirms it should be
written. Continue to Step 3.

#### Path B-2 -- Not registered

Inform the user:
> No problem -- getting a free account takes a minute.
>
> 1. Visit [42Crunch Free Trial](https://42crunch.com/freemium/?source=cline).
> 2. Fill in your email address, accept terms and conditions and click Submit.
> 3. Check your inbox for a confirmation email that includes your free trial token.
>
> When you're ready, just say "continue" or "I have my token" and I'll pick up
> exactly where we left off -- you won't need to restart setup.

Stop -- do not proceed. Credential setup is incomplete. Do not write any credentials file.

---

## Step 3 -- Write the Credentials File

Create the directory if it does not exist:

```bash
# macOS / Linux
mkdir -p "$HOME/.42crunch/conf"
```

```powershell
# Windows
New-Item -ItemType Directory -Force -Path "$env:APPDATA\42Crunch\conf" | Out-Null
```

Write the file. Do not quote values. Do not add spaces around `=`.

Platform mode

macOS / Linux -- write to `~/.42crunch/conf/env`:

```
API_KEY=<value>
PLATFORM_HOST=<value>
```

Windows -- write to `%APPDATA%\42Crunch\conf\env`:

```
API_KEY=<value>
PLATFORM_HOST=<value>
```

Free Trial mode

macOS / Linux -- write to `~/.42crunch/conf/env`:

```
TRIAL_TOKEN=<value>
```

Windows -- write to `%APPDATA%\42Crunch\conf\env`:

```
TRIAL_TOKEN=<value>
```

Set restrictive permissions (macOS / Linux only):

```bash
chmod 600 "$HOME/.42crunch/conf/env"
```

Skip on Windows -- `APPDATA` is already protected by Windows ACLs.

---

## Step 4 -- Verify

Re-read the file and confirm the correct variable is present:

Platform mode (macOS / Linux):
```bash
grep -q "^API_KEY=" "$HOME/.42crunch/conf/env"
```

Platform mode (Windows):
```powershell
Select-String -Path "$env:APPDATA\42Crunch\conf\env" -Pattern "^API_KEY=" -Quiet
```

Free Trial mode (macOS / Linux):
```bash
grep -q "^TRIAL_TOKEN=" "$HOME/.42crunch/conf/env"
```

Free Trial mode (Windows):
```powershell
Select-String -Path "$env:APPDATA\42Crunch\conf\env" -Pattern "^TRIAL_TOKEN=" -Quiet
```

Display confirmation with the value masked:

Platform mode (macOS / Linux):
> Credentials saved to `~/.42crunch/conf/env`.
> Mode: Platform | Key: `api_<masked>` | Host: `<PLATFORM_HOST>`

Platform mode (Windows):
> Credentials saved to `%APPDATA%\42Crunch\conf\env`.
> Mode: Platform | Key: `api_<masked>` | Host: `<PLATFORM_HOST>`

Free Trial mode (macOS / Linux):
> Credentials saved to `~/.42crunch/conf/env`.
> Mode: Free Trial | Token: `<first-4-chars><masked>`  <- show first 4 chars of the token

Free Trial mode (Windows):
> Credentials saved to `%APPDATA%\42Crunch\conf\env`.
> Mode: Free Trial | Token: `<first-4-chars><masked>`  <- show first 4 chars of the token

---

## Error Handling

| Situation | Action |
|---|---|
| User provides empty API Key | Re-prompt once with: "It looks like the key was not available from the local source. Please set `API_KEY` in your shell, create the 42Crunch config file yourself, or provide a secure local file for me to read." If still empty, stop with: "I wasn't able to load your API key without putting it in chat. Your binary is installed and working -- when you're ready, run `42crunch-setup` again to finish credential setup." |
| User provides empty Platform URL (Other) | Re-prompt once with: "I didn't catch the URL -- please paste your platform address (it should look like `https://your-org.42crunch.cloud`)." If still empty, stop with: "I wasn't able to capture your platform URL. Your binary is installed -- run `42crunch-setup` again whenever you have the details ready." |
| User provides empty Free Trial Token | Re-prompt once with: "The token was not available from the local source. Please set `TRIAL_TOKEN` in your shell, create the 42Crunch config file yourself, or provide a secure local file for me to read." If still empty, stop with: "I wasn't able to load your Free Trial token without putting it in chat. Your binary is installed -- run `42crunch-setup` again whenever you have the token ready." |
| Cannot write to credentials file | Report the permission error. On macOS/Linux, suggest `chmod u+w ~/.42crunch/conf/env` or creating `~/.42crunch/conf` manually. On Windows, suggest verifying write access to `%APPDATA%\42Crunch\conf` and creating the folder manually if needed. |
