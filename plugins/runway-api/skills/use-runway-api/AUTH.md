# Auth Setup

Use environment variables for direct Runway API actions. The API key must never appear in the chat.

## Default setup

1. Open the API keys page: `https://dev.runwayml.com/settings/api-keys`
2. Create or copy an API key
3. Set it in the environment that launches Cline, or in a user-created local env file that is ignored by git

Current shell before launching Cline:

```bash
export RUNWAYML_API_SECRET=YOUR_KEY_HERE
```

For a persistent setup, ask the user to edit their shell profile or secret manager locally. Do not write API keys into shell profiles automatically.

Replace `YOUR_KEY_HERE` locally in the terminal. Never paste the key into the chat.

## Verify

```bash
node <skill-dir>/scripts/runway-api.mjs auth status
```

`<skill-dir>` is the absolute directory of the `SKILL.md` you are reading - see the Runtime Location section in `SKILL.md` for how to resolve it.

If `authenticated` is still `false`, restart Cline or launch it from a shell that already has `RUNWAYML_API_SECRET` set.

## Non-production environments

Set a stage-specific key (preferred) and/or override the base URL:

```bash
export RUNWAY_SKILLS_API_SECRET_STAGE=YOUR_STAGE_KEY
export RUNWAY_SKILLS_BASE_URL=https://api.dev-stage.runwayml.com
```

With `--stage` on any command, the CLI prefers `RUNWAY_SKILLS_API_SECRET_STAGE` and falls back to `RUNWAY_SKILLS_API_SECRET` or `RUNWAYML_API_SECRET`.

## Notes

- API keys require prepaid credits to work.
- `RUNWAY_SKILLS_BASE_URL` defaults to `https://api.dev.runwayml.com` (production) or `https://api.dev-stage.runwayml.com` when `--stage` is passed.
- `auth status` verifies that the current environment can reach the API successfully.
