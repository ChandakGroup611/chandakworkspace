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
  ShieldCheck, 
  Lock, 
  Mail, 
  ArrowRight, 
  AlertCircle, 
  Layers, 
  Cpu, 
  UserCheck 
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const { theme } = useTheme();
  const isLight = ["executive-light", "material-ocean", "aurora-breeze"].includes(theme);
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("reason=timeout")) {
      setErrorMsg("Your session expired due to inactivity. Please sign in again.");
    }
  }, []);

  const handlePrefill = (role: "admin" | "auditor") => {
    if (role === "admin") {
      setEmail("global-ops@enterprise.internal");
      setPassword("SecuredAdminPass2026!");
    } else {
      setEmail("auditor-bridge@enterprise.internal");
      setPassword("StandardStaffPass2026!");
    }
    setErrorMsg(null);
  };

  const handleStandardAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email.trim() || !password) {
      setErrorMsg("Please enter both email and password.");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password
      });

      if (error) throw error;

      setSuccessMsg("Signed in securely. Loading dashboard...");
      setTimeout(() => {
        router.push("/");
      }, 1000);

    } catch (err: any) {
      setErrorMsg(err.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen w-full flex items-center justify-center relative overflow-hidden font-sans p-4 transition-colors duration-300 ${
      isLight ? "bg-gray-50 text-gray-900" : "bg-[#05070D] text-white"
    }`}>
      {/* Dynamic Glow Accents */}
      <div className={`absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full blur-[120px] pointer-events-none animate-pulse duration-1000 ${
        isLight ? "bg-blue-500/10" : "bg-blue-600/10"
      }`} />
      <div className={`absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full blur-[120px] pointer-events-none animate-pulse duration-1000 ${
        isLight ? "bg-indigo-500/10" : "bg-purple-600/10"
      }`} />

      {/* Central Login Authentication Form Container */}
      <div className="w-full max-w-md relative z-10 animate-in fade-in-50 zoom-in-95 duration-400">
        <div className="text-center mb-6 space-y-2">
          <div className={`flex items-center justify-center gap-2 font-bold text-lg tracking-tight ${isLight ? "text-gray-900" : "text-white"}`}>
            <div className="p-2 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-lg text-white">
              <Cpu className="h-5 w-5" />
            </div>
            <span>Enterprise Service Platform</span>
          </div>
          <p className={`text-xs max-w-xs mx-auto ${isLight ? "text-gray-500" : "text-gray-400"}`}>
            Secure Organizational Access Gateway
          </p>
        </div>

        <AppCard className={`shadow-2xl backdrop-blur-xl transition-all ${
          isLight ? "bg-white/95 border-gray-200 shadow-gray-200/50" : "bg-[#0A0D14]/90 border-white/10"
        }`}>
          <AppCardHeader className={`pb-3 border-b text-center ${isLight ? "border-gray-100" : "border-white/5"}`}>
            <AppCardTitle className={`text-base font-bold flex items-center justify-center gap-2 ${isLight ? "text-gray-900" : "text-white"}`}>
              <Lock className="h-4 w-4 text-blue-500" />
              <span>Account Sign In</span>
            </AppCardTitle>
            <span className="text-xs text-gray-500 font-mono block">Identity Authentication Portal</span>
          </AppCardHeader>

          <AppCardContent className="p-6 space-y-4">
            {/* Realtime Alert Displays */}
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-300 text-xs flex items-start gap-2 animate-in fade-in duration-200">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
                <div className="space-y-0.5">
                  <strong className="font-bold block">Access Denied:</strong>
                  <span>{errorMsg}</span>
                </div>
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in duration-200">
                <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-500" />
                <span className="font-medium">{successMsg}</span>
              </div>
            )}

            {/* Standard Credentials Submission Form */}
            <form onSubmit={handleStandardAuthSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 block uppercase tracking-wider">
                  Email Address
                </label>
                <AppInput 
                  type="email"
                  placeholder="e.g. user@enterprise.internal"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  leftIcon={<Mail className="h-4 w-4" />}
                  className="h-10 text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-500 block uppercase tracking-wider">
                    Password
                  </label>
                </div>
                <AppInput 
                  type="password"
                  placeholder="••••••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  leftIcon={<Lock className="h-4 w-4" />}
                  className="h-10 text-xs"
                  required
                />
              </div>

              <AppButton 
                variant="primary" 
                size="md" 
                type="submit" 
                disabled={loading || !!successMsg}
                className="w-full h-10 font-bold text-xs tracking-wide bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-md shadow-blue-500/10 text-white"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    <span>Verifying Identity...</span>
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-1.5">
                    <span>Sign In</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                )}
              </AppButton>
            </form>

            {/* Navigation link to Registration screen */}
            <div className={`pt-2 text-center border-t text-xs text-gray-500 ${isLight ? "border-gray-100" : "border-white/5"}`}>
              <span>Don't have an account? </span>
              <Link href="/register" className="text-blue-500 font-bold hover:underline">
                Create an Account
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
