# Vertical-specific schema shapes

Detailed schemas for the verticals named in `SKILL.md`. Load the section that matches the user's industry; don't read the whole file. These build on the base schemas in `schema-shapes.md` -- load that file too if the user's setup is greenfield.

Verticals here are based on patterns observed across deployed customer setups in the Airtable footprint. Industries where Airtable's flexibility matters more than enterprise-CRM features tend to cluster in these shapes.

## Brokerage / commission CRM

For talent agencies, real estate brokerages, mortgage brokers, financial advisors, insurance brokers, and any business where revenue is commissioned on deals closed by individual brokers.

### Distinctive elements

-   Brokers / talent / agents as a first-class entity (not just collaborators on the base)
-   Commission calculation per deal -- typically `Deal Amount × Commission rate × Split %`
-   Probability-weighted expected commission for forecast
-   Pipeline organized around the broker / agent, not the territory
-   Brokerage / agency / firm as a top-level entity above brokers

### Tables (on top of the 3-table CRM shape)

-   Brokers / Agents -- every commissioned individual.
    -   `Name` (singleLineText, primary)
    -   `Type` (singleSelect: Broker, Agent, Talent manager, Partner)
    -   `Tier` (singleSelect: Junior, Senior, Principal) -- drives commission rate
    -   `Default commission rate` (number, percent)
    -   `Active deals` (count of linked Opportunities where Stage ∉ Closed-\*)
    -   `YTD closed-won` (rollup sum of Opportunity Amount where Closed-Won + this year)
    -   `YTD expected commission` (rollup or formula)
-   Opportunities (commission-shaped) -- replaces / extends the base Opportunities table.
    -   `Name` (singleLineText, primary) -- usually `[Account] [scope]` or `[Talent] [deal]`
    -   `Broker / Agent` (multipleRecordLinks -> Brokers)
    -   `Co-broker` (multipleRecordLinks -> Brokers, for split commission)
    -   `Split %` (number, percent) -- for primary broker on split deals
    -   `Co-broker split %` (number, percent)
    -   `Commission rate override` (number, percent -- overrides broker default when this deal differs)
    -   `Effective commission rate` (formula = `IF({Commission rate override}, {Commission rate override}, {Broker.Default commission rate})`)
    -   `Deal Amount` (currency)
    -   `Probability` (number, percent)
    -   `Expected commission` (formula = `Deal Amount × Effective commission rate × Split % × Probability`)
    -   Standard fields: Stage, Expected close, Lead source, etc.
-   Commission payouts -- historical commission records once a deal closes.
    -   `Opportunity` (multipleRecordLinks -> Opportunities)
    -   `Broker / Agent` (multipleRecordLinks -> Brokers)
    -   `Closed amount` (currency) -- actual deal close amount, may differ from forecast
    -   `Commission paid` (currency)
    -   `Pay period` (date or singleSelect by quarter)
    -   `Paid status` (singleSelect: Pending, Paid, Disputed)

### Variants

-   Real estate brokerage: see Real estate vertical below -- adds pursuit stages, property records, MSA fields.
-   Talent agency: Talent table (clients represented by the agent) separate from external parties (brands, opportunities). Talent commission deals tracked by Talent × Brand. Customer language: _"book of business"_, _"signing"_, _"brand partnership"_.
-   Mortgage broker: see Mortgage operations vertical below.
-   Financial advisor: AUM-based commission instead of per-deal. Add AUM tracking per client; commission is a rate × AUM annualized.

### Views and interfaces to hand off

-   Per-broker dashboard (Interface page): YTD closed-won, YTD commission, active deals, top opportunities
-   Brokerage-wide pipeline: pivot of Expected commission by Broker × Stage
-   Pay period reconciliation: Commission payouts filtered to current pay period

## Real estate CRM

For residential and commercial real estate brokerages, property management firms, real estate investment trusts (REITs).

### Distinctive elements

-   Properties / listings as a first-class entity
-   Pursuit stages distinct from sales stages: opinion of value, offer, qualifying, listing agreement, escrow, closing
-   MSA (Metropolitan Statistical Area) fields -- geographic filtering at MSA grain
-   Acreage / square footage / land value calculations
-   Brokers (per Brokerage / commission shape above)

### Tables

-   Properties / Listings -- every listed or pursued property.
    -   `Address` (singleLineText, primary) -- or `Property name` for commercial
    -   `MSA` (singleSelect)
    -   `Property type` (singleSelect: Residential SFH, Multifamily, Office, Retail, Industrial, Land, Mixed-use)
    -   `Status` (singleSelect: Pursuing, Listed, Under contract, Closed, Off-market)
    -   `Listing price` (currency)
    -   `Acreage` (number)
    -   `Sqft` (number)
    -   `Acres-to-sqft` (formula = `Acreage * 43560`) -- for parcels listed in acres but quoted in sqft
    -   `Owner / Seller` (multipleRecordLinks -> Contacts)
    -   `Listing broker` (multipleRecordLinks -> Brokers)
    -   `Buyer agent` (multipleRecordLinks -> Brokers)
    -   `Days on market` (formula)
