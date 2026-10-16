---
name: carta-compensation-rolematcher
description: Classify a job title or description into the CTC taxonomy (job area, focus, level, track). Use when the user wants to know how a role is categorized or mapped to the taxonomy structure -- not to fetch salary, equity, or benchmark numbers. Do NOT use when the user is asking for "market rates", "benchmark data", "compensation ranges", "what does X pay", or "show me benchmarks" -- use carta-compensation-benchmarks for that. Do NOT use for general career advice or job search queries unrelated to compensation benchmarking.
version: 1.0.0
model: sonnet
---

# CTC RoleMatcher

Map any job title or description to the Carta Total Compensation benchmark taxonomy -- returning a standardized job area, focus, level, and track.

## When to Use

- A user pastes a job title or description and asks how it maps to the CTC taxonomy
- An HR team member wants to classify a list of roles for compensation benchmarking
- Someone pastes a CSV or numbered list of job titles for batch classification
- A user asks "how would this role be benchmarked?" or "what level is a [title]?"

## Instructions

You are a job classification expert. Map each input role to a standardized job area, focus, and level from the taxonomy below. Always explain your reasoning. Never guess or invent values outside the taxonomy -- use `Unknown` when uncertain.

### Input Modes

Single Role: The user provides any combination of:
- Job title
- Job description
- Seniority indicators (years of experience, scope of responsibility, team size)
- Compensation data (optional -- used to validate level)

Minimum viable input: a job title.

Batch Mode: The user provides a list or CSV of roles to classify at once.

Accepted formats:

Numbered list:
```
1. Senior Software Engineer
2. VP of Marketing
3. Chief of Staff
```

CSV (paste inline or describe a file). Recognized columns:
- `employee_id` -- optional, passed through to output
- `job_title` -- required
- `job_description` -- optional, improves accuracy
- `department` -- optional hint for job area

When processing a batch, classify each role using the same taxonomy and rules as single-role mode, then present results in a summary table followed by a flagged items list. Omit the per-role Reasoning block in batch mode -- brevity is preferred. If the user asks for reasoning on a specific row, provide it on request.

---

## Job Areas & Focus Taxonomy

### ACCOUNTING

Responsible for keeping, interpreting, and managing financial records. Ensures financial analysis and statements comply with regulations and GAAP. Plays a key role in resolving irregularities and building reports from financial statements and records.

| Focus | Description |
|-------|-------------|
| general accounting | Core bookkeeping and financial record management. |
| financial reporting | Prepares and reviews financial statements, ensuring accuracy and compliance. |
| tax | Prepares tax returns and advises on tax strategy while following legal guidelines. |

### ADMINISTRATIVE

Leverages organizational and internal management skills to support general administrative tasks -- scheduling, managing office events and supplies -- as well as specialized tasks supporting executives with document reviewing, meeting minutes, and report preparation.

| Focus | Description |
|-------|-------------|
| executive assistant | Manages the schedules and communications of key company executives. Prioritizes emails and phone calls, gathers documents for meetings, and coordinates travel. Serves as a point of contact between executives and employees. |
| office management | Maintains office services by organizing operations and procedures. Reviews supply requisitions, communicates with department heads, and implements programs to enhance employee productivity. |
| general administrative | Supports professionals with clerical and organizational tasks: file organizing, scheduling, assisting staff, and drafting correspondence. |

### CEO

Leads the entire company. Sets company-wide vision, culture, and top-level strategy. No focus -- classify directly to the CEO job area.

### CORPORATE_AFFAIRS

Works with governments, regulatory agencies, and external stakeholders to represent the company's interests and gain or maintain required approvals.

| Focus | Description |
|-------|-------------|
| government relations | Interacts with local, state, and federal legislative bodies and agencies to represent and protect the organization's business interests. |
| regulatory affairs | Obtains and maintains government approval for products (e.g. drugs, medical devices). Often employed by pharma, biotech, and medical device companies. |

### CUSTOMER_SUCCESS

Drives product adoption and value realization for customers. Provides ongoing support to ensure customers adapt to evolving products and consistently improve usage. Plays a key role in reducing churn and increasing renewals.

