"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { X, Trash2, Power } from "lucide-react";
import { AppButton } from "@/components/ui/AppButton";
import { saveMasterEntity, deleteMasterEntity } from "@/lib/actions/masters";

interface CityManagerModalProps {
  stateName: string;
  onClose: () => void;
  onCityChanged: () => void;
}

export function CityManagerModal({ stateName, onClose, onCityChanged }: CityManagerModalProps) {
  const supabase = createClient();
  const [cities, setCities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
      alert("Error updating city: " + e.message);
    }
  };

  const handleDelete = async (city: any) => {
    try {
      // Check if city is in use
      const { data: isInUse, error: rpcError } = await supabase.rpc("check_city_in_use", {
        p_city_name: city.city_name
      });
      if (rpcError) throw rpcError;

      if (isInUse) {
        alert(`Cannot delete '${city.city_name}' because it is currently assigned to a vendor or AMC. Please deactivate it instead.`);
        return;
      }

      if (!confirm(`Are you sure you want to delete '${city.city_name}'?`)) return;

      const res = await deleteMasterEntity("master_cities", city.id, true);
      if (!res.success) throw new Error(res.error);
      
      await fetchCities();
      onCityChanged();
    } catch (e: any) {
      alert("Error deleting city: " + e.message);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="theme-card-structural w-full max-w-lg rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between p-6 border-b border-border bg-gray-50/50 shrink-0">
          <h2 className="text-xl font-black text-foreground">
            Manage Cities for {stateName}
          </h2>
          <AppButton variant="destructive" onClick={onClose} className="p-2 rounded-full hover:bg-red-500/10 text-gray-500 hover:text-red-500 transition-colors">
            <X className="h-6 w-6" />
          </AppButton>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="text-center py-8 text-gray-500 font-medium">Loading cities...</div>
          ) : cities.length === 0 ? (
            <div className="text-center py-8 text-gray-500 font-medium">No cities registered for this state yet.</div>
          ) : (
            <div className="space-y-3">
              {cities.map(c => (
                <div key={c.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-white shadow-sm group">
                  <div>
                    <div className="font-bold text-foreground text-sm flex items-center gap-2">
                      {c.city_name}
                      {!c.is_active && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">INACTIVE</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                    <AppButton variant="secondary"
                      onClick={() => toggleStatus(c)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                        c.is_active 
                          ? 'bg-amber-50 text-amber-600 hover:bg-amber-100' 
                          : 'bg-green-50 text-green-600 hover:bg-green-100'
                      }`}
                    >
                      <Power className="h-3.5 w-3.5" />
                      {c.is_active ? 'Deactivate' : 'Activate'}
                    </AppButton>
                    <AppButton variant="secondary"
                      onClick={() => handleDelete(c)}
                      className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                      title="Delete City"
                    >
                      <Trash2 className="h-4 w-4" />
                    </AppButton>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