-   Pursuits / Opportunities -- the deal layer above Properties.
    -   `Pursuit name` (singleLineText, primary)
    -   `Property` (multipleRecordLinks -> Properties)
    -   `Pursuit stage` (singleSelect: Opinion of value, Offer, Qualifying, Listing agreement, Under contract, Closed)
    -   `Buyer / Seller` (multipleRecordLinks -> Accounts or Contacts)
    -   `Expected close` (date)
    -   `Expected commission` (formula -- see Brokerage shape)
-   Comps (optional) -- comparable transactions for market intelligence.
    -   `Property` (multipleRecordLinks -> Properties -- past sales)
    -   `Sale date` (date)
    -   `Sale price` (currency)
    -   `Price per sqft` (formula)
    -   `Notes` (multilineText)

### Variants

-   Commercial real estate: Capital partner pursuits, tenant rep, leasing pipeline. Add Tenant table for multi-tenant office/retail tracking.
-   Residential brokerage: Buyer agent representation, listing agent representation, dual agency tracking. Add Buyer profile (criteria) and Seller profile.
-   REIT / investor: Investment thesis, due diligence stages, hold period. Add Investments table separate from Pursuits.

### Views and interfaces to hand off

-   Map view (via Mapline or similar extension) on Properties by Address
-   Pursuit kanban grouped by Pursuit stage
-   Per-broker book-of-business interface
-   Comp lookup view for pricing decisions

## Mortgage operations CRM

For mortgage lenders, originators, and loan officers. Customer-record-centric (replacing legacy LOS / Jungo / acculynx-style tools).

### Distinctive elements

-   Customer (borrower) as the primary entity; loans / cases linked
-   Multi-loan customer journeys (refi, second mortgage)
-   LOS (Loan Origination System) sync as the upstream data source
-   Renewal triggers at 6-month intervals (refinance opportunities)
-   Closing process with documents, conditions, underwriting steps
-   Branch / loan officer / processor team structure

### Tables

-   Customers -- borrowers.
    -   `Name` (singleLineText, primary)
    -   `Email` (email), `Phone` (phoneNumber)
    -   `Status` (singleSelect: Prospect, Active loan, Refi candidate, Closed customer, Past customer)
    -   `Loan officer` (singleCollaborator)
    -   `Branch` (singleSelect)
    -   `Cases / Loans` (multipleRecordLinks -> Cases)
    -   `Plans` (multipleRecordLinks -> Plans -- refi triggers, future loans)
    -   `Last contacted` (date)
-   Cases / Loans -- individual loan applications.
    -   `Loan ID` (singleLineText, primary) -- LOS reference
    -   `Customer` (multipleRecordLinks -> Customers)
    -   `Loan type` (singleSelect: Purchase, Refi, HELOC, Reverse, FHA, VA, Conventional, Jumbo)
    -   `Stage` (singleSelect: Application, Underwriting, Conditional approval, Clear to close, Closed, Funded, Withdrawn)
    -   `Loan amount` (currency)
    -   `Property address` (singleLineText)
    -   `Closing date` (date)
    -   `Conditions outstanding` (multipleSelects)
    -   `Underwriter` (singleCollaborator)
    -   `Processor` (singleCollaborator)
-   Plans -- future opportunities (refi triggers, second-mortgage planning).
    -   `Customer` (multipleRecordLinks -> Customers)
    -   `Plan type` (singleSelect: 6-month refi check, Rate-trigger refi, Second mortgage, Investment property)
    -   `Trigger date` (date) -- when to surface this opportunity
    -   `Trigger reason` (singleLineText) -- e.g., "rate dropped below X" or "6 months since closing"
    -   `Status` (singleSelect: Pending, Triggered, Converted, Expired)
-   Appointments -- meetings with customers, often via Calendly integration.
    -   `Customer` (multipleRecordLinks -> Customers)
    -   `Date` (dateTime)
    -   `Loan officer` (singleCollaborator)
    -   `Outcome` (singleSelect)

### Automation patterns

-   Renewal triggers: 6-month automation creates a Plan record for every Closed customer with `Plan type = 6-month refi check`. Loan officer gets a notification to reach out.
-   LOS sync: hourly Make.com or Zapier sync from the LOS into the Cases table; new applications create Customer + Case records; status changes trigger automations.
-   Slack notifications: on submission / payout events (100+/day at scale), notify Slack channels for ops awareness.

