# Netlify CLI Commands Reference

Quick reference for common Netlify CLI commands used in deployments.

These commands can authenticate accounts, link local projects, create sites, expose environment names, upload deploys, or change remote configuration. Ask for explicit user approval before running commands that log in or out, link or unlink a site, create a site, deploy, import/export environment variables, mutate environment variables, invoke functions, or stream logs that may contain sensitive data.

## Authentication

```bash
# Login via browser OAuth
npx netlify login

# Check authentication status and site link
npx netlify status

# Logout
npx netlify logout
```

## Site Management

```bash
# Link current directory to existing site
npx netlify link

# Link by Git remote URL
npx netlify link --git-remote-url <url>

# Create and link new site
npx netlify init

# Unlink from current site
npx netlify unlink

# Open site in Netlify dashboard
npx netlify open

# Open site admin panel
npx netlify open:admin

# Open site in browser
npx netlify open:site
```

## Deployment

```bash
# Deploy preview/draft (safe for testing)
npx netlify deploy

# Deploy to production
npx netlify deploy --prod

# Deploy with specific directory
npx netlify deploy --dir=dist

# Deploy with message
npx netlify deploy --message="Deploy message"

# List all deploys
npx netlify deploy:list
```

## Development

```bash
# Run local dev server with Netlify features
npx netlify dev

# Run local dev server on specific port
npx netlify dev --port 3000
```

## Site Information

```bash
# Get site info
npx netlify sites:list

# Get current site info
npx netlify api getSite --data '{"site_id": "YOUR_SITE_ID"}'
```

## Environment Variables

```bash
# List environment variables
npx netlify env:list

# Set environment variable
npx netlify env:set KEY value

# Get environment variable value
npx netlify env:get KEY

# Import env vars from file
npx netlify env:import .env
```

## Build

```bash
# Show build settings
npx netlify build --dry

# Run build locally
npx netlify build
```

## Functions (Serverless)

```bash
# List functions
npx netlify functions:list

# Invoke function locally
npx netlify functions:invoke FUNCTION_NAME

# Create new function
npx netlify functions:create FUNCTION_NAME
```

## Logs

```bash
# View recent logs from functions and edge functions (defaults to last 10m)
npx netlify logs

# Stream logs in real time
npx netlify logs --follow

# Stream logs for a specific function
npx netlify logs --source functions --function FUNCTION_NAME --follow

# View historical logs for a specific function over a longer window
npx netlify logs --source functions --function FUNCTION_NAME --since 24h

# Include deploy logs alongside function logs
npx netlify logs --source deploy --source functions --since 1h
```

Sources accepted by `--source`: `functions`, `edge-functions`, `deploy`. When omitted, it defaults to `functions` and `edge-functions`. Run `netlify logs --help` for the full option list.

## Troubleshooting Commands

```bash
# Check CLI version
npx netlify --version

# Get help for any command
npx netlify help [command]

# Check status with verbose output
npx netlify status --verbose
```

## Exit Handling

Treat any nonzero exit as a failed command. Inspect stderr, deploy output, and Netlify build logs for the specific cause instead of relying on fixed exit-code meanings.

## Common Flags

- `--json` - Output as JSON
- `--silent` - Suppress output
- `--debug` - Show debug information
- `--force` - Skip confirmation prompts. Avoid this unless the user specifically asks for it and the exact effect is clear.

## Resources

- Full CLI documentation: https://docs.netlify.com/cli/get-started/
- CLI GitHub repository: https://github.com/netlify/cli
