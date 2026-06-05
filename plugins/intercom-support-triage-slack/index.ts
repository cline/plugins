/**
 * Intercom Support Triage Plugin
 *
 * Provides two tools that work together to fetch incoming Intercom support
 * conversations, classify them by request type, and post a formatted triage
 * summary to Slack.
 *
 * Workflow for the agent:
 *   1. Call fetch_intercom_conversations to retrieve recent support requests.
 *   2. Classify each conversation as "refund_request", "account_deletion_request",
 *      or "other" based on its subject and body_preview.
 *   3. Call post_slack_summary with the three classified conversation lists.
 *
 * Required environment variables:
 *   INTERCOM_API_TOKEN   Intercom access token (Bearer auth)
 *   SLACK_BOT_TOKEN      Slack bot OAuth token (xoxb-...)
 *   SLACK_CHANNEL        Default Slack channel ID to post to (e.g. C1234567890)
 *
 * CLI usage:
 *   mkdir -p .cline/plugins
 *   cp examples/plugins/intercom-support-triage.ts .cline/plugins/intercom-support-triage.ts
 *   INTERCOM_API_TOKEN=... SLACK_BOT_TOKEN=xoxb-... SLACK_CHANNEL=C123... \
 *     cline -i "Fetch the last 24 hours of Intercom support requests, classify them, and post a summary to Slack"
 */

import { type AgentPlugin, createTool } from "@cline/core";

// ---------------------------------------------------------------------------
// Exported types
// ---------------------------------------------------------------------------

export type SupportCategory =
	| "refund_request"
	| "account_deletion_request"
	| "product_support"
	| "spam"
	| "other";

export interface ConversationSummary {
	/** Intercom conversation ID */
	id: string;
	/** ISO 8601 creation timestamp */
	created_at: string;
	/** Conversation state: open | closed | snoozed */
	state: string;
	/** Email subject line, or empty string if none */
	subject: string;
	/** First 300 chars of the opening message, HTML stripped */
	body_preview: string;
	/** Contact email address */
	author_email: string;
	/** Contact display name */
	author_name: string;
	/** Direct link to this conversation in the Intercom inbox */
	intercom_url: string;
}

// ---------------------------------------------------------------------------
// Internal Intercom API types
// ---------------------------------------------------------------------------

interface IntercomSource {
	subject?: string;
	body?: string;
	author?: { name?: string; email?: string };
}

interface IntercomConversation {
	type: string;
	id: string;
	created_at: number;
	state: string;
	source?: IntercomSource;
}

interface IntercomConversationListResponse {
	type: string;
	total_count?: number;
	pages?: { next?: { starting_after?: string } };
	conversations: IntercomConversation[];
	errors?: Array<{ code?: string; message?: string }>;
}

// ---------------------------------------------------------------------------
// Internal Slack Block Kit types
// ---------------------------------------------------------------------------

type SlackTextObject =
	| { type: "plain_text"; text: string; emoji?: boolean }
	| { type: "mrkdwn"; text: string };

type SlackBlock =
	| { type: "header"; text: { type: "plain_text"; text: string; emoji: boolean } }
	| { type: "section"; text: SlackTextObject }
	| { type: "divider" }
	| { type: "context"; elements: SlackTextObject[] };

