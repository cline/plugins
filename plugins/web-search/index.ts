/**
 * Web Search Plugin Example
 *
 * Registers a `web_search` tool backed by Exa or free Parallel Search.
 *
 * CLI usage:
 *   cline plugin install web-search
 *   cline "Search the web for recent TypeScript 6 updates"
 *   EXA_API_KEY=... cline "Search the web for recent TypeScript 6 updates"
 *
 * Provider key:
 *   EXA_API_KEY              Enables Exa search when configured. Otherwise,
 *                            anonymous Parallel Search is used. A separate
 *                            model provider key may be needed for inference.
 */

import { type AgentPlugin, createTool } from "@cline/core";

export interface WebSearchInput {
	query: string;
	limit?: number;
	domains?: string[];
	recencyDays?: number;
	country?: string;
}

export interface WebSearchResult {
	title: string;
	url: string;
	snippet?: string;
	publishedAt?: string;
	author?: string;
	score?: number;
	source: "exa" | "parallel";
}

export interface WebSearchOutput {
	provider: "exa" | "parallel";
	query: string;
	results: WebSearchResult[];
	requestId?: string;
}

interface ExaSearchResult {
	title?: string;
	url?: string;
	publishedDate?: string;
	author?: string;
	score?: number;
	text?: string;
	highlights?: string[];
	summary?: string;
}

interface ExaSearchResponse {
	requestId?: string;
	results?: ExaSearchResult[];
	error?: string;
}

interface ParallelSearchResult {
	title?: string | null;
	url?: string;
	publish_date?: string | null;
	excerpts?: string[];
}

interface ParallelSearchResponse {
	search_id?: string;
	results?: ParallelSearchResult[];
}

interface McpToolResponse {
	error?: { message?: string };
	result?: {
		isError?: boolean;
		structuredContent?: ParallelSearchResponse;
		content?: Array<{ type?: string; text?: string }>;
	};
}

const DEFAULT_RESULT_LIMIT = 5;
const MAX_RESULT_LIMIT = 10;
const EXA_SEARCH_ENDPOINT = "https://api.exa.ai/search";
const PARALLEL_SEARCH_ENDPOINT = "https://search.parallel.ai/mcp";

function env(name: string): string | undefined {
	const value = process.env[name]?.trim();
	return value ? value : undefined;
}

function clampResultLimit(limit: number | undefined): number {
	if (typeof limit !== "number" || !Number.isFinite(limit)) {
		return DEFAULT_RESULT_LIMIT;
	}
	const integer = Math.trunc(limit);
	return Math.min(Math.max(integer, 1), MAX_RESULT_LIMIT);
}

