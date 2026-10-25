# deja

Gives Cline recall over your own past coding sessions, through the [deja](https://github.com/vshulcz/deja-vu) CLI.

## What It Does

deja indexes the session files that Cline and other coding agents (Claude Code, Codex, Cursor and others) already keep on disk, including sessions from before it was installed. Search is local BM25 with no model calls.

The plugin wires that index into Cline:

- A rule whose content is resolved when a session builds its instructions: a short digest of recent work related to this workspace.
- A message builder that adds history relevant to the prompt you just sent, and after a failed `run_commands` call, the commands that fixed the same error in earlier sessions. Both stay silent when history has nothing to say.
- A `beforeTool` hook that appends what past sessions said about a file when Cline reads or edits it.
- An `onEvent` hook that saves the session to the index when auto-compaction starts, and an `afterRun` hook that marks the run as finished.
- The `deja` MCP server (`deja mcp`) for recall, session digests, file history and past commands.
- A `/deja <query>` slash command and the bundled `deja-history` skill, which tells the agent when to search.

## Install

The plugin calls the `deja` binary and does not ship it. Install it first:

```bash
brew install deja-vu
```

Or:

```bash
curl -fsSL https://raw.githubusercontent.com/vshulcz/deja-vu/main/install.sh | sh
```

`go install github.com/vshulcz/deja-vu/cmd/deja@latest` works too. Then install the plugin:

```bash
cline plugin install deja
```

For local development from this repository:

```bash
cline plugin install ./plugins/deja --cwd .
```

If you already ran `deja install cline-auto`, run `deja uninstall cline-auto` first. That command writes its own copy of this plugin and the same MCP entry, and both copies would add the same recall.

## Example Usage

In an interactive Cline session:

```text
/deja redis timeout
```

Or ask about earlier work and let the plugin and skill pick it up:

```text
Why did we pin the redis client version last month?
```

## Requirements

- The `deja` binary on `PATH`, or its path in `DEJA_BIN`.
- macOS, Linux or Windows.
- No API keys or external services.

## Security Notes

The plugin runs `deja` as a subprocess with `execFileSync`, fixed arguments and the prompt or tool output on stdin, never through a shell. Each call has a timeout (2 to 10 seconds for the automatic paths, 120 seconds for `/deja`, where the first search may build the index). If the binary is missing or a call fails, the plugin returns nothing and the session continues.

deja reads agent session files in place and keeps its index under `~/.cache/deja`. Credentials such as API keys, tokens and passwords are redacted as the index is built. Indexing and search make no network calls. The network is used only by commands you run yourself (`deja update`, `deja sync ssh`, the `deja doctor` version check), by semantic recall if you turn it on (queries go to the embedding endpoint you configure), and by a daily release check from interactive commands that sends no session data. `DEJA_OFFLINE=1` turns that check off.

Recalled text comes from your own past transcripts and is added to model requests. `deja forget` drops sessions from the index, and `~/.config/deja/exclude` skips a project.
