---
name: auth0-quickstart
description: Use when adding authentication or login to any app - detects your stack (React, Next.js, Vue, Nuxt, Angular, Express, Fastify, FastAPI, ASP.NET Core, React Native, Expo, Android, Swift), sets up an Auth0 account if needed, and routes to the correct SDK setup workflow.
license: Apache-2.0
metadata:
  author: Auth0 <support@auth0.com>
  version: '1.0.0'
  openclaw:
    emoji: "\U0001F510"
    homepage: https://github.com/auth0/agent-skills
    requires:
      bins:
        - auth0
    os:
      - darwin
      - linux
    install:
      - id: brew
        kind: brew
        package: auth0/auth0-cli/auth0
        bins: [auth0]
        label: 'Install Auth0 CLI (brew)'
---

# Auth0 Quickstart

Detect your framework and get started with Auth0 authentication.

---

## Safety Gate

Before installing packages, running Auth0 CLI login, creating or updating Auth0 applications/APIs, changing branding, writing environment files, or starting live browser auth flows:

- Show the detected app type and the skill you will route to.
- Show the tenant, resource type, callback/logout URLs, audience, scopes, and files that would change.
- Ask for explicit approval before making the change.
- Treat tenant changes as production changes unless the user says otherwise.
- Never print access tokens, client secrets, or existing `.env` contents.

## Step 1: Detect Your Framework

Run this command to identify your framework:

```bash
# Check package.json dependencies (Node.js projects)
cat package.json | grep -E "react|next|vue|nuxt|angular|express|fastify|@nestjs|expo"

# Or check project files
ls -la | grep -E "angular.json|vue.config.js|next.config|app.json|Package.swift|build.gradle"
```

Framework Detection Table:

| Framework | Detection | Skill to Use |
|-----------|-----------|--------------|
| React (Vite/CRA) | `"react"` in package.json, no Next.js | `auth0-react` |
| Next.js | `"next"` in package.json | `auth0-nextjs` |
| Vue.js | `"vue"` in package.json, no Nuxt | `auth0-vue` |
| Nuxt | `"nuxt"` in package.json | `auth0-nuxt` |
| Angular | `angular.json` exists or `"@angular/core"` | `auth0-angular` |
| Express.js web app | `"express"` in package.json with views, sessions, or server-rendered pages | `auth0-express` |
| Express.js API | `"express"` in package.json with API routes, no view engine, or a request to protect API endpoints | `express-oauth2-jwt-bearer` |
| Fastify (web app) | `"fastify"` in package.json, has `@fastify/view` | `auth0-fastify` |
| Fastify (API) | `"fastify"` in package.json, no view engine | `auth0-fastify-api` |
| React Native CLI | `"react-native"` in package.json, no Expo managed workflow | `auth0-react-native` |
| Expo | `"expo"` in package.json | `auth0-expo` |
| Flask | `"flask"` in requirements.txt, Pipfile, or pyproject.toml | `auth0-flask` |
| FastAPI API | `"fastapi"` in requirements.txt, Pipfile, or pyproject.toml | `auth0-fastapi-api` |
| Laravel web app | `artisan` exists and routes render web pages | `auth0-laravel` |
| Laravel API | `artisan` exists and routes are API-only | `auth0-laravel-api` |
| Go API | `go.mod` exists and project serves HTTP APIs | `go-jwt-middleware` |
| Spring Boot API | `pom.xml` or `build.gradle` with Spring Boot API routes | `auth0-springboot-api` |
| ASP.NET Core web app | `*.csproj` exists, has `Views/` or `Pages/` folder | `auth0-aspnetcore-authentication` |
| ASP.NET Core API | `*.csproj` exists with controllers/minimal API endpoints and no pages/views | `auth0-aspnetcore-api` |
| Android | `build.gradle`/`settings.gradle` with Android app | `auth0-android` |
| Swift/iOS/macOS | `Package.swift`, `.xcodeproj`, or `.xcworkspace` | `auth0-swift` |
| Flutter native | `pubspec.yaml` with Flutter mobile targets | `auth0-flutter-native` |
| Flutter web | `pubspec.yaml` with Flutter web target | `auth0-flutter-web` |

Don't see your framework? See Additional Frameworks below.

---