function normalizeDomains(domains: string[] | undefined): string[] | undefined {
	const normalized = domains
		?.map((domain) => domain.trim().replace(/^https?:\/\//, ""))
		.map((domain) => domain.replace(/\/.*$/, ""))
		.filter(Boolean);
	return normalized && normalized.length > 0
		? [...new Set(normalized)]
		: undefined;
}

function isoDateDaysAgo(days: number | undefined): string | undefined {
	if (typeof days !== "number" || !Number.isFinite(days) || days <= 0) {
		return undefined;
	}
	const date = new Date();
	date.setUTCDate(date.getUTCDate() - Math.trunc(days));
	return date.toISOString();
}

function truncateSnippet(text: string | undefined): string | undefined {
	if (!text) {
		return undefined;
	}
	const normalized = text.replace(/\s+/g, " ").trim();
	if (!normalized) {
		return undefined;
	}
	return normalized.length > 800
		? `${normalized.slice(0, 797).trimEnd()}...`
		: normalized;
}

function extractErrorMessage(body: unknown): string | undefined {
	if (!body || typeof body !== "object") {
		return undefined;
	}
	const record = body as Record<string, unknown>;
	for (const key of ["error", "message", "detail"] as const) {
		const value = record[key];
		if (typeof value === "string" && value.trim()) {
			return value;
		}
	}
	return undefined;
}

function asString(value: unknown): string | undefined {
	return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asNumber(value: unknown): number | undefined {
	return typeof value === "number" && Number.isFinite(value)
		? value
		: undefined;
}

function hasResultUrl<T extends { url?: string }>(
	result: T,
): result is T & { url: string } {
	return typeof result.url === "string" && result.url.trim().length > 0;
}

function parseWebSearchInput(input: unknown): WebSearchInput {
	if (!input || typeof input !== "object") {
		throw new Error("web_search input must be an object");
	}
	const record = input as Record<string, unknown>;
	const query = asString(record.query);
	if (!query) {
		throw new Error("query is required");
	}

	const domains = Array.isArray(record.domains)
		? record.domains.flatMap((domain) => {
				const value = asString(domain);
				return value ? [value] : [];
			})
		: undefined;

	return {
		query,
		limit: asNumber(record.limit),
		domains,
		recencyDays: asNumber(record.recencyDays),
		country: asString(record.country),
	};
}

async function readJsonResponse<T>(response: Response): Promise<T> {
	const text = await response.text();
	let body: unknown = {};
	try {
		body = text ? (JSON.parse(text) as unknown) : {};
	} catch {
		if (!response.ok) {
			throw new Error(
				`HTTP ${response.status}: ${text || response.statusText}`,
			);
		}
		throw new Error("Search provider returned invalid JSON");
	}

	if (!response.ok) {
		const message = extractErrorMessage(body) ?? (text || response.statusText);
		throw new Error(`HTTP ${response.status}: ${message}`);
	}

	return body as T;
}

async function searchExa(
	input: WebSearchInput,
	apiKey: string,
	limit: number,
	domains: string[] | undefined,
): Promise<WebSearchOutput> {
	const body: Record<string, unknown> = {
		query: input.query,
		numResults: limit,
		contents: {
			highlights: true,
		},
	};
	if (domains) {
		body.includeDomains = domains;
	}
	const startPublishedDate = isoDateDaysAgo(input.recencyDays);
	if (startPublishedDate) {
		body.startPublishedDate = startPublishedDate;
	}
	if (input.country) {
		body.userLocation = input.country.toLowerCase();
	}

	const response = await fetch(EXA_SEARCH_ENDPOINT, {
		method: "POST",
		headers: {
			"x-api-key": apiKey,
			"Content-Type": "application/json",
		},
		body: JSON.stringify(body),
	});
	const json = await readJsonResponse<ExaSearchResponse>(response);

	if (json.error) {
		throw new Error(json.error);
	}

	return {
		provider: "exa",
		query: input.query,
		requestId: json.requestId,
		results: (json.results ?? [])
			.filter(hasResultUrl)
			.slice(0, limit)
			.map((result) => ({
				title: result.title || result.url || "Untitled",
				url: result.url,
				snippet: truncateSnippet(
					result.highlights?.join("\n") ?? result.summary ?? result.text,
				),
				publishedAt: result.publishedDate,
				author: result.author,
				score: result.score,
				source: "exa",
			})),
	};
}

async function searchParallel(
	input: WebSearchInput,
	limit: number,
	domains: string[] | undefined,
): Promise<WebSearchOutput> {
	const objective = [input.query];
	if (domains) {
		objective.push(`Limit results to these domains: ${domains.join(", ")}.`);
	}
	if (
		typeof input.recencyDays === "number" &&
		Number.isFinite(input.recencyDays) &&
		input.recencyDays > 0
	) {
		objective.push(
			`Prefer results published within the last ${Math.trunc(input.recencyDays)} days.`,
		);
	}
	if (input.country) {
		objective.push(`Prefer results relevant to ${input.country.toLowerCase()}.`);
	}

	const domainQuery = domains?.map((domain) => `site:${domain}`).join(" OR ");
	const searchQuery = domainQuery
		? `${input.query} ${(domains?.length ?? 0) > 1 ? `(${domainQuery})` : domainQuery}`
		: input.query;

	const response = await fetch(PARALLEL_SEARCH_ENDPOINT, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Accept: "application/json, text/event-stream",
		},
		body: JSON.stringify({
			jsonrpc: "2.0",
			id: 1,
			method: "tools/call",
			params: {
				name: "web_search",
				arguments: {
					objective: objective.join(" "),
					search_queries: [searchQuery],
				},
			},
		}),
	});
	const json = await readJsonResponse<McpToolResponse>(response);
	if (json.error) {
		throw new Error(json.error.message || "Parallel search failed");
	}

	const text = json.result?.content?.find((item) => item.type === "text")?.text;
	if (json.result?.isError) {
		throw new Error(text || "Parallel search failed");
	}

	let search = json.result?.structuredContent;
	if (!search && text) {
		try {
			search = JSON.parse(text) as ParallelSearchResponse;
		} catch {
			throw new Error("Parallel returned invalid search results");
		}
	}
	if (!search || !Array.isArray(search.results)) {
		throw new Error("Parallel returned invalid search results");
	}

	return {
		provider: "parallel",
		query: input.query,
		requestId: search.search_id,
		results: search.results
			.filter(hasResultUrl)
			.slice(0, limit)
			.map((result) => ({
				title: result.title || result.url || "Untitled",
				url: result.url,
				snippet: truncateSnippet(result.excerpts?.join("\n")),
				publishedAt: result.publish_date ?? undefined,
				source: "parallel",
			})),
	};
}

export async function searchWeb(
	input: WebSearchInput,
): Promise<WebSearchOutput> {
	if (!input.query || !input.query.trim()) {
		throw new Error("query is required");
	}

	const limit = clampResultLimit(input.limit);
	const domains = normalizeDomains(input.domains);
	const apiKey = env("EXA_API_KEY");

	return apiKey
		? searchExa(input, apiKey, limit, domains)
		: searchParallel(input, limit, domains);
}

const plugin: AgentPlugin = {
	name: "web-search",
	manifest: {
		capabilities: ["tools"],
	},

	setup(api) {
		api.registerTool(
			createTool({
				name: "web_search",
				description:
					"Search the web for current public information using Exa or Parallel. " +
					"Use this to discover relevant URLs, news, docs, and recent facts; use fetch_web_content afterward when a page needs deeper inspection. " +
					"Uses Exa when EXA_API_KEY is configured, or free Parallel Search otherwise.",
				inputSchema: {
					type: "object",
					properties: {
						query: {
							type: "string",
							description:
								"Search query. Use precise terms and include dates when recency matters.",
						},
						limit: {
							type: "number",
							description: `Number of results to return, from 1 to ${MAX_RESULT_LIMIT}. Defaults to ${DEFAULT_RESULT_LIMIT}.`,
						},
						domains: {
							type: "array",
							items: { type: "string" },
							description:
								"Optional domains to restrict results to, such as github.com or docs.exa.ai.",
						},
						recencyDays: {
							type: "number",
							description:
								"Optional freshness window in days. Maps to Exa startPublishedDate or guides Parallel search.",
						},
						country: {
							type: "string",
							description:
								"Optional lowercase two-letter country code for localized results, such as us.",
						},
					},
					required: ["query"],
					additionalProperties: false,
				},
				timeoutMs: 30_000,
				retryable: true,
				maxRetries: 1,
				execute: async (input: unknown) =>
					searchWeb(parseWebSearchInput(input)),
			}),
		);
	},
};

export { plugin };
export default plugin;