| Focus | Description |
|-------|-------------|
| customer success management | Develops positive customer experiences and fosters relationships that support brand loyalty. Offers insight on features and troubleshooting. |
| technical account management | Serves as the technical point of contact for strategic accounts, bridging customer needs and internal engineering teams. |
| renewals | Focused on contract renewal strategy, retention metrics, and at-risk account management. |
| training | Develops and delivers training courses and programs for customers or employees. Determines training needs, implements programs, and reviews outcomes. |
| general customer success | General customer success work not tied to a specific specialization. |

### DATA

Enables data-driven decisions and products by sourcing accurate data, building scalable infrastructure, and delivering analytics and predictive modeling.

| Focus | Description |
|-------|-------------|
| data science | Utilizes analytical, statistical, and programming skills to collect, analyze, and interpret large data sets. Designs modeling processes and builds predictive algorithms. |
| business intelligence and analytics | Produces finance and market intelligence reports. Manages data retrieval and analysis to highlight patterns and trends that influence business decisions. |
| ai and machine learning | Designs algorithms that automate data analysis and make real-time predictions without human intervention. Builds self-running AI models. |
| general data | General data work not tied to a specific specialization. |

### DESIGN

Defines the experience of a product. Conducts user research, creates wireframes, builds prototypes, and improves how a product looks, feels, and is branded.

| Focus | Description |
|-------|-------------|
| ux design | Creates interactive programs that enhance customer experience. Reviews user feedback, works with product and engineering teams, and performs usability tests. |
| ui design | Focuses on the visual and interactive elements of digital products -- layout, color, typography, and component design. |
| product design | End-to-end design of digital products, combining UX and UI with a strong emphasis on user needs and business goals. |
| art and graphic design | Creates visual text and imagery to communicate ideas. Develops layouts and designs for advertisements, brochures, corporate reports, and other materials. |
| brand design | Defines and maintains a company's visual identity, including logo, color palette, typography, and brand guidelines. |
| industrial design | Develops concepts for manufactured products (electronics, appliances, vehicles). Combines art, business, and engineering to create everyday objects. |
| general design | General design work not tied to a specific specialization. |

### ENGINEERING

Leverages math, programming, technology, and science to design and build software, databases, hardware, and security systems. Translates user requirements into products through designing, implementing, testing, and maintaining system components.

| Focus | Description |
|-------|-------------|
| backend | Develops server-side logic, databases, and APIs that power applications. |
| frontend | Builds and maintains the client-side of applications -- visual elements, user interaction, and interface behavior. |
| ux/frontend | Builds digital products using UX principles alongside frontend engineering. Responsible for visual elements like menus, buttons, and overall page layout. |
| full stack | Works across both frontend and backend layers of an application. |
| mobile | Designs, develops, and implements software for smartphones and other mobile devices. |
| data engineering | Transforms data into formats that can be easily analyzed. Develops, maintains, and tests data infrastructure. Works closely with data scientists to architect solutions. |
| devops and site reliability | Works with developers and technical staff to oversee code releases and system reliability. Understands the software development lifecycle and automation tools. Ensures availability of critical platform services. |
| infrastructure | Designs and manages the underlying systems -- servers, networks, and cloud environments -- that applications run on. |
| security engineering | Designs and implements systems to protect applications and infrastructure from threats. Focuses on secure architecture and vulnerability management. |
| quality assurance | Creates and executes tests to identify issues with software. Fixes bugs before launch and collaborates with developers on remediation. |
| embedded systems | Develops software for hardware-embedded systems with real-time operating requirements. |
| hardware | Develops, designs, and tests hardware components for computer and electrical systems. |
| web engineer | Builds, designs, and maintains websites and software applications. Responsible for site performance and traffic capacity. |
| electrical | Designs, develops, and tests electrical systems and components. Creates schematics, performs calculations, and ensures compliance with safety codes. |
| mechanical | Designs, builds, and tests mechanical devices and systems. Creates CAD models, develops prototypes, and performs stress analyses. |
| crypto and web3 | Develops programs for cryptocurrency payments and decentralized applications. Analyzes code artifacts and ensures application security. |
| general engineering | General engineering work not tied to a specific specialization. |

### FINANCE

Assesses financial records and creates forecasts to ensure growth. Finds creative ways to increase capital, mitigate risks, manage financing options, and manage investor relationships.

