---
name: aidp-connectors-bootstrap
description: First-time setup. Use when the user wants to install or upload the AIDP Spark connectors helper package into an Oracle AI Data Platform Workbench workspace, or has just installed this plugin and asks "how do I set this up", "first-time setup", "install the helpers", or "bootstrap AIDP connectors".
---

# `aidp-connectors-bootstrap` - first-time setup of the helper package in AIDP

## When to use
- The user just installed the plugin and asks "how do I set this up?", "what's the first step?", "install the helpers".
- The user runs a connector skill for the first time and gets `ModuleNotFoundError: No module named 'oracle_ai_data_platform_connectors'`.
- The user explicitly asks to upload the helper package to AIDP.

## Outcome of running this skill
- `/Workspace/Shared/oracle_ai_data_platform_connectors/scripts/oracle_ai_data_platform_connectors/` exists in the user's AIDP workspace, populated from the plugin's local `scripts/` directory.
- The user has run `examples/00_bootstrap_helpers.ipynb` once and it printed `BOOTSTRAP OK`.
- From that point on, connector skills can import the helper package. Individual connectors may still need credentials, network routes, connector JARs, catalog permissions, buckets, volumes, or source-specific setup.

## What Cline should do

### Step 1 - locate the bundled `scripts/` directory

The helper package is bundled with this plugin. Resolve it from the active
skill directory:

```bash
HELPERS_DIR="$SKILL_DIR/../../scripts/oracle_ai_data_platform_connectors"
test -f "$HELPERS_DIR/__init__.py"
```

Confirm the destination workspace and upload path with the user before copying
anything into Workbench.

### Step 2 - create the destination directory in AIDP

If Oracle AIDP Workbench MCP tools are available in the current Cline session,
use the host-provided directory and file upload tools to create:

```
/Workspace/Shared/oracle_ai_data_platform_connectors
/Workspace/Shared/oracle_ai_data_platform_connectors/scripts
```

(If the workspace_id isn't already known from the conversation, ask the user.)

If no AIDP upload tools are available, give the user the local `HELPERS_DIR`
path and ask them to upload that code-only package through the Workbench UI.

### Step 3 - upload the package files

For each `.py` file under `$HELPERS_DIR`, upload to the matching path under
`/Workspace/Shared/oracle_ai_data_platform_connectors/scripts/` using the
available Workbench file upload tool or the user-approved manual process.

The package layout to preserve:
```
oracle_ai_data_platform_connectors/
+-- __init__.py
+-- auth/{__init__,wallet,dbtoken,oci_config,user_principal,secrets}.py
+-- jdbc/{__init__,oracle,runtime_load}.py
+-- rest/{__init__,fusion,epm,essbase}.py
+-- streaming/{__init__,kafka}.py
```

### Step 4 - push the bootstrap notebook to AIDP and run it

Upload `$SKILL_DIR/../../examples/00_bootstrap_helpers.ipynb` to
`Shared/connectors-tests/00_bootstrap_helpers.ipynb` only after the user
approves the path. Then run it in the user's chosen notebook session. The final
cell prints `BOOTSTRAP OK` if everything works.

### Step 5 - confirm

Tell the user:
- Where the helpers landed.
- That connector skills can now import the helper package.
- The next step is to pick a connector (for example `aidp-alh` or
  `aidp-oracle-db`) and supply that connector's env vars, Vault secrets,
  network access, and connector-specific prerequisites.

## Alternative: ask the user to install via PyPI (v1.0+)

Once the package is published to PyPI, this skill should pivot to telling the user to run `%pip install oracle-ai-data-platform-connectors` in any AIDP cell instead of uploading. Until v1.0 ships, the Workspace-upload path above is the only way.

## What NOT to do
- Do not upload anything to `/Workspace/Shared/` without confirming the path with the user (in case they have an existing convention).
- Do not write secrets, .env contents, or PEM keys anywhere in `/Workspace/Shared/`. The helper package is code-only.
- Do not skip the sanity-import notebook - it's how you (and the user) confirm the upload worked, not just that files exist.

## References
- Bootstrap notebook: [`examples/00_bootstrap_helpers.ipynb`](../../examples/00_bootstrap_helpers.ipynb)
- Plugin README install section: [`README.md`](../../README.md)
