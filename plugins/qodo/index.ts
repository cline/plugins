import type { AgentPlugin } from "@cline/sdk"

const plugin: AgentPlugin = {
	name: "qodo",
	manifest: {
		capabilities: ["skills"],
	},
}

export default plugin
