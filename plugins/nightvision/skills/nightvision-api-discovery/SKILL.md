---
name: nightvision-api-discovery
description: Guide for agents to help users extract OpenAPI specs from source code using NightVision API Discovery. Use when running swagger extract, identifying framework support, troubleshooting extraction, handling unresolved variables, comparing API specs, or understanding Code Traceback.
---

# NightVision API Discovery

Use this skill when helping users generate OpenAPI specifications from their source code using `nightvision swagger extract`. API Discovery performs static analysis - no running application or compilation needed - and annotates the spec with source file paths and line numbers (Code Traceback) so that vulnerabilities found during DAST scans trace back to exact code locations.

## Safety and Authorization

- Ask before running NightVision CLI commands, uploading generated specs, or attaching specs to a NightVision target.
- Treat generated OpenAPI specs as potentially sensitive because they may expose private endpoints, internal path names, source locations, or environment-derived route prefixes.
- Do not read or print secret values from `.env`, CI config, credentials files, or `nv.config`; use placeholders and ask the user to fill sensitive replacements.
- Keep generated specs, diagnostics, and `nv.config` out of git unless the user approves committing them.

## Agent workflow

When a user asks to extract or document their API:

1. Check prerequisites - verify the NightVision CLI is available (`nightvision --help`)
2. Examine the repo - identify the backend language and web framework to determine the `--lang` flag and whether the framework is supported (see [references/framework-support.md](references/framework-support.md))
3. Run extraction - execute `nightvision swagger extract` with the appropriate flags. On success, the CLI prints `"Swagger file extracted successfully."` and writes the spec to the output path (default: `openapi-spec.yml`)
4. Review the output - read the generated spec to check completeness. Handle unresolved variables if `nv.config` was created alongside the spec
5. Compare coverage - if the user has an existing spec, run `nightvision swagger diff` to show what was discovered vs. what was documented
6. Upload to target - attach the spec to a NightVision target for scanning

Related skills: Use `nightvision-scan-configuration` for target/auth setup, `nightvision-ci-cd-integration` for pipeline integration, `nightvision-scan-triage` for interpreting scan results.

## Language flags

| Language | Flag | Frameworks |
|----------|------|------------|
| Python | `--lang python` | Django, DRF, Flask, Flask-RESTful, FastAPI |
| Java | `--lang java` | Spring Boot, JAX-RS/Jersey, Micronaut, Java EE/Jakarta EE |
| JavaScript | `--lang js` | Express, NestJS, Fastify |
| C# | `--lang dotnet` | ASP.NET Core (controllers, minimal APIs) |
| Go | `--lang go` | Gin, httprouter, net/http (experimental) |
| Ruby | `--lang ruby` | Rails, Grape |

See [references/framework-support.md](references/framework-support.md) for detailed component coverage per framework.

## Running extraction

```bash
# Basic extraction (output defaults to openapi-spec.yml)
nightvision swagger extract . --lang python

# Specify output file and format
nightvision swagger extract . --lang java -o api-spec.json --file-format json

# Extract and upload directly to a NightVision target
nightvision swagger extract . -t my-api -p my-project --lang python

# Extract without uploading
nightvision swagger extract . -o openapi-spec.yml --lang java --no-upload

# Scan multiple source directories
nightvision swagger extract ./service-a ./service-b --lang python

# Extend an existing spec (add discovered endpoints to it)
nightvision swagger extract . --lang python --extend existing-spec.yml

# Exclude directories from analysis
nightvision swagger extract . --lang python --exclude vendor,generated

# Include code snippets in the spec (useful for debugging)
nightvision swagger extract . --lang python --dump-code
```

### Extraction fallback for CI

Extraction can fail if language detection fails or the framework isn't supported. Always guard against this in pipelines:

