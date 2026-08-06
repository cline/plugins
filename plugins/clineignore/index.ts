/**
 * Clineignore Plugin
 *
 * Blocks Cline tool calls that touch paths matched by a workspace
 * .clineignore file (standard .gitignore syntax). Successor to the built-in
 * .clineignore support in the legacy VS Code extension.
 *
 * Guards:
 *   - read_files / editor / apply_patch: skipped when any requested path is ignored
 *   - run_commands: skipped when a file-reading command (cat, grep, head, ...)
 *     targets an ignored path
 *
 * This is context hygiene, not a security boundary. The agent can still reach
 * ignored files through commands this plugin does not recognize.
 *
 * CLI usage:
 *   cline plugin install clineignore
 */

import { existsSync, readFileSync, statSync } from "node:fs";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import ignore, { type Ignore } from "ignore";
import type { AgentPlugin } from "@cline/core";

/**
 * The plugin sandbox's module interop can deliver the "ignore" package as a
 * namespace object ({ default: factory }) instead of the factory function
 * itself, so unwrap whichever shape arrives.
 */
const createIgnore: (options?: { ignorecase?: boolean }) => Ignore =
	typeof ignore === "function"
		? ignore
		: (ignore as unknown as { default: typeof ignore }).default;

const IGNORE_FILE_NAME = ".clineignore";
const INCLUDE_DIRECTIVE = "!include ";
const FILE_ACCESS_TOOL_NAMES = new Set(["read_files", "editor", "apply_patch"]);
const COMMAND_TOOL_NAME = "run_commands";

/**
 * Shell commands whose arguments are treated as file reads. Mirrors the
 * legacy extension's ClineIgnoreController list (Unix + PowerShell).
 */
const FILE_READING_COMMANDS = new Set([
	"cat",
	"less",
	"more",
	"head",
	"tail",
	"grep",
	"awk",
	"sed",
	"get-content",
	"gc",
	"type",
	"select-string",
	"sls",
]);

let workspaceRoot = process.cwd();

// =============================================================================
// .clineignore loading (re-checked per tool call, cached by mtime + size)
// =============================================================================

let cachedMatcher: { key: string; matcher: Ignore } | undefined;

function resolveIncludes(content: string): string {
	const lines: string[] = [];
	for (const line of content.split(/\r?\n/)) {
		if (!line.startsWith(INCLUDE_DIRECTIVE)) {
			lines.push(line);
			continue;
		}
		const includePath = line.slice(INCLUDE_DIRECTIVE.length).trim();
		if (!includePath) {
			continue;
		}
		try {
			lines.push(readFileSync(resolve(workspaceRoot, includePath), "utf8"));
		} catch {
			// Missing include files are skipped, matching the legacy behavior.
		}
	}
	return lines.join("\n");
}

function loadMatcher(): Ignore | undefined {
	const ignorePath = join(workspaceRoot, IGNORE_FILE_NAME);
	let key: string;
	try {
		const stats = statSync(ignorePath);
		key = `${stats.mtimeMs}:${stats.size}`;
	} catch {
		cachedMatcher = undefined;
		return undefined;
	}
	if (cachedMatcher?.key === key) {
		return cachedMatcher.matcher;
	}
	try {
		const matcher = createIgnore();
		matcher.add(resolveIncludes(readFileSync(ignorePath, "utf8")));
		matcher.add(IGNORE_FILE_NAME);
		cachedMatcher = { key, matcher };
		return matcher;
	} catch (error) {
		cachedMatcher = undefined;
		const message = error instanceof Error ? error.message : String(error);
		console.warn(`[clineignore] could not load ${IGNORE_FILE_NAME}: ${message}`);
		return undefined;
	}
}

// =============================================================================
// Path checks
// =============================================================================

function toWorkspaceRelativePath(path: string): string | undefined {
	const absolutePath = resolve(workspaceRoot, path);
	const relativePath = relative(workspaceRoot, absolutePath);
	if (
		relativePath.length === 0 ||
		relativePath === ".." ||
		relativePath.startsWith(`..${sep}`) ||
		isAbsolute(relativePath) ||
		resolve(workspaceRoot, relativePath) !== absolutePath
	) {
		return undefined;
	}
	return relativePath.split(sep).join("/");
}

/** Paths outside the workspace are allowed, matching the legacy behavior. */
function isIgnored(matcher: Ignore, path: string): boolean {
	const relativePath = toWorkspaceRelativePath(path);
	if (!relativePath) {
		return false;
	}
	try {
		return matcher.ignores(relativePath);
	} catch {
		return false;
	}
}

// =============================================================================
// Tool input path extraction
// =============================================================================

function asRecord(value: unknown): Record<string, unknown> | undefined {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		return undefined;
	}
	return value as Record<string, unknown>;
}

function addPath(value: unknown, paths: string[]): void {
	if (typeof value === "string" && value.trim().length > 0) {
		paths.push(value);
		return;
	}
	const record = asRecord(value);
	if (typeof record?.path === "string" && record.path.trim().length > 0) {
		paths.push(record.path);
	}
}

function addPathList(value: unknown, paths: string[]): void {
	if (Array.isArray(value)) {
		for (const entry of value) {
			addPath(entry, paths);
		}
		return;
	}
	addPath(value, paths);
}

function extractStructuredPaths(input: unknown): string[] {
	const paths: string[] = [];
	addPath(input, paths);

	if (Array.isArray(input)) {
		addPathList(input, paths);
		return paths;
	}

	const record = asRecord(input);
	if (!record) {
		return paths;
	}

	addPathList(record.files, paths);
	addPathList(record.file_paths, paths);
	addPathList(record.paths, paths);
	return paths;
}

