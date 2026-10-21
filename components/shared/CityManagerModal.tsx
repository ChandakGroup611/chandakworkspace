"use client";

import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { createClient } from "@/utils/supabase/client";
import { Trash2, Power } from "lucide-react";
import { AppButton } from "@/components/ui/AppButton";
import { saveMasterEntity, deleteMasterEntity } from "@/lib/actions/masters";
import { EnterpriseModalShell } from "@/components/ui/enterprise/EnterpriseModalShell";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { StatusBadge } from "@/components/ui/data";

interface CityManagerModalProps {
  stateName: string;
  onClose: () => void;
  onCityChanged: () => void;
}

export function CityManagerModal({ stateName, onClose, onCityChanged }: CityManagerModalProps) {
  const supabase = createClient();
  const [cities, setCities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  useEffect(() => {
    fetchCities();
  }, [stateName]);

  const fetchCities = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("master_cities")
        .select("*")
        .eq("state_name", stateName)
        .order("city_name");
      if (error) throw error;
      setCities(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (city: any) => {
    try {
      const res = await saveMasterEntity("master_cities", { is_active: !city.is_active }, city.id);
      if (!res.success) throw new Error(res.error);
      await fetchCities();
      onCityChanged();
    } catch (e: any) {
      toast.error("Error updating city: " + e.message);
    }
  };

  const handleDeleteClick = async (city: any) => {
    try {
      // Check if city is in use
      const { data: isInUse, error: rpcError } = await supabase.rpc("check_city_in_use", {
        p_city_name: city.city_name
      });
      if (rpcError) throw rpcError;

      if (isInUse) {
        toast.error(`Cannot delete '${city.city_name}' because it is currently assigned to a vendor or AMC. Please deactivate it instead.`);
        return;
      }

      setDeleteTarget(city);
    } catch (e: any) {
      toast.error("Error checking city: " + e.message);
    }
  };

  const executeDelete = async () => {
    if (!deleteTarget) return;
    const city = deleteTarget;
    setDeleteTarget(null);

    try {
      const res = await deleteMasterEntity("master_cities", city.id, true);
      if (!res.success) throw new Error(res.error);
      
      toast.success("City deleted successfully");
      await fetchCities();
      onCityChanged();
    } catch (e: any) {
      toast.error("Error deleting city: " + e.message);
    }
  };

  return (
    <>
      <EnterpriseModalShell
        open={true}
        onClose={onClose}
        size="md"
        title={`Manage cities for ${stateName}`}
      >
        <div className="max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="text-center py-8 text-xs text-muted">Loading cities...</div>
          ) : cities.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted">No cities registered for this state yet.</div>
          ) : (
            <div className="space-y-2">
              {cities.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border bg-surface hover:bg-hover transition-colors group"
                >
                  <div className="min-w-0 pr-2">
                    <div className="font-semibold text-foreground text-xs flex items-center gap-2">
                      <span className="truncate">{c.city_name}</span>
                      {!c.is_active && (
                        <StatusBadge status="Inactive" tone="danger" size="sm" />
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <AppButton
                      variant="outline"
                      size="sm"
                      onClick={() => toggleStatus(c)}
                      className="px-2.5 py-1 h-7 text-xs font-medium flex items-center gap-1.5"
                    >
                      <Power className="h-3 w-3" />
                      {c.is_active ? "Deactivate" : "Activate"}
                    </AppButton>
                    <AppButton
                      variant="destructive"
                      size="icon"
                      aria-label={`Delete city ${c.city_name}`}
                      onClick={() => handleDeleteClick(c)}
                      className="h-7 w-7 p-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </AppButton>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </EnterpriseModalShell>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={executeDelete}
        title="Delete city"
        description={
          deleteTarget
            ? `Are you sure you want to delete '${deleteTarget.city_name}'?`
            : undefined
        }
        confirmLabel="Delete"
        tone="danger"
      />
    </>
  );
}

export default CityManagerModal;
