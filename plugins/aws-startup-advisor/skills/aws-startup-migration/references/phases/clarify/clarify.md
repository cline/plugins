# Phase 2: Clarify Requirements

Phase 2 of 6 -- Ask adaptive questions before design begins, then interpret answers into ready-to-apply design constraints.

> HARD GATE -- Clarify before Design: Do not load `references/phases/design/design.md` (or any later phase) until this phase finishes and `$MIGRATION_DIR/.phase-status.json` records `phases.clarify` as `"completed"`. Writing `preferences.json` without updating phase status is a protocol violation. If the user asks to skip questions, use documented defaults and still complete this phase (including phase status).

The output -- `preferences.json` -- is consumed directly by Design and Estimate without any further interpretation.

Questions are organized into six named categories (A-F) with documented firing rules. Up to 22 questions across categories, depending on which discovery artifacts exist and which GCP services are detected. Questions are presented in progressive batches (up to 3 batches) with intermediate saves between each -- partial answers persist across sessions. A standalone AI-Only flow exists for migrations that only move AI/LLM calls to Bedrock.

## Category Reference Files

| File                  | Category                     | Questions | Loaded When                                     |
| --------------------- | ---------------------------- | --------- | ----------------------------------------------- |
| `clarify-global.md`   | A -- Global/Strategic         | Q1-Q7     | Always                                          |
| `clarify-compute.md`  | B -- Config Gaps, C -- Compute | Q8-Q11    | Compute or billing-source resources present     |
| `clarify-database.md` | D -- Database                 | Q12-Q13b  | Database resources present                      |
| `clarify-ai.md`       | F -- AI/Bedrock               | Q14-Q26   | `ai-workload-profile.json` exists               |
| `clarify-ai-only.md`  | _(standalone)_               | Q1-Q10    | AI-only migration (no infrastructure artifacts) |

---

## Step 0: Prior Run Check

Check `$MIGRATION_DIR/` for existing state:

Case 1 -- Completed preferences exist (`preferences.json` present):

> "I found existing migration preferences from a previous run. Would you like to:"
>
> A) Re-use these preferences and skip questions
> B) Start fresh and re-answer all questions

- If A: Run Step 2 item 6 only (BigQuery detection) on current discovery artifacts. If `bigquery_present` is true, output the Step 4 BigQuery / deferred analytics advisory block once (even though questions are skipped), then skip to Validation Checklist with the existing `preferences.json`.
- If B: delete `preferences.json`, continue to Step 1.

Case 2 -- Draft preferences exist (`preferences-draft.json` present, no `preferences.json`):

> "I found a partial set of answers from a previous session ([N] of [total] batches completed). Would you like to:"
>
> A) Resume from where you left off -- I'll pick up the remaining questions
> B) Start fresh and re-answer all questions

- If A: load the draft, read `metadata.batches_completed` to determine which batches are done, skip completed batches when entering Step 4.
- If B: delete `preferences-draft.json`, continue to Step 1.

Case 3 -- No prior state: Continue to Step 1.

---

## Step 1: Read Inventory and Determine Migration Type

Read `$MIGRATION_DIR/` and check which discovery outputs exist:

- `gcp-resource-inventory.json` + `gcp-resource-clusters.json` -- infrastructure discovered
- `ai-workload-profile.json` -- AI workloads detected
- `billing-profile.json` -- billing data parsed

At least one discovery artifact must exist to proceed.

### Migration Type Detection

- Full migration: `gcp-resource-inventory.json` or `billing-profile.json` exists (may also have `ai-workload-profile.json`)
- AI-only migration: ONLY `ai-workload-profile.json` exists (no infrastructure or billing artifacts)

If AI-only: Read `clarify-ai-only.md` NOW and follow that flow. Skip all remaining steps below.

> HARD GATE -- AI-Only Path: You MUST read `clarify-ai-only.md` before presenting any questions. The question text, answer options, and interpretation rules are ONLY in that file -- they are NOT in this file. Do NOT fabricate questions from the summaries above.