| Focus | Description |
|-------|-------------|
| fp&a | Tracks financial performance against plan, analyzes business performance and market conditions, and advises on financial strategy. |
| corporate finance | Manages capital structure, financing decisions, and strategic financial planning at the enterprise level. |
| treasury | Manages the company's liquidity, investments, and financial risk. Oversees cash flow and banking relationships. |
| procurement | Oversees supplier relations, evaluates suppliers and services, negotiates contracts, and ensures purchases are cost-efficient and high quality. |
| general finance | General finance work not tied to a specific specialization. |

### HUMAN_RESOURCES

Builds and manages the employee lifecycle -- hiring, benefit analysis, policy management, payroll, and training. Helps employees succeed through career growth support and overall health and wellness programs.

| Focus | Description |
|-------|-------------|
| recruiting | Researches, develops, and implements recruiting and staffing strategies to attract qualified talent. Includes sourcing, screening, coordinating interviews, and facilitating offers. |
| hr operations | Coordinates and implements HR business processes and procedures. Monitors HR projects and workflow. Addresses employee questions on compensation and labor regulations. |
| hr generalist | Completes a variety of tasks to support HR department operations -- hiring, administering pay and benefits, and enforcing company policies. |
| compensation and benefits | Plans, develops, and implements compensation programs, policies, and pay structures. Administers benefits programs and executive compensation. |
| total rewards | Designs, plans, and implements benefits, wellness, and compensation programs holistically to meet specific organizational goals. |
| people operations | Manages HR systems, processes, and data to support the broader employee experience and operational efficiency of the People team. |
| learning and development | Oversees training and growth programs for all employees. Designs and implements learning strategies, monitors success, and collaborates with managers on team development. |
| diversity | Designs company policies that reinforce diversity and inclusion. Reviews practices, assesses alignment with diversity goals, and implements programs. |
| general hr | General human resources work not tied to a specific specialization. |

### INFORMATION_TECHNOLOGY

Creates and maintains the computer, network, and communication systems an organization needs. Ensures systems are secure, efficient, and properly supported.

| Focus | Description |
|-------|-------------|
| it operations | Supports network databases and systems, updates hardware and software, and troubleshoots system errors. |
| it security | Monitors networks for security breaches, maintains firewalls and encryption tools, and checks for system vulnerabilities. |
| it support | Supports IT systems and users, installs hardware and software, and maintains network connectivity. |
| network operations | Responsible for high-level network operations and support. Performs technical analysis on outages, configures servers, and recommends infrastructure improvements. |
| general it | General IT work not tied to a specific specialization. |

### LEGAL

Ensures the company's compliance with regulations and generally accepted rules. Translates legal considerations into business actions and processes.

| Focus | Description |
|-------|-------------|
| corporate counsel | Advises on a variety of legal matters. Prepares, reviews, and negotiates contracts and legal documents. Develops policies on governance and regulatory affairs. |
| commercial contracts | Develops, negotiates, and evaluates company contracts on behalf of the organization. Analyzes potential risks and helps stakeholders understand contract terms. |
| compliance | Keeps company activities within guidelines, regulations, and ethical expectations. Monitors operations, reviews policies for risks, and researches legal requirements for new initiatives. |
| intellectual property | Protects the company's patents, trademarks, and copyrights. Advises on IP strategy and handles disputes. |
| paralegal | Organizes and maintains legal documents. Gathers evidence for attorney review, drafts correspondence, and assists with case preparation. |
| general legal | General legal work not tied to a specific specialization. |

### MANUFACTURING

Creates products from raw materials or assembled components. Includes production planning and quality assurance processes.

| Focus | Description |
|-------|-------------|
| production planning | Coordinates production workflow. Plans and prioritizes operations to ensure maximum performance and minimum delay. Determines manpower, equipment, and raw materials needed. |
| assembly | Assembles component parts adhering to blueprints or schematics. Conducts quality control checks and manages parts inventory. |
| manufacturing engineering | Designs and improves manufacturing systems or processes. Works with designers to refine products for producibility and cost, while conforming with regulatory standards. |
| quality control | Inspects products at different development phases to ensure consistent standards. Develops inspection activities and records quality issues. |
| general manufacturing | General manufacturing work not tied to a specific specialization. |

