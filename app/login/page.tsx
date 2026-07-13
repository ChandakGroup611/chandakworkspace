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
    <div className={`min-h-[100dvh] w-full flex flex-col lg:flex-row font-sans transition-colors duration-300 ${
      "bg-surface text-foreground"
    }`}>
      
      {/* LEFT SIDE - Branding & Premium Abstract Graphic */}
      <div className="flex w-full min-h-[35vh] lg:min-h-0 lg:w-1/2 relative flex-col justify-between p-8 lg:p-12 overflow-hidden bg-black border-b lg:border-b-0 lg:border-r border-white/5">
        {/* Background Image Layer */}
        <div className="absolute inset-0 z-0">
          <img 
            src="/login-bg.png" 
            alt="Abstract Enterprise Background" 
            className="w-full h-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
        </div>

        {/* Top Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="h-12 w-auto flex items-center justify-center bg-white rounded-lg p-2 shadow-lg">
            <img src="/logo.png" alt="Chandak Logo" className="h-full w-auto object-contain" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white drop-shadow-sm">
            Chandak Workspace
          </span>
        </div>

        {/* Bottom Tagline */}
        <div className="relative z-10 max-w-lg mt-8 lg:mb-8">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2 lg:mb-4 leading-tight tracking-tight drop-shadow-lg">
            Intelligent Governance &<br className="hidden sm:block" />Enterprise Mastery
          </h2>
          <p className="text-sm lg:text-lg text-white/70 font-medium">
            Streamline your organizational compliance, lifecycle management, and asset tracking all within a unified, high-performance suite.
          </p>
        </div>
      </div>

      {/* RIGHT SIDE - Authentication Form */}
      <div className={`w-full lg:w-1/2 flex flex-col items-center justify-center p-8 sm:p-12 lg:p-24 bg-white text-black`}>
        <div className="w-full max-w-[400px] animate-in fade-in slide-in-from-bottom-4 duration-700">

          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">
              Sign in
            </h1>
            <p className={`text-sm text-muted`}>
              Enter your credentials to access your secure workspace.
            </p>
          </div>

          {/* Realtime Alert Displays */}
          {errorMsg && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/20 text-rose-600 dark:text-rose-300 text-sm flex items-start gap-3 animate-in fade-in duration-200">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-rose-500" />
              <div className="space-y-1">
                <strong className="font-semibold block">Access Denied</strong>
                <span className="opacity-90">{errorMsg}</span>
              </div>
            </div>
          )}

          {successMsg && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-300 text-sm flex items-center gap-3 animate-in fade-in duration-200">
              <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-500" />
              <span className="font-medium">{successMsg}</span>
            </div>
          )}

          {/* Standard Credentials Submission Form */}
          <form onSubmit={handleStandardAuthSubmit} className="space-y-5" autoComplete="off">
            <div className="space-y-2">
              <label className={`text-sm font-semibold text-slate-900`}>
                Email Address
              </label>
              <AppInput 
                name="email"
                type="email"
                placeholder="e.g. user@enterprise.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<Mail className="h-4 w-4 text-muted" />}
                className="h-11 text-sm"
                required
              />
            </div>

            <div className="space-y-2">
              <label className={`text-sm font-semibold text-slate-900`}>
                Password
              </label>
              <AppInput 
                name="password"
                type="password"
                placeholder="••••••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftIcon={<Lock className="h-4 w-4 text-muted" />}
                className="h-11 text-sm"
                required
              />
            </div>

            <AppButton 
              variant="primary" 
              type="submit" 
              disabled={loading || !!successMsg}
              className="w-full h-11 mt-2 font-semibold text-sm"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  <span>Authenticating...</span>
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <span>Sign In</span>
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </AppButton>
          </form>

          <div className="relative py-6">
            <div className="relative flex justify-center text-xs uppercase my-6">
              <span className={`w-full border-t border-border`}></span>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`px-4 font-semibold tracking-wider bg-white text-muted`}>
                  OR CONTINUE WITH
                </span>
              </div>
            </div>
          </div>

          <AppButton
            variant="outline"
            type="button"
            onClick={handleMicrosoftLogin}
            className="w-full h-11 font-semibold flex items-center justify-center gap-3 text-sm border-border"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 21 21">
              <path fill="#f25022" d="M1 1h9v9H1z"/>
              <path fill="#00a4ef" d="M1 11h9v9H1z"/>
              <path fill="#7fba00" d="M11 1h9v9h-9z"/>
              <path fill="#ffb900" d="M11 11h9v9h-9z"/>
            </svg>
            Microsoft SSO
          </AppButton>

          {/* Navigation link to Registration screen */}
          <div className="pt-8 text-center text-sm">
            <span className={"text-subtle"}>
              Don't have an account?{" "}
            </span>
            <Link href="/register" className="font-semibold text-accent dark:text-accent hover:text-accent dark:hover:text-blue-300 transition-colors">
              Request Access
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
