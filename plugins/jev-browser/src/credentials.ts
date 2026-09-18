import { CONFIG_PATH, readConfigFile } from "./config.ts";

// Read per run without mutating process.env or exposing credentials to Chromium.
export function readJevCredentials(
	options: { path?: string; env?: NodeJS.ProcessEnv } = {},
) {
	const path = options.path ?? CONFIG_PATH;
	const env = options.env ?? process.env;
	const raw = readConfigFile(path);
	const gateway = raw.gateway as
		| { apiKey?: unknown; textModel?: unknown }
		| undefined;
	const value = (input: unknown) =>
		typeof input === "string" ? input.trim() : "";
	const apiKey = value(env.AI_GATEWAY_API_KEY) || value(gateway?.apiKey);
	if (!apiKey)
		throw new Error(
			`jev_run requires AI_GATEWAY_API_KEY in the plugin process environment or gateway.apiKey in ${path}.`,
		);
	const textModel =
		value(env.JEV_TEXT_MODEL) ||
		value(gateway?.textModel) ||
		"google/gemini-2.5-flash-lite";
	return { apiKey, textModel };
}