### Discovery Summary

Present a discovery summary:

If `gcp-resource-inventory.json` exists:

> Infrastructure discovered: [total resources] GCP resources across [cluster count] clusters
> Top resource types: [list top 3-5 types]

If `ai-workload-profile.json` exists:

> AI workloads detected: [from `models[].model_id`]
> Capabilities in use: [from `integration.capabilities_summary` where true]
> Integration pattern: [from `integration.pattern`] via [from `integration.primary_sdk`]

If `billing-profile.json` exists:

> Monthly GCP spend: $[total_monthly_spend]
> Top services by cost: [top 3-5 from billing data]

---

## Step 1.5: Fast-Path Gate (Simple Infra Only)

After presenting the Discovery Summary, check `$MIGRATION_DIR/migration-preview.json` for fast-path eligibility:

```
IF migration-preview.json exists
   AND eligible_for_clarify_fast_path == true
THEN offer fast-path
ELSE skip to Step 2 (full Clarify)
```

If eligible, present this offer before any questions:

> "Your stack looks straightforward -- [primary_resource_count] resource(s), no database, no AI detected.
>
> Want to use smart defaults and answer just 3 questions instead of up to 22?
>
> [Yes -- 3 questions] / [No -- ask me everything]"

If user chooses Yes (fast-path):

1. Ask only these three questions (load exact wording from their respective category files):
   - Q1 (target region) -- from `clarify-global.md`
   - Q2 (compliance) -- from `clarify-global.md`, presented as a one-liner: "Any compliance requirements? (A) None (B) SOC2 (C) PCI (D) HIPAA (E) FedRAMP (F) GDPR/CCPA"
   - Q7 (maintenance window / cutover strategy) -- from `clarify-global.md`

2. Apply documented defaults for ALL other questions. Record each in `metadata.questions_defaulted`.

3. Still run the BigQuery advisory if `bigquery_present` is true (Step 4 mandatory callout).

4. Write `preferences.json` with `metadata.clarify_mode: "fast_path"` and proceed to Step 5. Skip Steps 2-4 entirely.

Agentic hard block: Even if `eligible_for_clarify_fast_path` is true in `migration-preview.json`, if `ai-workload-profile.json` exists with `agentic_profile.is_agentic == true`, never offer fast-path. Agentic workloads require Q23-Q26 (Category G) which have mandatory questions that cannot be defaulted.

If user chooses No, or fast-path is not eligible: Continue to Step 2 (full Clarify).

---

## Step 2: Extract Known Information

Before generating questions, scan the inventory to extract values that are already known:

1. GCP regions -- Extract all GCP regions from the inventory. Map to the closest AWS region as a suggested default for Q1.
2. Resource types present -- Build a set of resource types: compute (Cloud Run, Cloud Functions, GKE, GCE), database (Cloud SQL, Spanner, Memorystore), storage (Cloud Storage), messaging (Pub/Sub).
3. Billing SKUs -- If `billing-profile.json` exists, check if any SKU reveals storage class, HA configuration, or other answerable questions.
4. Billing-only mode -- If `billing-profile.json` exists and `gcp-resource-inventory.json` does NOT exist, check `billing-profile.json -> services[]` for Category B question matching.
5. AI framework detection -- If `ai-workload-profile.json` exists, check `integration.gateway_type` and `integration.frameworks` for auto-detection of Q14 answer.
6. BigQuery / analytics warehouse -- Set `bigquery_present` to true if any of: (a) a resource in `gcp-resource-inventory.json` has `gcp_type` (or equivalent type field) starting with `google_bigquery_`; (b) `billing-profile.json` lists a service/SKU that clearly indicates BigQuery (e.g., service name or SKU contains `BigQuery`). Otherwise `bigquery_present` is false.
7. Database size auto-detect -- If `gcp-resource-inventory.json` exists and any `google_sql_database_instance` resource has `gcp_config.disk_size_gb`, record that value as the default for Q13b and confirm with the user rather than asking from scratch. Set `chosen_by: "extracted"` if confirmed unchanged.

