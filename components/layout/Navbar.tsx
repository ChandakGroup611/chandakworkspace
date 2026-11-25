"use client";

/**
 * Navbar v2 — fixes
 * - Quick actions come from one array, so arrow keys reach all of them (v1 counted 2 of 3,
 *   so "Fleet & Logistics Desk" was unreachable by keyboard). The W/T/V key hints were
 *   removed because no shortcut was wired to them.
 * - "Create New Workspace" and "Create New Task" went to the same page.
 * - Sun/moon toggles between the user's last light and last dark theme instead of always
 *   jumping to light-neumorphic / dark-neumorphic and losing their chosen theme.
 * - Solid header surface (v1: 80% transparent background with blur disabled, so content
 *   scrolled visibly underneath).
 * - Profile menu is a real button + popover (keyboard, Esc, aria-expanded); icon buttons
 *   have labels; role shown as a readable chip ("Super Admin", not "(SUPER_ADMIN)").
 * - Menu icon for the mobile hamburger (was the Layers icon).
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as Popover from "@radix-ui/react-popover";
import { Search, Moon, Sun, LogOut, User, Settings, Terminal, FileText, CheckSquare, Car, Menu, FolderPlus, Loader2, Sparkles, Video } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { globalSearch } from "@/lib/actions/search";
import type { SearchResult } from "@/lib/repositories/search";
import { useTheme } from "@/components/theme/ThemeProvider";
import { ThemeMenu } from "@/components/theme/ThemeMenu";
import { useProfile, usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";
import RealtimeNotificationsDrawer from "./RealtimeNotificationsDrawer";
import { ChandakMessengerTrigger } from "@/components/messenger/ChandakMessengerTrigger";
import { CopilotDrawer } from "@/components/copilot/CopilotDrawer";
import { ChandakMitraIcon } from "@/components/copilot/ChandakMitraIcon";
import { GlobalVoiceAssistant } from "@/components/voice/GlobalVoiceAssistant";

type QuickAction = { id: string; label: string; href: string; icon: React.ElementType };
const QUICK_ACTIONS: QuickAction[] = [
  { id: "ws", label: "Create new workspace", href: "/workspaces" /* TODO: open the create form, e.g. ?create=1 */, icon: FolderPlus },
  { id: "task", label: "Create new task", href: "/workspaces/tasks", icon: CheckSquare },
  { id: "fleet", label: "Open fleet & logistics desk", href: "/vehicle", icon: Car },
  { id: "meet", label: "Open Chandak Meet", href: "/meet", icon: Video },
];

const RESULT_ICON: Record<string, React.ElementType> = { TASK: CheckSquare, TICKET: FileText, VEHICLE: Car };

const humanRole = (code?: string | null) =>
  (code || "User").replace(/^ROLE_/, "").toLowerCase().split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

const initials = (name?: string | null) =>
  (name || "User").trim().split(/\s+/).slice(0, 2).map((n) => n[0]?.toUpperCase() ?? "").join("");

