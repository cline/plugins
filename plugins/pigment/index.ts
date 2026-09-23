import type { AgentPlugin } from "@cline/sdk"

const PIGMENT_MCP_URL_ENV = "CLINE_PIGMENT_MCP_URL"

type PigmentMcpUrlConfig =
	| { status: "unset" }
	| { status: "valid"; url: string }
	| { status: "invalid"; reason: string }

function readPigmentMcpUrl(): PigmentMcpUrlConfig {
	const raw = process.env[PIGMENT_MCP_URL_ENV]?.trim()
	if (!raw) {
		return { status: "unset" }
	}

	try {
		const url = new URL(raw)
		if (url.protocol !== "https:") {
			return { status: "invalid", reason: "URL must use https" }
		}
		return { status: "valid", url: url.toString() }
	} catch {
		return { status: "invalid", reason: "URL could not be parsed" }
	}
}

const plugin: AgentPlugin = {
	name: "pigment",
	manifest: {
		capabilities: ["mcp", "skills"],
	},
	setup(api) {
		const pigmentMcpUrl = readPigmentMcpUrl()
		if (pigmentMcpUrl.status === "invalid") {
			throw new Error(
				`Invalid ${PIGMENT_MCP_URL_ENV}: ${pigmentMcpUrl.reason}. Set it to the https URL from Pigment Settings > Integrations > MCP, or unset it to install skills only.`,
			)
		}

		if (pigmentMcpUrl.status === "valid") {
			api.registerMcpServer({
				name: "pigment",
				transport: {
					type: "streamableHttp",
					url: pigmentMcpUrl.url,
				},
			})
		}
	},
}

export default plugin
