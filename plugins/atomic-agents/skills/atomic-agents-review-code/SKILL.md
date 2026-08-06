---
name: atomic-agents-review-code
description: Use when reviewing or auditing Python code that imports atomic_agents for framework-specific correctness around schemas, agents, tools, providers, context, memory, hooks, tests, and orchestration.
---

# Review Atomic Agents Code

Use this skill for framework-specific review. It complements normal code review; it should not report generic Python style issues unless they create an Atomic Agents correctness or safety problem.

## Scope

Review the user's requested diff, files, or module. If scope is unclear, ask for it. Prefer changed code over broad project scans.

## Checklist

### Schemas

- Inherit from `BaseIOSchema`.
- Have non-empty class docstrings.
- Every field has a useful `description=`.
- Closed sets use `Literal` or another constrained type.
- Optional fields have defaults.
- Typed failure cases are explicit when routine failure is expected.

### Agents

- Use explicit `AtomicAgent[InputSchema, OutputSchema]` generics.
- Pass an Instructor-wrapped client into `AgentConfig.client`.
- Set provider mode and assistant role consistently.
- Include provider-required parameters in `model_api_parameters`.
- Use `ChatHistory` only when memory is needed.

### Tools

- Use explicit `BaseTool[InputSchema, OutputSchema]` generics.
- Return output schema instances.
- Use `run_async` for async tools.
- Read credentials from config or environment.
- Add timeouts for external I/O.
- Return typed failure outputs for routine failures.

### Context Providers

- `get_info()` returns a string.
- `get_info()` does not perform slow I/O.
- Titles are unique.
- Secrets are not injected into prompts.
- Providers are registered before agent runs that depend on them.

### Orchestration And Memory

- Parallel agents do not share one `ChatHistory`.
- Router agents return structured variants, not free-text topics.
- Supervisor loops have iteration caps.
- Pipeline stages use compatible schemas or typed adapters.

### Hooks And Tests

- Hook handlers do not raise.
- Error handling uses framework hooks where appropriate.
- Unit tests do not call live providers by default.
- Integration tests are gated by explicit environment variables and token limits.

## Reporting

Report only high-confidence issues. For each issue include:

- Severity.
- File and line.
- The Atomic Agents rule being violated.
- A concrete fix.

Keep clean reviews short. If no framework-specific issues are found, say that and note any review scope limits.