export default function Navbar({ onOpenMobileMenu }: { onOpenMobileMenu?: () => void }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { isLight, toggleMode } = useTheme();
  const { data: profile } = useProfile();
  const { roleCode } = usePermissions();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [loggingOut, setLoggingOut] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ⌘K / Ctrl+K focuses search, Ctrl+/ toggles Copilot
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
        inputRef.current?.focus();
      } else if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault();
        setCopilotOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // close on outside click
  useEffect(() => {
    if (!searchOpen) return;
    const onDown = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setSearchOpen(false); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [searchOpen]);

  // debounced search
  useEffect(() => {
    setActiveIndex(-1);
    if (!query.trim()) { setResults([]); setSearching(false); return; }
    setSearching(true);
    const id = setTimeout(async () => {
      try { setResults(await globalSearch(query.trim())); }
      catch (err) { console.error("Search failed:", err); setResults([]); }
      finally { setSearching(false); }
    }, 250);
    return () => clearTimeout(id);
  }, [query]);

  const items: { key: string; href: string; label: string; icon: React.ElementType; hint?: string }[] = query.trim()
    ? results.map((r) => ({ key: String(r.id), href: r.url, label: `${r.code ? r.code + " · " : ""}${r.title}`, icon: RESULT_ICON[r.type] ?? Terminal }))
    : QUICK_ACTIONS.map((a) => ({ key: a.id, href: a.href, label: a.label, icon: a.icon }));

  const go = (href: string) => { setSearchOpen(false); setQuery(""); inputRef.current?.blur(); router.push(href); };

  const onSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") { setSearchOpen(false); inputRef.current?.blur(); return; }
    if (!items.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex((i) => (i + 1) % items.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex((i) => (i <= 0 ? items.length - 1 : i - 1)); }
    else if (e.key === "Enter" && activeIndex >= 0) { e.preventDefault(); go(items[activeIndex].href); }
  };

  const signOut = async () => {
    setLoggingOut(true);
    document.cookie = "active_module=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    try { await supabase.auth.signOut(); } catch (e) { console.error(e); }
    window.location.href = "/login";
  };

  const iconBtn = "inline-flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-surface-hover hover:text-foreground";

  return (
    <header className="sticky top-0 z-[var(--z-header)] flex h-14 w-full shrink-0 items-center justify-between gap-3 border-b border-border bg-surface px-3 sm:px-4 md:px-6 transition-all duration-200">
      <div ref={boxRef} className="relative flex w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl flex-1 items-center gap-2 transition-[max-width,width] duration-200">
        <button type="button" onClick={() => onOpenMobileMenu?.()} aria-label="Open menu" className={cn(iconBtn, "md:hidden")}>
          <Menu className="h-5 w-5" aria-hidden />
        </button>

        <div className="relative w-full">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
          <input
            ref={inputRef}
            type="search"
            role="combobox"
            aria-expanded={searchOpen}
            aria-controls="global-search-list"
            aria-activedescendant={activeIndex >= 0 ? `gs-${items[activeIndex]?.key}` : undefined}
            aria-label="Search or jump to"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={onSearchKey}
            placeholder="Search tasks, tickets, vehicles…"
            className="h-9 w-full rounded-md border border-border bg-sunken pl-9 pr-14 text-[13.5px] transition-all duration-200 focus:bg-surface focus:border-theme-btn-primary focus:ring-1 focus:ring-theme-btn-primary/20 focus:outline-none"
          />
          <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border border-border bg-surface px-1.5 font-sans text-[11px] text-muted sm:block">Ctrl K</kbd>
        </div>

        {searchOpen && (
          <div className="fixed inset-x-3 top-[60px] z-[var(--z-popover)] overflow-hidden rounded-[10px] border border-border bg-elevated shadow-lg sm:absolute sm:inset-x-auto sm:left-0 sm:top-[calc(100%+6px)] sm:w-full sm:max-w-md md:sm:max-w-xl lg:sm:max-w-2xl">
            <div className="flex items-center justify-between px-3 pb-1 pt-2.5">
              <span className="theme-label">{query.trim() ? "Results" : "Quick actions"}</span>
              {searching && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted" aria-label="Searching" />}
            </div>
            <ul id="global-search-list" role="listbox" className="max-h-[60vh] overflow-y-auto p-1.5">
              {items.map((it, i) => {
                const Icon = it.icon;
                return (
                  <li key={it.key} id={`gs-${it.key}`} role="option" aria-selected={i === activeIndex}>
                    <button
                      type="button"
                      onMouseEnter={() => setActiveIndex(i)}
                      onClick={() => go(it.href)}
                      className={cn("flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left text-[13.5px]", i === activeIndex ? "bg-surface-hover" : "hover:bg-surface-hover")}
                    >
                      <Icon className="h-4 w-4 shrink-0 text-accent-soft-text" aria-hidden />
                      <span className="flex-1 truncate text-foreground">{it.label}</span>
                      {it.hint && <kbd className="rounded border border-border px-1.5 text-[11px] text-muted">{it.hint}</kbd>}
                    </button>
                  </li>
                );
              })}
              {query.trim() && !searching && items.length === 0 && (
                <li className="px-3 py-6 text-center text-[13px] text-muted">No matches for “{query.trim()}”. Try a code like TKT-1042.</li>
              )}
            </ul>
          </div>
        )}
      </div>

      {/* phones: theme toggle, palette and design gallery move into the account menu so the bar fits */}
      <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
        <button type="button" onClick={toggleMode} aria-label={isLight ? "Switch to dark theme" : "Switch to light theme"} className={cn(iconBtn, "hidden sm:inline-flex")}>
          {isLight ? <Moon className="h-4 w-4" aria-hidden /> : <Sun className="h-4 w-4" aria-hidden />}
        </button>
        <div className="hidden sm:contents"><ThemeMenu /></div>
        <Link href="/settings" prefetch={false} aria-label="Design gallery" title="Design gallery" className={cn(iconBtn, "hidden sm:inline-flex")}>
          <Settings className="h-4 w-4" aria-hidden />
        </Link>
        <RealtimeNotificationsDrawer />
        <ChandakMessengerTrigger />
        <GlobalVoiceAssistant />
        <button
          type="button"
          onClick={() => setCopilotOpen(true)}
          aria-label="Open Chandak Mitra"
          title="Chandak Mitra (Ctrl+/)"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-surface-hover group transition-colors"
        >
          <ChandakMitraIcon className="h-6 w-6 transition-transform shrink-0" animated />
        </button>

        <div className="mx-2 hidden h-6 w-px bg-border lg:block" aria-hidden />

        <Popover.Root>
          <Popover.Trigger asChild>
            <button type="button" aria-label="Account menu" className="flex items-center gap-2.5 rounded-md py-1 pl-1 pr-1 hover:bg-surface-hover lg:pr-2">
              <span className="inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-accent-soft text-[12px] font-semibold text-accent-soft-text">
                {profile?.profile_photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.profile_photo} alt="" className="h-full w-full object-cover" />
                ) : initials(profile?.full_name)}
              </span>
              <span className="hidden min-w-0 flex-col text-left leading-tight lg:flex">
                <span className="max-w-[160px] truncate text-[13px] font-medium text-foreground">{profile?.full_name || "User"}</span>
                <span className="text-[11.5px] text-muted">{humanRole(roleCode)}</span>
              </span>
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content align="end" sideOffset={6} className="z-[var(--z-popover)] w-60 rounded-[10px] border border-border bg-elevated p-1.5 text-foreground shadow-lg outline-none">
              <div className="border-b border-border px-2.5 pb-2 pt-1.5">
                <div className="truncate text-[13px] font-semibold">{profile?.full_name || "User"}</div>
                <div className="truncate text-[12px] text-muted">{profile?.email}</div>
              </div>
              <Link href="/profile" prefetch={false} className="mt-1 flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] hover:bg-surface-hover">
                <User className="h-4 w-4 text-muted" aria-hidden /> Profile & preferences
              </Link>
              <button type="button" onClick={toggleMode} className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] hover:bg-surface-hover sm:hidden">
                {isLight ? <Moon className="h-4 w-4 text-muted" aria-hidden /> : <Sun className="h-4 w-4 text-muted" aria-hidden />} {isLight ? "Dark mode" : "Light mode"}
              </button>
              <Link href="/settings" prefetch={false} className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] hover:bg-surface-hover sm:hidden">
                <Settings className="h-4 w-4 text-muted" aria-hidden /> Themes & design gallery
              </Link>
              <button
                type="button"
                onClick={signOut}
                disabled={loggingOut}
                className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] text-danger-text hover:bg-danger-soft disabled:opacity-60"
              >
                {loggingOut ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <LogOut className="h-4 w-4" aria-hidden />}
                {loggingOut ? "Signing out…" : "Sign out"}
              </button>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      </div>

      <CopilotDrawer open={copilotOpen} onClose={() => setCopilotOpen(false)} />
    </header>
  );
}
