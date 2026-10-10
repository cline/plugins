// The flat shape is what people and agents write: facts plus a list of questions.
// This module turns it into a System One request and back, so the tool and the
// playground server build requests the same way.
import { isObject } from "./jev-core.mjs";

export const EXAMPLE_INPUT = {
	facts: "Migration ships Friday. 3 of 5 services done. No rollback rehearsal. 2 open P1s.",
	questions: [
		{ id: "ships_friday", type: "noul", question: "Does the migration ship on Friday?", yes_means: "It ships Friday.", no_means: "It slips past Friday." },
		{
			id: "next_step",
			type: "choice",
			question: "What should the team do next?",
			options: [
				{ name: "flag_it", meaning: "Ship behind a feature flag" },
				{ name: "tests_first", meaning: "Hold until tests cover the gaps" },
				{ name: "split_pr", meaning: "Split into smaller releases" },
			],
		},
		{ id: "friday_risk", type: "score", question: "How risky is shipping on Friday?", levels: ["trivial", "low", "medium", "high"] },
	],
};

export function text(value) {
	return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

// Errors name the question by number and id and use plain words, because people
// read them in the playground as well as agents in tool results.
function buildQuestion(flatQuestion, label, errors) {
	const type = flatQuestion.type;
	const instructions = text(flatQuestion.question);
	if (type !== "noul" && type !== "choice" && type !== "score") {
		errors.push(`${label}: type must be noul (yes/no), choice (pick one), or score (scale)`);
		return undefined;
	}
	if (!instructions) errors.push(`${label}: write the question in words`);

	if (type === "noul") {
		const criteria = {};
		const yes = text(flatQuestion.yes_means);
		const no = text(flatQuestion.no_means);
		if (yes) criteria.true = yes;
		if (no) criteria.false = no;
		return { type, instructions, ...(yes || no ? { criteria } : {}) };
	}

	if (type === "choice") {
		if (!Array.isArray(flatQuestion.options)) {
			errors.push(`${label}: choice needs options, a list of {name, meaning}`);
			return undefined;
		}
		const criteria = {};
		let unnamedCount = 0;
		for (const option of flatQuestion.options) {
			const name = typeof option === "string" ? text(option) : text(option?.name);
			if (!name) {
				unnamedCount += 1;
				continue;
			}
			if (name in criteria) errors.push(`${label}: the option "${name}" appears twice`);
			criteria[name] = typeof option === "string" ? null : (text(option?.meaning) ?? null);
		}
		if (unnamedCount > 0) errors.push(`${label}: ${unnamedCount} option(s) have no name; name them or remove them`);
		else if (Object.keys(criteria).length < 2) errors.push(`${label}: a pick-one question needs at least 2 options`);
		return { type, instructions, criteria };
	}

	if (!Array.isArray(flatQuestion.levels)) {
		errors.push(`${label}: score needs levels, labels ordered lowest first`);
		return undefined;
	}
	const levels = flatQuestion.levels.map((level) => text(level));
	if (levels.some((level) => level === undefined)) errors.push(`${label}: every level needs a name; fill in or remove the empty ones`);
	else if (levels.length < 2) errors.push(`${label}: a scale needs at least 2 levels`);
	return { type, instructions, criteria: levels };
}

// Labeled input fields become the state object; blank rows are skipped so an
// empty field the user added does not reach the model.
function factsFromInputs(inputs, errors) {
	const facts = {};
	inputs.forEach((field, index) => {
		const label = text(field?.label);
		const value = text(field?.value);
		if (!label && value) errors.push(`Input ${index + 1} has a value but no label`);
		if (label && value) facts[label] = value;
	});
	return Object.keys(facts).length > 0 ? facts : undefined;
}

// Returns the System One request, or the input errors in the flat field names.
// Facts come from labeled inputs when present, else from the facts string.
export function buildRequest(input) {
	const errors = [];
	const facts = Array.isArray(input?.inputs)
		? factsFromInputs(input.inputs, errors)
		: isObject(input?.facts) || Array.isArray(input?.facts)
			? input.facts
			: text(input?.facts);
	if (!facts) errors.push("facts must be the situation in plain words, or at least one input needs a label and a value");
	if (!Array.isArray(input?.questions) || input.questions.length === 0) {
		errors.push("questions must be a non-empty list");
		return { errors };
	}

	const questions = {};
	input.questions.forEach((flatQuestion, index) => {
		const id = text(flatQuestion?.id) ?? `q${index + 1}`;
		const label = `Question ${index + 1} (${id})`;
		if (id in questions) errors.push(`${label}: another question already uses the key ${id}`);
		const question = buildQuestion(flatQuestion ?? {}, label, errors);
		if (question) questions[id] = question;
	});
	if (errors.length > 0) return { errors };
	return { request: { ...(text(input.model) ? { model: text(input.model) } : {}), state: facts, questions }, errors };
}

// A pasted request may be the flat template or the raw System One shape. A flat
// paste is returned too, so the playground keeps its name, about, and field hints.
export function parsePasted(pasted) {
	let parsed;
	try {
		parsed = JSON.parse(pasted);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return { errors: [`request_json is not valid JSON: ${message}`] };
	}
	if (!isObject(parsed)) return { errors: ["request_json must be a JSON object"] };
	if ("facts" in parsed || Array.isArray(parsed.questions)) return { ...buildRequest(parsed), flat: parsed };
	return { request: parsed, errors: [] };
}

// The playground edits labeled inputs, so plain facts become one or more fields.
export function toInputs(facts) {
	if (isObject(facts)) {
		return Object.entries(facts).map(([label, value]) => ({ label, value: typeof value === "string" ? value : JSON.stringify(value) }));
	}
	const value = typeof facts === "string" ? facts : JSON.stringify(facts, null, 2);
	return [{ label: "Situation", value }];
}

// A raw System One request converted back to the flat playground shape.
export function toFlat(request) {
	const questions = Object.entries(request.questions).map(([id, question]) => {
		const flatQuestion = { id, type: question.type, question: question.instructions };
		if (question.type === "noul") {
			if (question.criteria?.true) flatQuestion.yes_means = question.criteria.true;
			if (question.criteria?.false) flatQuestion.no_means = question.criteria.false;
		} else if (question.type === "choice") {
			flatQuestion.options = Object.entries(question.criteria).map(([name, meaning]) => ({ name, meaning: meaning ?? "" }));
		} else {
			flatQuestion.levels = question.criteria;
		}
		return flatQuestion;
	});
	return { inputs: toInputs(request.state), questions, ...(text(request.model) ? { model: request.model } : {}) };
}
