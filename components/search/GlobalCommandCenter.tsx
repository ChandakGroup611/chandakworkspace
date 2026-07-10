"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, Loader2, LayoutDashboard, Target, Briefcase } from "lucide-react";
import { useRouter } from "next/navigation";

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
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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
    }, 300); // debounce

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'TICKET': return <LayoutDashboard className="w-4 h-4 text-accent" />;
      case 'TASK': return <Target className="w-4 h-4 text-accent" />;
      case 'REQUIREMENT': return <Briefcase className="w-4 h-4 text-emerald-500" />;
      default: return <Search className="w-4 h-4" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      
      {/* Click away overlay */}
      <div className="absolute inset-0 z-0" onClick={() => setIsOpen(false)} />

      {/* Command Palette */}
      <div className="relative z-10 w-full max-w-2xl bg-card border shadow-2xl rounded-2xl overflow-hidden flex flex-col animate-in slide-in-from-top-4 duration-300">
        
        {/* Search Input */}
        <div className="flex items-center px-4 border-b">
          <Search className="w-5 h-5 text-muted-foreground mr-3" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 h-14 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground"
            placeholder="Search tickets, tasks, requirements... (Esc to close)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {loading && <Loader2 className="w-5 h-5 text-primary animate-spin" />}
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {query.length > 0 && query.length < 2 && (
            <div className="p-4 text-center text-sm text-muted-foreground">Type at least 2 characters to search...</div>
          )}
          
          {query.length >= 2 && !loading && results.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No results found for "{query}". <br/>
              Note: You can only search records you have access to.
            </div>
          )}

          {results.map((r, i) => (
            <button
              key={i}
              onClick={() => {
                setIsOpen(false);
                router.push(r.url);
              }}
              className="w-full flex items-center gap-3 p-3 text-left rounded-xl hover:bg-muted/50 transition-colors group"
            >
              <div className="p-2 rounded-lg bg-background border group-hover:border-primary/20">
                {getTypeIcon(r.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold truncate text-foreground">
                    {r.code && <span className="text-muted-foreground font-mono mr-2">{r.code}</span>}
                    {r.title}
                  </h4>
                  <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {r.status}
                  </span>
                </div>
                {r.metadata && (
                  <div className="text-xs text-muted-foreground mt-1 truncate">
                    {Object.values(r.metadata).filter(Boolean).join(" • ")}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>

        <div className="p-3 border-t bg-muted/30 text-xs text-center text-muted-foreground">
          Enterprise Scoped Search Engine
        </div>
      </div>
    </div>
  );
}
