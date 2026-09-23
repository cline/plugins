# apollo

Apollo MCP access and sales workflow skills for prospecting, lead enrichment, sequence loading, and sales analytics from Cline.

## What It Does

Registers the `apollo` MCP server. The server uses Streamable HTTP and OAuth with the user's Apollo account, then exposes Apollo tools for prospect and company search, lead enrichment, contact and sequence actions, and supported sales performance reporting.

Installs these bundled skills:

- `apollo-prospect`: turn an ideal customer profile into a ranked prospect list.
- `apollo-enrich-lead`: enrich a person, email, LinkedIn URL, or company contact into a usable contact card.
- `apollo-sequence-load`: prepare, preview, and enroll approved contacts into an Apollo sequence.
- `apollo-analytics`: answer supported Apollo sales performance questions with focused reporting tables and follow-up actions.

The bundled Apollo workflow guidance includes material from Apollo.io's MIT-licensed plugin source. See `LICENSE.apollo`.

## Install

```bash
cline plugin install apollo
```

For local development from this repository:

```bash
cline plugin install ./plugins/apollo --cwd .
```

## Example Usage

After installation, ask Cline:

```text
Find 20 VP Sales prospects at Series B SaaS companies in the US and show me the best matches before enriching anyone.
```

or:

```text
Show email reply rate by rep for this quarter and flag the biggest outliers.
```

## Requirements

- A Cline build with plugin MCP registration and OAuth follow-up support.
- An Apollo account with access to the workspace, records, sequences, and analytics you want Cline to use.
- OAuth authorization for the `apollo` MCP server after installation or on first use.
- Network access to `https://mcp.apollo.io/mcp`.
- Apollo plan permissions and available credits for credit-consuming actions such as organization search and enrichment.

Apollo MCP reflects the user's existing Apollo permissions. Cline can only perform actions that the authorized Apollo user, workspace plan, and available credits allow.

## Security Notes

Apollo MCP can expose prospect records, company records, emails, phone numbers, CRM data, sequence configuration, activity metrics, and sales analytics through tool results.

Review your AI client's model-training and data-retention settings before connecting Apollo MCP. Prospect, CRM, email, and analytics data may be sent to the model provider during tool use.

Use least-privilege Apollo access where possible. Confirm before using enrichment, revealing contact details, bulk-enriching companies, creating contacts, exporting contact data, editing CRM records, creating or modifying sequences, or enrolling contacts into sequences.

Sequence enrollment can trigger outbound messages depending on the sequence and sending account configuration. Always verify the sequence, sender, contact list, and volume before approving enrollment.

Do not paste Apollo API keys, OAuth tokens, customer lists, private prospect exports, or enriched contact data into files that may be committed.

The MCP server is installed as plugin-owned configuration. Removing the plugin removes the `apollo` entry that this plugin created.