interface SlackPostMessageResponse {
	ok: boolean;
	ts?: string;
	channel?: string;
	error?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const INTERCOM_BASE_URL = "https://api.intercom.io";
const INTERCOM_VERSION = "2.13";
const SLACK_POST_MESSAGE_URL = "https://slack.com/api/chat.postMessage";
const MAX_BODY_PREVIEW_CHARS = 300;
const MAX_ITEMS_PER_CATEGORY = 10;

// ---------------------------------------------------------------------------
// Generic helpers
// ---------------------------------------------------------------------------

function env(name: string): string | undefined {
	const value = process.env[name]?.trim();
	return value ? value : undefined;
}

function requireEnv(name: string): string {
	const value = env(name);
	if (!value) {
		throw new Error(`Set ${name} environment variable to use this tool`);
	}
	return value;
}

function asObject(value: unknown): Record<string, unknown> {
	return value !== null && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

function asString(value: unknown): string | undefined {
	return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asNumber(value: unknown): number | undefined {
	return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asArray(value: unknown): unknown[] {
	return Array.isArray(value) ? value : [];
}

function truncate(text: string, maxLen: number): string {
	if (text.length <= maxLen) return text;
	return `${text.slice(0, maxLen - 1).trimEnd()}...`;
}

function unixToIso(timestamp: number): string {
	return new Date(timestamp * 1000).toISOString();
}

function extractApiErrorMessage(body: unknown): string | undefined {
	if (!body || typeof body !== "object") return undefined;
	const rec = body as Record<string, unknown>;
	if (typeof rec.error === "string" && rec.error.trim()) return rec.error;
	if (Array.isArray(rec.errors) && rec.errors.length > 0) {
		const first = rec.errors[0] as Record<string, unknown>;
		const msg = first?.message ?? first?.code;
		if (typeof msg === "string") return msg;
	}
	if (typeof rec.message === "string" && rec.message.trim()) return rec.message;
	return undefined;
}

async function readJsonResponse<T>(response: Response): Promise<T> {
	const text = await response.text();
	let body: unknown = {};
	try {
		body = text ? (JSON.parse(text) as unknown) : {};
	} catch {
		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${text || response.statusText}`);
		}
		throw new Error("API returned invalid JSON");
	}
	if (!response.ok) {
		const message =
			extractApiErrorMessage(body) ?? (text || response.statusText);
		throw new Error(`HTTP ${response.status}: ${message}`);
	}
	return body as T;
}

// ---------------------------------------------------------------------------
// HTML -> plain text
// ---------------------------------------------------------------------------

function stripHtml(html: string): string {
	return html
		.replace(/<br\s*\/?>/gi, "\n")
		.replace(/<\/p>/gi, "\n")
		.replace(/<[^>]+>/g, "")
		.replace(/&nbsp;/gi, " ")
		.replace(/&amp;/gi, "&")
		.replace(/&lt;/gi, "<")
		.replace(/&gt;/gi, ">")
		.replace(/&quot;/gi, '"')
		.replace(/&#39;/gi, "'")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

// ---------------------------------------------------------------------------
// Intercom API
// ---------------------------------------------------------------------------

function intercomHeaders(token: string): Record<string, string> {
	return {
		Authorization: `Bearer ${token}`,
		"Intercom-Version": INTERCOM_VERSION,
		Accept: "application/json",
		"Content-Type": "application/json",
	};
}

function normalizeConversation(raw: IntercomConversation): ConversationSummary {
	const source = raw.source ?? {};
	const author = source.author ?? {};
	const bodyPlain = stripHtml(source.body ?? "");
	return {
		id: raw.id,
		created_at: unixToIso(raw.created_at),
		state: raw.state ?? "unknown",
		subject: source.subject?.trim() ?? "",
		body_preview: truncate(bodyPlain, MAX_BODY_PREVIEW_CHARS),
		author_email: author.email?.trim() ?? "",
		author_name: author.name?.trim() ?? "",
		intercom_url: `https://app.intercom.com/a/inbox/conversations/${raw.id}`,
	};
}

async function searchIntercomConversations(
	token: string,
	sinceTs: number,
	perPage: number,
	startingAfter: string | undefined,
): Promise<IntercomConversationListResponse> {
	const queryValues: Array<{
		field: string;
		operator: string;
		value: string | number;
	}> = [
		{ field: "created_at", operator: ">", value: sinceTs },
		{ field: "state", operator: "=", value: "open" },
	];

	const pagination: Record<string, unknown> = { per_page: perPage };
	if (startingAfter) pagination.starting_after = startingAfter;

	const response = await fetch(`${INTERCOM_BASE_URL}/conversations/search`, {
		method: "POST",
		headers: intercomHeaders(token),
		body: JSON.stringify({
			query: { operator: "AND", value: queryValues },
			sort: { field: "created_at", order: "descending" },
			pagination,
		}),
	});
	return readJsonResponse<IntercomConversationListResponse>(response);
}

async function listIntercomConversations(
	token: string,
	perPage: number,
	startingAfter: string | undefined,
): Promise<IntercomConversationListResponse> {
	const params = new URLSearchParams({
		order: "desc",
		sort: "created_at",
		display_as: "plaintext",
		per_page: String(perPage),
		state: "open",
	});
	if (startingAfter) params.set("starting_after", startingAfter);

	const response = await fetch(
		`${INTERCOM_BASE_URL}/conversations?${params.toString()}`,
		{ method: "GET", headers: intercomHeaders(token) },
	);
	return readJsonResponse<IntercomConversationListResponse>(response);
}

// ---------------------------------------------------------------------------
// Slack Block Kit builders
// ---------------------------------------------------------------------------

function formatTimestamp(iso: string): string {
	return new Date(iso).toLocaleString("en-US", {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		timeZone: "UTC",
		timeZoneName: "short",
	});
}

function buildConversationLine(conv: ConversationSummary): string {
	const link = `<${conv.intercom_url}|#${conv.id}>`;
	const who = conv.author_name || conv.author_email || "Unknown";
	return `${link} - ${who} - ${formatTimestamp(conv.created_at)}`;
}

const CATEGORY_META: Record<SupportCategory, { emoji: string; label: string }> =
	{
		refund_request: { emoji: "Refund", label: "Refund Requests" },
		account_deletion_request: { emoji: "Deletion", label: "Account Deletion Requests" },
		product_support: { emoji: "Support", label: "Product Support" },
		spam: { emoji: "Spam", label: "Spam" },
		other: { emoji: "Other", label: "Other Requests" },
	};

function buildCategoryBlocks(
	category: SupportCategory,
	conversations: ConversationSummary[],
): SlackBlock[] {
	if (conversations.length === 0) return [];

	const { emoji, label } = CATEGORY_META[category];
	const visible = conversations.slice(0, MAX_ITEMS_PER_CATEGORY);
	const overflow = conversations.length - visible.length;

	const blocks: SlackBlock[] = [
		{ type: "divider" },
		{ type: "section", text: { type: "mrkdwn", text: `*${emoji} ${label}*` } },
		...visible.map(
			(conv): SlackBlock => ({
				type: "section",
				text: { type: "mrkdwn", text: buildConversationLine(conv) },
			}),
		),
	];

	if (overflow > 0) {
		blocks.push({
			type: "context",
			elements: [
				{
					type: "mrkdwn",
					text: `_...and ${overflow} more ${label.toLowerCase()} not shown_`,
				},
			],
		});
	}

	return blocks;
}

function buildSlackBlocks(
	refund: ConversationSummary[],
	deletion: ConversationSummary[],
	productSupport: ConversationSummary[],
	spam: ConversationSummary[],
	other: ConversationSummary[],
): SlackBlock[] {
	const now = new Date().toLocaleString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		timeZone: "UTC",
		timeZoneName: "short",
	});

	const total =
		refund.length + deletion.length + productSupport.length + spam.length + other.length;
	const summaryText =
		total === 0
			? "_No conversations found for the requested time window._"
			: `Refund *${refund.length}* refund   -   Deletion *${deletion.length}* deletion   -   Support *${productSupport.length}* product support   -   Spam *${spam.length}* spam   -   Other *${other.length}* other`;

	return [
		{
			type: "header",
			text: {
				type: "plain_text",
				text: `[ticket] Support Request Triage - ${now}`,
				emoji: true,
			},
		},
		{ type: "section", text: { type: "mrkdwn", text: summaryText } },
		...buildCategoryBlocks("refund_request", refund),
		...buildCategoryBlocks("account_deletion_request", deletion),
		...buildCategoryBlocks("product_support", productSupport),
		...buildCategoryBlocks("spam", spam),
		...buildCategoryBlocks("other", other),
	];
}

// ---------------------------------------------------------------------------
// Slack API
// ---------------------------------------------------------------------------

async function postSlackMessage(
	token: string,
	channel: string,
	refund: ConversationSummary[],
	deletion: ConversationSummary[],
	productSupport: ConversationSummary[],
	spam: ConversationSummary[],
	other: ConversationSummary[],
): Promise<SlackPostMessageResponse> {
	const total =
		refund.length + deletion.length + productSupport.length + spam.length + other.length;
	const text =
		`[ticket] Support Request Triage: ${total} conversation(s) - ` +
		`Refund ${refund.length} refund - Deletion ${deletion.length} deletion - ` +
		`Support ${productSupport.length} product support - Spam ${spam.length} spam - Other ${other.length} other`;

	const response = await fetch(SLACK_POST_MESSAGE_URL, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			channel,
			text,
			blocks: buildSlackBlocks(refund, deletion, productSupport, spam, other),
		}),
	});

	const result = await readJsonResponse<SlackPostMessageResponse>(response);
	if (!result.ok) {
		throw new Error(`Slack API error: ${result.error ?? "unknown error"}`);
	}
	return result;
}