function getApplyPatchInput(input: unknown): string | undefined {
	if (typeof input === "string") {
		return input;
	}
	const record = asRecord(input);
	if (typeof record?.input === "string") {
		return record.input;
	}
	return undefined;
}

function extractApplyPatchPaths(input: unknown): string[] {
	const patch = getApplyPatchInput(input);
	if (!patch) {
		return [];
	}

	const paths: string[] = [];
	const pathHeaders = [
		"*** Add File: ",
		"*** Update File: ",
		"*** Delete File: ",
		"*** Move to: ",
	];

	for (const line of patch.split(/\r?\n/)) {
		for (const header of pathHeaders) {
			if (line.startsWith(header)) {
				const path = line.slice(header.length).trim();
				if (path.length > 0) {
					paths.push(path);
				}
				break;
			}
		}
	}

	return paths;
}

function extractRequestedPaths(toolName: string, input: unknown): string[] {
	if (toolName === "apply_patch") {
		return extractApplyPatchPaths(input);
	}
	return extractStructuredPaths(input);
}

// =============================================================================
// run_commands scanning
// =============================================================================

function extractCommands(input: unknown): string[] {
	const commands: string[] = [];

	const addEntry = (value: unknown): void => {
		if (typeof value === "string") {
			if (value.trim().length > 0) {
				commands.push(value);
			}
			return;
		}
		const record = asRecord(value);
		if (typeof record?.command === "string" && record.command.length > 0) {
			const args = Array.isArray(record.args)
				? record.args.filter((arg): arg is string => typeof arg === "string")
				: [];
			commands.push([record.command, ...args].join(" "));
		}
	};

	const addEntries = (value: unknown): void => {
		if (Array.isArray(value)) {
			for (const entry of value) {
				addEntry(entry);
			}
			return;
		}
		addEntry(value);
	};

	if (typeof input === "string" || Array.isArray(input)) {
		addEntries(input);
		return commands;
	}

	const record = asRecord(input);
	if (!record) {
		return commands;
	}
	if (record.commands !== undefined) {
		addEntries(record.commands);
	} else if (typeof record.command === "string") {
		addEntry(record);
	} else if (typeof record.cmd === "string") {
		addEntry(record.cmd);
	}
	return commands;
}

/**
 * Returns the first ignored path a file-reading command would touch.
 * Naive tokenization (no quote or redirection awareness), same tradeoff the
 * legacy controller made. Pipelines and sequenced commands are split so each
 * segment's base command is checked.
 */
function findBlockedCommandPath(
	matcher: Ignore,
	command: string,
): string | undefined {
	const segments = command.split(/\|\|?|&&|;/);
	for (const segment of segments) {
		const tokens = segment.trim().split(/\s+/).filter(Boolean);
		const baseCommand = tokens[0]?.toLowerCase();
		if (!baseCommand || !FILE_READING_COMMANDS.has(baseCommand)) {
			continue;
		}
		for (const arg of tokens.slice(1)) {
			if (arg.startsWith("-") || arg.includes(":")) {
				continue;
			}
			if (isIgnored(matcher, arg)) {
				return arg;
			}
		}
	}
	return undefined;
}

// =============================================================================
// Plugin
// =============================================================================

function blockedReason(paths: string[]): string {
	const list = paths.join(", ");
	return (
		`Access to ${list} is blocked by the ${IGNORE_FILE_NAME} file. ` +
		"Continue the task without using these files, or ask the user to " +
		`update ${IGNORE_FILE_NAME}. If this call also included allowed ` +
		"paths, request those again in a separate call."
	);
}

const plugin: AgentPlugin = {
	name: "clineignore",
	manifest: {
		capabilities: ["hooks", "rules"],
	},

	setup(api, ctx) {
		workspaceRoot = ctx.workspaceInfo?.rootPath ?? process.cwd();
		if (existsSync(join(workspaceRoot, IGNORE_FILE_NAME))) {
			api.registerRule({
				id: "clineignore",
				source: "clineignore plugin",
				content:
					`This workspace has a ${IGNORE_FILE_NAME} file at its root ` +
					"listing paths (in .gitignore syntax) the user does not want " +
					"you to access. Tool calls that read or edit matching paths, " +
					"and shell commands that read them, will be blocked. If you " +
					"need a blocked file to finish the task, ask the user to " +
					`update ${IGNORE_FILE_NAME}.`,
			});
		}
	},

	hooks: {
		async beforeTool({ toolCall, input }) {
			const isFileAccessTool = FILE_ACCESS_TOOL_NAMES.has(toolCall.toolName);
			const isCommandTool = toolCall.toolName === COMMAND_TOOL_NAME;
			if (!isFileAccessTool && !isCommandTool) {
				return undefined;
			}

			const matcher = loadMatcher();
			if (!matcher) {
				return undefined;
			}

			if (isFileAccessTool) {
				const blocked = [
					...new Set(
						extractRequestedPaths(toolCall.toolName, input).filter((path) =>
							isIgnored(matcher, path),
						),
					),
				];
				if (blocked.length > 0) {
					console.error(
						`[clineignore] blocked ${toolCall.toolName}: ${blocked.join(", ")}`,
					);
					return { skip: true, reason: blockedReason(blocked) };
				}
				return undefined;
			}

			for (const command of extractCommands(input)) {
				const blockedPath = findBlockedCommandPath(matcher, command);
				if (blockedPath) {
					console.error(
						`[clineignore] blocked ${toolCall.toolName}: ${blockedPath}`,
					);
					return { skip: true, reason: blockedReason([blockedPath]) };
				}
			}
			return undefined;
		},
	},
};

export { plugin };
export default plugin;