Record extracted values. Questions whose answers are fully determined by extraction will be skipped and the extracted value used directly with `chosen_by: "extracted"`.

---

## Step 3: Generate Questions by Category

### Category Definitions and Firing Rules

| Category | Name               | Firing Rule                                                                    | Reference File        | Questions                                                                                                           |
| -------- | ------------------ | ------------------------------------------------------------------------------ | --------------------- | ------------------------------------------------------------------------------------------------------------------- |
| A    | Global/Strategic   | Always fires                                                               | `clarify-global.md`   | Q1 (location), Q2 (compliance), Q3 (GCP spend), Q4 (funding stage), Q5 (multi-cloud), Q6 (uptime), Q7 (maintenance) |
| B    | Configuration Gaps | `billing-profile.json` exists AND `gcp-resource-inventory.json` does NOT exist | `clarify-compute.md`  | Cloud SQL HA, Cloud Run count, Memorystore memory, Functions gen                                                    |
| C    | Compute Model      | Compute resources present (Cloud Run, Cloud Functions, GKE, GCE)               | `clarify-compute.md`  | Q8 (K8s sentiment), Q9 (WebSocket), Q10 (Cloud Run traffic), Q11 (Cloud Run spend)                                  |
| D    | Database Model     | Database resources present (Cloud SQL, Spanner, Memorystore)                   | `clarify-database.md` | Q12 (DB traffic pattern), Q13 (DB I/O), Q13b (DB size)                                                              |
| E    | Migration Posture  | Disabled by default -- requires explicit user opt-in                        | _(inline below)_      | HA upgrades, right-sizing                                                                                           |
| F    | AI/Bedrock         | `ai-workload-profile.json` exists                                              | `clarify-ai.md`       | Q14-Q26 (Q14-Q22 always; Q23-Q26 only when `agentic_profile.is_agentic == true`)                                    |

Apply firing rules to determine which categories are active:

1. Category A is always active.
2. Check for billing-only mode -- if `billing-profile.json` exists and `gcp-resource-inventory.json` does NOT, Category B is active.
3. Check for compute resources -- if present, Category C is active. Within C, skip Q8 if no GKE present. Skip Q10/Q11 if no Cloud Run present.
4. Check for database resources -- if present, Category D is active.
5. Category E is disabled by default. Offered after the last batch completes in Step 4 (see Category E Opt-In in Step 4). If user declines or does not respond, apply Category E defaults (no HA upgrades, no right-sizing).
6. Check for `ai-workload-profile.json` -- if present, Category F is active.

If no IaC, billing data, or code is available (empty discovery): only Category A is active. All service-specific categories are skipped.

### HARD GATE -- Read Category Files Before Proceeding

> STOP. You MUST read each active category's file NOW, before moving to Step 4.
>
> The exact question wording, answer options, context rationale, and interpretation rules exist ONLY in the category files listed below. They are NOT in this file. The table above is a summary index only -- do NOT use it to fabricate questions.
>
> Read these files based on which categories are active:
>
> | Active Category | File to Read          |
> | --------------- | --------------------- |
> | A (always)      | `clarify-global.md`   |
> | B or C          | `clarify-compute.md`  |
> | D               | `clarify-database.md` |
> | F               | `clarify-ai.md`       |
>
> Do NOT proceed to Step 4 until you have read every applicable file above.

### Early-Exit Rules

Apply these before presenting questions:

- Q5 = "Yes, multi-cloud required" -- Immediately record `compute: "eks"`. Skip Q8 (Kubernetes sentiment) -- all container workloads resolve to EKS.
- Q10/Q11 N/A -- Cloud Run not present, auto-skip.
- Q12/Q13 N/A -- Cloud SQL not present, auto-skip.
- Q13b auto-detect -- If `gcp_config.disk_size_gb` is present on any `google_sql_database_instance`, use it as the default for Q13b with `chosen_by: "extracted"` if the user confirms it unchanged.
- Q14 auto-detected -- If `integration.gateway_type` is non-null OR `integration.frameworks` is non-empty in `ai-workload-profile.json`, skip Q14. Set `ai_framework` from the detected values with `chosen_by: "extracted"`.

