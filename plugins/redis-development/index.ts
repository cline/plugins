import type { AgentPlugin } from "@cline/sdk"

const plugin: AgentPlugin = {
	name: "redis-development",
	manifest: {
		capabilities: ["skills"],
	},
}

export default plugin
