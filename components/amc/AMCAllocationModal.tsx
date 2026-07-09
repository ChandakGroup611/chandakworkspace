"use client";

import React, { useState, useEffect } from "react";
import { AppCard } from "@/components/ui/AppCard";
import { AppButton } from "@/components/ui/AppButton";
import { AppInput } from "@/components/ui/AppInput";
import { X, Search, Trash2, ShieldCheck, Loader2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useTheme } from "@/components/theme/ThemeProvider";

interface AMCAllocationModalProps {
  amcId: string;
  isLightMode: boolean;
  onClose: () => void;
  onAllocated: () => void;
}

export function AMCAllocationModal({ amcId, isLightMode, onClose, onAllocated }: AMCAllocationModalProps) {
  const supabase = createClient();
  const [allocations, setAllocations] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [totalLicenses, setTotalLicenses] = useState(0);

  useEffect(() => {
    fetchData();
  }, [amcId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch AMC details
      const { data: amcData } = await supabase
        .from('software_amc')
        .select('total_licenses')
        .eq('id', amcId)
        .single();
      
      if (amcData) {
        setTotalLicenses(amcData.total_licenses || 0);
      }

      // Fetch active allocations
      const { data: allocData } = await supabase
        .from('amc_license_allocations')
        .select(`
          id, allocated_at, 
          user_master:user_id (id, full_name, email, department_id),
          allocator:allocated_by (full_name)
        `)
        .eq('amc_id', amcId)
        .eq('status', 'Active');
      
      setAllocations(allocData || []);

      // Fetch users for assignment (excluding already assigned)
      const assignedUserIds = (allocData || []).map((a: any) => a.user_master?.id);
      
      let userQuery = supabase
        .from('user_master')
        .select('id, full_name, email')
        .eq('is_active', true)
        .order('full_name');
        
      const { data: userData } = await userQuery;
      
      if (userData) {
        setUsers(userData.filter(u => !assignedUserIds.includes(u.id)));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAllocate = async (userId: string) => {
    if (allocations.length >= totalLicenses && totalLicenses > 0) {
      alert("No more licenses available to allocate. Please purchase more or revoke existing ones.");
      return;
    }
    
    setProcessingId(userId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('amc_license_allocations')
        .insert([{
          amc_id: amcId,
          user_id: userId,
          allocated_by: user.id
        }]);

      if (error) throw error;
      
      await fetchData();
      onAllocated();
    } catch (e: any) {
      alert("Failed to allocate: " + e.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleRevoke = async (allocationId: string) => {
    if (!confirm("Are you sure you want to revoke this license?")) return;
    
    setProcessingId(allocationId);
    try {
      const { error } = await supabase
        .from('amc_license_allocations')
        .update({ status: 'Revoked', revoked_at: new Date().toISOString() })
        .eq('id', allocationId);

      if (error) throw error;
      
      await fetchData();
      onAllocated();
    } catch (e: any) {
      alert("Failed to revoke: " + e.message);
    } finally {
      setProcessingId(null);
    }
  };

  const filteredUsers = users.filter(u => 
    u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <AppCard className={`relative w-full max-w-4xl h-[80vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200 ${isLightMode ? 'bg-white' : 'bg-[#0A0D14]'}`}>
        
        <div className={`flex items-center justify-between p-6 border-b ${isLightMode ? 'border-gray-200' : 'border-white/10'}`}>
          <div>
            <h3 className="text-xl font-bold text-accent">License Allocation</h3>
            <p className="text-sm text-gray-500 mt-1">
              {allocations.length} / {totalLicenses > 0 ? totalLicenses : 'Unlimited'} Licenses Assigned
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Active Allocations Panel */}
          <div className={`flex-1 border-r flex flex-col ${isLightMode ? 'border-gray-200' : 'border-white/10'}`}>
            <div className={`p-4 border-b font-semibold ${isLightMode ? 'bg-gray-50 border-gray-200' : 'bg-white/5 border-white/10'}`}>
              Currently Assigned Users
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loading ? (
                <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
              ) : allocations.length === 0 ? (
                <div className="text-center p-8 text-gray-500 italic">No licenses allocated yet.</div>
              ) : (
                allocations.map(a => (
                  <div key={a.id} className={`p-3 rounded-lg border flex items-center justify-between ${isLightMode ? 'bg-white border-gray-200' : 'bg-[#0A0D14] border-white/10'}`}>
                    <div>
                      <div className="font-semibold text-sm">{a.user_master?.full_name}</div>
                      <div className="text-xs text-gray-500">{a.user_master?.email}</div>
                      <div className="text-[10px] text-gray-400 mt-1">Allocated: {new Date(a.allocated_at).toLocaleDateString()}</div>
                    </div>
                    <AppButton 
                      variant="outline" 
                      size="sm" 
                      className="text-red-500 border-red-500/20 hover:bg-red-500/10"
                      onClick={() => handleRevoke(a.id)}
                      disabled={processingId === a.id}
                    >
                      {processingId === a.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Revoke"}
                    </AppButton>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Unassigned Users Panel */}
          <div className="flex-1 flex flex-col">
            <div className={`p-4 border-b ${isLightMode ? 'bg-gray-50 border-gray-200' : 'bg-white/5 border-white/10'}`}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search users to allocate..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full h-10 pl-9 pr-4 rounded-lg text-sm border outline-none focus:ring-2 focus:ring-accent/20 transition-all ${isLightMode ? 'bg-white border-gray-200 text-gray-900' : 'bg-white/5 border-white/10 text-white'}`}
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loading ? (
                <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center p-8 text-gray-500 italic">No unassigned users found.</div>
              ) : (
                filteredUsers.map(u => (
                  <div key={u.id} className={`p-3 rounded-lg border flex items-center justify-between ${isLightMode ? 'bg-white border-gray-200 hover:border-accent/50' : 'bg-[#0A0D14] border-white/10 hover:border-accent/50'} transition-colors`}>
                    <div>
                      <div className="font-semibold text-sm">{u.full_name}</div>
                      <div className="text-xs text-gray-500">{u.email}</div>
                    </div>
                    <AppButton 
                      variant="primary" 
                      size="sm" 
                      onClick={() => handleAllocate(u.id)}
                      disabled={processingId === u.id || (allocations.length >= totalLicenses && totalLicenses > 0)}
                    >
                      {processingId === u.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Allocate"}
                    </AppButton>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </AppCard>
    </div>
  );
}
