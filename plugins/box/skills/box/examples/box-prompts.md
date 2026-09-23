# Example Prompts

## Work with Box content (via MCP)

- "Find all Q4 reports in the Finance folder."
- "Summarize the key risks in this contract."
- "Extract invoice numbers and totals from these PDFs and put them in a table."
- "Upload this CSV to the Reports folder in Box."
- "List my hubs and add this file to the Product Launch hub."

## Build Box integrations (in code)

- "Use $box to add the smallest possible endpoint that uploads a generated PDF into a configured Box folder, then tell me which folder ID and file ID were used to verify it."
- "Use $box to verify my current Box CLI auth context, list the root folder items with CLI-first verification, and tell me which actor the command is running as."
- "Use $box to debug why this Box folder listing returns 404 in production but works locally; identify the acting auth context and the exact object ID mismatch."
- "Use $box to wire a webhook handler for new files in a folder, make it idempotent, and include a duplicate-delivery verification step."
- "Use $box to build a search-first retrieval flow over Box content for invoice lookup, and only download file content if the selected result actually needs it."
