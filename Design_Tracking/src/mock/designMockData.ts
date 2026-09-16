import { DrawingItem, ConsultantPartner, GfcRelease, DesignProjectSummary } from "../types";

export const mockProjects: DesignProjectSummary[] = [
  {
    id: "dp-01",
    code: "CK-STELLA",
    name: "Chandak Stella",
    location: "Goregaon West, Mumbai",
    totalDrawings: 54,
    gfcCount: 38,
    underReviewCount: 4
  },
  {
    id: "dp-02",
    code: "CK-HIGHSCAPE",
    name: "Chandak Highscape City",
    location: "Chembur, Mumbai",
    totalDrawings: 46,
    gfcCount: 28,
    underReviewCount: 5
  },
  {
    id: "dp-03",
    code: "CK-GREENAIR",
    name: "Chandak GreenAir",
    location: "Borivali East, Mumbai",
    totalDrawings: 32,
    gfcCount: 18,
    underReviewCount: 2
  },
  {
    id: "dp-04",
    code: "CK-34PARK",
    name: "Chandak 34 Park Estate",
    location: "Goregaon West, Mumbai",
    totalDrawings: 16,
    gfcCount: 10,
    underReviewCount: 1
  }
];

export const mockDrawings: DrawingItem[] = [
  {
    id: "drw-01",
    code: "CK-CHD-ARC-L04-001",
    title: "Tower 1 Typical Floor 4-18 Architectural Layout Plan",
    discipline: "Architectural",
    project: "Chandak Stella",
    revision: "R3",
    status: "Approved (GFC)",
    consultant: "Morphogenesis Architects",
    submittedDate: "2026-08-28",
    approvedDate: "2026-09-04",
    fileSize: "14.2 MB",
    description: "Includes balcony waterproofing detail and refuge floor opening coordinates."
  },
  {
    id: "drw-02",
    code: "CK-CHD-STR-FDN-012",
    title: "Raft Foundation Reinforcement Detail & Column Starter Schedule",
    discipline: "Structural",
    project: "Chandak Highscape City",
    revision: "R2",
    status: "Under Review",
    consultant: "JW Consultants LLP",
    submittedDate: "2026-09-02",
    fileSize: "28.6 MB",
    description: "Incorporates updated geotechnical bore-hole findings and high-yield rebar specifications."
  },
  {
    id: "drw-03",
    code: "CK-CHD-MEP-HVAC-004",
    title: "Basement 2 Mechanical Ventilation & Ducting Route Plan",
    discipline: "MEP",
    project: "Chandak GreenAir",
    revision: "R1",
    status: "Revision Requested",
    consultant: "Enersave MEP Consultants",
    submittedDate: "2026-08-15",
    fileSize: "18.9 MB",
    description: "Clash detected with primary storm water down-take line near Grid C4."
  },
  {
    id: "drw-04",
    code: "CK-CHD-LND-POD-007",
    title: "Podium Garden Landscape Grading, Water Feature & Paving Detail",
    discipline: "Landscape",
    project: "Chandak 34 Park Estate",
    revision: "R4",
    status: "Site Handed Over",
    consultant: "Site Concepts Landscape",
    submittedDate: "2026-07-20",
    approvedDate: "2026-08-10",
    fileSize: "32.1 MB",
    description: "Final GFC drawing handed over to civil finishing team and hardscape contractor."
  },
  {
    id: "drw-05",
    code: "CK-CHD-ARC-FAC-008",
    title: "Curtain Wall Glazing & ACP Cladding Sectional Details",
    discipline: "Architectural",
    project: "Chandak Stella",
    revision: "R2",
    status: "Approved (GFC)",
    consultant: "Morphogenesis Architects",
    submittedDate: "2026-09-01",
    approvedDate: "2026-09-08",
    fileSize: "21.5 MB",
    description: "Wind tunnel load test parameters incorporated into structural mullion brackets."
  },
  {
    id: "drw-06",
    code: "CK-CHD-INT-LOB-002",
    title: "Grand Double-Height Entrance Lobby False Ceiling & Chandelier Truss",
    discipline: "Interior",
    project: "Chandak Highscape City",
    revision: "R1",
    status: "Under Review",
    consultant: "ZZ Architects",
    submittedDate: "2026-09-06",
    fileSize: "16.4 MB",
    description: "Structural anchor suspension points coordinate with MEP sprinkler nozzles."
  },
  {
    id: "drw-07",
    code: "CK-CHD-STR-SLB-024",
    title: "Podium 3 Transfer Slab Post-Tensioned (PT) Tendon Layout",
    discipline: "Structural",
    project: "Chandak Stella",
    revision: "R3",
    status: "Approved (GFC)",
    consultant: "JW Consultants LLP",
    submittedDate: "2026-08-22",
    approvedDate: "2026-09-02",
    fileSize: "34.8 MB",
    description: "PT tendon profile, stressing jack clearances and bursting reinforcement schedules."
  }
];

