"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AppButton } from "@/components/ui/AppButton";
import { CheckCircle, XCircle, PauseCircle, Loader2 } from "lucide-react";

export function QuickApprovalModal({ 
  reqId, 
  reqTitle,
  currentUserId, 
  onClose, 
  onSuccess 
}: { 
  reqId: string;
  reqTitle: string;
  currentUserId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);
  const [reqDetails, setReqDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    const fetchDetails = async () => {
      try {
        const { fetchRequirement } = await import("@/lib/actions/requirements");
        const data = await fetchRequirement(reqId);
        setReqDetails(data);
      } catch (err) {
        console.error("Failed to load requirement details", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [reqId]);

  const submit = async (action: 'Approve' | 'Reject' | 'Hold') => {
    if (!remarks.trim()) {
      alert("Remarks are mandatory for approval actions.");
      return;
    }
    setSaving(true);
    try {
      const { processApprovalAction } = await import("@/lib/actions/requirements");
      await processApprovalAction(reqId, action, remarks, currentUserId);
      onSuccess();
    } catch (err: any) {
      alert(err.message || "Failed to process approval");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Requirement Approval: {reqTitle}</DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
          </div>
        ) : reqDetails ? (
          <div className="space-y-6 pt-4">
            
            {/* Requirement Details Read-Only View */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm border-b pb-4 border-gray-200 dark:border-white/10">
               <div>
                  <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">System / Module</span>
                  <div className="font-medium">{reqDetails.software_system?.name || '-'} / {reqDetails.module?.name || '-'}</div>
               </div>
               <div>
                  <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Priority & Stage</span>
                  <div className="font-medium text-amber-600">{reqDetails.priority?.priority_name || '-'} • {reqDetails.current_stage || '-'}</div>
               </div>
               <div className="md:col-span-2">
                  <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Scope</span>
                  <div className="bg-gray-50 dark:bg-white/5 p-3 rounded-md text-gray-800 dark:text-gray-200">{reqDetails.scope || '-'}</div>
               </div>
               <div className="md:col-span-2">
                  <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Objective</span>
                  <div className="bg-gray-50 dark:bg-white/5 p-3 rounded-md text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{reqDetails.objective || '-'}</div>
               </div>
            </div>

            {/* Approval Action Form */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Mandatory Remarks *
              </label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full text-sm p-3 border border-gray-300 dark:border-white/10 rounded-md bg-white dark:bg-[#0a0d14] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:ring-accent focus:border-accent shadow-inner min-h-[100px]"
                rows={3}
                placeholder="Enter your approval, rejection, or hold remarks here..."
              />
            </div>
          <div className="flex flex-wrap gap-2 justify-end pt-2 border-t border-gray-200 dark:border-white/10">
            <AppButton variant="secondary" onClick={() => submit('Hold')} isLoading={saving} leftIcon={<PauseCircle className="h-4 w-4"/>}>Hold</AppButton>
            <AppButton variant="destructive" onClick={() => submit('Reject')} isLoading={saving} leftIcon={<XCircle className="h-4 w-4"/>}>Reject</AppButton>
            <AppButton variant="primary" onClick={() => submit('Approve')} isLoading={saving} leftIcon={<CheckCircle className="h-4 w-4"/>}>Approve</AppButton>
          </div>
          </div>
        ) : (
          <div className="py-4 text-center text-rose-500">Failed to load requirement details.</div>
        )}
      </DialogContent>
    </Dialog>
  );
}
