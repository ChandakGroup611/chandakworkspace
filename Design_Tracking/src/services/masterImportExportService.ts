// ==============================================================================
// Master Bulk Import & Template Service (Chandak Design & Engineering Tracking)
// Supports: Package Master, Sub Package Master, Project Master, Sub-Project Master,
//           Consultant Master, and Consolidated Multi-Sheet Master Workbooks.
// Formats: Excel (.xlsx) and CSV (.csv)
// ==============================================================================

import ExcelJS from "exceljs";
import { DesignMasterStore } from "./designMasterStore";
import { 
  PackageMaster, 
  SubPackageMaster, 
  ProjectMaster, 
  TowerMaster 
} from "../types/masterTypes";
import { ConsultantPartner } from "../types";

export type MasterImportType = 
  | "PACKAGES" 
  | "SUB_PACKAGES" 
  | "PROJECTS" 
  | "SUB_PROJECTS" 
  | "CONSULTANTS"
  | "AUTHORITIES"
  | "ALL";

export interface MasterColumnDefinition {
  key: string;
  label: string;
  required?: boolean;
  example: string;
  description: string;
  aliases?: string[];
}

export interface ImportRowValidation {
  rowNumber: number;
  data: Record<string, any>;
  isValid: boolean;
  errors: string[];
  isDuplicate: boolean;
  existingId?: string;
  action: "ADD" | "UPDATE" | "SKIP" | "ERROR";
}

export interface ImportValidationResult {
  masterType: MasterImportType;
  fileName: string;
  totalRows: number;
  validCount: number;
  invalidCount: number;
  duplicateCount: number;
  columns: string[];
  rows: ImportRowValidation[];
  multiSheetResults?: Record<string, ImportValidationResult>;
}

// ==============================================================================
// 1. Column Schemas & Definitions
// ==============================================================================

