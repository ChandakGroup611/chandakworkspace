"use client";
import { MODULE_HOME, moduleOfPath, isDeepLink, markModuleChosen, clearModuleChosen } from "@/lib/module-gate";
import { toast } from 'react-toastify';

import React, { useState, useEffect } from "react";
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
  Bell
} from "lucide-react";
import ChandakLoader from "@/components/ui/ChandakLoader";
import { LoginScene3D, sceneInk } from "@/components/auth/LoginScene3D";
import { LoginScreensaver } from "@/components/auth/LoginScreensaver";
import { LoginFormBackdrop, formMotion, loginBlend } from "@/components/auth/LoginFormBackdrop";

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
  const [notifPerm, setNotifPerm] = useState<string>("granted");

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotifPerm(Notification.permission);
    }
  }, []);

  // Where to go after sign-in. Rules (lib/module-gate.ts): one module → open it; a saved default →
  // open it; otherwise the "Choose a module" screen. A deep link (?next=) is honoured only when a
  // module is opened automatically and the link belongs to a module the person can use; with no
  // default it is passed to the selection screen, which opens it if they pick its module.
  const resolvePostLoginDestination = async (rawNext?: string | null, userId?: string): Promise<string> => {
    clearModuleChosen();
    const nextQs = isDeepLink(rawNext) ? `?next=${encodeURIComponent(rawNext)}` : "";
    const setActive = (code: string) => {
      if (typeof document !== "undefined") {
        document.cookie = `active_module=${code}; path=/; max-age=2592000; SameSite=Lax`;
      }
    };

    try {
      const url = userId ? `/api/modules?userId=${encodeURIComponent(userId)}` : "/api/modules";
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        
        // Zero authorized modules -> access denied
        if (!data.modules || data.modules.length === 0) {
          return "/login?error=no-module-access";
        }

        const allowed = (code: string) => data.modules.some((m: any) => m.code === code);
        const targetMod = rawNext ? moduleOfPath(rawNext) : null;
        const nextModule = targetMod && allowed(targetMod) ? targetMod : null;

        // Exactly one module authorized -> land directly on that module
        if (data.modules.length === 1) {
          const mod = data.modules[0];
          setActive(mod.code);
          markModuleChosen();
          return nextModule === mod.code && rawNext ? rawNext : (MODULE_HOME[mod.code] || mod.route_path || "/");
        }

        // Multiple modules authorized and explicit default configured -> land on default (or the deep link)
        if (data.hasExplicitDefault && data.defaultModule?.code) {
          const code = nextModule || data.defaultModule.code;
          setActive(code);
          markModuleChosen();
          return nextModule && rawNext ? rawNext : (MODULE_HOME[code] || data.defaultModule.route_path || "/");
        }

        // Multiple modules authorized but no default configured -> open Module Selection screen
        return `/select-module${nextQs}`;
      }
    } catch (e) {}

    return `/select-module${nextQs}`;
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
        setSuccessMsg("You've signed out.");
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (isTerminated) {
        document.cookie = "active_module=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await Promise.race([supabase.auth.signOut(), new Promise(resolve => setTimeout(resolve, 800))]);
        }
        setNoticeMsg({
          type: "warning",
          title: "Session terminated",
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
          title: "Session transferred",
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
          title: "Session expired",
          description: "Your session expired due to inactivity. Please sign in again."
        });
        window.history.replaceState({}, document.title, window.location.pathname);
      } else {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          if (typeof window !== "undefined") {
            if (session.user?.id) localStorage.setItem("chandak_messenger_user_id", session.user.id);
            if (session.user?.email) localStorage.setItem("chandak_messenger_user_email", session.user.email);
          }
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
        if (user?.id) localStorage.setItem("chandak_messenger_user_id", user.id);
        if (user?.email) localStorage.setItem("chandak_messenger_user_email", user.email);
        if (user?.user_metadata?.full_name) localStorage.setItem("chandak_messenger_user_name", user.user_metadata.full_name);
        if (!destination.startsWith("/select-module") && !destination.startsWith("/login")) {
          const destMod = moduleOfPath(destination);
          if (destMod) {
            document.cookie = `active_module=${destMod}; path=/; max-age=2592000; SameSite=Lax`;
          }
        }
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
      setErrorMsg("Enter your email address and password.");
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
      setErrorMsg(err.message === "Invalid login credentials" ? "That email and password don't match. Check them and try again." : (err.message || "Sign-in didn't complete. Try again."));
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
      setErrorMsg(err.message || "Couldn't start Microsoft sign-in. Try again.");
      setSsoLoading(false);
    }
  };

  if (isOAuthCallback) {
    return (
      <div className="flex h-screen w-full bg-background text-foreground font-sans overflow-hidden items-center justify-center">
        <ChandakLoader
          size="lg"
          title="Signing you in…"
          subtitle="Setting up your session"
        />
      </div>
    );
  }

  return (
    <div className="relative flex h-screen w-full bg-background text-foreground font-sans overflow-hidden">
      {/* idle "live screen" after 5 minutes without input */}
      <LoginScreensaver disabled={loading || ssoLoading} />
      <div className={loginBlend.seam} aria-hidden />

      {/* LEFT PANEL - 3D brand scene (large screens). The scene runs on under the form side and
          fades out there, so the two halves blend into one page instead of meeting at a hard edge. */}
      <div className="relative hidden h-full w-1/2 flex-col lg:flex">
        <div className={loginBlend.sceneBleed}>
          <LoginScene3D />
        </div>
        <div className="pointer-events-none relative z-10 flex h-full flex-col items-center justify-end p-10 text-center xl:p-14">
          <div className="max-w-xl animate-in fade-in-0 slide-in-from-bottom-3 duration-700">
            <h1 className={`mb-3 text-[32px] font-semibold leading-tight tracking-[-0.01em] ${sceneInk.title}`}>
              Chandak Workspace
            </h1>
            <p className={`mx-auto max-w-md text-[15px] leading-relaxed ${sceneInk.subtitle}`}>
              Tasks, tickets, requirements, AMC, fleet and design approvals for every Chandak Group team, in one place.
            </p>
            <p className={`mt-5 text-[11.5px] font-semibold ${sceneInk.motto}`}>
              Promises made · Promises kept
            </p>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL - Authentication Form */}
      <div className="w-full lg:w-1/2 h-full flex flex-col overflow-y-auto bg-background lg:bg-transparent relative text-foreground">
        <LoginFormBackdrop />
        <div className="flex-1 flex items-center justify-center p-6 lg:p-12 xl:p-24 relative z-10 min-h-full">
          <div className={`w-full max-w-[440px] relative mt-8 lg:mt-0 ${formMotion.card}`}>
            
            {/* Crest logo badge straddling the top border */}
            <div className={formMotion.logoBadgeContainer}>
              <div className={formMotion.logoBadge}>
                <div className={formMotion.logoBadgeInner}>
                  <img
                    src="/Chandak_Group_Official_Logo.png"
                    alt="Chandak Group official logo"
                    className="h-12 sm:h-13 lg:h-14 w-auto object-contain dark:brightness-0 dark:invert transition-transform duration-300"
                    style={{ imageRendering: "-webkit-optimize-contrast" }}
                  />
                </div>
              </div>
            </div>

            {/* phones and tablets: compact animated header */}
            <div className="relative mb-6 mt-6 overflow-hidden rounded-xl lg:hidden">
              <LoginScene3D variant="compact" />
            </div>

            <div className={`mb-8 pt-5 lg:pt-6 ${formMotion.item}`} style={{ "--d": 0 } as React.CSSProperties}>
              <h2 className={`mb-3 text-[22px] font-semibold text-heading ${formMotion.underline}`}>
                Sign in
              </h2>
              <p className="text-[13.5px] text-subtle">
                Use your Chandak Microsoft account, or your email and password.
              </p>
            </div>

            {/* Desktop Notification Alert Enable */}
            {notifPerm === "default" && (
              <div className="mb-5 flex items-center justify-between gap-3 rounded-lg border border-info-border bg-info-soft p-3 text-xs text-foreground animate-in fade-in duration-200">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-info-text shrink-0" />
                  <span className="font-medium">Get desktop message alerts even when logged out</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== "undefined" && "Notification" in window) {
                      Notification.requestPermission().then((p) => setNotifPerm(p));
                    }
                  }}
                  className="px-2.5 py-1 rounded bg-info hover:bg-info text-white font-semibold text-[11px] shrink-0 cursor-pointer"
                >
                  Enable
                </button>
              </div>
            )}

            {/* Realtime Alert Displays */}
            {noticeMsg && (
              <div role="status" className={`mb-5 flex items-start gap-3 rounded-md border p-3 text-[13.5px] ${noticeMsg.type === "info" ? "border-info-border bg-info-soft text-info-text" : "border-warning-border bg-warning-soft text-warning-text"}`}>
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <div className="space-y-0.5">
                  <strong className="font-semibold block">{noticeMsg.title}</strong>
                  <span className="opacity-95">{noticeMsg.description}</span>
                </div>
              </div>
            )}

            {errorMsg && (
              <div role="alert" className="mb-5 flex items-start gap-3 rounded-md border border-danger-border bg-danger-soft p-3 text-[13.5px] text-danger-text">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <div className="space-y-0.5">
                  <strong className="block font-semibold">Couldn't sign you in</strong>
                  <span className="opacity-95">{errorMsg}</span>
                </div>
              </div>
            )}

            {successMsg && (
              <div role="status" className="mb-5 flex items-center gap-3 rounded-md border border-success-border bg-success-soft p-3 text-[13.5px] text-success-text">
                <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden />
                <span className="font-medium">{successMsg}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleStandardAuthSubmit} className="space-y-4">
              <div className={formMotion.item} style={{ "--d": 1 } as React.CSSProperties}>
              <AppInput 
                label="Email address"
                name="email"
                type="email"
                placeholder="name@chandakgroup.com"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<Mail className="h-4 w-4 text-muted" />}
                required
              />
              </div>

              <div className={`space-y-1 ${formMotion.item}`} style={{ "--d": 2 } as React.CSSProperties}>
                <div className="flex items-center justify-between">
                  <label htmlFor="login-password" className="text-[13px] font-medium text-subtle">Password</label>
                  <button
                    type="button"
                    onClick={() => { toast.info("To reset your password, contact IT support (Noreply@chandakgroup.com)."); }}
                    className="text-[12.5px] font-medium text-accent-soft-text hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <AppInput 
                  id="login-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  leftIcon={<Lock className="h-4 w-4 text-muted" />}
                  required
                />
              </div>

              <div className={formMotion.item} style={{ "--d": 3 } as React.CSSProperties}>
              <AppButton 
                type="submit" 
                variant="primary"
                disabled={loading || !!successMsg}
                isLoading={loading}
                size="lg"
                className={`mt-2 w-full ${formMotion.sheen}`}
                rightIcon={loading ? undefined : <ArrowRight className="h-4 w-4" />}
              >
                {loading ? "Signing in…" : "Sign in"}
              </AppButton>
              </div>
            </form>

            {/* lines on either side of "or" (no background patch, so the animated backdrop shows through) */}
            <div className={`flex items-center gap-3 py-6 ${formMotion.item}`} style={{ "--d": 4 } as React.CSSProperties}>
              <span className="flex-1 border-t border-border"></span>
              <span className="text-[12.5px] text-muted">or</span>
              <span className="flex-1 border-t border-border"></span>
            </div>

            <div className={formMotion.item} style={{ "--d": 5 } as React.CSSProperties}>
            <AppButton
              type="button"
              variant="secondary"
              onClick={handleMicrosoftLogin}
              disabled={ssoLoading}
              isLoading={ssoLoading}
              size="lg"
              className="w-full"
            >
              {ssoLoading ? (
                "Connecting to Microsoft…"
              ) : (
                <div className="flex items-center gap-2">
                  {/* ui-audit-ignore-next-line Microsoft brand mark must keep its own colours */}
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 21 21" aria-hidden>
                    {/* ui-audit-ignore-next-line Microsoft brand colours */}
                    <path fill="#f25022" d="M1 1h9v9H1z"/>
                    {/* ui-audit-ignore-next-line Microsoft brand colours */}
                    <path fill="#00a4ef" d="M1 11h9v9H1z"/>
                    {/* ui-audit-ignore-next-line Microsoft brand colours */}
                    <path fill="#7fba00" d="M11 1h9v9h-9z"/>
                    {/* ui-audit-ignore-next-line Microsoft brand colours */}
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
    </div>
  );
}

