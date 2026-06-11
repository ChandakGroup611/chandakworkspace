"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { AppCard, AppCardHeader, AppCardTitle, AppCardContent } from "@/components/ui/AppCard";
import { AppButton } from "@/components/ui/AppButton";
import { AppInput } from "@/components/ui/AppInput";
import { useTheme } from "@/components/theme/ThemeProvider";
import { 
  UserPlus, 
  Lock, 
  Mail, 
  User, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  Building2, 
  ShieldCheck,
  Briefcase,
  Camera
} from "lucide-react";

const PRESET_AVATARS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
  "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=200",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200",
  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=200",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200"
];

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();
  const { theme } = useTheme();
  const isLight = ["executive-light", "material-ocean", "aurora-breeze", "pure-elegance"].includes(theme);
  
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("");
  const [designation, setDesignation] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [photo, setPhoto] = useState(PRESET_AVATARS[0]);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [designations, setDesignations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Fetch master data for registration
  useEffect(() => {
    async function loadData() {
      const [deptRes, desigRes] = await Promise.all([
        supabase.from("departments").select("id, name").eq("is_deleted", false),
        supabase.from("designations").select("id, name, department_id")
      ]);
      if (deptRes.data) setDepartments(deptRes.data);
      if (desigRes.data) setDesignations(desigRes.data);
    }
    loadData();
  }, []);

  const filteredDesignations = designations.filter(d => d.department_id === department);

  const handleRegistrationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!fullName.trim() || !email.trim() || !password) {
      setErrorMsg("Please fill in all mandatory fields.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match. Please try again.");
      return;
    }

    if (password.length < 8) {
      setErrorMsg("Password must contain at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            full_name: fullName.trim(),
            department_id: department,
            designation_id: designation,
            profile_photo: photo,
            provisioned_roles: ["ROLE_STAFF"]
          }
        }
      });

      if (error) {
        throw error;
      }

      if (data.user && uploadFile) {
        setSuccessMsg("Provisioning identity... Uploading profile imagery...");
        const fileExt = uploadFile.name.split('.').pop();
        const fileName = `${data.user.id}/avatar-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('profiles')
          .upload(fileName, uploadFile);

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('profiles')
            .getPublicUrl(fileName);
          
          // Update user_master with the uploaded photo URL
          await supabase
            .from('user_master')
            .update({ profile_photo: publicUrl })
            .eq('id', data.user.id);
        }
      }

      setSuccessMsg("Account successfully registered. Redirecting to Login...");
      setTimeout(() => {
        router.push("/login");
      }, 1500);

    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create user account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen w-full flex flex-col items-center justify-center relative font-sans p-4 sm:p-12 transition-colors duration-300 ${
      isLight ? "bg-gray-50 text-gray-900" : "bg-[#05070D] text-white"
    }`}>
      {/* Dynamic Glow Accents */}
      <div className={`absolute top-1/3 right-1/4 w-[550px] h-[550px] rounded-full blur-[130px] pointer-events-none animate-pulse duration-1000 ${
        isLight ? "bg-purple-500/10" : "bg-purple-600/10"
      }`} />
      <div className={`absolute bottom-1/3 left-1/4 w-[550px] h-[550px] rounded-full blur-[130px] pointer-events-none animate-pulse duration-1000 ${
        isLight ? "bg-cyan-500/10" : "bg-cyan-600/10"
      }`} />

      {/* Grid Pattern Decorative Layer */}
      <div 
        className={`absolute inset-0 pointer-events-none ${isLight ? "opacity-5" : "opacity-10"}`} 
        style={{
          backgroundImage: `linear-gradient(to right, ${isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.05)'} 1px, transparent 1px), linear-gradient(to bottom, ${isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.05)'} 1px, transparent 1px)`,
          backgroundSize: "40px 40px"
        }}
      />

      {/* Central Identity Registration Card Container */}
      <div className="w-full max-w-md relative z-10 animate-in fade-in-50 zoom-in-95 duration-400">
        <div className="text-center mb-6 space-y-2">
          <div className={`flex items-center justify-center gap-2 font-bold text-lg tracking-tight ${isLight ? "text-gray-900" : "text-white"}`}>
            <div className="p-2 rounded-xl bg-gradient-to-tr from-purple-600 to-cyan-500 shadow-lg text-white">
              <UserPlus className="h-5 w-5" />
            </div>
            <span>Staff Registration</span>
          </div>
          <p className={`text-xs max-w-xs mx-auto ${isLight ? "text-gray-500" : "text-gray-400"}`}>
            Register new personnel records to enable authenticated platform access.
          </p>
        </div>

        <AppCard className={`shadow-2xl backdrop-blur-xl transition-all ${
          isLight ? "bg-white/95 border-gray-200 shadow-gray-200/50" : "bg-[#0A0D14]/90 border-white/10"
        }`}>
          <AppCardHeader className={`pb-3 border-b text-center ${isLight ? "border-gray-100" : "border-white/5"}`}>
            <AppCardTitle className={`text-base font-bold flex items-center justify-center gap-2 ${isLight ? "text-gray-900" : "text-white"}`}>
              <ShieldCheck className="h-4 w-4 text-purple-500" />
              <span>Registration Form</span>
            </AppCardTitle>
            <span className="text-xs text-gray-500 font-mono block">Secure Identity Provisioning</span>
          </AppCardHeader>

          <AppCardContent className="p-6 space-y-4">
            {/* Realtime Alert Displays */}
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-300 text-xs flex items-start gap-2 animate-in fade-in duration-200">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
                <div className="space-y-0.5">
                  <strong className="font-bold block">Error:</strong>
                  <span>{errorMsg}</span>
                </div>
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in duration-200">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                <span className="font-medium">{successMsg}</span>
              </div>
            )}

            {/* Registration Submission Inputs */}
            <form onSubmit={handleRegistrationSubmit} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 block uppercase tracking-wider">
                  Full Name
                </label>
                <AppInput 
                  type="text"
                  placeholder="e.g. Richard Hendricks"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  leftIcon={<User className="h-4 w-4" />}
                  className="h-10 text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 block uppercase tracking-wider">
                  Email Address
                </label>
                <AppInput 
                  type="email"
                  placeholder="e.g. richard@enterprise.internal"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  leftIcon={<Mail className="h-4 w-4" />}
                  className="h-10 text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 block uppercase tracking-wider">
                    Department
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                      <Building2 className="h-4 w-4" />
                    </span>
                    <select
                      value={department}
                      onChange={(e) => { setDepartment(e.target.value); setDesignation(""); }}
                      className={`w-full h-10 pl-9 pr-3 rounded-xl border text-xs focus:outline-none cursor-pointer transition-colors ${
                        isLight 
                          ? "bg-gray-50 border-gray-200 text-gray-900 focus:border-purple-500 focus:bg-white" 
                          : "bg-white/5 border-white/10 text-gray-200 focus:border-purple-500/50"
                      }`}
                      required
                    >
                      <option value="" disabled>Select Department</option>
                      {departments.map(dept => (
                        <option key={dept.id} value={dept.id} className="bg-[#0A0D14] text-white">
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 block uppercase tracking-wider">
                    Designation
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                      <Briefcase className="h-4 w-4" />
                    </span>
                    <select
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      disabled={!department}
                      className={`w-full h-10 pl-9 pr-3 rounded-xl border text-xs focus:outline-none cursor-pointer transition-colors ${
                        isLight 
                          ? "bg-gray-50 border-gray-200 text-gray-900 focus:border-purple-500 focus:bg-white" 
                          : "bg-white/5 border-white/10 text-gray-200 focus:border-purple-500/50"
                      } ${!department ? "opacity-50 cursor-not-allowed" : ""}`}
                      required
                    >
                      <option value="" disabled>Select Designation</option>
                      {filteredDesignations.map(desig => (
                        <option key={desig.id} value={desig.id} className="bg-[#0A0D14] text-white">
                          {desig.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-gray-500 block uppercase tracking-wider">
                  Identity Visual (Photo Upload)
                </label>
                <div className="flex items-center gap-4 p-3 rounded-xl border border-dashed border-white/10 bg-white/[0.02]">
                  <div className="h-12 w-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center overflow-hidden shrink-0">
                    {uploadFile ? (
                      <img src={URL.createObjectURL(uploadFile)} className="h-full w-full object-cover" />
                    ) : (
                      <Camera className="h-5 w-5 text-indigo-400" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-xs text-gray-400">Upload a professional portrait or choose a preset below.</p>
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                      className="hidden" 
                      id="photo-upload"
                    />
                    <label 
                      htmlFor="photo-upload"
                      className="inline-block px-3 py-1 rounded-lg bg-indigo-500 text-white text-xs font-bold cursor-pointer hover:bg-indigo-400 transition-colors"
                    >
                      Select Image
                    </label>
                  </div>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
                  {PRESET_AVATARS.map((url, idx) => (
                    <div 
                      key={idx}
                      onClick={() => { setPhoto(url); setUploadFile(null); }}
                      className={`relative shrink-0 h-10 w-10 rounded-full cursor-pointer transition-all border-2 ${
                        photo === url && !uploadFile ? "border-purple-500 scale-110 shadow-lg shadow-purple-500/20" : "border-transparent opacity-50 hover:opacity-100"
                      }`}
                    >
                      <img src={url} alt={`Avatar ${idx}`} className="h-full w-full rounded-full object-cover" />
                      {photo === url && !uploadFile && (
                        <div className="absolute -right-1 -top-1 bg-purple-500 rounded-full p-0.5 shadow-sm">
                          <CheckCircle2 className="h-2 w-2 text-white" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 block uppercase tracking-wider">
                    Password
                  </label>
                  <AppInput 
                    type="password"
                    placeholder="Min 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    leftIcon={<Lock className="h-4 w-4" />}
                    className="h-10 text-xs"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 block uppercase tracking-wider">
                    Confirm Password
                  </label>
                  <AppInput 
                    type="password"
                    placeholder="Repeat password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    leftIcon={<Lock className="h-4 w-4" />}
                    className="h-10 text-xs"
                    required
                  />
                </div>
              </div>

              <div className="pt-2">
                <AppButton 
                  variant="primary" 
                  size="md" 
                  type="submit" 
                  disabled={loading || !!successMsg}
                  className="w-full h-10 font-bold text-xs tracking-wide bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 shadow-md shadow-purple-500/10 text-white"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      <span>Registering User Account...</span>
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-1.5">
                      <span>Register Account</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  )}
                </AppButton>
              </div>
            </form>

            {/* Back navigation context */}
            <div className={`pt-3 text-center border-t text-xs text-gray-500 ${isLight ? "border-gray-100" : "border-white/5"}`}>
              <span>Already have an account? </span>
              <Link href="/login" className="text-purple-500 font-bold hover:underline">
                Sign In
              </Link>
            </div>
          </AppCardContent>
        </AppCard>

        {/* Footer static banner info */}
        <div className="mt-4 text-center space-y-1">
          <p className="text-xs text-gray-500 font-mono">
            Enterprise Access Management
          </p>
        </div>
      </div>
    </div>
  );
}