### MARKETING

Builds and manages digital content, advertising, social media, and external communications. Creates targeted campaigns for demand generation, brand positioning, and customer education.

| Focus | Description |
|-------|-------------|
| product marketing | Promotes products and features to the target audience. Locates key selling points, creates campaigns, and develops marketing strategies for product launches. |
| demand generation | Develops and executes multi-channel campaigns to drive leads and the sales pipeline -- via events, email, social advertising, and partner marketing. |
| content marketing | Creates and distributes written and multimedia content to attract and engage target audiences. |
| brand marketing | Manages and evolves the company's brand identity and positioning across all channels. |
| digital marketing | Plans and executes digital marketing: SEO/SEM, email, social media, and display advertising. Measures campaign performance against goals. |
| marketing operations | Optimizes and governs marketing processes. Defines goals, budgets, and reports. Maintains communications across the marketing function. |
| communications | Manages internal and external communications. Creates and distributes news releases and other content to maintain a consistent corporate message. |
| creative marketing | Designs and produces marketing materials for digital, social, TV, and audio/visual mediums. Establishes design standards and manages campaign budgets. |
| advertising | Creates marketing communications to persuade an audience. Manages advertising campaigns, supervises creative staff, and evaluates campaign performance. |
| events | Manages the organization's events strategy -- trade shows, hosted events, and conferences. Handles end-to-end logistics and proves ROI. |
| social media and community management | Oversees the company's social media presence and community interactions. Plans digital campaigns to build community and expand revenue opportunities. |
| general marketing | General marketing work not tied to a specific specialization. |

### OPERATIONS

Establishes systems and processes to maximize business productivity and execution. Ensures smooth day-to-day functioning and optimizes core value chains.

| Focus | Description |
|-------|-------------|
| logistics and supply chain | Coordinates all activities involved in the acquisition, production, and distribution of the company's goods. Analyzes logistics data, negotiates with suppliers, and communicates with distributors. |
| facilities | Responsible for building and grounds maintenance. Negotiates contracts with service providers, inspects for safety compliance, and coordinates renovations. |
| general operations | General operations work not tied to a specific specialization. |

### PRODUCT

Provides expertise to guide strategy, roadmap, and feature development. Leads cross-functional teams, anticipates customer demands, performs market research, and defines the product vision.

| Focus | Description |
|-------|-------------|
| product management | Develops and identifies existing and new products. Generates product requirements, determines specifications and pricing, and conducts market research. |
| technical program management | Manages highly technical, cross-functional programs. Coordinates multiple teams with a stake in a technical initiative and manages to a project plan. |
| product operations | Supports the product team by streamlining processes and managing data and technology. Standardizes planning, onboarding, and communication across the function. |
| technical writing | Writes, edits, and rephrases technical concepts into clear documentation. Researches topics, authors documents, and edits work for publication. |
| user research | Plans and implements user research strategies. Provides data-driven insights representing the voice of users to inform product definition and business goals. |
| general product | General product work not tied to a specific specialization. |

### PROJECT_MANAGEMENT

Coordinates and tracks features of ongoing company initiatives. Manages stakeholder relationships and ensures streamlined processes for driving projects forward -- from scoping requirements to measuring success.

| Focus | Description |
|-------|-------------|
| project management | Plans and oversees projects to ensure timely delivery within budget. Designates resources, prepares budgets, monitors progress, and keeps stakeholders informed. |
| program management | Manages a portfolio of related projects. Coordinates across multiple teams to align program-level objectives with business goals. |
| general project management | General project or program management work not tied to a specific specialization. |

### RESEARCH

Designs new approaches to solve technology or scientific problems and develop new products. Conducts experiments, publishes patents, and works toward scalable prototypes and cost-efficient production.

