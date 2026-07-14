"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
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
  
  const [isRegister, setIsRegister] = useState(false);
  
  const [name, setName] = useState("");
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
          await supabase.auth.signOut();
        }
        setSuccessMsg("You have been successfully logged out.");
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (isTimeout) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await supabase.auth.signOut();
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

    if (isRegister && !name.trim()) {
      setErrorMsg("Please enter your full name.");
      return;
    }

    setLoading(true);

    try {
      if (isRegister) {
        // Registration Flow
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password,
          options: {
            data: {
              full_name: name.trim(),
            }
          }
        });

        if (error) throw error;
        
        if (data.user && data.user.identities && data.user.identities.length === 0) {
          throw new Error("This email is already registered. Please sign in instead.");
        }

        setSuccessMsg("Registration successful! You can now sign in.");
        setIsRegister(false); // Flip back to login
        
      } else {
        // Login Flow
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password
        });

        if (error) throw error;

        if (data.user) {
          // Check for concurrent active sessions
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
                  await supabase.auth.signOut();
                  setLoading(false);
                  return;
                }
              }
            }
          } catch (e) {}
        }

        window.location.href = "/";
      }

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
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });
      if (error) throw error;
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to initialize Microsoft login.");
      setSsoLoading(false);
    }
  };

  return (
    <div className="relative min-h-[100dvh] w-full flex items-center justify-center font-sans overflow-hidden bg-slate-950">
      
      {/* Dynamic Animated Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-purple-600/30 blur-[120px] animate-pulse duration-[10000ms]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-blue-600/20 blur-[150px] animate-pulse duration-[12000ms]"></div>
        <div className="absolute top-[40%] left-[20%] w-[30%] h-[30%] rounded-full bg-emerald-500/10 blur-[100px] animate-pulse duration-[8000ms]"></div>
        
        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
      </div>

      {/* Floating Glass Container */}
      <div className="relative z-10 w-full max-w-[440px] px-6 py-12">
        
        {/* Logo and Branding Header */}
        <div className="flex flex-col items-center justify-center mb-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="h-16 w-16 mb-6 flex items-center justify-center bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-[0_0_40px_rgba(255,255,255,0.1)]">
            <Zap className="h-8 w-8 text-white drop-shadow-md" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2 text-center drop-shadow-sm">
            Chandak Workspace
          </h1>
          <p className="text-slate-400 text-center font-medium">
            Intelligent Governance & Enterprise Mastery
          </p>
        </div>

        {/* Authentication Card */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-2xl rounded-3xl p-8 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-150 fill-mode-both">
          
          {/* Realtime Alert Displays */}
          {errorMsg && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-rose-400" />
              <div className="space-y-1">
                <strong className="font-semibold block text-rose-200">Authentication Failed</strong>
                <span className="opacity-90">{errorMsg}</span>
              </div>
            </div>
          )}

          {successMsg && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
              <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-400" />
              <span className="font-medium">{successMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleStandardAuthSubmit} className="space-y-5" autoComplete="off">
            
            {/* Smooth transition for Name field when toggling Register */}
            <div className={`space-y-2 overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${isRegister ? 'max-h-24 opacity-100' : 'max-h-0 opacity-0'}`}>
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Full Name
              </label>
              <AppInput 
                name="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                leftIcon={<User className="h-4 w-4 text-slate-400" />}
                className="h-12 bg-slate-800/50 border-white/10 text-white placeholder:text-slate-500 focus:bg-slate-800 focus:border-purple-500/50 transition-colors"
                required={isRegister}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Email Address
              </label>
              <AppInput 
                name="email"
                type="email"
                placeholder="user@enterprise.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<Mail className="h-4 w-4 text-slate-400" />}
                className="h-12 bg-slate-800/50 border-white/10 text-white placeholder:text-slate-500 focus:bg-slate-800 focus:border-purple-500/50 transition-colors"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Password
              </label>
              <AppInput 
                name="password"
                type="password"
                placeholder="••••••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftIcon={<Lock className="h-4 w-4 text-slate-400" />}
                className="h-12 bg-slate-800/50 border-white/10 text-white placeholder:text-slate-500 focus:bg-slate-800 focus:border-purple-500/50 transition-colors"
                required
              />
            </div>

            <button 
              type="submit" 
              disabled={loading || !!successMsg}
              className="w-full h-12 mt-2 bg-white text-slate-950 font-bold rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_30px_rgba(255,255,255,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none disabled:hover:scale-100 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 rounded-full border-2 border-slate-900/20 border-t-slate-900 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>{isRegister ? "Create Account" : "Sign In"}</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Toggle Login / Register */}
          <div className="mt-6 text-center">
            <button 
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
            >
              {isRegister ? (
                <>Already have an account? <span className="text-purple-400 hover:text-purple-300">Sign in instead</span></>
              ) : (
                <>New to the workspace? <span className="text-purple-400 hover:text-purple-300">Create an account</span></>
              )}
            </button>
          </div>

          <div className="relative py-8">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-white/10"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-slate-900 px-4 text-slate-500 font-semibold tracking-widest">
                Enterprise SSO
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleMicrosoftLogin}
            disabled={ssoLoading}
            className="w-full h-12 bg-[#2f2f2f] hover:bg-[#3f3f3f] text-white border border-white/5 rounded-xl font-semibold flex items-center justify-center gap-3 transition-all duration-200 hover:shadow-lg disabled:opacity-50 disabled:pointer-events-none"
          >
            {ssoLoading ? (
              <>
                <span className="h-4 w-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                Connecting to Microsoft...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 21 21">
                  <path fill="#f25022" d="M1 1h9v9H1z"/>
                  <path fill="#00a4ef" d="M1 11h9v9H1z"/>
                  <path fill="#7fba00" d="M11 1h9v9h-9z"/>
                  <path fill="#ffb900" d="M11 11h9v9h-9z"/>
                </svg>
                Continue with Microsoft
              </>
            )}
          </button>

        </div>
      </div>
    </div>
  );
}
