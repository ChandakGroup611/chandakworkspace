/* eslint-disable */
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
  Settings,
  Terminal,
  FileText,
  CheckSquare
} from "lucide-react";
import { globalSearch } from "@/lib/actions/search";
import type { SearchResult } from "@/lib/repositories/search";
import { useTheme, ThemeType } from "@/components/theme/ThemeProvider";
import RealtimeNotificationsDrawer from "./RealtimeNotificationsDrawer";
import { useProfile, usePermissions } from "@/hooks/usePermissions";
import { AppButton } from "@/components/ui/AppButton";

export default function Navbar({ onOpenMobileMenu }: { onOpenMobileMenu?: () => void }) {
  const router = useRouter();
  const supabase = createClient();
  const { theme, setTheme, density, tactileFeedback, fontFamily, fontWeightProfile, accentColor, baseFontSize, subtextFontSize } = useTheme();
  const { data: profileData } = useProfile();
  const { roleCode } = usePermissions();
  const userData = profileData || null;

  const [mounted, setMounted] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isLight = ["light-neumorphic", "pure-white", "pure-white-neumorphic", "amazon-prime-upi"].includes(theme);

  // Search State
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function handleClickOutsideSearch(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setSearchOpen(false);
      }
    }
    if (searchOpen) {
      document.addEventListener("mousedown", handleClickOutsideSearch);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutsideSearch);
    };
  }, [searchOpen]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  useEffect(() => {
    if (!query) {
      setResults([]);
      setActiveIndex(-1);
      return;
    }
    const handler = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await globalSearch(query);
        setResults(res);
        setActiveIndex(-1);
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [query]);

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setSearchOpen(false);
      searchInputRef.current?.blur();
      return;
    }

    const itemsCount = query === "" ? 2 : results.length;
    if (itemsCount === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex(prev => (prev < itemsCount - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(prev => (prev > 0 ? prev - 1 : itemsCount - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      if (query === "") {
        if (activeIndex === 0) router.push('/workspaces');
        if (activeIndex === 1) router.push('/workspaces');
      } else if (results[activeIndex]) {
        router.push(results[activeIndex].url);
      }
      setSearchOpen(false);
    }
  };

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
    try {
      document.cookie = "active_module=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      await supabase.auth.signOut();
      window.location.href = "/login";
    } catch (e) {
      console.error(e);
      window.location.href = "/login";
    } finally {
      setLoggingOut(false);
    }
  };

  const toggleQuickTheme = async () => {
    const nextTheme: ThemeType = isLight ? "dark-neumorphic" : "light-neumorphic";
    setTheme(nextTheme);
    
    // Auto-persist quick theme toggle to DB
    try {
      const { saveDesignPreferences } = await import("@/lib/actions/preferences");
      await saveDesignPreferences({
        theme: nextTheme,
        density,
        tactileFeedback,
        fontFamily,
        fontWeightProfile,
        accentColor,
        baseFontSize,
        subtextFontSize
      });
    } catch (e) {
      console.error("Failed to auto-save theme preference", e);
    }
  };

  return (
    <>
      <header
        className={`bg-background/80 border-b border-border/20 sticky top-0 z-40 flex h-14 w-full shrink-0 font-sans items-center justify-between transition-all duration-300 px-3 sm:px-4 md:px-6`}
      >
        <div className="flex items-center gap-2 sm:gap-4 flex-1 max-w-lg relative" ref={searchContainerRef}>
          {/* Mobile Menu Hamburger Trigger */}
          <button
            type="button"
            onClick={() => onOpenMobileMenu?.()}
            className="md:hidden flex items-center justify-center h-9 w-9 rounded-lg text-muted hover:text-foreground hover:bg-surface-hover active:scale-95 transition-all shrink-0"
            title="Open navigation menu"
          >
            <Layers className="h-5 w-5" />
          </button>

          <div className="relative flex items-center w-full group cursor-text">
            <Search className="absolute left-3 h-4 w-4 text-muted group-hover:text-theme-icon transition-colors" />
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setSearchOpen(true)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search or jump to..."
              className={`flex items-center h-9 w-full rounded-full pl-9 pr-10 sm:pr-12 text-xs sm:text-[13px] bg-transparent outline-none theme-card-structural hover:border-theme-icon/50 focus:border-theme-icon transition-all duration-300 text-foreground placeholder-muted shadow-sm`}
            />
            <div className={`hidden sm:flex absolute right-2 items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[11px] font-semibold pointer-events-none bg-background/50 border border-border/50 text-muted shadow-sm`}>
              <Command className="h-3 w-3" />
              <span>K</span>
            </div>
          </div>
          
          {/* Dropdown Results */}
          {searchOpen && (
            <div className="fixed inset-x-3 top-16 sm:absolute sm:inset-x-auto sm:top-[110%] sm:left-0 sm:w-[500px] max-w-[calc(100vw-24px)] rounded-xl theme-card-structural border border-border/80 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150 shadow-2xl">
              <div className="max-h-[60vh] overflow-y-auto p-2 custom-scrollbar">
                {query === "" ? (
                  <>
                    <div className="mb-2 px-2 text-xs font-semibold text-muted uppercase tracking-wider">Quick Actions</div>
                    <div className="space-y-1">
                      <button
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${activeIndex === 0 ? 'bg-surface-hover text-foreground' : 'hover:bg-surface-hover hover:text-foreground text-muted'}`}
                        onClick={() => { setSearchOpen(false); router.push('/workspaces'); }}
                      >
                        <div className="flex items-center gap-3">
                          <Terminal className="h-4 w-4 text-theme-icon" />
                          <span className="font-medium text-foreground">Create New Workspace</span>
                        </div>
                        <kbd className="inline-flex items-center rounded border border-border px-1.5 font-mono text-[10px] font-medium text-muted">W</kbd>
                      </button>
                      <button
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${activeIndex === 1 ? 'bg-surface-hover text-foreground' : 'hover:bg-surface-hover hover:text-foreground text-muted'}`}
                        onClick={() => { setSearchOpen(false); router.push('/workspaces'); }}
                      >
                        <div className="flex items-center gap-3">
                          <CheckSquare className="h-4 w-4 text-theme-icon" />
                          <span className="font-medium text-foreground">Create New Task</span>
                        </div>
                        <kbd className="inline-flex items-center rounded border border-border px-1.5 font-mono text-[10px] font-medium text-muted">T</kbd>
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mb-2 px-2 text-xs font-semibold text-muted uppercase tracking-wider">
                      {isSearching ? 'Searching...' : `Search Results for "${query}"`}
                    </div>
                    <div className="space-y-1">
                      {results.length > 0 ? (
                        results.map((r, i) => (
                          <button
                            key={r.id}
                            className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${activeIndex === i ? 'bg-surface-hover text-foreground' : 'hover:bg-surface-hover hover:text-foreground text-muted'}`}
                            onClick={() => { setSearchOpen(false); router.push(r.url); }}
                          >
                            <div className="flex items-center gap-3">
                              {r.type === 'TASK' ? <CheckSquare className="h-4 w-4 text-theme-icon" /> : r.type === 'TICKET' ? <FileText className="h-4 w-4 text-theme-icon" /> : <Terminal className="h-4 w-4 text-theme-icon" />}
                              <span className="font-medium text-foreground">{`${r.code ? r.code + ': ' : ''}${r.title}`}</span>
                            </div>
                          </button>
                        ))
                      ) : !isSearching ? (
                        <div className="px-3 py-4 text-center text-sm text-muted">No results found</div>
                      ) : null}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
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

          <div className="hidden lg:flex items-center mx-2 px-3 py-1 rounded-full bg-surface-hover/50 border border-border/40 shadow-sm">
            <span className="text-[13px] font-medium text-foreground tracking-tight">
              Welcome - {userData?.full_name || 'System Operator'} <span className="text-accent font-bold">({roleCode || 'USER'})</span>
            </span>
          </div>

          <div className="relative ml-2" ref={dropdownRef}>
            <div 
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex h-8 w-8 items-center justify-center rounded-full theme-card-structural -hover text-xs font-medium text-foreground cursor-pointer hover: transition-all overflow-hidden shadow-sm"
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