export const MASTER_SCHEMAS: Record<Exclude<MasterImportType, "ALL">, MasterColumnDefinition[]> = {
  PACKAGES: [
    { key: "name", label: "Package Name", required: true, example: "Structural Engineering", description: "Main parent engineering package / discipline name", aliases: ["package", "discipline", "category", "package_name", "activity", "promotion_activity", "promotionactivity", "title", "name", "deliverable", "deliverable_name", "item"] },
    { key: "code", label: "Package Code", required: false, example: "STR", description: "Short 2-6 letter alphanumeric code", aliases: ["code", "package_code", "short_code", "activity_code", "id"] },
    { key: "icon", label: "Icon Emoji", required: false, example: "🏗️", description: "Emoji icon representing package", aliases: ["icon", "emoji"] },
    { key: "color", label: "Color Theme", required: false, example: "blue", description: "purple, blue, emerald, amber, teal, rose, slate", aliases: ["color", "theme"] },
    { key: "description", label: "Description", required: false, example: "Substructure, superstructure, RCC frames & PT slabs", description: "Overview of engineering scope", aliases: ["desc", "notes", "scope", "budget", "budgeted_amount", "budgetedamount", "details", "remarks"] }
  ],
  SUB_PACKAGES: [
    { key: "parentPackageName", label: "Parent Package Name", required: false, example: "Structural Engineering", description: "Parent Package. If omitted, item is imported as a Package Master.", aliases: ["parent_package", "package", "discipline", "category", "parent", "parent_discipline", "main_package", "group"] },
    { key: "subPackageName", label: "Sub-Package Deliverable Name", required: true, example: "Raft Foundation & Shoring", description: "Granular deliverable or contract package", aliases: ["sub_package", "work_package", "deliverable", "package_name", "title", "activity", "promotion_activity", "promotionactivity", "sub_category", "subcategory", "item", "name", "deliverable_name", "activity_name", "task", "work_item"] },
    { key: "subPackageCode", label: "Sub-Package Code", required: false, example: "STR-01", description: "Unique deliverable identifier", aliases: ["code", "sub_package_code", "package_code", "activity_code", "id", "short_code"] },
    { key: "description", label: "Scope & Deliverables", required: false, example: "Soil excavation, pile caps, retention wall & earth anchors", description: "Technical scope details", aliases: ["description", "scope", "details", "remarks", "notes", "budget", "budgeted_amount", "budgetedamount", "amount", "amount_spent", "amount_remaining"] }
  ],
  PROJECTS: [
    { key: "name", label: "Project Name", required: true, example: "Chandak GreenAiry", description: "Official real estate development name", aliases: ["project", "project_name", "title"] },
    { key: "code", label: "Project Code", required: true, example: "GRN-01", description: "Unique project identifier", aliases: ["code", "project_code"] },
    { key: "location", label: "Location / Micro-Market", required: false, example: "Borivali East, Mumbai", description: "Site location / city", aliases: ["location", "city", "address"] },
    { key: "projectType", label: "Project Type", required: false, example: "Residential High-Rise", description: "Residential, Commercial, Township, Mixed-Use, etc.", aliases: ["type", "project_type"] },
    { key: "projectStatus", label: "Project Status", required: false, example: "Planning & Design", description: "Planning & Design, Statutory Approvals, Tendering, Under Construction, Completed", aliases: ["status", "stage"] },
    { key: "plotArea", label: "Plot Area", required: false, example: "3.5 Acres", description: "Total land area", aliases: ["plot_area", "land_area"] },
    { key: "builtUpArea", label: "Built-up Area (BUA)", required: false, example: "1,200,000 sq.ft", description: "Total construction area", aliases: ["bua", "built_up_area", "carpet_area"] },
    { key: "estimatedBudget", label: "Estimated Budget", required: false, example: "₹450 Cr", description: "Project capital expenditure estimate", aliases: ["budget", "cost", "capex"] },
    { key: "reraNumber", label: "RERA Registration Number", required: false, example: "P51800035000", description: "Statutory MahaRERA number", aliases: ["rera", "rera_no", "rera_number"] },
    { key: "targetDate", label: "Target Completion Date", required: false, example: "2028-12-31", description: "Format: YYYY-MM-DD", aliases: ["target_date", "completion_date", "handover_date"] },
    { key: "leadManager", label: "Lead Design Manager", required: false, example: "Ar. Vikram Mehta", description: "In-house lead coordinator", aliases: ["lead_manager", "manager", "incharge"] },
    { key: "leadManagerEmail", label: "Manager Email", required: false, example: "v.mehta@chandakgroup.com", description: "Official communication email", aliases: ["manager_email", "email"] },
    { key: "taggedPackages", label: "Tagged Packages", required: false, example: "Architectural, Structural, MEPF Services", description: "Comma-separated list of active packages", aliases: ["packages", "categories", "disciplines"] },
    { key: "taggedConsultants", label: "Tagged Consultants", required: false, example: "Sterling Consultants, RSP Design", description: "Comma-separated list of assigned firms", aliases: ["consultants", "partners"] },
    { key: "description", label: "Description / Remarks", required: false, example: "Twin 45-storey towers with luxury podium amenities", description: "Project notes", aliases: ["desc", "description", "remarks"] }
  ],
  SUB_PROJECTS: [
    { key: "parentProjectName", label: "Parent Project Name", required: true, example: "Chandak GreenAiry", description: "Must match an existing Project Master", aliases: ["parent_project", "project", "project_name"] },
    { key: "towerName", label: "Sub-Project / Wing Name", required: true, example: "Tower A (Eternia)", description: "Wing name or phase designation", aliases: ["wing", "tower", "sub_project", "tower_name", "wing_name"] },
    { key: "subProjectCode", label: "Sub-Project Code", required: false, example: "TWR-A", description: "Short code for wing", aliases: ["code", "tower_code", "wing_code"] },
    { key: "towerType", label: "Tower Type", required: false, example: "Sale", description: "Sale, Society, Commercial, Rehab / SRA, PTC / Hostel, Plot / Infrastructure", aliases: ["type", "tower_type"] },
    { key: "totalFloors", label: "Total Floors", required: false, example: "45", description: "Number of habitable/podium floors", aliases: ["floors", "storeys", "total_floors"] },
    { key: "heightMeters", label: "Height (Meters)", required: false, example: "148.5", description: "Structural height in meters", aliases: ["height", "height_m"] },
    { key: "targetCompletionDate", label: "Target Date", required: false, example: "2028-09-30", description: "Format: YYYY-MM-DD", aliases: ["target_date", "completion_date"] },
    { key: "taggedPackages", label: "Tagged Packages", required: false, example: "Architectural, Structural, Façade & Glazing", description: "Comma-separated active packages", aliases: ["packages", "categories"] },
    { key: "taggedConsultants", label: "Tagged Consultants", required: false, example: "Sterling Consultants", description: "Comma-separated assigned consultants", aliases: ["consultants"] },
    { key: "description", label: "Description", required: false, example: "Residential 3BHK and 4BHK luxury units", description: "Wing notes", aliases: ["desc", "remarks"] }
  ],
  CONSULTANTS: [
    { key: "name", label: "Consultant Firm Name", required: false, example: "Sterling Engineering & Structural", description: "Registered firm name or partner name", aliases: ["firm_name", "consultant", "consultant_name", "company", "agency", "partner", "name", "title"] },
    { key: "leadContact", label: "Lead Contact Person", required: false, example: "Er. Rajesh Sharma", description: "Principal engineer or contact person (Optional)", aliases: ["contact_person", "lead_contact", "contact", "partner", "person", "representative"] },
    { key: "email", label: "Official Email", required: false, example: "r.sharma@sterlingconsultants.in", description: "Official business email (Optional)", aliases: ["email_address", "mail", "email"] },
    { key: "phone", label: "Phone Number", required: false, example: "+91 98200 12345", description: "Direct contact or mobile number (Optional)", aliases: ["phone_number", "mobile", "tel", "contact_no", "phone"] },
    { key: "categories", label: "Tagged Packages", required: false, example: "Structural Engineering", description: "Comma-separated packages from Package Master (Optional)", aliases: ["packages", "disciplines", "categories", "package"] },
    { key: "rating", label: "Quality Rating (1.0 - 5.0)", required: false, example: "4.8", description: "Performance score (Optional, default 4.8)", aliases: ["rating", "score"] },
    { key: "averageTatDays", label: "Average TAT (Days)", required: false, example: "3.5", description: "Turnaround time in days (Optional, default 3.0)", aliases: ["tat", "tat_days", "turnaround_days"] },
    { key: "onboardingStatus", label: "Onboarding Status", required: false, example: "Onboard", description: "Onboard or Not Onboard (Optional, default Onboard)", aliases: ["status", "onboarding"] }
  ],
  AUTHORITIES: [
    { key: "authorityName", label: "Authority / Body Name", required: true, example: "MCGM Fire Brigade", description: "Statutory authority or municipal body", aliases: ["authority", "name", "body", "authority_name"] },
    { key: "category", label: "Category", required: false, example: "Municipal", description: "Municipal, Fire Safety, Environmental, Aviation, etc.", aliases: ["type", "group"] },
    { key: "scope", label: "Scope / Clearance Description", required: false, example: "Fire Fighting & Life Safety NOC", description: "Clearance or NOC jurisdiction", aliases: ["description", "notes", "scope_description"] }
  ]
};

// ==============================================================================
// 2. Sample Data for Templates
// ==============================================================================

