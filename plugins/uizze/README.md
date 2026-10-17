# uizze

STOP UI SLOP before it ships.

This plugin bundles the free `anti-ui-slop` skill for Cline. It uses the public UIZZE catalogue, a product-specific design contract, required interaction states, responsive decisions, and a hard finish gate to stop generic interface defaults.

The plugin also registers one read-only tool, `uizze_connection_info`, which returns safe setup guidance when a user explicitly asks to connect the optional authenticated UIZZE MCP.

## Install

```bash
cline plugin install uizze
cline config skills
```

For local development from this repository:

```bash
cline plugin install ./plugins/uizze --cwd .
```

## Example Usage

After installation, ask Cline:

```text
Use anti-ui-slop to inspect this product, write a design contract, fix the generic UI defaults, and do not stop until the finish gate passes.
```

The free skill works without an account, token, or MCP connection.

## Optional UIZZE MCP

If a user asks for focused UI reference search or hosted design materials, Cline can call `uizze_connection_info`. The tool returns the endpoint, transport, authentication shape, and safety guidance. It does not connect automatically or receive a token. The hosted MCP exposes `find_ui_references` and `find_ui_materials`.

Use Connect at https://uizze.com to obtain your own token, then configure a Streamable HTTP MCP server with:

- Name: `uizze`
- Endpoint: `https://uizze.com/mcp`
- Header: `Authorization: Bearer YOUR_UIZZE_TOKEN`

Replace the placeholder only in your local Cline MCP configuration. Never paste or commit the token.

## Requirements

- A Cline host with plugin package and bundled skill discovery support.
- No dependencies, API keys, or external services for the bundled free skill.
- A user-supplied UIZZE token only for the optional remote MCP.

## Security Notes

- The plugin tool returns static setup information only.
- It does not read or write files, run commands, call a network API, receive credentials, or store credentials.
- The optional MCP is a remote service at `https://uizze.com/mcp`; connecting to it sends user-approved tool calls to that service.
- Keep the bearer token in local MCP configuration and out of chat, source control, logs, screenshots, and issue reports.
- The free skill treats real product interfaces as structural evidence and forbids copying branding, proprietary text, imagery, or exact layouts.

## License

The bundled UIZZE skill is MIT licensed. See `LICENSE.uizze`.