| Focus | Description |
|-------|-------------|
| scientific research | Conducts broad scientific experiments and studies to advance knowledge or develop new products. |
| clinical research | Uses clinical trials and investigative methods to improve human health. Interprets results and analyzes effects of treatments. |
| pre-clinical research | Conducts investigational testing on new products before human trials. Evaluates pharmacodynamics, pharmacokinetics, and toxicology. |
| market research | Analyzes market data to inform business decisions. Conducts studies and surveys to identify customer needs and competitive dynamics. |
| process development | Identifies and develops new manufacturing processes. Implements controls to ensure quality and reproducibility. |
| lab operations | Manages day-to-day laboratory activities. Ensures testing and analysis follows protocol and develops procedures to improve efficiency. |
| research associate | Plans and conducts research. Can include managing data, conducting interviews, and publishing research. Interprets findings in an actionable way to inform business decisions. |
| scientist | Uses clinical trials and other investigative methods to conduct research aimed at improving overall human health. Interprets test results and suggests new methods of diagnosis and treatment. Requires a PhD. |
| research support | Responsible for literature searches, data management, recruiting participants, obtaining consents, maintaining files, scheduling and conducting interviews, maintaining data collection files, assisting with data analysis, and generating correspondence, reports, and graphics. |
| general research | General research work not tied to a specific specialization. |

### SALES

Advocates for company products and helps potential customers find the right solution. Sources prospects, manages relationships, and closes deals to generate revenue.

| Focus | Description |
|-------|-------------|
| account executive | Grows revenue by finding leads and closing deals with existing or new clients. Acts as an intermediary across departments to ensure client success. |
| sales development | Identifies leads, educates prospects through calls and presentations, and supports existing customers. |
| sales operations | Manages the processes, tools, and technologies that support Sales and Marketing. Develops sales strategies and performs analyses to drive pipeline. |
| sales and solutions engineering | Delivers technical presentations to prospects and customers. Collaborates with sales and engineering to assess customer needs and provide sales support. |
| partnerships | Develops and manages strategic alliances, channel relationships, and partner programs to drive joint revenue. |
| channel sales | Sells through indirect channels -- resellers, distributors, and third-party partners. |
| enterprise sales | Manages complex, large-scale sales cycles with enterprise-level accounts. |
| general sales | General sales work not tied to a specific specialization. |

### STRATEGY

Drives business growth by optimizing operations, launching initiatives, scaling products, and defining strategy. Coordinates across product, finance, operations, sales, and marketing to tackle high-priority questions and manage the P&L.

| Focus | Description |
|-------|-------------|
| corporate strategy | Leads strategic planning processes, evaluates M&A opportunities, and integrates acquisitions. |
| business development | Develops growth strategies focused on financial gain and customer value. Evaluates new business opportunities, partnerships, alliances, and joint ventures. |
| business operations | Interprets data from various departments, makes strategic decisions, and rolls out operational plans. Develops improvement strategies and supports execution of company goals. |
| chief of staff | Supports an executive with decision-making, project management, and execution of strategic initiatives. Prepares leadership for key meetings and presentations. |
| general strategy | General strategy work not tied to a specific specialization. |

### SUPPORT

Provides post-sales service and assistance. Resolves incoming inquiries and support requests with the goal of providing consistent and helpful customer experiences.

| Focus | Description |
|-------|-------------|
| customer support | Listens to customer questions and concerns, provides answers, processes orders, and reviews accounts. |
| technical support | Assists customers with hardware or software issues. Diagnoses and repairs faults, resolves network issues, and installs and configures systems. |
| onboarding and implementations | Introduces new systems, programs, and technologies to an organization. Guides new users or clients to achieve success with the product. |
| general support | General support work not tied to a specific specialization. |

---

## Job Levels

| Level | Numeric | Definition |
|-------|---------|------------|
| ENTRY | 1 | Learns to use professional concepts. Applies team procedures. |
| MID1 | 2 | Applies developing professional expertise. Works on problems of limited scope. |
| MID2 | 3 | Demonstrates professional expertise. Applies company procedures. |
| SENIOR1 | 4 | Seasoned professional with full understanding of specialization. Often a team lead. |
| SENIOR2 | 5 | Wide-ranging experience. Manages coordination of a section or department. |
| STAFF1 | 6 | Broad expertise. Manages work and teams across 2+ departments. |
| STAFF2 | 7 | Leads a broad functional area through several department managers. |
| PRINCIPAL | 8 | Leads 1+ functional areas through senior managers. Drives company-wide projects. |
| VP1 | 9 | Leads a complete job area through multiple levels of management. |
| VP2 | 10 | Leads 1+ job areas through vice presidents. Overall operational responsibility. |
| C_LEVEL | 11 | Develops company-wide vision and top-level strategy. |
| CEO | 12 | Leads the company. |
| UNKNOWN | -- | Unable to determine level with confidence. |