export const SAMPLE_DATA: Record<Exclude<MasterImportType, "ALL">, Record<string, any>[]> = {
  PACKAGES: [
    { name: "Architectural Design", code: "ARCH", icon: "🏛️", color: "purple", description: "Master planning, conceptual layouts, GFC floor plans & 3D visualizations" },
    { name: "Structural Engineering", code: "STR", icon: "🏗️", color: "blue", description: "Substructure, superstructure, RCC frames, PT slabs & steel detailing" },
    { name: "MEPF Services", code: "MEP", icon: "⚡", color: "amber", description: "HVAC, plumbing, electrical distribution, fire protection & low-voltage ELV" },
    { name: "Façade & Fenestration", code: "FACD", icon: "🏢", color: "teal", description: "Curtain glazing, ACP panels, railings, louvers & BMU systems" },
    { name: "Landscape & External Works", code: "LAND", icon: "🌳", color: "emerald", description: "Hardscape, softscape, stormwater retention, lighting & irrigation" }
  ],
  SUB_PACKAGES: [
    { parentPackageName: "Structural Engineering", subPackageName: "Piling, Raft & Basement Shoring", subPackageCode: "STR-01", description: "Secant piles, soldier piles, strutting, deep excavation and raft foundation" },
    { parentPackageName: "Structural Engineering", subPackageName: "Podium & Tower Superstructure RCC", subPackageCode: "STR-02", description: "High-grade shear walls, PT slabs, columns and core wall construction" },
    { parentPackageName: "MEPF Services", subPackageName: "HVAC Central Chiller & Ventilation", subPackageCode: "MEP-01", description: "Water-cooled chillers, AHUs, basement mechanical ventilation & ductwork" },
    { parentPackageName: "MEPF Services", subPackageName: "Electrical Substation & DG Sets", subPackageCode: "MEP-02", description: "11kV HT yard, dry type transformers, diesel generator synchronizing panels" },
    { parentPackageName: "Architectural Design", subPackageName: "General Arrangement & GFC Layouts", subPackageCode: "ARCH-01", description: "Floor plans, core dimensions, shaft layouts and masonry setting-out" },
    { parentPackageName: "Façade & Fenestration", subPackageName: "Unitized Glazing & Balcony Railings", subPackageCode: "FACD-01", description: "Double-glazed unitized curtain wall, structural silicone and glass balustrades" }
  ],
  PROJECTS: [
    {
      name: "Chandak GreenAiry",
      code: "GRN-01",
      location: "Borivali East, Mumbai",
      projectType: "Residential High-Rise",
      projectStatus: "Under Construction",
      plotArea: "3.5 Acres",
      builtUpArea: "1,250,000 sq.ft",
      estimatedBudget: "₹480 Cr",
      reraNumber: "P51800035123",
      targetDate: "2028-12-31",
      leadManager: "Ar. Vikram Mehta",
      leadManagerEmail: "v.mehta@chandakgroup.com",
      taggedPackages: "Architectural Design, Structural Engineering, MEPF Services, Façade & Fenestration",
      taggedConsultants: "Sterling Engineering & Structural, RSP India Architects",
      description: "Twin 45-storey residential high-rise towers facing the Sanjay Gandhi National Park"
    },
    {
      name: "Chandak 34 Park Estate",
      code: "PKE-01",
      location: "Goregaon West, Mumbai",
      projectType: "Luxury Residential",
      projectStatus: "Finishing & Handover",
      plotArea: "2.8 Acres",
      builtUpArea: "980,000 sq.ft",
      estimatedBudget: "₹390 Cr",
      reraNumber: "P51800028456",
      targetDate: "2026-06-30",
      leadManager: "Er. Anita Kulkarni",
      leadManagerEmail: "a.kulkarni@chandakgroup.com",
      taggedPackages: "Architectural Design, Structural Engineering, MEPF Services, Landscape & External Works",
      taggedConsultants: "Sterling Engineering & Structural",
      description: "Premium residential enclave with 35+ lifestyle amenities and podium club"
    }
  ],
  AUTHORITIES: [
    { authorityName: "MCGM Building Proposal", category: "Municipal", scope: "IOD & CC Clearance" },
    { authorityName: "Chief Fire Officer (CFO)", category: "Fire Safety", scope: "Fire Fighting & Life Safety NOC" },
    { authorityName: "State Environmental Appraisal Committee (SEAC)", category: "Environmental", scope: "Environmental Clearance (EC)" },
    { authorityName: "Tree Authority (MCGM)", category: "Municipal", scope: "Tree Cutting / Transplantation NOC" },
    { authorityName: "Airports Authority of India (AAI)", category: "Aviation", scope: "Height Clearance NOC" }
  ],
  SUB_PROJECTS: [
    {
      parentProjectName: "Chandak GreenAiry",
      towerName: "Wing A (Serena)",
      subProjectCode: "GRN-WA",
      towerType: "Sale",
      totalFloors: 45,
      heightMeters: 148.5,
      targetCompletionDate: "2028-09-30",
      taggedPackages: "Architectural Design, Structural Engineering, MEPF Services",
      taggedConsultants: "Sterling Engineering & Structural",
      description: "45-storey premium 3BHK tower"
    },
    {
      parentProjectName: "Chandak GreenAiry",
      towerName: "Wing B (Celesta)",
      subProjectCode: "GRN-WB",
      towerType: "Sale",
      totalFloors: 45,
      heightMeters: 148.5,
      targetCompletionDate: "2028-12-31",
      taggedPackages: "Architectural Design, Structural Engineering, MEPF Services",
      taggedConsultants: "Sterling Engineering & Structural",
      description: "45-storey luxury 4BHK tower"
    },
    {
      parentProjectName: "Chandak 34 Park Estate",
      towerName: "Tower 1",
      subProjectCode: "PKE-T1",
      towerType: "Sale",
      totalFloors: 38,
      heightMeters: 125.0,
      targetCompletionDate: "2026-06-30",
      taggedPackages: "Architectural Design, Structural Engineering, MEPF Services",
      taggedConsultants: "Sterling Engineering & Structural",
      description: "38-storey tower overlooking podium green"
    }
  ],
  CONSULTANTS: [
    {
      name: "Sterling Engineering & Structural",
      leadContact: "Er. Rajesh Sharma",
      email: "r.sharma@sterlingconsultants.in",
      phone: "+91 98200 45678",
      categories: "Structural Engineering",
      rating: 4.9,
      averageTatDays: 3.0,
      onboardingStatus: "Onboard"
    },
    {
      name: "RSP Design Consultants India",
      leadContact: "",
      email: "",
      phone: "",
      categories: "Architectural Design, Landscape & External Works",
      rating: 4.8,
      averageTatDays: 3.5,
      onboardingStatus: "Onboard"
    },
    {
      name: "Spectral MEP Services",
      leadContact: "Er. Amit Deshmukh",
      email: "",
      phone: "+91 98202 33445",
      categories: "MEPF Services",
      rating: 4.7,
      averageTatDays: 4.0,
      onboardingStatus: "Onboard"
    }
  ]
};

// ==============================================================================
// 3. Template Generation & Download Engine
// ==============================================================================

export class MasterImportExportService {
  /**
   * Generates and downloads a sample spreadsheet (.xlsx or .csv) for the specified master.
   */
  public static async downloadSampleTemplate(
    type: MasterImportType,
    format: "xlsx" | "csv" = "xlsx"
  ): Promise<void> {
    if (type === "ALL" || format === "xlsx") {
      await this.downloadExcelTemplate(type);
    } else {
      this.downloadCsvTemplate(type as Exclude<MasterImportType, "ALL">);
    }
  }

  /**
   * Generates formatted Excel workbook with styling, headers, and sample records.
   */
  private static async downloadExcelTemplate(type: MasterImportType): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Chandak Group Design Engineering";
    workbook.created = new Date();

