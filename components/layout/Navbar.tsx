/* eslint-disable */
"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { 
  Search, 
  Menu,
  Moon,
  Sun,
  LogOut,
  User,
  Settings,
  Terminal,
  FileText,
  CheckSquare,
  Car
} from "lucide-react";
import * as Popover from "@radix-ui/react-popover";
import { globalSearch } from "@/lib/actions/search";
import type { SearchResult } from "@/lib/repositories/search";
import { useTheme } from "@/components/theme/ThemeProvider";
import { ThemeMenu } from "@/components/theme/ThemeMenu";
import RealtimeNotificationsDrawer from "./RealtimeNotificationsDrawer";
import { useProfile, usePermissions } from "@/hooks/usePermissions";
import { AppButton } from "@/components/ui/AppButton";

interface QuickAction {
  id: string;
  title: string;
  url: string;
  icon: React.ElementType;
}

const QUICK_ACTIONS: QuickAction[] = [
  { id: "workspace", title: "Create New Workspace", url: "/workspaces", icon: Terminal },
  { id: "task", title: "Create New Task", url: "/workspaces/tasks", icon: CheckSquare },
  { id: "vehicle", title: "Fleet & Logistics Desk", url: "/vehicle", icon: Car },
];

function formatRoleName(role?: string | null): string {
  if (!role) return "User";
  if (role.toLowerCase() === "super_admin") return "Super Admin";
  return role
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function getInitials(name?: string | null): string {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Navbar({ onOpenMobileMenu }: { onOpenMobileMenu?: () => void }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { isLight, toggleMode } = useTheme();
  const { data: profileData } = useProfile();
  const { roleCode } = usePermissions();
  const userData = profileData || null;

  const [loggingOut, setLoggingOut] = useState(false);

  // Search State
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [activeIndex, setActiveIndex] = useState(-1);

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

  const itemsCount = query === "" ? QUICK_ACTIONS.length : results.length;

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setSearchOpen(false);
      searchInputRef.current?.blur();
      return;
    }

    if (itemsCount === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev < itemsCount - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : itemsCount - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      if (query === "") {
        const action = QUICK_ACTIONS[activeIndex];
        if (action) router.push(action.url);
      } else if (results[activeIndex]) {
        router.push(results[activeIndex].url);
      }
      setSearchOpen(false);
    }
  };

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

  return (
    <header className="bg-surface border-b border-border sticky top-0 z-[var(--z-header)] flex h-14 w-full shrink-0 font-sans items-center justify-between px-3 sm:px-4 md:px-6">
      <div className="flex items-center gap-2 sm:gap-4 flex-1 max-w-lg relative" ref={searchContainerRef}>
        {/* Mobile Menu Hamburger Trigger */}
        <button
          type="button"
          onClick={() => onOpenMobileMenu?.()}
          className="md:hidden flex items-center justify-center h-9 w-9 rounded-lg text-muted hover:text-foreground hover:bg-surface-hover transition-colors shrink-0"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Global Combobox Search */}
        <div className="relative flex items-center w-full group cursor-text">
          <Search className="absolute left-3 h-4 w-4 text-muted group-hover:text-foreground transition-colors pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            role="combobox"
            aria-expanded={searchOpen}
            aria-autocomplete="list"
            aria-controls="navbar-search-results"
            aria-activedescendant={activeIndex >= 0 ? `navbar-search-item-${activeIndex}` : undefined}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!searchOpen) setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search or jump to... (Ctrl+K)"
            className="flex items-center h-9 w-full rounded-md pl-9 pr-10 text-xs sm:text-[13px] bg-background border border-border text-foreground placeholder:text-muted hover:border-border-active focus:border-border-active transition-colors shadow-sm outline-none"
          />
        </div>
        
        {/* Search Results Dropdown */}
        {searchOpen && (
          <div 
            id="navbar-search-results"
            role="listbox"
            className="fixed inset-x-3 top-16 sm:absolute sm:inset-x-auto sm:top-[110%] sm:left-0 sm:w-[500px] max-w-[calc(100vw-24px)] rounded-xl bg-elevated border border-border overflow-hidden z-[var(--z-popover)] animate-in fade-in slide-in-from-top-2 duration-150 shadow-lg"
          >
            <div className="max-h-[60vh] overflow-y-auto p-2">
              {query === "" ? (
                <>
                  <div className="mb-2 px-2 text-[11px] font-semibold text-muted uppercase tracking-wider">Quick Actions</div>
                  <div className="space-y-1">
                    {QUICK_ACTIONS.map((action, i) => {
                      const Icon = action.icon;
                      const isSelected = activeIndex === i;
                      return (
                        <button
                          key={action.id}
                          id={`navbar-search-item-${i}`}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                            isSelected ? "bg-surface-hover text-foreground" : "text-subtle hover:bg-surface-hover hover:text-foreground"
                          }`}
                          onClick={() => {
                            setSearchOpen(false);
                            router.push(action.url);
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <Icon className="h-4 w-4 text-muted" />
                            <span className="font-medium text-foreground">{action.title}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-2 px-2 text-[11px] font-semibold text-muted uppercase tracking-wider">
                    {isSearching ? "Searching..." : `Search Results for "${query}"`}
                  </div>
                  <div className="space-y-1">
                    {results.length > 0 ? (
                      results.map((r, i) => {
                        const isSelected = activeIndex === i;
                        return (
                          <button
                            key={r.id}
                            id={`navbar-search-item-${i}`}
                            type="button"
                            role="option"
                            aria-selected={isSelected}
                            className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                              isSelected ? "bg-surface-hover text-foreground" : "text-subtle hover:bg-surface-hover hover:text-foreground"
                            }`}
                            onClick={() => {
                              setSearchOpen(false);
                              router.push(r.url);
                            }}
                          >
                            <div className="flex items-center gap-3">
                              {r.type === "TASK" ? (
                                <CheckSquare className="h-4 w-4 text-muted" />
                              ) : r.type === "TICKET" ? (
                                <FileText className="h-4 w-4 text-muted" />
                              ) : r.type === "VEHICLE" ? (
                                <Car className="h-4 w-4 text-muted" />
                              ) : (
                                <Terminal className="h-4 w-4 text-muted" />
                              )}
                              <span className="font-medium text-foreground">{`${r.code ? r.code + ": " : ""}${r.title}`}</span>
                            </div>
                          </button>
                        );
                      })
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

      <div className="flex items-center gap-2 relative">
        {/* Sun/Moon Toggle */}
        <AppButton 
          variant="ghost"
          size="icon"
          onClick={toggleMode}
          aria-label={isLight ? "Switch to dark mode" : "Switch to light mode"}
          className="!h-8 !w-8 rounded-md text-muted hover:bg-surface-hover hover:text-foreground"
        >
          {isLight ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </AppButton>

        {/* Theme Palette Menu Popover */}
        <ThemeMenu />

        {/* Settings Link */}
        <Link 
          href="/settings"
          aria-label="Settings"
          className="flex h-8 w-8 items-center justify-center rounded-md transition-colors text-muted hover:bg-surface-hover hover:text-foreground"
        >
          <Settings className="h-4 w-4" />
        </Link>

        {/* Realtime Notifications */}
        <RealtimeNotificationsDrawer />

        {/* User Identity Chip */}
        <div className="hidden lg:flex items-center mx-1 px-2.5 py-1 rounded-full bg-sunken border border-border text-xs">
          <span className="font-medium text-foreground tracking-tight">
            {userData?.full_name || "System Operator"}{" "}
            <span className="text-muted font-normal">· {formatRoleName(roleCode)}</span>
          </span>
        </div>

        {/* Profile Popover Menu */}
        <Popover.Root>
          <Popover.Trigger asChild>
            <button
              type="button"
              aria-label="User account menu"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-surface hover:bg-surface-hover border border-border text-xs font-semibold text-foreground cursor-pointer transition-colors overflow-hidden shrink-0 shadow-sm"
            >
              {userData?.profile_photo ? (
                <img src={userData.profile_photo} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <span>{getInitials(userData?.full_name)}</span>
              )}
            </button>
          </Popover.Trigger>

          <Popover.Portal>
            <Popover.Content
              align="end"
              sideOffset={8}
              className="w-56 rounded-xl p-1.5 shadow-lg z-[var(--z-popover)] bg-elevated border border-border text-foreground animate-in fade-in zoom-in-95 duration-150 outline-none"
            >
              <div className="px-3 py-2 border-b border-border space-y-0.5">
                <span className="text-[13px] font-semibold block truncate text-foreground">
                  {userData?.full_name || "System Operator"}
                </span>
                <span className="text-[11px] text-muted block truncate">{userData?.email || "user@chandak.com"}</span>
                <span className="text-[10px] text-muted font-medium block uppercase tracking-wider pt-0.5">
                  {formatRoleName(roleCode)}
                </span>
              </div>

              <div className="py-1 space-y-0.5">
                <Link
                  href="/profile"
                  className="w-full text-left px-3 py-1.5 rounded-md text-[13px] transition-colors flex items-center gap-2.5 font-medium hover:bg-surface-hover text-subtle hover:text-foreground"
                >
                  <User className="h-4 w-4 text-muted" />
                  <span>My Profile & Settings</span>
                </Link>
              </div>

              <div className="pt-1 border-t border-border">
                <AppButton 
                  variant="ghost"
                  onClick={handleExecuteSignOut}
                  disabled={loggingOut}
                  className="w-full justify-start px-3 py-1.5 rounded-md text-[13px] font-medium text-danger-text hover:bg-danger-soft hover:text-danger-text"
                  leftIcon={<LogOut className="h-4 w-4" />}
                >
                  <span>{loggingOut ? "Logging out..." : "Log Out"}</span>
                </AppButton>
              </div>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      </div>
    </header>
  );
}
