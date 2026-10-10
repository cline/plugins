// The guard page's server: edit policies, test them against samples, and read
// what the guard caught in live Cline sessions. Imported by the plugin for
// openGuardPage; run directly with node to serve.
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { openSync, readFileSync } from "node:fs";
import { mkdir, readFile, realpath } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { runChecks } from "./check.mjs";
import { GUARD_DIR, LOG_PATH, STARTER_CHECKS, listPolicies, readPolicy, validatePolicy, writePolicy } from "./policy.mjs";

const PORT = 4748;
const HOST = "127.0.0.1";
const BASE_URL = `http://${HOST}:${PORT}`;
const ALLOWED_HOSTS = new Set([`${HOST}:${PORT}`, `localhost:${PORT}`]);
const PLUGIN_DIR = dirname(fileURLToPath(import.meta.url));
const PAGE_PATH = join(PLUGIN_DIR, "guard.html");
const SERVER_LOG_PATH = join(GUARD_DIR, "server.log");
const HEALTH_TIMEOUT_MS = 500;
const STARTUP_WAIT_MS = 5_000;
const STARTUP_POLL_MS = 100;
const MAX_BODY_BYTES = 2_000_000;
const LOG_ENTRIES_SHOWN = 50;
const HTTP_OK = 200;
const HTTP_BAD_REQUEST = 400;
const HTTP_FORBIDDEN = 403;
const HTTP_NOT_FOUND = 404;
const HTTP_TOO_LARGE = 413;
const HTTP_SERVER_ERROR = 500;

// Reported by /health, so a reinstalled or moved plugin replaces a stale server.
const CODE_HASH = createHash("sha1")
	.update([PLUGIN_DIR, ...["guard-server.mjs", "check.mjs", "policy.mjs", "jev-core.mjs"].map((file) => readFileSync(join(PLUGIN_DIR, file), "utf8"))].join("\n"))
	.digest("hex");

// Folders are compared as real paths, so /tmp and /private/tmp mean the same place.
async function realFolders(folders) {
	return Promise.all(
		folders.map(async (folder) => {
			try {
				return await realpath(folder);
			} catch (error) {
				if (error?.code === "ENOENT") return folder;
				throw error;
			}
		}),
	);
}

export async function savePolicy(slug, input) {
	const { errors, policy } = validatePolicy(input);
	const saved = await writePolicy(slug, { ...policy, folders: await realFolders(policy.folders) });
	return { policy: saved, errors };
}

async function readLog() {
	let raw;
	try {
		raw = await readFile(LOG_PATH, "utf8");
	} catch (error) {
		if (error?.code === "ENOENT") return [];
		throw error;
	}
	return raw.trim().split("\n").filter(Boolean).slice(-LOG_ENTRIES_SHOWN).map((line) => JSON.parse(line)).reverse();
}

function send(response, status, payload, contentType = "application/json") {
	response.writeHead(status, { "Content-Type": contentType, "Cache-Control": "no-store" });
	response.end(contentType === "application/json" ? JSON.stringify(payload) : payload);
}

async function readBody(request) {
	const chunks = [];
	let size = 0;
	for await (const chunk of request) {
		size += chunk.length;
		if (size > MAX_BODY_BYTES) throw Object.assign(new Error("request body is too large"), { status: HTTP_TOO_LARGE });
		chunks.push(chunk);
	}
	const raw = Buffer.concat(chunks).toString("utf8");
	try {
		return raw.length > 0 ? JSON.parse(raw) : {};
	} catch (error) {
		throw Object.assign(new Error(`body is not JSON: ${error.message}`), { status: HTTP_BAD_REQUEST });
	}
}

