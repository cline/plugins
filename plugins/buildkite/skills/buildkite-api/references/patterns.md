# API Usage Patterns

## Fetch All Failed Builds for a Pipeline

```bash
#!/bin/bash
# Fetch all failed builds from the last 24 hours

org="my-org"
pipeline="my-pipeline"
since=$(date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -v-24H +%Y-%m-%dT%H:%M:%SZ)

curl -sS -H "Authorization: Bearer $BUILDKITE_API_TOKEN" \
  "https://api.buildkite.com/v2/organizations/$org/pipelines/$pipeline/builds?state=failed&created_from=$since&per_page=100" \
  | jq '.[] | {number, branch, message, web_url}'
```

## Build Success Rate Dashboard

```bash
curl -sS -H "Authorization: Bearer $BUILDKITE_API_TOKEN" \
  "https://api.buildkite.com/v2/organizations/my-org/pipelines/my-pipeline/builds?per_page=100&branch=main" \
  | jq '{
    total: length,
    passed: [.[] | select(.state == "passed")] | length,
    failed: [.[] | select(.state == "failed")] | length,
    pass_rate: (([.[] | select(.state == "passed")] | length) * 100.0 / length)
  }'
```

## Trigger Downstream Pipeline

```python
import requests

def trigger_downstream(api_token, org, pipeline, branch="main", env=None):
    response = requests.post(
        f"https://api.buildkite.com/v2/organizations/{org}/pipelines/{pipeline}/builds",
        headers={"Authorization": f"Bearer {api_token}", "Content-Type": "application/json"},
        json={"commit": "HEAD", "branch": branch, "message": "Triggered by upstream", "env": env or {}}
    )
    response.raise_for_status()
    return response.json()["number"], response.json()["web_url"]
```