    if (type === "ALL") {
      // 1. Instructions Sheet
      const infoSheet = workbook.addWorksheet("Instructions");
      infoSheet.getColumn(1).width = 28;
      infoSheet.getColumn(2).width = 75;

      infoSheet.addRow(["CHANDAK DESIGN MASTERS BULK IMPORT TEMPLATE", ""]);
      infoSheet.mergeCells(1, 1, 1, 2);
      const titleCell = infoSheet.getCell(1, 1);
      titleCell.font = { name: "Arial", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
      titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F766E" } };
      titleCell.alignment = { vertical: "middle", horizontal: "left" };
      infoSheet.getRow(1).height = 30;

      const instructions = [
        ["Hierarchy Rules", "1. Package Master (Parent) -> 2. Sub-Package Master (Child Deliverables) -> 3. Project Master -> 4. Sub-Project / Towers -> 5. Consultant Partners"],
        ["Required Fields", "Fields with asterisk (*) in headers are strictly mandatory. For Consultant Master, all contact details (contact person, email, phone) are completely optional and can be left blank."],
        ["Parent Linkages", "When creating Sub-Packages, the 'Parent Package Name' must match an existing or newly created Package Master."],
        ["Towers Linkages", "When creating Sub-Projects / Towers, the 'Parent Project Name' must match an existing Project Master."],
        ["Duplicate Handling", "During import, you can choose to 'Skip Duplicates' or 'Update Existing Records' seamlessly."]
      ];

      instructions.forEach(([title, desc]) => {
        const row = infoSheet.addRow([title, desc]);
        row.getCell(1).font = { bold: true, color: { argb: "FF0F172A" } };
        row.getCell(2).font = { color: { argb: "FF334155" } };
        row.height = 24;
      });

      // 2. Add each master sheet
      const masterKeys: Array<Exclude<MasterImportType, "ALL">> = ["PACKAGES", "SUB_PACKAGES", "PROJECTS", "SUB_PROJECTS", "CONSULTANTS", "AUTHORITIES"];
      const sheetTitles: Record<string, string> = {
        PACKAGES: "Package Master",
        SUB_PACKAGES: "Sub-Package Master",
        PROJECTS: "Project Master",
        SUB_PROJECTS: "Sub-Project Master",
        CONSULTANTS: "Consultant Master",
        AUTHORITIES: "Statutory Authorities"
      };

      for (const mKey of masterKeys) {
        this.populateSheet(workbook.addWorksheet(sheetTitles[mKey]), mKey);
      }

      await this.triggerWorkbookDownload(workbook, `Chandak_Design_Masters_All_Template_${this.getDatestamp()}.xlsx`);
    } else {
      const sheet = workbook.addWorksheet(this.getMasterTitle(type));
      this.populateSheet(sheet, type as Exclude<MasterImportType, "ALL">);
      await this.triggerWorkbookDownload(workbook, `Chandak_${type}_Import_Template_${this.getDatestamp()}.xlsx`);
    }
  }

