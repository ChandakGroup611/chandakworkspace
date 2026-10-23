/**
 * Chandak AI Copilot — Groundings: Design Tracking
 * Grounded in Design & Tender Tracking procedures, GFC drawing governance, and RFI matrices.
 */

export interface DesignConceptDefinition {
  concept: string;
  definition: string;
  applicableRoles: string[];
  rules: string[];
  sourceDocument: string;
}

export const DESIGN_CONCEPTS: Record<string, DesignConceptDefinition> = {
  "GFC": {
    concept: "Good For Construction (GFC)",
    definition: "Drawings and engineering specifications that have undergone complete multi-disciplinary coordination, statutory clearance, and final design lead approval, certified for physical execution on the jobsite.",
    applicableRoles: ["DESIGN_DIRECTOR", "DESIGN_HEAD", "SUPER_ADMIN"],
    rules: [
      "Only users with explicit 'can_drawings_approve_gfc' permission may issue GFC stamps.",
      "A drawing cannot be stamped GFC if related structural or MEP RFIs remain unresolved.",
      "Site execution teams are contractually forbidden from executing against non-GFC drawings (Tender/For Review)."
    ],
    sourceDocument: "Design Quality Assurance Manual § 4.1 (GFC Drawing Release Standard)"
  },
  "TRANSMITTAL": {
    concept: "Transmittal",
    definition: "An official recorded document transfer manifest detailing drawings, calculation sheets, and specifications transferred between Chandak Design Team, external consultants, and site contractors.",
    applicableRoles: ["DESIGN_COORDINATOR", "DESIGN_MANAGER", "SUPER_ADMIN"],
    rules: [
      "Every drawing batch leaving the design office must be accompanied by an auto-numbered Transmittal.",
      "The transmittal must declare the Purpose of Issue: For Information, For Review & Comment, or For Construction.",
      "Recipient acknowledgement receipts must be archived in the system."
    ],
    sourceDocument: "Design Document Control Standard Operating Procedure § 2.3"
  },
  "RFI": {
    concept: "Request For Information (RFI)",
    definition: "A formal communication instrument used by site execution teams, contractors, or project managers to seek clarification or resolution regarding drawing discrepancies, site conditions, or engineering details from design consultants.",
    applicableRoles: ["ALL_DESIGN_USERS", "PROJECT_COORDINATOR"],
    rules: [
      "All RFIs must be logged with a unique tracking number, discipline category, and required-by date.",
      "RFIs impacting critical path items or structural changes require Consultant Partner response within 5 working days.",
      "Closure of an RFI may necessitate a subsequent Drawing Revision."
    ],
    sourceDocument: "Site Coordination & Technical Query Procedure § 3"
  },
  "DRAWING_REVISION": {
    concept: "Drawing Revision",
    definition: "The sequential lifecycle iteration of an architectural or engineering drawing (e.g. R0, R1, R2, R3) recording progressive design changes, consultant updates, or site condition adaptations.",
    applicableRoles: ["DESIGN_COORDINATOR", "DESIGN_CONSULTANT"],
    rules: [
      "Each revision must specify a Revision Date, Change Description, and Revised By identifier.",
      "Older revisions are automatically archived with watermark 'SUPERSEDED' upon approval of a new revision."
    ],
    sourceDocument: "Design Version Control Standard § 1.5"
  },
  "MATRIX_ENTRY": {
    concept: "Matrix Entry",
    definition: "A line-item milestone in the Master Deliverables Tracking Matrix tracking an individual package or drawing set across sequential approval milestones (Concept, Schematic, Detailed, Tender, GFC).",
    applicableRoles: ["DESIGN_COORDINATOR", "DESIGN_HEAD"],
    rules: [
      "Modifications to planned completion dates or deliverable status require 'can_matrix_edit' permission.",
      "All modifications generate an immutable Matrix Audit Log entry with previous and new values."
    ],
    sourceDocument: "Master Deliverables Matrix Protocol § 2"
  },
  "STATUTORY_CLEARANCE": {
    concept: "Statutory Clearance",
    definition: "Official regulatory approvals, No Objection Certificates (NOC), or concessions issued by municipal authorities (e.g., MCGM, CFO, MOEF, MahaRERA, Civil Aviation) required for project progression.",
    applicableRoles: ["LIAISON_LEAD", "DESIGN_DIRECTOR"],
    rules: [
      "Clearances must track valid Application Date, Approval Date, File Number, and Validity Period.",
      "Drawings submitted for statutory approval must strictly match the endorsed liaison drawings."
    ],
    sourceDocument: "Regulatory & Statutory Compliance Framework § 6"
  }
};

