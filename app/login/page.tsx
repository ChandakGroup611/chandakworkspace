"use client";

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

  useEffect(() => {
    const checkSession = async () => {
      if (typeof window === "undefined") return;
      
      const searchParams = new URLSearchParams(window.location.search);
      const isLogout = searchParams.get("action") === "logout";
      const isTimeout = searchParams.get("reason") === "timeout";
      const urlError = searchParams.get("error");
      const urlErrorDesc = searchParams.get("error_description");

      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const hashError = hashParams.get("error");
      const hashErrorDesc = hashParams.get("error_description");

      const finalError = urlErrorDesc || urlError || hashErrorDesc || hashError;
      if (finalError) {
        setErrorMsg(`Authentication failed: ${finalError.replace(/\+/g, ' ')}`);
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (isLogout) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await Promise.race([supabase.auth.signOut(), new Promise(resolve => setTimeout(resolve, 800))]);
        }
        setSuccessMsg("You have been successfully logged out.");
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (isTimeout) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await Promise.race([supabase.auth.signOut(), new Promise(resolve => setTimeout(resolve, 800))]);
        }
        setErrorMsg("Your session expired due to inactivity. Please sign in again.");
        window.history.replaceState({}, document.title, window.location.pathname);
      } else {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          router.push("/");
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
          const { data: sessionData } = await supabase
            .from("active_sessions")
            .select("last_active_at")
            .eq("user_id", data.user.id)
            .single();

          if (sessionData && sessionData.last_active_at) {
            const lastActive = new Date(sessionData.last_active_at).getTime();
            const now = Date.now();
            if (now - lastActive < 5 * 60 * 1000) {
              const proceed = window.confirm("Your ID is already logged in on another device. Do you want to continue? (This will log out the other device)");
              if (!proceed) {
                await Promise.race([supabase.auth.signOut(), new Promise(resolve => setTimeout(resolve, 800))]);
                setLoading(false);
                return;
              }
            }
          }
        } catch (e) {}
      }

      window.location.href = "/";

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
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'azure',
        options: {
          scopes: 'email profile User.Read',
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            prompt: 'select_account'
          }
        }
      });
      if (error) throw error;
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to initialize Microsoft login.");
      setSsoLoading(false);
    }
  };

  return (
    <div className="dark theme-dark flex h-screen w-full bg-[#0A0D14] text-white font-sans overflow-hidden" data-theme="glass-intelligence" style={{ colorScheme: 'dark' }}>
      <style dangerouslySetInnerHTML={{__html: `
        input:-webkit-autofill,
        input:-webkit-autofill:hover, 
        input:-webkit-autofill:focus, 
        input:-webkit-autofill:active {
            -webkit-box-shadow: 0 0 0 30px #0A0D14 inset !important;
            -webkit-text-fill-color: white !important;
        }
      `}} />
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
            <div className="relative h-24 w-64 lg:h-32 lg:w-80 bg-surface/95 rounded-2xl p-4 shadow-2xl backdrop-blur-sm border border-white/20 flex items-center justify-center">
              <img 
                src="/Chandak-Group-Final-Logo.svg" 
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

        <div className="flex-1 flex items-center justify-center p-6 lg:p-12 xl:p-24 relative z-10 min-h-full">
          <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-700 fill-mode-both">
            
            <div className="lg:hidden flex flex-col items-center justify-center mb-10">
              <div className="relative h-20 w-56 flex items-center justify-center">
                <img 
                  src="/Chandak-Group-Final-Logo.svg" 
                  alt="Chandak Logo" 
                  className="h-full w-auto max-w-full object-contain"
                />
              </div>
            </div>

            <div className="mb-10 lg:mb-12">
              <h2 className="text-3xl font-bold mb-2" style={{ color: '#ffffff' }}>
                Welcome back
              </h2>
              <p className="mb-4" style={{ color: '#9ca3af' }}>
                Please enter your details to sign in to your workspace.
              </p>
            </div>

            {/* Realtime Alert Displays */}
            {errorMsg && (
              <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-sm flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <strong className="font-semibold block">Authentication Failed</strong>
                  <span className="opacity-90">{errorMsg}</span>
                </div>
              </div>
            )}

            {successMsg && (
              <div className="mb-6 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400 text-sm flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                <ShieldCheck className="h-5 w-5 shrink-0" />
                <span className="font-medium">{successMsg}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleStandardAuthSubmit} className="space-y-5" autoComplete="off">

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider" style={{ color: '#9ca3af' }}>
                  Email Address
                </label>
                <AppInput 
                  name="email"
                  type="email"
                  placeholder="user@enterprise.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  leftIcon={<Mail className="h-4 w-4 text-muted-foreground" />}
                  className="h-12 bg-[#0A0D14] lg:bg-surface/5 border-white/10 focus:bg-[#0A0D14] transition-colors text-white"
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider" style={{ color: '#9ca3af' }}>
                    Password
                  </label>
                  <Link href="#" onClick={(e) => { e.preventDefault(); alert("Contact administrator to reset password."); }} className="text-xs font-semibold text-accent hover:text-accent/80 transition-colors">
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
                  className="h-12 bg-[#0A0D14] lg:bg-surface/5 border-white/10 focus:bg-[#0A0D14] transition-colors text-white"
                  required
                />
              </div>

              <AppButton 
                type="submit" 
                variant="primary"
                disabled={loading || !!successMsg}
                className="w-full h-12 mt-4 text-base font-semibold shadow-lg shadow-accent/20 hover:shadow-accent/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
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

            {/* Navigate to Registration */}
            <div className="mt-8 text-center">
              <span className="text-sm font-medium text-muted-foreground">
                Don't have an account? <Link href="/register" className="text-accent font-semibold hover:underline transition-colors">Register now</Link>
              </span>
            </div>

            <div className="relative py-8">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border"></span>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[#0F131E] lg:bg-[#0A0D14] px-4 font-semibold tracking-widest backdrop-blur-sm" style={{ color: '#9ca3af' }}>
                  Or Continue With
                </span>
              </div>
            </div>

            <AppButton
              type="button"
              variant="outline"
              onClick={handleMicrosoftLogin}
              disabled={ssoLoading}
              className="w-full h-12 flex items-center justify-center gap-3 transition-all duration-200 hover:bg-surface/5 font-semibold bg-[#0A0D14] lg:bg-transparent border border-white/10"
            >
              {ssoLoading ? (
                <div className="flex items-center gap-2 text-white">
                  <span className="h-5 w-5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  Connecting to Microsoft...
                </div>
              ) : (
                <div className="flex items-center gap-2 text-white">
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

