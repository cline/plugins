import { createTool } from "@cline/core";
import type { AgentPlugin } from "@cline/core";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { executeJevRequest } from "./plugin-transport.mjs";
import { normalizeRequest, validateRequest } from "./jev-core.mjs";
import { EXAMPLE_INPUT, buildRequest, parsePasted, text, toFlat } from "./jev-flat.mjs";
import { openPlayground } from "./playground.mjs";

type ToolInput = {
	facts?: unknown;
	inputs?: unknown;
	questions?: unknown;
	model?: unknown;
	request_json?: unknown;
	playground?: unknown;
	bucket?: unknown;
	about?: unknown;
};

const TOOL_DESCRIPTION = `Ask System One for bounded Jev judgments, or set up a Jev playground for people to explore. Usual call: fill flat fields and the tool builds the request. facts: the situation in plain words. questions: a list, one item per judgment, each with id, type, and question. type noul returns P(yes) from 0 to 1; yes_means and no_means are optional. type choice picks one option; options is REQUIRED, 2 to 255 items of {name, meaning}. type score places the answer on a scale; levels is REQUIRED, 2 to 10 labels ordered lowest first. Playground: when the user wants to explore, try what-ifs, tweak numbers, hand this to someone, or asks for a UI or page, set playground true, bucket to a short name, and about to one plain sentence saying what the playground helps decide. Give inputs instead of facts. The tool saves the bucket, opens the playground in the browser, and returns its URL without asking Jev; people who are not technical then edit the fields and questions there and press Ask Jev, so keep everything simple and in everyday words. Inputs: 3 to 6 fields, each {label, value, hint}; label is a short everyday name (Monthly rent), value is a short realistic sample (40,000 rupees), hint says in a few words what to put there (What you pay each month). Questions: 2 or 3 short questions a friend would ask, ideally one yes/no (noul), one pick-one (choice), and one scale (score); option names and levels are plain words like Rent and invest or Low, not snake_case keys; no jargon. When the user pastes a Jev request or a filled template, copy it unchanged into request_json and leave facts and questions out; both this flat shape and the raw System One shape (state plus a questions map with instructions and criteria) are accepted, with or without playground. When the user wants a template to fill in themselves, give them this flat example input with their own facts, questions, options, and levels, never a mix of the two shapes: ${JSON.stringify(EXAMPLE_INPUT)}`;

const PLAYGROUND_NOTE = "The playground is open in the browser. The user edits the input fields and questions there and presses Ask Jev; no answers exist yet, so do not report any numbers.";

const RULE_TEXT = `Use ask_jev when the user explicitly requests a calibrated judgment, routing decision, classification, or Jev or System One call. When the user wants to explore, try what-ifs, tweak inputs, share with someone, or asks for a UI, call ask_jev with playground true to open the Jev playground instead of asking once. Do not activate this rule for every prompt or treat every prompt as a classification. The tool uses exactly three primitives: noul returns the probability of yes from 0 to 1; choice selects one of 2 to 255 named options and returns the option probabilities; score returns a probability-weighted position across 2 to 10 ordered levels. Question ids are code keys and are never sent to the model, so put every part of the meaning in the question text. A noul value of 0.5 means even odds, not medium intensity. Answers arrive as numbers and must never be invented. If the tool is unavailable, say so instead of answering in prose.`;

// Console mode encodes every message as a System One request, for a workspace
// you use only for classification. The default mode waits for a judgment ask.
const CONSOLE_MODE = "console";
const DEFAULT_MODE = "explicit";
const DEFAULT_CONFIG_PATH = join(homedir(), ".cline", "plugins", "jev.config.json");

const CONSOLE_RULE_TEXT = `Every user message on this harness is a situation to encode, not a chat to answer in prose. Turn it into a System One request and call ask_jev. Put the situation in facts and each judgment in questions. The tool uses exactly three primitives: noul returns the probability of yes from 0 to 1; choice selects one of 2 to 255 named options and returns the option probabilities; score returns a probability-weighted position across 2 to 10 ordered levels. Question ids are code keys and are never sent to the model, so put every part of the meaning in the question text. A noul value of 0.5 means even odds, not medium intensity. Ask several focused questions rather than one broad question; every question sees the same facts and they run in parallel. Reply with the envelope the tool returned, and nothing else. Never invent numbers. If the tool fails, say so instead of answering in prose.`;

// Most specific first: an explicit override, then the workspace, then the shared file.
function configCandidates(workspaceRoot: string | undefined) {
	const paths = [];
	const fromEnvironment = process.env.JEV_CONFIG;
	if (typeof fromEnvironment === "string" && fromEnvironment.trim().length > 0) {
		paths.push(fromEnvironment.trim());
	}
	if (typeof workspaceRoot === "string" && workspaceRoot.trim().length > 0) {
		paths.push(join(workspaceRoot, ".cline", "jev.config.json"));
	}
	paths.push(DEFAULT_CONFIG_PATH);
	return paths;
}