export const DESIGN_WORKFLOW_GUIDES = {
  CREATE_TRANSMITTAL: {
    action: "CREATE_TRANSMITTAL",
    title: "Transmittal Creation Workflow",
    summary: "Issuing formal transmittal of drawings and technical documents.",
    steps: [
      "1. Navigate to Design Tracking -> Transmittals -> 'Create Transmittal'.",
      "2. Select Project, Tower/Subproject, and Recipient Consultant or Contractor Firm.",
      "3. Specify Purpose of Issue (For Information, For Review & Comment, or For Construction).",
      "4. Select drawing revisions to attach from the approved project drawing repository.",
      "5. Enter Transmittal Remarks, distribution list (CC), and Issue Date.",
      "6. Confirm and dispatch; system issues unique transmittal code and sends email notification."
    ],
    requiredFields: [
      "Project ID",
      "Recipient Firm / Contact",
      "Purpose of Issue",
      "Attached Drawing IDs",
      "Issue Date"
    ],
    applicableRule: "Document Control Rule: Transmittals for Construction require all attached drawings to be verified GFC."
  },
  RAISE_RFI: {
    action: "RAISE_RFI",
    title: "Raise Technical RFI Workflow",
    summary: "Submitting a formal query to design consultants regarding technical details or discrepancies.",
    steps: [
      "1. Open Design Tracking -> RFIs -> 'New RFI'.",
      "2. Select Project, relevant Package (e.g. Structural, MEP, Façade), and Tower.",
      "3. Enter a clear Subject and detailed Query Description highlighting the discrepancy.",
      "4. Attach relevant markups, site photos, or reference drawing extracts.",
      "5. Propose a contractor or site recommendation if a workable solution is apparent.",
      "6. Select the Lead Consultant Partner and assign a Required By date.",
      "7. Submit RFI to notify the consultant team."
    ],
    requiredFields: [
      "Project ID",
      "Package / Discipline",
      "Subject",
      "Detailed Description",
      "Assigned Consultant",
      "Required By Date"
    ],
    applicableRule: "Site Coordination Standard: RFIs must be raised within 48 hours of detecting a site clash."
  },
  APPROVE_GFC: {
    action: "APPROVE_GFC",
    title: "Good For Construction (GFC) Approval Workflow",
    summary: "Granting formal GFC certification to coordinated engineering drawings.",
    steps: [
      "1. Open the target drawing detail page in Design Tracking.",
      "2. Verify you hold 'can_drawings_approve_gfc' authorization (Design Head / Director).",
      "3. Confirm all multi-disciplinary coordination checks (MEP, Structural, Architectural) have passed.",
      "4. Ensure zero unresolved open RFIs reference this drawing revision.",
      "5. Click 'Approve as GFC' and enter approval remarks.",
      "6. System stamps drawing with GFC seal, records audit log entry, and enables release in Transmittals."
    ],
    requiredFields: [
      "Drawing ID",
      "Revision Number",
      "Approval Comments",
      "Approved By Sign-off"
    ],
    applicableRule: "Quality Assurance Standard § 4: GFC approval cannot be delegated to coordinators or external consultants."
  }
};

export function explainDesignConcept(concept: string): DesignConceptDefinition | null {
  const normalized = concept.trim().toUpperCase().replace(/[\s-]/g, "_");
  if (DESIGN_CONCEPTS[normalized]) {
    return DESIGN_CONCEPTS[normalized];
  }
  for (const [key, val] of Object.entries(DESIGN_CONCEPTS)) {
    if (normalized.includes(key) || key.includes(normalized) || val.concept.toUpperCase().includes(concept.trim().toUpperCase())) {
      return val;
    }
  }
  return null;
}

export function guideDesignWorkflow(action: string) {
  const normalized = action.trim().toUpperCase().replace(/[\s-]/g, "_");
  if (normalized.includes("TRANSMITTAL")) {
    return DESIGN_WORKFLOW_GUIDES.CREATE_TRANSMITTAL;
  }
  if (normalized.includes("RFI") || normalized.includes("QUERY")) {
    return DESIGN_WORKFLOW_GUIDES.RAISE_RFI;
  }
  if (normalized.includes("GFC") || normalized.includes("APPROVE")) {
    return DESIGN_WORKFLOW_GUIDES.APPROVE_GFC;
  }
  return {
    action,
    title: `Guidance for ${action}`,
    summary: "General Design Tracking workflow guidance.",
    steps: [
      "1. Confirm you have active enrollment in Design Tracking with appropriate role permissions.",
      "2. Select the relevant Project from the Project switcher.",
      "3. Access the appropriate sub-module (Matrix, Drawings, Transmittals, or RFIs)."
    ],
    requiredFields: ["Project Code / Name"],
    applicableRule: "Design Document Control Procedures."
  };
}
