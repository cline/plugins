import type { AgentPlugin } from "@cline/sdk"

const plugin: AgentPlugin = {
	name: "postiz",
	manifest: {
		capabilities: ["skills"],
	},
}

export default plugin
