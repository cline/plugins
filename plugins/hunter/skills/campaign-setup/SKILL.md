---
name: hunter-campaign-setup
description: Prepares a Hunter email campaign by adding recipients from Hunter leads. Use when the user explicitly wants to add recipients to a Hunter campaign or prepare Hunter outreach.
user-invocable: true
argument-hint: Add my fintech leads to the Q2 Outreach campaign
---

# Campaign Setup

Add recipients to a Hunter campaign and prepare it for sending.

## Examples

- "Add my fintech leads to the Q2 Outreach campaign"
- `"Set up my campaign with these contacts"`
- `"Add the leads from my SaaS list to campaign 12345"`
- `"Prepare the outreach campaign"`

## Workflow

### Step 1: Identify the Campaign

- If the user provides a campaign ID or name, use it directly.
- Otherwise, use the Hunter list campaigns MCP action to show available campaigns and ask the user to choose.

```
# Your Campaigns

| ID | Name | Status | Recipients |
|----|------|--------|------------|
| 123 | Q2 Outreach | draft | 0 |
| 456 | Product Launch | running | 150 |

Which campaign would you like to add recipients to?
```

### Step 2: Identify Recipients

Determine the source of recipients:

- From a leads list - use Hunter lead listing with the leads list ID to get the emails.
- From specific emails - the user provides email addresses directly.
- From lead IDs - the user provides lead IDs.
- From a previous search - use contacts already found.

Prefer draft campaigns. If the selected campaign is running or active, stop and ask for explicit confirmation before adding recipients. Include the campaign ID, campaign name, status, and current recipient count, and explain that active campaigns may send according to their existing Hunter schedule.

### Step 3: Add Recipients

Before adding recipients, summarize the campaign, recipient source, recipient count, and whether batching is needed. Ask the user to confirm before using the Hunter add campaign recipients MCP action.

Use the Hunter add campaign recipients MCP action with the campaign ID and email addresses or lead IDs only after confirmation. Max 50 per request - batch larger lists automatically.

Report progress: "Adding batch 1 of 3 (50 recipients)..."

### Step 4: Present Summary

```
# Campaign Ready: [Campaign Name]

Recipients added: [count]

View campaign: https://hunter.io/campaigns/{campaign_id}

## Important
Before starting the campaign, verify in Hunter that:
- Email subject and body are configured
- A sending email account is connected
- Follow-up steps are set up (if desired)

Campaign creation and editing must be done in the Hunter UI:
https://hunter.io/campaigns/{campaign_id}

## Next Steps
1. Review and edit the campaign in Hunter
2. Start the campaign in Hunter only after reviewing the content, sender, and schedule
3. Check campaign status with Hunter
4. Add more recipients
```

## Credit Cost

Free - adding recipients to a campaign does not consume credits.

## Important Notes

- Max 50 recipients per Hunter add campaign recipients request - batch larger lists
- Campaign creation, subject/body editing, and follow-up configuration are done in the Hunter UI (not available via API)
- Do not start campaigns from this skill. Starting outreach is a separate user-controlled action in Hunter.
- Use Hunter campaign recipient listing to check who is already in the campaign
- Use Hunter campaign recipient removal only when the user explicitly asks to remove contacts
