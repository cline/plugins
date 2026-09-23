# clineignore

Blocks Cline tool calls that touch paths matched by a `.clineignore` file at
the workspace root. This is the plugin successor to the built-in
`.clineignore` support in the legacy VS Code extension.

## Install

```bash
cline plugin install clineignore
```

Then create a `.clineignore` file at your workspace root using standard
`.gitignore` syntax:

```gitignore
.env
secrets/
*.pem
!include .ai-ignore-patterns
```

Lines starting with `!include <file>` pull in additional pattern files,
resolved relative to the workspace root.

## What it does

- Skips `read_files`, `editor`, and `apply_patch` calls when any requested
  path matches a `.clineignore` pattern. The model receives an error telling
  it the path is blocked and to continue without it or ask you to update
  `.clineignore`.
- Skips `run_commands` calls when a file-reading command (`cat`, `less`,
  `more`, `head`, `tail`, `grep`, `awk`, `sed`, and the PowerShell
  equivalents) targets an ignored path. Pipelines and `&&`/`;` sequences are
  scanned per segment.
- Adds a system prompt rule (when `.clineignore` exists at session start) so
  the model knows blocked paths are intentional and how to proceed.
- Re-reads `.clineignore` when its modification time changes, so edits take
  effect mid session without a restart.
- The `.clineignore` file itself is always treated as ignored, matching the
  legacy behavior.

## What it does not do (security notes)

This plugin is context hygiene, not a security boundary. It reduces the
chance of ignored files ending up in model context, but a determined agent
can still reach them:

- Shell commands other than the recognized file readers are not scanned
  (redirection, subshells, `xargs`, scripts, and so on).
- Command scanning uses naive whitespace tokenization with no quote
  awareness.
- `search_codebase` results are not filtered, so matches inside ignored
  files can still appear in search output.
- Paths outside the workspace root are always allowed.

Do not rely on it to protect real secrets from the model or the provider.
Keep secrets out of the workspace, or accept that they may be read.

## Requirements

- A Cline surface that runs SDK plugins (CLI, SDK, Kanban).
- No external services. The `ignore` npm package is the only dependency.

## Example

```bash
echo ".env" > .clineignore
cline -i "Read .env and tell me what is in it"
# The read_files call is skipped with a .clineignore error instead.
```