// ---------------------------------------------------------------------------
// Input parsers
// ---------------------------------------------------------------------------

function parseFetchInput(input: unknown): {
	since_hours: number;
	limit: number;
	starting_after: string | undefined;
} {
	const rec = asObject(input);
	const sinceHours = Math.max(0, asNumber(rec.since_hours) ?? 24);
	const limit = Math.min(100, Math.max(1, Math.trunc(asNumber(rec.limit) ?? 50)));
	const startingAfter = asString(rec.starting_after);
	return { since_hours: sinceHours, limit, starting_after: startingAfter };
}

function parseConversationItem(value: unknown): ConversationSummary {
	const rec = asObject(value);
	const id = asString(rec.id) ?? "";
	return {
		id,
		created_at: asString(rec.created_at) ?? new Date().toISOString(),
		state: asString(rec.state) ?? "unknown",
		subject: asString(rec.subject) ?? "",
		body_preview: asString(rec.body_preview) ?? "",
		author_email: asString(rec.author_email) ?? "",
		author_name: asString(rec.author_name) ?? "",
		intercom_url:
			asString(rec.intercom_url) ??
			`https://app.intercom.com/a/inbox/conversations/${id}`,
	};
}

function parsePostInput(input: unknown): {
	channel: string | undefined;
	refund_requests: ConversationSummary[];
	account_deletion_requests: ConversationSummary[];
	product_support_requests: ConversationSummary[];
	spam_requests: ConversationSummary[];
	other_requests: ConversationSummary[];
} {
	const rec = asObject(input);
	return {
		channel: asString(rec.channel),
		refund_requests: asArray(rec.refund_requests).map(parseConversationItem),
		account_deletion_requests: asArray(rec.account_deletion_requests).map(
			parseConversationItem,
		),
		product_support_requests: asArray(rec.product_support_requests).map(
			parseConversationItem,
		),
		spam_requests: asArray(rec.spam_requests).map(parseConversationItem),
		other_requests: asArray(rec.other_requests).map(parseConversationItem),
	};
}

