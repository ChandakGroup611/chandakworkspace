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
  AlertOctagon,
  Settings
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

  const isLight = ["light-neumorphic", "pure-white", "pure-white-neumorphic", "amazon-prime-upi"].includes(theme);

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
        // Fire and forget delete so we don't block, but catch any errors
        supabase.from("active_sessions").delete().eq("user_id", userData.id).then(undefined, () => {});
      }
      // Await signout fully to ensure local storage and cookies are cleared
      await supabase.auth.signOut();
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
        className={`bg-background/80 backdrop-blur-xl border-b border-border/20 sticky top-0 z-40 flex h-14 w-full shrink-0 font-sans items-center justify-between transition-all duration-300 px-6`}
      >
        <div className="flex items-center gap-4 flex-1 max-w-lg">
          <div className="relative flex items-center w-full group cursor-text">
            <Search className="absolute left-3 h-4 w-4 text-muted group-hover:text-theme-icon transition-colors" />
            <div 
              className={`flex items-center h-9 w-full rounded-full pl-9 pr-12 text-[13px] border border-border/30 bg-surface/50 hover:bg-surface hover:border-theme-icon/50 transition-all duration-300 text-muted shadow-sm`}
            >
              Search or jump to...
            </div>
            <div className={`absolute right-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[11px] font-semibold pointer-events-none bg-background/50 border border-border/50 text-muted shadow-sm`}>
              <Command className="h-3 w-3" />
              <span>K</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 relative">
          <AppButton 
            variant="ghost"
            size="icon"
            onClick={toggleQuickTheme}
            className="!h-8 !w-8 rounded-md text-muted hover:bg-surface-hover hover:text-foreground"
          >
            {isLight ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </AppButton>

          <Link 
            href="/settings"
            className={`relative flex h-8 w-8 items-center justify-center rounded-md transition-colors text-muted hover:bg-surface-hover hover:text-foreground`}
          >
            <Settings className="h-4 w-4" />
          </Link>

          <RealtimeNotificationsDrawer />

          <div className="relative ml-2" ref={dropdownRef}>
            <div 
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-hover text-xs font-medium text-foreground cursor-pointer border border-border/50 hover:border-border transition-all overflow-hidden shadow-sm"
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
                  <div className={`px-3 py-2 border-b space-y-0.5 border-border/50`}>
                    <span className="text-[13px] font-semibold block truncate">{userData?.full_name || 'System Operator'}</span>
                    <span className="text-[11px] text-muted block truncate">{userData?.email}</span>
                  </div>

                  <div className="py-1 space-y-0.5">
                    <Link
                      href="/profile"
                      onClick={() => setProfileOpen(false)}
                      className={`w-full text-left px-3 py-1.5 rounded-md text-[13px] transition-colors flex items-center gap-2.5 font-medium hover:bg-surface-hover text-muted hover:text-foreground`}
                    >
                      <User className="h-4 w-4" />
                      <span>My Profile & Settings</span>
                    </Link>
                  </div>

                  <div className={`pt-1 border-t border-border/50`}>
                    <AppButton 
                      variant="ghost"
                      onClick={handleExecuteSignOut}
                      disabled={loggingOut}
                      className="w-full justify-start px-3 py-1.5 rounded-md text-[13px] font-medium cursor-pointer text-danger hover:text-danger hover:bg-danger/10"
                      leftIcon={<LogOut className="h-4 w-4" />}
                    >
                      <span>{loggingOut ? "Logging out..." : "Log Out"}</span>
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



