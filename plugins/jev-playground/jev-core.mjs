// Shared System One rules for the jev-stack repos.
//
// This file is vendored byte for byte into each repo as src/jev-core.mjs.
// Keep one copy of the logic: validation, normalization, answer checking, and
// the HTTP call all live here. Sync with _shared/sync-core.mjs.

import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PLUGIN_DIR = dirname(fileURLToPath(import.meta.url));

export const SYSTEM_ONE_URL = "https://api.typesafe.ai/v1/systemone";
export const DEFAULT_MODEL = "jev-latest";
export const MAX_CHOICE_OPTIONS = 255;
export const MAX_SCORE_LEVELS = 10;
export const DEFAULT_TIMEOUT_MS = 60_000;
export const API_KEY_VARIABLE = "TYPESAFE_API_KEY";
export const CONFIG_PATH_VARIABLE = "JEV_CONFIG";
const CONFIG_API_KEY_FIELDS = ["apiKey", "TYPESAFE_API_KEY"];
// An installed plugin cannot see the repo it came from, so the key also lives
// next to the other Cline plugin config files.
export const DEFAULT_CONFIG_PATH = join(homedir(), ".cline", "plugins", "jev.config.json");
const RAW_BODY_PREVIEW_CHARS = 2000;

export function isObject(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isJsonValue(value) {
	if (
		value === null ||
		typeof value === "string" ||
		typeof value === "number" ||
		typeof value === "boolean"
	) {
		return true;
	}
	if (Array.isArray(value)) {
		return value.every(isJsonValue);
	}
	return isObject(value) && Object.values(value).every(isJsonValue);
}

function isStructuredText(value) {
	if (typeof value === "string") return value.trim().length > 0;
	if (Array.isArray(value)) return value.length > 0 && value.every(isJsonValue);
	return isObject(value) && Object.keys(value).length > 0 && isJsonValue(value);
}

function validateQuestion(questionId, question) {
	const path = `questions.${questionId}`;
	if (!isObject(question)) return [`${path} must be an object`];

	const errors = [];
	const type = question.type;
	if (type !== "noul" && type !== "choice" && type !== "score") {
		errors.push(`${path}.type must be noul, choice, or score; string outputs are unsupported`);
	}
	if (!isStructuredText(question.instructions)) {
		errors.push(`${path}.instructions must be non-empty structured text`);
	}

	if (type === "noul" && question.criteria !== undefined) {
		if (!isObject(question.criteria)) {
			errors.push(`${path}.criteria must be an object`);
		} else {
			const unknownKeys = Object.keys(question.criteria).filter(
				(key) => key !== "true" && key !== "false",
			);
			if (unknownKeys.length > 0) errors.push(`${path}.criteria only accepts true and false`);
			for (const criterion of ["true", "false"]) {
				const description = question.criteria[criterion];
				if (description !== undefined && !isStructuredText(description)) {
					errors.push(`${path}.criteria.${criterion} must be non-empty structured text`);
				}
			}
		}
	}

	if (type === "choice") {
		if (!isObject(question.criteria)) {
			errors.push(`${path}.criteria must be an option map`);
		} else {
			const options = Object.entries(question.criteria);
			if (options.length < 2 || options.length > MAX_CHOICE_OPTIONS) {
				errors.push(`${path}.criteria must contain 2 to ${MAX_CHOICE_OPTIONS} options`);
			}
			for (const [option, description] of options) {
				if (option.trim().length === 0) errors.push(`${path}.criteria has an empty option`);
				if (description !== null && !isStructuredText(description)) {
					errors.push(`${path}.criteria.${option} must be null or non-empty structured text`);
				}
			}
		}
	}

	if (type === "score") {
		if (!Array.isArray(question.criteria)) {
			errors.push(`${path}.criteria must be an ordered array`);
		} else {
			if (question.criteria.length < 2 || question.criteria.length > MAX_SCORE_LEVELS) {
				errors.push(`${path}.criteria must contain 2 to ${MAX_SCORE_LEVELS} levels`);
			}
			question.criteria.forEach((level, levelIndex) => {
				if (!isStructuredText(level)) {
					errors.push(`${path}.criteria[${levelIndex}] must be non-empty structured text`);
				}
			});
		}
	}

	return errors;
}

export function validateRequest(request) {
	if (!isObject(request)) return ["request must be an object"];

	const errors = [];
	if (typeof request.model !== "string" || request.model.trim().length === 0) {
		errors.push("model must be a non-empty string");
	}
	const hasStateContainer =
		typeof request.state === "string" || Array.isArray(request.state) || isObject(request.state);
	if (!hasStateContainer || !isJsonValue(request.state)) {
		errors.push("state must be a JSON string, object, or array");
	}
	if (!isObject(request.questions) || Object.keys(request.questions).length === 0) {
		errors.push("questions must be a non-empty object");
		return errors;
	}
	for (const [questionId, question] of Object.entries(request.questions)) {
		if (questionId.trim().length === 0) {
			errors.push("question IDs must not be empty");
			continue;
		}
		errors.push(...validateQuestion(questionId, question));
	}
	return errors;
}

// Fills the model default without discarding a caller's pinned version.
export function normalizeRequest(request) {
	const model =
		typeof request.model === "string" && request.model.trim().length > 0
			? request.model.trim()
			: DEFAULT_MODEL;
	return { model, state: request.state, questions: request.questions };
}

export function expectedAnswerShape(request) {
	const answers = {};
	for (const [questionId, question] of Object.entries(request.questions)) {
		if (question.type === "noul") {
			answers[questionId] = { type: "noul", noul: "number 0..1" };
		} else if (question.type === "choice") {
			answers[questionId] = {
				type: "choice",
				choice: "one criteria key",
				probabilities: "map of every criteria key to number 0..1",
				confidence: "number 0..1",
			};
		} else {
			answers[questionId] = {
				type: "score",
				score: "number between level indexes",
				legend: "map of level indexes to descriptions",
				probabilities: "map of level indexes to number 0..1",
				confidence: "number 0..1",
			};
		}
	}
	return {
		model: "versioned model ID",
		answers,
		usage: { input_tokens: "integer", output_tokens: "integer" },
	};
}

// A live response is only usable if it answers every question that was asked.
// HTTP 200 with a missing or malformed answer is a failure, not a result.
export function validateAnswers(request, body) {
	if (!isObject(body)) return ["response must be an object"];
	const answers = body.answers;
	if (!isObject(answers)) return ["response has no answers object"];

	const errors = [];
	const wanted = Object.keys(request.questions);
	for (const questionId of wanted) {
		if (!(questionId in answers)) errors.push(`response is missing an answer for ${questionId}`);
	}
	for (const questionId of Object.keys(answers)) {
		if (!wanted.includes(questionId)) errors.push(`response has an unexpected answer ${questionId}`);
	}

	for (const [questionId, answer] of Object.entries(answers)) {
		const question = request.questions[questionId];
		if (question === undefined) continue;
		if (!isObject(answer)) {
			errors.push(`answer ${questionId} must be an object`);
			continue;
		}
		if (answer.type !== question.type) {
			errors.push(`answer ${questionId} has type ${answer.type}, expected ${question.type}`);
			continue;
		}
		if (question.type === "noul" && typeof answer.noul !== "number") {
			errors.push(`answer ${questionId} has no numeric noul`);
		}
		if (question.type === "score" && typeof answer.score !== "number") {
			errors.push(`answer ${questionId} has no numeric score`);
		}
		if (question.type === "choice") {
			const options = Object.keys(question.criteria ?? {});
			if (typeof answer.choice !== "string") {
				errors.push(`answer ${questionId} has no choice key`);
			} else if (!options.includes(answer.choice)) {
				errors.push(`answer ${questionId} chose ${answer.choice}, which is not one of its options`);
			}
		}
	}
	return errors;
}

// Resolution order: environment, then JEV_CONFIG, then the Cline plugin config
// file, then a .env inside this plugin directory. The last one is what keeps
// the server working from a checkout with no global setup.
export async function readApiKey() {
	const fromEnvironment = process.env[API_KEY_VARIABLE];
	if (typeof fromEnvironment === "string" && fromEnvironment.trim().length > 0) {
		return fromEnvironment.trim();
	}

	const configuredPath = process.env[CONFIG_PATH_VARIABLE];
	const configPath =
		typeof configuredPath === "string" && configuredPath.trim().length > 0
			? configuredPath.trim()
			: DEFAULT_CONFIG_PATH;
	const configKey = await readConfigApiKey(configPath);
	if (configKey !== undefined) return configKey;

	return readEnvFileApiKey(join(PLUGIN_DIR, ".env"));
}

async function readConfigApiKey(configPath) {
	const text = await readOptionalFile(configPath);
	if (text === undefined) return undefined;
	let parsed;
	try {
		parsed = JSON.parse(text);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		throw new Error(`${configPath} is not valid JSON: ${message}`);
	}
	if (!isObject(parsed)) throw new Error(`${configPath} must contain a JSON object`);
	for (const field of CONFIG_API_KEY_FIELDS) {
		const apiKey = parsed[field];
		if (typeof apiKey === "string" && apiKey.trim().length > 0) return apiKey.trim();
	}
	return undefined;
}

async function readEnvFileApiKey(envPath) {
	const text = await readOptionalFile(envPath);
	if (text === undefined) return undefined;
	const line = text.split("\n").find((entry) => entry.trim().startsWith(`${API_KEY_VARIABLE}=`));
	if (line === undefined) return undefined;
	const value = line
		.slice(line.indexOf("=") + 1)
		.trim()
		.replace(/^["']|["']$/gu, "");
	return value.length > 0 ? value : undefined;
}

// A missing file is the normal offline case. Any other read failure is real.
async function readOptionalFile(path) {
	try {
		return await readFile(path, "utf8");
	} catch (error) {
		if (error?.code === "ENOENT") return undefined;
		const message = error instanceof Error ? error.message : String(error);
		throw new Error(`could not read ${path}: ${message}`);
	}
}

export async function postSystemOne(request, apiKey, options = {}) {
	const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
	const signal = options.signal ?? AbortSignal.timeout(timeoutMs);

	let response;
	try {
		response = await fetch(SYSTEM_ONE_URL, {
			method: "POST",
			headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
			body: JSON.stringify(request),
			signal,
		});
	} catch (error) {
		const timedOut = error?.name === "TimeoutError" || error?.name === "AbortError";
		const message = error instanceof Error ? error.message : String(error);
		return {
			ok: false,
			error: timedOut ? "timeout" : "network",
			httpStatus: 0,
			body: {
				error: timedOut
					? `System One did not answer within ${timeoutMs}ms`
					: `System One request failed: ${message}`,
			},
		};
	}

	const text = await response.text();
	let parsed;
	try {
		parsed = JSON.parse(text);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return {
			ok: false,
			error: "malformed_response",
			httpStatus: response.status,
			body: {
				error: "System One returned a body that is not JSON",
				detail: message,
				raw: text.slice(0, RAW_BODY_PREVIEW_CHARS),
			},
		};
	}

	if (!response.ok) {
		return { ok: false, error: "http_error", httpStatus: response.status, body: parsed };
	}

	const errors = validateAnswers(request, parsed);
	if (errors.length > 0) {
		return { ok: false, error: "answer_mismatch", httpStatus: response.status, body: parsed, errors };
	}

	return { ok: true, error: null, httpStatus: response.status, body: parsed };
}

// Noul is P(yes). Choice and score answers carry their own shape, so callers
// read the field that matches the question type they asked.
export function answerValue(question, answer) {
	if (!isObject(answer)) return undefined;
	if (question.type === "noul") return answer.noul;
	if (question.type === "score") return answer.score;
	if (question.type === "choice") return answer.choice;
	return undefined;
}

export function answerConfidence(answer) {
	return isObject(answer) && typeof answer.confidence === "number" ? answer.confidence : undefined;
}