### Batch Planning

After determining active categories, organize questions into up to three batches presented sequentially with intermediate saves:

| Batch | Name                   | Categories                                 | Questions                         | Fires When                                |
| ----- | ---------------------- | ------------------------------------------ | --------------------------------- | ----------------------------------------- |
| 1 | Strategic Requirements | A (Global/Strategic)                       | Q1-Q7 (minus Q4)                  | Always                                    |
| 2 | Infrastructure         | B (Config Gaps), C (Compute), D (Database) | Q8-Q13b + Category B prompts      | Any compute or database resources present |
| 3 | AI Workloads           | F (AI/Bedrock)                             | Q14-Q26 (Q23-Q26 only if agentic) | `ai-workload-profile.json` exists         |

Determine active batches:

1. Batch 1 is always active.
2. Batch 2 is active if Category B, C, or D fired.
3. Batch 3 is active if Category F fired.

Record the ordered list of active batches and count the questions per batch (after extraction and early-exit filtering). These counts are used for per-batch progress messaging -- not shown as a grand total upfront.

Category E (Migration Posture) is offered after the last substantive batch completes, before writing final `preferences.json`.

---

## Category E -- Migration Posture (Disabled by Default)

_Fire when:_ User explicitly opts in.
_Default behavior when disabled:_ Apply conservative defaults -- no HA upgrades, no right-sizing.

If the user opts in, present after all other categories:

### Q-E1 -- Should we recommend upgrading Single-AZ to Multi-AZ where possible?

> A) Yes -- upgrade to Multi-AZ for higher availability | B) No -- keep current topology

Interpret -> `ha_upgrade`: A -> `true`, B -> `false`. Default: B -> `false`.

### Q-E2 -- Should we use billing utilization data to right-size instance types?

> A) Yes -- right-size based on utilization | B) No -- match current capacity

Interpret -> `right_sizing`: A -> `true`, B -> `false`. Default: B -> `false`.

---

## Step 4: Present Questions in Progressive Batches

BigQuery / deferred analytics (mandatory callout): If Step 2 set `bigquery_present` to true, output this block once, before any questions (same turn as Batch 1), then continue with the question flow:

> BigQuery / analytics warehouse: Your discovery inputs include BigQuery. This skill does not select an AWS analytics or data-warehouse target (no Athena, Redshift, Glue, or EMR recommendation from the plugin). Before warehouse, data lake, SQL analytics, or BI cutover planning, engage your AWS account team and/or a data analytics migration partner to assess query patterns, data volumes, ETL/ELT, and downstream consumers. Design will mark these resources as `Deferred -- specialist engagement`.

Questions are presented in sequential batches with a save after each. After each batch the user can skip individual questions (defaults applied), say "use defaults for the rest" to apply defaults for all remaining batches and proceed immediately, or answer normally.

### Batch Loop

For each active batch (determined in Batch Planning above), execute steps 4a-4d:

#### 4a. Present Batch

Use a conversational tone with brief context explaining why each question matters. Number questions within each batch starting from 1.

Batch 1 -- Strategic Requirements (always first):

```
Before mapping your infrastructure to AWS, I have a few sections of questions
to tailor the migration plan. You can answer each, skip individual ones
(I'll use sensible defaults), or say "use defaults for the rest" at any point.

Let's start with your strategic requirements.

--- Strategic Requirements ---

Question 1: [Q1 text with context]
Question 2: [Q2 text with context]
...
Question [N]: [Q7 text with context]
```

Batch 2 -- Infrastructure (if active):

After Batch 1 answers are saved, present:

```
Got it -- your strategic preferences are saved.

Next up: [N] questions about your compute and database setup.
You can answer each, skip individual ones, or say "use defaults for the rest."

--- Infrastructure ---

Question 1: [first active question text with context]
...
```

