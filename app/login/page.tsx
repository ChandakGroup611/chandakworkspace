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
  const isLight = ["executive-light", "material-ocean", "aurora-breeze", "pure-elegance"].includes(theme);
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      if (typeof window === "undefined") return;
      
      const searchParams = new URLSearchParams(window.location.search);
      const isLogout = searchParams.get("action") === "logout";
      const isTimeout = searchParams.get("reason") === "timeout";

      const { data: { session } } = await supabase.auth.getSession();

      if (isLogout) {
        if (session) {
          await supabase.auth.signOut();
        }
        setSuccessMsg("You have been successfully logged out.");
        // Clear the URL to avoid repeated logouts on refresh
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (isTimeout) {
        if (session) {
          await supabase.auth.signOut();
        }
        setErrorMsg("Your session expired due to inactivity. Please sign in again.");
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (session) {
        // Auto login if already authenticated
        router.push("/");
      }
    };

    checkSession();
  }, [router, supabase.auth]);

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

      if (data.user) {
        try {
          // Check for concurrent active sessions
          const { data: sessionData } = await supabase
            .from("active_sessions")
            .select("last_active_at")
            .eq("user_id", data.user.id)
            .single();

          if (sessionData && sessionData.last_active_at) {
            const lastActive = new Date(sessionData.last_active_at).getTime();
            const now = Date.now();
            // If active within the last 5 minutes, consider it an active concurrent session
            if (now - lastActive < 5 * 60 * 1000) {
              const proceed = window.confirm("Your ID is already logged in on another device. Do you want to continue? (This will log out the other device)");
              if (!proceed) {
                // User cancelled, sign out
                await supabase.auth.signOut();
                setLoading(false);
                return;
              }
            }
          }
        } catch (e) {
          // Ignore table not found errors if migration is pending
        }
      }

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
    <div className={`min-h-screen w-full flex flex-col items-center justify-center relative overflow-y-auto font-sans p-4 sm:p-8 transition-colors duration-300 ${
      isLight ? "bg-gray-50 text-gray-900" : "bg-[#05070D] text-white"
    }`}>
      {/* Dynamic Glow Accents */}
      <div className={`absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none`}>
        <div className={`absolute -top-[10%] -left-[10%] w-[60vw] h-[60vw] rounded-full blur-[120px] opacity-60 animate-pulse duration-[3000ms] ${
          isLight ? "bg-blue-300/30" : "bg-blue-600/20"
        }`} />
        <div className={`absolute -bottom-[10%] -right-[10%] w-[60vw] h-[60vw] rounded-full blur-[120px] opacity-60 animate-pulse duration-[4000ms] ${
          isLight ? "bg-indigo-300/30" : "bg-purple-600/20"
        }`} />
      </div>

      {/* Central Login Authentication Form Container */}
      <div className="w-full max-w-[400px] relative z-10 animate-in fade-in-50 zoom-in-95 duration-500 my-auto">
        <div className="text-center mb-6 space-y-2">
          <div className="flex justify-center mb-3">
            <div className="h-24 w-32 p-2 bg-white rounded-xl shadow-lg border border-gray-100 flex items-center justify-center">
              <img src="/logo.png" alt="Chandak Logo" className="max-h-full max-w-full object-contain" />
            </div>
          </div>
          <div className={`flex items-center justify-center gap-2 font-bold text-lg tracking-tight ${isLight ? "text-gray-900" : "text-white"}`}>
            <span>Chandak Workspace</span>
          </div>
          <p className={`text-sm sm:text-base max-w-sm mx-auto ${isLight ? "text-gray-500" : "text-gray-400"}`}>
            Secure Organizational Access Gateway
          </p>
        </div>

        <AppCard className={`shadow-2xl backdrop-blur-2xl transition-all border ${
          isLight ? "bg-white/80 border-white shadow-blue-900/5" : "bg-[#0A0D14]/70 border-white/10 shadow-black/50"
        }`}>
          <AppCardHeader className={`pb-4 border-b text-center ${isLight ? "border-gray-100/50" : "border-white/5"}`}>
            <AppCardTitle className={`text-lg font-bold flex items-center justify-center gap-2 ${isLight ? "text-gray-900" : "text-white"}`}>
              <Lock className="h-4 w-4 text-blue-500" />
              <span>Account Sign In</span>
            </AppCardTitle>
            <span className="text-xs text-gray-500 font-medium block mt-1">Identity Authentication Portal</span>
          </AppCardHeader>

          <AppCardContent className="p-5 sm:p-6 space-y-5">
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
            <form onSubmit={handleStandardAuthSubmit} className="space-y-4" autoComplete="off">
              
              {/* Honeypot fields to catch aggressive browser autofill/suggestions */}
              <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }} aria-hidden="true">
                <input type="email" name="email" tabIndex={-1} autoComplete="username" />
                <input type="password" name="password" tabIndex={-1} autoComplete="current-password" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 block uppercase tracking-wider">
                  Email Address
                </label>
                <AppInput 
                  name="user_identifier_secure"
                  type="email"
                  placeholder="e.g. user@enterprise.internal"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  leftIcon={<Mail className="h-4 w-4" />}
                  className="h-10 text-sm rounded-lg"
                  autoComplete="off"
                  data-lpignore="true"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-500 block uppercase tracking-wider">
                    Password
                  </label>
                </div>
                <AppInput 
                  name="secure_secret_token"
                  type="password"
                  placeholder="••••••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  leftIcon={<Lock className="h-4 w-4" />}
                  className="h-10 text-sm rounded-lg"
                  autoComplete="new-password"
                  data-lpignore="true"
                  required
                />
              </div>

              <AppButton 
                variant="primary" 
                type="submit" 
                disabled={loading || !!successMsg}
                className="w-full h-10 mt-5 rounded-lg font-bold text-sm tracking-wide bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-xl shadow-blue-600/20 text-white transition-all transform hover:scale-[1.02] active:scale-95"
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
            <div className={`pt-4 text-center border-t text-sm text-gray-500 ${isLight ? "border-gray-100" : "border-white/5"}`}>
              <span>Don't have an account? </span>
              <Link href="/register" className="text-blue-500 font-bold hover:underline transition-colors">
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
