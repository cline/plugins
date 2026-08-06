#!/usr/bin/env python3
"""
Forge Connector Scaffold Script

Creates a new Forge app with graph:connector module boilerplate:
  - manifest.yml with graph:connector module, scopes, and functions
  - src/index.ts with onConnectionChangeHandler and validateConnectionHandler
  - package.json updated with @forge/teamwork-graph dependency

Usage:
    python3 -m scripts.scaffold_connector \
        --name my-connector \
        --connector-name "My Service" \
        --object-type atlassian:document \
        --dev-space-id <id> \
        --directory /path/to/parent \
        [--has-form-config] \
        [--api-url https://api.example.com]

Run from the skill directory (the directory containing SKILL.md).
"""

import argparse
import json
import os
import subprocess
import sys
import textwrap
from pathlib import Path


VALID_OBJECT_TYPES = [
    "atlassian:document",
    "atlassian:message",
    "atlassian:work-item",
    "atlassian:project",
    "atlassian:space",
    "atlassian:design",
    "atlassian:repository",
    "atlassian:pull-request",
    "atlassian:commit",
    "atlassian:branch",
    "atlassian:conversation",
    "atlassian:video",
    "atlassian:calendar-event",
    "atlassian:comment",
    "atlassian:customer-organization",
    "atlassian:build",
    "atlassian:deployment",
    "atlassian:test",
    "atlassian:test-execution",
    "atlassian:test-plan",
    "atlassian:test-run",
]

ROVO_INDEXED_TYPES = {
    "atlassian:document", "atlassian:message", "atlassian:work-item",
    "atlassian:project", "atlassian:space", "atlassian:design",
    "atlassian:repository", "atlassian:pull-request", "atlassian:commit",
    "atlassian:branch", "atlassian:conversation", "atlassian:video",
    "atlassian:calendar-event", "atlassian:comment", "atlassian:customer-organization",
}

DEFAULT_ICON_URL = "https://developer.atlassian.com/platform/forge/images/icons/forge.svg"


def check_prerequisites():
    for tool in ["node", "forge"]:
        try:
            subprocess.run([tool, "--version"], capture_output=True, check=True)
        except (subprocess.CalledProcessError, FileNotFoundError):
            print(f"No '{tool}' not found. Install Node.js 22+ and Forge CLI (npm install -g @forge/cli).")
            return False
    return True


def run_forge_create(app_name: str, cwd: str, dev_space_id: str | None) -> bool:
    """Run forge create with the blank template."""
    cmd = [
        "forge", "create",
        "--template", "blank",
        app_name,
        "--accept-terms",
    ]
    if dev_space_id:
        cmd += ["--developer-space-id", dev_space_id]
    print(f"\nPackage Running: {' '.join(cmd)}")
    result = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"No forge create failed (exit {result.returncode})")
        if result.stdout.strip():
            print(f"\n--- stdout ---\n{result.stdout.strip()}")
        if result.stderr.strip():
            print(f"\n--- stderr ---\n{result.stderr.strip()}")
        return False
    print(f"Yes forge create succeeded")
    return True


def yaml_string(value: str) -> str:
    return json.dumps(value)


def write_manifest(app_dir: str, connector_key: str, connector_name: str,
                   object_type: str, has_form_config: bool, api_domain: str,
                   icon_url: str) -> None:
    """Write manifest.yml with graph:connector module."""

    validate_fn_block = ""
    validate_function_entry = ""
    form_config_block = ""

    if has_form_config:
        form_config_block = textwrap.dedent(f"""\
        formConfiguration:
          form:
            - key: connection-details
              type: header
              title: Connect {connector_name}
              description: Provide the API endpoint and key for {connector_name}.
              properties:
                - key: api-url
                  type: string
                  label: API URL
                  isRequired: true
                - key: api-key
                  type: string
                  label: API Key
                  isRequired: true
          validateConnection:
            function: validate-connection
        """)
        # indent form config under datasource (8 spaces)
        form_config_block = "\n".join(
            "        " + line if line.strip() else line
            for line in form_config_block.splitlines()
        ) + "\n"

        validate_function_entry = "    - key: validate-connection\n      handler: index.validateConnectionHandler\n"

    egress_block = ""
    if api_domain:
        egress_block = f"  external:\n    fetch:\n      backend:\n        - address: '{api_domain}'\n"

    manifest = f"""\
app:
  id: "{{}}"

permissions:
  scopes:
    - read:object:jira
    - write:object:jira
    - delete:object:jira
    - storage:app
{egress_block}
modules:
  graph:connector:
    - key: {connector_key}
      name: {yaml_string(connector_name)}
      icons:
        light: {yaml_string(icon_url)}
        dark: {yaml_string(icon_url)}
      objectTypes:
        - {yaml_string(object_type)}
      datasource:
{form_config_block}        onConnectionChange:
          function: on-connection-change

  function:
    - key: on-connection-change
      handler: index.onConnectionChangeHandler
{validate_function_entry}"""

    # forge create generates a manifest.yml with the app id already filled in.
    # We read the existing id and slot it back in.
    manifest_path = Path(app_dir) / "manifest.yml"
    existing_id = ""
    if manifest_path.exists():
        for line in manifest_path.read_text().splitlines():
            if "id:" in line:
                existing_id = line.split("id:")[-1].strip().strip('"')
                break

    manifest = manifest.replace('"{}"', f'"{existing_id}"')

    manifest_path.write_text(manifest)
    print(f"Yes Wrote manifest.yml")


