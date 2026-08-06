# Dataverse Workspace

## Environment

- URL: `{{DATAVERSE_URL}}`
- Solution: `{{SOLUTION_NAME}}`
- Publisher prefix: `{{PUBLISHER_PREFIX}}`
- PAC auth profile: `{{PAC_AUTH_PROFILE}}`

## Local Files

- `solutions/{{SOLUTION_NAME}}/` - unpacked solution source files
- `plugins/` - C# Dataverse plugin projects when used
- `scripts/auth.py` - local Dataverse auth helper copied from the Cline plugin
- `.env` - local environment config, not committed

## Pull From Environment

```bash
pac solution export --name {{SOLUTION_NAME}} --path ./solutions/{{SOLUTION_NAME}}.zip --managed false
pac solution unpack --zipfile ./solutions/{{SOLUTION_NAME}}.zip --folder ./solutions/{{SOLUTION_NAME}}
rm ./solutions/{{SOLUTION_NAME}}.zip
```

Review generated XML before committing it.

## Push To Environment

Confirm the target environment before running:

```bash
pac solution pack --zipfile ./solutions/{{SOLUTION_NAME}}.zip --folder ./solutions/{{SOLUTION_NAME}}
pac solution import --path ./solutions/{{SOLUTION_NAME}}.zip --environment {{DATAVERSE_URL}} --async --activate-plugins
rm ./solutions/{{SOLUTION_NAME}}.zip
```

## Validate After Push

```python
from auth import get_client

client = get_client("dv-data")
info = client.tables.get("<logical_name>")
print(f"[{'PASS' if info else 'FAIL'}] Table '<logical_name>'")
```

## Metadata Conventions

- Table prefix: `{{PUBLISHER_PREFIX}}_`
- Generate unique GUIDs with `python -c "import uuid; print(str(uuid.uuid4()).upper())"`
- Business rules are stored as JSON in `Entities/<table>/Workflows/`
