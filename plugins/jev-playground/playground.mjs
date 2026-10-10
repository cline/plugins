// The Jev playground: a local page where anyone can edit a bucket (labeled input
// fields plus questions) and call System One without an agent in the loop.
// Imported by the plugin for openPlayground; run directly with node to serve.
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { openSync, readFileSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { expectedAnswerShape, isObject, normalizeRequest, postSystemOne, readApiKey, validateRequest } from "./jev-core.mjs";
import { buildRequest, text } from "./jev-flat.mjs";

const PORT = 4747;
const HOST = "127.0.0.1";
const BASE_URL = `http://${HOST}:${PORT}`;
const ALLOWED_HOSTS = new Set([`${HOST}:${PORT}`, `localhost:${PORT}`]);
const PLUGIN_DIR = dirname(fileURLToPath(import.meta.url));
const PAGE_PATH = join(PLUGIN_DIR, "playground.html");
export const BUCKETS_DIR = join(homedir(), ".cline", "plugins", "jev-buckets");
const SERVER_LOG_PATH = join(BUCKETS_DIR, "server.log");
const HEALTH_TIMEOUT_MS = 500;
const STARTUP_WAIT_MS = 5_000;
const STARTUP_POLL_MS = 100;
const MAX_BODY_BYTES = 1_000_000;
const MAX_SLUG_CHARS = 60;
const HTTP_OK = 200;
const HTTP_BAD_REQUEST = 400;
const HTTP_FORBIDDEN = 403;
const HTTP_NOT_FOUND = 404;
const HTTP_TOO_LARGE = 413;
const HTTP_SERVER_ERROR = 500;

// The server reports a hash of its own code and location, so a reinstalled or
// relocated plugin replaces a server that is still running the old code.
const CODE_HASH = createHash("sha1")
	.update([PLUGIN_DIR, ...["playground.mjs", "jev-flat.mjs", "jev-core.mjs"].map((file) => readFileSync(join(PLUGIN_DIR, file), "utf8"))].join("\n"))
	.digest("hex");

export function slugify(name) {
	const slug = String(name ?? "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/gu, "-")
		.replace(/^-+|-+$/gu, "")
		.slice(0, MAX_SLUG_CHARS);
	return slug.length > 0 ? slug : "bucket";
}

const bucketPath = (slug) => join(BUCKETS_DIR, `${slug}.json`);

async function readBucket(slug) {
	try {
		return JSON.parse(await readFile(bucketPath(slug), "utf8"));
	} catch (error) {
		if (error?.code === "ENOENT") return undefined;
		throw error;
	}
}

async function writeBucket(slug, bucket) {
	await mkdir(BUCKETS_DIR, { recursive: true });
	const saved = { ...bucket, updatedAt: new Date().toISOString() };
	await writeFile(bucketPath(slug), `${JSON.stringify(saved, null, 2)}\n`);
	return saved;
}

async function listBuckets() {
	let files;
	try {
		files = await readdir(BUCKETS_DIR);
	} catch (error) {
		if (error?.code === "ENOENT") return [];
		throw error;
	}
	const buckets = [];
	for (const file of files.filter((name) => name.endsWith(".json"))) {
		const slug = file.slice(0, -".json".length);
		const bucket = await readBucket(slug);
		buckets.push({ slug, name: bucket?.name ?? slug, updatedAt: bucket?.updatedAt ?? "" });
	}
	return buckets.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

// Only the editable parts of a bucket come from the browser; runs are written by the server.
function editableFields(body) {
	return {
		name: text(body?.name) ?? "Untitled",
		...(text(body?.about) ? { about: text(body.about) } : {}),
		inputs: body?.inputs ?? [],
		questions: body?.questions ?? [],
		...(text(body?.model) ? { model: text(body.model) } : {}),
	};
}

async function runBucket(slug, body) {
	const previous = (await readBucket(slug)) ?? {};
	const bucket = { ...previous, ...editableFields(body) };
	const startedAt = Date.now();
	const built = buildRequest(bucket);
	let run;
	if (!built.request) {
		run = { status: "invalid", errors: built.errors };
	} else {
		const request = normalizeRequest(built.request);
		const errors = validateRequest(request);
		if (errors.length > 0) {
			run = { status: "invalid", errors, request };
		} else {
			const apiKey = await readApiKey();
			if (!apiKey) {
				run = { status: "ok", mode: "shape", output: expectedAnswerShape(request), request, errors: ["No TypeSafe key is configured, so these are answer shapes, not scores."] };
			} else {
				const result = await postSystemOne(request, apiKey);
				run = result.ok
					? { status: "ok", mode: "live", output: result.body, request }
					: { status: "error", errors: [result.error, ...(result.errors ?? []), JSON.stringify(result.body)], request };
			}
		}
	}
	run = { ...run, elapsedMs: Date.now() - startedAt, ranAt: new Date().toISOString() };
	// Only a scored run replaces the last run, so the ghost markers always compare two real answers.
	const isScored = run.status === "ok" && run.mode === "live";
	const saved = await writeBucket(slug, {
		...bucket,
		lastRun: isScored ? run : previous.lastRun,
		previousRun: isScored ? previous.lastRun : previous.previousRun,
	});
	return { run, bucket: saved };
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
	const bucketMatch = url.pathname.match(/^\/api\/buckets\/([a-z0-9-]+)(\/run)?$/u);

	if (request.method === "GET" && url.pathname === "/") return send(response, HTTP_OK, await readFile(PAGE_PATH, "utf8"), "text/html; charset=utf-8");
	if (request.method === "GET" && url.pathname === "/health") return send(response, HTTP_OK, { app: "jev-playground", codeHash: CODE_HASH });
	if (request.method === "POST" && url.pathname === "/shutdown") {
		send(response, HTTP_OK, { stopping: true });
		setImmediate(() => process.exit(0));
		return undefined;
	}
	if (request.method === "GET" && url.pathname === "/api/buckets") return send(response, HTTP_OK, await listBuckets());
	if (bucketMatch) {
		const [, slug, isRun] = bucketMatch;
		if (request.method === "GET" && !isRun) {
			const bucket = await readBucket(slug);
			return bucket ? send(response, HTTP_OK, bucket) : send(response, HTTP_NOT_FOUND, { error: `no bucket ${slug}` });
		}
		if (request.method === "PUT" && !isRun) {
			const previous = (await readBucket(slug)) ?? {};
			return send(response, HTTP_OK, await writeBucket(slug, { ...previous, ...editableFields(await readBody(request)) }));
		}
		if (request.method === "POST" && isRun) return send(response, HTTP_OK, await runBucket(slug, await readBody(request)));
	}
	return send(response, HTTP_NOT_FOUND, { error: "not found" });
}

function serve() {
	const server = createServer((request, response) => {
		if (!isTrustedRequest(request)) return send(response, HTTP_FORBIDDEN, { error: "only the local playground page may call this server" });
		route(request, response).catch((error) => {
			console.error(`[jev-playground] ${request.method} ${request.url}: ${error?.stack ?? error}`);
			if (!response.headersSent) send(response, error?.status ?? HTTP_SERVER_ERROR, { error: error?.message ?? String(error) });
		});
		return undefined;
	});
	server.listen(PORT, HOST, () => console.error(`[jev-playground] serving ${BASE_URL} from ${PLUGIN_DIR}`));
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
	if (health?.app === "jev-playground") {
		await fetch(`${BASE_URL}/shutdown`, { method: "POST" });
		await waitForHealth((current) => current === undefined);
	} else if (health !== undefined) {
		throw new Error(`port ${PORT} is taken by something other than the Jev playground`);
	}
	await mkdir(BUCKETS_DIR, { recursive: true });
	const log = openSync(SERVER_LOG_PATH, "a");
	await new Promise((resolve, reject) => {
		const child = spawn("node", [fileURLToPath(import.meta.url)], { detached: true, stdio: ["ignore", log, log], env: process.env });
		child.once("error", (error) => reject(new Error(`could not start the playground server with node: ${error.message}`)));
		child.once("spawn", () => {
			child.unref();
			resolve(undefined);
		});
	});
	if (!(await waitForHealth((current) => current?.codeHash === CODE_HASH))) {
		throw new Error(`the playground server did not come up on ${BASE_URL}; see ${SERVER_LOG_PATH}`);
	}
}

const BROWSER_OPENERS = { darwin: ["open"], win32: ["cmd", "/c", "start", ""] };

function openBrowser(url) {
	const [command, ...args] = BROWSER_OPENERS[process.platform] ?? ["xdg-open"];
	const child = spawn(command, [...args, url], { detached: true, stdio: "ignore" });
	child.once("error", (error) => console.warn(`[jev-playground] could not open a browser: ${error.message}`));
	child.unref();
}

// Saves the bucket the agent designed, makes sure the server runs, and opens the page.
// A bucket with the same name is replaced, and its old runs go with it.
export async function openPlayground(name, flat) {
	const slug = slugify(name);
	if (!isObject(flat)) throw new Error("a playground bucket must be an object");
	await writeBucket(slug, editableFields({ ...flat, name }));
	await ensureServer();
	const url = `${BASE_URL}/#${slug}`;
	openBrowser(url);
	return { url, bucketFile: bucketPath(slug) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) serve();