### Views and interfaces to hand off

-   Loan officer book-of-business interface (per LO view)
-   Closing pipeline kanban grouped by Stage
-   Refi opportunity surfacer (Plans where Trigger date <= today, Status = Pending)
-   Branch performance dashboard

## Capital markets / investment banking

For investment banks, M&A advisory firms, private equity / VC firms with banker coverage models. The "sales-averse-to-Salesforce" capital-markets pattern.

### Distinctive elements

-   Sponsors / clients / firms as relationship anchors (not deals -- bankers cover relationships, not pipelines)
-   Multi-banker coverage of a single sponsor (firm-wide coordination, not solo-banker pipelines)
-   Block trades / M&A deals as the work products
-   AUM, fund size, sector focus on each sponsor
-   Compliance and legal review intersections

### Tables

-   Sponsors / Firms -- the relationship anchor.
    -   `Name` (singleLineText, primary)
    -   `Type` (singleSelect: PE firm, VC, Hedge fund, Family office, Corporate, Sovereign)
    -   `AUM` (currency) -- assets under management
    -   `Fund size` (currency)
    -   `Sector focus` (multipleSelects)
    -   `Geographic focus` (multipleSelects)
    -   `Lead banker` (singleCollaborator)
    -   `Coverage team` (multipleCollaborators)
    -   `Last meeting` (date or rollup)
    -   `Relationship strength` (singleSelect: Top tier, Active, Latent, New)
-   Contacts at Sponsors -- investment professionals at the firms.
    -   `Name` (singleLineText, primary)
    -   `Sponsor` (multipleRecordLinks -> Sponsors)
    -   `Title` (singleLineText) -- Partner, MD, Principal, VP, Associate
    -   `Sector / Focus` (multipleSelects)
-   Deals / Trades / Mandates -- work products.
    -   `Name` (singleLineText, primary) -- typically `[Target] [Sponsor]` for M&A
    -   `Type` (singleSelect: M&A advisory, Block trade, IPO, Debt issuance, Restructuring, Private placement)
    -   `Sponsor` (multipleRecordLinks -> Sponsors)
    -   `Target / Counterparty` (singleLineText or linked record)
    -   `Stage` (singleSelect: Pitching, Mandate, Diligence, Marketing, Pricing, Closed)
    -   `Deal size` (currency)
    -   `Fee` (currency)
    -   `Lead banker` (singleCollaborator)
    -   `Closing date` (date)
-   Meeting notes -- coverage and pitch meetings.
    -   `Sponsor` (multipleRecordLinks -> Sponsors)
    -   `Date` (dateTime)
    -   `Attendees (internal)` (multipleCollaborators)
    -   `Attendees (external)` (multipleRecordLinks -> Contacts)
    -   `Topics` (multipleSelects)
    -   `Notes` (multilineText)
    -   `Follow-up` (singleLineText)

### Variants

-   PE / VC investing: Deal flow shape -- see Investment / VC deal pipeline (separate from this banker-coverage shape).
-   Hedge fund coverage: trades over relationships; per-trade rather than per-sponsor.

### Views and interfaces to hand off

-   Sponsor coverage map (per-banker view of assigned sponsors)
-   Deal pipeline by Type × Stage
-   Meeting calendar with prep brief surfacer
-   Cross-banker coordination interface ("who's covering Sponsor X this quarter")

## Public works / AEC tender pipeline

For architecture, engineering, construction firms bidding on public works, government contracts, and large enterprise RFPs. Pre-bid intelligence + go/no-go discipline + win-rate analysis.

See `sub-workflows.md#9-rfp-tender-pipeline-ops` for the operational playbook. Tables include:

-   Tenders / RFPs with `Issuing body`, `Pursuit tier` (A/B/C), `Bid value`, `Bid effort (person-days)`, `Submission deadline`, `Go/no-go decision`
-   Stakeholders for pre-bid intelligence -- project owners, design consultants, commission members, past contracts won/lost with this issuer
-   Bid components for multi-line tender pricing
-   Win/loss analysis for retrospective learning

Pattern observed at large infrastructure / construction firms with structured pursuit policies.

## Nonprofit / fundraising / donor pipeline

For nonprofits, mission-driven orgs, fundraising teams.

### Distinctive elements

-   Donors as the primary entity (not "customers")
-   Gift history with annualized rollups, donor lifetime value
-   Wealth screening / capacity assessment data
-   Pipeline stages: prospect -> cultivate -> solicit -> steward
-   Major-gift focus vs. annual fund (different cadences)
-   Grants and corporate gifts vs. individual donors

