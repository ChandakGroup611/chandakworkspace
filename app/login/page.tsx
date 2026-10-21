"use client";
import { toast } from 'react-toastify';

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { AppInput } from "@/components/ui/AppInput";
import { AppButton } from "@/components/ui/AppButton";
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  ArrowRight, 
  AlertCircle, 
  User,
  Zap
} from "lucide-react";
import ChandakLoader from "@/components/ui/ChandakLoader";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [ssoLoading, setSsoLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [noticeMsg, setNoticeMsg] = useState<{ type: 'warning' | 'info' | 'error'; title: string; description: string } | null>(null);
  const [isOAuthCallback, setIsOAuthCallback] = useState(false);

  const resolvePostLoginDestination = async (rawNext?: string | null, userId?: string): Promise<string> => {
    if (rawNext && rawNext !== "/" && !rawNext.includes("/login") && !rawNext.includes("/select-module")) {
      let targetCode = "TASK_WORKFLOW";
      if (rawNext.startsWith("/vehicle")) targetCode = "VEHICLE_DESK";
      else if (rawNext.startsWith("/design")) targetCode = "DESIGN_TRACKING";
      else if (rawNext.startsWith("/dashboards")) targetCode = "DASHBOARDS";
      if (typeof document !== "undefined") {
        document.cookie = `active_module=${targetCode}; path=/; max-age=2592000; SameSite=Lax`;
      }
      return rawNext;
    }

    try {
      const url = userId ? `/api/modules?userId=${encodeURIComponent(userId)}` : "/api/modules";
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        
        // Zero authorized modules -> access denied
        if (!data.modules || data.modules.length === 0) {
          return "/login?error=no-module-access";
        }

        const routeMap: Record<string, string> = {
          TASK_WORKFLOW: "/",
          VEHICLE_DESK: "/vehicle",
          DESIGN_TRACKING: "/design/matrix",
          DASHBOARDS: "/dashboards"
        };

        // Exactly one module authorized -> land directly on that module
        if (data.modules.length === 1) {
          const mod = data.modules[0];
          const dest = routeMap[mod.code] || mod.route_path || "/";
          if (typeof document !== "undefined") {
            document.cookie = `active_module=${mod.code}; path=/; max-age=2592000; SameSite=Lax`;
          }
          return dest;
        }

        // Multiple modules authorized and explicit default configured -> land on default
        if (data.hasExplicitDefault && data.defaultModule?.code) {
          const dest = routeMap[data.defaultModule.code] || data.defaultModule.route_path || "/";
          if (typeof document !== "undefined") {
            document.cookie = `active_module=${data.defaultModule.code}; path=/; max-age=2592000; SameSite=Lax`;
          }
          return dest;
        }

        // Multiple modules authorized but no default configured -> open Module Selection screen
        return "/select-module";
      }
    } catch (e) {}

    return "/select-module";
  };

  useEffect(() => {
    const checkSession = async () => {
      if (typeof window === "undefined") return;
      
      const searchParams = new URLSearchParams(window.location.search);
      const isLogout = searchParams.get("action") === "logout" || searchParams.get("reason") === "logout";
      const isTimeout = searchParams.get("reason") === "timeout";
      const isTerminated = searchParams.get("reason") === "terminated";
      const isConcurrent = searchParams.get("reason") === "concurrent_login";
      const isOAuthConflict = searchParams.get("oauth_conflict") === "1";
      const urlError = searchParams.get("error");
      const urlErrorDesc = searchParams.get("error_description");

      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const hashError = hashParams.get("error");
      const hashErrorDesc = hashParams.get("error_description");
      const accessToken = hashParams.get("access_token");

      if (accessToken) {
        setIsOAuthCallback(true);
      }

      const finalError = urlErrorDesc || urlError || hashErrorDesc || hashError;
      
      if (accessToken && !finalError) {
        setIsOAuthCallback(true);
        
        // Listen for the auth state change which sets the cookies in @supabase/ssr
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (event === "SIGNED_IN" && session) {
            const rawNext = searchParams.get("next");
            const destination = await resolvePostLoginDestination(rawNext, session.user.id);
            await completeLogin(session.user, destination);
          }
        });
        
        return;
      }

      if (finalError) {
        if (finalError === "not-registered") {
          setErrorMsg("Your account is not registered in our system. Please contact your administrator.");
        } else if (finalError === "account-disabled") {
          setErrorMsg("Your account has been disabled. Please contact your administrator.");
        } else if (finalError === "account-deleted") {
          setErrorMsg("Your account has been deleted. Please contact your administrator.");
        } else if (finalError === "no-module-access") {
          setErrorMsg("You do not currently have access to any active workspace modules. Please contact your administrator for module assignment.");
        } else if (finalError.includes("otp_expired") || finalError.includes("expired") || finalError === "invitation-expired" || finalError === "invitation-error") {
          setErrorMsg("This invitation link is invalid, expired, or has already been used. Please contact your administrator to request a new invitation link.");
        } else {
          setErrorMsg(`Authentication failed: ${finalError.replace(/\+/g, ' ')}`);
        }
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (isLogout) {
        document.cookie = "active_module=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await Promise.race([supabase.auth.signOut(), new Promise(resolve => setTimeout(resolve, 800))]);
        }
        setSuccessMsg("You have been successfully logged out.");
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (isTerminated) {
        document.cookie = "active_module=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await Promise.race([supabase.auth.signOut(), new Promise(resolve => setTimeout(resolve, 800))]);
        }
        setNoticeMsg({
          type: "warning",
          title: "Session Terminated",
          description: "Your session was terminated by an administrator or remotely."
        });
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (isConcurrent) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await Promise.race([supabase.auth.signOut(), new Promise(resolve => setTimeout(resolve, 800))]);
        }
        setNoticeMsg({
          type: "warning",
          title: "Session Transferred",
          description: "You were logged out because your account was logged in on another device or browser. To continue on this device, please sign in."
        });
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (isTimeout) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await Promise.race([supabase.auth.signOut(), new Promise(resolve => setTimeout(resolve, 800))]);
        }
        setNoticeMsg({
          type: "info",
          title: "Session Expired",
          description: "Your session expired due to inactivity. Please sign in again."
        });
        window.history.replaceState({}, document.title, window.location.pathname);
      } else {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const rawNext = searchParams.get("next");
          const destination = await resolvePostLoginDestination(rawNext, session.user.id);
          window.location.href = destination;
        }
      }
    };

    checkSession();
  }, [router, supabase.auth]);

  const completeLogin = async (user: any, destination: string) => {
    try {
      setLoading(true);
      const newToken = crypto.randomUUID();
      if (typeof window !== "undefined") {
        localStorage.setItem("app_session_token", newToken);
        let activeMod = "TASK_WORKFLOW";
        if (destination.startsWith("/vehicle")) activeMod = "VEHICLE_DESK";
        else if (destination.startsWith("/design")) activeMod = "DESIGN_TRACKING";
        document.cookie = `active_module=${activeMod}; path=/; max-age=2592000; SameSite=Lax`;
      }
      
      // Register session via REST endpoint
      await fetch("/api/session/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionToken: newToken,
          userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined
        })
      }).catch(() => {});

      window.location.href = destination;
    } catch (e: any) {
      window.location.href = destination;
    }
  };

  const handleStandardAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setNoticeMsg(null);

    if (!email.trim() || !password) {
      setErrorMsg("Please fill in all required fields.");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) throw error;

      if (data.user) {
        const searchParams = new URLSearchParams(window.location.search);
        const rawNext = searchParams.get("next");
        const destination = await resolvePostLoginDestination(rawNext, data.user.id);
        await completeLogin(data.user, destination);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred during authentication.");
      setLoading(false);
    }
  };

  const handleMicrosoftLogin = async () => {
    try {
      setErrorMsg(null);
      setNoticeMsg(null);
      setSsoLoading(true);

      const searchParams = new URLSearchParams(window.location.search);
      const rawNext = searchParams.get("next");
      const next = rawNext && rawNext !== "/" && !rawNext.includes("/select-module") ? rawNext : "/";

      // Check if user is already authenticated before initiating SSO
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const destination = await resolvePostLoginDestination(rawNext);
        window.location.href = destination;
        return;
      }

      const callbackUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'azure',
        options: {
          scopes: 'email profile User.Read',
          redirectTo: callbackUrl
        }
      });
      if (error) throw error;
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to initialize Microsoft login.");
      setSsoLoading(false);
    }
  };

  if (isOAuthCallback) {
    return (
      <div className="flex h-screen w-full bg-background text-foreground font-sans overflow-hidden items-center justify-center">
        <ChandakLoader
          size="lg"
          title="Completing sign in..."
          subtitle="Synchronizing enterprise session..."
        />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-background text-foreground font-sans overflow-hidden">
      {/* LEFT PANEL - Branding / Image Split */}
      <div className="relative hidden lg:flex flex-col w-1/2 h-full overflow-hidden bg-sunken border-r border-border text-foreground">
        <Image 
          src="/login-bg.png"
          alt="Abstract Background"
          fill
          priority
          className="object-cover opacity-10 dark:opacity-25 mix-blend-luminosity"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-sunken via-sunken/80 to-sunken/30"></div>

        <div className="relative z-10 flex flex-col items-center justify-center h-full p-12 lg:p-16 text-center">
          {/* Logo - Pushed to Absolute Top */}
          <div className="absolute top-8 lg:top-12 left-0 right-0 flex flex-col items-center px-6 animate-in fade-in slide-in-from-top-8 duration-700">
            <div className="relative w-fit inline-flex py-3.5 px-6 rounded-xl bg-surface border border-border shadow-sm items-center justify-center">
              <img 
                src="/Chandak_Group_Official_Logo.png" 
                alt="Chandak Group Official Logo" 
                className="h-14 lg:h-16 w-auto object-contain dark:brightness-0 dark:invert"
                style={{ imageRendering: "-webkit-optimize-contrast" }}
              />
            </div>
          </div>

          {/* Main Text - Perfectly Centered */}
          <div className="max-w-xl mt-28 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground mb-4 leading-tight">
              Intelligent Governance <br />
              & Enterprise Mastery
            </h1>
            <p className="text-subtle text-base font-normal leading-relaxed max-w-md mx-auto">
              Securely orchestrate enterprise operations, manage identities, and automate workflows in one unified platform.
            </p>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL - Authentication Form */}
      <div className="w-full lg:w-1/2 h-full flex flex-col overflow-y-auto bg-background relative text-foreground">
        <div className="flex-1 flex items-center justify-center p-6 lg:p-12 xl:p-24 relative z-10 min-h-full">
          <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-500 fill-mode-both">
            
            <div className="lg:hidden flex flex-col items-center justify-center mb-8">
              <div className="relative w-fit inline-flex py-2 px-4 items-center justify-center bg-surface rounded-xl shadow-sm border border-border">
                <img 
                  src="/Chandak_Group_Official_Logo.png" 
                  alt="Chandak Group Official Logo" 
                  className="h-10 w-auto object-contain dark:brightness-0 dark:invert"
                  style={{ imageRendering: "-webkit-optimize-contrast" }}
                />
              </div>
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-1.5 text-heading">
                Welcome back
              </h2>
              <p className="text-subtle text-sm">
                Please enter your credentials to sign in to your workspace.
              </p>
            </div>

            {/* Realtime Alert Displays */}
            {noticeMsg && (
              <div className="mb-6 p-3.5 rounded-lg bg-warning-soft border border-warning-border text-warning-text text-sm flex items-start gap-3">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <strong className="font-semibold block">{noticeMsg.title}</strong>
                  <span className="opacity-95">{noticeMsg.description}</span>
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="mb-6 p-3.5 rounded-lg bg-danger-soft border border-danger-border text-danger-text text-sm flex items-start gap-3">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <strong className="font-semibold block">Authentication Failed</strong>
                  <span className="opacity-95">{errorMsg}</span>
                </div>
              </div>
            )}

            {successMsg && (
              <div className="mb-6 p-3.5 rounded-lg bg-success-soft border border-success-border text-success-text text-sm flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 shrink-0" />
                <span className="font-medium">{successMsg}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleStandardAuthSubmit} className="space-y-4" autoComplete="off">
              <AppInput 
                label="Email Address"
                name="email"
                type="email"
                placeholder="user@chandak.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<Mail className="h-4 w-4 text-muted" />}
                required
              />

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-subtle">Password</span>
                  <Link 
                    href="#" 
                    onClick={(e) => { e.preventDefault(); toast.warning("Contact administrator to reset password."); }} 
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <AppInput 
                  name="password"
                  type="password"
                  placeholder="••••••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  leftIcon={<Lock className="h-4 w-4 text-muted" />}
                  required
                />
              </div>

              <AppButton 
                type="submit" 
                variant="primary"
                disabled={loading || !!successMsg}
                className="w-full h-10 mt-2 font-semibold"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <span className="h-4 w-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                    <span>Processing...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2 w-full">
                    <span>Sign In</span>
                    <ArrowRight className="h-4 w-4" />
                  </div>
                )}
              </AppButton>
            </form>

            <div className="relative py-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border"></span>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-3 font-medium tracking-wider text-muted">
                  Or Continue With
                </span>
              </div>
            </div>

            <AppButton
              type="button"
              variant="secondary"
              onClick={handleMicrosoftLogin}
              disabled={ssoLoading}
              className="w-full h-10 flex items-center justify-center gap-3 font-medium"
            >
              {ssoLoading ? (
                <div className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  Connecting to Microsoft...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 21 21">
                    <path fill="#f25022" d="M1 1h9v9H1z"/>
                    <path fill="#00a4ef" d="M1 11h9v9H1z"/>
                    <path fill="#7fba00" d="M11 1h9v9h-9z"/>
                    <path fill="#ffb900" d="M11 11h9v9h-9z"/>
                  </svg>
                  <span>Continue with Microsoft</span>
                </div>
              )}
            </AppButton>

          </div>
        </div>
      </div>
    </div>
  );
}

