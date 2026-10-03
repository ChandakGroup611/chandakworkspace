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
  Zap,
  Smartphone,
  Laptop,
  Globe,
  Clock,
  LogOut
} from "lucide-react";
import ChandakLoader from "@/components/ui/ChandakLoader";
import { checkActiveSessionConflict, registerUserSession } from "@/lib/actions/iam";

function formatUserAgent(ua?: string) {
  if (!ua || ua === "Unknown Browser" || ua === "Unknown Device") return "Active Browser / Device";
  let browser = "Web Browser";
  let os = "Device";

  if (ua.includes("Firefox/")) browser = "Mozilla Firefox";
  else if (ua.includes("Edg/")) browser = "Microsoft Edge";
  else if (ua.includes("Chrome/")) browser = "Google Chrome";
  else if (ua.includes("Safari/")) browser = "Apple Safari";
  else if (ua.includes("MSIE") || ua.includes("Trident/")) browser = "Internet Explorer";

  if (ua.includes("Windows")) os = "Windows PC";
  else if (ua.includes("Macintosh") || ua.includes("Mac OS")) os = "Mac";
  else if (ua.includes("iPhone")) os = "iPhone";
  else if (ua.includes("iPad")) os = "iPad";
  else if (ua.includes("Android")) os = "Android Device";
  else if (ua.includes("Linux")) os = "Linux";

  return `${browser} on ${os}`;
}

