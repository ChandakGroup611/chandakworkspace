"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { AppCard, AppCardContent, AppCardHeader, AppCardTitle } from "@/components/ui/AppCard";
import { AppButton } from "@/components/ui/AppButton";
import { useTheme } from "@/components/theme/ThemeProvider";
import { createClient } from "@/utils/supabase/client";
import { saveUserAction, fetchUsersDashboardData } from "@/lib/actions/users";
import { 
  ArrowLeft, 
  Camera, 
  RefreshCw, 
  Save, 
  User, 
  Briefcase, 
  Shield, 
  MonitorSmartphone, 
  X, 
  ChevronDown, 
  Eye, 
  EyeOff, 
  Image as ImageIcon 
} from "lucide-react";

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

export default function UserFormPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const isEditingMode = id !== "new";
  
  const supabase = createClient();
  const { theme } = useTheme();
  const isLightMode = ["executive-light", "material-ocean", "aurora-breeze", "pure-elegance", "pristine-white"].includes(theme);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorAlert, setErrorAlert] = useState<string | null>(null);

  // Lookups
  const [departments, setDepartments] = useState<any[]>([]);
  const [designations, setDesignations] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [availableAssets, setAvailableAssets] = useState<any[]>([]);
  const [availableManagers, setAvailableManagers] = useState<any[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // Form states
  const [formFullName, setFormFullName] = useState("");
  const [formUserCode, setFormUserCode] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formDeptId, setFormDeptId] = useState("");
  const [formDesigId, setFormDesigId] = useState("");
  const [formRoleId, setFormRoleId] = useState("");
  const [formManagerId, setFormManagerId] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formConfirmPassword, setFormConfirmPassword] = useState("");
  const [formPhoto, setFormPhoto] = useState(PRESET_AVATARS[0]);
  const [formAssignedAssets, setFormAssignedAssets] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);

  const [photoUploading, setPhotoUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchInitialData();
  }, [id]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const data = await fetchUsersDashboardData();
      const authUser = data.authUser;
      if (!authUser) {
        router.push("/login");
        return;
      }

      setDepartments(data.departments || []);
      setDesignations(data.designations || []);
      setRoles(data.roles || []);
      setAvailableAssets(data.assets || []);

      const rawUsers = data.users || [];
      const managers = rawUsers.filter((u: any) => 
        data.roles?.find((r: any) => r.id === u.role_id)?.code !== "VIEWER" && u.is_active
      );
      setAvailableManagers(managers);

      // Check current user permissions
      const me = rawUsers.find((u: any) => u.id === authUser.id);
      const myRole = data.roles?.find((r: any) => r.id === me?.role_id);
      setIsSuperAdmin(myRole?.code === "SUPER_ADMIN" || myRole?.code === "ROLE_ADMIN");

      if (isEditingMode) {
        const userToEdit = rawUsers.find((u: any) => u.id === id);
        if (userToEdit) {
          setFormFullName(userToEdit.full_name || "");
          setFormUserCode(userToEdit.user_code || "");
          setFormEmail(userToEdit.email || "");
          setFormDeptId(userToEdit.department_id || "");
          setFormDesigId(userToEdit.designation_id || "");
          setFormRoleId(userToEdit.role_id || "");
          setFormManagerId(userToEdit.manager_id || "");
          setFormPhoto(userToEdit.profile_photo || PRESET_AVATARS[0]);
          setFormIsActive(userToEdit.is_active ?? true);
          
          const userAssets = data.assets
            ? data.assets.filter((a: any) => a.assigned_user_id === userToEdit.id).map((a: any) => a.asset_tag || a.code)
            : ((userToEdit as any).assigned_assets || []);
            
          setFormAssignedAssets((userAssets).join(", "));
        }
      }
    } catch (err: any) {
      setErrorAlert("Failed to load dependency records.");
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorAlert("Only image file formats are allowed.");
      return;
    }

    setPhotoUploading(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error("Unauthenticated request.");

      const fileExt = file.name.split(".").pop();
      const fileName = `${authUser.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("profiles")
        .upload(fileName, file, { cacheControl: "3600", upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("profiles")
        .getPublicUrl(fileName);

      setFormPhoto(publicUrl);
    } catch (err: any) {
      setErrorAlert(`Upload failed: ${err.message || err}`);
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorAlert(null);

    if (!isEditingMode) {
      if (!formPassword) {
        setErrorAlert("Password is required for newly provisioned user accounts.");
        return;
      }
      if (formPassword !== formConfirmPassword) {
        setErrorAlert("Password and Confirm Password input values do not match.");
        return;
      }
      if (formPassword.length < 6) {
        setErrorAlert("Password constraint requires at least 6 characters.");
        return;
      }
    }

    const payload: any = {
      full_name: formFullName,
      email: formEmail,
      user_code: formUserCode,
      profile_photo: formPhoto,
      is_active: formIsActive,
      role_id: formRoleId || null,
      department_id: formDeptId || null,
      designation_id: formDesigId || null,
      manager_id: formManagerId || null,
      assigned_assets: formAssignedAssets.split(",").map(a => a.trim()).filter(Boolean)
    };

    setSaving(true);
    try {
      const result = await saveUserAction(isEditingMode ? id : null, payload, formPassword);
      if (result && !result.success) {
        throw new Error(result.error || "An unknown error occurred during save.");
      }
      router.push("/users?refresh=true");
    } catch (err: any) {
      setErrorAlert(err.message || "Failed to save user record.");
      setSaving(false);
    }
  };

  const inputStyle = `w-full h-11 px-4 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent ${
    "bg-slate-50 border-slate-200 text-slate-800 disabled:bg-slate-100 disabled:text-slate-400"
  }`;

  const labelStyle = `text-sm font-semibold mb-2 block text-slate-700`;

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-accent" />
          <span className="text-sm font-medium text-gray-500">Loading Configuration Master...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="-mx-4 md:-mx-6 -mt-4 md:-mt-6 sticky -top-4 md:-top-6 z-50 bg-white dark:bg-slate-900 border-b border-border shadow-sm px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <AppButton 
            variant="outline" 
            size="icon" 
            onClick={() => router.push("/users")}
            className="rounded-full shadow-sm !h-10 !w-10"
          >
            <ArrowLeft className="h-5 w-5" />
          </AppButton>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {isEditingMode ? "Update Identity Record" : "Register New Account"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Provide necessary organizational and system access details
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <AppButton 
            variant="outline" 
            onClick={() => router.push("/users")}
            className="px-6 h-10 font-semibold"
          >
            Cancel
          </AppButton>
          <AppButton 
            onClick={handleSubmit} 
            disabled={saving || (!isSuperAdmin && !isEditingMode)}
            className="bg-accent hover:bg-accent-secondary text-white px-8 h-10 gap-2 shadow-sm font-semibold"
          >
            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span>{saving ? "Committing..." : "Commit Record"}</span>
          </AppButton>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8">

      {errorAlert && (
        <div className="p-4 mb-6 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-3">
          <X className="h-5 w-5 shrink-0 mt-0.5" />
          <p className="font-medium">{errorAlert}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: Identity & Org */}
        <div className="xl:col-span-8 space-y-8">
          
          {/* SECTION 1: Personal Identity */}
          <AppCard className={`overflow-hidden transition-all border-slate-200`}>
            <AppCardHeader className={"bg-slate-50/50 pb-4"}>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-accent" />
                <AppCardTitle className="text-lg">Personal Identity</AppCardTitle>
              </div>
            </AppCardHeader>
            <AppCardContent className="p-6 space-y-8">
              {/* Photo Upload Row */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pb-6 border-b border-border">
                <div className="relative shrink-0 group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <div className={`w-28 h-28 rounded-full overflow-hidden flex items-center justify-center ring-4 ring-offset-2 bg-slate-200 text-slate-400 ring-slate-100 ring-offset-white`}>
                    {formPhoto && formPhoto !== PRESET_AVATARS[0] ? (
                      <img src={formPhoto} alt="Profile" className="w-full h-full object-cover" onError={(e) => { (e.target as any).src = '' }} />
                    ) : (
                      <ImageIcon className="w-12 h-12 opacity-50" />
                    )}
                  </div>
                  <div className="absolute bottom-0 right-0 w-9 h-9 bg-accent text-white rounded-full flex items-center justify-center border-[3px] border-surface shadow-sm transition-transform group-hover:scale-110">
                    <Camera className="w-4 h-4" />
                  </div>
                </div>
                
                <div className="flex flex-col items-start gap-3 flex-1">
                  <div>
                    <h3 className="font-semibold text-base mb-1">Profile Photo</h3>
                    <p className="text-sm text-muted-foreground max-w-sm">Upload a professional headshot. Recommended dimensions: 400x400px.</p>
                  </div>
                  <div className="flex items-center gap-3 w-full">
                    <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*" className="hidden" />
                    <AppButton
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={photoUploading}
                      className="shrink-0 font-medium"
                    >
                      {photoUploading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Camera className="h-4 w-4 mr-2" />}
                      <span>{photoUploading ? 'Uploading...' : 'Browse Files'}</span>
                    </AppButton>
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none ml-2">
                      {PRESET_AVATARS.map((avatar, idx) => (
                        <img 
                          key={idx} src={avatar} alt="Preset" 
                          className="w-10 h-10 rounded-full object-cover cursor-pointer shrink-0 hover:ring-2 hover:ring-accent transition-all opacity-80 hover:opacity-100" 
                          onClick={() => setFormPhoto(avatar)} 
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Identity Inputs Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div>
                  <label className={labelStyle}>Full Name *</label>
                  <input 
                    placeholder="e.g. Sarah Chen" 
                    value={formFullName} 
                    onChange={(e) => setFormFullName(e.target.value)} 
                    required 
                    disabled={!isSuperAdmin}
                    className={inputStyle}
                  />
                </div>
                <div>
                  <label className={labelStyle}>Corporate Email *</label>
                  <input 
                    type="email" 
                    placeholder="e.g. sarah.chen@company.com" 
                    value={formEmail} 
                    onChange={(e) => setFormEmail(e.target.value)} 
                    required 
                    disabled={!isSuperAdmin}
                    className={inputStyle}
                  />
                </div>
              </div>
            </AppCardContent>
          </AppCard>

          {/* SECTION 2: Organization Alignment */}
          <AppCard className={`overflow-hidden transition-all border-slate-200`}>
            <AppCardHeader className={"bg-slate-50/50 pb-4"}>
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-amber-500" />
                <AppCardTitle className="text-lg">Organization Alignment</AppCardTitle>
              </div>
            </AppCardHeader>
            <AppCardContent className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div>
                  <label className={labelStyle}>Department</label>
                  <div className="relative">
                    <select 
                      value={formDeptId} 
                      onChange={(e) => {
                        setFormDeptId(e.target.value);
                        setFormDesigId("");
                      }} 
                      disabled={!isSuperAdmin}
                      className={`${inputStyle} appearance-none pr-10`}
                    >
                      <option value="">Select Department...</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                    <ChevronDown className="absolute right-4 top-3 h-5 w-5 pointer-events-none text-muted-foreground" />
                  </div>
                </div>
                
                <div>
                  <label className={labelStyle}>Designation</label>
                  <div className="relative">
                    <select 
                      value={formDesigId} 
                      onChange={(e) => setFormDesigId(e.target.value)} 
                      disabled={!isSuperAdmin || !formDeptId}
                      className={`${inputStyle} appearance-none pr-10`}
                    >
                      <option value="">{formDeptId ? "Select Designation..." : "Select Department First"}</option>
                      {designations
                        .filter(d => !formDeptId || d.department_id === formDeptId)
                        .map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                    <ChevronDown className="absolute right-4 top-3 h-5 w-5 pointer-events-none text-muted-foreground" />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className={labelStyle}>Reporting Manager</label>
                  <div className="relative">
                    <select 
                      value={formManagerId} 
                      onChange={(e) => setFormManagerId(e.target.value)} 
                      disabled={!isSuperAdmin}
                      className={`${inputStyle} appearance-none pr-10`}
                    >
                      <option value="">Select a Manager...</option>
                      {availableManagers.map(mgr => <option key={mgr.id} value={mgr.id}>{mgr.full_name} ({mgr.user_code})</option>)}
                    </select>
                    <ChevronDown className="absolute right-4 top-3 h-5 w-5 pointer-events-none text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Used for organizational hierarchy charts and automated workflow approvals.
                  </p>
                </div>
              </div>
            </AppCardContent>
          </AppCard>

        </div>

        {/* RIGHT COLUMN: Security & Hardware */}
        <div className="xl:col-span-4 space-y-8">

          {/* User Status & Code (Highlights) */}
          <AppCard className={`overflow-hidden transition-all border-slate-200`}>
            <AppCardContent className="p-6 space-y-6">
              <div>
                <label className={labelStyle}>Account Status</label>
                <div className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${formIsActive ? ("bg-emerald-50 border-emerald-200") : ("bg-rose-50 border-rose-200")}`}>
                  <span className={`font-semibold ${formIsActive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                    {formIsActive ? "Active Participant" : "Suspended"}
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={formIsActive} onChange={(e) => setFormIsActive(e.target.checked)} className="sr-only peer" disabled={!isSuperAdmin} />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>
              </div>

              <div>
                <label className={labelStyle}>Unique Code (UIN) *</label>
                <input 
                  placeholder="e.g. EMP8839" 
                  value={formUserCode} 
                  onChange={(e) => setFormUserCode(e.target.value)} 
                  required 
                  disabled={!isSuperAdmin}
                  className={`${inputStyle} font-mono uppercase text-base tracking-wide`}
                />
              </div>
            </AppCardContent>
          </AppCard>

          {/* SECTION 3: Security Credentials */}
          <AppCard className={`overflow-hidden shadow-md ring-1 ring-black/5 transition-all border-slate-200`}>
            <AppCardHeader className={"bg-slate-50/50 pb-4"}>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-rose-500" />
                <AppCardTitle className="text-lg">Security Settings</AppCardTitle>
              </div>
            </AppCardHeader>
            <AppCardContent className="p-6 space-y-6">
              <div>
                <label className={labelStyle}>System Role</label>
                <div className="relative">
                  <select 
                    value={formRoleId} 
                    onChange={(e) => setFormRoleId(e.target.value)} 
                    disabled={!isSuperAdmin}
                    className={`${inputStyle} appearance-none pr-10 font-semibold text-accent dark:text-accent`}
                  >
                    <option value="">Select Role...</option>
                    {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                  <ChevronDown className="absolute right-4 top-3 h-5 w-5 pointer-events-none text-muted-foreground" />
                </div>
              </div>

              <div className="pt-6 border-t border-border space-y-5">
                <h4 className="text-sm font-semibold mb-2">Supabase Credentials</h4>
                <div>
                  <label className="text-xs font-semibold mb-1 block text-muted-foreground">New Password {isEditingMode && "(Leave empty to keep current)"}</label>
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"} 
                      value={formPassword} 
                      onChange={(e) => setFormPassword(e.target.value)} 
                      disabled={!isSuperAdmin}
                      className={inputStyle}
                      placeholder="••••••••"
                    />
                    <AppButton variant="secondary" type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-3 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </AppButton>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold mb-1 block text-muted-foreground">Confirm Password</label>
                  <input 
                    type={showPassword ? "text" : "password"} 
                    value={formConfirmPassword} 
                    onChange={(e) => setFormConfirmPassword(e.target.value)} 
                    disabled={!isSuperAdmin}
                    className={inputStyle}
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </AppCardContent>
          </AppCard>

          {/* SECTION 4: Hardware Assets */}
          <AppCard className={`overflow-hidden shadow-md ring-1 ring-black/5 transition-all border-slate-200`}>
            <AppCardHeader className={"bg-slate-50/50 pb-4"}>
              <div className="flex items-center gap-2">
                <MonitorSmartphone className="h-5 w-5 text-cyan-500" />
                <AppCardTitle className="text-lg">Assigned Assets</AppCardTitle>
              </div>
            </AppCardHeader>
            <AppCardContent className="p-6">
              <label className={labelStyle}>Linked IT Hardware Tags</label>
              <div className={`min-h-[140px] p-4 rounded-xl border flex flex-col gap-3 relative bg-slate-50 border-slate-200`}>
                <div className="flex flex-wrap items-center gap-2">
                  {formAssignedAssets.split(',').map(t => t.trim()).filter(Boolean).map((tag, idx) => (
                    <span key={idx} className="text-xs font-bold px-3 py-1.5 flex items-center gap-2 bg-accent/10 text-accent-secondary border border-accent/30 rounded-lg dark:bg-accent/20 dark:text-indigo-300 dark:border-accent/30 shadow-sm">
                      <MonitorSmartphone className="h-3 w-3" />
                      {tag} 
                      <X className="h-3 w-3 cursor-pointer opacity-70 hover:opacity-100 transition-opacity" onClick={() => {
                        const currentArr = formAssignedAssets.split(',').map(x => x.trim()).filter(Boolean);
                        setFormAssignedAssets(currentArr.filter(x => x !== tag).join(', '));
                      }}/>
                    </span>
                  ))}
                  {formAssignedAssets.split(',').filter(Boolean).length === 0 && (
                    <span className="text-sm text-muted-foreground italic px-2 py-1">No assets currently assigned</span>
                  )}
                </div>
                
                <div className="mt-auto pt-4 border-t border-border">
                  <div className="relative">
                    <select 
                      className={`${inputStyle} appearance-none pr-10`}
                      value=""
                      onChange={(e) => {
                        if (!e.target.value) return;
                        const currentArr = formAssignedAssets.split(',').map(x => x.trim()).filter(Boolean);
                        if (!currentArr.includes(e.target.value)) {
                          setFormAssignedAssets(currentArr.concat(e.target.value).join(', '));
                        }
                      }}
                      disabled={!isSuperAdmin}
                    >
                      <option value="" disabled hidden>+ Add another asset...</option>
                      {availableAssets.map(a => (
                        <option key={a.id} value={a.asset_tag || a.code}>{a.asset_tag || a.code} - {a.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-3 h-5 w-5 pointer-events-none text-muted-foreground" />
                  </div>
                </div>
              </div>
            </AppCardContent>
          </AppCard>

        </div>
      </form>
      </div>
    </div>
  );
}
