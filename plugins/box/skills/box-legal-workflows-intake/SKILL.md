---
name: box-legal-workflows-intake
description: Automate legal client intake and onboarding with Box MCP - review uploaded intake documents for completeness against firm requirements, assess risk levels based on client profile and document content (PEP status, conflicts, sanctions, litigation history), route incomplete or high-risk submissions to appropriate attorneys with context and risk summaries, extract structured metadata (client name, matter type, jurisdiction, value), and generate engagement letters from Box DocGen templates for approved low-risk clients. Use this skill when the user mentions client intake, client onboarding, new client review, intake documents, engagement letters, or needs to process prospective client submissions stored in Box.
---

# Client Intake & Onboarding

> PREREQUISITES:
> - Read the bundled `box` skill for Box MCP auth, tool selection, and base workflows. If it is unavailable, install or enable the `box` Cline plugin; do not run external skill installers from this workflow.
> - Read `box-legal-workflows` for risk frameworks, confidentiality, human-in-the-loop requirements, Box AI governance. If missing, ensure it's installed from the same skill package.

Legal client intake determines if the firm can and should take on a prospective client. This skill automates completeness checks, risk assessment, intelligent routing, and engagement letter generation.

Core principles: Completeness first, risk-based routing, transparent decisions, human oversight for high-risk.

---

## Completeness & Risk Framework

### Required Documents Checklist

[CONFIRM: What documents required for intake?]

