# Benchmark Versions Reference

Use this reference when the user asks about the current benchmark version or wants to query against a different version.

## Fetching the active version

The active version is returned by `compensation:get:plan` as `benchmark_version`:
- `id` -- use as `benchmark_version_id` in `compensation:get:benchmark`
- `version` (e.g. `"v2.1"`)
- `created` -- ISO timestamp; format as `Month YYYY` for display
- `description`

## Listing all available versions

```
call_tool({"name": "compensation__list__benchmark_versions", "arguments": {}})
```

## Presenting versions to the user

```
## Benchmark Version: [Company Name]

Current version: v[major].[minor] -- released [Month YYYY]
[description if present]

### Available Versions

| Version | Released     | Description    |
|---------|--------------|----------------|
| v2.1 <- | Jan 2024 | Q1 2024 update |
| v2.0    | Oct 2023     | H2 2023 release |
| v1.0    | Jun 2023     | Initial release |
```

Mark the current version with bold and a <- indicator.

## Using a different version

If the user selects a version, pass that version's `id` as `benchmark_version_id` to `compensation:get:benchmark` in Step 4.

If only one version is available, confirm it without a table.
