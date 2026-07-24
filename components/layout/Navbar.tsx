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
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isLight = ["light-neumorphic", "glassmorphism", "pure-white"].includes(theme);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }
    if (profileOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [profileOpen]);

  const handleExecuteSignOut = async () => {
    setLoggingOut(true);
    setProfileOpen(false);
    try {
      if (userData?.id) {
        supabase.from("active_sessions").delete().eq("user_id", userData.id).then();
      }
      await Promise.race([
        supabase.auth.signOut(),
        new Promise(resolve => setTimeout(resolve, 800))
      ]);
    } catch (_) {}
    window.location.href = "/login?action=logout";
  };

  const toggleQuickTheme = () => {
    if (isLight) {
      setTheme("cyberpunk");
    } else {
      setTheme("light-neumorphic");
    }
  };

  return (
    <>
      <header
        className={`theme-card-structural !overflow-visible rounded-none border-t-0 border-l-0 border-r-0 sticky top-0 z-40 flex h-16 w-full shrink-0 font-sharp items-center justify-between transition-all duration-300 px-6`}
      >
        <div className="flex items-center gap-4 flex-1 max-w-md">
          <div className="relative flex items-center w-full">
            <Search className="absolute left-3 h-4 w-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search tickets, documentation, quick masters..." 
              className={`h-10 w-full rounded-xl pl-9 pr-12 text-xs focus:outline-none transition-all duration-200 ${ "theme-input-structural text-foreground placeholder-gray-400 focus:theme-card-structural /50 focus:border-accent" }`}
            />
            <div className={`absolute right-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-semibold pointer-events-none ${
              "bg-gray-200/60 text-muted"
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
            className="!h-10 !w-10 rounded-xl theme-card-structural text-muted hover:bg-muted hover:text-foreground"
          >
            {isLight ? <Moon className="h-4 w-4 text-accent" /> : <Sun className="h-4 w-4 text-amber-500" />}
          </AppButton>

          <Link 
            href="/settings"
            className={`relative flex h-10 w-10 items-center justify-center rounded-xl border transition-colors ${
              "bg-elevated border-border text-muted hover:bg-elevated hover:text-foreground"
            }`}
          >
            <Palette className="h-4 w-4 text-accent" />
          </Link>

          <RealtimeNotificationsDrawer />

          <div className="relative" ref={dropdownRef}>
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
                <div className={`absolute right-0 top-12 mt-2 w-56 rounded-xl p-1.5 shadow-md z-50 animate-in fade-in zoom-in-95 duration-150 theme-card-structural text-foreground`}>
                  <div className={`px-2 py-2 border-b space-y-0.5 border-border`}>
                    <span className="text-sm font-medium block truncate">{userData?.full_name || 'System Operator'}</span>
                    <span className="text-xs text-gray-500 block truncate">{userData?.email}</span>
                  </div>

                  <div className="py-2 space-y-1">
                    <Link
                      href="/profile"
                      onClick={() => setProfileOpen(false)}
                      className={`w-full text-left px-2 py-2 rounded-lg text-xs transition-colors flex items-center gap-2 font-medium ${
                        "hover:bg-elevated text-muted"
                      }`}
                    >
                      <User className="h-3.5 w-3.5 text-accent" />
                      <span>My Profile & Settings</span>
                    </Link>
                  </div>

                  <div className={`pt-2 border-t border-border`}>
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



