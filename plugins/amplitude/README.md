# amplitude

Amplitude MCP access and product analytics skills for working with charts, dashboards, experiments, feedback, session replays, taxonomy, AI visibility, and instrumentation plans from Cline.

## What It Does

Registers the `amplitude` MCP server. The server uses Streamable HTTP, progressive tool discovery, and OAuth with the user's Amplitude account, then exposes tools for querying and creating Amplitude content such as charts, dashboards, experiments, cohorts, opportunities, feedback, and session replay context.

Installs 26 bundled skills for focused Amplitude workflows:

- Analytics instrumentation: `add-analytics-instrumentation`, `diff-intake`, `discover-event-surfaces`, `instrument-events`, `discover-analytics-patterns`
- Product analysis: `analyze-chart`, `analyze-dashboard`, `create-chart`, `create-dashboard`, `discover-opportunities`, `compare-user-journeys`
- Experiments: `analyze-experiments`, `monitor-experiments`
- Feedback, replay, and reliability: `analyze-feedback`, `debug-replay`, `replay-ux-audit`, `diagnose-errors`, `monitor-reliability`
- Account and executive briefs: `analyze-account-health`, `daily-brief`, `weekly-brief`
- AI product visibility: `analyze-ai-topics`, `investigate-ai-session`, `monitor-ai-quality`, `review-agent-insights`
- Governance: `taxonomy`

## Install

```bash
cline plugin install amplitude
```

For local development from this repository:

```bash
cline plugin install ./plugins/amplitude --cwd .
```

## Example Usage

After installation, ask Cline:

```text
Analyze this Amplitude dashboard and turn it into talking points for tomorrow's product review.
```

or:

```text
Review this checkout PR and produce an Amplitude instrumentation plan for the events we should add.
```

## Requirements

- A Cline build with plugin MCP registration and OAuth follow-up support.
- An Amplitude account with access to the projects and content you want Cline to analyze.
- OAuth authorization for the `amplitude` MCP server after installation or on first use.
- The Amplitude organization must allow MCP access.
- Your Amplitude role needs MCP read permission for analysis workflows and MCP write permission for create or edit workflows.
- Network access to `https://mcp.amplitude.com/mcp?discovery=progressive`.

EU residency users can set `AMPLITUDE_MCP_REGION=eu` before installation, then reinstall the plugin so the plugin-owned MCP settings entry uses `https://mcp.eu.amplitude.com/mcp?discovery=progressive`.

## Security Notes

Amplitude MCP uses your existing Amplitude user permissions. It does not grant extra access, but it can expose product analytics, customer feedback, session replay metadata, experiments, dashboards, and user or account behavior to the model through tool results.

Use least-privilege Amplitude roles where possible. Confirm before asking Cline to create or edit Amplitude content such as charts, dashboards, cohorts, experiments, opportunities, or taxonomy metadata.

Do not paste Amplitude API keys, OAuth tokens, customer identifiers, replay details, or private analytics exports into files that may be committed.

The MCP server is installed as plugin-owned configuration. Removing the plugin removes the `amplitude` entry that this plugin created.
