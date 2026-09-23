# Twilio

Twilio bundles workflow skills for building with Twilio and SendGrid, plus the public Twilio docs MCP server for documentation and API-schema lookup.

## What It Adds

- 55 Twilio and SendGrid skills covering SMS, WhatsApp, RCS, Voice, Verify, Lookup, Messaging Services, regulatory onboarding, webhooks, Conversation Orchestrator, Conversation Intelligence, Customer Memory, SendGrid sending, deliverability, inbound parse, suppressions, and event webhooks.
- `twilio-docs`, a streamable HTTP MCP server at `https://mcp.twilio.com/docs` for semantic Twilio documentation search and API operation retrieval. The docs MCP does not require authentication.
- Bundled skills cover live messaging, email, voice, verification, compliance, and customer-data workflows.

## Requirements

- Cline with plugin MCP support.
- A Twilio account and credentials such as `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` for live Twilio API work.
- A SendGrid account and `SENDGRID_API_KEY` for SendGrid email workflows.
- Valid sender identities, phone numbers, WhatsApp senders, regulatory registrations, webhook URLs, and user consent for the channels you plan to use.

## Trust Boundaries

Installing this plugin registers only the unauthenticated Twilio documentation MCP and bundled local skills. It does not send messages, place calls, create resources, read account data, or contact Twilio or SendGrid APIs with user credentials during setup.

Review live sends, calls, OTPs, compliance changes, number purchases or releases, credential changes, webhook exposure, and production-traffic changes before allowing Cline to execute them.

## Install

```bash
cline plugin install twilio
```

For local development:

```bash
cline plugin install ./plugins/twilio --cwd .
```
