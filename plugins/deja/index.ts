/**
 * deja: recall from past coding sessions
 *
 * Runs the user-installed `deja` binary (https://github.com/vshulcz/deja-vu),
 * which indexes the session transcripts Cline and other coding agents already
 * keep on disk. Nothing here talks to the network. Every call is bounded by a
 * timeout, and a missing binary or a failed call is silence, never an error.
 *
 * CLI usage:
 *   cline plugin install deja
 *   cline -i "why did we pin the redis client last month?"
 */

import { execFileSync } from "node:child_process";
import type { AgentPlugin } from "@cline/sdk";

const DEJA = process.env.DEJA_BIN || "deja";

type Part = { type?: string; text?: string; [key: string]: any };
type Msg = { role?: string; content?: any; [key: string]: any };

function run(args: string[], input = "", timeout = 10000): string {
	try {
		return execFileSync(DEJA, args, {
			input,
			encoding: "utf8",
			timeout,
			maxBuffer: 4 * 1024 * 1024,
			stdio: ["pipe", "pipe", "ignore"],
		}).trim();
	} catch {
		// Memory is optional. A plugin that throws here takes the session with it.
		return "";
	}
}

// Cline wraps what the user typed in a mode tag before it becomes a message.
function userText(message: Msg | undefined): string {
	if (!message || message.role !== "user" || !Array.isArray(message.content)) return "";
	const text = message.content
		.filter((part: Part) => part && part.type === "text" && typeof part.text === "string")
		.map((part: Part) => part.text)
		.join("\n");
	return text.replace(/<\/?user_input[^>]*>/g, "").trim();
}

// Tools whose failure a shell error signature describes. Cline's is
// run_commands. File edits fail in ways a shell signature can't read.
const COMMAND_TOOLS = new Set([
	"run_commands",
	"execute_command",
	"run_command",
	"Bash",
	"bash",
	"shell",
	"terminal",
]);

// The newest command tool_result that failed, as build() sees it:
// {type:"tool_result", name, content:[{query,result,error,success}]}.
// null when the last command did not fail.
function commandFailure(messages: Msg[]) {
	for (let i = messages.length - 1; i >= 0; i--) {
		const m = messages[i];
		if (!m || !Array.isArray(m.content)) continue;
		for (const part of m.content) {
			if (!part || part.type !== "tool_result" || !COMMAND_TOOLS.has(part.name)) continue;
			const entries = Array.isArray(part.content) ? part.content : [];
			for (const e of entries) {
				if (!e || e.success !== false) continue;
				const output =
					typeof e.result === "string" ? e.result : typeof e.error === "string" ? e.error : "";
				if (!output.trim()) continue;
				return { at: i, entry: e, id: part.tool_use_id || "", name: part.name, output };
			}
		}
		// Only the most recent tool result is worth a repair.
		if (m.content.some((p: Part) => p && p.type === "tool_result")) break;
	}
	return null;
}

// A copy of a tool_result part with the repair added to the failing entry's
// result text, so what Cline serializes stays valid.
function appendRepair(part: Part, line: string): Part {
	return {
		...part,
		content: (Array.isArray(part.content) ? part.content : []).map((e: any) =>
			e && e.success === false && typeof e.result === "string"
				? { ...e, result: `${e.result}\n\n${line}` }
				: e,
		),
	};
}

// Hooks sit on the plugin object and setup sees the session, so both share these.
let session = "";
let compacted = false;
let workspace = "";

// Cline's status notice for a compaction about to run:
// {type:"status-notice", metadata:{kind:"auto_compaction", phase:"started"}}.
function isCompactionStart(ev: any): boolean {
	const meta = ev && ev.type === "status-notice" && ev.metadata;
	return (
		Boolean(meta) &&
		typeof meta.kind === "string" &&
		meta.kind.endsWith("compaction") &&
		meta.phase === "started"
	);
}

// The files a tool call reads or edits, in the names `deja hook-tool` expects.
function fileCalls(tool: string, input: any): string[][] {
	if (!input) return [];
	if (tool === "read_files" && Array.isArray(input.files)) {
		return input.files
			.filter((f: any) => f && typeof f.path === "string")
			.map((f: any) => ["read", f.path]);
	}
	if (tool === "editor" && typeof input.path === "string") return [["edit", input.path]];
	if (tool === "apply_patch" && typeof input.input === "string") {
		return [["apply_patch", "", input.input]];
	}
	return [];
}

