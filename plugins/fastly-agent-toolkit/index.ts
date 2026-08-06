import type { AgentPlugin } from "@cline/sdk"

const plugin: AgentPlugin = {
	name: "fastly-agent-toolkit",
	manifest: {
		capabilities: ["skills"],
	},
}

export default plugin
