import type { AgentPlugin } from "@cline/sdk"

const plugin: AgentPlugin = {
	name: "clickhouse-best-practices",
	manifest: {
		capabilities: ["skills"],
	},
}

export default plugin
