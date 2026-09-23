---
name: revenuecat-status
description: Get a quick overview of your RevenueCat project configuration including apps, products, entitlements, offerings, and webhooks.
---

# RevenueCat Status

Get a quick overview of your RevenueCat project configuration.

## Description

This skill provides a summary of your RevenueCat project including:
- Number of apps and their platforms
- Total products configured
- Entitlements defined
- Offerings and their packages
- Webhook integrations

## Optional Context

The user may provide a project name to show status for. If not provided, show status for all accessible projects after confirming the relevant account or project context.

## Instructions

Use the RevenueCat MCP server for all tool calls.

When the user invokes this skill, perform the following steps:

1. Resolve Project Context
   - Extract any project name from the user's request
   - Project name matching is case-insensitive and supports partial matches

2. Get Projects
   - Use `list-projects` tool to retrieve all accessible projects
   - If `project_name` is specified in arguments, filter projects by name (case-insensitive partial match)
   - If no matching project found, inform the user and list available projects
   - If no `project_name` provided, show status for all projects

3. Gather Statistics for Each Project
   For each project (filtered or all), use the following tools:
   - `list-apps`
   - `list-products`
   - `list-entitlements`
   - `list-offerings`
   - `list-webhook-integrations`

4. Present Summary
   Format the results as a clear status report:

   ```
    RevenueCat Project Status
   ============================
   Project: {project_name} ({project_id})

    Apps: {count}
      - {app_name} ({platform})
      ...

   Products: {count}
      - {product_identifier} ({type})
      ...

    Entitlements: {count}
      - {entitlement_name}
      ...

    Offerings: {count}
      - {offering_name} (current: yes/no)
      ...

    Webhooks: {count}
      - {webhook_name} -> {url}
      ...
   ```

5. Highlight Issues (if any)
   - Products not attached to any entitlement
   - Offerings without packages
   - Apps without products
