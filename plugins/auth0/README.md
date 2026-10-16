# auth0

Skills for adding, migrating, operating, and reviewing Auth0 authentication and authorization in application code.

## What It Adds

This plugin installs 43 Auth0 skills covering:

- Auth0 quickstart, migration, MFA, CLI, security review, Universal Login branding, custom domains, and ACUL screen generation.
- Browser and server-rendered web app integrations for SPA JS, React, Vue, Angular, Next.js, Nuxt, Express, Fastify, Flask, Laravel, PHP, Java MVC, and ASP.NET Core.
- API protection workflows for Express, Go, Spring Boot, FastAPI, Fastify, PHP, Laravel, and ASP.NET Core JWT bearer validation.
- Native and hybrid app integrations for Android, Swift, React Native, Expo, Ionic React, Ionic Angular, Ionic Vue, Flutter native/web, .NET MAUI, .NET Android, .NET iOS, WinForms, and WPF.
- Auth0 reference material, helper scripts, and templates bundled inside the relevant skills for framework setup, tenant configuration, token validation, and troubleshooting.

## Install

```bash
cline plugin install auth0
```

For local development from this repository:

```bash
cline plugin install ./plugins/auth0 --cwd .
```

## Example Usage

After installation, ask Cline:

```text
Add Auth0 login to this app and protect the API route that returns account data.
```

or:

```text
Review this Auth0 integration for callback URL, token storage, and API authorization issues.
```

## Requirements

- An Auth0 tenant for real configuration work.
- Auth0 application or API values such as domain, client ID, audience, callback URL, and logout URL.
- Framework package managers such as npm, pnpm, pip, composer, dotnet, Gradle, Swift Package Manager, CocoaPods, or Flutter only when modifying that kind of project.
- Auth0 CLI only when the user wants Cline to create or modify tenant resources from the terminal.
- Optional external MCP servers, such as Figma or Cloudflare, only for workflows that explicitly use those integrations.

## Trust Boundaries

The plugin itself only installs skills. The skills may guide Cline to edit application code, write environment examples, run package installs, use the Auth0 CLI, call the Auth0 Management API, or use connected MCP servers as part of a user-requested task. They require confirmation before changing tenant resources, DNS records, callback/logout URLs, MFA policies, custom domains, package dependencies, or live auth flows. Secrets should stay in environment files or secret managers and should not be printed, committed, or hardcoded.