### Tables

-   Donors -- individuals and orgs giving.
    -   `Name` (singleLineText, primary)
    -   `Type` (singleSelect: Individual, Foundation, Corporate, Government)
    -   `Donor tier` (singleSelect: Major, Mid-level, Annual fund, Lapsed, Prospect)
    -   `Capacity` (currency or singleSelect by range) -- estimated giving capacity
    -   `Last gift date` (date or rollup)
    -   `Lifetime giving` (currency rollup from Gifts)
    -   `Gift officer` (singleCollaborator)
    -   `Engagement stage` (singleSelect: Prospect, Cultivate, Solicit, Steward, Inactive)
-   Gifts -- individual donations.
    -   `Donor` (multipleRecordLinks -> Donors)
    -   `Amount` (currency)
    -   `Gift date` (date)
    -   `Designation` (singleSelect or singleLineText) -- restricted vs. unrestricted, by program
    -   `Solicitation` (multipleRecordLinks -> Solicitations, if tracked)
    -   `Acknowledgment status` (singleSelect: Pending, Sent, Confirmed)
-   Solicitations / Asks -- fundraising activity.
    -   `Donor` (multipleRecordLinks -> Donors)
    -   `Ask amount` (currency)
    -   `Ask date` (date)
    -   `Outcome` (singleSelect: Pending, Yes, No, Counter, Defer)
    -   `Gift officer` (singleCollaborator)

### Variants

-   Grants management: separate Grant Applications table with stages (Drafting, Submitted, Awarded, Reporting). Reporting due dates are critical.
-   Corporate fundraising: emphasis on relationship management vs. transaction tracking. Sponsorship menus, corporate gift matching.
-   Capital campaign: pledges over multi-year periods; pledge payment tracking; campaign progress to goal.

## Partner / channel CRM

For partner-led GTM motions -- channel partners, system integrators, referral partners.

### Distinctive elements

-   Partners as a first-class entity above partner contacts
-   Deal registration with conflict resolution
-   Joint account planning (partner + direct sales co-selling)
-   Partner-led pipeline rollup separate from direct
-   Possibly external-collaborator access (see `build-shapes.md`)

### Tables

-   Partners -- partner organizations.
    -   `Name` (singleLineText, primary)
    -   `Type` (singleSelect: Reseller, SI, Referral, Strategic, Distributor)
    -   `Tier` (singleSelect: Gold, Silver, Bronze, Authorized)
    -   `Region` (multipleSelects)
    -   `Partner manager` (singleCollaborator) -- internal owner
    -   `Status` (singleSelect: Active, Onboarding, Inactive, Terminated)
    -   `Joint account list` (multipleRecordLinks -> Accounts)
-   Deal registrations -- partner-submitted deals.
    -   `Partner` (multipleRecordLinks -> Partners)
    -   `Account` (multipleRecordLinks -> Accounts)
    -   `Opportunity` (multipleRecordLinks -> Opportunities, populated after approval)
    -   `Status` (singleSelect: Submitted, Under review, Approved, Rejected, Conflict)
    -   `Submitted date` (date)
    -   `Approval expires` (date) -- deal-reg protection windows
-   Joint account plans -- co-selling shared strategy docs.
    -   `Account` (multipleRecordLinks -> Accounts)
    -   `Partner` (multipleRecordLinks -> Partners)
    -   `Plan year` (singleSelect)
    -   `Joint goals` (multilineText)
    -   `Internal owner` (singleCollaborator)
    -   `Partner contact` (multipleRecordLinks -> Partner contacts)

### Automation patterns

-   Deal registration conflict check: when a partner submits a registration for an Account already in direct pipeline, flag the conflict to the channel manager via Slack.
-   Approval expiration: 90-day deal-reg protection windows trigger a reminder to the partner before expiration.
-   External-collaborator access: partners log into a restricted Airtable Interface page (or a custom-app surface per `build-shapes.md`) to view their pipeline and update their deal regs.

### Views and interfaces to hand off

-   Partner directory (filtered by Tier, Region, Status)
-   Deal reg triage queue (channel manager view)
-   Partner-led pipeline rollup by Partner × Stage
-   Joint account plan interface (per-account view)

## Choosing between vertical shapes

If the user's industry is clear, lead with the matching vertical shape. If they describe a workflow that spans verticals (e.g., a financial services firm doing both wealth management and capital markets), pick the dominant pattern and add tables from the other vertical as needed.

When the user's industry is unclear, default to the standard mid or CRM-augmentation shape in `schema-shapes.md` and confirm the vertical during scope conversation. Don't pick a niche vertical shape without confirmation -- the schema overhead is real and switching after scaffolding is expensive.