// ---------------------------------------------------------------------------
// Shared item schema - ConversationSummary shape for tool inputSchema
// ---------------------------------------------------------------------------

const CONVERSATION_ITEM_SCHEMA = {
	type: "object",
	properties: {
		id: { type: "string" },
		created_at: { type: "string" },
		state: { type: "string" },
		subject: { type: "string" },
		body_preview: { type: "string" },
		author_email: { type: "string" },
		author_name: { type: "string" },
		intercom_url: { type: "string" },
	},
	required: ["id", "intercom_url"],
	additionalProperties: false,
} as const;

// ---------------------------------------------------------------------------
// Plugin definition
// ---------------------------------------------------------------------------

const ALLOWED_TOOLS = new Set([
	"fetch_intercom_conversations",
	"post_slack_summary",
]);

const plugin: AgentPlugin = {
	name: "intercom-support-triage",
	manifest: {
		capabilities: ["tools", "hooks"],
	},

	hooks: {
		beforeTool({ toolCall }) {
			if (!ALLOWED_TOOLS.has(toolCall.toolName)) {
				return {
					skip: true,
					reason: `Tool "${toolCall.toolName}" is not permitted in this session. Only fetch_intercom_conversations and post_slack_summary may be called.`,
				};
			}
			return undefined;
		},
	},

	setup(api) {
		// -------------------------------------------------------------------------
		// Tool 1: fetch_intercom_conversations
		// -------------------------------------------------------------------------
		api.registerTool(
			createTool({
				name: "fetch_intercom_conversations",
				description:
					"Fetch recent support conversations from Intercom. Returns a list of " +
					"ConversationSummary objects, each with: id, created_at, state, subject, " +
					"body_preview (HTML stripped, <=300 chars), author_email, author_name, and " +
					"intercom_url. Uses the Search API when since_hours > 0 (default 24h), " +
					"otherwise lists the most recent conversations. " +
					"After receiving results, classify each item as 'refund_request', " +
					"'account_deletion_request', or 'other' based on subject and body_preview, " +
					"then call post_slack_summary with the three classified lists. " +
					"Requires INTERCOM_API_TOKEN in the environment.",
				inputSchema: {
					type: "object",
					properties: {
						since_hours: {
							type: "number",
							description:
								"Return conversations created within the last N hours. Defaults to 24. " +
								"Set to 0 to fetch the most recent conversations regardless of age.",
						},
						state: {
							type: "string",
							enum: ["open", "closed", "snoozed", "all"],
							description: "Filter by conversation state. Defaults to 'open'.",
						},
						limit: {
							type: "number",
							description:
								"Maximum number of conversations to return (1-100). Defaults to 50.",
						},
						starting_after: {
							type: "string",
							description:
								"Pagination cursor from a previous response's next_cursor. Omit for the first page.",
						},
					},
					additionalProperties: false,
				},
				timeoutMs: 30_000,
				retryable: true,
				maxRetries: 2,
				execute: async (input: unknown) => {
					const token = requireEnv("INTERCOM_API_TOKEN");
					const { since_hours, limit, starting_after } =
						parseFetchInput(input);

					let raw: IntercomConversationListResponse;
					if (since_hours > 0) {
						const sinceTs =
							Math.floor(Date.now() / 1000) - since_hours * 3600;
						raw = await searchIntercomConversations(
							token,
							sinceTs,
							limit,
							starting_after,
						);
					} else {
						raw = await listIntercomConversations(
							token,
							limit,
							starting_after,
						);
					}

					if (raw.errors?.length) {
						const msg = raw.errors
							.map((e) => e.message ?? e.code ?? "unknown")
							.join("; ");
						throw new Error(`Intercom API error: ${msg}`);
					}

					const conversations = (raw.conversations ?? []).map(
						normalizeConversation,
					);
					const nextCursor = raw.pages?.next?.starting_after ?? null;

					return {
						total_count: raw.total_count ?? conversations.length,
						conversations,
						next_cursor: nextCursor,
						has_more: nextCursor !== null,
						note:
							"Classify each conversation as 'refund_request', " +
							"'account_deletion_request', or 'other' based on subject and " +
							"body_preview, then call post_slack_summary with the five lists.",
					};
				},
			}),
		);

		// -------------------------------------------------------------------------
		// Tool 2: post_slack_summary
		// -------------------------------------------------------------------------
		api.registerTool(
			createTool({
				name: "post_slack_summary",
				description:
					"Post a formatted support triage summary to Slack, grouped by category. " +
					"Accepts the five classified lists of ConversationSummary objects produced " +
					"after calling fetch_intercom_conversations. Renders a Block Kit message with " +
					"a count header and per-conversation rows that link back to Intercom. " +
					"Requires SLACK_BOT_TOKEN and SLACK_CHANNEL in the environment.",
				inputSchema: {
					type: "object",
					properties: {
						refund_requests: {
							type: "array",
							description: "Conversations classified as refund requests.",
							items: CONVERSATION_ITEM_SCHEMA,
						},
						account_deletion_requests: {
							type: "array",
							description: "Conversations classified as account deletion requests.",
							items: CONVERSATION_ITEM_SCHEMA,
						},
						product_support_requests: {
							type: "array",
							description: "Conversations classified as product support requests.",
							items: CONVERSATION_ITEM_SCHEMA,
						},
						spam_requests: {
							type: "array",
							description: "Conversations classified as spam.",
							items: CONVERSATION_ITEM_SCHEMA,
						},
						other_requests: {
							type: "array",
							description:
								"Conversations that do not fit any other category.",
							items: CONVERSATION_ITEM_SCHEMA,
						},
						channel: {
							type: "string",
							description:
								"Slack channel ID to post to (e.g. C1234567890). Overrides SLACK_CHANNEL when provided.",
						},
					},
					required: [
						"refund_requests",
						"account_deletion_requests",
						"product_support_requests",
						"spam_requests",
						"other_requests",
					],
					additionalProperties: false,
				},
				timeoutMs: 15_000,
				retryable: false,
				execute: async (input: unknown) => {
					const slackToken = requireEnv("SLACK_BOT_TOKEN");
					const defaultChannel = requireEnv("SLACK_CHANNEL");
					const {
						channel,
						refund_requests,
						account_deletion_requests,
						product_support_requests,
						spam_requests,
						other_requests,
					} = parsePostInput(input);
					const targetChannel = channel ?? defaultChannel;
					const result = await postSlackMessage(
						slackToken,
						targetChannel,
						refund_requests,
						account_deletion_requests,
						product_support_requests,
						spam_requests,
						other_requests,
					);
					return {
						ok: true,
						ts: result.ts,
						channel: result.channel ?? targetChannel,
						total_conversations:
							refund_requests.length +
							account_deletion_requests.length +
							product_support_requests.length +
							spam_requests.length +
							other_requests.length,
						breakdown: {
							refund_requests: refund_requests.length,
							account_deletion_requests: account_deletion_requests.length,
							product_support_requests: product_support_requests.length,
							spam_requests: spam_requests.length,
							other_requests: other_requests.length,
						},
					};
				},
			}),
		);
	},
};

export { plugin };
export default plugin;

