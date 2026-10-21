"use client";
/* eslint-disable no-restricted-syntax */

import React, { useState, useEffect, useRef } from "react";
import { AppButton } from "@/components/ui/AppButton";
import { Search, Loader2, LayoutDashboard, Target, Briefcase } from "lucide-react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/ui/data";

export function GlobalCommandCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Keyboard shortcut listener (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data.results || []);
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "TICKET":
        return <LayoutDashboard className="w-4 h-4 text-primary" />;
      case "TASK":
        return <Target className="w-4 h-4 text-primary" />;
      case "REQUIREMENT":
        return <Briefcase className="w-4 h-4 text-success" />;
      default:
        return <Search className="w-4 h-4 text-muted" />;
    }
  };

  return (
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-start justify-center pt-[10vh] bg-[var(--overlay)] animate-in fade-in duration-150">
      {/* Click away overlay */}
      <button
        type="button"
        aria-label="Close search"
        className="absolute inset-0 z-0 bg-transparent border-0 cursor-default"
        onClick={() => setIsOpen(false)}
      />

      {/* Command Palette */}
      <div className="relative z-10 w-full max-w-2xl bg-elevated border border-border shadow-xl rounded-xl overflow-hidden flex flex-col animate-in slide-in-from-top-4 duration-200">
        {/* Search Input */}
        <div className="flex items-center px-4 border-b border-border bg-surface">
          <Search className="w-4 h-4 text-muted mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 h-12 bg-transparent border-none outline-none text-foreground placeholder:text-muted text-sm font-medium"
            placeholder="Search tickets, tasks, requirements... (Esc to close)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {loading && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {query.length > 0 && query.length < 2 && (
            <div className="p-4 text-center text-xs text-muted">
              Type at least 2 characters to search...
            </div>
          )}

          {query.length >= 2 && !loading && results.length === 0 && (
            <div className="p-8 text-center text-xs text-muted">
              No results found for &ldquo;{query}&rdquo;.<br />
              Note: You can only search records you have access to.
            </div>
          )}

          {results.map((r, i) => (
            <AppButton
              key={i}
              variant="ghost"
              onClick={() => {
                setIsOpen(false);
                router.push(r.url);
              }}
              className="w-full flex items-center justify-start gap-3 p-3 text-left rounded-lg hover:bg-hover transition-colors h-auto font-normal"
            >
              <div className="p-2 rounded-md bg-sunken border border-border shrink-0">
                {getTypeIcon(r.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-semibold truncate text-foreground">
                    {r.code && (
                      <span className="text-muted font-mono mr-2">{r.code}</span>
                    )}
                    {r.title}
                  </h4>
                  {r.status && <StatusBadge status={r.status} size="sm" />}
                </div>
                {r.metadata && (
                  <div className="text-[11px] text-muted mt-0.5 truncate">
                    {Object.values(r.metadata).filter(Boolean).join(" • ")}
                  </div>
                )}
              </div>
            </AppButton>
          ))}
        </div>

        <div className="p-2.5 border-t border-border bg-sunken text-[11px] text-center text-muted">
          Enterprise scoped search
        </div>
      </div>
    </div>
  );
}

export default GlobalCommandCenter;
