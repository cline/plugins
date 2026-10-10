import { expectedAnswerShape, postSystemOne, readApiKey } from "./jev-core.mjs";

export async function executeJevRequest(request) {
	const apiKey = await readApiKey();
	if (!apiKey) {
		return {
			status: "ok",
			mode: "shape",
			output: expectedAnswerShape(request),
			message: "TYPESAFE_API_KEY is absent; output is a shape, not scores.",
		};
	}
	const result = await postSystemOne(request, apiKey);
	if (!result.ok) throw new Error(`System One transport failed: ${result.error}`);
	return { status: "ok", mode: "live", httpStatus: result.httpStatus, output: result.body };
}
