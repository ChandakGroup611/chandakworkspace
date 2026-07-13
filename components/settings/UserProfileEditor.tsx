"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import { AppCard, AppCardHeader, AppCardTitle, AppCardContent } from "@/components/ui/AppCard";
import { AppInput } from "@/components/ui/AppInput";
import { AppButton } from "@/components/ui/AppButton";
import { 
  User, Mail, Building2, Briefcase, Users, Camera, Check, AlertCircle, Loader2, Lock, BadgeCheck, Building, ChevronDown 
} from "lucide-react";

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  profile_photo: string;
  user_code: string;
  designation_id: string;
  department_id: string;
  manager_id: string;
  is_active: boolean;
  department?: { name: string } | null;
  designation?: { name: string } | null;
  role?: { name: string } | null;
  manager?: { full_name: string, profile_photo: string } | null;
}

const PRESET_AVATARS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=200",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=200",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200",
  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=200",
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200",
  "https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&q=80&w=200",
  "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=200",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=200",
  "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=200",
  "https://images.unsplash.com/photo-1552058544-f2b08422138a?auto=format&fit=crop&q=80&w=200",
  "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200",
  "https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&q=80&w=200",
  "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?auto=format&fit=crop&q=80&w=200",
];

const getAvatarUrl = (name: string, photo?: string | null) => {
  if (photo && photo.trim() !== '') return photo;
  const seed = encodeURIComponent(name || 'User');
  return `https://api.dicebear.com/7.x/initials/svg?seed=${seed}&backgroundColor=1e293b,0f172a&textColor=ffffff`;
};

