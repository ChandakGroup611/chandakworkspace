"use client";

import React, { useState, useEffect } from "react";
import { AppCard } from "@/components/ui/AppCard";
import { AppButton } from "@/components/ui/AppButton";
import { Search, Loader2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

interface AMCAllocationsTabProps {
  amcId: string;
  isLightMode: boolean;
  onUpdate: () => void;
}

export function AMCAllocationsTab({ amcId, isLightMode, onUpdate }: AMCAllocationsTabProps) {
  const supabase = createClient();
  const [allocations, setAllocations] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [transferringId, setTransferringId] = useState<string | null>(null);
  const [totalLicenses, setTotalLicenses] = useState(0);

  useEffect(() => {
    fetchData();
  }, [amcId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: amcData } = await supabase
        .from('software_amc')
        .select('total_licenses')
        .eq('id', amcId)
        .single();
      
      if (amcData) {
        setTotalLicenses(amcData.total_licenses || 0);
      }

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
      alert("No more licenses available to allocate. Please log a Transaction to add more licenses first.");
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
      onUpdate();
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
      onUpdate();
    } catch (e: any) {
      alert("Failed to revoke: " + e.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleTransfer = async (allocationId: string, newUserId: string) => {
    if (!newUserId) {
      setTransferringId(null);
      return;
    }
    
    setProcessingId(allocationId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Revoke old
      const { error: revokeErr } = await supabase
        .from('amc_license_allocations')
        .update({ status: 'Revoked', revoked_at: new Date().toISOString() })
        .eq('id', allocationId);
      if (revokeErr) throw revokeErr;

      // Assign new
      const { error: assignErr } = await supabase
        .from('amc_license_allocations')
        .insert([{
          amc_id: amcId,
          user_id: newUserId,
          allocated_by: user.id
        }]);
      if (assignErr) throw assignErr;

      setTransferringId(null);
      await fetchData();
      onUpdate();
    } catch (e: any) {
      alert("Failed to transfer: " + e.message);
    } finally {
      setProcessingId(null);
    }
  };

  const filteredUsers = users.filter(u => 
    u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className={`p-4 rounded-xl border flex items-center justify-between bg-accent/10 border-accent/30 text-accent-secondary`}>
        <div>
          <h4 className="font-bold">License Utilization</h4>
          <p className="text-sm mt-1">Assign available licenses to users. The master record will automatically track usage.</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black">{allocations.length} / {totalLicenses > 0 ? totalLicenses : 'Unlimited'}</div>
          <div className="text-xs font-semibold uppercase opacity-70">Licenses Assigned</div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6 h-[500px]">
        {/* Active Allocations Panel */}
        <AppCard className={`flex-1 flex flex-col theme-card-structural`}>
          <div className={`p-4 border-b font-semibold bg-elevated border-border`}>
            Currently Assigned Users
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loading ? (
              <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
            ) : allocations.length === 0 ? (
              <div className="text-center p-8 text-gray-500 italic">No licenses allocated yet.</div>
            ) : (
              allocations.map(a => (
                <div key={a.id} className={`p-3 rounded-lg flex items-center justify-between theme-card-structural`}>
                  <div>
                    <div className="font-semibold text-sm">{a.user_master?.full_name}</div>
                    <div className="text-xs text-gray-500">{a.user_master?.email}</div>
                    <div className="text-[10px] text-gray-400 mt-1">Allocated: {new Date(a.allocated_at).toLocaleDateString()}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {transferringId === a.id ? (
                      <div className="flex items-center gap-2">
                        <select 
                          className={`text-xs p-1.5 rounded theme-card-structural`}
                          onChange={(e) => handleTransfer(a.id, e.target.value)}
                        >
                          <option value="">Select user...</option>
                          {users.map(u => (
                            <option key={u.id} value={u.id}>{u.full_name}</option>
                          ))}
                        </select>
                        <AppButton variant="ghost" size="sm" onClick={() => setTransferringId(null)} className="text-gray-500 hover:text-gray-700">Cancel</AppButton>
                      </div>
                    ) : (
                      <>
                        <AppButton 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setTransferringId(a.id)}
                          disabled={processingId === a.id}
                          className="text-accent hover:bg-accent/10"
                        >
                          Transfer
                        </AppButton>
                        <AppButton 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleRevoke(a.id)}
                          disabled={processingId === a.id}
                          className="text-red-500 hover:bg-red-500/10"
                        >
                          {processingId === a.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Revoke"}
                        </AppButton>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </AppCard>

        {/* Unassigned Users Panel */}
        <AppCard className={`flex-1 flex flex-col theme-card-structural`}>
          <div className={`p-4 border-b bg-elevated border-border`}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search users to allocate..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full h-10 pl-9 pr-4 rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/20 transition-all theme-card-structural text-foreground`}
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
                <div key={u.id} className={`p-3 rounded-lg flex items-center justify-between theme-card-structural hover:border-accent/50 transition-colors`}>
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
        </AppCard>
      </div>
    </div>
  );
}
