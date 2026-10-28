"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  Settings2, 
  ShieldCheck, 
  Layers, 
  FileText, 
  Building2, 
  CheckCircle2, 
  LineChart, 
  BookOpen, 
  Workflow, 
  Database, 
  GitFork, 
  ChevronRight, 
  ExternalLink, 
  Sparkles, 
  AlertCircle, 
  ArrowRight, 
  Check, 
  Eye, 
  PlusCircle, 
  Edit3, 
  Trash2,
  Lock,
  FileSpreadsheet,
  Calendar,
  DollarSign,
  Search,
  Sliders,
  AlertTriangle
} from "lucide-react";

interface BudgetLearningGuideProps {
  projectId?: number | string;
  version?: { number: number; id: number } | null;
  onNavigateTab?: (tabRoute: string) => void;
}

export default function BudgetLearningGuide({ projectId = "1", version, onNavigateTab }: BudgetLearningGuideProps) {
  const [activeGuideView, setActiveGuideView] = useState<"FLOWCHART" | "CRUD_FIELDS" | "ARCHITECTURE">("FLOWCHART");
  const [selectedPhase, setSelectedPhase] = useState<number>(1);
  const [activeCrudTab, setActiveCrudTab] = useState<"CREATE" | "READ" | "UPDATE" | "DELETE">("CREATE");
  const [fieldSearchQuery, setFieldSearchQuery] = useState("");

  const q = version ? `?v=${version.number}` : "";

  const lifecyclePhases = [
    {
      phaseNumber: 1,
      name: "Project Hierarchy & Physical Baseline",
      badge: "Prerequisite Foundation",
      icon: Settings2,
      color: "text-info-text",
      bgColor: "bg-info-soft",
      borderColor: "border-info-border",
      route: `/budget/${projectId}/setup${q}`,
      summary: "Set up the project boundary, tower breakdown, physical floor areas (BUA, Carpet, Saleable), and departmental cost heads.",
      whyToPerform: "Construction budgets cannot be calculated or certified without a verified physical baseline. Defining towers and precise Built-Up Area (BUA) establishes the denominator for every rate-per-sqft metric and contractual tender benchmark. Anchoring cost heads to departments enforces strict departmental RBAC: Civil, MEP, Facade, and Finance teams can only edit lines within their operational mandate.",
      nextImpact: "1. Automatically initializes Tower Workings cost sheets and area drivers.\n2. Activates live rate-per-sqft (₹/PSF) formulas across Summary and Detail reports.\n3. Unlocks the 'Rate × Area' line rule (ctc_rate × area).\n4. Sets up automatic tax calculations (GST heads track 18% of eligible base heads).\n⚠️ IF OMITTED: Costs cannot be split by tower, ₹/sqft rates cannot be calculated, and the Allocation Check will flag 100% of expenditure as unallocated.",
      steps: [
        {
          order: "1.1",
          entity: "Project Master Container (budget_projects)",
          action: "Configure Project Name, Code, Location & Land Area",
          fields: "name, code, location, land_area_sqft, base_currency",
          whyThisAction: "Provides the overarching root container for all revisions, RERA disclosures, and multi-version snapshots.",
          downstreamEffect: "Isolates project financial data from other developments and enables portfolio-level executive rollups."
        },
        {
          order: "1.2",
          entity: "Towers & Wings (budget_towers)",
          action: "Add Towers & Physical Buildings (e.g. Tower 1, Tower 2, Retail/Podium, Clubhouse)",
          fields: "name, sort_order, rera_tower_id",
          whyThisAction: "Real estate construction and contractor contracts are awarded and executed building-by-building.",
          downstreamEffect: "Creates individual columns in the Tower Workings sheet and enables per-tower contractor billing certifications."
        },
        {
          order: "1.3",
          entity: "Physical Area Drivers (budget_tower_areas)",
          action: "Input Construction BUA, Design Area, Carpet Area, and Saleable Area per Tower",
          fields: "construction_bua_sqft, design_area_sqft, carpet_area_sqft, saleable_area_sqft",
          whyThisAction: "Physical areas drive statutory RERA compliance, contractor BOQ measurements, and executive PSF benchmarks.",
          downstreamEffect: "Enables 'Rate × Area' budget line rules and updates live PSF calculations in all Excel exports."
        },
        {
          order: "1.4",
          entity: "Departmental Cost Heads (budget_cost_heads)",
          action: "Define Standard Cost Heads (Sub-structure, Super-structure, Elevators, Finishing) Anchored to Departments",
          fields: "name, category, department_id, sort, code",
          whyThisAction: "Enforces departmental ownership so Civil engineers cannot modify MEP lines and vice-versa.",
          downstreamEffect: "Enforces server-side mutation restrictions and builds the hierarchical structure of Detail Budget reports."
        },
        {
          order: "1.5",
          entity: "Statutory Tax Heads (budget_cost_heads)",
          action: "Configure GST Heads Linked to Base Construction Heads",
          fields: "is_tax=true, tax_rate_percent (e.g. 18%), base_head_ids",
          whyThisAction: "Indian tax compliance requires isolating basic construction costs from statutory input tax credits.",
          downstreamEffect: "Automates GST calculation without manual entry and prevents double-counting tax in basic cost totals."
        }
      ]
    },
    {
      phaseNumber: 2,
      name: "Governance & Multi-Tier Sign-off Chain",
      badge: "Governance & Compliance Gate",
      icon: ShieldCheck,
      color: "text-warning-text",
      bgColor: "bg-warning-soft",
      borderColor: "border-warning-border",
      route: `/budget/${projectId}/setup${q}`,
      summary: "Configure the sequential digital approval chain (e.g. Level 1: QS / Estimator → Level 2: Commercial VP → Level 3: CFO / MD) to enforce separation of duties.",
      whyToPerform: "Real estate budgets represent hundreds of crores in financial commitments. Unilateral edits by a single user introduce extreme financial risk. Establishing an immutable sequential approval chain guarantees corporate governance, institutional auditability, and executive alignment before tenders are awarded.",
      nextImpact: "1. When the preparer clicks 'Submit for Approval', the draft immediately locks into a read-only state, preventing mid-review tampering.\n2. Pending sign-off alerts are dispatched to Tier 1 approvers.\n3. If rejected at any stage, a mandatory rejection reason is recorded and the draft unlocks back to the preparer.\n4. Upon final sign-off, the database creates an immutable approved baseline (e.g. Revision R1), stamps the digital signature block (Signer Name, Role, Timestamp), and populates the official Prepared by / Approved by blocks in exported Excel workbooks.\n⚠️ IF OMITTED: The project defaults to single-tier self-approval where the preparer approves their own figures without governance review.",
      steps: [
        {
          order: "2.1",
          entity: "Sequential Approval Levels (budget_signoff_levels)",
          action: "Define Ordered Approval Tiers (e.g. Level 1: QS, Level 2: VP Commercial, Level 3: CFO)",
          fields: "level_order, role_name, required_quorum (any 1 signs)",
          whyThisAction: "Guarantees that technical engineering review precedes senior executive commercial sign-off.",
          downstreamEffect: "Enforces strict execution sequence; Level 2 approvers cannot sign until Level 1 certifies the figures."
        },
        {
          order: "2.2",
          entity: "Authorized Signers Mapping (budget_signoff_levels)",
          action: "Map Qualified Chandak Workspace Users to Each Sign-off Tier",
          fields: "user_ids, department_scope, designation_title",
          whyThisAction: "Provides operational redundancy (any one authorized signer in the tier can sign) while restricting approval authority.",
          downstreamEffect: "Limits sign/reject triggers exclusively to assigned personnel on the active project."
        },
        {
          order: "2.3",
          entity: "Project-Specific Overrides (Optional)",
          action: "Define Custom Sign-off Thresholds for Joint Ventures or High-Value Projects",
          fields: "project_id, escalation_threshold_cr",
          whyThisAction: "Joint ventures or redevelopment projects often require external investor or partner sign-offs.",
          downstreamEffect: "Overrides global organizational sign-off chains with project-specific governance rules."
        }
      ]
    },
    {
      phaseNumber: 3,
      name: "Budget Formulation & Dynamic Line Rules",
      badge: "Baseline Formulation",
      icon: Layers,
      color: "text-primary",
      bgColor: "bg-accent-soft",
      borderColor: "border-border-active",
      route: `/budget/${projectId}/entry${q}`,
      summary: "Enter Estimated CTC for each line, assign dynamic formula rules, provide department remarks, and document OC date movements.",
      whyToPerform: "Construction costs are multi-dimensional; hardcoding static lumpsums fails when design specifications or carpet areas shift. Dynamic line rules allow costs to recalculate automatically when physical drawings evolve. Department remarks ensure context travels with figures, and mandatory OC move reasons ensure project schedule extensions are financially accounted for.",
      nextImpact: "1. Real-time recalculation of all department subtotals, tax heads, and total project CTC in Crores.\n2. Dynamic rules ensure when architectural BUA changes in the master, all Rate × Area lines update immediately without manual re-keying.\n3. Department remarks populate the Detail report and official Chandak Detail Excel export.\n4. If an Occupation Certificate (OC) date moves without a documented reason, the database trigger strictly blocks draft submission.\n⚠️ IF OMITTED: Budgets drift out of sync with site designs, schedule slippage carries no accountability, and management loses audit visibility into why costs changed.",
      steps: [
        {
          order: "3.1",
          entity: "Line CTC Baseline (budget_lines)",
          action: "Enter Estimated CTC for Straightforward Contractual Lines",
          fields: "ctc_paise, category_id, cost_head_id",
          whyThisAction: "Establishes initial baseline expenditure commitments for procurement.",
          downstreamEffect: "Feeds into department subtotals and version summary totals."
        },
        {
          order: "3.2",
          entity: "Dynamic Line Rules (budget_lines.ctc_basis)",
          action: "Assign Formula Rules: Rate × Area, Schedule, Balance of Total, or Memo Item",
          fields: "ctc_basis ('fixed' | 'rate' | 'schedule' | 'balance'), ctc_rate, is_memo",
          whyThisAction: "Eliminates manual math; links financial projections directly to physical design drivers.",
          downstreamEffect: "Rate × Area auto-multiplies ₹/sqft by tower BUA; Schedule locks CTC to detailed row workings; Balance calculates residual funds; Memo captures contingency outside totals."
        },
        {
          order: "3.3",
          entity: "Department Remarks (budget_department_remarks)",
          action: "Provide Contextual Explanations on Each Department Row",
          fields: "department_id, version_id, remark_text",
          whyThisAction: "Explains commercial assumptions, market inflation factors, or vendor quotation baselines.",
          downstreamEffect: "Printed in the executive recap section of the Chandak Detail Excel workbook."
        },
        {
          order: "3.4",
          entity: "OC Dates & Schedule Movement (budget_versions.oc_reasons)",
          action: "Review Tower OC Dates Against Prior Versions; Supply Mandatory Reason if Date Shifted",
          fields: "tower_id, target_oc_date, movement_reason",
          whyThisAction: "Site handover delays increase overhead costs, carrying interest (IDC), and contractor escalation claims.",
          downstreamEffect: "Database enforces validation; reason is published in executive board summaries and Excel exports."
        }
      ]
    },
    {
      phaseNumber: 4,
      name: "Supporting Cost Schedules",
      badge: "Detailed Working Schedules",
      icon: FileText,
      color: "text-info-text",
      bgColor: "bg-info-soft",
      borderColor: "border-info-border",
      route: `/budget/${projectId}/schedules${q}`,
      summary: "Break down complex non-linear budget lines into multi-variable quantity × rate × percentage × periods schedules.",
      whyToPerform: "Major construction budget lines (e.g. Tenant Rent Compensation, Municipal Liaisoning Sanctions, Stamp Duty, Dewatering Plant Rentals) cannot be justified with a single lumpsum number. Auditors, lenders, and JV partners demand full unit-economic transparency.",
      nextImpact: "1. The line's Estimated CTC in Budget Entry is permanently locked to the schedule's calculated sum (Quantity × Rate × % × Periods) and cannot be typed arbitrarily.\n2. Summary report rows display an interactive direct link to the underlying schedule workings.\n3. Exported Excel workbooks automatically generate dedicated sheets for each schedule with live formulas linked back to the Summary sheet.\n4. Schedules automatically carry forward into new version drafts (R1 → R2).\n⚠️ IF OMITTED: Complex multi-variable costs must be computed in offline personal spreadsheets, leading to lost formulas, human errors, and lack of team visibility.",
      steps: [
        {
          order: "4.1",
          entity: "Schedule Attachment (budget_schedules)",
          action: "In Budget Entry, Change Line Rule to 'Worked out in a schedule' and Set Title",
          fields: "line_id, version_id, title, note",
          whyThisAction: "Converts the line from a manual number to an automated formula aggregate.",
          downstreamEffect: "Locks the line's CTC input field and creates a corresponding schedule record."
        },
        {
          order: "4.2",
          entity: "Itemized Working Rows (budget_schedule_rows)",
          action: "Add Calculation Rows with Item, Quantity, Rate (₹), Percentage (%), and Periods (months)",
          fields: "item_name, quantity, rate_paise, percent, periods, remark",
          whyThisAction: "Captures multi-dimensional contract variables (e.g. 50 tenants × ₹45,000/mo × 100% × 24 months).",
          downstreamEffect: "Auto-computes row amount using Quantity × Rate × (% ÷ 100) × Periods or fixed override."
        },
        {
          order: "4.3",
          entity: "Live Line Sync (budget_schedule_figures)",
          action: "Verify Schedule Sum Matches Target Line Budget",
          fields: "schedule_total_paise -> budget_lines.ctc_paise",
          whyThisAction: "Verifies that the calculated sum reflects the true contractual commitment.",
          downstreamEffect: "Automatically updates the budget line's CTC in real time across all reports and database views."
        }
      ]
    },
    {
      phaseNumber: 5,
      name: "Tower Workings & Certifications",
      badge: "Site & Tower Cost Control",
      icon: Building2,
      color: "text-success-text",
      bgColor: "bg-success-soft",
      borderColor: "border-success-border",
      route: `/budget/${projectId}/workings${q}`,
      summary: "Monitor per-tower construction cost sheets, record billing certified amounts, and verify full cost head allocation across buildings.",
      whyToPerform: "High-rise developments are phased and financed building-by-building. General civil contractors submit bills per tower. Management must track physical work certified on site against contractual commitments to prevent contractor over-billing and detect building-specific cost overruns early.",
      nextImpact: "1. Computes live 'Balance to Certify' metrics per line and per tower.\n2. The Allocation Check verifies that every rupee budgeted is properly mapped to a physical tower, highlighting unallocated balances.\n3. Generates the built-in 'Diff' check row (Tower allocations + Unallocated must equal Detail Budget total).\n4. Exports per-tower construction cost sheets for bank escrow withdrawals and RERA compliance filings.\n⚠️ IF OMITTED: Management cannot determine which specific tower is driving cost escalation, risking fund exhaustion before topping out.",
      steps: [
        {
          order: "5.1",
          entity: "Per-Tower Cost Sheet (budget_tower_workings)",
          action: "Select Tower to View Its Split Lines, Allocated Amounts, and ₹/sqft Rates",
          fields: "tower_id, version_id, construction_bua_sqft, rate_psf",
          whyThisAction: "Provides site project managers with a building-specific financial cockpit.",
          downstreamEffect: "Calculates tower ₹/sqft by dividing cost by tower construction BUA."
        },
        {
          order: "5.2",
          entity: "Contractor Certified Amounts (budget_lines.certified_paise)",
          action: "Input Cumulative Billing Amounts Certified by Billing Engineers",
          fields: "certified_paise, balance_to_certify_paise",
          whyThisAction: "Distinguishes contracted budget from actual verified physical construction work completed on site.",
          downstreamEffect: "Computes Balance to Certify = Estimated CTC - Certified Amount."
        },
        {
          order: "5.3",
          entity: "Tower Allocation Reconciliation (budget_allocation_check)",
          action: "Inspect Allocation Check Matrix for Unallocated Cost Heads",
          fields: "tower_splits, not_allocated_paise, diff_check",
          whyThisAction: "Ensures overheads, common podiums, and shared MEP plants are correctly distributed.",
          downstreamEffect: "Guarantees that tower totals plus unallocated amounts balance to zero against the Detail report."
        }
      ]
    },
    {
      phaseNumber: 6,
      name: "Cost Incurred & Vendor Bills Ledger",
      badge: "Actuals & Vendor Invoicing",
      icon: CheckCircle2,
      color: "text-primary",
      bgColor: "bg-accent-soft",
      borderColor: "border-border-active",
      route: `/budget/${projectId}/incurred${q}`,
      summary: "Record vendor bills (Vendor, Bill #, Date, PO, Basic, GST) split across cost heads and towers; manage direct payment vouchers.",
      whyToPerform: "Budgets are living financial documents that must be measured against actual money spent. Recording vendor bills directly into the system replaces disconnected spreadsheets with an immutable audit trail. Strict unique constraints on Vendor + Bill Number prevent catastrophic duplicate invoice payments.",
      nextImpact: "1. Actual costs immediately flow into the Detail Report, Summary Report, Overview KPIs, and Periodic (Monthly/Quarterly) actuals.\n2. Variance (CTC - Incurred) and Budget Utilised % update in real time across the entire platform.\n3. 1-Click Drill-Down: In the Detail Report, clicking any line's Cost Incurred amount immediately opens the exact vendor bills and vouchers behind that number.\n4. Downloadable Bills Register and Splits Excel sheets for financial accounting audits.\n⚠️ IF OMITTED: Cost incurred figures must be manually typed or estimated, leaving the company blind to cost overruns until annual audits.",
      steps: [
        {
          order: "6.1",
          entity: "Vendor Invoice Registration (budget_bills)",
          action: "Record Bill with Vendor, Bill Number, Date, PO Reference, and GST Amount",
          fields: "vendor_name, bill_number, bill_date, work_order_ref, gst_paise",
          whyThisAction: "Anchors site expenditures to legal tax invoices and contractual purchase orders.",
          downstreamEffect: "Database enforces unique vendor bill constraint; logs bill in the project register."
        },
        {
          order: "6.2",
          entity: "Multi-Head & Tower Split Allocation (budget_incurred_entries)",
          action: "Split Basic Bill Amount Across Relevant Cost Heads and Towers",
          fields: "bill_id, cost_head_id, tower_id, basic_paise, as_on_month",
          whyThisAction: "A single contractor bill (e.g. Ready-Mix Concrete) may supply Tower A, Tower B, and the Podium simultaneously.",
          downstreamEffect: "Allocates costs to the exact line items, driving accurate building-level actuals."
        },
        {
          order: "6.3",
          entity: "Direct Vouchers & Excel Import (budget_incurred_entries)",
          action: "Record Petty Cash Entries or Import Bulk SAP/ERP Voucher Sheets",
          fields: "voucher_no, narration, amount_paise, head_id",
          whyThisAction: "Handles non-bill cost entries (e.g. municipal statutory fees, internal staff overheads).",
          downstreamEffect: "Automatically rolls into the project cost incurred ledger."
        },
        {
          order: "6.4",
          entity: "Bill Maintenance (budget_update_bill)",
          action: "Click Any Bill to Review Splits, Edit Details, or Delete Erroneous Submissions",
          fields: "edit_bill_action, delete_bill_action, audit_trail",
          whyThisAction: "Ensures accounting errors can be corrected while preserving strict RBAC (only users with permissions for all split departments can delete a multi-department bill).",
          downstreamEffect: "Automatically recalculates all downstream version totals and period breakdowns."
        }
      ]
    },
    {
      phaseNumber: 7,
      name: "Revisioning, Variance & Executive Reports",
      badge: "Executive Analytics & Revisioning",
      icon: LineChart,
      color: "text-warning-text",
      bgColor: "bg-warning-soft",
      borderColor: "border-warning-border",
      route: `/budget/${projectId}/overview${q}`,
      summary: "Monitor automated risk alerts, generate AI-verified management briefs, analyze revision variances (R1 vs R2), and download official Chandak Excel workbooks.",
      whyToPerform: "Executive leadership and Board Members require executive-level clarity to make strategic capital allocation decisions. When market inflation or design iterations occur, creating new revisions establishes transparent accountability without erasing the original tender baseline.",
      nextImpact: "1. Automated Risk Alerts flag lines exceeding 90% or 100% of CTC, lines more than 10% (and ₹1 Cr) above initial budget, and lines where balance runs out before the OC date.\n2. AI-Verified Executive Summary generates a board-level briefing where every number is mathematically validated against database figures to prevent hallucination.\n3. Compare Versions produces line-by-line delta comparisons between initial budget, previous revisions, and current forecast.\n4. Official Chandak Excel Exports generates official Chandak Budget Summary Format.xlsx and Chandak Detail Budget Format.xlsx with exact corporate styling, live formulas, and digital signature blocks.\n⚠️ IF OMITTED: Executive leadership receives static, unverified reports with no audit trail of who approved variances or why project costs escalated.",
      steps: [
        {
          order: "7.1",
          entity: "Executive Cockpit & Risk Alerts (budget_version_totals)",
          action: "Review Committed CTC, Incurred Cost, Utilised %, and Automated Threshold Alerts",
          fields: "ctc_cr, incurred_cr, balance_cr, alert_flags",
          whyThisAction: "Delivers instant high-altitude situational awareness to senior directors.",
          downstreamEffect: "Identifies high-risk cost heads requiring value engineering before funds are committed."
        },
        {
          order: "7.2",
          entity: "AI Mathematical Executive Briefing (budget_summary_notes)",
          action: "Generate AI-Assisted Management Summary Note",
          fields: "note_text, variance_summary, critical_milestones",
          whyThisAction: "Synthesizes hundreds of line items into a concise executive narrative in seconds.",
          downstreamEffect: "Server mathematically validates every figure against live database views; injects verified note into Summary Excel export."
        },
        {
          order: "7.3",
          entity: "Multi-Revision Versioning (budget_create_version)",
          action: "Create New Revision Draft (R1 -> R2) when Project Parameters Change",
          fields: "version_number, as_on_date, clone_previous_version",
          whyThisAction: "Freezes approved historical baselines (e.g. R1) and opens a new mutable draft (R2) carrying forward all heads, rules, and schedules.",
          downstreamEffect: "Establishes full variance tracking between initial budget, previous approved version, and revised estimate."
        },
        {
          order: "7.4",
          entity: "Version Delta & Variance Analytics (budget_version_variance)",
          action: "Use Compare Versions to Inspect Line-by-Line Changes",
          fields: "base_version_number, compare_version_number, absolute_delta_cr, percent_delta",
          whyThisAction: "Pinpoints exactly which cost heads increased or decreased between revision milestones.",
          downstreamEffect: "Displays positive/negative variance bars and percentage changes."
        },
        {
          order: "7.5",
          entity: "Institutional Excel Workbook Generation",
          action: "Download Official Chandak Budget Summary and Detail Workbooks",
          fields: "format: 'summary' | 'detail', live_formulas: true, prepared_approved_block: true",
          whyThisAction: "Provides official signed documents for Board meetings, RERA escrow submissions, and consortium banks.",
          downstreamEffect: "Outputs live Excel formulas (SUM, Balance, Variance, PSF, Net Carpet Area) with digital sign-off blocks."
        }
      ]
    }
  ];

  const crudSpecs = {
    CREATE: {
      title: "Create Operations (New Budgets, Lines, Schedules & Bills)",
      overview: "Initialize new projects, baseline versions, cost heads, schedule rows, or vendor bills.",
      navigationPath: "Budget Home > '+ New Project' OR Budget Entry > 'Add Line' OR Cost Incurred > 'Record a Bill'",
      whoCanPerform: ["SUPER_ADMIN", "BUDGET_ADMIN", "BUDGET_EDITOR (Department-Scoped)", "PREPARER"],
      requiredInputs: [
        "Project: Name, Code, Location, Land Area",
        "Version: Project ID, Revision Number (e.g. R1), As-on Date",
        "Cost Head: Category Name, Department ID, Code, Tax Status",
        "Vendor Bill: Vendor Name, Bill Number, Date, Basic Amount, Cost Head Splits"
      ],
      systemMutations: [
        "Inserts row into corresponding budget_ table (e.g. budget_projects, budget_lines, budget_bills).",
        "Initializes budget_version_totals view recalculation.",
        "Generates initial audit history record.",
        "Applies unique constraint validation on (project_id, vendor_name, bill_number)."
      ],
      safetyAndCascadeRules: "Duplicate project codes or duplicate vendor bills within a project are rejected. Budget lines cannot be added to an already approved version."
    },
    READ: {
      title: "Read & Analytical Views (Summary, Detail & Drill-Down)",
      overview: "View real-time portfolio dashboards, detail expenditure ledgers, tower workings, and audit histories.",
      navigationPath: "Budget Navigation > Overview / Summary Report / Detail Report / Tower Workings",
      whoCanPerform: ["ALL Authenticated Users with Budget Read Scope (Admin, Editor, Reviewer, Viewer)"],
      requiredInputs: ["Filter: Project ID", "Filter: Version Number (defaults to latest approved / draft)"],
      systemMutations: [
        "Executes high-performance calculation views (budget_version_totals, budget_tower_workings, budget_allocation_check).",
        "Hydrates department remarks and dynamic line rules.",
        "Evaluates live ₹/sqft rates based on tower construction BUA."
      ],
      safetyAndCascadeRules: "Users with restricted department scopes only view lines and remarks belonging to their assigned departments."
    },
    UPDATE: {
      title: "Update Operations (Line Drivers, Remarks & Sign-offs)",
      overview: "Modify line estimated CTC, update dynamic formula rules, adjust schedule rows, or advance sign-off tiers.",
      navigationPath: "Budget Entry > Edit CTC / Source Rule OR Towers & Set-up > Sign-off Action",
      whoCanPerform: ["BUDGET_ADMIN", "ASSIGNED_SIGNER (for active level)", "DEPARTMENT_EDITOR (Draft only)"],
      requiredInputs: ["New Estimated CTC / Rule parameters", "Sign-off Decision (Approve / Reject)", "Mandatory Rejection / OC Movement Reason"],
      systemMutations: [
        "Updates line ctc_paise and triggers cascade calculation in budget_version_totals.",
        "If sign-off submitted, sets status to 'submitted' and locks mutations.",
        "If rejected, records rejection reason and resets draft state.",
        "If final tier signs, flags version as 'approved' and stamps digital signature block."
      ],
      safetyAndCascadeRules: "Approved versions cannot be edited under any circumstance. To make adjustments, users must spawn a new revision draft (R2)."
    },
    DELETE: {
      title: "Delete Operations (Cleanups & Cancellations)",
      overview: "Remove accidental cost heads, unallocated towers, schedule rows, or erroneous vendor bills.",
      navigationPath: "Towers & Set-up > Delete Tower/Head OR Cost Incurred > Bill Actions > Delete",
      whoCanPerform: ["SUPER_ADMIN", "BUDGET_ADMIN", "DEPARTMENT_EDITOR (only if user has scope on ALL split departments)"],
      requiredInputs: ["Entity ID", "Confirmation Challenge"],
      systemMutations: [
        "Calls safe deletion functions: budget_delete_tower, budget_delete_head, or budget_delete_bill.",
        "Cascade cleanses split entries in budget_incurred_entries.",
        "Recalculates version totals."
      ],
      safetyAndCascadeRules: "DELETION REFUSED IF: (1) Tower carries figures in an approved version, (2) Cost head has recorded cost incurred, (3) Cost head has tax heads calculating on it."
    }
  };

  const fieldsDictionary = [
    { name: "Project ID", dbColumn: "project_id", type: "Integer (FK)", isRequired: true, description: "Foreign key anchoring the entity to its project container.", purpose: "Multi-tenant project boundary.", fk: "budget_projects.id" },
    { name: "Revision Number", dbColumn: "number", type: "Integer", isRequired: true, description: "Sequential version tag (1 for R1, 2 for R2, etc.).", purpose: "Version control and baseline comparison.", fk: "-" },
    { name: "Estimated CTC (Paise)", dbColumn: "ctc_paise", type: "BigInt", isRequired: true, description: "Total Cost to Complete in Indian Paise (divide by 10^7 for Crores).", purpose: "Primary budgetary commitment figure.", fk: "-" },
    { name: "Cost Basis Rule", dbColumn: "ctc_basis", type: "Text Enum", isRequired: true, description: "'fixed' (manual), 'rate' (rate × area), 'schedule' (multi-row), 'balance'.", purpose: "Determines how the line CTC is calculated.", fk: "-" },
    { name: "CTC Rate (₹/sqft)", dbColumn: "ctc_rate", type: "Numeric", isRequired: false, description: "Per-square-foot construction rate.", purpose: "Multiplier for physical area drivers.", fk: "-" },
    { name: "Balance of Paise", dbColumn: "balance_of_paise", type: "BigInt", isRequired: false, description: "Category budget cap from which sibling lines are subtracted.", purpose: "Balancing line calculation.", fk: "-" },
    { name: "Memo Item Flag", dbColumn: "is_memo", type: "Boolean", isRequired: true, description: "Flag indicating whether line is informational only.", purpose: "Excludes line from totals while preserving visibility.", fk: "-" },
    { name: "Certified (Paise)", dbColumn: "certified_paise", type: "BigInt", isRequired: false, description: "Cumulative billing certified by site billing engineers.", purpose: "Computes balance to certify.", fk: "-" },
    { name: "Bill ID", dbColumn: "bill_id", type: "Integer (FK)", isRequired: false, description: "Link to vendor bill from which incurred cost originates.", purpose: "1-click drill-down from Detail report to vendor invoice.", fk: "budget_bills.id" },
    { name: "Construction BUA (sqft)", dbColumn: "construction_bua_sqft", type: "Numeric", isRequired: true, description: "Physical Built-Up Area of the tower.", purpose: "Denominator for ₹/sqft rates.", fk: "-" },
    { name: "Sign-off Level ID", dbColumn: "level_id", type: "Integer (FK)", isRequired: true, description: "Current tier in the sequential sign-off approval chain.", purpose: "Governance tracking and signature stamping.", fk: "budget_signoff_levels.id" },
    { name: "Department ID", dbColumn: "department_id", type: "Integer (FK)", isRequired: true, description: "Department owning this cost head (Civil, MEP, Sales, etc.).", purpose: "Strict departmental RBAC enforcement.", fk: "departments.id" }
  ];

  const filteredFields = fieldsDictionary.filter(f => {
    if (!fieldSearchQuery) return true;
    const q = fieldSearchQuery.toLowerCase();
    return (
      f.name.toLowerCase().includes(q) ||
      f.dbColumn.toLowerCase().includes(q) ||
      f.description.toLowerCase().includes(q) ||
      f.purpose.toLowerCase().includes(q) ||
      f.fk.toLowerCase().includes(q)
    );
  });

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="bg-surface rounded-lg p-6 border border-border shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider">
              <BookOpen className="h-4 w-4" />
              <span>Organization Budget & Cost Control Playbook</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-semibold text-foreground">
              End-to-end lifecycle, transaction sequences, why to do each step & next impact
            </h2>
            <p className="text-sm text-muted-foreground max-w-3xl">
              Master the entire Organization Budget module: from master hierarchy and multi-tier sign-offs to dynamic line rules, tower workings, supporting schedules, and vendor bill ledgers.
            </p>
          </div>

          {/* Quick Guide Tab Switcher */}
          <div className="flex items-center gap-1.5 bg-muted/60 p-1.5 rounded-lg border border-border shrink-0 self-start lg:self-center">
            <button
              type="button"
              onClick={() => setActiveGuideView("FLOWCHART")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeGuideView === "FLOWCHART"
                  ? "bg-surface text-foreground shadow-sm border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Workflow className="h-3.5 w-3.5 text-primary" />
              <span>Process flowchart</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveGuideView("CRUD_FIELDS")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeGuideView === "CRUD_FIELDS"
                  ? "bg-surface text-foreground shadow-sm border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Database className="h-3.5 w-3.5 text-primary" />
              <span>CRUD & field dictionary</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveGuideView("ARCHITECTURE")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeGuideView === "ARCHITECTURE"
                  ? "bg-surface text-foreground shadow-sm border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <GitFork className="h-3.5 w-3.5 text-primary" />
              <span>Ecosystem impact</span>
            </button>
          </div>
        </div>
      </div>

      {/* VIEW 1: PROCESS FLOWCHART & STEP-BY-STEP SEQUENCE */}
      {activeGuideView === "FLOWCHART" && (
        <div className="space-y-6">
          {/* Phase Stepper Navigation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2.5">
            {lifecyclePhases.map((phase) => {
              const Icon = phase.icon;
              const isSelected = selectedPhase === phase.phaseNumber;
              return (
                <button
                  key={phase.phaseNumber}
                  type="button"
                  onClick={() => setSelectedPhase(phase.phaseNumber)}
                  className={`text-left p-3.5 rounded-lg border transition-all cursor-pointer flex flex-col justify-between space-y-2.5 ${
                    isSelected
                      ? `bg-surface border-primary shadow-sm ring-2 ring-primary/20`
                      : "bg-surface/60 hover:bg-surface border-border hover:border-border"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${phase.bgColor} ${phase.color} border ${phase.borderColor}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                      P{phase.phaseNumber}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-xs text-foreground leading-snug line-clamp-1">{phase.name}</h3>
                    <p className="text-[10.5px] text-muted-foreground mt-0.5 truncate">{phase.badge}</p>
                  </div>
                  {isSelected && (
                    <div className="flex items-center gap-1 text-[10.5px] font-semibold text-primary pt-1 border-t border-border">
                      <span>Active</span>
                      <ChevronRight className="h-3 w-3" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Detailed Selected Phase Card */}
          {(() => {
            const activePhase = lifecyclePhases.find(p => p.phaseNumber === selectedPhase) || lifecyclePhases[0];
            const Icon = activePhase.icon;
            return (
              <div className="bg-surface rounded-lg border border-border p-6 shadow-sm space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
                  <div className="flex items-center gap-3">
                    <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${activePhase.bgColor} ${activePhase.color} border ${activePhase.borderColor} shrink-0`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Phase {activePhase.phaseNumber} of 7
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-muted text-foreground border border-border">
                          {activePhase.badge}
                        </span>
                      </div>
                      <h3 className="text-lg sm:text-xl font-semibold text-foreground mt-0.5">
                        {activePhase.name}
                      </h3>
                    </div>
                  </div>

                  <Link
                    href={activePhase.route}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-xs font-semibold hover:opacity-90 transition-opacity shadow-sm self-start md:self-center"
                  >
                    <span>Open live screen</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </div>

                {/* 2-Column Callout: Executive Overview vs Why This Is Done */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-muted/40 border border-border space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                      <Sparkles className="h-3.5 w-3.5 text-warning-text" />
                      <span>Executive Overview</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {activePhase.summary}
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-accent-soft border border-border-active space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      <span>Why This Is Done (Business Purpose & Risk Mitigation)</span>
                    </div>
                    <p className="text-xs text-foreground/90 leading-relaxed">
                      {activePhase.whyToPerform}
                    </p>
                  </div>
                </div>

                {/* Highlighted Banner: NEXT IMPACT & DOWNSTREAM CONSEQUENCES */}
                <div className="p-4 rounded-lg bg-success-soft/50 border border-success-border space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-success-text">
                    <ArrowRight className="h-3.5 w-3.5" />
                    <span>Next Impact & Downstream System Consequences</span>
                  </div>
                  <div className="text-xs text-foreground leading-relaxed whitespace-pre-line font-normal">
                    {activePhase.nextImpact}
                  </div>
                </div>

                {/* Sequence Steps Table */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <Workflow className="h-3.5 w-3.5 text-primary" />
                    <span>Sequential Steps, Why to Do Them & Downstream Effects</span>
                  </h4>

                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-muted/60 border-b border-border text-muted-foreground font-semibold">
                          <th className="py-2.5 px-3 w-16">Seq #</th>
                          <th className="py-2.5 px-3 w-48">Entity / Table</th>
                          <th className="py-2.5 px-3 w-60">Action & Inputs</th>
                          <th className="py-2.5 px-3 w-64">Key Fields Captured</th>
                          <th className="py-2.5 px-3 w-72">Why to Do This</th>
                          <th className="py-2.5 px-3">Next Impact</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {activePhase.steps.map((step) => (
                          <tr key={step.order} className="hover:bg-surface/80 transition-colors">
                            <td className="py-3 px-3 font-mono font-semibold text-primary">
                              {step.order}
                            </td>
                            <td className="py-3 px-3 font-semibold text-foreground">
                              {step.entity}
                            </td>
                            <td className="py-3 px-3 text-muted-foreground">
                              {step.action}
                            </td>
                            <td className="py-3 px-3 font-mono text-[11px] text-muted-foreground">
                              {step.fields}
                            </td>
                            <td className="py-3 px-3 text-foreground/90 font-medium">
                              {step.whyThisAction}
                            </td>
                            <td className="py-3 px-3 text-primary font-medium">
                              {step.downstreamEffect}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* VIEW 2: CRUD OPERATIONS & FIELD DICTIONARY */}
      {activeGuideView === "CRUD_FIELDS" && (
        <div className="space-y-6">
          {/* CRUD Operational Specifications */}
          <div className="bg-surface rounded-lg border border-border p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="text-base font-semibold text-foreground">CRUD Matrix & State Mutation Rules</h3>
                <p className="text-xs text-muted-foreground">System mutations, cascade rules, and role authorization for every operational action.</p>
              </div>

              {/* CRUD Tabs */}
              <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border">
                {(["CREATE", "READ", "UPDATE", "DELETE"] as const).map((op) => (
                  <button
                    key={op}
                    type="button"
                    onClick={() => setActiveCrudTab(op)}
                    className={`px-3 py-1 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
                      activeCrudTab === op
                        ? "bg-surface text-foreground shadow-sm border border-border"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {op}
                  </button>
                ))}
              </div>
            </div>

            {(() => {
              const spec = crudSpecs[activeCrudTab];
              return (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-muted/40 border border-border">
                    <h4 className="font-semibold text-sm text-foreground mb-1">{spec.title}</h4>
                    <p className="text-xs text-muted-foreground">{spec.overview}</p>
                    <div className="mt-3 flex items-center gap-2 text-xs">
                      <span className="font-semibold text-foreground">Navigation Path:</span>
                      <code className="px-2 py-0.5 rounded bg-surface border border-border font-mono text-[11px] text-primary">{spec.navigationPath}</code>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg border border-border space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                        <ShieldCheck className="h-4 w-4" />
                        <span>Who Can Perform (RBAC Matrix)</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {spec.whoCanPerform.map((r, i) => (
                          <span key={i} className="px-2 py-0.5 rounded bg-muted text-[11px] font-mono text-foreground border border-border">{r}</span>
                        ))}
                      </div>
                    </div>

                    <div className="p-4 rounded-lg border border-border space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-warning-text">
                        <Lock className="h-4 w-4" />
                        <span>Safety & Cascade Rules</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{spec.safetyAndCascadeRules}</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg border border-border space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                      <Database className="h-4 w-4 text-primary" />
                      <span>Database Mutations & Automated Triggers</span>
                    </div>
                    <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
                      {spec.systemMutations.map((m, i) => (
                        <li key={i}>{m}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Searchable Fields Dictionary */}
          <div className="bg-surface rounded-lg border border-border p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-foreground">Budget Schema & Field Dictionary</h3>
                <p className="text-xs text-muted-foreground">Every PostgreSQL column, constraint, purpose, and relationship in the budget module.</p>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search field, column, purpose..."
                  value={fieldSearchQuery}
                  onChange={(e) => setFieldSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/60 border-b border-border text-muted-foreground font-semibold">
                    <th className="py-2.5 px-3">Field Name</th>
                    <th className="py-2.5 px-3">DB Column</th>
                    <th className="py-2.5 px-3">Data Type</th>
                    <th className="py-2.5 px-3">Required?</th>
                    <th className="py-2.5 px-3">Description & Context</th>
                    <th className="py-2.5 px-3">Purpose & Calculation</th>
                    <th className="py-2.5 px-3">Foreign Key Relation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredFields.map((f, i) => (
                    <tr key={i} className="hover:bg-surface/80 transition-colors">
                      <td className="py-3 px-3 font-semibold text-foreground">{f.name}</td>
                      <td className="py-3 px-3 font-mono text-[11px] text-primary">{f.dbColumn}</td>
                      <td className="py-3 px-3 font-mono text-[11px] text-muted-foreground">{f.type}</td>
                      <td className="py-3 px-3">
                        {f.isRequired ? (
                          <span className="px-1.5 py-0.5 rounded bg-warning-soft text-warning-text font-semibold text-[10px]">Required</span>
                        ) : (
                          <span className="text-muted-foreground text-[10px]">Optional</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-muted-foreground">{f.description}</td>
                      <td className="py-3 px-3 text-foreground font-medium">{f.purpose}</td>
                      <td className="py-3 px-3 font-mono text-[11px] text-muted-foreground">{f.fk}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: ARCHITECTURE & ECOSYSTEM DEPENDENCY GRAPH */}
      {activeGuideView === "ARCHITECTURE" && (
        <div className="bg-surface rounded-lg border border-border p-6 shadow-sm space-y-6">
          <div className="border-b border-border pb-4">
            <h3 className="text-base font-semibold text-foreground">Cross-Module Architecture & Downstream Ripple Impact</h3>
            <p className="text-xs text-muted-foreground">How Organization Budget interacts with IAM, Workspaces, Design CAD Tracking, Tasks, and statutory reporting.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border border-border space-y-2 bg-muted/20">
              <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                <ShieldCheck className="h-4 w-4" />
                <span>IAM & Security Governance ➔ Organization Budget</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong>Data Transferred:</strong> User Credentials, Role Codes (BUDGET_ADMIN, EDITOR, REVIEWER), Department Scopes.<br />
                <strong>Impact on Source Change:</strong> Deactivating a user or modifying their department role instantly blocks them from submitting drafts, recording bills, or modifying department line items.<br />
                <strong>Impact on Budget:</strong> Budget server actions strictly enforce departmental RLS and sign-off level quorum.
              </p>
            </div>

            <div className="p-4 rounded-lg border border-border space-y-2 bg-muted/20">
              <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                <Building2 className="h-4 w-4" />
                <span>Design Tracking ➔ Organization Budget</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong>Data Transferred:</strong> Tower Configurations, Floor Counts, Architectural Built-Up Areas (BUA), RERA carpet area updates.<br />
                <strong>Impact on Source Change:</strong> When architects revise drawing revisions or update BUA in Design Tracking, rate-per-sqft drivers immediately flag area adjustments.<br />
                <strong>Impact on Budget:</strong> 'Rate × Area' lines dynamically recalculate their CTC in open drafts.
              </p>
            </div>

            <div className="p-4 rounded-lg border border-border space-y-2 bg-muted/20">
              <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                <Workflow className="h-4 w-4" />
                <span>Organization Budget ➔ Task & Ticket Management</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong>Data Transferred:</strong> Cost Overrun Alerts (&gt;90% CTC, &gt;10% initial baseline delta), Sign-off Escalations.<br />
                <strong>Impact on Source Change:</strong> Critical budget variances automatically generate high-priority escalation tickets for commercial directors.<br />
                <strong>Impact on Task:</strong> Task tickets carry direct back-links to the budget line ID (/budget/[pid]/line?v=...&id=...).
              </p>
            </div>

            <div className="p-4 rounded-lg border border-border space-y-2 bg-muted/20">
              <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                <FileSpreadsheet className="h-4 w-4" />
                <span>Organization Budget ➔ Institutional Reporting & Escrow</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong>Data Transferred:</strong> Approved Baselines (R1/R2), Certified Amounts, Vendor Billing Registers.<br />
                <strong>Impact on Source Change:</strong> Final sign-off seals the version with digital signature blocks and exports verified Excel workbooks.<br />
                <strong>Impact on Escrow:</strong> Generates RERA and consortium bank expenditure certificates directly from audited bill splits.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