export default function UserProfileEditor() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isSetupMode = searchParams.get('setup') === 'true';
  const supabase = createClient();
  const { roleCode } = usePermissions();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile data
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Setup options (if in setup mode)
  const [departments, setDepartments] = useState<any[]>([]);
  const [designations, setDesignations] = useState<any[]>([]);
  const [managers, setManagers] = useState<any[]>([]);
  
  // Setup selections
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedDesig, setSelectedDesig] = useState("");
  const [selectedManager, setSelectedManager] = useState("");
  const [isSavingOrg, setIsSavingOrg] = useState(false);
  const [managerDropdownOpen, setManagerDropdownOpen] = useState(false);
  const managerDropdownRef = useRef<HTMLDivElement>(null);

  // Form state
  const [formPhoto, setFormPhoto] = useState("");
  const [photoUploading, setPhotoUploading] = useState(false);

  // Notifications
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError) throw new Error("Auth Error: " + authError.message);
      if (!authUser) throw new Error("No authenticated user");

      const { data, error } = await supabase
        .from("user_master")
        .select(`
          *,
          department:departments!fk_user_master_department(name),
          designation:designations!fk_user_master_designation(name),
          role:roles!fk_user_master_role(name),
          manager:manager_id(full_name, profile_photo)
        `)
        .eq("id", authUser.id)
        .single();

      if (error) {
          throw new Error(`Database Error: ${error.message}`);
      }

      setProfile(data as any);
      setFormPhoto(data.profile_photo || "");
      
      const missingDetails = !data.department_id || !data.designation_id || !data.manager_id;
      
      if (missingDetails) {
        // Fetch masters for onboarding setup
        const [deptRes, desigRes, usersRes] = await Promise.all([
          supabase.from("departments").select("id, name").eq("is_active", true).order("name"),
          supabase.from("designations").select("id, name, department_id").eq("is_active", true).order("name"),
          supabase.from("user_master").select("id, full_name, profile_photo, role_id").eq("is_active", true).neq("id", authUser.id)
        ]);
        
        if (deptRes.data) setDepartments(deptRes.data);
        if (desigRes.data) setDesignations(desigRes.data);
        if (usersRes.data) {
           const { data: roles } = await supabase.from("roles").select("id, code");
           const viewerRoleId = roles?.find(r => r.code === "VIEWER")?.id;
           setManagers(usersRes.data.filter(u => u.role_id !== viewerRoleId));
        }
      }

      setLoading(false);
    } catch (err: any) {
      console.error("Error loading profile:", err?.message || JSON.stringify(err));
      setErrorMsg(err?.message || "Failed to load profile details");
      setLoading(false);
    }
  };
  
  // Close manager dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (managerDropdownRef.current && !managerDropdownRef.current.contains(event.target as Node)) {
        setManagerDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const triggerToast = (msg: string, isError = false) => {
    if (isError) {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(null), 3000);
    } else {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      triggerToast("Only image file formats are allowed.", true);
      return;
    }

    setPhotoUploading(true);
    try {
      const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!authUser) throw new Error("Unauthenticated");

      const fileExt = file.name.split(".").pop();
      const fileName = `${authUser.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("profiles")
        .upload(fileName, file, { cacheControl: "3600", upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("profiles")
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from("user_master")
        .update({ profile_photo: publicUrl, updated_at: new Date().toISOString() })
        .eq("id", authUser.id);

      if (updateError) throw updateError;

      setFormPhoto(publicUrl);
      setProfile(prev => prev ? { ...prev, profile_photo: publicUrl } : null);
      triggerToast("Profile picture updated successfully!");
    } catch (err: any) {
      console.error("Upload error:", err);
      triggerToast(`Upload failed: ${err.message || err}`, true);
    } finally {
      setPhotoUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handlePresetAvatarSelect = async (avatarUrl: string) => {
    if (!profile) return;
    setPhotoUploading(true);
    try {
      const { error: updateError } = await supabase
        .from("user_master")
        .update({ profile_photo: avatarUrl, updated_at: new Date().toISOString() })
        .eq("id", profile.id);

      if (updateError) throw updateError;

      setFormPhoto(avatarUrl);
      setProfile(prev => prev ? { ...prev, profile_photo: avatarUrl } : null);
      triggerToast("Profile picture updated to preset!");
    } catch (err: any) {
      console.error("Update error:", err);
      triggerToast(`Update failed: ${err.message || err}`, true);
    } finally {
      setPhotoUploading(false);
    }
  };
  
  const handleCompleteSetup = async () => {
    if (!profile) return;
    if (!selectedDept || !selectedDesig || !selectedManager) {
       triggerToast("Please complete all organizational details.", true);
       return;
    }
    
    setIsSavingOrg(true);
    try {
      const { error } = await supabase
        .from("user_master")
        .update({
          department_id: selectedDept,
          designation_id: selectedDesig,
          manager_id: selectedManager,
          updated_at: new Date().toISOString()
        })
        .eq("id", profile.id);

      if (error) throw error;
      
      triggerToast("Profile setup completed successfully!");
      setTimeout(() => {
        router.push("/");
      }, 1000);
    } catch (err: any) {
      console.error("Save error:", err);
      triggerToast(err.message || "Failed to save details", true);
      setIsSavingOrg(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
        <p className="text-sm text-muted">Loading profile data...</p>
      </div>
    );
  }

  const isMissingDetails = !profile?.department_id || !profile?.designation_id || !profile?.manager_id;
  const selectedManagerObj = managers.find(m => m.id === selectedManager);

  return (
    <div className="w-full relative">
      {/* Toast notifications */}
      {successMsg && (
        <div className="fixed bottom-6 right-6 z-[100] flex items-center gap-2 rounded-xl bg-emerald-500/90 backdrop-blur-md text-white px-5 py-3.5 shadow-2xl animate-in slide-in-from-bottom-5 duration-300">
          <Check className="h-4 w-4" />
          <span className="text-sm font-semibold">{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="fixed bottom-6 right-6 z-[100] flex items-center gap-2 rounded-xl bg-rose-500/90 backdrop-blur-md text-white px-5 py-3.5 shadow-2xl animate-in slide-in-from-bottom-5 duration-300">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm font-semibold">{errorMsg}</span>
        </div>
      )}
      
      {isMissingDetails && (
        <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between animate-in slide-in-from-top-4">
           <div>
              <h3 className="text-amber-500 font-semibold text-sm">Action Required: Complete Your Profile</h3>
              <p className="text-amber-500/80 text-xs mt-1">Please fill out your organizational details below to proceed to your dashboard.</p>
           </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Avatar & Summary */}
        <div className="lg:col-span-4 space-y-6">
          <AppCard className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-xl">
            {/* Abstract Background Banner */}
            <div className="h-32 w-full bg-gradient-to-r from-accent/20 via-accent/10 to-transparent relative overflow-hidden">
              <div className="absolute inset-0 bg-grid-white/[0.02]" />
            </div>
            
            <div className="px-6 pb-6 relative">
              {/* Avatar Upload Container */}
              <div className="flex justify-center -mt-16 mb-4 relative z-10">
                <div 
                  className="relative group cursor-pointer"
                  onClick={() => !photoUploading && fileInputRef.current?.click()}
                >
                  <div className={`h-32 w-32 rounded-full p-1 bg-card shadow-xl transition-transform duration-300 ${!photoUploading ? 'group-hover:scale-105' : ''}`}>
                    <div className="h-full w-full rounded-full overflow-hidden relative bg-elevated">
                      <img 
                        src={getAvatarUrl(profile?.full_name || "User", formPhoto)}
                        alt="Profile"
                        className="h-full w-full object-cover transition-opacity duration-300 group-hover:opacity-60"
                        onError={(e) => { (e.target as any).src = getAvatarUrl(profile?.full_name || "User"); }}
                      />
                      {/* Hover Overlay */}
                      {!photoUploading && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <Camera className="h-8 w-8 text-white drop-shadow-md mb-1" />
                          <span className="text-xs font-medium text-white drop-shadow-md">Upload</span>
                        </div>
                      )}
                      {/* Loading Overlay */}
                      {photoUploading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                          <Loader2 className="h-8 w-8 text-white animate-spin" />
                        </div>
                      )}
                    </div>
                  </div>
                  <input 
                    ref={fileInputRef}
                    type="file" 
                    accept="image/*" 
                    onChange={handlePhotoUpload}
                    disabled={photoUploading}
                    className="hidden" 
                  />
                  {/* Status Badge */}
                  <div className="absolute bottom-1 right-2 h-5 w-5 rounded-full bg-emerald-500 border-2 border-card flex items-center justify-center shadow-sm" title={profile?.is_active ? "Active" : "Inactive"}>
                     <div className="h-2 w-2 bg-white rounded-full" />
                  </div>
                </div>
              </div>

              {/* User Summary Info */}
              <div className="text-center space-y-1.5">
                <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center justify-center gap-1.5">
                  {profile?.full_name}
                  {roleCode === 'SUPER_ADMIN' && <BadgeCheck className="h-5 w-5 text-accent" />}
                </h2>
                <p className="text-sm font-medium text-accent">
                  {!isMissingDetails ? (profile?.designation?.name || "No Designation") : "Setup Required"}
                </p>
                <div className="flex items-center justify-center gap-1.5 text-xs text-muted mt-2">
                  <Mail className="h-3.5 w-3.5" />
                  <span className="truncate">{profile?.email}</span>
                </div>

                {/* Role & User Code Badges */}
                <div className="flex items-center justify-center gap-2 mt-3">
                   <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">
                     {profile?.role?.name || "No Role Assigned"}
                   </span>
                   <span className="text-[10px] font-mono font-bold tracking-wider px-2 py-0.5 rounded-full bg-elevated border border-white/10 text-muted-foreground">
                     {profile?.user_code}
                   </span>
                </div>

                {/* Preset Avatars */}
                <div className="pt-6 mt-6 border-t border-white/5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted mb-3">Or choose a preset</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {PRESET_AVATARS.map((avatar, idx) => (
                      <img 
                        key={idx} 
                        src={avatar} 
                        alt="Preset" 
                        onClick={() => !photoUploading && handlePresetAvatarSelect(avatar)}
                        className={`w-9 h-9 rounded-full object-cover cursor-pointer hover:ring-2 hover:ring-accent transition-all ${photoUploading ? 'opacity-50 cursor-not-allowed' : 'opacity-80 hover:opacity-100 hover:scale-110'}`} 
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </AppCard>
        </div>

        {/* Right Column: Detailed Info Form */}
        <div className="lg:col-span-8 space-y-6 pb-20">
          <AppCard className="border-0 shadow-lg backdrop-blur-sm bg-card/60">
            <AppCardHeader className="pb-4 border-b border-white/5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-accent/10 text-accent">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <AppCardTitle className="text-lg">Personal Information</AppCardTitle>
                  <p className="text-xs text-muted mt-0.5">
                    Your personal details are securely managed via Single Sign-On (SSO).
                  </p>
                </div>
              </div>
            </AppCardHeader>
            <AppCardContent className="pt-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Full Name */}
                <div className="space-y-2 relative group">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted flex items-center justify-between">
                    Full Name *
                    <Lock className="h-3 w-3 opacity-50" />
                  </label>
                  <AppInput
                    type="text"
                    value={profile?.full_name || ""}
                    readOnly
                    className="cursor-default opacity-80"
                  />
                </div>

                {/* Email */}
                <div className="space-y-2 relative">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted flex items-center justify-between">
                    Email Address *
                    <Lock className="h-3 w-3 opacity-50" />
                  </label>
                  <AppInput
                    type="email"
                    value={profile?.email || ""}
                    readOnly
                    className="cursor-default opacity-80"
                  />
                </div>
              </div>
            </AppCardContent>
          </AppCard>

          <AppCard className="border-0 shadow-lg backdrop-blur-sm bg-card/60">
            <AppCardHeader className="pb-4 border-b border-white/5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                  <Building className="h-5 w-5" />
                </div>
                <div>
                  <AppCardTitle className="text-lg">Organizational Details</AppCardTitle>
                  <p className="text-xs text-muted mt-0.5">
                    {isMissingDetails 
                      ? "Please select your organizational details to proceed."
                      : "Your department, designation, and reporting structure."
                    }
                  </p>
                </div>
              </div>
            </AppCardHeader>
            <AppCardContent className="pt-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {isMissingDetails ? (
                   <>
                      {/* Department Dropdown */}
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-amber-500 flex items-center justify-between">
                          <span className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" /> Department *</span>
                        </label>
                        <div className="relative">
                          <select
                            value={selectedDept}
                            onChange={(e) => {
                              setSelectedDept(e.target.value);
                              setSelectedDesig(""); // Clear designation
                            }}
                            className="h-10 w-full appearance-none rounded-[var(--radius-input,4px)] border border-amber-500/50 bg-surface px-3 text-[14px] text-foreground shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-amber-500"
                          >
                            <option value="" disabled>Select Department...</option>
                            {departments.map((d) => (
                              <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-muted">
                            <ChevronDown className="h-4 w-4" />
                          </div>
                        </div>
                      </div>

                      {/* Designation Dropdown */}
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-amber-500 flex items-center justify-between">
                          <span className="flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5" /> Designation *</span>
                        </label>
                        <div className="relative">
                          <select
                            value={selectedDesig}
                            onChange={(e) => setSelectedDesig(e.target.value)}
                            className="h-10 w-full appearance-none rounded-[var(--radius-input,4px)] border border-amber-500/50 bg-surface px-3 text-[14px] text-foreground shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-amber-500"
                          >
                            <option value="" disabled>Select Designation...</option>
                            {designations
                              .filter((d) => !selectedDept || d.department_id === selectedDept || !d.department_id)
                              .map((d) => (
                              <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-muted">
                            <ChevronDown className="h-4 w-4" />
                          </div>
                        </div>
                      </div>

                      {/* Custom Manager Dropdown */}
                      <div className="space-y-2 md:col-span-2 relative" ref={managerDropdownRef}>
                        <label className="text-[11px] font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5" /> Reporting Manager *
                        </label>
                        
                        <div 
                          className="h-10 w-full flex items-center justify-between rounded-[var(--radius-input,4px)] border border-amber-500/50 bg-surface px-3 text-[14px] text-foreground shadow-sm cursor-pointer hover:border-amber-500 transition-colors"
                          onClick={() => setManagerDropdownOpen(!managerDropdownOpen)}
                        >
                          {selectedManagerObj ? (
                            <div className="flex items-center gap-3">
                              <img 
                                src={getAvatarUrl(selectedManagerObj.full_name, selectedManagerObj.profile_photo)} 
                                className="h-6 w-6 rounded-full object-cover bg-elevated"
                                onError={(e) => { (e.target as any).src = getAvatarUrl(selectedManagerObj.full_name); }}
                                alt=""
                              />
                              <span className="font-medium">{selectedManagerObj.full_name}</span>
                            </div>
                          ) : (
                            <span className="text-muted">Select Reporting Manager...</span>
                          )}
                          <ChevronDown className={`h-4 w-4 text-muted transition-transform duration-200 ${managerDropdownOpen ? 'rotate-180' : ''}`} />
                        </div>

                        {managerDropdownOpen && (
                          <div className="absolute z-50 w-full mt-1 max-h-64 overflow-y-auto rounded-lg border border-border bg-card shadow-xl shadow-black/20 animate-in fade-in zoom-in-95 duration-200">
                            <div className="p-1 space-y-0.5">
                              {managers.map((m) => (
                                <div 
                                  key={m.id}
                                  className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors ${selectedManager === m.id ? 'bg-accent/10 text-accent font-medium' : 'hover:bg-elevated text-foreground'}`}
                                  onClick={() => { setSelectedManager(m.id); setManagerDropdownOpen(false); }}
                                >
                                  <img 
                                    src={getAvatarUrl(m.full_name, m.profile_photo)} 
                                    className="h-6 w-6 rounded-full object-cover bg-elevated"
                                    onError={(e) => { (e.target as any).src = getAvatarUrl(m.full_name); }}
                                    alt=""
                                  />
                                  <span>{m.full_name}</span>
                                  {selectedManager === m.id && <Check className="h-4 w-4 ml-auto" />}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                   </>
                ) : (
                   <>
                      {/* Department ReadOnly */}
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-muted flex items-center justify-between">
                          <span className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" /> Department *</span>
                          <Lock className="h-3 w-3 opacity-50" />
                        </label>
                        <div className="h-10 px-3 rounded-[var(--radius-input,4px)] bg-elevated/50 border border-white/5 flex items-center opacity-80 cursor-default">
                          <span className="text-[14px] font-medium text-foreground">
                            {profile?.department?.name || "Not Assigned"}
                          </span>
                        </div>
                      </div>

                      {/* Designation ReadOnly */}
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-muted flex items-center justify-between">
                          <span className="flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5" /> Designation *</span>
                          <Lock className="h-3 w-3 opacity-50" />
                        </label>
                        <div className="h-10 px-3 rounded-[var(--radius-input,4px)] bg-elevated/50 border border-white/5 flex items-center opacity-80 cursor-default">
                          <span className="text-[14px] font-medium text-foreground">
                            {profile?.designation?.name || "Not Assigned"}
                          </span>
                        </div>
                      </div>

                      {/* Manager ReadOnly */}
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-muted flex items-center justify-between">
                          <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Reporting Manager *</span>
                          <Lock className="h-3 w-3 opacity-50" />
                        </label>
                        <div className="h-10 px-3 rounded-[var(--radius-input,4px)] bg-elevated/50 border border-white/5 flex items-center gap-2 opacity-80 cursor-default">
                          <img 
                            src={getAvatarUrl(profile?.manager?.full_name || "Manager", profile?.manager?.profile_photo)} 
                            className="h-5 w-5 rounded-full object-cover bg-accent/20"
                            onError={(e) => { (e.target as any).src = getAvatarUrl(profile?.manager?.full_name || "Manager"); }}
                            alt=""
                          />
                          <span className="text-[14px] font-semibold text-foreground">
                            {profile?.manager?.full_name || "No Manager Assigned"}
                          </span>
                        </div>
                      </div>
                   </>
                )}
              </div>
              
              {isMissingDetails && (
                <div className="pt-6 border-t border-white/5 flex justify-end">
                  <AppButton 
                    onClick={handleCompleteSetup}
                    disabled={isSavingOrg || !selectedDept || !selectedDesig || !selectedManager}
                    className="gap-2 bg-amber-500 hover:bg-amber-600 text-white"
                  >
                    {isSavingOrg ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    {isSavingOrg ? "Saving..." : "Complete Setup & Continue"}
                  </AppButton>
                </div>
              )}
            </AppCardContent>
          </AppCard>
        </div>
      </div>
    </div>
  );
}
