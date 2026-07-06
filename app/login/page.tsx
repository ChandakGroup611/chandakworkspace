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
  const isLight = ["executive-light", "material-ocean", "aurora-breeze", "pure-elegance", "pristine-white"].includes(theme);
  
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

      // Immediate hard redirect to dashboard to skip client-cache latency
      window.location.href = "/";

    } catch (err: any) {
      setErrorMsg(err.message || "Invalid email or password.");
      setLoading(false); // Only stop loading if there was an error
    }
  };

  const handleMicrosoftLogin = async () => {
    try {
      // Direct OAuth call to Supabase utilizing the underlying Azure integration
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'azure',
        options: {
          scopes: 'email profile User.Read',
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });
      if (error) throw error;
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to initialize Microsoft login.");
    }
  };

  return (
    <div className={`min-h-[100dvh] w-full flex flex-col items-center justify-center relative font-sans p-4 sm:p-8 transition-colors duration-300 overflow-y-auto ${
      isLight ? "bg-gray-50 text-gray-900" : "bg-[#05070D] text-white"
    }`}>

      {/* Central Login Authentication Form Container */}
      <div className="w-full max-w-[400px] relative z-10 animate-in fade-in-50 zoom-in-95 duration-500 my-auto">
        <div className="text-center mb-4 sm:mb-6 space-y-1 sm:space-y-2">
          <div className="flex justify-center mb-2">
            <div className="h-20 w-auto sm:h-24 sm:w-auto p-1 flex items-center justify-center">
              <img src="/logo.png" alt="Chandak Logo" className="max-h-full max-w-full object-contain drop-shadow-md" />
            </div>
          </div>
          <div className="flex items-center justify-center gap-2">
            <span className="text-2xl sm:text-3xl font-black tracking-tight text-accent drop-shadow-sm">
              Chandak Workspace
            </span>
          </div>
        </div>

        <AppCard className={`shadow-2xl backdrop-blur-2xl transition-all duration-300 border hover:shadow-3xl hover:-translate-y-1 ${
          isLight ? "bg-white/80 border-gray-200 shadow-blue-900/5 hover:border-gray-300" : "bg-[#0A0D14]/70 border-white/10 shadow-black/50 hover:border-white/20"
        }`}>
          <AppCardHeader className={`pb-1 border-b text-center ${isLight ? "border-gray-100/50" : "border-white/5"}`}>
            <AppCardTitle className={`text-lg font-bold flex items-center justify-center gap-2 ${isLight ? "text-gray-900" : "text-white"}`}>
              <Lock className="h-4 w-4 text-accent" />
              <span>Account Sign In</span>
            </AppCardTitle>
            <span className="text-xs text-gray-500 font-medium block mt-0.5">Identity Authentication Portal</span>
          </AppCardHeader>

          <AppCardContent className="p-3 sm:p-4 space-y-2">
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
            <form onSubmit={handleStandardAuthSubmit} className="space-y-3" autoComplete="off">
              
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
                  leftIcon={<Mail className="h-4 w-4 text-accent" />}
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
                  leftIcon={<Lock className="h-4 w-4 text-accent" />}
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
                className="w-full h-10 mt-2 sm:mt-3 rounded-lg font-bold text-sm tracking-wide shadow-lg shadow-accent/20 transition-all transform hover:scale-[1.02] active:scale-95"
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

            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center">
                <span className={`w-full border-t ${isLight ? 'border-gray-200' : 'border-white/10'}`}></span>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className={`px-2 font-semibold ${isLight ? 'bg-white text-gray-400' : 'bg-[#121620] text-gray-500'}`}>Or continue with</span>
              </div>
            </div>

            <AppButton
              variant="outline"
              type="button"
              onClick={handleMicrosoftLogin}
              className="w-full h-10 rounded-lg font-bold text-sm tracking-wide transition-all border-[#0078D4]/20 hover:bg-[#0078D4]/10 text-gray-800 dark:text-gray-200 flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 21 21">
                <path fill="#f25022" d="M1 1h9v9H1z"/>
                <path fill="#00a4ef" d="M1 11h9v9H1z"/>
                <path fill="#7fba00" d="M11 1h9v9h-9z"/>
                <path fill="#ffb900" d="M11 11h9v9h-9z"/>
              </svg>
              Microsoft
            </AppButton>

            {/* Navigation link to Registration screen */}
            <div className={`pt-3 text-center border-t text-sm text-gray-500 ${isLight ? "border-gray-100" : "border-white/5"}`}>
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