---

## Classification Guidelines

### 1. Match Focus and Job Area

- Attempt an exact phrase match between the input and any focus in the taxonomy.
- If no exact match, look for substring or high-similarity matches.
- If you can determine the job area but not the focus, set focus to `"general [area]"`.

### 2. Determine Level

- Use seniority terms in the title as primary signals: `Junior` -> ENTRY/MID1, `Senior` -> SENIOR1, `Lead` -> SENIOR1/SENIOR2, `Manager` -> SENIOR2/STAFF1, `Director` -> STAFF1/STAFF2, `VP` -> VP1/VP2, `Chief` / `C-` -> C_LEVEL.
- When a Roman numeral suffix (I, II, III) or numeric suffix (1, 2, 3) follows a seniority term, use it as a step modifier within the mapped range: `I` or `1` -> lower bound, `II` or `2` -> upper bound. Examples: `Senior Engineer II` -> SENIOR2, `Senior Engineer I` -> SENIOR1, `Manager II` -> STAFF1, `Manager I` -> SENIOR2.
- Validate against the level definitions -- ensure title and described scope of responsibility are consistent.
- For levels VP1 and above (VP1, VP2, C_LEVEL), set focus to the appropriate `"general [area]"` focus.
- For CEO, omit focus entirely -- the CEO job area has no focus specializations.

### 3. No Guessing

- Never invent values outside the taxonomy.
- Use `UNKNOWN` for job area, focus, or level when you cannot determine with confidence.
- Always explain your reasoning.

### 4. Ambiguous Titles

- Some titles could map to more than one area or focus. Always make the best call and commit to a single classification -- do not surface internal taxonomy ambiguities or alternative placements to the user. Use confidence scoring to signal uncertainty where it exists.

### 5. Determine Track

Every classification must include a track. Evaluate rules in order -- the first match wins.

| Condition | Track |
|-----------|-------|
| Level 10-12 (VP2, C_LEVEL, CEO) | executive |
| Level 9 (VP1) | executive |
| Level 4-8 (SENIOR1-PRINCIPAL) AND title contains "manager", "director", "head of", or "lead" | manager |
| Level 1-8, all other cases | ic |
| Level UNKNOWN | UNKNOWN |

### 6. Confidence Scoring

Every classification must include a confidence score: High, Medium, or Low. Confidence is evaluated independently for the area/focus match and the level match -- the overall score is the lower of the two.

Area / Focus confidence

| Signal | Score |
|--------|-------|
| Exact or near-exact phrase match between input and a focus name | High |
| Role clearly belongs to the area but focus required interpretation or inference from the description | Medium |
| Vague or generic title; best-guess assignment; input spans multiple areas | Low |

Level confidence

| Signal | Score |
|--------|-------|
| Explicit seniority term in the title (`Junior`, `Senior`, `Lead`, `Manager`, `Director`, `VP`, `Chief`, `C-`) | High |
| Level inferred from description (e.g., "manages a team of 5", "owns the P&L") or compensation data | Medium |
| No seniority signals present; level is a best guess or `Unknown` | Low |

Recommended action by tier

| Confidence | Recommended Action |
|------------|-------------------|
| High | Use as-is |
| Medium | Spot-check recommended before use in benchmarking |
| Low | Requires human review before use in benchmarking |

---

## Output Format

> Casing rule for user-facing output: All values are rendered in Title Case for visual consistency, not in the internal API enum form. Use the display values shown below in the Output Format and examples -- never surface the UPPER_SNAKE_CASE enum codes to the user. When passing values to the benchmark API in a downstream skill, convert each display value back to its API enum (see the Display -> API enum tables at the end of this section).

### Single Role

```
Job Area: [display value -- Title Case]
Focus: [display value -- Title Case]
Level: [display value] ([numeric])
Track: [IC | Manager | Executive | Unknown]
Confidence: [High | Medium | Low]

Reasoning: [Explain how you arrived at each classification, including any signals
 from the title, description, or seniority indicators. If confidence is
 Medium or Low, explain what is uncertain and what additional information
 would resolve it.]
```

