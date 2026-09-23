# atomic-agents

Skills for building, exploring, and reviewing Python applications that use the Atomic Agents framework.

## What It Adds

- `atomic-agents-framework` for core framework concepts, imports, provider wiring, and project structure.
- `atomic-agents-new-app` for scaffolding a small runnable project.
- `atomic-agents-create-schema`, `atomic-agents-create-agent`, `atomic-agents-create-tool`, and `atomic-agents-create-context-provider` for common authoring workflows.
- `atomic-agents-explore-codebase` for mapping existing Atomic Agents projects with file references.
- `atomic-agents-review-code` for framework-specific review of schemas, agents, tools, providers, memory, hooks, and orchestration.

## Install

```bash
cline plugin install atomic-agents
```

For local development from this repository:

```bash
cline plugin install ./plugins/atomic-agents --cwd .
```

## Example Usage

After installation, ask Cline:

```text
Review this Atomic Agents project for framework-specific issues before I open a PR.
```

or:

```text
Scaffold a new Atomic Agents app for classifying support tickets.
```

## Requirements

- Python 3.12 or newer for Atomic Agents projects that use current generic syntax.
- The `atomic-agents`, `instructor`, and provider SDK packages in the target project.
- Provider credentials only when running live agent calls or integration tests.
- `uv` or a Python virtual environment tool when scaffolding or installing a new app.

## Trust Boundaries

The plugin itself only installs skills. The skills may ask Cline to create project files, install Python dependencies, run tests, or call live LLM providers as part of the user's requested workflow. They require confirmation before creating a new project scaffold, running dependency installs, executing integration tests against a real provider, or using provider API keys.
