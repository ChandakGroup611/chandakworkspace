"use client";

import React, { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { TicketScopeSelector } from "./TicketScopeSelector";
import { TicketFormInfra } from "./TicketFormInfra";
import { TicketFormERP } from "./TicketFormERP";
import { TicketFormOthers } from "./TicketFormOthers";
import { X, ChevronLeft } from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";

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
    const supabase = createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;

    try {
      const nextCode = `INC-${Math.floor(1000 + Math.random() * 9000)}`;
      
      // Determine department from user_master
      const { data: userData } = await supabase.from("user_master").select("department_id").eq("id", authUser.id).single();
      
      const statusRes = await supabase.from("workflow_states").select("id").eq("code", "ST_OPEN").single();

      const customJsonb = {
        ...data,
        flow_scope: scope,
        assigned_to: "Unassigned Operations Swarm"
      };

      const insertPayload = {
        code: nextCode,
        title: data.subject || data.title || `Operational Incident - ${scope}`,
        description: data.remark || data.description || "Zero explicit content captured.",
        department_id: userData?.department_id,
        priority_id: data.priorityId,
        status_id: statusRes.data?.id,
        creator_id: authUser.id,
        custom_fields: customJsonb
      };

      const { data: inserted, error } = await supabase
        .from("tickets")
        .insert([insertPayload])
        .select()
        .single();

      if (error) throw error;

      // Publish Enterprise Async Event Queue Triggers
      supabase.from("event_queue").insert([{
        entity_type: "ticket",
        entity_id: nextCode,
        operation: "CREATE",
        payload: { title: insertPayload.title, priority: data.priorityId }
      }]).then(() => {});

      onSuccess(nextCode);
    } catch (err) {
      console.error("Critical submission error:", err);
      alert("Failed to initialize operational ticket. Verify database connectivity.");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 backdrop-blur-sm animate-in fade-in duration-300 ${
          isLightMode ? "bg-gray-900/40" : "bg-[#070913]/80"
        }`}
        onClick={onClose}
      />
      
      {/* Container */}
      <div className={`relative w-full max-w-4xl max-h-[90vh] backdrop-blur-2xl border rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 ${
        isLightMode ? "bg-white border-gray-200" : "bg-[#0f172a]/90 border-white/10"
      }`}>
        
        {/* Header */}
        <div className={`flex items-center justify-between px-8 py-6 border-b ${
          isLightMode ? "border-gray-100 bg-gray-50/30" : "border-white/5 bg-white/[0.02]"
        }`}>
          <div className="flex items-center gap-4">
            {step === "FORM" && (
              <button 
                onClick={handleBack}
                className={`p-2 rounded-full transition-colors ${
                  isLightMode ? "hover:bg-gray-100 text-gray-500 hover:text-gray-900" : "hover:bg-white/5 text-gray-400 hover:text-white"
                }`}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            <div>
              <h2 className={`text-xl font-bold ${isLightMode ? "text-gray-900" : "text-white"}`}>Initialize Operational Ticket</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <div className={`h-1.5 w-1.5 rounded-full ${step === "SCOPE" ? "bg-indigo-500" : "bg-indigo-500/30"}`} />
                <div className={`h-1.5 w-1.5 rounded-full ${step === "FORM" ? "bg-indigo-500" : "bg-indigo-500/30"}`} />
                <span className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold ml-2">
                  {step === "SCOPE" ? "Step 1: Classification" : `Step 2: ${scope} Intake`}
                </span>
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className={`p-2 rounded-full transition-colors ${
              isLightMode ? "hover:bg-gray-100 text-gray-500 hover:text-gray-900" : "hover:bg-white/5 text-gray-400 hover:text-white"
            }`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {step === "SCOPE" ? (
            <TicketScopeSelector onSelect={handleScopeSelect} />
          ) : (
            <>
              {scope?.code === "INFRA" && <TicketFormInfra scope={scope} onCancel={handleBack} onSubmit={handleFormSubmit} />}
              {scope?.code === "ERP" && <TicketFormERP scope={scope} onCancel={handleBack} onSubmit={handleFormSubmit} />}
              {scope?.code === "OTHERS" && <TicketFormOthers scope={scope} onCancel={handleBack} onSubmit={handleFormSubmit} />}
            </>
          )}
        </div>

        {/* Footer info */}
        <div className={`px-8 py-4 border-t flex items-center justify-between text-[10px] text-gray-500 ${
          isLightMode ? "bg-gray-50/50 border-gray-100" : "bg-white/[0.01] border-white/5"
        }`}>
          <span>Enterprise Governance Engine v4.2</span>
          <span>Role-Based Access Control Enforced</span>
        </div>
      </div>
    </div>
  );
}
