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

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [ssoLoading, setSsoLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isOAuthCallback, setIsOAuthCallback] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      if (typeof window === "undefined") return;
      
      const searchParams = new URLSearchParams(window.location.search);
      const isLogout = searchParams.get("action") === "logout" || searchParams.get("reason") === "logout";
      const isTimeout = searchParams.get("reason") === "timeout";
      const isTerminated = searchParams.get("reason") === "terminated";
      const isConcurrent = searchParams.get("reason") === "concurrent_login";
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
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === "SIGNED_IN" && session) {
            const next = searchParams.get("next") || "/";
            // Wait 500ms to ensure @supabase/ssr has completely finished writing cookies
            setTimeout(() => {
              window.location.href = next;
            }, 500);
          }
        });
        
        // Fallback just in case the event already fired before we attached the listener
        setTimeout(async () => {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            const next = searchParams.get("next") || "/";
            window.location.href = next;
          }
        }, 1500);
        
        return; // Exit early, let the event listener or fallback handle the redirect
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
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await Promise.race([supabase.auth.signOut(), new Promise(resolve => setTimeout(resolve, 800))]);
        }
        setSuccessMsg("You have been successfully logged out.");
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (isTerminated) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await Promise.race([supabase.auth.signOut(), new Promise(resolve => setTimeout(resolve, 800))]);
        }
        setErrorMsg("Your session was terminated by an administrator or remotely.");
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (isConcurrent) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await Promise.race([supabase.auth.signOut(), new Promise(resolve => setTimeout(resolve, 800))]);
        }
        setErrorMsg("Your account was logged into on another device.");
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (isTimeout) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await Promise.race([supabase.auth.signOut(), new Promise(resolve => setTimeout(resolve, 800))]);
        }
        setErrorMsg("Your session expired. Please sign in again.");
        window.history.replaceState({}, document.title, window.location.pathname);
      } else {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const next = searchParams.get("next") || "/";
          window.location.href = next;
        }
      }
    };

    checkSession();
  }, [router, supabase.auth]);

  const handleStandardAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

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
        try {
          const currentToken = typeof window !== "undefined" ? localStorage.getItem("app_session_token") : null;
          const { data: sessionData } = await supabase
            .from("active_sessions")
            .select("session_token, last_active_at")
            .eq("user_id", data.user.id)
            .maybeSingle();

          if (sessionData && sessionData.last_active_at) {
            const lastActive = new Date(sessionData.last_active_at).getTime();
            const now = Date.now();
            const isRecent = (now - lastActive) < 5 * 60 * 1000;
            const isDifferentSession = currentToken ? sessionData.session_token !== currentToken : true;

            if (isRecent && isDifferentSession) {
              const proceed = window.confirm("Your account is currently active on another device or browser. Continuing will terminate your other session. Do you want to continue?");
              if (!proceed) {
                await Promise.race([supabase.auth.signOut(), new Promise(resolve => setTimeout(resolve, 800))]);
                setLoading(false);
                return;
              }
            }
          }
        } catch (e) {}
      }

      const searchParams = new URLSearchParams(window.location.search);
      const next = searchParams.get("next") || "/";
      window.location.href = next;

    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred during authentication.");
    } finally {
      setLoading(false); 
    }
  };

  const handleMicrosoftLogin = async () => {
    try {
      setErrorMsg(null);
      setSsoLoading(true);

      const searchParams = new URLSearchParams(window.location.search);
      const next = searchParams.get("next") || "/";

      // Check if user is already authenticated before initiating SSO
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        window.location.href = next;
        return;
      }

      const callbackUrl = searchParams.has("next") 
        ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(searchParams.get("next")!)}` 
        : `${window.location.origin}/auth/callback`;

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
        <div className="flex flex-col items-center gap-4">
          <span className="h-10 w-10 rounded-full border-4 border-current border-t-transparent animate-spin text-theme-icon" />
          <p className="text-lg font-semibold tracking-wide text-muted-foreground">Completing sign in...</p>
        </div>
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
          <div className="absolute top-10 lg:top-14 left-0 right-0 flex flex-col items-center px-8 animate-in fade-in slide-in-from-top-8 duration-1000 delay-300">
            <div className="relative w-full max-w-[460px] py-4 px-6 rounded-2xl bg-surface/80 dark:bg-surface/40 backdrop-blur-md shadow-lg border border-border/60 flex items-center justify-center transition-all hover:shadow-xl">
              <img 
                src="/Chandak-Group-Final-Logo.svg" 
                alt="Chandak Logo" 
                className="h-16 lg:h-20 w-auto max-w-full object-contain dark:brightness-0 dark:invert"
                style={{ imageRendering: '-webkit-optimize-contrast' }}
              />
            </div>
          </div>

          {/* Main Text - Perfectly Centered */}
          <div className="max-w-xl mt-28 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-500">
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
              <div className="relative w-full max-w-[340px] py-3.5 px-5 flex items-center justify-center bg-surface/80 rounded-2xl shadow-md border border-border/50">
                <img 
                  src="/Chandak-Group-Final-Logo.svg" 
                  alt="Chandak Logo" 
                  className="h-12 w-auto max-w-full object-contain dark:brightness-0 dark:invert"
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

    </div>
  );
}

