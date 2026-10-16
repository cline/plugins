import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import type { AgentPlugin } from "@cline/sdk"

const pluginRoot = dirname(fileURLToPath(import.meta.url))
const desktopCommanderBin = resolve(
	pluginRoot,
	"node_modules",
	"@wonderwhy-er",
	"desktop-commander",
	"dist",
	"index.js",
)

const plugin: AgentPlugin = {
	name: "desktop-commander",
	manifest: {
		capabilities: ["skills", "mcp"],
	},

	setup(api) {
		api.registerMcpServer({
			name: "desktop-commander",
			transport: {
				type: "stdio",
				command: "node",
				args: [desktopCommanderBin],
			},
		})
	},
}

export default plugin
