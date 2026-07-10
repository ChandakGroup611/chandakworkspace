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

export default function Navbar() {
  const router = useRouter();
  const supabase = createClient();
  const { theme, setTheme } = useTheme();
  const { data: profileData } = useProfile();
  const userData = profileData || null;

  const [mounted, setMounted] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const isLight = ["executive-light", "material-ocean", "aurora-breeze", "pure-elegance", "pristine-white"].includes(theme);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  const toggleQuickTheme = () => {
    if (isLight) {
      setTheme("midnight-operations");
    } else {
      setTheme("executive-light");
    }
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
                  ? "bg-gray-100/80 border-gray-200 text-gray-900 placeholder-gray-400 focus:bg-white focus:border-accent" 
                  : "bg-white/5 border-white/5 text-white placeholder-gray-500 focus:border-accent/50 focus:bg-white/10"
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
          <AppButton 
            variant="outline"
            size="icon"
            onClick={toggleQuickTheme}
            className="!h-10 !w-10 rounded-xl bg-surface border-border text-muted hover:bg-muted hover:text-foreground"
          >
            {isLight ? <Moon className="h-4 w-4 text-accent" /> : <Sun className="h-4 w-4 text-amber-500" />}
          </AppButton>

          <Link 
            href="/settings"
            className={`relative flex h-10 w-10 items-center justify-center rounded-xl border transition-colors ${
              isLight 
                ? "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-gray-900" 
                : "bg-white/5 border-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
            }`}
          >
            <Palette className="h-4 w-4 text-accent" />
          </Link>

          <RealtimeNotificationsDrawer />

          <div className="relative">
            <div 
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-xs font-medium text-white cursor-pointer border border-transparent hover:border-slate-400 transition-all overflow-hidden"
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
                <div className={`absolute right-0 top-12 mt-2 w-56 rounded-xl border p-1.5 shadow-md z-50 animate-in fade-in zoom-in-95 duration-150 ${isLight ? 'bg-white border-gray-200 text-gray-800' : 'bg-[#0A0D14] border-white/10 text-white'}`}>
                  <div className={`px-2 py-2 border-b space-y-0.5 ${isLight ? 'border-gray-100' : 'border-white/5'}`}>
                    <span className="text-sm font-medium block truncate">{userData?.full_name || 'System Operator'}</span>
                    <span className="text-xs text-gray-500 block truncate">{userData?.email}</span>
                  </div>

                  <div className="py-2 space-y-1">
                    <Link
                      href="/profile"
                      onClick={() => setProfileOpen(false)}
                      className={`w-full text-left px-2 py-2 rounded-lg text-xs transition-colors flex items-center gap-2 font-medium ${
                        isLight ? "hover:bg-gray-100 text-gray-700" : "hover:bg-white/5 text-gray-300"
                      }`}
                    >
                      <User className="h-3.5 w-3.5 text-accent" />
                      <span>My Profile & Settings</span>
                    </Link>
                  </div>

                  <div className={`pt-2 border-t ${isLight ? 'border-gray-100' : 'border-white/5'}`}>
                    <AppButton 
                      variant="destructive"
                      onClick={handleExecuteSignOut}
                      disabled={loggingOut}
                      className="w-full justify-center rounded-lg text-xs font-bold cursor-pointer group mt-2"
                      leftIcon={<LogOut className="h-3.5 w-3.5 group-hover:rotate-12 transition-transform" />}
                    >
                      <span>{loggingOut ? "Terminating Auth..." : "Log Out Securely"}</span>
                    </AppButton>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>


    </>
  );
}
