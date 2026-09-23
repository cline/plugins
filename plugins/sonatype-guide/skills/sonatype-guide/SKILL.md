---
name: sonatype-guide
description: >-
  Use before installing, adding, upgrading, comparing, or auditing dependencies when Sonatype Guide MCP
  tools are available. Trigger for package manager commands, dependency manifest edits, library choice,
  version changes, vulnerability response, and dependency health reports. Checks vulnerabilities,
  Developer Trust Scores, license risks, malicious package detection, and policy compliance.
---

# Sonatype Guide Workflows

## Critical Rules

### MCP Availability

This Cline plugin registers Sonatype Guide MCP only when `SONATYPE_GUIDE_TOKEN`
is set in the environment where Cline loads plugins. If the MCP tools are not
available, do not claim the dependency was checked. Tell the user to set
`SONATYPE_GUIDE_TOKEN`, then reinstall or re-enable the plugin so Cline can
sync the plugin-owned MCP entry.

Before editing dependency manifests, lockfiles, or package manager commands,
ask for approval and summarize the Sonatype Guide result that supports the
change.

### Never Recommend Downgrades

When a user provides their current version, every recommendation must be >= that version. The MCP returns versions ranked by Developer Trust Score, which can include older versions - filter these out before presenting results.

Only two exceptions exist:
1. The user explicitly and repeatedly insists on a downgrade after being warned.
2. There is a catastrophic, unpatched vulnerability in all versions >= current (e.g., log4shell-severity with no forward fix), AND an older version is unaffected. Even then, present the downgrade only as a cautious side note, not the primary recommendation, and explain the trade-offs.

If neither exception applies, do not mention older versions at all.

### Never Recommend Malicious Components

If `malicious: true`, warn the user immediately. Never recommend, never suggest "with caution" - there is no safe use of a malicious package.

---

## PURL Format

All tools accept Package URLs. Format: `pkg:<type>/<namespace>/<name>@<version>`

| Ecosystem | Format | Example |
|---|---|---|
| Maven | `pkg:maven/<groupId>/<artifactId>@<version>` | `pkg:maven/org.apache.logging.log4j/log4j-core@2.17.1` |
| NPM | `pkg:npm/<name>@<version>` | `pkg:npm/express@4.18.2` |
| PyPI | `pkg:pypi/<name>@<version>` | `pkg:pypi/requests@2.31.0` |
| NuGet | `pkg:nuget/<name>@<version>` | `pkg:nuget/Newtonsoft.Json@13.0.3` |
| Go | `pkg:golang/<module>@<version>` | `pkg:golang/github.com/gin-gonic/gin@1.9.1` |

For scoped NPM packages, Cargo, RubyGems, and other ecosystems see [references/purl-ecosystems.md](references/purl-ecosystems.md).

---

## Tools

Three MCP tools available via `sonatype-guide`. All accept arrays of up to 20 PURLs.

- sonatype-guide:getComponentVersion - Analyze a specific version. Returns CVEs with CVSS scores, licenses, malicious flag, end-of-life status, and policy compliance results.
- sonatype-guide:getLatestComponentVersion - Find the newest version. Version in PURL is optional.
- sonatype-guide:getRecommendedComponentVersions - Ranked upgrade recommendations with Developer Trust Scores, breaking change counts, and vulnerable method signatures. Omit version for new component picks; include version for upgrade recommendations.

If an MCP call fails or returns unexpected data, tell the user the check could not be completed and suggest they verify manually. Do not silently skip the check or assume the component is safe.

---

## Interpreting Results

### Developer Trust Score

Sonatype's proprietary quality metric (0-100) factoring security, license compliance, quality, and maintainability.

| Range | Action |
|---|---|
| 90+ | Strong positive signal; still verify CVEs, malicious flag, end-of-life, license, and policy |
| 80-89 | Generally positive signal; review minor issues |
| 70-79 | Upgrade recommended |
| Below 70 | Upgrade urgently |

### CVSS Severity

Use standard NVD CVSS v3.x severity ratings. Treat Critical (9.0+) and High (7.0+) as actionable - always highlight these in output.

### Vulnerabilities

`getComponentVersion` returns a `vulnerabilities` object with a flat `cves` array:

```
vulnerabilities: {
  cves: [
    { id: "CVE-2021-44228", cvssScore: 10.0 },
    { id: "CVE-2021-45046", cvssScore: 9.0 },
    ...
  ]
}
```

The API does not distinguish between direct and transitive vulnerabilities - all CVEs are returned in a single list. Present them sorted by CVSS score (highest first). When reporting, state the total CVE count and highlight any with CVSS >= 7.0.

### Policy Compliance

`getComponentVersion` returns a `policyCompliance` object indicating whether the component passes organizational policies:

```
policyCompliance: {
  compliant: true/false,
  conditions: [
    { conditionId: "cvss-threshold", conditionName: "CVSS < 7.0", passing: true/false },
    { conditionId: "license-threat-group", conditionName: "No Copyleft Licenses", passing: true/false },
    { conditionId: "malware", conditionName: "No Malware", passing: true/false }
  ]
}
```

Surface this in audit and evaluation workflows - it gives users a quick pass/fail for enterprise governance. When `compliant: false`, call out which specific conditions failed.

### Flags and Sentinels

- `malicious: true` - Supply chain attack. Do NOT use. Warn immediately.
- `endOfLife: true` - No longer maintained. Plan migration.
- `licenseThreatLevels` - Map of license to threat score. 0 = no concern. Higher = more restrictive.
- `catalogDate` - Epoch milliseconds when the version was cataloged. Ignore unless the user specifically asks about it.

### Null, Empty, and Zero Values

