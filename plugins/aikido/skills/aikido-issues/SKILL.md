---
name: aikido-issues
description: Use this skill when listing, counting, summarizing, or triaging issues from the Aikido Security feed.
---

# Aikido Issues

Use this skill to inspect Aikido Security feed issues through the `aikido-mcp` server.

## Guardrails

- Ask for scope when the user has not provided a repository, cloud, VM, domain, or container target.
- Do not request more pages than needed for the user's question.
- Treat issue details as security-sensitive. Avoid dumping large raw feeds into chat.
- If the MCP server is unavailable or auth fails, switch to `aikido-setup`.

## Issue Flow

1. Call the Aikido issues list tool exposed by `aikido-mcp`.
2. Include scope fields only when supplied by the user or reliable workspace context:
   - `repo_name`
   - `cloud_name`
   - `vm_name`
   - `domain_name`
   - `container_name`
3. Include `issue_types` only when the user asks for a category such as open source, leaked secret, cloud, SAST, IaC, malware, EOL, license, container, SCM security, or AI pentest.
4. Use numeric `page` only when the user needs more than the first page.
5. Tell the user when additional pages exist.

## Reporting Format

For triage, report issues in this concise form:

```text
Issue #1: <title>
- Type: <issue_type>
- Severity: <issue_severity>
- Remediation: <issue_remediation>
```

Prioritize critical and high severity issues first unless the user asks for a different ordering.
