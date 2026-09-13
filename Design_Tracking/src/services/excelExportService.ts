import ExcelJS from "exceljs";
import { MasterStoreState } from "./designMasterStore";
import { WorkPackageMaster } from "../types/masterTypes";

export async function exportTenderMatrixToExcel(
  storeState: MasterStoreState,
  filteredPackages: WorkPackageMaster[],
  visibleColumns: Array<{
    colKey: string;
    projectId: string;
    projectName: string;
    towerId: string;
    towerName: string;
    towerType: string;
  }>
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Chandak Group Design Tracking";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Tender Design Matrix", {
    views: [{ state: "frozen", xSplit: 2, ySplit: 3 }]
  });

  // 1. Title Banner
  worksheet.mergeCells(1, 1, 1, visibleColumns.length + 2);
  const titleCell = worksheet.getCell(1, 1);
  titleCell.value = "CHANDAK GROUP — TENDER DESIGN TRACKING MASTER MATRIX";
  titleCell.font = { name: "Arial", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
  titleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0F766E" } // Teal-700
  };
  titleCell.alignment = { vertical: "middle", horizontal: "center" };
  worksheet.getRow(1).height = 32;

  // 2. Row 2: Projects & Category Header
  const row2 = worksheet.getRow(2);
  row2.height = 24;
  worksheet.getCell(2, 1).value = "DISCIPLINE";
  worksheet.getCell(2, 1).font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
  worksheet.getCell(2, 1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
  worksheet.getCell(2, 1).alignment = { vertical: "middle", horizontal: "center" };

  worksheet.getCell(2, 2).value = "WORK PACKAGE DELIVERABLES";
  worksheet.getCell(2, 2).font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
  worksheet.getCell(2, 2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
  worksheet.getCell(2, 2).alignment = { vertical: "middle", horizontal: "left" };

  visibleColumns.forEach((col, idx) => {
    const cell = worksheet.getCell(2, idx + 3);
    cell.value = col.projectName;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 9 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF334155" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });

  // 3. Row 3: Tower Wings
  const row3 = worksheet.getRow(3);
  row3.height = 22;
  worksheet.getCell(3, 1).value = "Category";
  worksheet.getCell(3, 1).font = { bold: true, size: 9, color: { argb: "FF64748B" } };
  worksheet.getCell(3, 1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };

  worksheet.getCell(3, 2).value = "Package / Scope";
  worksheet.getCell(3, 2).font = { bold: true, size: 9, color: { argb: "FF64748B" } };
  worksheet.getCell(3, 2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };

  visibleColumns.forEach((col, idx) => {
    const cell = worksheet.getCell(3, idx + 3);
    cell.value = `${col.towerName} (${col.towerType})`;
    cell.font = { bold: true, size: 9, color: { argb: "FF1E293B" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });

  // Set column widths
  worksheet.getColumn(1).width = 24;
  worksheet.getColumn(2).width = 38;
  visibleColumns.forEach((_, idx) => {
    worksheet.getColumn(idx + 3).width = 20;
  });

  // 4. Data Rows
  let currentRowNum = 4;
  let lastDiscipline = "";

  filteredPackages.forEach(pkg => {
    const isNewDiscipline = pkg.disciplineName !== lastDiscipline;
    lastDiscipline = pkg.disciplineName;

    const row = worksheet.getRow(currentRowNum);
    row.height = 20;

    const catCell = worksheet.getCell(currentRowNum, 1);
    catCell.value = pkg.disciplineName;
    catCell.font = { size: 9, bold: isNewDiscipline, color: { argb: "FF475569" } };
    catCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: isNewDiscipline ? "FFF8FAFC" : "FFFFFFFF" } };
    catCell.alignment = { vertical: "middle", horizontal: "left" };

    const nameCell = worksheet.getCell(currentRowNum, 2);
    nameCell.value = pkg.packageName;
    nameCell.font = { size: 9, bold: true, color: { argb: "FF0F172A" } };
    nameCell.alignment = { vertical: "middle", horizontal: "left" };

    visibleColumns.forEach((col, idx) => {
      const cell = worksheet.getCell(currentRowNum, idx + 3);
      const entry = storeState.packageStatuses[`${col.projectId}__${col.towerId}__${pkg.id}`];
      const rawVal = entry ? (entry.targetDate || entry.status) : "NA";
      const val = (rawVal || "NA").trim();
      const lower = val.toLowerCase();

      cell.value = val;
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.font = { size: 9 };

      if (lower.includes("received")) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDCFCE7" } }; // Green
        cell.font = { size: 9, bold: true, color: { argb: "FF15803D" } };
      } else if (lower.includes("pending") || lower.includes("not onboard")) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEE2E2" } }; // Rose
        cell.font = { size: 9, bold: true, color: { argb: "FFB91C1C" } };
      } else if (lower.includes("progress") || lower.includes("onboard") || lower.includes("track")) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } }; // Amber
        cell.font = { size: 9, bold: true, color: { argb: "FFB45309" } };
      } else if (lower === "na" || lower === "-") {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
        cell.font = { size: 9, color: { argb: "FF94A3B8" } };
      } else {
        // Date target
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0F2FE" } }; // Sky blue
        cell.font = { size: 9, bold: true, color: { argb: "FF0369A1" } };
      }

      // Add thin borders
      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } }
      };
    });

    catCell.border = {
      top: { style: "thin", color: { argb: "FFE2E8F0" } },
      left: { style: "thin", color: { argb: "FFE2E8F0" } },
      bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
      right: { style: "thin", color: { argb: "FFE2E8F0" } }
    };
    nameCell.border = {
      top: { style: "thin", color: { argb: "FFE2E8F0" } },
      left: { style: "thin", color: { argb: "FFE2E8F0" } },
      bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
      right: { style: "thin", color: { argb: "FFE2E8F0" } }
    };

    currentRowNum++;
  });

  // Generate buffer and trigger browser download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Chandak_Tender_Design_Tracker_${new Date().toISOString().split("T")[0]}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}
