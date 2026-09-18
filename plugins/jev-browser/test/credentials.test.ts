import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { readJevCredentials } from "../src/credentials.ts";

test("credential file handles JSON syntax, precedence, reloads and missing keys", () => {
	const directory = mkdtempSync(join(tmpdir(), "jev-credentials-"));
	const path = join(directory, "config.json");
	try {
		assert.throws(
			() => readJevCredentials({ path, env: {} }),
			/AI_GATEWAY_API_KEY/,
		);
		writeFileSync(
			path,
			JSON.stringify({
				gateway: { apiKey: "file-test-key", textModel: "provider/model" },
			}),
			{ mode: 0o600 },
		);
		assert.deepEqual(readJevCredentials({ path, env: {} }), {
			apiKey: "file-test-key",
			textModel: "provider/model",
		});
		assert.deepEqual(
			readJevCredentials({
				path,
				env: {
					AI_GATEWAY_API_KEY: "env-test-key",
					JEV_TEXT_MODEL: "other/model",
				},
			}),
			{ apiKey: "env-test-key", textModel: "other/model" },
		);
		assert.equal(
			readJevCredentials({ path, env: { AI_GATEWAY_API_KEY: "  " } }).apiKey,
			"file-test-key",
		);
		writeFileSync(
			path,
			JSON.stringify({ gateway: { apiKey: "changed-test-key" } }),
		);
		assert.equal(
			readJevCredentials({ path, env: {} }).apiKey,
			"changed-test-key",
		);
		writeFileSync(path, "{}");
		assert.throws(
			() => readJevCredentials({ path, env: {} }),
			/AI_GATEWAY_API_KEY/,
		);
		writeFileSync(path, "{invalid");
		assert.throws(() => readJevCredentials({ path, env: {} }), /JSON syntax/);
		assert.throws(
			() => readJevCredentials({ path: directory, env: {} }),
			/Cannot read/,
		);
	} finally {
		rmSync(directory, { recursive: true, force: true });
	}
});
