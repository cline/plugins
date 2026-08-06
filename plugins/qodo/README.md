# qodo

Qodo review workflow guidance for Cline. This plugin helps Cline use Qodo coding standards and Qodo PR feedback without adding automatic network calls or mutating pull requests during installation.

## Cline Primitives

- Bundled skill `qodo-get-rules` for loading relevant Qodo coding rules when the user has configured Qodo and explicitly wants rule guidance for a task. The skill includes reference docs for query generation, repository scoping, search endpoint behavior, and output formatting.
- Bundled skill `qodo-pr-resolver` for triaging Qodo PR/MR comments, planning local fixes, and preparing replies. The skill includes provider-specific GitHub, GitLab, Bitbucket, Azure DevOps, and Gerrit reference docs.

## Requirements

- Qodo account and API key for live rule lookup.
- A configured git provider CLI or user-provided review text for PR/MR feedback workflows.
- No MCP server is registered, no CLI is installed, and no external service is contacted during plugin installation.

## Install

```bash
cline plugin install qodo
```

For local development from this repository:

```bash
cline plugin install ./plugins/qodo --cwd .
```

## Example Usage

After installation, ask Cline:

```text
Load the relevant Qodo rules for this refactor, then review my local diff against them.
```

Or:

```text
I pasted Qodo PR feedback below. Triage it, verify each comment against the code, and propose fixes.
```

## Security Notes

The plugin does not fetch Qodo rules, fetch provider comments, post replies, resolve threads, create PRs/MRs, commit, or push during installation. During a Cline run, the bundled skills ask before live Qodo or git-provider API calls and before any PR/MR side effects.

## Third-Party Notice

This plugin includes workflow guidance adapted from Qodo skill material licensed under the MIT License by Qodo Team. See `LICENSE.qodo-skills` and `NOTICE.qodo-skills`.