// Returns undefined when the file is absent or carries no mode, so a config that
// only holds a key does not override the mode set elsewhere.
function readModeFrom(path: string) {
	let text;
	try {
		text = readFileSync(path, "utf8");
	} catch (error) {
		if (error?.code === "ENOENT") return undefined;
		const message = error instanceof Error ? error.message : String(error);
		throw new Error(`could not read ${path}: ${message}`);
	}
	const parsed = JSON.parse(text);
	if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
		throw new Error(`${path} must contain a JSON object`);
	}
	const mode = parsed.mode;
	return typeof mode === "string" && mode.trim().length > 0 ? mode.trim() : undefined;
}

function configuredMode(workspaceRoot: string | undefined) {
	for (const path of configCandidates(workspaceRoot)) {
		const mode = readModeFrom(path);
		if (mode !== undefined) return mode;
	}
	return DEFAULT_MODE;
}

function ruleText(workspaceRoot: string | undefined) {
	try {
		return configuredMode(workspaceRoot) === CONSOLE_MODE ? CONSOLE_RULE_TEXT : RULE_TEXT;
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.warn(`[cline-jev] ${message}; using the default rule`);
		return RULE_TEXT;
	}
}

const plugin: AgentPlugin = {
	name: "jev-playground",
	manifest: { capabilities: ["tools", "rules"] },
	setup(api, ctx) {
		api.registerTool(
			createTool({
				name: "ask_jev",
				description: TOOL_DESCRIPTION,
				inputSchema: {
					type: "object",
					properties: {
						facts: {
							// One type only: small models emit null for a multi-type field.
							type: "string",
							description: "The situation to judge, in plain words. Structured facts can be passed as a JSON string.",
						},
						inputs: {
							type: "array",
							description: "Playground: labeled input fields instead of facts, one per fact that matters, with a realistic sample value.",
							items: {
								type: "object",
								properties: {
									label: { type: "string", description: "Short everyday name, e.g. Monthly rent." },
									value: { type: "string", description: "Short realistic sample value." },
									hint: { type: "string", description: "A few words on what to put here." },
								},
								required: ["label", "value"],
							},
						},
						questions: {
							type: "array",
							minItems: 1,
							description: "One item per judgment.",
							items: {
								type: "object",
								properties: {
									id: { type: "string", description: "Your short key for this answer, e.g. next_step." },
									type: { type: "string", enum: ["noul", "choice", "score"] },
									question: { type: "string", description: "The full question in words." },
									yes_means: { type: "string", description: "noul only, optional: what yes means." },
									no_means: { type: "string", description: "noul only, optional: what no means." },
									options: {
										type: "array",
										description: "choice only, required: 2 to 255 options.",
										items: {
											type: "object",
											properties: { name: { type: "string" }, meaning: { type: "string" } },
											required: ["name"],
										},
									},
									levels: {
										type: "array",
										items: { type: "string" },
										description: "score only, required: 2 to 10 labels ordered lowest first.",
									},
								},
								required: ["id", "type", "question"],
							},
						},
						model: { type: "string", description: "Optional pinned Jev model version." },
						request_json: {
							type: "string",
							description: "When the user pasted a Jev request or filled template: that JSON, copied unchanged. Leave facts and questions out when you use this.",
						},
						playground: {
							type: "boolean",
							description: "true opens the Jev playground in the browser with these inputs and questions instead of asking now.",
						},
						bucket: { type: "string", description: "Playground: a short name for this setup, e.g. Rent or buy." },
						about: { type: "string", description: "Playground: one plain sentence on what this playground helps decide." },
					},
				},
				async execute(input: ToolInput) {
					const pasted = text(input?.request_json);
					const built: { request?: Record<string, unknown>; errors: string[]; flat?: ToolInput & { name?: unknown } } = pasted ? parsePasted(pasted) : buildRequest(input);
					if (!built.request) return { status: "invalid", errors: built.errors, example: EXAMPLE_INPUT };
					const request = normalizeRequest(built.request);
					const validationErrors = validateRequest(request);
					if (validationErrors.length > 0) {
						return { status: "invalid", errors: validationErrors, example: EXAMPLE_INPUT };
					}
					if (input?.playground === true) {
						// Built from the request so raw pastes work too; typed or pasted flat inputs are kept for their hints.
						const typed = pasted ? built.flat : input;
						const flat = {
							...toFlat(built.request),
							...(Array.isArray(typed?.inputs) ? { inputs: typed.inputs } : {}),
							about: text(input.about) ?? text(typed?.about),
						};
						const opened = await openPlayground(text(input.bucket) ?? text(typed?.name) ?? "Jev bucket", flat);
						return { status: "ok", mode: "playground", ...opened, message: PLAYGROUND_NOTE };
					}
					return { ...(await executeJevRequest(request)), request };
				},
			}),
		);
		api.registerRule({
			id: "jev-system-one-harness",
			content: ruleText(ctx?.workspaceInfo?.rootPath ?? process.cwd()),
			source: "cline-jev",
		});
	},
};

export default plugin;
