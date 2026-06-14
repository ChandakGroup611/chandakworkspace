"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { 
  Search, 
  Bell, 
  PlusCircle, 
  Command, 
  ChevronDown, 
  Layers, 
  ShieldCheck,
  Moon,
  Sun,
  Palette,
  LogOut,
  Clock,
  ShieldAlert,
  User,
  RefreshCw,
  AlertOctagon
} from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";
import RealtimeNotificationsDrawer from "./RealtimeNotificationsDrawer";
import { useProfile } from "@/hooks/usePermissions";
import { AppButton } from "@/components/ui/AppButton";

// Configured Session Idle Constants
const SESSION_TIMEOUT_SECONDS = 300; // 5 Minutes total idle budget
const WARNING_THRESHOLD_SECONDS = 30; // Show pop-up when 30s remaining

export default function Navbar() {
  const router = useRouter();
  const supabase = createClient();
  const { theme, setTheme } = useTheme();
  const isLight = ["executive-light", "material-ocean", "aurora-breeze", "pure-elegance"].includes(theme);
  const [mounted, setMounted] = useState(false);

  // Session Security States
  const [profileOpen, setProfileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const { data: profileData } = useProfile();
  const userData = profileData || null;

  // Time-out countdown counter state — uses timestamp-based calculation
  const lastActivityTimestampRef = useRef<number>(Date.now());
  const lastActivityEventRef = useRef<number>(Date.now());
  const [secondsRemaining, setSecondsRemaining] = useState(SESSION_TIMEOUT_SECONDS);
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Activity listeners to reset Idle Clock
  const handleUserActivity = useCallback(() => {
    if (loggingOut) return;
    const now = Date.now();
    if (now - lastActivityEventRef.current < 1000) return; // Throttle to 1 second
    
    lastActivityEventRef.current = now;
    lastActivityTimestampRef.current = now;
    
    if (showTimeoutWarning) {
      setShowTimeoutWarning(false);
    }
  }, [loggingOut, showTimeoutWarning]);

  // Recalculate remaining time from the stored timestamp
  // This works correctly even when the tab is hidden/minimized because
  // it computes elapsed time from a timestamp rather than relying on
  // setInterval ticks (which browsers throttle in hidden tabs).
  const recalculateRemaining = useCallback(() => {
    const elapsed = Math.floor((Date.now() - lastActivityTimestampRef.current) / 1000);
    const remaining = Math.max(0, SESSION_TIMEOUT_SECONDS - elapsed);
    return remaining;
  }, []);

  useEffect(() => {
    const activityEvents = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    const onActivity = () => handleUserActivity();
    
    activityEvents.forEach(evt => {
      window.addEventListener(evt, onActivity, { passive: true });
    });

    // Use timestamp-based countdown instead of simple decrement
    const timerInterval = setInterval(() => {
      const remaining = recalculateRemaining();
      setSecondsRemaining(remaining);

      if (remaining <= 0) {
        clearInterval(timerInterval);
        executeAutomatedTimeout();
        return;
      }

      if (remaining <= WARNING_THRESHOLD_SECONDS && remaining > 0) {
        setShowTimeoutWarning(true);
      }
    }, 1000);

    // When the tab becomes visible again, immediately recalculate
    // This catches up on all the time that passed while the tab was hidden
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const remaining = recalculateRemaining();
        setSecondsRemaining(remaining);

        if (remaining <= 0) {
          executeAutomatedTimeout();
        } else if (remaining <= WARNING_THRESHOLD_SECONDS) {
          setShowTimeoutWarning(true);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      activityEvents.forEach(evt => {
        window.removeEventListener(evt, onActivity);
      });
      clearInterval(timerInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [handleUserActivity, recalculateRemaining]);

  const handleExecuteSignOut = async () => {
    setLoggingOut(true);
    setProfileOpen(false);
    try {
      if (userData?.id) {
        await supabase.from("active_sessions").delete().eq("user_id", userData.id);
      }
      await supabase.auth.signOut();
    } catch (_) {}
    
    setTimeout(() => {
      window.location.href = "/login";
    }, 600);
  };

  const executeAutomatedTimeout = async () => {
    setLoggingOut(true);
    setShowTimeoutWarning(false);
    try {
      if (userData?.id) {
        await supabase.from("active_sessions").delete().eq("user_id", userData.id);
      }
      await supabase.auth.signOut();
    } catch (_) {}

    if (mounted) {
      router.push("/login?reason=timeout");
    } else {
      window.location.href = "/login?reason=timeout";
    }
  };

  const toggleQuickTheme = () => {
    if (theme === "executive-light") {
      setTheme("glass-intelligence");
    } else if (theme === "glass-intelligence") {
      setTheme("midnight-operations");
    } else {
      setTheme("executive-light");
    }
  };

  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <>
      <header
        className={`sticky top-0 z-40 flex h-16 w-full shrink-0 items-center justify-between border-b border-border bg-surface transition-all duration-300 px-6`}
      >
        <div className="flex items-center gap-4 flex-1 max-w-md">
          <div className="relative flex items-center w-full">
            <Search className="absolute left-3 h-4 w-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search tickets, documentation, quick masters..." 
              className={`h-10 w-full rounded-xl border pl-9 pr-12 text-xs focus:outline-none transition-all duration-200 ${
                isLight 
                  ? "bg-gray-100/80 border-gray-200 text-gray-900 placeholder-gray-400 focus:bg-white focus:border-blue-500" 
                  : "bg-white/5 border-white/5 text-white placeholder-gray-500 focus:border-blue-500/50 focus:bg-white/10"
              }`}
            />
            <div className={`absolute right-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-semibold pointer-events-none ${
              isLight ? "bg-gray-200/60 text-gray-500" : "bg-white/10 text-gray-400"
            }`}>
              <Command className="h-2.5 w-2.5" />
              <span>K</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 relative">
          <div 
            onClick={() => handleUserActivity()} 
            title="Session Activity Keep-Alive Timer. Click to manually refresh lease."
            className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[0.8rem] font-mono select-none cursor-pointer transition-all ${
              secondsRemaining <= WARNING_THRESHOLD_SECONDS 
                ? "bg-rose-500/20 border-rose-500/40 text-rose-400 animate-pulse" 
                : isLight 
                  ? "bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200" 
                  : "bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10"
            }`}
          >
            <Clock className={`h-3 w-3 ${secondsRemaining <= WARNING_THRESHOLD_SECONDS ? "text-rose-400 animate-spin" : "text-gray-500"}`} />
            <span>Idle:</span>
            <strong className="font-bold">{formatTime(secondsRemaining)}</strong>
          </div>

          <div className={`h-4 w-[1px] ${isLight ? "bg-gray-200" : "bg-white/10"}`} />



          <AppButton 
            variant="outline"
            size="icon"
            onClick={toggleQuickTheme}
            className="!h-10 !w-10 rounded-xl bg-surface border-border text-muted hover:bg-muted hover:text-foreground"
          >
            {isLight ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4 text-indigo-400" />}
          </AppButton>

          <Link 
            href="/settings"
            className={`relative flex h-10 w-10 items-center justify-center rounded-xl border transition-colors ${
              isLight 
                ? "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-gray-900" 
                : "bg-white/5 border-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
            }`}
          >
            <Palette className="h-4 w-4 text-purple-400" />
          </Link>

          <RealtimeNotificationsDrawer />

          <div className="relative">
            <div 
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-500 to-indigo-600 text-xs font-bold text-white shadow-inner cursor-pointer border border-white/10 hover:ring-2 hover:ring-purple-400 transition-all active:scale-95 overflow-hidden"
            >
              {userData?.profile_photo ? (
                <img src={userData.profile_photo} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                userData?.full_name?.split(' ').map((n: string) => n[0]).join('') || 'OP'
              )}
            </div>

            {profileOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                <div className={`absolute right-0 top-12 mt-2 w-64 rounded-xl border p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 ${isLight ? 'bg-white border-gray-200 text-gray-800' : 'bg-[#0A0D14] border-white/10 text-white'}`}>
                  <div className={`px-2 py-2 border-b space-y-1 ${isLight ? 'border-gray-100' : 'border-white/5'}`}>
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Active Identity Bound</span>
                    <span className="text-sm font-bold block truncate">{userData?.full_name}</span>
                    <span className="text-xs font-medium text-blue-500 block truncate">{userData?.email}</span>
                    <span className="text-[0.7rem] font-mono text-emerald-500 flex items-center gap-1 mt-1">
                      <ShieldCheck className="h-3 w-3" /> Session Signature Active
                    </span>
                  </div>

                  <div className="py-2 space-y-1">
                    <Link
                      href="/profile"
                      onClick={() => setProfileOpen(false)}
                      className={`w-full text-left px-2 py-2 rounded-lg text-xs transition-colors flex items-center gap-2 font-medium ${
                        isLight ? "hover:bg-gray-100 text-gray-700" : "hover:bg-white/5 text-gray-300"
                      }`}
                    >
                      <User className="h-3.5 w-3.5 text-purple-500" />
                      <span>My Profile & Settings</span>
                    </Link>

                    <div className={`px-2 py-2 flex items-center justify-between text-xs font-mono mt-1 mb-1 rounded-lg ${isLight ? 'bg-gray-50 text-gray-500' : 'bg-white/5 text-gray-400'}`}>
                      <span>Lease Countdown:</span>
                      <strong className={isLight ? "text-gray-900" : "text-white"}>{formatTime(secondsRemaining)}</strong>
                    </div>

                    <AppButton 
                      variant="ghost"
                      onClick={() => { handleUserActivity(); setProfileOpen(false); }}
                      className="w-full justify-start rounded-lg text-xs font-medium px-2 py-2 !h-auto"
                      leftIcon={<RefreshCw className="h-3.5 w-3.5 text-emerald-500" />}
                    >
                      Refresh Idle Keep-Alive
                    </AppButton>
                  </div>

                  <div className={`pt-2 border-t ${isLight ? 'border-gray-100' : 'border-white/5'}`}>
                    <AppButton 
                      variant="destructive"
                      onClick={handleExecuteSignOut}
                      disabled={loggingOut}
                      className="w-full justify-between rounded-lg text-xs font-bold cursor-pointer group mt-2"
                      leftIcon={<LogOut className="h-3.5 w-3.5 group-hover:rotate-12 transition-transform" />}
                    >
                      <span>{loggingOut ? "Terminating Auth..." : "Log Out Securely"}</span>
                      <span className={`text-[0.7rem] font-mono px-1.5 py-0.5 rounded ${isLight ? 'bg-red-100 text-red-700' : 'bg-rose-500/20 text-rose-400'}`}>FLUSH</span>
                    </AppButton>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {showTimeoutWarning && (
        <div className="fixed inset-0 z-50 flex items-start pt-24 pb-24 overflow-y-auto justify-center px-4 p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md p-6 rounded-2xl bg-gradient-to-br from-rose-950 via-[#0A0D14] to-[#0A0D14] border-2 border-rose-500/50 shadow-2xl space-y-4 text-center relative overflow-hidden animate-in zoom-in-90 duration-300">
            <div className="absolute top-0 left-0 w-full h-1 bg-white/10">
              <div 
                className="h-full bg-rose-500 transition-all duration-1000" 
                style={{ width: `${(secondsRemaining / WARNING_THRESHOLD_SECONDS) * 100}%` }}
              />
            </div>

            <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-400 animate-bounce">
              <AlertOctagon className="h-6 w-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-white uppercase tracking-wider">Session Time-Out Impending</h3>
              <p className="text-xs text-gray-300 leading-relaxed">
                To guard regulated enterprise records against unattended workstation exposures, active identity leases are constrained to activity timers.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-white/5 border border-white/5 font-mono">
              <span className="text-xs text-gray-500 uppercase block">Automatic Session Termination In:</span>
              <span className="text-2xl font-bold text-rose-400 animate-pulse">{secondsRemaining}s</span>
            </div>

            <div className="flex gap-2.5 pt-2">
              <AppButton
                variant="outline"
                onClick={executeAutomatedTimeout}
                className="flex-1"
              >
                Log Out Now
              </AppButton>
              
              <AppButton
                variant="primary"
                onClick={() => handleUserActivity()}
                className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 border-none shadow-lg shadow-emerald-600/20 text-white"
              >
                Keep Me Signed In
              </AppButton>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