// The key lives on this server, so only this page may call it: a foreign Host
// means DNS rebinding and a foreign Origin means another site posting here.
function isTrustedRequest(request) {
	if (!ALLOWED_HOSTS.has(request.headers.host ?? "")) return false;
	const origin = request.headers.origin;
	return origin === undefined || ALLOWED_HOSTS.has(origin.replace(/^https?:\/\//u, ""));
}

async function route(request, response) {
	const url = new URL(request.url ?? "/", BASE_URL);
	const policyMatch = url.pathname.match(/^\/api\/policies\/([a-z0-9-]+)(\/test)?$/u);

	if (request.method === "GET" && url.pathname === "/") return send(response, HTTP_OK, await readFile(PAGE_PATH, "utf8"), "text/html; charset=utf-8");
	if (request.method === "GET" && url.pathname === "/health") return send(response, HTTP_OK, { app: "jev-guard", codeHash: CODE_HASH });
	if (request.method === "POST" && url.pathname === "/shutdown") {
		send(response, HTTP_OK, { stopping: true });
		setImmediate(() => process.exit(0));
		return undefined;
	}
	if (request.method === "GET" && url.pathname === "/api/policies") {
		const policies = await listPolicies();
		return send(response, HTTP_OK, policies.map(({ slug, name, updatedAt, everywhere, folders }) => ({ slug, name, updatedAt, everywhere, folders })));
	}
	if (request.method === "GET" && url.pathname === "/api/log") return send(response, HTTP_OK, await readLog());
	if (request.method === "GET" && url.pathname === "/api/starter-checks") return send(response, HTTP_OK, STARTER_CHECKS);
	if (policyMatch) {
		const [, slug, isTest] = policyMatch;
		if (request.method === "GET" && !isTest) {
			const policy = await readPolicy(slug);
			return policy ? send(response, HTTP_OK, policy) : send(response, HTTP_NOT_FOUND, { error: `no guard ${slug}` });
		}
		if (request.method === "PUT" && !isTest) return send(response, HTTP_OK, await savePolicy(slug, await readBody(request)));
		if (request.method === "POST" && isTest) {
			// Tests run the policy as currently edited, so tuning does not need a save first.
			const body = await readBody(request);
			const { errors, policy } = validatePolicy(body.policy);
			if (errors.length > 0) return send(response, HTTP_OK, { status: "invalid", errors, verdicts: {} });
			const texts = (Array.isArray(body.texts) ? body.texts : []).filter((entry) => typeof entry?.text === "string" && entry.text.trim().length > 0);
			return send(response, HTTP_OK, await runChecks(policy, texts));
		}
	}
	return send(response, HTTP_NOT_FOUND, { error: "not found" });
}

function serve() {
	const server = createServer((request, response) => {
		if (!isTrustedRequest(request)) return send(response, HTTP_FORBIDDEN, { error: "only the local guard page may call this server" });
		route(request, response).catch((error) => {
			console.error(`[jev-guard] ${request.method} ${request.url}: ${error?.stack ?? error}`);
			if (!response.headersSent) send(response, error?.status ?? HTTP_SERVER_ERROR, { error: error?.message ?? String(error) });
		});
		return undefined;
	});
	server.listen(PORT, HOST, () => console.error(`[jev-guard] serving ${BASE_URL} from ${PLUGIN_DIR}`));
}

async function readHealth() {
	try {
		const response = await fetch(`${BASE_URL}/health`, { signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS) });
		return response.ok ? await response.json() : undefined;
	} catch (error) {
		// Refused or timed out is the normal "no server yet" case. Node reports it as a
		// TypeError from fetch, Bun (the Cline binary) as a ConnectionRefused code.
		if (error?.name === "TimeoutError" || error?.name === "TypeError" || error?.code === "ConnectionRefused") return undefined;
		throw error;
	}
}

async function waitForHealth(isWanted) {
	const deadline = Date.now() + STARTUP_WAIT_MS;
	while (Date.now() < deadline) {
		if (isWanted(await readHealth())) return true;
		await new Promise((resolve) => setTimeout(resolve, STARTUP_POLL_MS));
	}
	return false;
}

// Runs the server as a detached node process so it outlives a one-shot cline run.
async function ensureServer() {
	const health = await readHealth();
	if (health?.codeHash === CODE_HASH) return;
	if (health?.app === "jev-guard") {
		await fetch(`${BASE_URL}/shutdown`, { method: "POST" });
		await waitForHealth((current) => current === undefined);
	} else if (health !== undefined) {
		throw new Error(`port ${PORT} is taken by something other than the Jev guard page`);
	}
	await mkdir(GUARD_DIR, { recursive: true });
	const log = openSync(SERVER_LOG_PATH, "a");
	await new Promise((resolve, reject) => {
		const child = spawn("node", [fileURLToPath(import.meta.url)], { detached: true, stdio: ["ignore", log, log], env: process.env });
		child.once("error", (error) => reject(new Error(`could not start the guard page server with node: ${error.message}`)));
		child.once("spawn", () => {
			child.unref();
			resolve(undefined);
		});
	});
	if (!(await waitForHealth((current) => current?.codeHash === CODE_HASH))) {
		throw new Error(`the guard page server did not come up on ${BASE_URL}; see ${SERVER_LOG_PATH}`);
	}
}

const BROWSER_OPENERS = { darwin: ["open"], win32: ["cmd", "/c", "start", ""] };

function openBrowser(url) {
	const [command, ...args] = BROWSER_OPENERS[process.platform] ?? ["xdg-open"];
	const child = spawn(command, [...args, url], { detached: true, stdio: "ignore" });
	child.once("error", (error) => console.warn(`[jev-guard] could not open a browser: ${error.message}`));
	child.unref();
}

export async function openGuardPage(slug) {
	await ensureServer();
	const url = `${BASE_URL}/#${slug}`;
	openBrowser(url);
	return url;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) serve();
