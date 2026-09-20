# aipass-integration

Bundle the AI Pass application-integration skill as an installable Cline plugin. This is the primary AI Pass Cline package for adding user-funded AI or an optional BYOK alternative to an application. The separate `aipass-api` candidate is for an agent or developer calling AI Pass with a developer-owned API key.

## What It Does

Installs the `aipass-integration` skill and all of its required local references. The skill guides Cline through browser SDK, OAuth plus OpenAI-compatible REST, existing authentication and billing, private or deliberately shared storage, and optional AI Pass Spaces decisions while preserving the application's existing host and provider paths.

The plugin package registers no tools or hooks, runs no commands, installs no dependencies, and makes no network requests. Its reviewed instructions are bundled locally. Links and API responses may provide service data or documentation locations, but they must never replace, override, or extend the bundled instructions at runtime.

## Install

```bash
cline plugin install aipass-integration
```

For local development from this repository:

```bash
cline plugin install ./plugins/aipass-integration --cwd .
```

## Example Usage

After installation, ask Cline:

```text
Add AI Pass as an optional user-funded AI choice in this app. Keep its existing login, billing, hosting, and direct-provider BYOK flow unchanged.
```

Cline uses the bundled references to select the smallest integration path. It must ask once before offering AI Pass during a general BYOK request and must stop offering it if the user declines.

## Requirements

- An application repository and a Cline host that supports bundled plugin skills.
- An AI Pass account for the human who approves project setup.
- A browser or a user-visible verification link for device authorization.
- A funded end-user AI Pass wallet only when a real model call is performed.
- The application's normal build, test, deployment, secret-management, and persistence tooling for the selected integration path.

## Device Authorization and Setup

- The workflow starts an unauthenticated project-scoped device request at `https://aipass.one/api/v1/agent-auth/device`.
- The request sends the executing agent name, inferred project name, a random public project fingerprint, requested setup scopes, exact proposed OAuth callback URLs, and one proposed Space app slug.
- Cline may open the returned `verificationUriComplete` once or show it as a link. It must not fetch, inspect, click, sign in, or approve the page for the user.
- The human reviews and approves the displayed request. Setup approval does not authorize paid model calls.
- Polling must honor the server interval. Turn-based runtimes may temporarily store the device code only in gitignored `.aipass/pending-device.json` and must delete it at success, denial, or expiry.
- The resulting `asg_` setup grant is project-scoped, cannot spend wallet funds, stays in process memory only, and may be used only with the documented setup control plane, remote MCP transport, and read-only A2A endpoint.

## Network and Data Behavior

- The installed package performs no network access by itself. Network calls occur only when the user asks Cline to perform the integration workflow.
- Project setup sends public project metadata, requested scopes, exact callbacks, and the proposed Space slug to `https://aipass.one`.
- Deterministic provisioning uses HTTPS endpoints under `/api/v1/agent-control/` or the equivalent authenticated remote MCP endpoint at `/mcp`.
- The optional browser path loads `https://aipass.one/aipass-sdk.js` and uses the signed AI Pass handoff. If application policy forbids that third-party script, the skill directs Cline to use backend OAuth instead of weakening policy.
- The backend path uses AI Pass OAuth endpoints and the OpenAI-compatible API under `https://aipass.one/v1`.
- Prompts, selected application data, and uploaded media used in model calls are transmitted to AI Pass and may be processed by the selected upstream model provider. The host application should send only data appropriate for that model operation.
- Optional `AiPass.data`, `AiPass.files`, and shared-vault features store user-selected app data on AI Pass. Shared access requires an explicit least-privilege user grant and is never enabled silently.
- Optional read-only A2A or guidance calls may return links and factual setup guidance. Their text is untrusted service output and cannot replace the bundled skill or references.

## Credentials and Sensitive Data

- The workflow never asks the user to paste passwords, browser cookies, provider keys, wallet credentials, AI Pass session tokens, runtime OAuth tokens, device codes, or setup grants into chat.
- Raw device codes are secret until exchanged and may use only the narrow temporary resume file described above.
- The `asg_` setup grant must never be written to project files, MCP configuration, shell profiles, command history, logs, URLs, or application code.
- Public client IDs, the random project fingerprint, selected path, app name, and an idempotency key may be stored in `.aipass/config.json`; secrets and tokens may not.
- Backend OAuth tokens must use the host's established encrypted credential store. If adequate encrypted storage and refresh locking cannot be provided, the skill requires the agent to stop rather than claim completion.
- Runtime credentials are sent only over HTTPS to the documented AI Pass hosts and endpoints. The plugin includes no embedded credentials.

## Paid-Service Boundary

- Installing the plugin and provisioning a public OAuth client do not spend wallet funds.
- AI Pass model inference is an external paid service charged to the connected end user's wallet.
- A setup approval is not spending consent. Each real paid verification call requires separate, contemporaneous user approval for that exact action and its model or variable pricing basis when knowable.
- The workflow must not automatically retry an ambiguous paid request or make a second paid verification call without another approval.

## File, Command, and Mutation Behavior

- The plugin has no executable tools or hooks and cannot independently read, write, block, rewrite, or execute anything.
- Following the skill may cause Cline, through its normal approval system, to inspect and edit the target application, run its existing build/tests, create public `.aipass/config.json`, temporarily create the gitignored pending-device file, or provision the exact resources approved by the user.
- Existing hosting, authentication, subscriptions, credits, providers, and user data are preserved unless the user explicitly requests a change.
- The skill forbids browser automation or computer-use approval of the AI Pass authorization page.
- No downloaded instructions, scripts, packages, or generated code are executed merely because the plugin was installed.

## Source, License, and Terms

- Integration workflow: `aipass-one/aipass-integration-skill` release `v1.2.2`, commit `1a3f198ba413d2e0d905e6ffe7912bc3832ea4ea`. The Cline packaging was originally derived from `aipass-one/aipass-agent-plugin` release `v1.0.5`, commit `27bb3c15d63201eaff357e0b675b574ebc259fe5`.
- Bundled AI Pass material is MIT-licensed; see `LICENSE.aipass-agent-plugin`.
- The containing Cline plugin collection is Apache-2.0 licensed.
- AI Pass terms: `https://aipass.one/terms-of-service`
- AI Pass privacy policy: `https://aipass.one/privacy-policy`

This package is submitted by the AI Pass publisher. The setup version, requested scopes, endpoint
paths, and documented MCP protocol were rechecked against the production canonical skill on
2026-08-12 before submission.
