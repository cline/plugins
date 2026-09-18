import { setTimeout as delay } from "node:timers/promises";
import type { Page } from "playwright";
import {
	isNavigationReadError,
	observe,
	StaleObservationError,
} from "./jev-browser.ts";
import { createJevPolicy, type JevPolicy } from "./jev-model.ts";

export interface RunInput {
	goal: string;
	maxSteps?: number;
	minProbability?: number;
}
export interface RunStep {
	step: number;
	operation: string;
	target?: string;
	probability?: number;
	providerConfidence?: unknown;
	status: "attempted" | "executed" | "decision" | "stale";
	latencyMs: number;
	reason?: string;
}
export type RunStatus =
	| "done_unverified"
	| "blocked"
	| "needs_review"
	| "uncertain"
	| "step_limit"
	| "evaluation_limit"
	| "interrupted";

export interface ActionHistory {
	action: string;
	kind: string;
	text?: string;
	page_changed: boolean;
}
export interface RunMemory {
	goal: string;
	actions: ActionHistory[];
}

export async function runJev(
	input: RunInput,
	options: {
		page: () => Page;
		signal?: AbortSignal;
		onStep?: (step: RunStep) => Promise<void>;
		policy?: JevPolicy;
		memory?: RunMemory;
	},
) {
	if (
		typeof input.goal !== "string" ||
		!input.goal.trim() ||
		input.goal.length > 12000
	)
		throw new Error("goal must contain 1–12000 characters.");
	const maxSteps = input.maxSteps ?? 20;
	if (!Number.isInteger(maxSteps) || maxSteps < 1 || maxSteps > 60)
		throw new Error("maxSteps must be an integer from 1 to 60.");
	const minProbability = input.minProbability;
	if (
		minProbability !== undefined &&
		(!Number.isFinite(minProbability) ||
			minProbability < 0 ||
			minProbability > 1)
	)
		throw new Error("minProbability must be from 0 to 1.");
	const signal = AbortSignal.any([
		AbortSignal.timeout(100_000),
		...(options.signal ? [options.signal] : []),
	]);
	signal.throwIfAborted();
	const policy = options.policy ?? createJevPolicy();
	const steps: RunStep[] = [];
	const memory = options.memory ?? { goal: input.goal, actions: [] };
	if (memory.goal !== input.goal) {
		memory.goal = input.goal;
		memory.actions = [];
	}
	let executed = 0;
	let stage = "observation";
	const textCache = new Map<string, string>();
	const started = performance.now();
	let failure: { stage: string; category: string } | undefined;
	const finish = (status: RunStatus, message: string) => ({
		failure,
		status,
		message,
		steps,
		elapsedMs: Math.round(performance.now() - started),
	});
	try {
		for (
			let evaluation = 1;
			evaluation <= maxSteps * 2 && executed < maxSteps;
			evaluation++
		) {
			const step = executed + 1;
			stage = "observation";
			signal.throwIfAborted();
			const page = options.page();
			const snapshot = await observe(page, signal);
			try {
				const decisionStarted = performance.now();
				stage = "evaluation";
				const decision = await policy.choose(
					snapshot.data,
					input.goal,
					memory.actions,
					signal,
				);
				signal.throwIfAborted();
				await options.onStep?.({
					step,
					operation: decision.operation,
					target: decision.target?.label,
					probability: decision.probability,
					providerConfidence: decision.providerConfidence,
					status: "decision",
					latencyMs: Math.round(performance.now() - decisionStarted),
				});
				if (!["CLICK", "SELECT"].includes(decision.operation))
					await snapshot.assertFresh();
				if (page !== options.page())
					throw new StaleObservationError("Active tab changed.");
				if (decision.operation === "REVIEW")
					return finish(
						"needs_review",
						"Cline must inspect the page and handle the next action with appropriate user authorization.",
					);
				if (decision.operation === "BLOCKED")
					return finish(
						"blocked",
						"Jev cannot advance this goal with supported actions.",
					);
				if (
					minProbability !== undefined &&
					(decision.probability === undefined ||
						!Number.isFinite(decision.probability) ||
						decision.probability < minProbability)
				) {
					return finish(
						"uncertain",
						"Selected-choice probability did not meet the requested minProbability; inspect the decision trace.",
					);
				}
				if (decision.operation === "DONE")
					return finish(
						"done_unverified",
						"Jev believes the goal is complete. Cline must independently verify the outcome.",
					);
				let text: string | undefined;
				if (decision.operation === "TYPE_TEXT") {
					if (!decision.target) throw new Error("Missing text target.");
					stage = "text_helper";
					const cacheKey = JSON.stringify([
						snapshot.data,
						input.goal,
						decision.target,
						memory.actions,
					]);
					text = textCache.get(cacheKey);
					if (text === undefined) {
						text = await policy.text(
							snapshot.data,
							input.goal,
							decision.target,
							memory.actions,
							signal,
						);
						textCache.set(cacheKey, text);
					}
				}
				if (page !== options.page())
					throw new StaleObservationError("Active tab changed.");
				signal.throwIfAborted();
				const entry: RunStep = {
					step,
					operation: decision.operation,
					target: decision.target?.label,
					probability: decision.probability,
					providerConfidence: decision.providerConfidence,
					status: "attempted",
					latencyMs: Math.round(performance.now() - decisionStarted),
				};
				steps.push(entry);
				await options.onStep?.({ ...entry });
				stage = "action";
				try {
					await snapshot.execute(
						decision.operation,
						decision.target,
						text,
						signal,
					);
				} catch (error) {
					if (error instanceof StaleObservationError) steps.pop();
					throw error;
				}
				executed++;
				entry.status = "executed";
				await options.onStep?.({ ...entry });
				// Let event handlers render before the next read, without screenshot or network-idle waits.
				await delay(
					decision.target?.role === "radio" || decision.operation === "SELECT"
						? 600
						: decision.operation === "TYPE_TEXT" ||
								decision.operation.startsWith("SCROLL")
							? 150
							: 350,
					undefined,
					{
						signal,
					},
				);
				stage = "post_action_observation";
				const after = await observe(options.page(), signal);
				try {
					memory.actions.push({
						action: decision.target?.label ?? decision.operation,
						kind: decision.operation,
						text,
						page_changed:
							JSON.stringify(after.data) !== JSON.stringify(snapshot.data),
					});
					memory.actions.splice(0, Math.max(0, memory.actions.length - 10));
					const recent = memory.actions
						.filter((a) => a.kind !== "WAIT")
						.slice(-3);
					if (recent.length === 3 && recent.every((a) => !a.page_changed))
						return finish(
							"blocked",
							"Three actions produced no observable progress.",
						);
				} finally {
					await after.dispose().catch(() => undefined);
				}
			} catch (error) {
				if (!(error instanceof StaleObservationError)) throw error;
				await options.onStep?.({
					step,
					operation: "REOBSERVE",
					status: "stale",
					reason: /covered/.test(error.message)
						? "target_unavailable"
						: /disappeared/.test(error.message)
							? "target_disappeared"
							: "observation_changed",
					latencyMs: 0,
				});
			} finally {
				await snapshot.dispose().catch(() => undefined);
			}
		}
		return finish(
			executed >= maxSteps ? "step_limit" : "evaluation_limit",
			executed >= maxSteps
				? "Action budget reached. Inspect current progress before continuing."
				: "Evaluation budget reached because decisions could not be executed. Inspect stale reasons in the trace.",
		);
	} catch (error) {
		failure = {
			stage,
			category: signal.aborted
				? "cancelled"
				: isNavigationReadError(error)
					? "navigation_context"
					: error instanceof Error && error.name === "TimeoutError"
						? "timeout"
						: error instanceof Error &&
								/createTreeWalker|JEV_DOCUMENT_NOT_READY/.test(error.message)
							? "document_not_ready"
							: "unexpected_error",
		};
		// Provider errors may contain request bodies. Keep keys, prompts, and field
		// values out of tool errors. An attempted action may have taken effect.
		return finish(
			"interrupted",
			signal.aborted
				? "Run cancelled or timed out. Inspect the page before any further actions."
				: `Run failed during ${stage}${isNavigationReadError(error) ? " (document changed during observation)" : ""}. Inspect the page and trace; attempted actions may have taken effect and were not retried.`,
		);
	}
}
