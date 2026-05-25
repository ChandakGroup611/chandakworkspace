"use client";

import React, { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { TicketScopeSelector } from "./TicketScopeSelector";
import { TicketFormInfra } from "./TicketFormInfra";
import { TicketFormERP } from "./TicketFormERP";
import { TicketFormOthers } from "./TicketFormOthers";
import { X, ChevronLeft } from "lucide-react";
import { EnterpriseWizardShell } from "@/components/ui/enterprise/EnterpriseWizardShell";
import { useTheme } from "../theme/ThemeProvider";


interface TicketCreationWizardProps {
  onClose: () => void;
  onSuccess: (ticketId: string) => void;
}

export function TicketCreationWizard({ onClose, onSuccess }: TicketCreationWizardProps) {
  const [step, setStep] = useState<"SCOPE" | "FORM">("SCOPE");
  const [scope, setScope] = useState<any | null>(null);
  const { theme } = useTheme();
  const isLightMode = theme === "executive-light";

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
              .from('ticket-attachments')
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
            <button 
              onClick={handleBack}
              className={`p-1.5 -ml-2 rounded-full transition-colors ${
                isLightMode ? "hover:bg-gray-100 text-gray-500 hover:text-gray-900" : "hover:bg-white/5 text-gray-400 hover:text-white"
              }`}
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}
          <span>Initialize Operational Ticket</span>
        </div>
      }
      subtitle={
        <div className="flex items-center gap-2 mt-1">
          <div className={`h-1.5 w-1.5 rounded-full ${step === "SCOPE" ? "bg-indigo-500" : "bg-indigo-500/30"}`} />
          <div className={`h-1.5 w-1.5 rounded-full ${step === "FORM" ? "bg-indigo-500" : "bg-indigo-500/30"}`} />
          <span className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold ml-2">
            {step === "SCOPE" ? "Step 1: Classification" : `Step 2: ${scope?.name || scope?.code || 'Form'} Intake`}
          </span>
        </div>
      }
      onClose={onClose}
      size="md"
      footer={
        <div className={`px-8 py-4 w-full border-t flex items-center justify-between text-[10px] text-gray-500 ${
          isLightMode ? "bg-gray-50/50 border-gray-100" : "bg-transparent border-white/5"
        }`}>
          <span>Enterprise Governance Engine v4.2</span>
          <span>Role-Based Access Control Enforced</span>
        </div>
      }
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
