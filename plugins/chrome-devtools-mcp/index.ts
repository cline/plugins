import { createRequire } from "node:module"
import { basename, dirname, join } from "node:path"
import type { AgentPlugin } from "@cline/sdk"

const require = createRequire(import.meta.url)
const serverPackagePath = require.resolve("chrome-devtools-mcp/package.json")
const serverEntryPoint = join(
	dirname(serverPackagePath),
	"build",
	"src",
	"bin",
	"chrome-devtools-mcp.js",
)

function isNodeRuntime(value: string | undefined): boolean {
	const name = basename(value ?? "").toLowerCase()
	return name === "node" || name === "node.exe"
}

function resolveNodeRuntime(): string {
	for (const candidate of [
		process.execPath,
		process.env.npm_node_execpath,
		process.env.NODE,
	]) {
		if (isNodeRuntime(candidate)) {
			return candidate
		}
	}
	return "node"
}

const plugin: AgentPlugin = {
	name: "chrome-devtools-mcp",
	manifest: {
		capabilities: ["mcp", "skills"],
	},

	setup(api) {
		api.registerMcpServer({
			name: "chrome-devtools",
			transport: {
				type: "stdio",
				command: resolveNodeRuntime(),
				args: [
					serverEntryPoint,
					"--isolated",
					"--headless",
					"--redact-network-headers",
					"--no-usage-statistics",
					"--no-performance-crux",
				],
				env: {
					CHROME_DEVTOOLS_MCP_NO_UPDATE_CHECKS: "1",
					CHROME_DEVTOOLS_MCP_NO_USAGE_STATISTICS: "1",
				},
			},
		})
	},
}

export default plugin