## Step 2: Auth0 Account Setup

### Install Auth0 CLI

Ask before installing the Auth0 CLI. If the CLI is missing, prefer showing the install command for the user's platform and let the user approve running it.

macOS/Linux:
```bash
brew install auth0/auth0-cli/auth0
```

Windows:
```bash
scoop install auth0
# Or: choco install auth0-cli
```

Full installation guide: See [CLI Reference](references/cli.md#installation)

### Login to Auth0

Ask before starting `auth0 login`; it opens a browser and changes local Auth0 CLI auth state.

```bash
auth0 login
```

This opens your browser to authenticate with Auth0.

---

## Step 3: Create Auth0 Application

Do not run these commands automatically. Use them as examples after the user confirms the target tenant, application type, callback/logout URLs, and whether the tenant is development, staging, or production.

Choose application type based on your framework:

Single Page Applications (React, Vue, Angular):
```bash
auth0 apps create --name "My App" --type spa \
  --auth-method None \
  --callbacks "http://localhost:3000" \
  --logout-urls "http://localhost:3000" \
  --metadata "created_by=agent_skills"
```

Regular Web Apps (Next.js, Nuxt, Express, Fastify):
```bash
auth0 apps create --name "My App" --type regular \
  --callbacks "http://localhost:3000/api/auth/callback" \
  --logout-urls "http://localhost:3000" \
  --metadata "created_by=agent_skills"
```

Native Apps (React Native):
```bash
auth0 apps create --name "My App" --type native \
  --auth-method None \
  --callbacks "myapp://callback" \
  --logout-urls "myapp://logout" \
  --metadata "created_by=agent_skills"
```

Get your credentials:
```bash
auth0 apps list          # Find your app
auth0 apps show <app-id> # Get client ID and secret
```

More CLI commands: See [CLI Reference](references/cli.md)

### Apply Branding (Optional)

Ask before changing tenant branding. Show the exact colors, logo URL, favicon URL, and target tenant first.

After creating your application, apply branding so the Auth0 Universal Login page matches your app:

```bash
auth0 ul update \
  --accent "#YOUR_BRAND_COLOR" \
  --background "#YOUR_BACKGROUND_COLOR" \
  --logo "https://your-app.com/logo.png" \
  --favicon "https://your-app.com/favicon.ico"
```

This ensures users see your app's branding on the login screen instead of the default Auth0 branding. You can also use the `acul-screen-generator` skill for full custom login screen design.

---

## Step 4: Use Framework-Specific Skill

Based on your framework detection, use the appropriate skill:

### Tier 1 Frameworks (Dedicated Skills)

Frontend:
- `auth0-react` - React SPAs (Vite, Create React App)
- `auth0-nextjs` - Next.js (App Router and Pages Router)
- `auth0-vue` - Vue.js 3 applications
- `auth0-nuxt` - Nuxt 3/4 applications
- `auth0-angular` - Angular 12+ applications

Backend:
- `auth0-express` - Express.js web applications
- `auth0-flask` - Flask web applications
- `auth0-fastify` - Fastify web applications
- `auth0-fastify-api` - Fastify API authentication
- `express-oauth2-jwt-bearer` - Node.js/Express API JWT Bearer validation
- `auth0-fastapi-api` - FastAPI API authentication
- `auth0-laravel` - Laravel web app authentication
- `auth0-laravel-api` - Laravel API authentication
- `go-jwt-middleware` - Go API JWT Bearer validation
- `auth0-springboot-api` - Spring Boot API authentication
- `auth0-aspnetcore-authentication` - ASP.NET Core MVC, Razor Pages, Blazor Server web applications
- `auth0-aspnetcore-api` - ASP.NET Core API authentication

Mobile:
- `auth0-react-native` - React Native CLI (bare workflow)
- `auth0-expo` - Expo managed workflow
- `auth0-android` - Android (Kotlin/Java)
- `auth0-swift` - iOS/macOS/tvOS/watchOS/visionOS Swift
- `auth0-flutter-native` - Flutter native mobile apps
- `auth0-flutter-web` - Flutter Web
- `auth0-ionic-react` - Ionic React with Capacitor
- `auth0-ionic-angular` - Ionic Angular with Capacitor
- `auth0-ionic-vue` - Ionic Vue with Capacitor
- `auth0-maui` - .NET MAUI
- `auth0-net-android` - .NET Android
- `auth0-net-ios` - .NET iOS
- `auth0-winforms` - Windows Forms
- `auth0-wpf` - WPF

### Additional Frameworks (Use Auth0 Docs)

Use Auth0 documentation when this plugin does not include a dedicated skill:

Frontend:
- [SvelteKit](https://auth0.com/docs/quickstart/webapp/sveltekit)
- [Remix](https://auth0.com/docs/quickstart/webapp/remix)

Backend:
- [Django (Python)](https://auth0.com/docs/quickstart/webapp/django)
- [Rails (Ruby)](https://auth0.com/docs/quickstart/webapp/rails)

---

## Migration from Other Providers

Migrating from another auth provider? Use the `auth0-migration` skill.

The migration skill covers:
- User export from Firebase, Cognito, Supabase, Clerk, etc.
- Bulk import to Auth0
- Code migration patterns (before/after examples)
- JWT validation updates
- Gradual migration strategies

---

## Reference Documentation

### Environment Variables
Framework-specific environment variable setup:
- [Vite, Create React App, Angular](references/environments.md#single-page-applications-spas)
- [Next.js, Express](references/environments.md#server-side-applications)
- [React Native, Expo](references/environments.md#mobile-applications)

### Auth0 Concepts
Core concepts and troubleshooting:
- [Application Types](references/concepts.md#application-types)
- [Key Terms](references/concepts.md#key-terms)
- [OAuth Flows](references/concepts.md#oauth-flows)
- [Troubleshooting](references/concepts.md#troubleshooting)
- [Security Best Practices](references/concepts.md#security-best-practices)

### CLI Commands
Complete Auth0 CLI reference:
- [CLI Installation](references/cli.md#installation)
- [Creating Applications](references/cli.md#creating-applications)
- [User Management](references/cli.md#user-management)
- [Testing & Debugging](references/cli.md#testing--debugging)
- [Command Quick Reference](references/cli.md#command-quick-reference)

---

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Wrong application type | SPAs need "Single Page Application", server apps need "Regular Web Application", mobile needs "Native" |
| Callback URL not configured | Add your app's callback URL to Allowed Callback URLs in Auth0 Dashboard |
| Using wrong credentials | Client Secret only needed for Regular Web Apps, not SPAs |
| Hardcoding credentials in code | Always use environment variables, never commit secrets to git |
| Not testing locally first | Set up localhost URLs in Auth0 before deploying to production |
| Mixing application types | Don't use SPA SDK for server-side apps or vice versa |

---

## Related Skills

### Core Integration
- `auth0-migration` - Migrate from other auth providers

### SDK Skills
- `auth0-spa-js` - SPA integration
- `auth0-react` - React SPA integration
- `auth0-nextjs` - Next.js integration
- `auth0-vue` - Vue.js integration
- `auth0-nuxt` - Nuxt 3/4 integration
- `auth0-angular` - Angular integration
- `auth0-express` - Express.js integration
- `auth0-flask` - Flask web app integration
- `auth0-fastify` - Fastify web app integration
- `auth0-fastify-api` - Fastify API integration
- `express-oauth2-jwt-bearer` - Node.js/Express API JWT Bearer validation
- `auth0-react-native` - React Native CLI (bare workflow) integration
- `auth0-expo` - Expo (managed workflow) integration
- `auth0-android` - Android (Kotlin/Java) integration
- `auth0-swift` - iOS/macOS (Swift) integration
- `auth0-fastapi-api` - FastAPI API authentication
- `auth0-aspnetcore-authentication` - ASP.NET Core web app authentication
- `auth0-aspnetcore-api` - ASP.NET Core API authentication

### Advanced Features
- `auth0-mfa` - Multi-Factor Authentication
- `auth0-security-review` - Review Auth0 callback URLs, token storage, API authorization, MFA, tenant settings, and auth regressions

---

## References

- [Auth0 Documentation](https://auth0.com/docs)
- [Auth0 Quickstart Guides](https://auth0.com/docs/quickstart)
- [Auth0 CLI Documentation](https://auth0.github.io/auth0-cli/)
- [Auth0 Community Forum](https://community.auth0.com/)