Batch 3 -- AI Workloads (if active):

After prior batch answers are saved, present. Adapt the intro based on whether this is the second or third batch:

```
[Infrastructure preferences saved. / Strategic preferences saved.]

Last section -- [N] questions about your AI workloads, then we're ready to design.
You can answer each, skip individual ones, or say "use defaults for the rest."

--- AI Workloads ---

Question 1: [first active question text with context]
...
```

If Batch 3 is the second batch (Batch 2 was skipped because no infra resources), use "Next up" instead of "Last section" if appropriate.

Single-batch shortcut: If only Batch 1 is active (no infrastructure or AI categories fired), skip the multi-batch framing. Present Batch 1 questions with a simpler intro and proceed directly to Category E opt-in then Step 5 after answers -- no draft file needed.

#### 4b. Wait for Response

Wait for the user's response to the current batch. Do NOT present the next batch or proceed to Design without a response or an explicit "use defaults for the rest."

"Use defaults for the rest" handling: If the user says this at any point:

1. Apply documented defaults for all unanswered questions in the current batch.
2. Apply documented defaults for all questions in remaining batches.
3. Skip directly to Category E opt-in, then Step 5 (write final `preferences.json`).

#### 4c. Interpret Batch Answers

Apply the interpret rule (from the category reference files) for every answered question in the batch. For skipped questions within the batch, apply the documented default.

Apply early-exit rules triggered by this batch's answers. For example, if Batch 1 includes Q5 = "Yes, multi-cloud required", record `compute: "eks"` and mark Q8 as skipped (early-exit) for Batch 2.

#### 4d. Save Draft

If more batches remain after this one: Write (or update) `$MIGRATION_DIR/preferences-draft.json` with all answers collected so far. Use the same schema as `preferences.json` with these additional `metadata` fields:

```json
{
  "metadata": {
    "draft": true,
    "batches_completed": ["strategic"],
    "batches_remaining": ["infrastructure", "ai"],
    "migration_type": "full",
    "timestamp": "<ISO timestamp>",
    ...
  },
  "design_constraints": { ... },
  "ai_constraints": { ... }
}
```

Batch name values: `"strategic"`, `"infrastructure"`, `"ai"`.

Return to 4a for the next batch.

If this was the last active batch: Do not write a draft -- proceed to Category E opt-in then Step 5.

### Category E Opt-In

After the last substantive batch is answered (but before writing final `preferences.json`), offer Category E if `billing-profile.json` exists:

> "Would you also like HA upgrade and right-sizing recommendations based on your billing data? If not, I'll use conservative defaults (no upgrades, match current capacity)."

If user opts in, present Q-E1-Q-E2 (defined in Category E -- Migration Posture above). Otherwise, apply Category E defaults (`ha_upgrade: false`, `right_sizing: false`).

---

## Answer Combination Triggers