export const mockConsultants: ConsultantPartner[] = [
  {
    id: "cns-01",
    name: "Morphogenesis Architects",
    category: "Architectural",
    expertise: ["Core Architectural Layouts", "Facade & Glazing", "Statutory Floor Plans"],
    leadContact: "Sonali Rastogi",
    email: "design.desk@morphogenesis.org",
    phone: "+91 22 6124 8800",
    activeProjects: ["Chandak Stella", "Chandak Highscape City"],
    onboardingStatus: "Onboard",
    totalDrawingsSubmitted: 62,
    averageTatDays: 3.4,
    rating: 4.9
  },
  {
    id: "cns-02",
    name: "JW Consultants LLP",
    category: "Structural",
    expertise: ["RCC & Structural Design", "PT Transfer Slabs", "Foundations & Substructure"],
    leadContact: "Giridhar Shirke",
    email: "structures@jwconsultants.in",
    phone: "+91 20 6721 4400",
    activeProjects: ["Chandak Stella", "Chandak Highscape City", "Chandak GreenAir"],
    onboardingStatus: "Onboard",
    totalDrawingsSubmitted: 48,
    averageTatDays: 2.8,
    rating: 4.8
  },
  {
    id: "cns-03",
    name: "Enersave MEP Consultants",
    category: "MEP",
    expertise: ["HVAC & Mechanical Ventilation", "Electrical & Transformers", "Plumbing & Drainage", "Fire Fighting & Suppression"],
    leadContact: "Rakesh Kulkarni",
    email: "services@enersavemep.com",
    phone: "+91 22 2847 9000",
    activeProjects: ["Chandak GreenAir", "Chandak 34 Park Estate"],
    onboardingStatus: "Onboard",
    totalDrawingsSubmitted: 34,
    averageTatDays: 4.2,
    rating: 4.6
  },
  {
    id: "cns-04",
    name: "Site Concepts Landscape",
    category: "Landscape",
    expertise: ["Podium & Terrace Hardscape", "Horticulture & Greenery", "Water Features & Pools"],
    leadContact: "Mark Wilson",
    email: "mumbai@siteconcepts.com",
    phone: "+91 22 4002 1122",
    activeProjects: ["Chandak 34 Park Estate", "Chandak Stella"],
    onboardingStatus: "Onboard",
    totalDrawingsSubmitted: 18,
    averageTatDays: 3.1,
    rating: 4.7
  },
  {
    id: "cns-05",
    name: "Acoustic Design Partners",
    category: "Interior",
    expertise: ["Acoustic Wall Paneling", "Clubhouse Interior Fitouts"],
    leadContact: "Anita Desai",
    email: "anita@acousticsdesign.in",
    phone: "+91 22 5555 1234",
    activeProjects: [],
    onboardingStatus: "Not Onboard",
    totalDrawingsSubmitted: 0,
    averageTatDays: 4.0,
    rating: 4.5
  }
];

export const mockGfcReleases: GfcRelease[] = [
  {
    id: "gfc-01",
    drawingId: "drw-01",
    drawingCode: "CK-CHD-ARC-L04-001",
    drawingTitle: "Tower 1 Typical Floor 4-18 Architectural Layout Plan",
    revisionNumber: "R3",
    siteEngineerName: "Vikram Jadhav (Senior PM)",
    contractorFirm: "L&T Construction Heavy Civil",
    handoverDate: "2026-09-05",
    physicalCopiesIssued: 4
  },
  {
    id: "gfc-02",
    drawingId: "drw-04",
    drawingCode: "CK-CHD-LND-POD-007",
    drawingTitle: "Podium Garden Landscape Grading, Water Feature & Paving Detail",
    revisionNumber: "R4",
    siteEngineerName: "Prashant Kadam",
    contractorFirm: "Shapoorji Pallonji Real Estate",
    handoverDate: "2026-08-12",
    physicalCopiesIssued: 3
  },
  {
    id: "gfc-03",
    drawingId: "drw-05",
    drawingCode: "CK-CHD-ARC-FAC-008",
    drawingTitle: "Curtain Wall Glazing & ACP Cladding Sectional Details",
    revisionNumber: "R2",
    siteEngineerName: "Sanjay More",
    contractorFirm: "Glass Wall Facade Systems Ltd",
    handoverDate: "2026-09-09",
    physicalCopiesIssued: 2
  }
];

