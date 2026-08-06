# ai-plugins

Endor Labs supply-chain security support for Cline.

## What It Adds

This plugin adds the `endor-cli-tools` MCP server and an `endor-setup` skill.

The MCP server starts with:

```bash
endorctl ai-tools mcp-server
```

That server exposes Endor Labs CLI-backed tools for scanning and analyzing software supply-chain risk when the user has `endorctl` access configured.

The bundled `endor-setup` skill helps Cline install or verify `endorctl`, choose an Endor namespace, authenticate safely, and run scans with explicit user approval.

## Install

```bash
cline plugin install ai-plugins
cline config mcp
cline config skills
```

For local development from this repository:

```bash
cline plugin install ./plugins/ai-plugins --cwd .
```

## Example Usage

After installation, ask Cline:

```text
Use the endor-setup skill to check whether this repository is ready for an Endor Labs scan.
```

```text
Use Endor Labs to scan this project for dependency and supply-chain risk.
```

## Requirements

- `endorctl` installed and available on `PATH`.
- Endor Labs access and a namespace for the project or tenant to scan.
- Browser authentication or API credentials configured through environment variables.
- User approval before installing `endorctl`, starting authentication, reading existing Endor config, or running a scan.

## Security Notes

Do not paste Endor API keys or secrets into chat. Use environment variables such as `ENDOR_API_CREDENTIALS_KEY` and `ENDOR_API_CREDENTIALS_SECRET` for non-browser authentication. Review scan scope before running commands, especially in repositories with private dependencies or production release artifacts.
