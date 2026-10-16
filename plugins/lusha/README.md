# lusha

Adds Lusha B2B prospecting, enrichment, lookalike discovery, and buying-signal workflows to Cline.

## What It Does

The plugin registers the `lusha` remote MCP server. Lusha provides tools for contact lookup, prospecting search, company search, buying signals, account usage, enrichment, and lookalike discovery.

In Cline, Lusha MCP tools are exposed with the `lusha__` prefix, such as `lusha__contacts_search` and `lusha__prospecting_contact_enrich`.

It also bundles four Cline skills with reference guides for filter resolution and signal types:

- `lusha-enrich-contact` for single-contact lookup and enrichment.
- `lusha-prospect` for ICP-based lead-list building.
- `lusha-signal-prospect` for trigger-based prospecting from company or contact signals.
- `lusha-lookalike-prospect` for expansion from reference companies or contacts.

## Install

```bash
cline plugin install lusha
```

For local development from this repository:

```bash
cline plugin install ./plugins/lusha --cwd .
```

## Requirements

- A Lusha account with access to the MCP server.
- OAuth sign-in when Cline first authorizes the `lusha` MCP server.
- Available Lusha credits for phone and email reveal operations.
- Lusha currently exposes a vendor compatibility MCP endpoint for this OAuth flow. The plugin uses that endpoint and client header until Lusha publishes a Cline-specific MCP endpoint.

## Security Notes

Lusha returns business contact data and reveal operations may consume account credits. Do not export, persist, or re-share contacts unless the user asks for that workflow. The plugin does not store API keys or static tokens; authentication is handled by the MCP OAuth flow.

## License

The bundled Lusha workflow skills are provided by Lusha under the MIT license. The copyright notice is preserved in `LICENSE.lusha`.
