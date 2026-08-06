#!/usr/bin/env node

// src/agent-skills/scripts/search_docs.ts
import { parseArgs } from "util";

// src/http/index.ts
var PROD_BASE_URL = "https://shopify.dev/";
var SHOP_DEV_BASE_URL = "https://shopify-dev.shop.dev/";
function stagingHost(serverNumber) {
  return `https://shopify-dev-staging${serverNumber}.shopifycloud.com/`;
}
function resolveShopifyDevBaseUrl(options) {
  const env = options?.env ?? process.env;
  const stagingRaw = env.SHOPIFY_DEV_STAGING_SERVER_NUMBER?.trim();
  if (stagingRaw) {
    if (!/^\d+$/.test(stagingRaw)) {
      throw new Error(
        `SHOPIFY_DEV_STAGING_SERVER_NUMBER must be a positive integer; got: "${stagingRaw}"`
      );
    }
    const serverNumber = Number(stagingRaw);
    if (!Number.isSafeInteger(serverNumber) || serverNumber <= 0) {
      throw new Error(
        `SHOPIFY_DEV_STAGING_SERVER_NUMBER must be a positive integer; got: "${stagingRaw}"`
      );
    }
    const token = env.MINERVA_TOKEN;
    if (!token) {
      const audience = stagingHost(serverNumber).replace(/\/$/, "");
      throw new Error(
        `SHOPIFY_DEV_STAGING_SERVER_NUMBER=${serverNumber} is set but no Minerva token is available. Staging servers are behind Minerva. Get a token via:
  export MINERVA_TOKEN=$(devx minerva-auth --client-id 0oa1bphetnkOusboI0x8 --audience ${audience})`
      );
    }
    return {
      url: stagingHost(serverNumber),
      headers: { Cookie: `MINERVA_TOKEN=${token}` }
    };
  }
  if (env.DEV && env.DEV !== "false") {
    return { url: SHOP_DEV_BASE_URL, headers: {} };
  }
  return { url: PROD_BASE_URL, headers: {} };
}
async function shopifyDevFetch(uri, options) {
  let url;
  let resolvedHeaders = {};
  if (uri.startsWith("http://") || uri.startsWith("https://")) {
    url = new URL(uri);
  } else {
    const resolved = resolveShopifyDevBaseUrl({ uri });
    url = new URL(uri, resolved.url);
    resolvedHeaders = resolved.headers;
  }
  if (options?.parameters) {
    Object.entries(options.parameters).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }
  const response = await fetch(url.toString(), {
    method: options?.method || "GET",
    headers: {
      Accept: "application/json",
      "Cache-Control": "no-cache",
      "X-Shopify-Surface": "skills",
      ...resolvedHeaders,
      ...options?.headers
    },
    ...options?.body && { body: options.body }
  });
  if (!response.ok) {
    let errorBody;
    try {
      errorBody = await response.text();
    } catch {
    }
    throw new Error(
      errorBody ? `HTTP ${response.status}: ${errorBody}` : `HTTP error! status: ${response.status}`
    );
  }
  return await response.text();
}

// src/agent-skills/scripts/instrumentation.ts
function nonEmptyUsageMetadata(metadata) {
  return {
    ...metadata?.api && { api: metadata.api },
    ...metadata?.api_version && { api_version: metadata.api_version },
    ...metadata?.resolve_api_version && {
      resolve_api_version: metadata.resolve_api_version
    }
  };
}
async function reportValidation() {
  return;
}

// src/agent-skills/scripts/search_docs.ts
var { values, positionals } = parseArgs({
  options: {
    model: { type: "string" },
    "client-name": { type: "string" },
    "client-version": { type: "string" },
    version: { type: "string" },
    "session-id": { type: "string" },
    "tool-use-id": { type: "string" }
  },
  allowPositionals: true
});
var query = positionals[0];
if (!query) {
  console.error(
    "Usage: search_docs.js <query> [--model <id>] [--client-name <name>]"
  );
  process.exit(1);
}
var requestedApiVersion = values.version;
var resolvedApiVersion;
function searchUsageMetadata() {
  return {
    ..."",
    ...requestedApiVersion && { api_version: requestedApiVersion },
    ...resolvedApiVersion && { resolve_api_version: resolvedApiVersion }
  };
}
async function performSearch(query2, apiName, apiVersion) {
  const body = { query: query2 };
  if (apiName) body.api_name = apiName;
  if (apiVersion) body.api_version = apiVersion;
  const responseText = await shopifyDevFetch("/assistant/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Surface": "skills"
    },
    body: JSON.stringify(body),
    instrumentation: {
      packageVersion: "1.10.0",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }
  });
  try {
    const jsonData = JSON.parse(responseText);
    return JSON.stringify(jsonData, null, 2);
  } catch {
    return responseText;
  }
}
try {
  let apiVersionForSearch = requestedApiVersion;
  if ("") {
    const resolution = resolveVersion("", requestedApiVersion);
    if (!resolution.ok) {
      throw new Error(
        `Invalid --version: "${requestedApiVersion}". Supported versions: ${resolution.supportedVersions.join(", ")}.`
      );
    }
    resolvedApiVersion = resolution.version;
    apiVersionForSearch = resolution.version;
  }
  const result = await performSearch(
    query,
    void 0,
    apiVersionForSearch || void 0
  );
  process.stdout.write(result);
  process.stdout.write("\n");
  await reportValidation(
    "search_docs",
    result,
    {
      model: values.model,
      clientName: values["client-name"],
      clientVersion: values["client-version"],
      sessionId: values["session-id"],
      toolUseId: values["tool-use-id"],
      query
    },
    searchUsageMetadata()
  );
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Search failed: ${message}`);
  await reportValidation(
    "search_docs",
    message,
    {
      model: values.model,
      clientName: values["client-name"],
      clientVersion: values["client-version"],
      sessionId: values["session-id"],
      toolUseId: values["tool-use-id"],
      query
    },
    searchUsageMetadata()
  );
  process.exit(1);
}
