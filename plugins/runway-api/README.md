# runway-api

Runway API skills for Cline users building or operating media generation workflows.

## What It Does

This plugin bundles skills for two related workflows:

- Generating media directly with Runway's API, including text/image/video generation, audio generation, uploads, organization details, and general API calls.
- Integrating Runway features into server-side apps, including compatibility checks, API key setup, video/image/audio endpoints, uploads, real-time avatar characters, document knowledge, and React avatar embeds.

The plugin also includes the Python and Node helper scripts used by the direct-generation skills, plus skill guidance for paid API calls, media uploads, outbound URL fetches, and API-key handling.

## Install

```bash
cline plugin install runway-api
```

For local development from this repository:

```bash
cline plugin install ./plugins/runway-api --cwd .
```

## Requirements

- A Runway developer account with available credits.
- `RUNWAYML_API_SECRET` in the environment or a user-created local `.env` file when making API calls.
- `uv` for the bundled Python generation helper scripts.
- Node.js 20 or newer for the general `use-runway-api` helper script.
- A server-side app when using integration skills. API keys must not be exposed in frontend code.

## Security Notes

Runway operations can spend credits and may upload or generate sensitive media. Cline should confirm paid generation, uploads, organization/account actions, external media URLs, output locations, and production code changes before acting.
