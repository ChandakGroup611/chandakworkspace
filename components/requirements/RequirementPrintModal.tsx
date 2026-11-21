"use client";

import React, { useRef, useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AppButton } from "@/components/ui/AppButton";
import { Printer, FileText } from "lucide-react";
import { formatDate, formatDateTime } from "@/components/ui/data";

interface RequirementPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  requirement: any;
}

export function RequirementPrintModal({ isOpen, onClose, requirement }: RequirementPrintModalProps) {
  const printContentRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<any>(requirement);

  useEffect(() => {
    if (!requirement) return;
    setData(requirement);
    const targetId = requirement.dbId || requirement.id;
    // If requirement doesn't have full fields (like functional_scope, requirement_approval_flow, or custom_fields)
    // and we have an id, fetch the full details asynchronously so all sections are complete
    if (targetId && (!requirement.functional_scope && !requirement.objective && !requirement.requirement_approval_flow)) {
      import("@/lib/actions/requirements").then(({ fetchRequirement }) => {
        fetchRequirement(targetId).then((fullData) => {
          if (fullData) setData(fullData);
        }).catch((err) => console.error("Error loading requirement for print:", err));
      });
    }
  }, [requirement]);

  if (!requirement && !data) return null;
  const currentReq = data || requirement;

  // Extract structured values matching Word template: New Requir_Change order Templates IN4.docx
  const reqCode = currentReq.code || currentReq.id || "REQ-DRAFT";
  const reqTitle = currentReq.title || "Untitled Requirement";
  const requestDate = formatDate(currentReq.created_at || currentReq.createdAt || currentReq.createdDateRaw);
  const programType = currentReq.software_system?.name || currentReq.softwareSystem || currentReq.system_name || currentReq.scope || "General Systems";
  const requestedBy = currentReq.requester?.full_name || currentReq.requester_name || currentReq.requester || currentReq.creator?.full_name || currentReq.createdBy || "System User";
  const departmentName = currentReq.department?.name || currentReq.department_name || currentReq.department || "Operations";
  const approvalStatus = currentReq.approval_status || currentReq.approvalStatus || currentReq.status_name || currentReq.status?.name || "Draft";
  const typeOfChange = currentReq.category?.name || currentReq.category_name || currentReq.category || currentReq.scope || "New Requirement / Enhancement";
  
  const descriptionOfChange = 
    currentReq.functional_scope ||
    currentReq.functionalScope ||
    currentReq.objective ||
    currentReq.requirement_details ||
    currentReq.requirementDetails ||
    currentReq.description ||
    "No detailed description provided.";

  const reasonForChange = 
    currentReq.requirement_reason ||
    currentReq.requirementReason ||
    currentReq.custom_fields?.business_reason ||
    currentReq.custom_fields?.custom_fields?.business_reason ||
    currentReq.objective ||
    "Business enhancement and process operational improvement.";

  const impactOnScope = 
    currentReq.budget_impact ||
    currentReq.budgetImpact ||
    currentReq.custom_fields?.budget_impact ||
    (currentReq.functional_scope ? "Defined within functional specifications" : "No scope expansion identified");

  const impactOnTimeline = 
    currentReq.tat_status ||
    currentReq.tatStatus ||
    (currentReq.due_days ? currentReq.due_days : "Standard release delivery cycle");

  const riskAssessment = 
    currentReq.dependency_notes ||
    currentReq.dependencyNotes ||
    "Low operational risk; standard UAT and staging verification required.";

  // Approver / Reviewer resolution from requirement_approval_flow
  const approvalFlow = currentReq.requirement_approval_flow || [];
  const reviewer = approvalFlow.length > 0 ? (approvalFlow[0].approver?.full_name || "Assigned Reviewer") : (currentReq.currentApprover || "Technical Analyst");
  const approvedFlow = approvalFlow.find((f: any) => f.status === "Approved") || approvalFlow[approvalFlow.length - 1];
  const approvedBy = approvedFlow ? (approvedFlow.approver?.full_name || "Management Sign-Off") : (approvalStatus.toLowerCase().includes("approved") ? "Authorized Approver" : "Pending Approval");
  const approvedDate = approvedFlow && approvedFlow.actioned_at ? formatDate(approvedFlow.actioned_at) : (approvalStatus.toLowerCase().includes("approved") ? requestDate : "Pending");

  const startDate = formatDate(currentReq.start_date || currentReq.startDate);
  const completionDate = formatDate(currentReq.expected_completion_date || currentReq.expectedCompletionDate || currentReq.due_date || currentReq.dueDate);
  const assignedTo = currentReq.assignee?.full_name || currentReq.assignee_name || currentReq.assignee || currentReq.owner?.full_name || "Technical Team";

  const amendmentVersion = currentReq.amendment_version || currentReq.amendmentVersion || 0;
  const revisedDetails = currentReq.revised_details || currentReq.revisedDetails || null;

  // Print triggering function using dedicated print window with standard A4 typography
  const handlePrint = () => {
    const printWindow = window.open("", "_blank", "width=900,height=950");
    if (!printWindow) {
      window.print();
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${reqCode} - ${reqTitle}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 15mm 18mm 15mm 18mm;
            }
            body {
              font-family: 'Calibri', 'Segoe UI', Arial, sans-serif;
              color: #0f172a;
              background: #ffffff;
              line-height: 1.4;
              font-size: 11pt;
              margin: 0;
              padding: 0;
            }
            .header-title {
              text-align: center;
              font-size: 18pt;
              font-weight: bold;
              color: #0f172a;
              margin-bottom: 24px;
              padding-bottom: 8px;
              border-bottom: 2px solid #0f172a;
              letter-spacing: 0.5px;
            }
            .meta-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 8px 24px;
              margin-bottom: 20px;
              font-size: 11pt;
            }
            .meta-item {
              display: flex;
              align-items: baseline;
            }
            .meta-label {
              font-weight: bold;
              min-width: 170px;
              color: #1e293b;
            }
            .meta-value {
              flex: 1;
              color: #0f172a;
              border-bottom: 1px dotted #94a3b8;
              padding-bottom: 1px;
            }
            .section-title {
              font-size: 12.5pt;
              font-weight: bold;
              color: #0f172a;
              margin-top: 22px;
              margin-bottom: 8px;
              border-bottom: 1px solid #cbd5e1;
              padding-bottom: 4px;
            }
            table.doc-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 6px;
              margin-bottom: 12px;
              font-size: 10.5pt;
            }
            table.doc-table th {
              background-color: #f1f5f9;
              border: 1px solid #94a3b8;
              padding: 6px 10px;
              text-align: left;
              font-weight: bold;
              color: #1e293b;
            }
            table.doc-table td {
              border: 1px solid #94a3b8;
              padding: 8px 10px;
              vertical-align: top;
            }
            .content-box {
              border: 1px solid #94a3b8;
              background-color: #f8fafc;
              padding: 10px 12px;
              min-height: 48px;
              margin-top: 4px;
              margin-bottom: 12px;
              border-radius: 2px;
              font-size: 10.5pt;
              white-space: pre-wrap;
              word-break: break-word;
            }
            .assessment-row {
              display: flex;
              align-items: baseline;
              margin-bottom: 8px;
              font-size: 11pt;
            }
            .assessment-label {
              font-weight: bold;
              min-width: 200px;
              color: #1e293b;
            }
            .assessment-value {
              flex: 1;
              border-bottom: 1px dotted #94a3b8;
              padding-bottom: 2px;
            }
            .approval-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 8px 24px;
              margin-top: 6px;
              font-size: 11pt;
            }
            .signatures-container {
              display: grid;
              grid-template-columns: 1fr 1fr 1fr;
              gap: 20px;
              margin-top: 40px;
              padding-top: 20px;
              page-break-inside: avoid;
            }
            .signature-block {
              border-top: 1px solid #475569;
              padding-top: 6px;
              text-align: center;
              font-size: 10pt;
              color: #475569;
            }
            .signature-block strong {
              display: block;
              color: #0f172a;
              font-size: 10.5pt;
              margin-bottom: 2px;
            }
            .doc-footer {
              margin-top: 30px;
              text-align: center;
              font-size: 9pt;
              color: #94a3b8;
              border-top: 1px solid #e2e8f0;
              padding-top: 8px;
            }
          </style>
        </head>
        <body>
          <div class="header-title">New Requirement / Change Order Document</div>

          <div class="meta-grid">
            <div class="meta-item">
              <span class="meta-label">Change Order Number:</span>
              <span class="meta-value">${reqCode}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Request Date:</span>
              <span class="meta-value">${requestDate}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Program type:</span>
              <span class="meta-value">${programType}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Document:</span>
              <span class="meta-value">${reqTitle}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Requested By:</span>
              <span class="meta-value">${requestedBy}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Department:</span>
              <span class="meta-value">${departmentName}</span>
            </div>
          </div>

          <div class="section-title">Revision History:</div>
          <table class="doc-table">
            <thead>
              <tr>
                <th style="width: 15%;">Version</th>
                <th style="width: 25%;">Date</th>
                <th style="width: 60%;">Description of changes</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>v1.0</td>
                <td>${requestDate}</td>
                <td>Initial requirement submission and registration</td>
              </tr>
              ${amendmentVersion > 0 ? `
              <tr>
                <td>v${amendmentVersion}.0</td>
                <td>${formatDate(currentReq.updated_at || new Date().toISOString())}</td>
                <td>${revisedDetails || "Requirement specification amendment"}</td>
              </tr>
              ` : `
              <tr>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
              </tr>
              `}
            </tbody>
          </table>

          <div class="section-title">Change Request Details</div>
          <div style="margin-bottom: 6px;">
            <strong>Type of Change:</strong> <span style="border-bottom: 1px dotted #94a3b8; padding-bottom: 1px;">${typeOfChange}</span>
          </div>

          <div style="margin-top: 10px; font-weight: bold; font-size: 10.5pt; color: #1e293b;">
            Description of Change: <span style="font-weight: normal; font-size: 9.5pt; color: #64748b;">(Detailed description of the new requirement or change)</span>
          </div>
          <div class="content-box">${descriptionOfChange}</div>

          <div style="margin-top: 10px; font-weight: bold; font-size: 10.5pt; color: #1e293b;">
            Reason for Change: <span style="font-weight: normal; font-size: 9.5pt; color: #64748b;">(Explanation of why this change is necessary)</span>
          </div>
          <div class="content-box">${reasonForChange}</div>

          <div class="section-title">Impact Assessment</div>
          <div class="assessment-row">
            <span class="assessment-label">Impact on Scope:</span>
            <span class="assessment-value">${impactOnScope}</span>
          </div>
          <div class="assessment-row">
            <span class="assessment-label">Impact on Timeline:</span>
            <span class="assessment-value">${impactOnTimeline}</span>
          </div>
          <div class="assessment-row">
            <span class="assessment-label">Risk Assessment (if any):</span>
            <span class="assessment-value">${riskAssessment}</span>
          </div>

          <div class="section-title">Approval and Implementation</div>
          <div class="approval-grid">
            <div class="meta-item">
              <span class="meta-label">Reviewed By:</span>
              <span class="meta-value">${reviewer}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Approval Status:</span>
              <span class="meta-value" style="font-weight: bold;">${approvalStatus}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Approved By:</span>
              <span class="meta-value">${approvedBy}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Approval Date:</span>
              <span class="meta-value">${approvedDate}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Implementation Start Date:</span>
              <span class="meta-value">${startDate !== "—" ? startDate : "Scheduled post-approval"}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Expected Completion Date:</span>
              <span class="meta-value">${completionDate !== "—" ? completionDate : "Scheduled release timeline"}</span>
            </div>
            <div class="meta-item" style="grid-column: span 2;">
              <span class="meta-label">Assigned To:</span>
              <span class="meta-value">${assignedTo}</span>
            </div>
          </div>

          <div class="section-title">Comments & Additional Notes</div>
          <div class="content-box" style="min-height: 54px;">
            ${currentReq.acceptance_criteria || currentReq.acceptanceCriteria || currentReq.comments || "Approved in accordance with Chandak Workspace standard operating procedures and governance protocols."}
          </div>

          <div class="signatures-container">
            <div class="signature-block">
              <strong>${requestedBy}</strong>
              Requested By / Requester
            </div>
            <div class="signature-block">
              <strong>${reviewer}</strong>
              Technical Lead / Reviewer
            </div>
            <div class="signature-block">
              <strong>${approvedBy}</strong>
              Authorizing Management
            </div>
          </div>

          <div class="doc-footer">
            Chandak Workspace Operations Document — Confidential & Proprietary — Generated on ${formatDateTime(new Date().toISOString())}
          </div>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 350);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-surface border-border">
        <DialogHeader className="px-6 py-3.5 border-b border-border bg-elevated flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-theme-icon" />
            <DialogTitle className="text-base font-bold text-foreground">
              Print Requirement / Change Order Document
            </DialogTitle>
          </div>
          <div className="flex items-center gap-2">
            <AppButton
              variant="primary"
              size="sm"
              leftIcon={<Printer className="h-4 w-4" />}
              onClick={handlePrint}
            >
              Print / Save as PDF
            </AppButton>
          </div>
        </DialogHeader>

        {/* Live Visual Print Preview */}
        <div className="flex-1 overflow-y-auto p-6 bg-sunken/40">
          <div
            ref={printContentRef}
            className="mx-auto max-w-[210mm] bg-surface p-8 shadow-sm border border-border rounded-md text-foreground"
            style={{ fontFamily: "'Calibri', 'Segoe UI', Arial, sans-serif" }}
          >
            {/* Document Header */}
            <h1 className="text-xl font-bold text-center text-heading pb-2 border-b-2 border-border mb-6">
              New Requirement / Change Order Document
            </h1>

            {/* Meta Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm mb-5">
              <div className="flex">
                <span className="font-bold w-48 text-subtle">Change Order Number:</span>
                <span className="flex-1 font-mono text-accent-soft-text border-b border-border/80 pb-0.5">{reqCode}</span>
              </div>
              <div className="flex">
                <span className="font-bold w-48 text-subtle">Request Date:</span>
                <span className="flex-1 border-b border-border/80 pb-0.5">{requestDate}</span>
              </div>
              <div className="flex">
                <span className="font-bold w-48 text-subtle">Program type:</span>
                <span className="flex-1 border-b border-border/80 pb-0.5">{programType}</span>
              </div>
              <div className="flex">
                <span className="font-bold w-48 text-subtle">Document:</span>
                <span className="flex-1 font-medium border-b border-border/80 pb-0.5 truncate" title={reqTitle}>{reqTitle}</span>
              </div>
              <div className="flex">
                <span className="font-bold w-48 text-subtle">Requested By:</span>
                <span className="flex-1 border-b border-border/80 pb-0.5">{requestedBy}</span>
              </div>
              <div className="flex">
                <span className="font-bold w-48 text-subtle">Department:</span>
                <span className="flex-1 border-b border-border/80 pb-0.5">{departmentName}</span>
              </div>
            </div>

            {/* Revision History */}
            <div className="text-sm font-bold text-heading border-b border-border pb-1 mt-5 mb-2">
              Revision History:
            </div>
            <table className="w-full border-collapse border border-border text-xs mb-4">
              <thead>
                <tr className="bg-elevated text-foreground">
                  <th className="border border-border p-2 text-left w-24">Version</th>
                  <th className="border border-border p-2 text-left w-36">Date</th>
                  <th className="border border-border p-2 text-left">Description of changes</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-border p-2 font-mono">v1.0</td>
                  <td className="border border-border p-2">{requestDate}</td>
                  <td className="border border-border p-2">Initial requirement registration and submission</td>
                </tr>
                {amendmentVersion > 0 && (
                  <tr>
                    <td className="border border-border p-2 font-mono">v{amendmentVersion}.0</td>
                    <td className="border border-border p-2">{formatDate(currentReq.updated_at || new Date().toISOString())}</td>
                    <td className="border border-border p-2">{revisedDetails || "Requirement specification revision"}</td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Change Request Details */}
            <div className="text-sm font-bold text-heading border-b border-border pb-1 mt-5 mb-2">
              Change Request Details
            </div>
            <div className="text-sm mb-2">
              <span className="font-bold text-subtle">Type of Change: </span>
              <span className="border-b border-border/80 pb-0.5">{typeOfChange}</span>
            </div>

            <div className="text-xs font-bold text-subtle mt-3 mb-1">
              Description of Change: <span className="font-normal text-muted">(Detailed description of the new requirement or change)</span>
            </div>
            <div className="border border-border rounded bg-elevated/50 p-3 text-xs min-h-[50px] whitespace-pre-wrap mb-4">
              {descriptionOfChange}
            </div>

            <div className="text-xs font-bold text-subtle mt-3 mb-1">
              Reason for Change: <span className="font-normal text-muted">(Explanation of why this change is necessary)</span>
            </div>
            <div className="border border-border rounded bg-elevated/50 p-3 text-xs min-h-[44px] whitespace-pre-wrap mb-4">
              {reasonForChange}
            </div>

            {/* Impact Assessment */}
            <div className="text-sm font-bold text-heading border-b border-border pb-1 mt-5 mb-2">
              Impact Assessment
            </div>
            <div className="space-y-1.5 text-xs mb-4">
              <div className="flex">
                <span className="font-bold w-48 text-subtle">Impact on Scope:</span>
                <span className="flex-1 border-b border-border/80 pb-0.5">{impactOnScope}</span>
              </div>
              <div className="flex">
                <span className="font-bold w-48 text-subtle">Impact on Timeline:</span>
                <span className="flex-1 border-b border-border/80 pb-0.5">{impactOnTimeline}</span>
              </div>
              <div className="flex">
                <span className="font-bold w-48 text-subtle">Risk Assessment (if any):</span>
                <span className="flex-1 border-b border-border/80 pb-0.5">{riskAssessment}</span>
              </div>
            </div>

            {/* Approval and Implementation */}
            <div className="text-sm font-bold text-heading border-b border-border pb-1 mt-5 mb-2">
              Approval and Implementation
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs mb-4">
              <div className="flex">
                <span className="font-bold w-48 text-subtle">Reviewed By:</span>
                <span className="flex-1 border-b border-border/80 pb-0.5">{reviewer}</span>
              </div>
              <div className="flex">
                <span className="font-bold w-48 text-subtle">Approval Status:</span>
                <span className="flex-1 font-semibold text-accent-soft-text border-b border-border/80 pb-0.5">{approvalStatus}</span>
              </div>
              <div className="flex">
                <span className="font-bold w-48 text-subtle">Approved By:</span>
                <span className="flex-1 border-b border-border/80 pb-0.5">{approvedBy}</span>
              </div>
              <div className="flex">
                <span className="font-bold w-48 text-subtle">Approval Date:</span>
                <span className="flex-1 border-b border-border/80 pb-0.5">{approvedDate}</span>
              </div>
              <div className="flex">
                <span className="font-bold w-48 text-subtle">Implementation Start Date:</span>
                <span className="flex-1 border-b border-border/80 pb-0.5">{startDate !== "—" ? startDate : "Scheduled"}</span>
              </div>
              <div className="flex">
                <span className="font-bold w-48 text-subtle">Expected Completion Date:</span>
                <span className="flex-1 border-b border-border/80 pb-0.5">{completionDate !== "—" ? completionDate : "Scheduled"}</span>
              </div>
              <div className="flex sm:col-span-2">
                <span className="font-bold w-48 text-subtle">Assigned To:</span>
                <span className="flex-1 border-b border-border/80 pb-0.5">{assignedTo}</span>
              </div>
            </div>

            {/* Comments & Additional Notes */}
            <div className="text-sm font-bold text-heading border-b border-border pb-1 mt-5 mb-2">
              Comments & Additional Notes
            </div>
            <div className="border border-border rounded bg-elevated/50 p-3 text-xs min-h-[44px] whitespace-pre-wrap mb-8">
              {currentReq.acceptance_criteria || currentReq.acceptanceCriteria || "Approved in accordance with Chandak Workspace standard operating procedures."}
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-3 gap-6 pt-6 mt-6 border-t border-border text-center text-xs text-muted">
              <div className="pt-2 border-t border-muted/50">
                <div className="font-bold text-foreground">{requestedBy}</div>
                <div>Requested By / Requester</div>
              </div>
              <div className="pt-2 border-t border-muted/50">
                <div className="font-bold text-foreground">{reviewer}</div>
                <div>Technical Reviewer</div>
              </div>
              <div className="pt-2 border-t border-muted/50">
                <div className="font-bold text-foreground">{approvedBy}</div>
                <div>Authorizing Authority</div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-3 border-t border-border bg-elevated flex items-center justify-between">
          <span className="text-xs text-muted">
            Format based on standard Change Order & Requirement Template
          </span>
          <div className="flex items-center gap-2">
            <AppButton variant="ghost" onClick={onClose}>
              Cancel
            </AppButton>
            <AppButton variant="primary" leftIcon={<Printer className="h-4 w-4" />} onClick={handlePrint}>
              Print / Save as PDF
            </AppButton>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
