"use client";

import React, { useState, useEffect, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import { AppCard, AppCardHeader, AppCardTitle, AppCardContent } from "@/components/ui/AppCard";
import { AppInput } from "@/components/ui/AppInput";
import { AppButton } from "@/components/ui/AppButton";
import { useTheme } from "@/components/theme/ThemeProvider";
import { 
  User, 
  Mail, 
  Lock, 
  Image, 
  Eye, 
  RefreshCw, 
  Check, 
  AlertCircle,
  Loader2
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
}

const PRESET_AVATARS = [
  "https://api.dicebear.com/7.x/avataaars/svg?seed=user1",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=user2",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=user3",
];

export default function UserProfileEditor() {
  const supabase = createClient();
  const { theme } = useTheme();
  const { roleCode, hasPermission } = usePermissions();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile data
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [formFullName, setFormFullName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formConfirmPassword, setFormConfirmPassword] = useState("");
  const [formPhoto, setFormPhoto] = useState(PRESET_AVATARS[0]);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [isViewingPhoto, setIsViewingPhoto] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Notifications
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isLightMode = ["executive-light", "material-ocean", "aurora-breeze", "pure-elegance"].includes(theme);
  const isSuperAdmin = roleCode === "SUPER_ADMIN";

  // Load user profile on mount
  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError) {
        console.error("Auth error:", authError);
        throw authError;
      }
      if (!authUser) throw new Error("No authenticated user");

      console.log("Loading profile for user:", authUser.id);

      const { data, error } = await supabase
        .from("user_master")
        .select("*")
        .eq("id", authUser.id)
        .single();

      if (error) {
        console.error("Profile fetch error:", {
          code: error.code,
          message: error.message,
          details: error.details
        });
        throw error;
      }

      console.log("Profile loaded:", data);
      setProfile(data);
      setFormFullName(data.full_name || "");
      setFormEmail(data.email || authUser.email || "");
      setFormPhoto(data.profile_photo || PRESET_AVATARS[0]);
      setLoading(false);
    } catch (err: any) {
      console.error("Error loading profile:", err);
      setErrorMsg("Failed to load profile");
      setLoading(false);
    }
  };

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
      if (userError) {
        console.error("Auth error during upload:", userError);
        throw userError;
      }
      if (!authUser) throw new Error("Unauthenticated");

      const fileExt = file.name.split(".").pop();
      const fileName = `${authUser.id}/${Date.now()}.${fileExt}`;

      console.log("Uploading file:", fileName, "Size:", file.size);

      const { data, error: uploadError } = await supabase.storage
        .from("profiles")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: true
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw uploadError;
      }

      console.log("Upload successful:", data);

      const { data: { publicUrl } } = supabase.storage
        .from("profiles")
        .getPublicUrl(fileName);

      console.log("Public URL:", publicUrl);
      setFormPhoto(publicUrl);
      triggerToast("Profile picture updated successfully!");
    } catch (err: any) {
      console.error("Upload error:", err);
      triggerToast(`Upload failed: ${err.message || err}`, true);
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formPassword || !formConfirmPassword) {
      triggerToast("Both password fields are required.", true);
      return;
    }

    if (formPassword !== formConfirmPassword) {
      triggerToast("Passwords do not match.", true);
      return;
    }

    if (formPassword.length < 8) {
      triggerToast("Password must be at least 8 characters.", true);
      return;
    }

    setIsSaving(true);
    try {
      console.log("Attempting password update...");
      
      const { error } = await supabase.auth.updateUser({
        password: formPassword
      });

      if (error) {
        console.error("Password update error:", {
          code: error.code,
          message: error.message,
          status: error.status
        });
        throw error;
      }

      setFormPassword("");
      setFormConfirmPassword("");
      triggerToast("Password changed successfully!");
    } catch (err: any) {
      console.error("Password change error:", err);
      triggerToast(`Failed to change password: ${err.message || err}`, true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSaving(true);
    try {
      const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error("Auth getUser error:", userError);
        throw new Error(`Authentication failed: ${userError.message}`);
      }
      if (!authUser) throw new Error("Unauthenticated - no user session");

      console.log("Authenticated user:", authUser.id);

      const updatePayload: any = {
        full_name: formFullName,
        profile_photo: formPhoto,
        updated_at: new Date().toISOString()
      };

      console.log("Updating profile with payload:", updatePayload);

      const { data, error } = await supabase
        .from("user_master")
        .update(updatePayload)
        .eq("id", authUser.id)
        .select();

      if (error) {
        console.error("Supabase update error:", {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }

      console.log("Update response:", data);

      if (!data || data.length === 0) {
        console.warn("Update returned 0 rows - may indicate RLS policy rejection");
        throw new Error("Failed to update profile - permission denied or record not found");
      }

      setProfile(prev => prev ? { ...prev, ...updatePayload } : null);
      triggerToast("Profile updated successfully!");
    } catch (err: any) {
      console.error("Profile update error:", err);
      triggerToast(`Failed to update profile: ${err.message || err}`, true);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Toast notifications */}
      {successMsg && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-emerald-500 text-white px-4 py-3 shadow-2xl animate-in slide-in-from-bottom-5 duration-300">
          <Check className="h-4 w-4" />
          <span className="text-xs font-semibold">{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-rose-500 text-white px-4 py-3 shadow-2xl animate-in slide-in-from-bottom-5 duration-300">
          <AlertCircle className="h-4 w-4" />
          <span className="text-xs font-semibold">{errorMsg}</span>
        </div>
      )}

      {/* Profile Picture Section */}
      <AppCard>
        <AppCardHeader>
          <div className="flex items-center gap-2">
            <Image className="h-5 w-5 text-blue-500" />
            <AppCardTitle>Profile Picture</AppCardTitle>
          </div>
          <p className={`text-xs ${isLightMode ? "text-gray-500" : "text-gray-400"}`}>
            View and update your profile picture
          </p>
        </AppCardHeader>
        <AppCardContent>
          <div className="space-y-4">
            {/* Photo Preview */}
            <div className="flex justify-center">
              <img 
                src={formPhoto || PRESET_AVATARS[0]}
                alt="Profile"
                className="h-32 w-32 rounded-full object-cover border-4 border-blue-500 shadow-lg"
                onError={(e) => { (e.target as any).src = PRESET_AVATARS[0]; }}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setIsViewingPhoto(true)}
                className={`px-4 py-2 rounded-lg border text-sm font-semibold flex items-center gap-2 transition-all ${
                  isLightMode 
                    ? "bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-blue-600" 
                    : "bg-white/5 border-white/10 text-gray-200 hover:bg-white/10 hover:text-blue-400"
                }`}
              >
                <Eye className="h-4 w-4" />
                <span>View</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={photoUploading}
                className={`px-4 py-2 rounded-lg border text-sm font-semibold flex items-center gap-2 transition-all ${
                  photoUploading
                    ? "opacity-50 cursor-not-allowed"
                    : (isLightMode 
                      ? "bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-blue-600" 
                      : "bg-white/5 border-white/10 text-gray-200 hover:bg-white/10 hover:text-blue-400")
                }`}
              >
                {photoUploading ? (
                  <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
                ) : (
                  <Image className="h-4 w-4" />
                )}
                <span>{photoUploading ? "Uploading..." : "Change"}</span>
              </button>

              <input 
                ref={fileInputRef}
                type="file" 
                accept="image/*" 
                onChange={handlePhotoUpload}
                disabled={photoUploading}
                className="hidden" 
              />
            </div>

            {/* Info Badge */}
            <div className={`p-3 rounded-lg border text-xs ${
              isLightMode 
                ? "bg-blue-50 border-blue-200 text-blue-700" 
                : "bg-blue-500/10 border-blue-500/30 text-blue-300"
            }`}>
              <p>✓ All users can view and change their profile picture</p>
            </div>
          </div>
        </AppCardContent>
      </AppCard>

      {/* Profile Details Section */}
      <AppCard>
        <AppCardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-blue-500" />
            <AppCardTitle>Profile Details</AppCardTitle>
          </div>
          <p className={`text-xs ${isLightMode ? "text-gray-500" : "text-gray-400"}`}>
            Manage and update your personal profile details.
          </p>
        </AppCardHeader>
        <AppCardContent>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className={`text-xs font-bold uppercase tracking-wider block ${
                isLightMode ? "text-gray-600" : "text-gray-400"
              }`}>
                Full Name
              </label>
              <AppInput
                type="text"
                placeholder="Your full name"
                value={formFullName}
                onChange={(e) => setFormFullName(e.target.value)}
                className="text-sm"
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className={`text-xs font-bold uppercase tracking-wider block flex items-center gap-2 ${
                isLightMode ? "text-gray-600" : "text-gray-400"
              }`}>
                <Mail className="h-3.5 w-3.5" />
                Email
              </label>
              <AppInput
                type="email"
                placeholder="your.email@company.com"
                value={formEmail}
                disabled
                className="opacity-60 cursor-not-allowed text-sm"
              />
              <p className="text-xs text-gray-500">Email cannot be changed</p>
            </div>

            {/* User Code */}
            <div className="space-y-1.5">
              <label className={`text-xs font-bold uppercase tracking-wider block ${
                isLightMode ? "text-gray-600" : "text-gray-400"
              }`}>
                User Code
              </label>
              <AppInput
                type="text"
                placeholder="USR-XXXX"
                value={profile?.user_code || ""}
                disabled
                className="opacity-60 cursor-not-allowed text-sm font-mono"
              />
              <p className="text-xs text-gray-500">System-generated identifier</p>
            </div>

            {/* Status Info */}
            <div className={`p-3 rounded-lg border text-xs space-y-2 ${
              isLightMode 
                ? "bg-gray-50 border-gray-200" 
                : "bg-white/5 border-white/10"
            }`}>
              <p><strong>Active:</strong> {profile?.is_active ? "✓ Yes" : "✗ No"}</p>
              <p><strong>Role:</strong> {isSuperAdmin ? "Super Admin" : "Standard User"}</p>
            </div>

            {/* Save Button */}
            <div className="pt-2 border-t border-white/5">
              <AppButton
                type="submit"
                disabled={isSaving}
                variant="primary"
                size="md"
                leftIcon={isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                className="w-full"
              >
                {isSaving ? "Saving..." : "Save Profile Changes"}
              </AppButton>
            </div>
          </form>
        </AppCardContent>
      </AppCard>

      {/* Password Change Section */}
      <AppCard>
        <AppCardHeader>
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-purple-500" />
            <AppCardTitle>Change Password</AppCardTitle>
          </div>
          <p className={`text-xs ${isLightMode ? "text-gray-500" : "text-gray-400"}`}>
            Update your password to keep your account secure
          </p>
        </AppCardHeader>
        <AppCardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            {/* New Password */}
            <div className="space-y-1.5">
              <label className={`text-xs font-bold uppercase tracking-wider block ${
                isLightMode ? "text-gray-600" : "text-gray-400"
              }`}>
                New Password
              </label>
              <AppInput
                type="password"
                placeholder="Enter new password (min 8 characters)"
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                className="text-sm"
              />
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label className={`text-xs font-bold uppercase tracking-wider block ${
                isLightMode ? "text-gray-600" : "text-gray-400"
              }`}>
                Confirm Password
              </label>
              <AppInput
                type="password"
                placeholder="Confirm new password"
                value={formConfirmPassword}
                onChange={(e) => setFormConfirmPassword(e.target.value)}
                className="text-sm"
              />
            </div>

            {/* Password Requirements */}
            <div className={`p-3 rounded-lg border text-xs space-y-1 ${
              isLightMode 
                ? "bg-amber-50 border-amber-200 text-amber-700" 
                : "bg-amber-500/10 border-amber-500/30 text-amber-300"
            }`}>
              <p>Password requirements:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Minimum 8 characters</li>
                <li>Must match confirmation</li>
              </ul>
            </div>

            {/* Change Password Button */}
            <div className="pt-2 border-t border-white/5">
              <AppButton
                type="submit"
                disabled={isSaving}
                variant="primary"
                size="md"
                leftIcon={isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                className="w-full"
              >
                {isSaving ? "Updating..." : "Change Password"}
              </AppButton>
            </div>
          </form>
        </AppCardContent>
      </AppCard>

      {/* Photo Preview Modal */}
      {isViewingPhoto && (
        <div 
          className="fixed inset-0 z-50 flex items-start pt-24 pb-24 overflow-y-auto justify-center px-4 p-4 animate-in fade-in-0 duration-200"
          style={{ backgroundColor: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
          onClick={() => setIsViewingPhoto(false)}
        >
          <div className="relative max-w-md w-full">
            <img 
              src={formPhoto}
              alt="Profile Photo Preview"
              className="w-full rounded-xl shadow-2xl"
              onError={(e) => { (e.target as any).src = PRESET_AVATARS[0]; }}
            />
            <button
              onClick={() => setIsViewingPhoto(false)}
              className="absolute top-4 right-4 p-2 rounded-lg bg-black/50 text-white hover:bg-black/70 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
