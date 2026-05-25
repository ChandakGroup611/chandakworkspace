"use server";

import { getVisibleTickets } from "@/lib/repositories/tickets";
import { getVisibleRequirements } from "@/lib/repositories/requirements";
import { cookies } from "next/headers";
import { createClient as createServerClient } from "@/utils/supabase/server";

function generateExecutiveCSV(title: string, data: any[], columns: { header: string; key: string | ((row: any) => string) }[]) {
  const lines: string[] = [];

  // Branding & Header
  lines.push(`"ENTERPRISE OPERATIONS INTELLIGENCE"`);
  lines.push(`"${title}"`);
  lines.push(`"Generated At: ${new Date().toISOString()}"`);
  lines.push("");

  // KPI Summary Block
  lines.push(`"--- EXECUTIVE SUMMARY ---"`);
  lines.push(`"Total Records: ${data.length}"`);
  const openCount = data.filter(d => !d.status?.is_closed).length;
  lines.push(`"Open/Pending: ${openCount}"`);
  lines.push(`"Resolved/Closed: ${data.length - openCount}"`);
  lines.push("");

  // Table Headers
  lines.push(columns.map(c => `"${c.header}"`).join(","));

  // Data Rows
  for (const row of data) {
    const rowValues = columns.map(c => {
      let val = typeof c.key === 'function' ? c.key(row) : row[c.key];
      if (val === null || val === undefined) val = "";
      
      // Escape quotes for CSV
      const escaped = String(val).replace(/"/g, '""');
      return `"${escaped}"`;
    });
    lines.push(rowValues.join(","));
  }

  // EOF
  lines.push("");
  lines.push(`"--- END OF REPORT ---"`);

  return lines.join("\n");
}

export async function exportTicketReport(userId: string) {
  // Enforce visibility explicitly via Repository
  const tickets = await getVisibleTickets(userId);

  const columns = [
    { header: "Code", key: "code" },
    { header: "Subject", key: "subject" },
    { header: "Priority", key: (row: any) => row.priority?.priority_name || 'Unassigned' },
    { header: "Status", key: (row: any) => row.status?.status_name || 'UNKNOWN' },
    { header: "Assignee", key: (row: any) => row.assignee?.full_name || 'Unassigned' },
    { header: "Department", key: (row: any) => row.department?.name || 'Global' },
    { header: "Created At", key: "created_at" }
  ];

  const csv = generateExecutiveCSV("Ticket Operations Report", tickets, columns);
  
  return {
    filename: `Ticket_Report_${new Date().toISOString().split('T')[0]}.csv`,
    mimeType: "text/csv",
    content: csv
  };
}

export async function exportRequirementReport(userId: string) {
  // Enforce visibility explicitly via Repository
  const requirements = await getVisibleRequirements(userId);

  const columns = [
    { header: "Req Code", key: "requirement_code" },
    { header: "Title", key: "title" },
    { header: "Priority", key: (row: any) => row.priority?.priority_name || 'Standard' },
    { header: "Status", key: (row: any) => row.status?.status_name || 'UNKNOWN' },
    { header: "Analyst", key: (row: any) => row.analyst?.full_name || 'Unassigned' },
    { header: "Completion %", key: (row: any) => `${row.completion_percentage || 0}%` },
    { header: "Created At", key: "created_at" }
  ];

  const csv = generateExecutiveCSV("Requirement Delivery & Governance Report", requirements, columns);
  
  return {
    filename: `Requirement_Report_${new Date().toISOString().split('T')[0]}.csv`,
    mimeType: "text/csv",
    content: csv
  };
}