def write_index_ts(app_dir: str, object_type: str, has_form_config: bool,
                   connector_name: str) -> None:
    """Write src/index.ts with complete handler boilerplate."""

    validate_handler = ""
    if has_form_config:
        validate_handler = textwrap.dedent("""\

        /**
         * Called by Atlassian when the admin submits the connection form.
         * Throw an Error to reject the connection with a user-visible message.
         */
        export async function validateConnectionHandler(request: {
          context: { cloudId: string; moduleKey: string };
          configProperties: Record<string, string>;
        }): Promise<void> {
          const config = request.configProperties ?? {};
          const apiUrl = config['api-url'];
          const apiKey = config['api-key'];

          if (!apiUrl || !apiKey) {
            throw new Error('API URL and API Key are required.');
          }

          // TODO: replace with a real health-check call to your service
          const response = await api.fetch(`${apiUrl}/health`, {
            headers: { Authorization: `Bearer ${apiKey}` },
          });

          if (!response.ok) {
            throw new Error(`Could not connect to ${apiUrl} (HTTP ${response.status}). Please check your API URL and key.`);
          }
        }
        """)

    index_ts = textwrap.dedent(f"""\
    import api from '@forge/api';
    import {{ kvs }} from '@forge/kvs';

    const {{ graph }} = require('@forge/teamwork-graph');

    const OBJECT_TYPE = '{object_type}' as const;
    const BATCH_SIZE = 100;

    // ---------------------------------------------------------------------------
    // onConnectionChange - called by Atlassian when a connection is created,
    // updated, or deleted.
    // ---------------------------------------------------------------------------
    export async function onConnectionChangeHandler(request: {{
      context: {{ cloudId: string; moduleKey: string }};
      action: 'CREATED' | 'UPDATED' | 'DELETED';
      connectionId: string;
      configProperties?: Record<string, string>;
    }}): Promise<void> {{
      const {{ action, connectionId }} = request;
      const config = request.configProperties ?? {{}};

      if (action === 'DELETED') {{
        // Atlassian automatically removes Teamwork Graph data on deletion.
        // Only clean up your own locally stored state.
        await kvs.delete(`conn:${{connectionId}}`);
        const ids: string[] = (await kvs.get('active-connections')) ?? [];
        await kvs.set('active-connections', ids.filter(id => id !== connectionId));
        console.log(`[connector] Connection deleted: ${{connectionId}}`);
        return;
      }}

      // CREATED or UPDATED - persist config and start ingestion
      await kvs.set(`conn:${{connectionId}}`, config);
      const ids: string[] = (await kvs.get('active-connections')) ?? [];
      if (!ids.includes(connectionId)) {{
        await kvs.set('active-connections', [...ids, connectionId]);
      }}

      console.log(`[connector] Connection ${{action}}: ${{connectionId}} - starting ingestion`);
      await ingestAllData(connectionId, config);
    }}
    {validate_handler}
    // ---------------------------------------------------------------------------
    // Ingestion helpers
    // ---------------------------------------------------------------------------

    async function ingestAllData(
      connectionId: string,
      config: Record<string, string>,
    ): Promise<void> {{
      const items = await fetchExternalData(config);
      console.log(`[connector] Fetched ${{items.length}} items for connection ${{connectionId}}`);

      for (let i = 0; i < items.length; i += BATCH_SIZE) {{
        const batch = items.slice(i, i + BATCH_SIZE);
        const result = await graph.setObjects({{
          connectionId,
          objects: batch.map(item => ({{
            schemaVersion: '1.0',
            id: String(item.id),
            updateSequenceNumber: Number(item.updateSequenceNumber ?? Date.now()),
            displayName: String(item.title ?? item.name ?? item.id),
            url: typeof item.url === 'string' ? item.url : undefined,
            createdAt: toIsoString(item.createdAt),
            lastUpdatedAt: toIsoString(item.updatedAt ?? item.modifiedAt),
            permissions: buildPermissions(item, config),
            [OBJECT_TYPE]: buildTypedObject(item, config),
          }})),
        }});

        const accepted = result.results.accepted.length;
        const rejected = result.results.rejected.length;
        console.log(`[connector] Batch ${{Math.floor(i / BATCH_SIZE) + 1}}: ${{accepted}} accepted, ${{rejected}} rejected`);
        if (rejected > 0) {{
          console.error('[connector] Rejected objects:', JSON.stringify(result.results.rejected));
        }}
      }}
    }}

    function buildPermissions(
      item: Record<string, unknown>,
      config: Record<string, string>,
    ): Array<Record<string, unknown>> {{
      // TODO: map source-system ACLs to Atlassian users/groups before ingesting restricted content.
      return [{{
        accessControls: [{{
          principals: [{{ type: 'EVERYONE' }}],
        }}],
      }}];
    }}

    function buildTypedObject(
      item: Record<string, unknown>,
      config: Record<string, string>,
    ): Record<string, unknown> {{
      // TODO: replace this default document payload when OBJECT_TYPE is not atlassian:document.
      const mimeType = String(item.mimeType ?? 'text/plain');
      const text = String(item.text ?? item.title ?? item.name ?? item.id);
      return {{
        type: {{
          category: 'DOCUMENT',
          mimeType,
        }},
        content: {{
          mimeType,
          text,
        }},
      }};
    }}

    function toIsoString(value: unknown): string | undefined {{
      if (typeof value === 'string') return value;
      if (value instanceof Date) return value.toISOString();
      return undefined;
    }}

    // ---------------------------------------------------------------------------
    // TODO: replace this function with real API calls to your external system.
    // ---------------------------------------------------------------------------
    async function fetchExternalData(
      config: Record<string, string>,
    ): Promise<Array<Record<string, unknown>>> {{
      const apiUrl = config['api-url'];
      const apiKey = config['api-key'];

      if (!apiUrl) {{
        console.warn('[connector] api-url not configured - returning empty dataset');
        return [];
      }}

      const response = await api.fetch(`${{apiUrl}}/items`, {{
        headers: {{
          Authorization: `Bearer ${{apiKey}}`,
          'Content-Type': 'application/json',
        }},
      }});

      if (!response.ok) {{
        throw new Error(`[connector] fetchExternalData failed: HTTP ${{response.status}}`);
      }}

      const data: {{ items: Array<Record<string, unknown>> }} = await response.json();
      return data.items ?? [];
    }}
    """)

    src_dir = Path(app_dir) / "src"
    src_dir.mkdir(exist_ok=True)
    (src_dir / "index.ts").write_text(index_ts.lstrip())
    print("Yes Wrote src/index.ts")


