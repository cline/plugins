---
name: shopify-dev
description: "Search Shopify developer documentation across all APIs. Use only when no API-specific skill applies."
---

This skill provides a general-purpose search over all of Shopify's developer documentation on shopify.dev.

Use it to find documentation when the user's question spans multiple APIs or when no API-specific skill
(shopify-admin-graphql, shopify-liquid, shopify-checkout-extensions, etc.) matches the task.
---

## Search Before Answering

Run the bundled docs search helper from this skill directory before answering broad Shopify developer documentation questions:

```bash
scripts/search_docs.mjs "<topic or feature name>"
```

Search for the topic or feature name, not the full user prompt.

> Use this skill ONLY when no API-specific skill applies to the task.
> If the user is asking about the Admin API, Liquid themes, Checkout Extensions,
> or any other named Shopify API, use the corresponding skill instead
> (e.g. shopify-admin-graphql, shopify-liquid, shopify-checkout-extensions, ...).

---
