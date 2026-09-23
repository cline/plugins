import type { AgentPlugin } from "@cline/sdk"

const plugin: AgentPlugin = {
	name: "auth0",
	manifest: {
		capabilities: ["skills"],
	},
}

export default plugin
