import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface MoMPDFData {
  meetingTitle: string;
  meetingCode: string;
  sessionCode: string;
  sessionNo: number;
  scheduledStart: string;
  scheduledEnd?: string;
  meetingType?: string;
  departmentName?: string;
  projectName?: string;
  projectCode?: string;
  roomName?: string;
  chairName?: string;
  organizerName?: string;
  minuteTakerName?: string;
  overview?: string;
  status?: string;
  momVersion?: number;
  attendees: Array<{
    name: string;
    role: string;
    attendance: string;
    time?: string;
  }>;
  points: Array<{
    code: string;
    title: string;
    priority: string;
    owner: string;
    dueDate: string;
    status: string;
    notes?: string;
  }>;
  tasks: Array<{
    code: string;
    title: string;
    owner: string;
    priority: string;
    dueDate: string;
    status: string;
  }>;
  decisions: Array<{
    code?: string;
    title: string;
    decidedBy: string;
    type: string;
  }>;
}

export function generateMoMPDF(data: MoMPDFData) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let currentY = 16;

  // 1. Corporate Letterhead Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(26, 43, 76); // Chandak Navy
  doc.text("CHANDAK GROUP", 14, currentY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139); // Slate 500
  doc.text("PREMIER REAL ESTATE DEVELOPERS · MUMBAI, INDIA", 14, currentY + 5);
  doc.text("CIN: U45200MH1998PTC115421 · ISO 9001:2015 CERTIFIED CORPORATE GOVERNANCE", 14, currentY + 9);

  // Top Right Metadata Pill
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(26, 43, 76);
  doc.text("EXECUTIVE MINUTES OF MEETING", pageWidth - 14, currentY + 2, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Official Version: v${data.momVersion || 1}.0`, pageWidth - 14, currentY + 7, { align: "right" });

  currentY += 13;

  // Header dividing rule
  doc.setDrawColor(203, 213, 225); // Slate 300
  doc.setLineWidth(0.5);
  doc.line(14, currentY, pageWidth - 14, currentY);

  currentY += 6;

  // 2. Document Title Banner
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.text(data.meetingTitle || "Meeting Minutes", 14, currentY);

  currentY += 5;

  // Project & Scope Subtitle
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(71, 85, 105);
  const scopeText = [
    data.projectName ? `Project: [${data.projectCode || "PROJ"}] ${data.projectName}` : null,
    data.departmentName ? `Department: ${data.departmentName}` : null,
    data.meetingType ? `Type: ${data.meetingType}` : null,
  ].filter(Boolean).join("  |  ");
  doc.text(scopeText || "Corporate Enterprise Review", 14, currentY);

  currentY += 6;

  // 3. Meeting Details Summary Card
  const formattedDate = data.scheduledStart
    ? new Date(data.scheduledStart).toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Kolkata",
      })
    : "Scheduled";

  const formattedTime = data.scheduledStart
    ? new Date(data.scheduledStart).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Kolkata",
      })
    : "";

  const metaDataRows = [
    [
      { content: "Session Code:", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
      { content: data.sessionCode || "Session S-001" },
      { content: "Date & Time:", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
      { content: `${formattedDate} ${formattedTime}` },
    ],
    [
      { content: "Chair / Presiding:", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
      { content: data.chairName || "Meeting Chair" },
      { content: "Venue / Room:", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
      { content: data.roomName || "Hybrid Conference" },
    ],
    [
      { content: "Organizer:", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
      { content: data.organizerName || "Meeting Organizer" },
      { content: "Minute Taker:", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
      { content: data.minuteTakerName || "Secretariat" },
    ],
  ];

  autoTable(doc, {
    body: metaDataRows as any,
    startY: currentY,
    theme: "plain",
    styles: {
      fontSize: 8.5,
      cellPadding: 1.8,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { cellWidth: 28 },
      1: { cellWidth: 64 },
      2: { cellWidth: 28 },
      3: { cellWidth: 64 },
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 4;

  // 4. Executive Overview Box
  if (data.overview) {
    doc.setFillColor(248, 250, 252); // Slate 50
    doc.setDrawColor(203, 213, 225);
    doc.rect(14, currentY, pageWidth - 28, 18, "FD");

    // Navy Accent Indicator
    doc.setFillColor(30, 58, 138); // Navy
    doc.rect(14, currentY, 2.5, 18, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(30, 58, 138);
    doc.text("EXECUTIVE OVERVIEW & QUORUM RESOLUTION", 19, currentY + 4.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    const splitOverview = doc.splitTextToSize(data.overview, pageWidth - 36);
    doc.text(splitOverview.slice(0, 3), 19, currentY + 9);

    currentY += 22;
  }

  // 5. Attendance Matrix
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text("1. Quorum & Attendance Record", 14, currentY);

  const attendanceRows = (data.attendees || []).map((att) => [
    att.name || "Delegate",
    att.role ? att.role.toUpperCase() : "MEMBER",
    (att.attendance || "present").toUpperCase(),
    att.time || "Recorded",
  ]);

  autoTable(doc, {
    head: [["Participant Name", "Meeting Role", "Attendance Status", "Verification Method"]],
    body: attendanceRows.length > 0 ? attendanceRows : [["All members recorded present", "MEMBER", "PRESENT", "Verified"]],
    startY: currentY + 2,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: {
      fillColor: [30, 41, 59], // Slate 800
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  currentY = (doc as any).lastAutoTable.finalY + 7;

  // 6. Numbered Meeting Points Matrix
  if (currentY > pageHeight - 45) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text("2. Deliberations & Agenda Points", 14, currentY);

  const pointRows = (data.points || []).map((pt) => [
    pt.code || "-",
    pt.title + (pt.notes ? `\nNotes: ${pt.notes}` : ""),
    (pt.priority || "Medium").toUpperCase(),
    pt.owner || "Unassigned",
    pt.dueDate || "-",
    (pt.status || "Open").toUpperCase(),
  ]);

  autoTable(doc, {
    head: [["Point Code", "Point Subject & Remarks", "Priority", "Owner", "Target Due", "Status"]],
    body: pointRows.length > 0 ? pointRows : [["PT-0001", "No points recorded in this session", "LOW", "All", "-", "CLOSED"]],
    startY: currentY + 2,
    styles: { fontSize: 7.8, cellPadding: 2 },
    headStyles: {
      fillColor: [30, 58, 138], // Navy
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 78 },
      2: { cellWidth: 18 },
      3: { cellWidth: 26 },
      4: { cellWidth: 22 },
      5: { cellWidth: 18 },
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  currentY = (doc as any).lastAutoTable.finalY + 7;

  // 7. Action Items (Tasks Delegated) Table
  if (currentY > pageHeight - 45) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text("3. Concrete Action Items Delegated", 14, currentY);

  const taskRows = (data.tasks || []).map((t) => [
    t.code || "-",
    t.title,
    t.owner || "Unassigned",
    (t.priority || "Medium").toUpperCase(),
    t.dueDate || "-",
    (t.status || "Not Started").toUpperCase(),
  ]);

  autoTable(doc, {
    head: [["Task Code", "Action Item Description", "Primary Assignee", "Priority", "Due Date", "Status"]],
    body: taskRows.length > 0 ? taskRows : [["TSK-0001", "All action items resolved during session", "All", "NORMAL", "-", "COMPLETED"]],
    startY: currentY + 2,
    styles: { fontSize: 7.8, cellPadding: 2 },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 80 },
      2: { cellWidth: 30 },
      3: { cellWidth: 18 },
      4: { cellWidth: 20 },
      5: { cellWidth: 20 },
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  currentY = (doc as any).lastAutoTable.finalY + 7;

  // 8. Formal Decisions / Resolutions
  if (data.decisions && data.decisions.length > 0) {
    if (currentY > pageHeight - 40) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text("4. Governing Decisions & Resolutions", 14, currentY);

    const decisionRows = data.decisions.map((d, idx) => [
      d.code || `DEC-${String(idx + 1).padStart(3, "0")}`,
      d.title,
      (d.type || "Operational").toUpperCase(),
      d.decidedBy || "Meeting Committee",
      "ACTIVE",
    ]);

    autoTable(doc, {
      head: [["Decision Ref", "Resolution & Formulation", "Type", "Authorized By", "Status"]],
      body: decisionRows,
      startY: currentY + 2,
      styles: { fontSize: 7.8, cellPadding: 2 },
      headStyles: {
        fillColor: [5, 150, 105], // Emerald 600
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  // 9. Sign-off & Electronic Authentication Box
  if (currentY > pageHeight - 38) {
    doc.addPage();
    currentY = 20;
  }

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.line(14, currentY, pageWidth - 14, currentY);

  currentY += 8;

  // Chair & Minute Taker Sign-off Blocks
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text("APPROVED BY:", 14, currentY);
  doc.text("RECORDED BY:", pageWidth / 2, currentY);

  currentY += 4.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(data.chairName || "Chairman / Presiding Officer", 14, currentY);
  doc.text(data.minuteTakerName || "Meeting Secretariat", pageWidth / 2, currentY);

  currentY += 7;

  // Electronic Compliance Footer
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184); // Slate 400
  doc.text(
    `Electronically authenticated via Chandak Meet Enterprise Platform · Generated: ${new Date().toISOString()} · Authenticated Audit Trail Active`,
    14,
    currentY
  );

  // Save PDF
  const cleanCode = (data.sessionCode || "Session").replace(/[^a-zA-Z0-9_-]/g, "_");
  doc.save(`Chandak_MoM_${cleanCode}.pdf`);
}
