import type { AgentPlugin } from "@cline/sdk"

const plugin: AgentPlugin = {
	name: "telegram",
	manifest: {
		capabilities: ["skills"],
	},
}

export default plugin
