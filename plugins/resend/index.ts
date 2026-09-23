import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { AgentPlugin } from "@cline/core";

const PLUGIN_DIR = dirname(fileURLToPath(import.meta.url));

const plugin: AgentPlugin = {
	name: "resend",
	manifest: {
		capabilities: ["mcp", "skills"],
	},

	setup(api) {
		api.registerMcpServer({
			name: "resend",
			transport: {
				type: "stdio",
				command: "node",
				args: ["./node_modules/resend-mcp/dist/index.js"],
				cwd: PLUGIN_DIR,
				env: {
					RESEND_API_KEY: "${env:RESEND_API_KEY}",
				},
			},
			metadata: {
				description:
					"Resend MCP server for email sending, domains, contacts, broadcasts, templates, webhooks, logs, automations, and events.",
			},
		});
	},
};

export default plugin;