  /**
   * Helper to populate an individual worksheet with headers and sample records.
   */
  private static populateSheet(sheet: ExcelJS.Worksheet, type: Exclude<MasterImportType, "ALL">) {
    const schema = MASTER_SCHEMAS[type];
    const samples = SAMPLE_DATA[type];

    // Header row
    const headerRow = sheet.getRow(1);
    headerRow.height = 28;

    schema.forEach((col, idx) => {
      sheet.getColumn(idx + 1).width = Math.max(col.label.length + 6, 20);
      const cell = headerRow.getCell(idx + 1);
      cell.value = col.required ? `${col.label} *` : col.label;
      cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: col.required ? "FF0D9488" : "FF334155" } // Teal for required, Slate for optional
      };
      cell.alignment = { vertical: "middle", horizontal: "left" };
      cell.note = `${col.description}\nExample: ${col.example}`;
    });

    // Sample data rows
    samples.forEach((sample, rIdx) => {
      const row = sheet.getRow(rIdx + 2);
      row.height = 22;
      schema.forEach((col, cIdx) => {
        const cell = row.getCell(cIdx + 1);
        cell.value = sample[col.key] !== undefined ? sample[col.key] : "";
        cell.font = { name: "Arial", size: 9, color: { argb: "FF1E293B" } };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: rIdx % 2 === 0 ? "FFFFFFFF" : "FFF8FAFC" }
        };
        cell.border = {
          top: { style: "thin", color: { argb: "FFE2E8F0" } },
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
          left: { style: "thin", color: { argb: "FFE2E8F0" } },
          right: { style: "thin", color: { argb: "FFE2E8F0" } }
        };
      });
    });
  }

  /**
   * Generates and downloads a CSV template.
   */
  private static downloadCsvTemplate(type: Exclude<MasterImportType, "ALL">): void {
    const schema = MASTER_SCHEMAS[type];
    const samples = SAMPLE_DATA[type];

    const headers = schema.map(col => `"${col.label.replace(/"/g, '""')}"`);
    const rows = samples.map(sample => {
      return schema.map(col => {
        const val = sample[col.key] !== undefined ? String(sample[col.key]) : "";
        return `"${val.replace(/"/g, '""')}"`;
      }).join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Chandak_${type}_Import_Template_${this.getDatestamp()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  // ==============================================================================
  // 4. File Parsing & Multi-Stage Validation
  // ==============================================================================

  /**
   * Parses uploaded Excel (.xlsx) or CSV (.csv) file into validated records.
   */
  public static async parseImportFile(
    file: File,
    requestedType: MasterImportType
  ): Promise<ImportValidationResult> {
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith(".csv")) {
      const text = await file.text();
      return this.parseCsvContent(text, requestedType, file.name);
    } else {
      const arrayBuffer = await file.arrayBuffer();
      return this.parseExcelBuffer(arrayBuffer, requestedType, file.name);
    }
  }

  /**
   * Parses CSV string into structured validation result.
   */
  private static parseCsvContent(
    content: string,
    requestedType: MasterImportType,
    fileName: string
  ): ImportValidationResult {
    const targetType = requestedType === "ALL" ? "PROJECTS" : requestedType;
    const lines = this.splitCsvLines(content);
    if (lines.length < 2) {
      return {
        masterType: targetType,
        fileName,
        totalRows: 0,
        validCount: 0,
        invalidCount: 0,
        duplicateCount: 0,
        columns: [],
        rows: []
      };
    }

    const schema = MASTER_SCHEMAS[targetType];

    // Scan first 15 lines for best matching header row
    let bestLineIdx = 0;
    let bestKeyMapping: Record<string, number | undefined> = {};
    let maxMatchCount = 0;

    const maxScanLines = Math.min(lines.length, 15);
    for (let i = 0; i < maxScanLines; i++) {
      const headerCells = this.parseCsvRow(lines[i]);
      const mapping = this.resolveHeaderMapping(headerCells, schema);
      const matchCount = Object.keys(mapping).length;
      if (matchCount > maxMatchCount) {
        maxMatchCount = matchCount;
        bestLineIdx = i;
        bestKeyMapping = mapping;
      }
    }

    if (maxMatchCount === 0) {
      bestLineIdx = 0;
      const primaryKey = targetType === "SUB_PACKAGES" ? "subPackageName" : "name";
      bestKeyMapping = { [primaryKey]: 0 };
    }

    const rows: ImportRowValidation[] = [];
    const seenBatchKeys = new Set<string>();

    for (let i = bestLineIdx + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const cells = this.parseCsvRow(line);
      const rowData: Record<string, any> = {};
      let hasData = false;

      Object.entries(bestKeyMapping).forEach(([colKey, cIdx]) => {
        if (cIdx !== undefined && cIdx < cells.length) {
          const val = cells[cIdx].trim();
          if (val) {
            hasData = true;
            rowData[colKey] = val;
          }
        }
      });

      if (!rowData.subPackageName && rowData.parentPackageName) {
        rowData.subPackageName = rowData.parentPackageName;
        rowData.parentPackageName = "";
      }

      if (targetType === "CONSULTANTS" && !rowData.name && rowData.leadContact) {
        rowData.name = rowData.leadContact;
      }

      const checkName = (rowData.subPackageName || rowData.name || rowData.leadContact || "").trim().toLowerCase();
      if (!hasData || !checkName || checkName === "total" || checkName === "grand total") {
        continue;
      }

      const batchKey = `${(rowData.parentPackageName || "").trim().toLowerCase()}:::${checkName}`;
      const isBatchDuplicate = seenBatchKeys.has(batchKey);
      seenBatchKeys.add(batchKey);

      const validation = this.validateRecord(rowData, i + 1, targetType, isBatchDuplicate);
      rows.push(validation);
    }

    return {
      masterType: targetType,
      fileName,
      totalRows: rows.length,
      validCount: rows.filter(r => r.isValid && !r.isDuplicate).length,
      invalidCount: rows.filter(r => !r.isValid).length,
      duplicateCount: rows.filter(r => r.isValid && r.isDuplicate).length,
      columns: schema.map(c => c.label),
      rows
    };
  }

  /**
   * Parses Excel buffer (.xlsx) and checks for single or multi-sheet content.
   */
  private static async parseExcelBuffer(
    buffer: ArrayBuffer,
    requestedType: MasterImportType,
    fileName: string
  ): Promise<ImportValidationResult> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    // Keyword detection mapping - ORDER MATTERS: Longer/specific keywords MUST be first!
    const masterTypeMapping: Array<[string, Exclude<MasterImportType, "ALL">]> = [
      ["sub_package", "SUB_PACKAGES"],
      ["subpackage", "SUB_PACKAGES"],
      ["deliverable", "SUB_PACKAGES"],
      ["sub_project", "SUB_PROJECTS"],
      ["subproject", "SUB_PROJECTS"],
      ["tower", "SUB_PROJECTS"],
      ["wing", "SUB_PROJECTS"],
      ["package", "PACKAGES"],
      ["discipline", "PACKAGES"],
      ["category", "PACKAGES"],
      ["project", "PROJECTS"],
      ["consultant", "CONSULTANTS"],
      ["authority", "AUTHORITIES"],
      ["statutory", "AUTHORITIES"]
    ];

    const detectSheetType = (sheetName: string): Exclude<MasterImportType, "ALL"> | null => {
      const lower = sheetName.toLowerCase().replace(/[^a-z0-9]/g, "_");
      if (lower.includes("instruction") || lower.includes("readme")) return null;
      for (const [kw, mType] of masterTypeMapping) {
        if (lower.includes(kw)) {
          return mType;
        }
      }
      return null;
    };

    // If requestedType === "ALL", inspect and consolidate all sheets
    if (requestedType === "ALL") {
      const multiResults: Record<string, ImportValidationResult> = {};
      let totalValid = 0;
      let totalInvalid = 0;
      let totalDuplicates = 0;
      let totalRowsCombined = 0;

      for (const sheet of workbook.worksheets) {
        const detectedType = detectSheetType(sheet.name);
        if (detectedType) {
          const res = this.parseWorksheet(sheet, detectedType, fileName);
          multiResults[detectedType] = res;
          totalValid += res.validCount;
          totalInvalid += res.invalidCount;
          totalDuplicates += res.duplicateCount;
          totalRowsCombined += res.totalRows;
        }
      }

      if (Object.keys(multiResults).length > 0) {
        return {
          masterType: "ALL",
          fileName,
          totalRows: totalRowsCombined,
          validCount: totalValid,
          invalidCount: totalInvalid,
          duplicateCount: totalDuplicates,
          columns: ["Multi-Sheet Consolidated"],
          rows: [],
          multiSheetResults: multiResults
        };
      }
    }

    // Specific master requested (e.g. "SUB_PACKAGES", "PACKAGES", "PROJECTS", etc.)
    const targetType = requestedType === "ALL" ? "PACKAGES" : requestedType;

    // Find the worksheet that matches the requested type, or fallback to the sheet with the most rows
    let targetWorksheet = workbook.worksheets[0];

    if (workbook.worksheets.length > 1) {
      const matchingSheet = workbook.worksheets.find(ws => detectSheetType(ws.name) === targetType);
      if (matchingSheet) {
        targetWorksheet = matchingSheet;
      } else {
        // Choose sheet with highest row count (excluding instructions)
        let maxRows = 0;
        for (const ws of workbook.worksheets) {
          const lower = ws.name.toLowerCase();
          if (!lower.includes("instruction") && !lower.includes("readme") && ws.rowCount > maxRows) {
            maxRows = ws.rowCount;
            targetWorksheet = ws;
          }
        }
      }
    }

    return this.parseWorksheet(targetWorksheet, targetType, fileName);
  }

  /**
   * Helper to parse an individual ExcelJS worksheet.
   */
  private static parseWorksheet(
    worksheet: ExcelJS.Worksheet,
    type: Exclude<MasterImportType, "ALL">,
    fileName: string
  ): ImportValidationResult {
    const schema = MASTER_SCHEMAS[type];

    // Helper to safely extract string content from any cell type (richText, formulas, numbers, etc.)
    const extractCellText = (cell: ExcelJS.Cell): string => {
      const v = cell.value;
      if (v === null || v === undefined) return "";
      if (typeof v === "object") {
        if ("richText" in v && Array.isArray((v as any).richText)) {
          return (v as any).richText.map((t: any) => t.text || "").join("").trim();
        }
        if ("text" in v) return String((v as any).text || "").trim();
        if ("result" in v) return String((v as any).result || "").trim();
      }
      return String(v).trim();
    };

    // Scan first 15 rows to find the row that has the best matching schema headers
    let bestHeaderRowNumber = 1;
    let bestKeyMapping: Record<string, number | undefined> = {};
    let maxMatchCount = 0;

    const maxScanRows = Math.min(worksheet.rowCount, 15);
    for (let r = 1; r <= maxScanRows; r++) {
      const row = worksheet.getRow(r);
      const cells: string[] = [];
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        cells[colNumber - 1] = extractCellText(cell);
      });
      const mapping = this.resolveHeaderMapping(cells, schema);
      const matchCount = Object.keys(mapping).length;
      if (matchCount > maxMatchCount) {
        maxMatchCount = matchCount;
        bestHeaderRowNumber = r;
        bestKeyMapping = mapping;
      }
    }

    // Fallback if no matching headers found: map first column to primary name key
    if (maxMatchCount === 0) {
      bestHeaderRowNumber = 1;
      const primaryKey = type === "SUB_PACKAGES" ? "subPackageName" : "name";
      bestKeyMapping = { [primaryKey]: 0 };
    }

    const rows: ImportRowValidation[] = [];
    const seenBatchKeys = new Set<string>();

    for (let r = bestHeaderRowNumber + 1; r <= worksheet.rowCount; r++) {
      const row = worksheet.getRow(r);
      const rowData: Record<string, any> = {};
      let hasData = false;

      Object.entries(bestKeyMapping).forEach(([colKey, cIdx]) => {
        if (cIdx !== undefined) {
          const cell = row.getCell(cIdx + 1);
          const cellVal = extractCellText(cell);
          if (cellVal !== "") {
            hasData = true;
            rowData[colKey] = cellVal;
          }
        }
      });

      // If deliverable was pasted into parent column and subPackageName is empty
      if (!rowData.subPackageName && rowData.parentPackageName) {
        rowData.subPackageName = rowData.parentPackageName;
        rowData.parentPackageName = "";
      }

      if (type === "CONSULTANTS" && !rowData.name && rowData.leadContact) {
        rowData.name = rowData.leadContact;
      }

      const checkName = (rowData.subPackageName || rowData.name || rowData.leadContact || "").trim().toLowerCase();
      // Ignore empty or summary "Total" / "Grand Total" rows
      if (!hasData || !checkName || checkName === "total" || checkName === "grand total") {
        continue;
      }

      // Check for duplicate rows within the same uploaded file
      const batchKey = `${(rowData.parentPackageName || "").trim().toLowerCase()}:::${checkName}`;
      const isBatchDuplicate = seenBatchKeys.has(batchKey);
      seenBatchKeys.add(batchKey);

      const validation = this.validateRecord(rowData, r, type, isBatchDuplicate);
      rows.push(validation);
    }

    return {
      masterType: type,
      fileName,
      totalRows: rows.length,
      validCount: rows.filter(r => r.isValid && !r.isDuplicate).length,
      invalidCount: rows.filter(r => !r.isValid).length,
      duplicateCount: rows.filter(r => r.isValid && r.isDuplicate).length,
      columns: schema.map(c => c.label),
      rows
    };
  }

  /**
   * Validates a single record against schema rules and detects duplicates in DesignMasterStore.
   */
  private static validateRecord(
    data: Record<string, any>,
    rowNumber: number,
    type: Exclude<MasterImportType, "ALL">,
    isBatchDuplicate: boolean = false
  ): ImportRowValidation {
    const schema = MASTER_SCHEMAS[type];
    const errors: string[] = [];
    const store = DesignMasterStore.getState();

    // 1. Mandatory fields check
    for (const col of schema) {
      if (col.required && (!data[col.key] || String(data[col.key]).trim() === "")) {
        errors.push(`Missing required field: "${col.label}"`);
      }
    }

    let isDuplicate = isBatchDuplicate;
    let existingId: string | undefined = undefined;

    // 2. Entity-specific validation and duplicate resolution
    if (type === "PACKAGES") {
      const name = (data.name || "").trim().toLowerCase();
      const code = (data.code || "").trim().toLowerCase();
      const existing = (store.disciplines || []).find(
        p => p.name.toLowerCase() === name || (code && p.code.toLowerCase() === code)
      );
      if (existing) {
        isDuplicate = true;
        existingId = existing.id;
      }
    } else if (type === "SUB_PACKAGES") {
      const parentName = (data.parentPackageName || "").trim().toLowerCase();
      const subName = (data.subPackageName || "").trim().toLowerCase();
      const subCode = (data.subPackageCode || "").trim().toLowerCase();

      const isStandalonePackage = !parentName || parentName === subName;

      if (isStandalonePackage) {
        // No parent (or self-parent): Consider as Package in Package Master
        const existingInPackages = (store.disciplines || []).find(
          d => d.name.toLowerCase() === subName || (subCode && d.code.toLowerCase() === subCode)
        );
        if (existingInPackages) {
          isDuplicate = true;
          existingId = existingInPackages.id;
        }
      } else {
        // Has parent: check Sub-Package Master
        const parentDisc = (store.disciplines || []).find(
          d => d.name.toLowerCase() === parentName || d.code.toLowerCase() === parentName
        );
        const parentId = parentDisc?.id;
        const parentCanonicalName = parentDisc ? parentDisc.name.toLowerCase() : parentName;

        const existing = (store.packages || []).find(
          p => (((parentId && p.disciplineId === parentId) || (p.disciplineName && p.disciplineName.toLowerCase() === parentCanonicalName)) &&
                ((p.subPackageName || p.packageName || "").trim().toLowerCase() === subName)) ||
               (subCode && (p.subPackageCode || p.packageCode || "").trim().toLowerCase() === subCode)
        );
        if (existing) {
          isDuplicate = true;
          existingId = existing.id;
        }
      }
    } else if (type === "PROJECTS") {
      const name = (data.name || "").trim().toLowerCase();
      const code = (data.code || "").trim().toLowerCase();
      const existing = (store.projects || []).find(
        p => p.name.toLowerCase() === name || (code && p.code.toLowerCase() === code)
      );
      if (existing) {
        isDuplicate = true;
        existingId = existing.id;
      }
      if (data.leadManagerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.leadManagerEmail)) {
        errors.push(`Invalid email format: "${data.leadManagerEmail}"`);
      }
    } else if (type === "SUB_PROJECTS") {
      const parentName = (data.parentProjectName || "").trim().toLowerCase();
      const towerName = (data.towerName || "").trim().toLowerCase();

      const parentProject = (store.projects || []).find(
        p => p.name.toLowerCase() === parentName || p.code.toLowerCase() === parentName || p.id.toLowerCase() === parentName
      );
      if (!parentProject) {
        errors.push(`Parent Project "${data.parentProjectName}" does not exist in Project Master`);
      } else {
        const existing = (store.towers || []).find(
          t => t.projectId === parentProject.id && t.towerName.toLowerCase() === towerName
        );
        if (existing) {
          isDuplicate = true;
          existingId = existing.id;
        }
      }
    } else if (type === "CONSULTANTS") {
      const name = (data.name || data.leadContact || "").trim().toLowerCase();
      const email = (data.email || "").trim().toLowerCase();

      if (!name) {
        errors.push(`Consultant firm or partner name is required`);
      }

      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push(`Invalid email address format: "${data.email}"`);
      }

      const existing = (store.consultants || []).find(
        c => c.name.toLowerCase() === name || (email !== "" && c.email && c.email.toLowerCase() === email)
      );
      if (existing) {
        isDuplicate = true;
        existingId = existing.id;
      }
    } else if (type === "AUTHORITIES") {
      const name = (data.authorityName || "").trim().toLowerCase();
      const existing = (store.authorities || []).find(
        a => a.authorityName.toLowerCase() === name
      );
      if (existing) {
        isDuplicate = true;
        existingId = existing.id;
      }
    }

    const isValid = errors.length === 0;
    return {
      rowNumber,
      data,
      isValid,
      errors,
      isDuplicate,
      existingId,
      action: !isValid ? "ERROR" : isDuplicate ? "UPDATE" : "ADD"
    };
  }

  // ==============================================================================
  // 5. Execution Engine (Commits parsed rows to DesignMasterStore)
  // ==============================================================================

  /**
   * Commits validated items into DesignMasterStore based on duplicateStrategy.
   */
  public static async executeImport(
    result: ImportValidationResult,
    duplicateStrategy: "SKIP" | "OVERWRITE" = "SKIP"
  ): Promise<{ added: number; updated: number; skipped: number; errors: number }> {
    if (result.masterType === "ALL" && result.multiSheetResults) {
      let grandAdded = 0;
      let grandUpdated = 0;
      let grandSkipped = 0;
      let grandErrors = 0;

      // Import in hierarchical dependency order:
      const executionOrder: Array<Exclude<MasterImportType, "ALL">> = [
        "PACKAGES",
        "SUB_PACKAGES",
        "PROJECTS",
        "SUB_PROJECTS",
        "CONSULTANTS",
        "AUTHORITIES"
      ];

      for (const mType of executionOrder) {
        const subResult = result.multiSheetResults[mType];
        if (subResult && subResult.rows.length > 0) {
          const res = await this.executeSingleMasterImport(subResult, duplicateStrategy);
          grandAdded += res.added;
          grandUpdated += res.updated;
          grandSkipped += res.skipped;
          grandErrors += res.errors;
        }
      }

      return { added: grandAdded, updated: grandUpdated, skipped: grandSkipped, errors: grandErrors };
    }

    return this.executeSingleMasterImport(result, duplicateStrategy);
  }

  private static async executeSingleMasterImport(
    result: ImportValidationResult,
    duplicateStrategy: "SKIP" | "OVERWRITE"
  ): Promise<{ added: number; updated: number; skipped: number; errors: number }> {
    const validRows = result.rows.filter(r => r.isValid);
    const mType = result.masterType as Exclude<MasterImportType, "ALL">;

    if (mType === "PACKAGES") {
      const items = validRows.map(r => ({
        name: String(r.data.name || r.data.subPackageName || "").trim(),
        code: String(r.data.code || r.data.subPackageCode || (r.data.name || r.data.subPackageName || "").slice(0, 4)).trim().toUpperCase(),
        description: r.data.description ? String(r.data.description).trim() : undefined,
        icon: r.data.icon ? String(r.data.icon).trim() : "📁",
        color: r.data.color ? String(r.data.color).trim() : "purple"
      }));
      const res = DesignMasterStore.bulkImportPackages(items, duplicateStrategy);
      return { ...res, errors: result.invalidCount };
    }

    if (mType === "SUB_PACKAGES") {
      const items = validRows.map(r => ({
        parentPackageName: r.data.parentPackageName ? String(r.data.parentPackageName).trim() : "",
        subPackageName: r.data.subPackageName ? String(r.data.subPackageName).trim() : (r.data.parentPackageName ? String(r.data.parentPackageName).trim() : ""),
        subPackageCode: r.data.subPackageCode ? String(r.data.subPackageCode).trim() : undefined,
        description: r.data.description ? String(r.data.description).trim() : undefined
      }));
      const res = DesignMasterStore.bulkImportSubPackages(items, duplicateStrategy);
      return { ...res, errors: result.invalidCount };
    }

    if (mType === "PROJECTS") {
      const items = validRows.map(r => {
        const taggedPackages = r.data.taggedPackages
          ? String(r.data.taggedPackages).split(",").map((s: string) => s.trim()).filter(Boolean)
          : [];
        const taggedConsultants = r.data.taggedConsultants
          ? String(r.data.taggedConsultants).split(",").map((s: string) => s.trim()).filter(Boolean)
          : [];

        return {
          name: String(r.data.name).trim(),
          code: String(r.data.code || r.data.name.slice(0, 4)).trim().toUpperCase(),
          location: r.data.location ? String(r.data.location).trim() : "Mumbai MMR",
          projectType: r.data.projectType ? String(r.data.projectType).trim() : "Residential High-Rise",
          projectStatus: r.data.projectStatus ? String(r.data.projectStatus).trim() : "Planning & Design",
          plotArea: r.data.plotArea ? String(r.data.plotArea).trim() : undefined,
          builtUpArea: r.data.builtUpArea ? String(r.data.builtUpArea).trim() : undefined,
          estimatedBudget: r.data.estimatedBudget ? String(r.data.estimatedBudget).trim() : undefined,
          reraNumber: r.data.reraNumber ? String(r.data.reraNumber).trim() : undefined,
          targetDate: r.data.targetDate ? String(r.data.targetDate).trim() : undefined,
          leadManager: r.data.leadManager ? String(r.data.leadManager).trim() : undefined,
          leadManagerEmail: r.data.leadManagerEmail ? String(r.data.leadManagerEmail).trim() : undefined,
          taggedPackages,
          taggedConsultants,
          description: r.data.description ? String(r.data.description).trim() : undefined
        };
      });
      const res = DesignMasterStore.bulkImportProjects(items, duplicateStrategy);
      return { ...res, errors: result.invalidCount };
    }

    if (mType === "SUB_PROJECTS") {
      const items = validRows.map(r => {
        const taggedPackages = r.data.taggedPackages
          ? String(r.data.taggedPackages).split(",").map((s: string) => s.trim()).filter(Boolean)
          : [];
        const taggedConsultants = r.data.taggedConsultants
          ? String(r.data.taggedConsultants).split(",").map((s: string) => s.trim()).filter(Boolean)
          : [];

        return {
          parentProjectNameOrId: String(r.data.parentProjectName).trim(),
          towerName: String(r.data.towerName).trim(),
          subProjectCode: r.data.subProjectCode ? String(r.data.subProjectCode).trim() : undefined,
          towerType: (r.data.towerType ? String(r.data.towerType).trim() : "Sale") as any,
          totalFloors: r.data.totalFloors ? parseInt(r.data.totalFloors, 10) : undefined,
          heightMeters: r.data.heightMeters ? parseFloat(r.data.heightMeters) : undefined,
          targetCompletionDate: r.data.targetCompletionDate ? String(r.data.targetCompletionDate).trim() : undefined,
          taggedPackages,
          taggedConsultants,
          description: r.data.description ? String(r.data.description).trim() : undefined
        };
      });
      const res = DesignMasterStore.bulkImportSubProjects(items, duplicateStrategy);
      return { ...res, errors: result.invalidCount };
    }

    if (mType === "CONSULTANTS") {
      const items = validRows.map(r => {
        const categories = r.data.categories
          ? String(r.data.categories).split(",").map((s: string) => s.trim()).filter(Boolean)
          : [];

        const firmName = String(r.data.name || r.data.leadContact || "").trim();
        const contactPerson = r.data.leadContact ? String(r.data.leadContact).trim() : (firmName || "Main Office");
        const contactEmail = r.data.email ? String(r.data.email).trim() : "";
        const contactPhone = r.data.phone ? String(r.data.phone).trim() : "";

        return {
          name: firmName,
          leadContact: contactPerson,
          email: contactEmail,
          phone: contactPhone,
          categories,
          rating: r.data.rating && !isNaN(parseFloat(r.data.rating)) ? parseFloat(r.data.rating) : 4.8,
          averageTatDays: r.data.averageTatDays && !isNaN(parseFloat(r.data.averageTatDays)) ? parseFloat(r.data.averageTatDays) : 3.0,
          onboardingStatus: (r.data.onboardingStatus && String(r.data.onboardingStatus).toLowerCase().includes("not"))
            ? ("Not Onboard" as const)
            : ("Onboard" as const)
        };
      });
      const res = DesignMasterStore.bulkImportConsultants(items, duplicateStrategy);
      return { ...res, errors: result.invalidCount };
    }

    if (mType === "AUTHORITIES") {
      const items = validRows.map(r => ({
        authorityName: String(r.data.authorityName).trim(),
        category: r.data.category ? String(r.data.category).trim() : undefined,
        scope: r.data.scope ? String(r.data.scope).trim() : undefined
      }));
      const res = DesignMasterStore.bulkImportAuthorities(items, duplicateStrategy);
      return { ...res, errors: result.invalidCount };
    }

    return { added: 0, updated: 0, skipped: 0, errors: 0 };
  }

  // ==============================================================================
  // Utilities
  // ==============================================================================

  private static resolveHeaderMapping(
    headerCells: string[],
    schema: MasterColumnDefinition[]
  ): Record<string, number | undefined> {
    const mapping: Record<string, number | undefined> = {};

    schema.forEach(col => {
      const allNames = [col.label, col.key, ...(col.aliases || [])].map(n =>
        n.toLowerCase().replace(/[^a-z0-9]/g, "")
      );

      const foundIdx = headerCells.findIndex(cellText => {
        const cleanCell = cellText.toLowerCase().replace(/[^a-z0-9]/g, "");
        return allNames.includes(cleanCell);
      });

      if (foundIdx !== -1) {
        mapping[col.key] = foundIdx;
      }
    });

    return mapping;
  }

  private static splitCsvLines(csv: string): string[] {
    const lines: string[] = [];
    let cur = "";
    let insideQuotes = false;

    for (let i = 0; i < csv.length; i++) {
      const c = csv[i];
      if (c === '"') {
        insideQuotes = !insideQuotes;
        cur += c;
      } else if ((c === '\n' || (c === '\r' && csv[i + 1] === '\n')) && !insideQuotes) {
        if (c === '\r') i++;
        lines.push(cur);
        cur = "";
      } else {
        cur += c;
      }
    }
    if (cur.trim()) lines.push(cur);
    return lines;
  }

  private static parseCsvRow(rowStr: string): string[] {
    const cells: string[] = [];
    let cur = "";
    let insideQuotes = false;

    for (let i = 0; i < rowStr.length; i++) {
      const c = rowStr[i];
      if (c === '"') {
        if (insideQuotes && rowStr[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (c === ',' && !insideQuotes) {
        cells.push(cur.trim());
        cur = "";
      } else {
        cur += c;
      }
    }
    cells.push(cur.trim());
    return cells;
  }

  private static async triggerWorkbookDownload(workbook: ExcelJS.Workbook, fileName: string): Promise<void> {
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  private static getMasterTitle(type: MasterImportType): string {
    const map: Record<MasterImportType, string> = {
      PACKAGES: "Package Master",
      SUB_PACKAGES: "Sub-Package Master",
      PROJECTS: "Project Master",
      SUB_PROJECTS: "Sub-Project Master",
      CONSULTANTS: "Consultant Master",
      AUTHORITIES: "Statutory Authorities",
      ALL: "All Masters"
    };
    return map[type] || "Master";
  }

  private static getDatestamp(): string {
    return new Date().toISOString().split("T")[0];
  }
}
