<img width="1774" height="887" alt="image" src="https://github.com/user-attachments/assets/063c98fa-0067-40fb-af96-3714d8e017a5" />


Official curated plugins for Cline. This repository is the default collection behind Cline CLI slug installs, e.g.:
```bash
# Install the Cline CLI first.
npm i -g cline

# Download a curated plugin from this repository.
cline plugin install nanobanana
```

Each plugin lives in `plugins/<slug>`. The directory name is the install keyword, so `plugins/web-search` installs with `cline plugin install web-search`.

## Plugins

| Plugin | What it adds |
| --- | --- |
| `agent-browser` | Web and Electron browser automation via the agent-browser CLI skill. |
| `agents-squad` | Background subagents with presets, skills, and shared handoffs. |
| `background-terminal` | Long-running shell jobs with polling and cleanup tools. |
| `branch-protector` | A hook that blocks protected branch pushes unless explicitly allowed. |
| `bundled-skills-demo` | A package plugin that proves bundled skill discovery works. |
| `custom-compaction` | Provider message compaction through a plugin message builder. |
| `clickhouse-data-analyst` | ClickHouse data analyst skill with supporting analysis and ClickHouse sub-skills. |
| `env-blocker` | A hook that blocks reads of secret `.env` files. |
| `gitignore-read-files-guard` | A hook that blocks file access to `.gitignore` ignored paths. |
| `goal` | Completion nudges for active goals with a slash command and completion tool. |
| `intercom-support-triage-slack` | Intercom conversation triage tools for support workflows. |
| `linear` | Linear SDK scripting skill for issue, project, team, cycle, and comment workflows. |
| `mac-notify` | macOS notifications when a Cline run completes. |
| `nanobanana` | Image generation through OpenRouter and Gemini image models. |
| `nvidia` | NVIDIA AI, GPU, robotics, simulation, Omniverse, and Physical AI workflow skills. |
| `speak` | Speaks completed Cline replies with ElevenLabs text to speech. |
| `typescript-lsp` | TypeScript language service `goto_definition` support. |
| `weather-metrics` | Demo weather tool plus runtime metrics hooks. |
| `web-search` | Exa-backed web search as a Cline tool. |

## Install From Source

For local development, install one plugin directory at a time:

```bash
cline plugin install ./plugins/web-search --cwd .
```

## Contributing

See `CONTRIBUTING.md`. Run validation before opening a PR:

```bash
npm run validate
```

## License

[Apache 2.0 © 2026 Cline Bot Inc.](./LICENSE)