These have distinct meanings - do not conflate them:

| Field | `null` | `"0"` or `0` | `[]` empty array |
|---|---|---|---|
| `breakingChangesCount` | Not analyzed - unknown risk, do NOT say "no breaking changes" | Analyzed, confirmed no breaking changes | N/A |
| `vulnerableMethods` | Not checked | N/A | Checked, none found |
| `vulnerableMethods[].methodSignatures` | N/A | N/A | CVE confirmed but specific affected methods not yet mapped |

When `breakingChangesCount` is `null`, tell the user: "Breaking changes have not been analyzed for this upgrade path - review the changelog before upgrading."

---

## Version Recommendation Logic

When recommending versions from `getRecommendedComponentVersions` results:

1. Filter out downgrades. Remove any `toVersion` where the version is lower than `fromVersion`.
2. Prefer the user's current major version. Default recommendation should be the highest-scoring version within the same major version line.
3. Present major version upgrades separately. If a higher major version scores better, mention it as a secondary option with clear warnings about breaking changes.
4. When `breakingChangesCount` is `null` for a major version jump, explicitly warn that breaking change analysis is unavailable and recommend reviewing the migration guide.

Example prioritization for a user on express@4.18.2:
- Primary: best 4.x version (e.g., 4.22.1 - same major, lower migration risk)
- Secondary: best 5.x version (e.g., 5.1.0 - higher major, may have better security posture but requires migration effort)

---

## Workflow 1: Evaluate Before Adding

Trigger: Adding a new dependency, asking "is X safe", or choosing a version.

1. Build the PURL (version optional).
2. Call `sonatype-guide:getRecommendedComponentVersions`.
3. Select the best candidate using the version recommendation logic.
4. Call `sonatype-guide:getComponentVersion` for the selected candidate before making the final recommendation so CVEs, malicious flag, end-of-life status, license, and policy compliance are verified.
5. Present the recommendation and trade-offs. Never recommend a candidate marked malicious, end-of-life without a migration warning, or policy non-compliant without explicit user acceptance.

Output:

```
| Version | Trust Score | CVEs | Critical/High | License | Policy |
|---------|-------------|------|---------------|---------|--------|
| x.y.z   | 99          | 0    | 0             | MIT     | Pass   |

Recommendation: ...
```

---

## Workflow 2: Upgrade Advisor

Trigger: Upgrading a dependency, asking "should I upgrade X", or responding to a known vulnerability.

1. Build the PURL with the current version.
2. Call `sonatype-guide:getRecommendedComponentVersions`.
3. Filter out any version older than the current one.
4. Compare `fromVersion` (current) against remaining `toVersions`.
5. Group recommendations: same-major first, then cross-major.
6. For the top 2-3 recommendations, highlight Trust Score delta, CVEs resolved, breaking changes, and any new issues.
7. If `vulnerableMethods` data exists for the current version, mention affected methods to help assess exposure.

Output:

```
Current: <package>@<version> (Trust Score: X, CVEs: N, Critical/High: M)

Recommended (same major):
1. <version> (Trust Score: Y) - <rationale>

Also available (major upgrade):
2. <version> (Trust Score: Z) - <rationale, breaking change warning>

Breaking changes to review: N (or "not analyzed - review changelog")
```

---

## Workflow 3: Project Audit

Trigger: "Audit dependencies", "check for vulnerabilities", "scan for security issues", or dependency health report requests.

1. Find the project's dependency manifest. Prefer lock files for exact versions.
2. Parse dependencies and build PURLs.
3. Batch-query `sonatype-guide:getComponentVersion` (up to 20 per call). For larger projects, prioritize direct dependencies.
4. Sort by severity: malicious first, then policy non-compliant, then end-of-life, then CVEs by CVSS score (highest first), then license concerns.
5. For packages with issues, call `sonatype-guide:getRecommendedComponentVersions` to suggest fixes - only recommend upgrades, never downgrades.

Output: Start with a one-line summary (scanned count, issue count, policy violations). Group findings by severity (Critical, then Warnings). For each issue, show package@version, the issue, CVSS score, and recommended upgrade. End with a summary counts table.

---

## Workflow 4: Dependency Comparison

Trigger: Choosing between alternatives ("axios vs got", "which library for X"), or evaluating competing packages.

1. Build PURLs for each candidate. If no version specified, call `sonatype-guide:getLatestComponentVersion` first.
2. Call `sonatype-guide:getRecommendedComponentVersions` on each to get Trust Scores.
3. Call `sonatype-guide:getComponentVersion` on each for policy compliance details.
4. Compare: Trust Score, CVE count and severity, license, policy compliance, end-of-life, malicious flag.

Output:

```
| Metric | lib A | lib B | lib C |
|--------|-------|-------|-------|
| Latest Version | x.y.z | a.b.c | d.e.f |
| Trust Score | 99 | 85 | 72 |
| CVEs | 0 | 1 | 3 |
| Critical/High CVEs | 0 | 1 | 2 |
| License | MIT | Apache-2.0 | GPL-3.0 |
| Policy Compliant | Yes | Yes | No |

Recommendation: <lib A> - <rationale>
```

---

## Examples

User: "Add requests to this project"
Expected behavior: Build `pkg:pypi/requests`, call `getRecommendedComponentVersions`, check the top result for CVEs/malicious/EOL, and recommend a specific version with its Trust Score before the user runs `pip install`.

User: "Upgrade express - we're on 4.18.2"
Expected behavior: Build `pkg:npm/express@4.18.2`, call `getRecommendedComponentVersions`, filter out anything below 4.18.2, present the best 4.x option as primary and any 5.x option as secondary with breaking change warnings.

---
