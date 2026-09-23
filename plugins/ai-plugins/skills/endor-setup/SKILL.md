---
name: endor-setup
description: Use this skill when setting up endorctl, authenticating Endor Labs, choosing a namespace, or running Endor Labs software supply-chain scans.
---

# Endor Setup

Use this skill to help Cline prepare and run Endor Labs `endorctl` scans.

## Guardrails

- Ask before installing or downloading `endorctl`.
- Ask before starting browser authentication.
- Ask before reading `~/.endorctl/config.yaml`, and never print the full config file.
- Never ask the user to paste API credentials into chat.
- Use environment variables for API key authentication.
- Always confirm the Endor namespace before scanning, even if a previous config exists.
- Present the scan plan before running it.
- Do not run the same scan twice just to summarize results. Parse the first result instead.

## Setup Flow

1. Check whether `endorctl` is available:

```bash
command -v endorctl && endorctl --version
```

2. If `endorctl` is missing, ask the user before installing it. Prefer the user's normal package manager when available. Direct downloads should come from Endor Labs and should verify checksums when the platform provides them.

3. Ask for the Endor namespace. Parent and child namespaces are both valid, for example `company` or `company.project`.

4. Check whether authentication is already configured only after user approval:

```bash
test -f ~/.endorctl/config.yaml && echo "CONFIG_EXISTS" || echo "NOT_AUTHENTICATED"
```

5. If authentication is needed, ask which mode to use:

- Browser authentication for interactive local development.
- API key authentication for CI and non-interactive environments.

For API key authentication, tell the user to set values in their shell or secret manager:

```bash
export ENDOR_API_CREDENTIALS_KEY=<api-key>
export ENDOR_API_CREDENTIALS_SECRET=<api-secret>
```

Do not ask for the credential values in chat.

## Browser Authentication

For browser authentication, collect the namespace first so the command can avoid unnecessary prompts:

```bash
endorctl init --namespace=<namespace>
```

If the user needs a specific provider, add the appropriate auth mode supported by their installed `endorctl` version, such as Google, GitHub, GitLab, SSO, or generic browser auth.

If authentication fails because the account has multiple tenants or no access to the namespace:

- Show the relevant error.
- Ask the user to confirm the namespace.
- Offer to use API key authentication for non-interactive environments.
- Do not retry indefinitely.

## Running Scans

Before scanning, confirm:

- Repository path.
- Endor namespace.
- Scan type, such as default, quick, secrets, SAST, or container.
- Whether dependency manifests, private package metadata, or release artifacts may be sent to Endor Labs.

For the default scan:

```bash
endorctl scan --namespace=<namespace>
```

For a specific scan type, check the installed `endorctl scan --help` output or Endor Labs documentation for the current flag before running the command. Do not guess flag names.

## Result Handling

- Summarize critical and high findings first.
- Separate vulnerable dependencies, reachability, secrets, malware, license, and policy findings when the scan reports them.
- Include package names, versions, fix versions, and affected manifests when available.
- Recommend the smallest practical remediation path.
- If a namespace or permission error occurs, report it directly and ask the user to choose another namespace or verify Endor Labs access.
