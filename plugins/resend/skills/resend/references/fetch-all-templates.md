# Fetch All Templates

Use cursor pagination when listing all Resend templates. Do not assume one request returns the full account.

```typescript
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function fetchAllTemplates() {
	const templates = [];
	let cursor: string | undefined;

	while (true) {
		const { data, error } = await resend.templates.list({
			limit: 100,
			...(cursor ? { after: cursor } : {}),
		});
		if (error) {
			throw new Error(`Failed to fetch templates: ${error.message}`);
		}

		templates.push(...data.data);
		if (!data.has_more || data.data.length === 0) {
			return templates;
		}
		cursor = data.data[data.data.length - 1]?.id;
	}
}
```

Keep the API key in `RESEND_API_KEY`; do not paste it into source files or shell history.
