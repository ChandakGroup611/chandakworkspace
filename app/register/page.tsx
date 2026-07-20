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
  const isLight = ["executive-light", "material-ocean", "aurora-breeze", "pure-elegance", "pristine-white"].includes(theme);
  
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

    if (!email.trim().toLowerCase().endsWith('@chandakgroup.com')) {
      setErrorMsg("Registration is restricted to official @chandakgroup.com email addresses only.");
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
    <div className="dark theme-dark flex h-screen w-full bg-[#0A0D14] text-white font-sans overflow-hidden" data-theme="glass-intelligence">
      
      {/* LEFT PANEL - Branding / Image Split */}
      <div className="relative hidden lg:flex flex-col w-1/2 h-full overflow-hidden bg-slate-950">
        <Image 
          src="/login-bg.png"
          alt="Abstract Background"
          fill
          priority
          className="object-cover opacity-90"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/70 to-slate-900/40"></div>
        
        {/* Abstract Glow Effects */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-accent/30 blur-[120px] animate-pulse duration-[10000ms]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-blue-500/20 blur-[150px] animate-pulse duration-[12000ms]"></div>

        <div className="relative z-10 flex flex-col items-center justify-center h-full p-12 lg:p-16 text-center">
          
          {/* Logo - Pushed to Absolute Top */}
          <div className="absolute top-12 lg:top-16 left-0 right-0 flex flex-col items-center gap-5 animate-in fade-in slide-in-from-top-8 duration-1000 delay-300">
            <div className="relative h-24 w-64 lg:h-32 lg:w-80 bg-white/95 rounded-2xl p-4 shadow-2xl backdrop-blur-sm border border-white/20 flex items-center justify-center">
              <img 
                src="/logo.png" 
                alt="Chandak Logo" 
                className="h-full w-auto max-w-full object-contain p-2"
              />
            </div>
          </div>

          {/* Main Text - Perfectly Centered */}
          <div className="max-w-xl mt-24 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-500">
            <h1 className="text-4xl lg:text-5xl font-bold tracking-tight !text-white mb-12 leading-tight drop-shadow-lg">
              Intelligent Governance <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">
                & Enterprise Mastery
              </span>
            </h1>
            <p className="!text-slate-200 text-lg font-medium leading-relaxed max-w-md mx-auto drop-shadow-md">
              Securely orchestrate enterprise operations, manage identities, and automate workflows in one unified platform.
            </p>
          </div>

        </div>
      </div>

      {/* RIGHT PANEL - Authentication Form */}
      <div className="w-full lg:w-1/2 h-full flex flex-col overflow-y-auto bg-[#0F131E] lg:bg-[#0A0D14] relative text-white">
        {/* Subtle grid on right panel for texture */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20 pointer-events-none"></div>

        <div className="flex-1 flex items-center justify-center p-6 lg:p-12 xl:p-16 relative z-10 min-h-full">
          <div className="w-full max-w-xl animate-in fade-in zoom-in-95 duration-700 fill-mode-both">
            
            <div className="lg:hidden flex flex-col items-center justify-center mb-8">
              <div className="relative h-20 w-56 flex items-center justify-center">
                <img 
                  src="/logo.png" 
                  alt="Chandak Logo" 
                  className="h-full w-auto max-w-full object-contain"
                />
              </div>
            </div>

            <div className="mb-8 lg:mb-10 text-center">
              <h2 className="text-3xl font-bold text-white mb-2">
                Create an Account
              </h2>
              <p className="text-gray-400 mb-4">
                Register new personnel records to enable authenticated platform access.
              </p>
              
              <div className="p-3 bg-blue-950/30 text-blue-400 rounded-lg text-xs flex items-start text-left gap-2 border border-blue-900/50">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  <strong>Important:</strong> You must use your official <b>@chandakgroup.com</b> mail ID credentials for access.
                </span>
              </div>
            </div>

            {/* Realtime Alert Displays */}
            {errorMsg && (
              <div className="mb-6 p-4 rounded-xl bg-red-950/30 border border-red-900/50 text-red-400 text-sm flex items-start gap-3 animate-in fade-in duration-300">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <strong className="font-semibold block">Error</strong>
                  <span className="opacity-90">{errorMsg}</span>
                </div>
              </div>
            )}

            {successMsg && (
              <div className="mb-6 p-4 rounded-xl bg-emerald-950/30 border border-emerald-900/50 text-emerald-400 text-sm flex items-center gap-3 animate-in fade-in duration-300">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <span className="font-medium">{successMsg}</span>
              </div>
            )}

            {/* Registration Submission Inputs */}
            <form onSubmit={handleRegistrationSubmit} className="space-y-6" autoComplete="off">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 block uppercase tracking-wider">
                    Full Name
                  </label>
                  <AppInput 
                    type="text"
                    placeholder="e.g. Richard Hendricks"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    leftIcon={<User className="h-4 w-4" />}
                    className="h-12 bg-[#0A0D14] lg:bg-white/5 border-white/10 focus:bg-[#0A0D14] transition-colors text-white"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 block uppercase tracking-wider">
                    Email Address
                  </label>
                  <AppInput 
                    type="email"
                    placeholder="e.g. richard@chandakgroup.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    leftIcon={<Mail className="h-4 w-4" />}
                    className="h-12 bg-[#0A0D14] lg:bg-white/5 border-white/10 focus:bg-[#0A0D14] transition-colors text-white"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 block uppercase tracking-wider">
                    Department
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                      <Building2 className="h-4 w-4" />
                    </span>
                    <select
                      value={department}
                      onChange={(e) => { setDepartment(e.target.value); setDesignation(""); }}
                      className="w-full h-12 pl-10 pr-3 rounded-xl border text-sm focus:outline-none cursor-pointer transition-colors bg-[#0A0D14] lg:bg-white/5 border-white/10 focus:bg-[#0A0D14] text-white"
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

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 block uppercase tracking-wider">
                    Designation
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                      <Briefcase className="h-4 w-4" />
                    </span>
                    <select
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      disabled={!department}
                      className={`w-full h-12 pl-10 pr-3 rounded-xl border text-sm focus:outline-none cursor-pointer transition-colors bg-[#0A0D14] lg:bg-white/5 border-white/10 focus:bg-[#0A0D14] text-white ${!department ? "opacity-50 cursor-not-allowed" : ""}`}
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
                <label className="text-xs font-bold text-gray-400 block uppercase tracking-wider">
                  Identity Visual (Photo Upload)
                </label>
                <div className="flex flex-col sm:flex-row sm:items-center gap-6 p-5 rounded-xl border border-dashed border-white/20 bg-white/[0.02]">
                  <div className="h-16 w-16 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center overflow-hidden shrink-0">
                    {uploadFile ? (
                      <img src={URL.createObjectURL(uploadFile)} className="h-full w-full object-cover" />
                    ) : (
                      <Camera className="h-5 w-5 text-accent" />
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
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
                      className="inline-block px-4 py-2 rounded-lg bg-accent/20 text-accent border border-accent/30 text-xs font-bold cursor-pointer hover:bg-accent/40 transition-colors"
                    >
                      Select Image
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-4 overflow-x-auto pb-1 custom-scrollbar">
                  {PRESET_AVATARS.map((url, idx) => (
                    <div 
                      key={idx}
                      onClick={() => { setPhoto(url); setUploadFile(null); }}
                      className={`relative shrink-0 h-10 w-10 rounded-full cursor-pointer transition-all border-2 ${
                        photo === url && !uploadFile ? "border-accent scale-110 shadow-lg shadow-purple-500/20" : "border-transparent opacity-50 hover:opacity-100"
                      }`}
                    >
                      <img src={url} alt={`Avatar ${idx}`} className="h-full w-full rounded-full object-cover" />
                      {photo === url && !uploadFile && (
                        <div className="absolute -right-1 -top-1 bg-accent rounded-full p-0.5 shadow-sm">
                          <CheckCircle2 className="h-2 w-2 text-white" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 block uppercase tracking-wider">
                    Password
                  </label>
                  <AppInput 
                    type="password"
                    placeholder="Min 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    leftIcon={<Lock className="h-4 w-4" />}
                    className="h-12 bg-[#0A0D14] lg:bg-white/5 border-white/10 focus:bg-[#0A0D14] transition-colors text-white"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 block uppercase tracking-wider">
                    Confirm Password
                  </label>
                  <AppInput 
                    type="password"
                    placeholder="Repeat password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    leftIcon={<Lock className="h-4 w-4" />}
                    className="h-12 bg-[#0A0D14] lg:bg-white/5 border-white/10 focus:bg-[#0A0D14] transition-colors text-white"
                    required
                  />
                </div>
              </div>

              <div className="pt-6">
                <AppButton 
                  variant="primary" 
                  size="md" 
                  type="submit" 
                  disabled={loading || !!successMsg}
                  className="w-full h-12 font-bold text-base tracking-wide bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 shadow-lg shadow-purple-500/20 text-white border-none"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      <span>Registering User Account...</span>
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <span>Register Account</span>
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  )}
                </AppButton>
              </div>
            </form>

            {/* Back navigation context */}
            <div className="mt-8 text-center">
              <span className="text-sm font-medium text-gray-400">
                Already have an account? <Link href="/login" className="text-accent font-semibold hover:underline transition-colors">Sign In</Link>
              </span>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