export const mockTransmittals: import("../types").TransmittalItem[] = [
  {
    id: "tr-01",
    transmittalNumber: "TR-CK-2026-001",
    projectId: "dp-01",
    projectName: "Chandak Stella",
    towerName: "Tower 1",
    issueDate: "2026-09-05",
    purpose: "GOOD_FOR_CONSTRUCTION",
    recipientAgency: "L&T Construction Heavy Civil",
    recipientContact: "Vikram Jadhav (Project Director)",
    issuedBy: "Lead Structural & Architectural Coordinator",
    drawingIds: ["drw-01", "drw-07"],
    drawingDetails: [
      {
        drawingCode: "CK-CHD-ARC-L04-001",
        drawingTitle: "Tower 1 Typical Floor 4-18 Architectural Layout Plan",
        revision: "R3",
        copiesIssued: 4
      },
      {
        drawingCode: "CK-CHD-STR-SLB-024",
        drawingTitle: "Podium 3 Transfer Slab Post-Tensioned Tendon Layout",
        revision: "R3",
        copiesIssued: 3
      }
    ],
    remarks: "Official GFC issuance for execution of slab cast cycle #4. Hardcopies stamped and dispatched via courier.",
    status: "ACKNOWLEDGED",
    acknowledgedAt: "2026-09-06",
    acknowledgedBy: "Vikram Jadhav"
  },
  {
    id: "tr-02",
    transmittalNumber: "TR-CK-2026-002",
    projectId: "dp-04",
    projectName: "Chandak 34 Park Estate",
    towerName: "Podium & Landscape Area",
    issueDate: "2026-08-12",
    purpose: "GOOD_FOR_CONSTRUCTION",
    recipientAgency: "Shapoorji Pallonji Real Estate",
    recipientContact: "Prashant Kadam (Site Lead)",
    issuedBy: "Landscape Project Manager",
    drawingIds: ["drw-04"],
    drawingDetails: [
      {
        drawingCode: "CK-CHD-LND-POD-007",
        drawingTitle: "Podium Garden Landscape Grading, Water Feature & Paving Detail",
        revision: "R4",
        copiesIssued: 3
      }
    ],
    remarks: "Handed over for hardscape execution and perimeter irrigation pipelining.",
    status: "ISSUED"
  }
];

export const mockRfis: import("../types").RfiItem[] = [
  {
    id: "rfi-01",
    rfiNumber: "RFI-STR-042",
    projectId: "dp-01",
    projectName: "Chandak Stella",
    towerName: "Tower 1",
    discipline: "Structural",
    drawingCode: "CK-CHD-STR-SLB-024",
    drawingTitle: "Podium 3 Transfer Slab Post-Tensioned Tendon Layout",
    subject: "PT Tendon Live End Pocket Clearance with Column C-14 Rebar",
    queryDescription: "At Column C-14, the post-tensioning stressing jack requires 650mm clearance, but starter rebar from transfer beam TB-08 obstructs the hydraulic jack placement. Kindly clarify alternate stressing sequence or rebar crank allowance.",
    raisedBy: "Sunil Shinde (Site Engineer, L&T)",
    raisedDate: "2026-09-01",
    assignedConsultant: "JW Consultants LLP",
    priority: "URGENT",
    targetResolutionDate: "2026-09-04",
    status: "CLARIFIED",
    consultantResponse: "Rebar from TB-08 may be staggered by 75mm towards Grid B. Revised tendon stressing sequence approved as per Detail-PT-04-A.",
    respondedBy: "Giridhar Shirke (JW Consultants)",
    respondedDate: "2026-09-02",
    resolvingRevisionNumber: "R3"
  },
  {
    id: "rfi-02",
    rfiNumber: "RFI-MEP-019",
    projectId: "dp-03",
    projectName: "Chandak GreenAir",
    towerName: "Basement 2",
    discipline: "MEP",
    drawingCode: "CK-CHD-MEP-HVAC-004",
    drawingTitle: "Basement 2 Mechanical Ventilation & Ducting Route Plan",
    subject: "HVAC Return Air Duct Clash with Primary Storm Water Down-take",
    queryDescription: "Primary storm water pipe 200mm dia crosses duct D-12 at level -4.20m. Bottom of duct infringes minimum driveway headroom clearance (2.4m).",
    raisedBy: "Anil Parab (MEP Site Lead)",
    raisedDate: "2026-09-08",
    assignedConsultant: "Enersave MEP Consultants",
    priority: "HIGH",
    targetResolutionDate: "2026-09-12",
    status: "UNDER_REVIEW"
  }
];