```bash
nightvision swagger extract . -o discovered-openapi-spec.yml --lang java --no-upload || true
if [ -e discovered-openapi-spec.yml ]; then
  cp discovered-openapi-spec.yml openapi-spec.yml
else
  cp backup-openapi-spec.yml openapi-spec.yml
fi
nightvision target update "$TARGET" -p "$PROJECT" --spec-file openapi-spec.yml
```

## Handling unresolved variables

When static analysis can't resolve a variable (e.g., an API prefix read from an environment variable), it appears as a literal placeholder in the spec. NightVision generates an `nv.config` file to fix this.

Steps:
1. Run extraction - if unresolved variables exist, `nv.config` is created alongside the spec (in the first source directory passed to the command)
2. Open `nv.config` - find the `replacements` object with `null` values
3. Replace `null` with non-secret values from ordinary app config, or with safe placeholders when the value comes from env vars, CI secrets, credentials, or other secret stores. Ask the user to provide sensitive replacements instead of reading secret files.
4. Re-run extraction - the tool reads `nv.config` and substitutes the values. You can also use `-c` / `--config` to explicitly specify the config file path: `nightvision swagger extract . --lang python -c path/to/nv.config`

```json
// nv.config example
{
  "replacements": {
    "Microsoft.AspNetCore.Builder.WebApplication.Services...ApiPrefix": null
  }
}
```

The agent should help the user find non-secret replacement values from application configuration such as `appsettings.json` or checked-in framework settings. Do not search `.env`, credential files, CI secret definitions, or key stores for replacement values; ask the user for a safe value or placeholder and document where they should provide the real value.

## Comparing API specs

Use `swagger diff` to measure coverage or detect breaking changes:

```bash
# Summary diff (paths and schemas counts)
nightvision swagger diff original-spec.yml discovered-spec.yml

# Show only path-level changes (endpoints added/removed/modified)
nightvision swagger diff original-spec.yml discovered-spec.yml --paths

# Show only schema changes
nightvision swagger diff original-spec.yml discovered-spec.yml --schemas

# Show the full diff (paths and schemas together, with details)
nightvision swagger diff original-spec.yml discovered-spec.yml --full-diff

# Save diff output to file
nightvision swagger diff original-spec.yml discovered-spec.yml -o diff-report.txt
```

Common use cases:
- Coverage analysis - compare a hand-written spec against the discovered one to find undocumented shadow APIs
- PR checks - diff specs from the base branch vs. PR branch to detect breaking API changes
- Audit - verify that all endpoints are documented

## Detecting existing specs

Search the codebase for existing OpenAPI/Swagger files. The `detect` command takes no positional arguments - use `-p` to specify the root folder:

```bash
# Detect project roots in the current directory
nightvision swagger detect

# Detect in a specific directory
nightvision swagger detect -p ./path/to/code

# Save detection results as JSON
nightvision swagger detect -o detection-results.json
```

## Code Traceback

The generated spec includes `x-source` annotations on each endpoint with the file path and line number where the route is declared. When this spec is used for DAST scanning:

- Vulnerabilities found by NightVision link directly to the source code
- GitHub Security Alerts, Azure Boards work items, and Jenkins Warnings show the exact file and line
- Developers see where to fix, not just what to fix

This is why using NightVision-generated specs (vs. hand-written ones) significantly improves the triage experience.

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| No endpoints found | Wrong `--lang` flag, or unsupported framework | Verify the framework is supported, check `--lang` value |
| Unresolved variables in paths | Config values read from env vars without defaults | Fill in `nv.config` replacements and re-run |
| Incomplete routes | Custom routing, non-standard framework usage | NightVision relies on standard framework patterns; custom routing may not be detected |
| Extraction fails entirely | Syntax errors in source, missing files | Use `--diagnostics` to get language-level error details |
| Spec missing sub-routes | Code in subdirectories not scanned | Pass multiple paths: `nightvision swagger extract ./src ./lib` |

For unsupported frameworks or components, contact support@nightvision.net.
