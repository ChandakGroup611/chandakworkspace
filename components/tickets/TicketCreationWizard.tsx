"use client";

import React, { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { TicketScopeSelector } from "./TicketScopeSelector";
import { TicketFormInfra } from "./TicketFormInfra";
import { TicketFormERP } from "./TicketFormERP";
import { TicketFormOthers } from "./TicketFormOthers";
import { X, ChevronLeft } from "lucide-react";
import { EnterpriseWizardShell } from "@/components/ui/enterprise/EnterpriseWizardShell";
import { AppButton } from "@/components/ui/AppButton";
import { useTheme } from "../theme/ThemeProvider";


interface TicketCreationWizardProps {
  onClose: () => void;
  onSuccess: (ticketId: string) => void;
}

export function TicketCreationWizard({ onClose, onSuccess }: TicketCreationWizardProps) {
  const [step, setStep] = useState<"SCOPE" | "FORM">("SCOPE");
  const [scope, setScope] = useState<any | null>(null);
  const { theme } = useTheme();
  const isLightMode = ["light-neumorphic", "glassmorphism", "pure-white"].includes(theme);

  const handleScopeSelect = (selectedScope: any) => {
    setScope(selectedScope);
    setStep("FORM");
  };

  const handleBack = () => {
    setStep("SCOPE");
    setScope(null);
  };

  const handleFormSubmit = async (data: any) => {
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
          businessReason: data.business_reason
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
            business_reason: data.business_reason
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
          onSuccess(result.code);
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

        onSuccess(result.ticket.code);
      }
    } catch (err: any) {
      console.error("Critical submission error details:", err.message || err);
      alert(`Failed to initialize operational ticket: ${err.message || "Please verify connectivity"}`);
    }
  };

  return (
    <EnterpriseWizardShell
      title={
        <div className="flex items-center gap-3">
          {step === "FORM" && (
            <AppButton 
              size="sm"
              variant="ghost"
              onClick={handleBack}
              className={`p-1.5 -ml-2 rounded-full ${
                "text-muted"
              }`}
            >
              <ChevronLeft className="h-6 w-6" />
            </AppButton>
          )}
          <span>Initialize Operational Ticket</span>
        </div>
      }
      subtitle={
        <div className="flex items-center gap-2 mt-1">
          <div className={`h-1.5 w-1.5 rounded-full ${step === "SCOPE" ? "bg-accent" : "bg-accent/30"}`} />
          <div className={`h-1.5 w-1.5 rounded-full ${step === "FORM" ? "bg-accent" : "bg-accent/30"}`} />
          <span className="text-xs text-gray-500 uppercase tracking-widest font-semibold ml-2">
            {step === "SCOPE" ? "Step 1: Classification" : `Step 2: ${scope?.name || scope?.code || 'Form'} Intake`}
          </span>
        </div>
      }
      onClose={onClose}
      size="xl"
    >

        {step === "SCOPE" ? (
          <TicketScopeSelector onSelect={handleScopeSelect} />
        ) : (
          <>
            {scope?.code === "INFRA" && <TicketFormInfra scope={scope} onCancel={handleBack} onSubmit={handleFormSubmit} />}
            {scope?.code === "ERP" && <TicketFormERP scope={scope} onCancel={handleBack} onSubmit={handleFormSubmit} />}
            {scope?.code === "OTHERS" && <TicketFormOthers scope={scope} onCancel={handleBack} onSubmit={handleFormSubmit} />}
          </>
        )}
    </EnterpriseWizardShell>
  );
}

