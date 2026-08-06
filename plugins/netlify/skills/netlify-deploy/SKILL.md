---
name: netlify-deploy
description: Execute and recover Netlify deploys with a preview-first workflow. Use when the user asks to deploy, host, publish, promote a preview to production, inspect deploy output, or recover a failed Netlify deployment.
---

# Netlify Deployment Skill

Guide Netlify deployments using the Netlify CLI with project inspection, explicit user approval for side effects, and deployment-context checks.

## Overview

This skill is focused on deployment execution and recovery. Use `netlify-cli-and-deploy` for general CLI setup, environment-variable management, and local development. This skill helps Cline prepare and run Netlify deployments by:
- Verifying Netlify CLI authentication
- Detecting project configuration and framework
- Confirming site link status before deployment
- Creating preview deploys by default
- Promoting to production only when explicitly requested
- Recovering from build, publish-directory, auth, and site-link failures

Do not run authentication, dependency installation, site-linking, initialization, environment-variable, or deploy commands until the user has explicitly approved the specific action.

## Prerequisites

- Netlify CLI: Available through `npx netlify` or an installed `netlify` binary
- Authentication: Netlify account with active login session
- Project: Valid web project in current directory
- Network access: Deployment requires outbound network calls and should only be attempted when the user asked for it.
- Timeouts: Deployments can take a few minutes. Use appropriate timeout values for CLI commands.

## Authentication Pattern

The skill uses the pre-authenticated Netlify CLI approach:

1. Ask before checking authentication status with `npx netlify status`, because output can include account and site details.
2. If not authenticated, ask before guiding the user through `npx netlify login`
3. Fail gracefully if authentication cannot be established

Authentication uses either:
- Browser-based OAuth (primary): `netlify login` opens browser for authentication
- API Key (alternative): Set `NETLIFY_AUTH_TOKEN` environment variable

## Workflow

### 1. Verify Netlify CLI Authentication

After approval, check whether the user is logged into Netlify:

```bash
npx netlify status
```

Expected output patterns:
- OK Authenticated: Shows logged-in user email and site link status. Redact account details unless needed.
- Not authenticated: "Not logged into any site" or authentication error

If not authenticated, ask before guiding the user:

```bash
npx netlify login
```

This opens a browser window for OAuth authentication. Wait for the user to complete login, then ask before verifying with `netlify status` again.

Alternative: API Key authentication

If browser authentication isn't available, users can set:

```bash
export NETLIFY_AUTH_TOKEN=your_token_here
```

Tokens can be generated at: https://app.netlify.com/user/applications#personal-access-tokens

Do not ask users to paste tokens into chat. Prefer their shell, CI secret store, or Netlify dashboard.

### 2. Detect Site Link Status

From `netlify status` output, determine:
- Linked: Site already connected to Netlify (shows site name/URL)
- Not linked: Need to link or create site

### 3. Link to Existing Site or Create New

If already linked -> Skip to step 4

If not linked, ask before attempting to link by Git remote:

```bash
# Check if project is Git-based
git remote show origin

# If Git-based, extract remote URL
# Format: https://github.com/username/repo or git@github.com:username/repo.git

# Try to link by Git remote
npx netlify link --git-remote-url <REMOTE_URL>
```

If link fails (site does not exist on Netlify), ask before creating a new site:

```bash
# Create new site interactively
npx netlify init
```

This guides the user through:
1. Choosing team/account
2. Setting site name
3. Configuring build settings
4. Creating netlify.toml if needed

### 4. Verify Dependencies

Before deploying, inspect the existing package manager and ask before installing dependencies:

```bash
# For npm projects, only after user approval
npm install

# For other package managers, detect and use the existing project choice
# yarn install, pnpm install, etc.
```

### 5. Deploy to Netlify

Choose deployment type based on context and confirm with the user before running any deploy command:

Preview/Draft Deploy (default for existing sites):

```bash
npx netlify deploy
```

This creates a deploy preview with a unique URL for testing.

Production Deploy (only for explicit production deployments):

```bash
npx netlify deploy --prod
```

This deploys to the live production URL. Require explicit production approval immediately before running it.

Deployment process:
1. CLI detects build settings (from netlify.toml or prompts user)
2. Builds the project locally
3. Uploads built assets to Netlify
4. Returns deployment URL

### 6. Report Results

After deployment, report to the user:
- Deploy URL: Unique URL for this deployment
- Site URL: Production URL (if production deploy)
- Deploy logs: Link to Netlify dashboard for logs
- Next steps: Suggest `netlify open` to view site or dashboard

## Handling netlify.toml

If a `netlify.toml` file exists, the CLI uses it automatically. If not, the CLI will prompt for:
- Build command: e.g., `npm run build`, `next build`
- Publish directory: e.g., `dist`, `build`, `.next`

Common framework defaults:
- Next.js: build command `npm run build`, publish `.next`
- React (Vite): build command `npm run build`, publish `dist`
- Static HTML: no build command, publish current directory

The skill should detect framework from `package.json` if possible and suggest appropriate settings.

## Example Full Workflow

```bash
# 1. Check authentication
npx netlify status

# If not authenticated, ask before opening browser OAuth:
npx netlify login

# 2. Link site (if needed)
# Try Git-based linking first
git remote show origin
npx netlify link --git-remote-url https://github.com/user/repo

# If no site exists, create new one:
npx netlify init

# 3. Install dependencies only after approval
npm install

# 4. Deploy preview after approval
npx netlify deploy

# 5. Deploy to production only if the user explicitly asks for production and approves again
npx netlify deploy --prod
```

## Error Handling

Common issues and solutions:

"Not logged in"
-> Ask before running `npx netlify login`

"No site linked"
-> Ask before running `npx netlify link` or `npx netlify init`

"Build failed"
-> Check build command and publish directory in netlify.toml or CLI prompts
-> Verify dependencies are installed
-> Review build logs for specific errors

"Publish directory not found"
-> Verify build command ran successfully
-> Check publish directory path is correct

## Environment Variables

For secrets and configuration:

1. Never commit secrets to Git
2. Set in Netlify dashboard or through explicitly approved CLI commands
3. Access in builds via `process.env.VARIABLE_NAME`

## Tips

- Use `netlify deploy` (no `--prod`) first to test before production
- Run `netlify open` to view site in Netlify dashboard
- Run `netlify logs` to view function logs (if using Netlify Functions)
- Use `netlify dev` for local development with Netlify Functions

## Reference

- Netlify CLI Docs: https://docs.netlify.com/cli/get-started/
- netlify.toml Reference: https://docs.netlify.com/build/configure-builds/file-based-configuration/

## References

- [CLI commands](references/cli-commands.md)
- [Deployment patterns](references/deployment-patterns.md)
- [netlify.toml guide](references/netlify-toml.md)
