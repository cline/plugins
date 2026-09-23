---
name: duckdb-setup
description: >
  Check the DuckDB CLI and install or update DuckDB extensions. Each argument is
  either a plain extension name (installs from core) or name@repo
  (e.g. magic@community). Pass --update to update extensions instead of installing.
---

Arguments: use the requested extension names or update mode from the current user request.

Each extension argument has the form `name` or `name@repo`.
- `name` -> `INSTALL name;`
- `name@repo` -> `INSTALL name FROM repo;`

## Step 1 - Locate DuckDB

```bash
DUCKDB=$(command -v duckdb)
```

If not found, tell the user DuckDB is not installed and ask whether they want Cline to install it now:

> DuckDB is not installed. Install it first with one of:
> - macOS:   `brew install duckdb`
> - Linux:   `curl -fsSL https://install.duckdb.org | sh`
> - Windows: `winget install DuckDB.cli`
>
> Continue with the matching install command?

If the user agrees, detect the platform and run the matching command. If they decline, stop and tell them to re-run `duckdb-setup` after installing DuckDB.

## Step 2 - Check for --update flag

If the user requested `--update`, remove it from the argument list and set mode to update.
Otherwise mode is install.

## Step 3 - Build and run statements

Install mode:

If no extension arguments were requested, report the DuckDB CLI path and version, then stop:

```bash
"$DUCKDB" --version
```

Parse each remaining argument:
- If it contains `@`, split on `@` -> `INSTALL <name> FROM <repo>;`
- Otherwise -> `INSTALL <name>;`

Run all in a single DuckDB call:

```bash
"$DUCKDB" :memory: -c "INSTALL <ext1>; INSTALL <ext2> FROM <repo2>; ..."
```

Before running extension installs, show the exact extension names and repositories that will be installed and ask for confirmation. Community repositories and extension updates can download code, so do not run them silently.

Update mode:

First, check if the DuckDB CLI itself is up to date:

```bash
CURRENT=$(duckdb --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+')
LATEST=$(curl -fsSL https://duckdb.org/data/latest_stable_version.txt)
```

- If `CURRENT` == `LATEST` -> report DuckDB CLI is up to date.
- If `CURRENT` != `LATEST` -> ask the user:
  > DuckDB CLI is outdated (installed: `CURRENT`, latest: `LATEST`). Upgrade now?

  If the user agrees, detect the platform and run the appropriate upgrade command:
  - macOS (`brew` available): `brew upgrade duckdb`
  - Linux: `curl -fsSL https://install.duckdb.org | sh`
  - Windows: `winget upgrade DuckDB.cli`

Then update extensions:

- No extension names -> update all: `UPDATE EXTENSIONS;`
- With extension names -> update in a single call (ignore `@repo`):
  `UPDATE EXTENSIONS (<name1>, <name2>, ...);`

```bash
"$DUCKDB" :memory: -c "UPDATE EXTENSIONS;"
# or
"$DUCKDB" :memory: -c "UPDATE EXTENSIONS (<ext1>, <ext2>, ...);"
```

Before updating extensions, show the exact update scope and ask for confirmation.

Report success or failure after the call completes.