| Scenario                     | Key Answers                                  | Recommendation                                                                                 |
| ---------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Early-stage funding path     | Q3 = lower spend band                        | Entry-tier migration funding program review                                                    |
| Growth-stage funding path    | Q3 = higher spend band                       | Migration funding/support program review based on spend profile                                |
| Must stay portable           | Q5 = Yes multi-cloud                         | EKS only, no ECS Fargate                                                                       |
| Kubernetes-averse            | Q5 = No + Q8 = Frustrated                    | ECS Fargate strongly recommended                                                               |
| WebSocket app                | Q9 = Yes                                     | ALB WebSocket config required                                                                  |
| Low-traffic Cloud Run        | Q10 = Business hours + Q11 < $100            | Recommend staying on Cloud Run                                                                 |
| High I/O database            | Q13 = High IOPS                              | Aurora I/O-Optimized                                                                           |
| Write-heavy global DB        | Q6 = Catastrophic + Q12 = Write-heavy/global | Aurora DSQL                                                                                    |
| Rapidly growing DB           | Q12 = Rapidly growing                        | Aurora Serverless v2                                                                           |
| Zero downtime required       | Q7 = No downtime                             | Blue/green + AWS DMS required                                                                  |
| HIPAA compliance             | Q2 = HIPAA                                   | BAA services only, specific regions                                                            |
| FedRAMP required             | Q2 = FedRAMP                                 | GovCloud regions only                                                                          |
| CCPA / CPRA                  | Q2 = G (CCPA / CPRA)                         | Consumer privacy, logging/retention, data-inventory posture; confirm regions with legal review |
| Gateway-only AI              | Q14 = B only (LLM router/gateway)            | Config change only; skip SDK migration                                                         |
| LangChain/LangGraph AI       | Q14 includes C                               | Provider swap via ChatBedrock; 1-3 days                                                        |
| OpenAI Agents SDK            | Q14 includes E                               | Highest AI effort; Bedrock Agents; 2-4 weeks                                                   |
| Multi-agent + MCP            | Q14 = D + F                                  | Bedrock Agents to unify orchestration + MCP                                                    |
| Voice platform AI            | Q14 includes G                               | Check native Bedrock support; Nova 2 Sonic if needed                                           |
| GPT-5.5 migration            | Q19 = GPT-5.5                                | Claude Opus 4.6 -- Bedrock 17% cheaper on output; or Sonnet 4.6 for 53% savings                 |
| GPT-5.5 Pro migration        | Q19 = GPT-5.5 Pro                            | Nova 2 Pro -- 95% cheaper on Bedrock                                                            |
| GPT-5.4 migration            | Q19 = GPT-5.4                                | Claude Sonnet 4.6 -- near price parity; AWS consolidation                                       |
| GPT-5.4 Mini/Nano migration  | Q19 = GPT-5.4 Mini or Nano                   | Nova Lite/Micro -- 87-94% cheaper on Bedrock                                                    |
| GPT-4 Turbo migration        | Q19 = GPT-4 Turbo                            | Claude Sonnet 4.6 -- 70% cheaper on input                                                       |
| o-series migration           | Q19 = o-series                               | Claude Sonnet 4.6 with extended thinking                                                       |
| High-volume cost-critical AI | Q18 = High + cost critical                   | Nova Micro or Haiku 4.5 + provisioned throughput                                               |
| Reasoning/agent workload     | Q17 = Extended thinking                      | Claude Sonnet 4.6 extended thinking; Opus 4.6 for hardest                                      |
| Speech-to-speech AI          | Q17 = Real-time speech                       | Nova 2 Sonic                                                                                   |
| RAG workload                 | Q17 = RAG optimization                       | Bedrock Knowledge Bases + Titan Embeddings                                                     |
| Vision workload              | Q20 = Vision required                        | Claude Sonnet 4.6 (multimodal)                                                                 |
| Latency-critical AI          | Q21 = Critical                               | Haiku 4.5 or Nova Micro + streaming                                                            |
| Complex reasoning tasks      | Q22 = Complex                                | Claude Sonnet 4.6; Opus 4.6 for hardest                                                        |

---

## Step 5: Assemble and Write preferences.json

Assemble all interpreted answers from the completed batches into the final `$MIGRATION_DIR/preferences.json`. If `preferences-draft.json` exists, use it as the base -- merge in the final batch's answers, remove the draft-specific metadata fields (`draft`, `batches_completed`, `batches_remaining`), and set `metadata.timestamp` to the current time. Write `$MIGRATION_DIR/preferences.json`:

