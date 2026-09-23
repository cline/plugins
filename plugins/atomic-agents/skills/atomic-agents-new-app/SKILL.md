---
name: atomic-agents-new-app
description: Use when scaffolding a new Atomic Agents Python project with pyproject.toml, environment template, package layout, first agent, and runnable entry point.
---

# New Atomic Agents App

Use this skill when the user wants to start a new Atomic Agents project from scratch.

## Confirm First

Before creating files, confirm:

- Project name.
- Provider choice.
- Agent purpose.
- Whether to use `uv` or a virtual environment.
- Target directory.

Do not create files or run installs until the user approves the scaffold plan.

## Scaffold Shape

Use this layout unless the user asks otherwise:

```text
<project-name>/
  pyproject.toml
  .env.example
  .gitignore
  README.md
  <package_name>/
    __init__.py
    main.py
```

Use Python `>=3.12`. Include `atomic-agents`, `instructor`, `python-dotenv`, `rich`, and the chosen provider SDK or Instructor extra. Include `pytest` and `ruff` as development dependencies.

## Entry Point

The starter `main.py` should:

- Load `.env`.
- Create an Instructor-wrapped provider client.
- Build an `AtomicAgent[BasicChatInputSchema, BasicChatOutputSchema]`.
- Use `ChatHistory` for a simple REPL.
- Keep API keys in environment variables.
- Exit cleanly on empty input, `quit`, or `exit`.

## Safety

- Write `.env.example`, not `.env`, unless the user explicitly asks.
- Never write real API keys into files.
- Ask before running `uv sync`, `pip install`, or any live provider call.
- Unit-check imports before attempting integration tests.

## Verify

After writing files, run a no-network import check if dependencies are already available:

```bash
python -m compileall <package_name>
```

If dependencies are not installed, tell the user the install command instead of running it without approval.

## Hand Off

End with:

- How to install dependencies.
- Which environment variable to set.
- How to run the app.
- Suggested next skill for the next step, such as `atomic-agents-create-schema` or `atomic-agents-create-tool`.
