import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const pluginSource = await readFile(new URL("./index.ts", import.meta.url), "utf8");

function containsZodRegexLookaround(source) {
	for (const match of source.matchAll(/\.regex\(\s*\//g)) {
		let escaped = false;
		let inCharacterClass = false;
		for (let index = match.index + match[0].length; index < source.length; index++) {
			const character = source[index];
			if (escaped) {
				escaped = false;
				continue;
			}
			if (character === "\\") {
				escaped = true;
				continue;
			}
			if (character === "[") {
				inCharacterClass = true;
				continue;
			}
			if (character === "]" && inCharacterClass) {
				inCharacterClass = false;
				continue;
			}
			if (character === "/" && !inCharacterClass) break;
			if (character !== "(" || inCharacterClass || source[index + 1] !== "?") continue;
			const marker = source.slice(index + 2, index + 4);
			if (marker[0] === "=" || marker[0] === "!" || marker === "<=" || marker === "<!") {
				return true;
			}
		}
	}
	return false;
}

test("model-facing handoff schemas avoid regex lookarounds", () => {
	assert.equal(
		containsZodRegexLookaround(pluginSource),
		false,
		"OpenAI-compatible providers reject regex lookarounds in tool JSON Schemas",
	);
});

test("schema detector distinguishes lookarounds from literal text", () => {
	assert.equal(containsZodRegexLookaround("z.string().regex(/^(?!\\/).+$/)"), true);
	assert.equal(containsZodRegexLookaround(String.raw`z.string().regex(/\(?!literal/)`), false);
	assert.equal(containsZodRegexLookaround("z.string().regex(/[(?!)]/ )"), false);
});
