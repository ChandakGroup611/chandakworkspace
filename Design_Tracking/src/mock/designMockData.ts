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
    leadContact: "Sonali Rastogi",
    email: "design.desk@morphogenesis.org",
    phone: "+91 22 6124 8800",
    activeProjects: ["Chandak Stella", "Chandak Highscape City"],
    totalDrawingsSubmitted: 62,
    averageTatDays: 3.4,
    rating: 4.9
  },
  {
    id: "cns-02",
    name: "JW Consultants LLP",
    category: "Structural",
    leadContact: "Giridhar Shirke",
    email: "structures@jwconsultants.in",
    phone: "+91 20 6721 4400",
    activeProjects: ["Chandak Stella", "Chandak Highscape City", "Chandak GreenAir"],
    totalDrawingsSubmitted: 48,
    averageTatDays: 2.8,
    rating: 4.8
  },
  {
    id: "cns-03",
    name: "Enersave MEP Consultants",
    category: "MEP",
    leadContact: "Rakesh Kulkarni",
    email: "services@enersavemep.com",
    phone: "+91 22 2847 9000",
    activeProjects: ["Chandak GreenAir", "Chandak 34 Park Estate"],
    totalDrawingsSubmitted: 34,
    averageTatDays: 4.2,
    rating: 4.6
  },
  {
    id: "cns-04",
    name: "Site Concepts Landscape",
    category: "Landscape",
    leadContact: "Mark Wilson",
    email: "mumbai@siteconcepts.com",
    phone: "+91 22 4002 1122",
    activeProjects: ["Chandak 34 Park Estate", "Chandak Stella"],
    totalDrawingsSubmitted: 18,
    averageTatDays: 3.1,
    rating: 4.7
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