def install_connector_sdks(app_dir: str) -> bool:
    """Install connector SDK packages in the app directory."""
    print("\nPackage Installing connector SDK packages...")
    result = subprocess.run(
        ["npm", "install", "@forge/teamwork-graph", "@forge/kvs"],
        cwd=app_dir,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        print(f"WARN  npm install @forge/teamwork-graph @forge/kvs failed: {result.stderr.strip()}")
        print("   You can install them manually: npm install @forge/teamwork-graph @forge/kvs")
        return False
    print("Yes connector SDK packages installed")
    return True


def write_gitignore(app_dir: str) -> None:
    """Ensure .gitignore exists with standard Node entries."""
    gitignore_path = Path(app_dir) / ".gitignore"
    if not gitignore_path.exists():
        gitignore_path.write_text("node_modules/\ndist/\n.forge/\n")


def main():
    parser = argparse.ArgumentParser(
        description="Scaffold a Forge graph:connector app with handler boilerplate",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=textwrap.dedent("""\
            Examples:
              # Simple connector (no admin form config):
              python3 -m scripts.scaffold_connector \\
                --name my-connector --connector-name "My Service" \\
                --object-type atlassian:document \\
                --dev-space-id abc123 --directory ~/projects

              # Connector with admin API key form:
              python3 -m scripts.scaffold_connector \\
                --name my-connector --connector-name "My Service" \\
                --object-type atlassian:document \\
                --dev-space-id abc123 --directory ~/projects \\
                --has-form-config --api-url https://api.myservice.com
        """),
    )
    parser.add_argument("--name", required=True, help="App directory name (e.g. my-connector)")
    parser.add_argument("--connector-name", required=True,
                        help="Human-readable connector name shown in Atlassian Admin UI (e.g. 'My Service')")
    parser.add_argument("--object-type", default="atlassian:document",
                        help="Teamwork Graph object type (default: atlassian:document)")
    parser.add_argument("--dev-space-id", required=False, default=None,
                        help="Forge developer space ID (optional)")
    parser.add_argument("--directory",
                        help="Parent directory for the app (default: current directory)")
    parser.add_argument("--has-form-config", action="store_true",
                        help="Generate admin configuration form (API URL + API key fields)")
    parser.add_argument("--api-url",
                        help="Base URL of the external API (used for egress allow-list in manifest)")
    parser.add_argument("--icon-url", default=DEFAULT_ICON_URL,
                        help="Absolute URL used for the connector light/dark icon")

    args = parser.parse_args()

    # Validate object type
    if args.object_type not in VALID_OBJECT_TYPES:
        print(f"No Unknown object type: {args.object_type}")
        print(f"\nValid types:\n  " + "\n  ".join(VALID_OBJECT_TYPES))
        sys.exit(1)

    if args.object_type not in ROVO_INDEXED_TYPES:
        print(f"WARN  Note: '{args.object_type}' is NOT indexed in Rovo Search / Rovo Chat.")
        print("   Objects will still be stored in Teamwork Graph but won't appear in search results.")

    if not check_prerequisites():
        sys.exit(1)

    parent_dir = os.path.abspath(args.directory) if args.directory else os.getcwd()
    app_dir = os.path.join(parent_dir, args.name)

    if not os.path.isdir(parent_dir):
        print(f"No Parent directory does not exist: {parent_dir}")
        sys.exit(1)

    connector_key = args.name.lower().replace(" ", "-")

    # Extract domain from api-url for egress allow-list
    api_domain = ""
    if args.api_url:
        from urllib.parse import urlparse
        parsed = urlparse(args.api_url)
        api_domain = f"{parsed.scheme}://{parsed.netloc}" if parsed.netloc else args.api_url

    print(f"\nConnector Scaffolding Forge Connector: {args.connector_name}")
    print(f"   App name:       {args.name}")
    print(f"   Object type:    {args.object_type}")
    print(f"   Form config:    {'yes' if args.has_form_config else 'no'}")
    print(f"   Directory:      {parent_dir}")

    # Step 1: forge create with blank template, unless the user already created it interactively.
    if os.path.exists(app_dir):
        if not os.path.exists(os.path.join(app_dir, "manifest.yml")):
            print(f"No Directory already exists but does not look like a Forge app: {app_dir}")
            print("   Choose a different --name or remove the existing folder.")
            sys.exit(1)
        print(f"Yes Reusing existing Forge app at: {app_dir}")
    elif not run_forge_create(args.name, parent_dir, args.dev_space_id):
        print("\nTip If forge create fails with 'Prompts can not be meaningfully rendered',")
        print("   run forge create interactively in your terminal:")
        print(f"   cd {parent_dir} && forge create --template blank {args.name}")
        print("   Then rerun this scaffold command with the same --name and --directory.")
        sys.exit(1)

    # Step 2: Write connector-specific files
    write_manifest(
        app_dir=app_dir,
        connector_key=connector_key,
        connector_name=args.connector_name,
        object_type=args.object_type,
        has_form_config=args.has_form_config,
        api_domain=api_domain,
        icon_url=args.icon_url,
    )

    write_index_ts(
        app_dir=app_dir,
        object_type=args.object_type,
        has_form_config=args.has_form_config,
        connector_name=args.connector_name,
    )

    write_gitignore(app_dir)

    # Step 3: Install connector SDK packages
    install_connector_sdks(app_dir)

    print(f"\n{'=' * 60}")
    print("Yes Connector scaffolded successfully!")
    print(f"\nApp location: {app_dir}")
    print(f"\nNext steps:")
    print(f"  1. cd {app_dir}")
    print(f"  2. Open src/index.ts and replace fetchExternalData() with real API calls")
    print(f"  3. Run: forge lint   (verify manifest)")
    print(f"  4. Deploy with the deploy script (from forge-app-builder skill):")
    print(f"     python3 -m scripts.deploy_forge_app --app-dir {app_dir} --site <your-site> --product jira")
    print(f"  5. In Atlassian Admin -> Apps -> Connected apps -> Connect")
    print(f"  6. Verify data in Rovo Search after ~5 min")

    if args.object_type not in ROVO_INDEXED_TYPES:
        print(f"\nWARN  Remember: '{args.object_type}' objects won't appear in Rovo Search.")
    print()


if __name__ == "__main__":
    main()
