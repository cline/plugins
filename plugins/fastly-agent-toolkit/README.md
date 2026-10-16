# fastly-agent-toolkit

Bundle Fastly workflow skills as an installable Cline plugin.

## What It Does

Installs seven Fastly skills:

- `fastly-platform` for CDN service design, caching, TLS, origin, security, observability, and API workflows.
- `fastly-cli` for safe terminal workflows with the `fastly` CLI.
- `fastly-falco` for Fastly VCL linting, testing, formatting, local simulation, and Falco source-code lookup.
- `fastly-xvcl` for XVCL metaprogramming, generated VCL, compile-time loops, constants, functions, and tables.
- `fastly-viceroy` for local Fastly Compute testing with Viceroy, especially Rust and Component Model projects.
- `fastly-fastlike` for Fastly Compute ABI/runtime internals, local WASM serving, and profiling.
- `fastly-ngwaf` for read-oriented Next-Gen WAF posture checks with a bundled audit script.

The plugin does not register an MCP server, run background processes, or perform install-time Fastly calls. It gives Cline concise operational guidance for using tools the user already controls.

## Install

```bash
cline plugin install fastly-agent-toolkit
```

For local development from this repository:

```bash
cline plugin install ./plugins/fastly-agent-toolkit --cwd .
```

## Example Usage

After installation, ask Cline:

```text
Review this Fastly VCL change, run the local checks that make sense, and tell me whether it is safe to activate.
```

Cline automatically uses the relevant Fastly skill to choose the right CLI, local simulator, or API workflow.

## Requirements

- A Fastly account for live service, TLS, purge, WAF, and Compute operations.
- The `fastly` CLI for account and service operations.
- `FASTLY_API_TOKEN` or a configured Fastly CLI login when making live API calls.
- Optional local tools depending on the task: Falco for VCL linting and simulation, XVCL for `.xvcl` compilation, Viceroy or Fastlike for Compute runtime checks, `jq` for NGWAF API inspection.

## Security Notes

Fastly changes can affect production edge traffic globally. The bundled skills prefer read-only inspection and local validation first, and require explicit user confirmation before commands that activate service versions, purge cache, change TLS, alter WAF rules, update origins, deploy Compute packages, or mutate account access.

Never print, commit, or paste Fastly API tokens. Use environment variables or the Fastly CLI credential store, and avoid verbose curl output that would reveal request headers.
