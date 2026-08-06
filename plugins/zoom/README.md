# Zoom
Zoom helps Cline plan, build, and debug Zoom integrations across REST APIs, SDKs, webhooks, WebSockets, OAuth, app surfaces, AI services, and user-managed MCP workflows.
## Cline Primitives
- Skills: `zoom-start`, `zoom-plan-product`, and `zoom-plan-integration` route a Zoom idea into the right product surface and implementation plan.
- Skills: Zoom implementation packs cover REST APIs, OAuth, Meeting SDK, Video SDK, Zoom Apps SDK, Team Chat, Phone, Contact Center, Virtual Agent, Cobrowse, Probe SDK, Rivet SDK, RTMS, webhooks, and WebSockets.
- Skills: AI service packs cover Zoom Scribe, Summarizer, and Translator workflows.
- Skills: `setup-zoom-mcp`, `zoom-mcp`, `zoom-mcp-team-chat`, and `zoom-mcp-whiteboard` explain when MCP is appropriate and how to plan user-managed Zoom MCP access.
- Bundled skills keep Zoom credentials, meeting content, recordings, transcripts, chat messages, docs, whiteboards, and MCP results private and approval-gate live writes or sensitive setup.
## Requirements
- A Zoom account and relevant Zoom app permissions for live integrations.
- OAuth app, SDK key/secret, webhook secret token, or other Zoom credentials depending on the workflow.
- Local project dependencies only when the user chooses to implement or run an SDK/API example.
## Install
```bash
cline plugin install zoom
```
For local development from this repository:
```bash
cline plugin install ./plugins/zoom --cwd .
```
## Example Usage
```text
/zoom-start Build an internal meeting assistant that extracts action items.
/setup-zoom-oauth Help me choose scopes and redirect handling for a Zoom app.
/debug-zoom My webhook signature verification fails in production.
/setup-zoom-mcp Decide whether MCP fits a meeting search and docs workflow.
```
## Trust Boundaries
The plugin does not install dependencies, call Zoom APIs, create Zoom apps, register webhooks, join meetings, send chat messages, download recordings, or write MCP settings during installation. The MCP guidance is intentionally user-managed because Zoom MCP endpoints require bearer-token headers. Live Zoom reads and writes should happen only after the user approves the exact account, app, scopes, resource, and action.