Typical:
- Client intake form (completed questionnaire)
- Valid government ID (passport, driver's license)
- Conflict check authorization
- Source of funds documentation (certain practice areas)
- Business entity documents (corporate: articles, operating agreement)

Optional/practice-specific:
- Financial statements (bankruptcy, tax)
- Prior legal proceedings (litigation)
- Contracts or agreements (transactional)

Validation questions:
1. Document present?
2. Complete? (not blank, has expected info)
3. Valid? (ID not expired, forms signed, dates current)

### Risk Rating

[CONFIRM: Low/medium/high risk criteria for your firm?]

See box-legal-workflows for: General risk framework.

Low-risk: Individual client, standard matter, no litigation, clear funds, all docs complete, no conflicts, value below threshold.

High-risk: PEP, high-value, cross-border with sanctions, conflict identified, criminal with media, reputational risk.

### Routing Logic

[CONFIRM: How to route intakes?]

Route based on:
1. Practice area: Match matter to attorney expertise
2. Risk level: Low → associate, Medium → senior, High → partner
3. Workload: Current caseload if known
4. Jurisdiction: Attorney bar admission
5. Language: Attorney language capabilities

Example matrix:

| Risk | Route To | Action |
|------|----------|--------|
| Low | Auto-approve OR associate | Generate engagement letter (if allowed) |
| Medium | Senior attorney | Add comment with risk summary |
| High | Partner + Compliance | Detailed analysis, block auto-processing |
| Incomplete | Intake coordinator | List missing documents |

---

## Tool Selection

| Task | Primary Tool | Notes |
|------|--------------|-------|
| List intake folder | `list_folder_content_by_folder_id` | Get all submission files |
| Review documents | `ai_qa_multi_file` | Completeness & validity |
| Extract data | `ai_extract_structured_from_fields_enhanced` | Name, matter, dates |
| Assess risk | `ai_qa_multi_file` | Multi-file risk analysis |
| Create summary | CONFIRM, then `upload_file` | Write summary doc |
| Write metadata | CONFIRM, then `set_file_metadata` | Record decision, risk, attorney |
| Tag for review | CONFIRM, then `create_file_comment` | Tag attorney with instructions |
| Grant access | CONFIRM, then `create_collaboration` | Give attorney access |
| Generate letter | [CONFIRM: DocGen?] | Need template access |
| Share with client | CONFIRM, then `add_folder_shared_link` or `create_collaboration` | Provide client access |

---

## Implementation Workflow

### Phase 1: Intake Review
1. Authenticate: `who_am_i`
2. [CONFIRM: Intake folder ID?]
3. Inventory: `list_folder_content_by_folder_id`
4. [CONFIRM: Map files to required checklist]
5. Assess completeness: `ai_qa_multi_file` (questions for each doc)
6. Extract info: [CONFIRM: Fields?] → `ai_extract_structured_from_fields_enhanced`

### Phase 2: Risk Assessment
7. Risk analysis: `ai_qa_multi_file` (PEP, sanctions, conflicts, litigation, high value, inconsistencies)
8. Assign rating: [CONFIRM: Match firm's criteria?]

### Phase 3: Decision & Routing
9. Determine action:
   - INCOMPLETE: [CONFIRM: Who follows up?]
   - HIGH RISK: [CONFIRM: Who reviews? Block auto-processing?]
   - MEDIUM RISK: [CONFIRM: Who based on practice area?]
   - LOW RISK: [CONFIRM: Auto-approve or needs review?]

10. [CONFIRM: Upload intake summary to Box?] Save summary: `upload_file` (completeness, risk, factors, action)
11. Write metadata: [CONFIRM: Template exists and write approved?] → `set_file_metadata`

### Phase 4: Routing & Collaboration
12. Add comment: [CONFIRM: Who to tag?] → `create_file_comment`
13. Grant access: [CONFIRM: Permission level?] → `create_collaboration`

### Phase 5: Engagement Letter (If Low-Risk Auto-Approve)
14. Generate letter: [CONFIRM: DocGen template ID?] → Use DocGen if available
15. [CONFIRM: Save generated letter to Box?] Save: `upload_file`
16. Share: [CONFIRM: How? Expiration?] → `create_collaboration` or `add_folder_shared_link`

---

## Guardrails

See box-legal-workflows for: Human-in-the-loop requirements, confidentiality, Box AI governance.

Intake-specific:

ALWAYS confirm before:
1. Auto-approving any client (even low-risk)
2. Generating engagement letters without attorney review
3. Sharing engagement letters with clients
4. Assigning risk ratings
5. Routing to specific attorneys
6. Copying files to externally-accessible folders (if file was NOT already externally accessible)

CONFIRM if uncertain:
7. Document completeness (if missing docs or validity is ambiguous)
8. Extracted metadata (if values are unclear or contradictory)

May draft without additional confirmation when confident:
- Extracting client information into the conversation or a draft.
- Drafting intake summary reports for user review.
- Assessing document completeness when criteria are clear.
- Recommending metadata values, routing decisions, or file organization without applying them.

Any Box write requires explicit confirmation first, including metadata updates, file comments, uploaded summaries, engagement letters, generated documents, collaborations, shared links, or moving/copying files.

NEVER auto-approve without authorization:
- High-risk clients
- Matters above value threshold
- Clients in sanctioned jurisdictions
- Matters with conflicts
- Any category requiring human review per firm policy

Decision transparency:
- Document WHY (risk factors, missing docs)
- Cite which documents reviewed
- Record WHO decided (human or automated)
- Timestamp
- Make summary available to assigned attorney

Box AI usage:
- Pace 1-2 seconds apart
- Context: "Assessing risk for law firm intake. Identify red flags..."
- Surface specific passages supporting assessment
- Human attorney must review final decision

---

## Example Workflows

### Example 1: Complete Low-Risk
Request: "Review John Smith intake, ready to approve?"

Flow:
1. [CONFIRM]: "Folder ID?"
2. `list_folder_content_by_folder_id`
3. Inventory: intake_form.pdf, drivers_license.jpg, conflict_check.pdf
4. [CONFIRM]: "Required: form, ID, conflict check. All present. Assess?"
5. `ai_qa_multi_file`: "Form complete? ID valid? Conflict check signed?"
6. `ai_extract_structured_from_fields_enhanced`: name, matter, value, jurisdiction
7. [CONFIRM]: "$5K estate planning - low-risk?"
8. [CONFIRM]: "Auto-approve or route to Sarah?"
9. [CONFIRM: Write summary/metadata and route?] Create summary, `set_file_metadata`, `create_file_comment`, `create_collaboration`
10. Report: "Docs complete, low-risk. Routed to Sarah."

### Example 2: Incomplete
Request: "Review Acme Corp, what's missing?"

Flow:
1. Get folder ID
2. `list_folder_content_by_folder_id`
3. Inventory: intake_form.pdf, business_license.pdf
4. [CONFIRM]: "Required: form, articles, operating agreement, officer ID, conflict check. Only have form and license. Confirm?"
5. `ai_qa_multi_file` verify
6. [CONFIRM]: "Missing: articles, agreement, ID, conflict check. Who follows up?"
7. [CONFIRM: Write summary/metadata and route?] Create summary, metadata, comment, collaboration
8. Report: "Incomplete. Missing 4 docs. Routed to Maria."

### Example 3: High-Risk
Request: "Review International Trading LLC."

Flow:
1. Get folder ID
2. `list_folder_content_by_folder_id`
3. [CONFIRM]: "Check PEP, sanctions, cross-border, high value?"
4. `ai_qa_multi_file`: "Red flags? PEP? Cross-border? Sanctions jurisdictions? Value > $500K?"
5. AI: "Cross-border OFAC country, $2M, former gov official (PEP)"
6. [CONFIRM]: "HIGH RISK: OFAC, $2M, PEP. Partner + compliance. Who?"
7. [CONFIRM: Write risk memo/metadata and route?] Create risk memo, metadata, comment, collaboration
8. Report: "HIGH RISK. Routed to James + Rachel. Recommend sanctions screening."

### Example 4: Low-Risk + Engagement Letter
Request: "Review Jane Doe, generate engagement letter if approved."

Flow:
1. Complete Example 1 steps (completeness, risk)
2. Determine: low-risk, complete
3. [CONFIRM]: "Auto-approve for estate planning?"
4. [CONFIRM]: "DocGen template ID?"
5. Generate via DocGen OR [CONFIRM]: "DocGen unavailable. Draft or manual?"
6. [CONFIRM: Save letter to Box?] `upload_file` (save letter)
7. [CONFIRM]: "Share with Jane? Collaboration or link?"
8. [CONFIRM: Share letter and update metadata?] `create_collaboration`, `set_file_metadata`
9. Report: "Approved. Letter generated and shared."
