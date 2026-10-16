import type { AgentPlugin } from "@cline/sdk"

const plugin: AgentPlugin = {
	name: "duckdb",
	manifest: {
		capabilities: ["skills"],
	},
}

export default plugin