```json
{
  "metadata": {
    "migration_type": "full",
    "timestamp": "<ISO timestamp>",
    "discovery_artifacts": ["gcp-resource-inventory.json", "ai-workload-profile.json"],
    "questions_asked": [
      "Q1",
      "Q2",
      "Q3",
      "Q5",
      "Q6",
      "Q7",
      "Q16",
      "Q17",
      "Q19",
      "Q21",
      "Q22"
    ],
    "questions_defaulted": ["Q9"],
    "questions_skipped_extracted": ["Q14"],
    "questions_skipped_early_exit": ["Q8"],
    "questions_skipped_not_applicable": ["Q4", "Q10", "Q11", "Q12", "Q13", "Q13b"],
    "category_e_enabled": false,
    "clarify_mode": "full",
    "inventory_clarifications": {}
  },
  "design_constraints": {
    "target_region": { "value": "us-east-1", "chosen_by": "user" },
    "compliance": { "value": ["hipaa"], "chosen_by": "user" },
    "gcp_monthly_spend": { "value": "$5K-$20K", "chosen_by": "user" },
    "funding_stage": { "value": "series-a", "chosen_by": "user" },
    "availability": { "value": "multi-az", "chosen_by": "default" },
    "cutover_strategy": { "value": "maintenance-window-weekly", "chosen_by": "user" },
    "kubernetes": { "value": "eks-or-ecs", "chosen_by": "user" },
    "database_traffic": { "value": "steady", "chosen_by": "user" },
    "db_io_workload": { "value": "medium", "chosen_by": "user" },
    "db_size": { "value": "10-100GB", "chosen_by": "user" }
  },
  "ai_constraints": {
    "ai_framework": { "value": ["direct"], "chosen_by": "extracted" },
    "ai_monthly_spend": { "value": "$500-$2K", "chosen_by": "user" },
    "ai_priority": { "value": "balanced", "chosen_by": "user" },
    "ai_critical_feature": { "value": "function-calling", "chosen_by": "user" },
    "ai_token_volume": { "value": "low", "chosen_by": "user" },
    "ai_model_baseline": { "value": "claude-sonnet-4-6", "chosen_by": "user" },
    "ai_vision": { "value": "text-only", "chosen_by": "user" },
    "ai_latency": { "value": "important", "chosen_by": "user" },
    "ai_complexity": { "value": "moderate", "chosen_by": "user" },
    "ai_capabilities_required": {
      "value": ["text_generation", "streaming", "function_calling"],
      "chosen_by": "extracted"
    }
  }
}
```

### Schema Rules

1. Every entry in `design_constraints` and `ai_constraints` is an object with `value` and `chosen_by` fields.
2. `chosen_by` values: `"user"` (explicitly answered), `"default"` (system default applied -- includes "I don't know" answers), `"extracted"` (inferred from inventory), `"derived"` (computed from combination of answers + detected capabilities).
3. Only write a key to `design_constraints` / `ai_constraints` if the answer produces a constraint. Absent keys mean "no constraint -- Design decides."
4. Do not write null values.
5. For billing-source inventories, `metadata.inventory_clarifications` records Category B answers.
6. `metadata.questions_skipped_early_exit` records questions skipped due to early-exit logic (e.g., Q8 skipped because Q5=multi-cloud).
7. `metadata.questions_skipped_extracted` records questions skipped because inventory already provided the answer.
8. `metadata.questions_skipped_not_applicable` records questions skipped because the relevant service wasn't in the inventory.
9. `ai_constraints` section is present ONLY if Category F fired. Omit entirely if no AI artifacts exist.
10. `ai_constraints.ai_capabilities_required` is the UNION of detected capabilities from `ai-workload-profile.json` + critical feature from Q17 + vision from Q20. `chosen_by` is `"derived"`.
11. `ai_constraints.ai_framework` is an array (Q14 is select-all-that-apply). If auto-detected, `chosen_by` is `"extracted"`.

After writing `preferences.json`, delete `$MIGRATION_DIR/preferences-draft.json` if it exists.

---

## Defaults Table

