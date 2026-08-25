import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({
	resolve(specifier, context, nextResolve) {
		if (specifier === "@cline/core") {
			return {
				url: "data:text/javascript,export const createTool = options => options",
				shortCircuit: true,
			};
		}
		return nextResolve(specifier, context);
	},
});

const { searchWeb } = await import("./index.ts");

function mockSearchEnvironment(t, apiKey, response) {
	const originalApiKey = process.env.EXA_API_KEY;
	if (apiKey === undefined) {
		delete process.env.EXA_API_KEY;
	} else {
		process.env.EXA_API_KEY = apiKey;
	}

	t.after(() => {
		if (originalApiKey === undefined) {
			delete process.env.EXA_API_KEY;
		} else {
			process.env.EXA_API_KEY = originalApiKey;
		}
	});

	return t.mock.method(globalThis, "fetch", async (...args) => response(...args));
}

function jsonResponse(body, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

test("uses anonymous Parallel MCP when no Exa key is configured", async (t) => {
	const fetchMock = mockSearchEnvironment(t, undefined, (url, options) => {
		assert.equal(url, "https://search.parallel.ai/mcp");
		assert.equal(options.method, "POST");
		assert.equal(options.headers["Content-Type"], "application/json");
		assert.match(options.headers.Accept, /application\/json/);
		assert.equal(options.headers.Authorization, undefined);

		const request = JSON.parse(options.body);
		assert.equal(request.jsonrpc, "2.0");
		assert.equal(request.method, "tools/call");
		assert.equal(request.params.name, "web_search");
		assert.match(request.params.arguments.objective, /recent Cline releases/);
		assert.match(request.params.arguments.objective, /github\.com/);
		assert.match(request.params.arguments.objective, /7 days/);
		assert.match(request.params.arguments.objective, /us/i);
		assert.deepEqual(request.params.arguments.search_queries, [
			"recent Cline releases site:github.com",
		]);

		return jsonResponse({
			jsonrpc: "2.0",
			id: request.id,
			result: {
				structuredContent: {
					search_id: "search_parallel_123",
					results: [
						{
							title: "Cline releases",
							url: "https://github.com/cline/cline/releases",
							publish_date: "2026-08-24",
							excerpts: ["Latest  release", "More details"],
						},
						{ title: "Missing URL", excerpts: ["Skip this result"] },
						{
							url: "https://github.com/cline/plugins",
							excerpts: ["Official plugins"],
						},
						{
							url: "https://github.com/cline/extra",
							excerpts: ["Over the requested limit"],
						},
					],
				},
			},
		});
	});

	const result = await searchWeb({
		query: "recent Cline releases",
		limit: 2,
		domains: ["https://github.com/cline", "github.com"],
		recencyDays: 7,
		country: "US",
	});

	assert.deepEqual(result, {
		provider: "parallel",
		query: "recent Cline releases",
		requestId: "search_parallel_123",
		results: [
			{
				title: "Cline releases",
				url: "https://github.com/cline/cline/releases",
				snippet: "Latest release More details",
				publishedAt: "2026-08-24",
				source: "parallel",
			},
			{
				title: "https://github.com/cline/plugins",
				url: "https://github.com/cline/plugins",
				snippet: "Official plugins",
				publishedAt: undefined,
				source: "parallel",
			},
		],
	});
	assert.equal(fetchMock.mock.callCount(), 1);
});

test("preserves configured Exa requests, normalization, and provider priority", async (t) => {
	const fetchMock = mockSearchEnvironment(t, "  configured-exa-key  ", (url, options) => {
		assert.equal(url, "https://api.exa.ai/search");
		assert.equal(options.headers["x-api-key"], "configured-exa-key");

		const request = JSON.parse(options.body);
		assert.equal(request.query, "Cline plugin docs");
		assert.equal(request.numResults, 1);
		assert.deepEqual(request.contents, { highlights: true });
		assert.deepEqual(request.includeDomains, ["docs.cline.bot"]);
		assert.equal(request.userLocation, "us");
		assert.ok(Date.parse(request.startPublishedDate));

		return jsonResponse({
			requestId: "exa_request_123",
			results: [
				{
					title: "Plugin docs",
					url: "https://docs.cline.bot/plugins",
					highlights: ["Install  plugins"],
					publishedDate: "2026-08-24",
					author: "Cline",
					score: 0.9,
				},
				{ url: "https://docs.cline.bot/extra" },
			],
		});
	});

	const result = await searchWeb({
		query: "Cline plugin docs",
		limit: 1,
		domains: ["https://docs.cline.bot/plugins"],
		recencyDays: 3,
		country: "US",
	});

	assert.deepEqual(result, {
		provider: "exa",
		query: "Cline plugin docs",
		requestId: "exa_request_123",
		results: [
			{
				title: "Plugin docs",
				url: "https://docs.cline.bot/plugins",
				snippet: "Install plugins",
				publishedAt: "2026-08-24",
				author: "Cline",
				score: 0.9,
				source: "exa",
			},
		],
	});
	assert.equal(fetchMock.mock.callCount(), 1);
});

test("accepts MCP responses that provide only JSON text content", async (t) => {
	mockSearchEnvironment(t, "   ", () =>
		jsonResponse({
			jsonrpc: "2.0",
			id: 1,
			result: {
				content: [
					{
						type: "text",
						text: JSON.stringify({
							search_id: "search_text_only",
							results: [
								{
									title: "Cline",
									url: "https://cline.bot",
									excerpts: ["Coding agent"],
								},
							],
						}),
					},
				],
			},
		}),
	);

	const result = await searchWeb({ query: "Cline" });
	assert.equal(result.provider, "parallel");
	assert.equal(result.requestId, "search_text_only");
	assert.equal(result.results[0].url, "https://cline.bot");
});

test("surfaces JSON-RPC errors returned by Parallel", async (t) => {
	mockSearchEnvironment(t, undefined, () =>
		jsonResponse({
			jsonrpc: "2.0",
			id: 1,
			error: { code: -32602, message: "Invalid search arguments" },
		}),
	);

	await assert.rejects(searchWeb({ query: "Cline" }), /Invalid search arguments/);
});

test("surfaces MCP tool execution errors returned by Parallel", async (t) => {
	mockSearchEnvironment(t, undefined, () =>
		jsonResponse({
			jsonrpc: "2.0",
			id: 1,
			result: {
				isError: true,
				content: [{ type: "text", text: "Search rate limit exceeded" }],
			},
		}),
	);

	await assert.rejects(searchWeb({ query: "Cline" }), /Search rate limit exceeded/);
});

test("rejects malformed successful MCP search payloads", async (t) => {
	mockSearchEnvironment(t, undefined, () =>
		jsonResponse({
			jsonrpc: "2.0",
			id: 1,
			result: { content: [{ type: "text", text: "not JSON" }] },
		}),
	);

	await assert.rejects(searchWeb({ query: "Cline" }), /invalid search results/i);
});

test("preserves meaningful HTTP errors from the fallback endpoint", async (t) => {
	mockSearchEnvironment(t, undefined, () =>
		jsonResponse({ error: "Parallel temporarily unavailable" }, 503),
	);

	await assert.rejects(
		searchWeb({ query: "Cline" }),
		/HTTP 503: Parallel temporarily unavailable/,
	);
});

test("rejects blank queries before making a provider request", async (t) => {
	const fetchMock = mockSearchEnvironment(t, undefined, () => {
		throw new Error("fetch should not be called");
	});

	await assert.rejects(searchWeb({ query: "   " }), /query is required/);
	assert.equal(fetchMock.mock.callCount(), 0);
});
