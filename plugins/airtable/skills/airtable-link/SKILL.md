---
name: airtable-link
description: Provides a clickable Airtable link whenever the agent has touched user-visible Airtable content. Use after every MCP call that creates, updates, lists, searches, or returns records, schema, or interface pages -- bases, tables, fields, records, or pages. Hand off the most-specific URL the agent's tool calls have proven access to -- prefer single-record URLs over table URLs, table URLs over base URLs, and interface page URLs when the user's access is restricted to pages. Format as a markdown link with a descriptive label. Construct URLs only from IDs the tools actually returned -- never synthesize IDs to round out a URL. Compose this skill from any workflow skill that affects Airtable content.
license: MIT
metadata:
    version: '1.0.0'
    author: airtable
---

# Show Airtable link

After any MCP call that affects user-visible Airtable content, return a clickable link to the most-specific surface the call's results give the user access to. The link is how the user reviews the agent's work -- without it, the work is invisible until they go hunting for it.

## URL templates

All URLs are built from IDs the tool calls actually returned. Don't include any ID slot -- `viw*`, `tbl*`, `rec*`, `pag*`, etc. -- that wasn't in a tool response.

| Surface                | URL pattern                                    |
| ---------------------- | ---------------------------------------------- |
| Workspace              | `https://airtable.com/workspaces/<wspId>`      |
| Base                   | `https://airtable.com/<appId>`                 |
| Base interfaces hub    | `https://airtable.com/<appId>/interfaces`      |
| Table                  | `https://airtable.com/<appId>/<tblId>`         |
| Record (table context) | `https://airtable.com/<appId>/<tblId>/<recId>` |
| Interface page         | `https://airtable.com/<appId>/<pagId>`         |
| Record (page context)  | `https://airtable.com/<appId>/<pagId>/<recId>` |

ID prefixes: `wsp` (workspace), `app` (base), `tbl` (table), `pag` (interface page), `rec` (record), `fld` (field). Construct URLs using IDs verbatim from MCP responses -- do not lowercase, transform, or guess them.

## Priority order

Hand off the most-specific URL the work allows:

1. Single record -- when the work targeted one record. Use the page-context URL if `get_record_for_page` returned the record; otherwise the table-context URL.
2. Interface page -- when the work was scoped to a page (page reads / listings).
3. Table -- for multi-record work or schema changes (created / updated tables, fields). Don't list every record back; link the table once.
4. Base -- last resort: just-created base, base-wide schema operation, or when nothing more specific applies.

For multi-record results without one obvious "best" record, link the table or page once. Do not produce a link per record -- that's spam.

## Permission-aware handoff

The MCP user's auth determines which tools succeed. Hand off URLs only at access surfaces the call sequence has proven:

-   Page-restricted users: only `list_pages_for_base`, `list_records_for_page`, `get_record_for_page` succeeded. Hand off page URLs only -- synthesizing a `tbl*` URL the user can't open produces a dead link from their perspective.
-   Table-level access: `list_tables_for_base`, `get_table_schema`, `list_records_for_table`, `update_records_for_table` succeeded. Table URLs are safe.
-   Workspace-level access: `list_workspaces` returned IDs. Workspace URLs are safe.

Standing rule: if a tool call didn't prove the access surface, don't link to it. When in doubt, drop one specificity level and link the surface you do have.

## Presentation

-   Markdown link with a descriptive label. Cline and other Markdown-capable clients render these. Bare URLs render too but read worse.
    -   Good: `[Sales Pipeline base](https://airtable.com/appEXAMPLEbase001)`
    -   Acceptable: `View in Airtable: [Sales Pipeline](https://airtable.com/appEXAMPLEbase001)` -- matches Airtable's existing internal handoff label
    -   Bad: `https://airtable.com/appEXAMPLEbase001` -- bare URL with no context
-   One link per response. For multi-step operations, consolidate at the end rather than after each tool call.
-   No rich embeds. Inline chat surfaces don't render OpenGraph cards for Airtable URLs today. Don't structure responses around something the host won't draw.

## Anti-patterns

-   Don't synthesize IDs. Every ID in the URL must come verbatim from a tool response. Don't fabricate `viw*`, `tbl*`, `rec*`, `pag*`, or any other identifier to round out a URL -- if your tool calls didn't return that ID, the URL slot it'd fill doesn't have a real target.
-   Don't include `?home=<pagId>` or other query params. Page-management modes (`/build`, `/edit`, `/preview`) are for page authors, not handoffs from chat.

## Composition

Workflow and methodology skills that create, modify, or return Airtable content should compose this convention at handoff time. Don't re-implement URL construction inline.

In another skill's body:

> _"After completing the work, return a clickable link via the `airtable-link` skill. Hand off the most-specific URL the agent's tool calls have proven access to."_

## Examples

Created a new base for product roadmap:

> Created your roadmap base with three tables -- Roadmap, Feedback, and Releases.
>
> [View Roadmap base in Airtable](https://airtable.com/appEXAMPLEbase001)

Updated 12 records' Status field:

> Updated Status to "In Review" on 12 records.
>
> [View Roadmap table in Airtable](https://airtable.com/appEXAMPLEbase001/tblEXAMPLEtable01)

Returned one record from an interface page (page-restricted user):

> Found the matching deal: Acme Corp, $50k, Stage = Negotiation.
>
> [View record in Sales pipeline](https://airtable.com/appEXAMPLEbase001/pagEXAMPLEpage001/recEXAMPLErecord1)