| Question                | Default              | Constraint                                        |
| ----------------------- | -------------------- | ------------------------------------------------- |
| Q1 -- Location           | A (single region)    | `target_region`: closest AWS region to GCP region |
| Q2 -- Compliance         | A (none)             | no constraint                                     |
| Q3 -- GCP spend          | B ($1K-$5K)          | `gcp_monthly_spend: "$1K-$5K"`                    |
| Q4 -- Funding stage      | _(skip in IDE mode)_ | no constraint                                     |
| Q5 -- Multi-cloud        | B (AWS-only)         | no constraint                                     |
| Q6 -- Uptime             | B (significant)      | `availability: "multi-az"`                        |
| Q7 -- Maintenance        | D (flexible)         | `cutover_strategy: "flexible"`                    |
| Q8 -- K8s sentiment      | B (neutral)          | `kubernetes: "eks-or-ecs"`                        |
| Q9 -- WebSocket          | B (no)               | no constraint                                     |
| Q10 -- Cloud Run traffic | C (24/7)             | `cloud_run_traffic_pattern: "constant-24-7"`      |
| Q11 -- Cloud Run spend   | B ($100-$500)        | `cloud_run_monthly_spend: "$100-$500"`            |
| Q12 -- DB traffic        | A (steady)           | `database_traffic: "steady"`                      |
| Q13 -- DB I/O            | B (medium)           | `db_io_workload: "medium"`                        |
| Q13b -- DB size          | E (unknown)          | `db_size: "unknown"` -> default to pgcopydb        |
| Q14 -- AI framework      | _(auto-detect)_      | `ai_framework` from code detection                |
| Q15 -- AI spend          | B ($500-$2K)         | `ai_monthly_spend: "$500-$2K"`                    |
| Q16 -- AI priority       | E (balanced)         | `ai_priority: "balanced"`                         |
| Q17 -- Critical feature  | J (none)             | no additional override                            |
| Q18 -- Volume + cost     | A (low + quality)    | `ai_token_volume: "low"`                          |
| Q19 -- Current model     | _(auto-detect)_      | `ai_model_baseline` from code detection           |
| Q20 -- Input types       | A (text only)        | no constraint                                     |
| Q21 -- AI latency        | B (important)        | `ai_latency: "important"`                         |
| Q22 -- Task complexity   | B (moderate)         | `ai_complexity: "moderate"`                       |

---

## Validation Checklist

Before handing off to Design:

- [ ] If `bigquery_present` was true, the Step 4 BigQuery specialist advisory was shown before questions -- or, if Step 0 option A (reuse preferences), the same advisory was shown after BigQuery detection
- [ ] `preferences.json` written to `$MIGRATION_DIR/`
- [ ] `design_constraints.target_region` is populated with `value` and `chosen_by`
- [ ] `design_constraints.availability` is populated (if Q6 was asked or defaulted)
- [ ] Only keys with non-null values are present in `design_constraints`
- [ ] Every entry in `design_constraints` and `ai_constraints` has `value` and `chosen_by` fields
- [ ] Config gap answers recorded in `metadata.inventory_clarifications` (billing mode only)
- [ ] Early-exit skips recorded in `metadata.questions_skipped_early_exit`
- [ ] `ai_constraints` section present ONLY if Category F fired
- [ ] If Category F fired, `ai_constraints.ai_framework` is populated (from detection or Q14)
- [ ] If Category F fired, `ai_capabilities_required` is derived from detection + Q17 + Q20
- [ ] `ai_constraints.ai_framework` is an array (Q14 is multi-select)
- [ ] Output is valid JSON
- [ ] `preferences-draft.json` has been deleted (if it existed)
- [ ] `metadata.clarify_mode` is set to `"fast_path"` or `"full"`

---

## Step 6: Update Phase Status

In the same turn as the output message below, use the Phase Status Update Protocol (Write tool) to write `.phase-status.json` with `phases.clarify` set to `"completed"`.

Output to user: "Clarification complete. Proceeding to Phase 3: Design AWS Architecture."

---

## Scope Boundary

This phase covers requirements gathering ONLY.

FORBIDDEN -- Do NOT include ANY of:

- Detailed AWS architecture or service configurations
- Code migration examples or SDK snippets
- Detailed cost calculations
- Migration timelines or execution plans
- Terraform generation

Your ONLY job: Understand what the user needs. Nothing else.
