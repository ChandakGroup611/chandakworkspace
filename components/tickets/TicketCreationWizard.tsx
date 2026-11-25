"use client";
import { toast } from 'react-toastify';

import React, { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { TicketScopeSelector } from "./TicketScopeSelector";
import { TicketFormInfra } from "./TicketFormInfra";
import { TicketFormERP } from "./TicketFormERP";
import { TicketFormOthers } from "./TicketFormOthers";
import { VoiceFieldBar } from "@/components/voice/VoiceFieldBar";
import { VoiceReceiptCard, type VoiceReceiptData } from "@/components/voice/VoiceReceiptCard";
import type { ParsedVoiceFields } from "@/lib/voice/field-parser";
import { X, ChevronLeft, Loader2 } from "lucide-react";
import { EnterpriseWizardShell } from "@/components/ui/enterprise/EnterpriseWizardShell";
import { AppButton } from "@/components/ui/AppButton";
import ChandakLoader from "@/components/ui/ChandakLoader";
import { useTheme } from "../theme/ThemeProvider";


interface TicketCreationWizardProps {
  onClose: () => void;
  onSuccess: (ticketId: string) => void;
}

export function TicketCreationWizard({ onClose, onSuccess }: TicketCreationWizardProps) {
  const [step, setStep] = useState<"SCOPE" | "FORM">("SCOPE");
  const [scope, setScope] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [voiceDraft, setVoiceDraft] = useState<Record<string, any>>({});
  const [voiceFormKey, setVoiceFormKey] = useState(0);
  const [receiptData, setReceiptData] = useState<VoiceReceiptData | null>(null);
  const { isLight: isLightMode } = useTheme();

  const handleVoiceApply = (fields: ParsedVoiceFields) => {
    const patch: Record<string, any> = {};
    const filled: string[] = [];
    if (fields.subject) { patch.subject = fields.subject; filled.push("Subject"); }
    if (fields.description) { patch.remark = fields.description; patch.requirement_description = fields.description; filled.push("Description"); }
    if (fields.businessReason) { patch.business_reason = fields.businessReason; filled.push("Business Reason"); }
    setVoiceDraft((prev) => ({ ...prev, ...patch }));
    setVoiceFormKey((k) => k + 1);
    if (filled.length > 0) toast.success(`Voice filled: ${filled.join(", ")}`);
    else toast.info("Could not match form fields. Try saying 'subject is ..., description is ...'");
    return filled;
  };

  const handleScopeSelect = (selectedScope: any) => {
    setScope(selectedScope);
    setStep("FORM");
  };

  const handleBack = () => {
    setStep("SCOPE");
    setScope(null);
  };

  const handleFormSubmit = async (data: any) => {
    if (!data.priorityId) {
      toast.warning("Operational priority is mandatory. Please select a priority.");
      return;
    }
    setIsSubmitting(true);
    try {
      const { createEnterpriseTicket } = await import("@/lib/actions/tickets");
      const { initializeAttachmentUpload } = await import("@/lib/actions/attachments");
      const supabase = createClient();
      
      const scopeType = scope?.code === "ERP" ? "ERP/SOFTWARE" : scope?.code;
      
      const payload: any = {
        scope_type: scopeType,
        title: data.subject || data.title || `Operational Incident - ${scopeType}`,
        description: data.remark || data.description || "Zero explicit content captured.",
        priority_id: data.priorityId || null,
        issue_type_id: data.issueTypeId || null,
        issue_sub_type_id: data.issueSubtypeId || null,
        category_id: data.categoryId || null,
        sub_category_id: data.subcategoryId || null,
        asset_id: data.assetId || null,
        software_system_id: data.systemId || null,
        module_id: data.moduleId || null,
        sub_module_id: data.submoduleId || null,
        custom_fields: {
          requirement_description: data.requirement_description || null,
          business_reason: data.business_reason || null
        }
      };

      if (data.isReqCategory) {
        const { createRequirement } = await import("@/lib/actions/requirements");
        const { data: { user } } = await supabase.auth.getUser();
        
        let prefix = "OTH";
        if (scopeType === "ERP/SOFTWARE") prefix = "ERP";
        else if (scopeType === "INFRA") prefix = "INF";

        const reqCode = `${prefix}-REQ-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`;

        // The immutable snapshot exactly as entered
        const intakeSnapshot = {
          scope: scopeType,
          softwareSystem: data.systemId, // We might not have the text here without a lookup, but the payload has IDs
          module: data.moduleId,
          submodule: data.submoduleId,
          category: data.categoryId,
          subCategory: data.subcategoryId,
          priority: data.priorityId,
          subject: payload.title,
          description: payload.description,
          requirementDescription: data.requirement_description,
          businessReason: data.business_reason,
          assetId: data.assetId,
          issueTypeId: data.issueTypeId,
          issueSubtypeId: data.issueSubtypeId,
          infraSpecifications: data.infraSpecifications
        };

        const reqPayload = {
          workspace_id: "",
          requirement_code: reqCode,
          title: payload.title,
          objective: payload.description,
          functional_scope: data.requirement_description || "Not provided.",
          technical_scope: undefined,
          created_by: user?.id || "",
          scope: scopeType,
          software_system_id: data.systemId || null,
          module_id: data.moduleId || null,
          sub_module_id: data.submoduleId || null,
          category_id: data.categoryId || null,
          sub_category_id: data.subcategoryId || null,
          priority_id: data.priorityId || null,
          requirement_reason: data.business_reason || null,
          requirement_details: data.requirement_description || null,
          requester_id: user?.id || null,
          intake_snapshot: intakeSnapshot,
          custom_fields: {
            ...payload,
            business_reason: data.business_reason,
            requirement_domain: data.requirement_domain || null,
            target_system: data.target_system || null,
            integrations: data.integrations || null,
            data_privacy: data.data_privacy || null,
            software_cost: data.software_cost || null,
            dev_cost: data.dev_cost || null,
            target_environment: data.target_environment || null,
            hardware_needs: data.hardware_needs || null,
            capex_amount: data.capex_amount || null,
            opex_amount: data.opex_amount || null,
            budget_impact: data.budget_impact || null
          }
        };

        const result = await createRequirement(reqPayload);

        if (result && result.id) {
          if (data.attachment) {
            try {
              const uploadRes = await initializeAttachmentUpload({
                module_type: 'requirement',
                record_id: result.id,
                file_name: data.attachment.name,
                mime_type: data.attachment.type,
                file_size: data.attachment.size
              });

              const { error: uploadError } = await supabase.storage
                .from('requirement-files')
                .uploadToSignedUrl(uploadRes.path, uploadRes.token, data.attachment);

              if (uploadError) console.error("Failed to upload attachment:", uploadError);
            } catch (attErr) {
              console.error("Failed to initialize attachment:", attErr);
            }
          }
          setReceiptData({
            receiptNo: `RCP-${result.code}`,
            module: "Requirement",
            recordCode: result.code,
            subject: payload.title,
            status: "New",
            createdAt: new Date().toLocaleString("en-IN"),
            href: `/requirements`,
          });
          return;
        }
      }

      const result = await createEnterpriseTicket(payload);

      if (result.success && result.ticket) {
        // Upload attachment if any
        if (data.attachment) {
          try {
            const uploadRes = await initializeAttachmentUpload({
              module_type: 'ticket',
              record_id: result.ticket.id,
              file_name: data.attachment.name,
              mime_type: data.attachment.type,
              file_size: data.attachment.size
            });

            // Standard Supabase JS client storage upload using the signed URL
            const { error: uploadError } = await supabase.storage
              .from(data.isReqCategory ? 'requirement-files' : 'ticket-attachments')
                .uploadToSignedUrl(uploadRes.path, uploadRes.token, data.attachment);

            if (uploadError) {
              console.error("Failed to upload attachment to signed URL:", uploadError);
            }
          } catch (attErr) {
            console.error("Failed to initialize attachment:", attErr);
          }
        }

        setReceiptData({
          receiptNo: `RCP-${result.ticket.code}`,
          module: "Ticket",
          recordCode: result.ticket.code,
          subject: payload.title,
          status: "Open",
          createdAt: new Date().toLocaleString("en-IN"),
          href: `/tickets`,
        });
      }
    } catch (err: any) {
      console.error("Critical submission error details:", err.message || err);
      toast.error(`Failed to initialize operational ticket: ${err.message || "Please verify connectivity"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <EnterpriseWizardShell
      title={
        <div className="flex items-center gap-3">
          {step === "FORM" && (
            <AppButton aria-label="Previous" 
              size="sm"
              variant="ghost"
              onClick={handleBack}
              className="p-1.5 -ml-2 rounded-full text-muted hover:text-foreground"
            >
              <ChevronLeft className="h-5 w-5" />
            </AppButton>
          )}
          <span>New Support Ticket</span>
        </div>
      }
      subtitle={
        <div className="flex items-center gap-2 mt-1">
          <div className={`h-1.5 w-1.5 rounded-full ${step === "SCOPE" ? "bg-theme-btn-primary" : "bg-muted"}`} />
          <div className={`h-1.5 w-1.5 rounded-full ${step === "FORM" ? "bg-theme-btn-primary" : "bg-muted"}`} />
          <span className="text-xs text-muted font-semibold ml-1">
            {step === "SCOPE" ? "Step 1: Category" : `Step 2: ${scope?.name || scope?.code || 'Ticket'} Details`}
          </span>
        </div>
      }
      onClose={onClose}
      size="xl"
    >

        {receiptData ? (
          <VoiceReceiptCard receipt={receiptData} onClose={() => onSuccess(receiptData.recordCode || "")} />
        ) : step === "SCOPE" ? (
          <TicketScopeSelector onSelect={handleScopeSelect} onDiscard={onClose} />
        ) : (
          <div className="relative space-y-4">
            {isSubmitting && (
              <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/80 rounded-xl">
                <ChandakLoader size="sm" title="Submitting…" subtitle="Creating support ticket" />
              </div>
            )}
            <VoiceFieldBar entityLabel="Ticket / Requirement" onApply={handleVoiceApply} />
            {scope?.code === "INFRA" && <TicketFormInfra key={`infra-${voiceFormKey}`} initialData={voiceDraft} scope={scope} onCancel={handleBack} onDiscard={onClose} onSubmit={handleFormSubmit} />}
            {scope?.code === "ERP" && <TicketFormERP key={`erp-${voiceFormKey}`} initialData={voiceDraft} scope={scope} onCancel={handleBack} onDiscard={onClose} onSubmit={handleFormSubmit} />}
            {scope?.code === "OTHERS" && <TicketFormOthers key={`others-${voiceFormKey}`} initialData={voiceDraft} scope={scope} onCancel={handleBack} onDiscard={onClose} onSubmit={handleFormSubmit} />}
          </div>
        )}
    </EnterpriseWizardShell>
  );
}