function formatRelativeTime(dateString?: string) {
  if (!dateString) return "Recently active";
  const date = new Date(dateString);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);

  if (diffMinutes < 1) return "Active just now";
  if (diffMinutes < 60) return `Active ${diffMinutes} min${diffMinutes > 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `Active ${diffHours} hr${diffHours > 1 ? "s" : ""} ago`;
  return `Active on ${date.toLocaleDateString([], { month: "short", day: "numeric" })}`;
}

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
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [conflictData, setConflictData] = useState<{ 
    user: any; 
    destination: string;
    existingSession?: {
      userAgent?: string;
      ipAddress?: string;
      loginTime?: string;
      lastActiveAt?: string;
    };
  } | null>(null);

  const checkConflictViaApi = async (userId: string) => {
    try {
      const currentToken = typeof window !== "undefined" ? localStorage.getItem("app_session_token") : null;
      const res = await fetch("/api/session/conflict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, currentSessionToken: currentToken || undefined })
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn("[Login] Conflict check API warning:", e);
    }
    // Fallback to server action
    try {
      const currentToken = typeof window !== "undefined" ? localStorage.getItem("app_session_token") : null;
      return await checkActiveSessionConflict(userId, currentToken || undefined);
    } catch {
      return { hasConflict: false };
    }
  };

  const resolvePostLoginDestination = async (rawNext?: string | null, userId?: string): Promise<string> => {
    if (rawNext && rawNext !== "/" && !rawNext.includes("/login") && !rawNext.includes("/select-module")) {
      let targetCode = "TASK_WORKFLOW";
      if (rawNext.startsWith("/vehicle")) targetCode = "VEHICLE_DESK";
      else if (rawNext.startsWith("/design")) targetCode = "DESIGN_TRACKING";
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
        const targetModule = data.defaultModule || data.modules?.find((m: any) => m.is_default) || data.modules?.[0];
        if (targetModule?.code) {
          const routeMap: Record<string, string> = {
            TASK_WORKFLOW: "/",
            VEHICLE_DESK: "/vehicle",
            DESIGN_TRACKING: "/design/matrix"
          };
          const dest = routeMap[targetModule.code] || targetModule.route_path || "/";
          if (typeof document !== "undefined") {
            document.cookie = `active_module=${targetModule.code}; path=/; max-age=2592000; SameSite=Lax`;
          }
          return dest;
        }
      }
    } catch (e) {}

    return "/";
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
            
            const conflictRes = await checkConflictViaApi(session.user.id);
            
            if (conflictRes.hasConflict) {
              setIsOAuthCallback(false);
              setConflictData({ 
                user: session.user, 
                destination,
                existingSession: conflictRes.existingSession
              });
              setConflictModalOpen(true);
              return;
            }

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

          const conflictRes = await checkConflictViaApi(session.user.id);

          if (isOAuthConflict || conflictRes.hasConflict) {
            setConflictData({ 
              user: session.user, 
              destination,
              existingSession: conflictRes.existingSession
            });
            setConflictModalOpen(true);
            return;
          }

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

  const handleCancelConflictLogin = async () => {
    setConflictModalOpen(false);
    setConflictData(null);
    setLoading(false);
    await supabase.auth.signOut().catch(() => {});
  };

  const handleConfirmConflictLogin = async () => {
    if (!conflictData) return;
    setConflictModalOpen(false);
    await completeLogin(conflictData.user, conflictData.destination);
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

        const conflictRes = await checkConflictViaApi(data.user.id);

        if (conflictRes.hasConflict) {
          setConflictData({ 
            user: data.user, 
            destination,
            existingSession: conflictRes.existingSession
          });
          setConflictModalOpen(true);
          setLoading(false);
          return;
        }

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
      <style dangerouslySetInnerHTML={{__html: `
        input:-webkit-autofill,
        input:-webkit-autofill:hover, 
        input:-webkit-autofill:focus, 
        input:-webkit-autofill:active {
            -webkit-box-shadow: 0 0 0 30px var(--color-surface) inset !important;
            -webkit-text-fill-color: var(--color-foreground) !important;
        }
      `}} />
      {/* LEFT PANEL - Branding / Image Split */}
      <div className="relative hidden lg:flex flex-col w-1/2 h-full overflow-hidden bg-surface text-foreground">
        <Image 
          src="/login-bg.png"
          alt="Abstract Background"
          fill
          priority
          className="object-cover opacity-10 dark:opacity-30 mix-blend-luminosity"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/80 to-surface/20"></div>
        
        {/* Abstract Glow Effects */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-theme-btn-primary/30 blur-[120px] animate-pulse duration-[10000ms]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-theme-btn-primary/20 blur-[150px] animate-pulse duration-[12000ms]"></div>

        <div className="relative z-10 flex flex-col items-center justify-center h-full p-12 lg:p-16 text-center">
          
          {/* Logo - Pushed to Absolute Top */}
          <div className="absolute top-8 lg:top-12 left-0 right-0 flex flex-col items-center px-6 animate-in fade-in slide-in-from-top-8 duration-1000 delay-300">
            <div className="relative w-fit inline-flex py-3.5 px-6 rounded-2xl bg-surface/90 dark:bg-surface/50 backdrop-blur-md shadow-xl border border-border/70 items-center justify-center transition-all hover:shadow-2xl">
              <img 
                src="/Chandak_Group_Official_Logo.png" 
                alt="Chandak Group Official Logo" 
                className="h-16 lg:h-20 w-auto object-contain dark:brightness-0 dark:invert"
                style={{ imageRendering: '-webkit-optimize-contrast' }}
              />
            </div>
          </div>

          {/* Main Text - Perfectly Centered */}
          <div className="max-w-xl mt-32 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-500">
            <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-foreground mb-12 leading-tight drop-shadow-sm">
              Intelligent Governance <br />
              & Enterprise Mastery
            </h1>
            <p className="text-muted-foreground text-lg font-medium leading-relaxed max-w-md mx-auto drop-shadow-sm">
              Securely orchestrate enterprise operations, manage identities, and automate workflows in one unified platform.
            </p>
          </div>

        </div>
      </div>

      {/* RIGHT PANEL - Authentication Form */}
      <div className="w-full lg:w-1/2 h-full flex flex-col overflow-y-auto bg-background relative text-foreground">
        {/* Subtle grid on right panel for texture */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20 pointer-events-none"></div>

        <div className="flex-1 flex items-center justify-center p-6 lg:p-12 xl:p-24 relative z-10 min-h-full">
          <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-700 fill-mode-both">
            
            <div className="lg:hidden flex flex-col items-center justify-center mb-8">
              <div className="relative w-fit inline-flex py-2.5 px-5 items-center justify-center bg-surface/90 rounded-2xl shadow-lg border border-border/60">
                <img 
                  src="/Chandak_Group_Official_Logo.png" 
                  alt="Chandak Group Official Logo" 
                  className="h-11 w-auto object-contain dark:brightness-0 dark:invert"
                  style={{ imageRendering: '-webkit-optimize-contrast' }}
                />
              </div>
            </div>

            <div className="mb-10 lg:mb-12">
              <h2 className="text-3xl font-bold mb-2 text-foreground">
                Welcome back
              </h2>
              <p className="mb-4 text-muted-foreground">
                Please enter your details to sign in to your workspace.
              </p>
            </div>

            {/* Realtime Alert Displays */}
            {noticeMsg && (
              <div className="mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-200 text-sm flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <div className="space-y-1">
                  <strong className="font-semibold block text-amber-900 dark:text-amber-300">{noticeMsg.title}</strong>
                  <span className="opacity-90">{noticeMsg.description}</span>
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-danger dark:text-danger text-sm flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <strong className="font-semibold block">Authentication Failed</strong>
                  <span className="opacity-90">{errorMsg}</span>
                </div>
              </div>
            )}

            {successMsg && (
              <div className="mb-6 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-success dark:text-success text-sm flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                <ShieldCheck className="h-5 w-5 shrink-0" />
                <span className="font-medium">{successMsg}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleStandardAuthSubmit} className="space-y-5" autoComplete="off">

              <div className="space-y-2">
                <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  Email Address
                </label>
                <AppInput 
                  name="email"
                  type="email"
                  placeholder="user@enterprise.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  leftIcon={<Mail className="h-4 w-4 text-muted-foreground" />}
                  className="h-12 bg-surface border-border focus:bg-surface transition-colors text-foreground"
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    Password
                  </label>
                  <Link href="#" onClick={(e) => { e.preventDefault(); toast.warning("Contact administrator to reset password."); }} className="text-xs font-semibold text-theme-icon hover:text-theme-icon/80 transition-colors">
                    Forgot password?
                  </Link>
                </div>
                <AppInput 
                  name="password"
                  type="password"
                  placeholder="••••••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  leftIcon={<Lock className="h-4 w-4 text-muted-foreground" />}
                  className="h-12 bg-surface border-border focus:bg-surface transition-colors text-foreground"
                  required
                />
              </div>

              <AppButton 
                type="submit" 
                variant="primary"
                disabled={loading || !!successMsg}
                className="w-full h-12 mt-4 text-base font-semibold shadow-lg shadow-theme-btn-primary/20 hover:shadow-theme-btn-primary/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <span className="h-5 w-5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
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

            <div className="relative py-8">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border"></span>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-4 font-semibold tracking-widest text-muted-foreground">
                  Or Continue With
                </span>
              </div>
            </div>

            <AppButton
              type="button"
              variant="outline"
              onClick={handleMicrosoftLogin}
              disabled={ssoLoading}
              className="w-full h-12 flex items-center justify-center gap-3 transition-all duration-200 hover:bg-surface/50 font-semibold bg-transparent border border-border text-foreground"
            >
              {ssoLoading ? (
                <div className="flex items-center gap-2 text-foreground">
                  <span className="h-5 w-5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  Connecting to Microsoft...
                </div>
              ) : (
                <div className="flex items-center gap-2 text-foreground">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 21 21">
                    <path fill="#f25022" d="M1 1h9v9H1z"/>
                    <path fill="#00a4ef" d="M1 11h9v9H1z"/>
                    <path fill="#7fba00" d="M11 1h9v9h-9z"/>
                    <path fill="#ffb900" d="M11 11h9v9h-9z"/>
                  </svg>
                  Continue with Microsoft
                </div>
              )}
            </AppButton>

          </div>
        </div>
      </div>

      {/* Active Session Confirmation Modal: "Do you want to continue here?" */}
      {conflictModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg p-6 bg-surface rounded-2xl border border-border shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 text-foreground">
            <div className="flex items-center gap-3.5">
              <div className="h-12 w-12 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-sm">
                <Laptop className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Active Session Detected</h3>
                <p className="text-xs text-muted-foreground">Single Active Device Policy</p>
              </div>
            </div>

            {/* Existing Session Summary Card */}
            {conflictData?.existingSession && (
              <div className="p-3.5 rounded-xl bg-elevated/70 border border-border/80 space-y-2.5 text-xs">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Currently Active Device
                </span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-foreground">
                  <div className="flex items-center gap-2 bg-surface/60 p-2 rounded-lg border border-border/40">
                    <Laptop className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    <span className="truncate font-medium" title={conflictData.existingSession.userAgent}>
                      {formatUserAgent(conflictData.existingSession.userAgent)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 bg-surface/60 p-2 rounded-lg border border-border/40">
                    <Globe className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                    <span className="truncate font-mono text-[11px]" title={conflictData.existingSession.ipAddress}>
                      IP: {conflictData.existingSession.ipAddress || "Unknown"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-muted-foreground pt-1">
                  <Clock className="h-3.5 w-3.5 text-amber-500/80 shrink-0" />
                  <span>{formatRelativeTime(conflictData.existingSession.lastActiveAt)}</span>
                </div>
              </div>
            )}

            {/* Explanation Alert */}
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm text-foreground space-y-2">
              <p className="font-bold text-foreground text-sm flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                <span>Do you want to continue here?</span>
              </p>
              <p className="text-muted-foreground leading-relaxed text-xs">
                Signing in on this device will <strong className="text-foreground">automatically log out and close your previous session</strong> on the other device or browser.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <AppButton
                type="button"
                variant="outline"
                onClick={handleCancelConflictLogin}
                className="h-10 px-4 text-xs font-semibold border border-border hover:bg-surface/60 text-muted-foreground hover:text-foreground"
              >
                Cancel (Keep Other Session)
              </AppButton>
              <AppButton
                type="button"
                variant="primary"
                onClick={handleConfirmConflictLogin}
                className="h-10 px-5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-600/20 flex items-center gap-2"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Yes, Continue & Log In Here</span>
              </AppButton>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

