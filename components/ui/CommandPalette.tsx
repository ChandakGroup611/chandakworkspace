"use client";

import React, { useEffect, useState } from "react";
import { Search, Terminal, FileText, CheckSquare, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { globalSearch } from "@/lib/actions/search";
import type { SearchResult } from "@/lib/repositories/search";

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const router = useRouter();

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
    if (!query) {
      setResults([]);
      return;
    }
    const handler = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await globalSearch(query);
        setResults(res);
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-background/80 transition-opacity"
        onClick={() => setIsOpen(false)}
      />
      
      {/* Palette Container */}
      <div className="relative w-full max-w-lg overflow-hidden rounded-xl theme-card-structural shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        
        {/* Search Input Area */}
        <div className="flex items-center border-b border-border px-4 py-3">
          <Search className="mr-3 h-5 w-5 text-muted" />
          <input
            autoFocus
            type="text"
            className="flex-1 bg-transparent text-[15px] outline-none text-foreground placeholder-muted"
            placeholder="Type a command or search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="flex items-center gap-1.5 rounded bg-surface-hover px-1.5 py-0.5 text-[10px] font-medium text-muted">
            <span className="text-[12px] leading-none">esc</span>
          </div>
        </div>

        {/* Results Area */}
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {query === "" ? (
            <>
              <div className="mb-2 px-2 text-xs font-semibold text-muted uppercase tracking-wider">Quick Actions</div>
              <div className="space-y-1">
                <CommandItem icon={<Terminal />} label="Create New Workspace" shortcut="W" onClick={() => { setIsOpen(false); router.push('/workspaces'); }} />
                <CommandItem icon={<CheckSquare />} label="Create New Task" shortcut="T" onClick={() => { setIsOpen(false); router.push('/workspaces'); }} />
              </div>
            </>
          ) : (
            <>
              <div className="mb-2 px-2 text-xs font-semibold text-muted uppercase tracking-wider">
                {isSearching ? 'Searching...' : `Search Results for "${query}"`}
              </div>
              <div className="space-y-1">
                {results.length > 0 ? (
                  results.map((r) => (
                    <CommandItem 
                      key={r.id}
                      icon={r.type === 'TASK' ? <CheckSquare /> : r.type === 'TICKET' ? <FileText /> : <Terminal />} 
                      label={`${r.code ? r.code + ': ' : ''}${r.title}`} 
                      onClick={() => {
                        setIsOpen(false);
                        router.push(r.url);
                      }} 
                    />
                  ))
                ) : !isSearching ? (
                  <div className="px-3 py-4 text-center text-sm text-muted">No results found</div>
                ) : null}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function CommandItem({ icon, label, shortcut, onClick }: { icon: React.ReactNode; label: string; shortcut?: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-surface-hover hover:text-foreground text-muted"
    >
      <div className="flex items-center gap-3">
        <div className="text-theme-icon">{React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: "h-4 w-4" })}</div>
        <span className="font-medium text-foreground">{label}</span>
      </div>
      {shortcut && (
        <kbd className="inline-flex items-center rounded border border-border px-1.5 font-mono text-[10px] font-medium text-muted">
          {shortcut}
        </kbd>
      )}
    </button>
  );
}
