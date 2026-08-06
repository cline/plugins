import type { AgentPlugin } from "@cline/sdk"

const plugin: AgentPlugin = {
	name: "42crunch-api-security-testing",
	manifest: {
		capabilities: ["skills"],
	},
}

export default plugin