const plugin: AgentPlugin = {
	name: "deja",
	manifest: {
		capabilities: ["rules", "commands", "skills", "hooks", "messageBuilders", "mcp"],
	},

	hooks: {
		onEvent: (ev: any) => {
			if (!isCompactionStart(ev) || !session) return;
			compacted = true;
			run(
				["hook-precompact"],
				JSON.stringify({ session_id: session, cwd: workspace || process.cwd(), harness: "cline" }),
			);
		},
		// What beforeTool returns as appendContext reaches the model beside the
		// tool's result: the notes past sessions left about the file.
		beforeTool: (ctx: any) => {
			try {
				const name = ctx?.toolCall?.toolName || "";
				for (const [tool, path, patch] of fileCalls(name, ctx?.input)) {
					const line = run(
						["hook-tool", "--plain"],
						JSON.stringify({
							tool_name: tool,
							tool_input: patch ? { command: patch } : { file_path: path },
							session_id: session,
							cwd: workspace || process.cwd(),
						}),
						5000,
					);
					if (line) return { appendContext: line };
				}
			} catch {}
			return undefined;
		},
		// A run ends: drop the session's live mark so recall from another session
		// can return this one right away.
		afterRun: () => {
			if (session) {
				run(
					["hook-session-end"],
					JSON.stringify({ session_id: session, cwd: workspace || process.cwd() }),
					2000,
				);
			}
		},
	},

	setup(api, ctx: any) {
		const sessionID = ctx?.session?.sessionId || "";
		session = sessionID;
		workspace = ctx?.workspaceInfo?.rootPath || "";
		const cwd = workspace || process.cwd();

		api.registerMcpServer({
			name: "deja",
			transport: { type: "stdio", command: DEJA, args: ["mcp"] },
		});

		// build runs more than once per prompt and only the last return is sent,
		// so the answer is cached per prompt instead of computed once.
		let asked = "";
		let recalled = "";
		// One repair lookup per failed command, keyed by tool_use id.
		const repairs = new Map<string, string>();
		api.registerMessageBuilder({
			name: "deja:prompt",
			build: (input: any) => {
				const messages = input as Msg[];
				if (!Array.isArray(messages)) return input;
				let out: Msg[] | null = null;
				const edit = () => out || (out = messages.slice());

				// Recall for the question just asked, prepended to the last user
				// message. Cline's own "[SYSTEM]" reminders are skipped.
				let at = -1;
				for (let i = messages.length - 1; i >= 0; i--) {
					const text = messages[i]?.role === "user" ? userText(messages[i]) : "";
					if (text && !/^\s*\[SYSTEM\]/.test(text)) {
						at = i;
						break;
					}
				}
				if (at >= 0) {
					const prompt = userText(messages[at]);
					// After a compaction the same prompt is asked again, and the
					// answer is now the recovery packet.
					if (prompt !== asked || compacted) {
						asked = prompt;
						compacted = false;
						recalled = run(
							["hook-prompt", "--plain"],
							JSON.stringify({ prompt, session_id: sessionID, cwd }),
						);
					}
					// Usually empty: the hook only speaks when history answers the question.
					if (recalled) {
						const o = edit();
						o[at] = {
							...messages[at],
							content: [{ type: "text", text: recalled }, ...messages[at].content],
						};
					}
				}

				// The command that just failed, and what this machine ran after the
				// same error before. Rides beside the failing result in the same turn.
				const fail = commandFailure(messages);
				if (fail) {
					if (!repairs.has(fail.id)) {
						repairs.set(
							fail.id,
							run(
								["hook-tool-after", "--plain"],
								JSON.stringify({
									tool_name: fail.name,
									tool_response: fail.output,
									session_id: sessionID,
									cwd,
								}),
							),
						);
					}
					const line = repairs.get(fail.id);
					if (line) {
						const o = edit();
						const m = o[fail.at];
						o[fail.at] = {
							...m,
							content: m.content.map((p: Part) =>
								p === fail.entry || (p && p.type === "tool_result" && p.tool_use_id === fail.id)
									? appendRepair(p, line)
									: p,
							),
						};
					}
				}

				return out || messages;
			},
		});

		api.registerRule({
			id: "deja:recall",
			source: "deja",
			// Resolved when the session builds its instructions, so each session
			// starts with current history about this workspace.
			content: () =>
				run(["hook-context", "--plain"], JSON.stringify({ session_id: sessionID, cwd })),
		});

		api.registerCommand({
			name: "deja",
			description: "Search your own past coding sessions",
			handler: (input) => {
				const query = (input || "").trim();
				if (!query) return "Usage: /deja <what you are looking for>";
				// The first search may build the index, so a typed command gets
				// a longer timeout. "--" keeps a query like "--json" out of flag parsing.
				const args = query.startsWith("-") ? ["search", "--", query] : ["search", query];
				const found = run(args, "", 120000);
				return found || `No past session matches ${query}.`;
			},
		});
	},
};

export default plugin;
