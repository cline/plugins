---
name: atomic-agents-explore-codebase
description: Use when mapping, explaining, tracing, or understanding an existing Python codebase that imports atomic_agents, including agents, schemas, tools, context providers, memory, and orchestration.
---

# Explore Atomic Agents Codebase

Use this skill when the user asks how an existing Atomic Agents project works.

## Discovery

Read narrowly and cite file lines. Start with:

- `pyproject.toml` for package layout and dependencies.
- Entry points such as `main.py`, `__main__.py`, API handlers, CLI scripts, or workflow modules.
- Imports from `atomic_agents`.
- `AtomicAgent[` construction sites.
- `BaseIOSchema` subclasses.
- `BaseTool[` subclasses.
- `BaseDynamicContextProvider` subclasses.
- `SystemPromptGenerator`, `ChatHistory`, and `register_hook` usage.

Use `rg -n` before opening large files.

## Capture

For each component, record:

- Purpose.
- File and line.
- Input and output schema names.
- Provider and model wiring when visible.
- History behavior.
- Registered tools.
- Registered context providers.
- Hook registrations.
- Orchestration pattern.

## Output Shape

Return a concise map:

```md
## Codebase Map: <scope>

### Overview
<two or three sentences>

### Entry Points
- `<path>:<line>` - <role>

### Agents
- `<path>:<line>` - <name or variable>. In=<schema>, Out=<schema>, history=<yes/no/shared>, tools=<names>.

### Tools
- `<path>:<line>` - <tool>, external dependencies, sync/async behavior.

### Schemas
- `<path>:<line>` - <schema>, role, notable fields.

### Context Providers
- `<path>:<line>` - <title>, data source, registered on <agent>.

### Orchestration
<pipeline, router, parallel fan-out, supervisor, or other pattern>

### Essential Reading
- `<path>:<line>` - <why this file matters>
```

## Boundaries

- Describe what exists before proposing changes.
- Do not run the app just to inspect it.
- Do not install dependencies unless the user asks.
- Flag interesting anomalies separately from confirmed bugs.