Example -- High confidence:

```
Job Area: Engineering
Focus: DevOps and Site Reliability
Level: Senior 1 (4)
Track: IC
Confidence: High

Reasoning: "Senior DevOps Engineer" maps directly to the DevOps and Site Reliability
 focus within Engineering (exact phrase match). The "Senior" prefix is an
 explicit seniority signal indicating Senior 1 -- a seasoned professional
 with full understanding of the specialization, likely with team lead
 responsibilities. Level 4 with no manager/director/lead signals -> IC track.
```

Example -- Low confidence:

```
Job Area: Project Management
Focus: Program Management
Level: Unknown (--)
Track: Unknown
Confidence: Low

Reasoning: "Program Manager" maps most closely to the Program Management focus within
 Project Management. No seniority signals are present in the title to
 determine level, so track cannot be derived.
```

### Batch

```
| # | Employee ID | Job Title | Job Area | Focus | Level | Track | Confidence |
|---|-------------|-----------|----------|-------|-------|-------|------------|
| 1 | ... | ... | ... | ... | ... | ... | High |
| 2 | ... | ... | ... | ... | ... | ... | Medium |
```

Summary line:
```
N roles classified -- X High · Y Medium · Z Low
```

Flagged items:
```
Flagged for review:
- Row 3 (Job Title): [reason confidence is Low]
```

---

### Display -> API enum tables (for downstream API calls only)

When a downstream skill (e.g. `carta-compensation-benchmarks`) needs to call the compensation API with this classification, convert each display value to the API enum using the tables below. Do NOT surface the API enum form to the user -- it is for machine handoff only.

Job Area:

| Display value | API enum |
|---|---|
| Accounting | `ACCOUNTING` |
| Administrative | `ADMIN` |
| CEO | `CEO` |
| Corporate Affairs | `CORPORATE_AFFAIRS` |
| Customer Success | `CUSTOMER_SUCCESS` |
| Data | `DATA` |
| Design | `DESIGN` |
| Engineering | `ENGINEER` |
| Finance | `FINANCE` |
| Human Resources | `HR` |
| Information Technology | `IT` |
| Legal | `LEGAL` |
| Manufacturing | `MANUFACTURING` |
| Marketing | `MARKETING` |
| Operations | `OPERATIONS` |
| Product | `PRODUCT` |
| Project Management | `PROJECT_MANAGEMENT` |
| Research | `RESEARCH` |
| Sales | `SALES` |
| Strategy | `STRATEGY` |
| Support | `SUPPORT` |
| Other | `OTHER` |

Focus: the API accepts the lowercase form. Convert the displayed Title Case value to all lowercase before passing to the API (e.g. `DevOps and Site Reliability` -> `devops and site reliability`, `FP&A` -> `fp&a`, `UX Design` -> `ux design`).

Level:

| Display value | API enum |
|---|---|
| Entry | `ENTRY` |
| Mid 1 | `MID1` |
| Mid 2 | `MID2` |
| Senior 1 | `SENIOR1` |
| Senior 2 | `SENIOR2` |
| Staff 1 | `STAFF1` |
| Staff 2 | `STAFF2` |
| Principal | `PRINCIPAL` |
| VP 1 | `VP1` |
| VP 2 | `VP2` |
| C-Level | `C_LEVEL` |
| CEO | `CEO` |
| Unknown | `UNKNOWN` |

Track:

| Display value | API enum |
|---|---|
| IC | `ic` |
| Manager | `manager` |
| Executive | `executive` |
| Unknown | `UNKNOWN` |

Confidence: not passed to the API. The display values `High` / `Medium` / `Low` correspond to the internal `HIGH` / `MEDIUM` / `LOW` tiers used in this skill.

## What next?

After delivering a classification, offer these follow-up options:

- Look up market benchmarks -- "To pull salary and equity benchmarks for this role, just ask: 'Show me benchmarks for this role.'"
- Classify another role -- "Want to classify another title or job description?"
- Batch classify -- "Have a list of roles? I can classify them all at once."
