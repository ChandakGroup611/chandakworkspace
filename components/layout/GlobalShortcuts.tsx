"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { 
  Keyboard, 
  X, 
  TerminalSquare, 
  CheckSquare, 
  FileText, 
  Layers, 
  LayoutDashboard 
} from "lucide-react";
import { AppButton } from "@/components/ui/AppButton";

type ShortcutItem = {
  keys: string[];
  description: string;
  action: () => void;
  icon: React.ElementType;
};

export default function GlobalShortcuts() {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const isTyping = () => {
    if (typeof document === "undefined") return false;
    const activeElement = document.activeElement;
    if (!activeElement) return false;
    
    const tagName = activeElement.tagName.toLowerCase();
    const isInput = tagName === "input" || tagName === "textarea";
    const isContentEditable = activeElement.getAttribute("contenteditable") === "true";
    
    return isInput || isContentEditable;
  };

  const executeAction = (action: () => void) => {
    setIsOpen(false);
    action();
  };

  const shortcuts = {
    navigation: [
      {
        keys: ["Alt", "D"],
        description: "Go to dashboard",
        icon: LayoutDashboard,
        action: () => router.push("/")
      },
      {
        keys: ["Alt", "W"],
        description: "Go to workspaces",
        icon: Layers,
        action: () => router.push("/workspaces")
      },
      {
        keys: ["Alt", "K"],
        description: "Go to ticket tracking",
        icon: TerminalSquare,
        action: () => router.push("/tickets")
      },
      {
        keys: ["Alt", "R"],
        description: "Go to requirements",
        icon: FileText,
        action: () => router.push("/requirements")
      }
    ],
    creation: [
      {
        keys: ["Alt", "Shift", "T"],
        description: "Create New Task",
        icon: CheckSquare,
        action: () => router.push("/workspaces?create=task")
      },
      {
        keys: ["Alt", "Shift", "W"],
        description: "Create New Workspace",
        icon: Layers,
        action: () => router.push("/workspaces?create=true")
      },
      {
        keys: ["Alt", "Shift", "K"],
        description: "Create new ticket",
        icon: TerminalSquare,
        action: () => router.push("/tickets?create=true")
      },
      {
        keys: ["Alt", "Shift", "R"],
        description: "Create new requirement",
        icon: FileText,
        action: () => router.push("/requirements?create=true")
      }
    ],
    system: [
      {
        keys: ["Shift", "?"],
        description: "Show shortcuts menu",
        icon: Keyboard,
        action: () => setIsOpen(true)
      }
    ]
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTyping()) return;

      if (e.shiftKey && e.key === "?") {
        e.preventDefault();
        setIsOpen(prev => !prev);
        return;
      }

      if (e.altKey) {
        const key = e.key.toLowerCase();
        
        if (!e.shiftKey) {
          if (key === "d") { e.preventDefault(); executeAction(shortcuts.navigation[0].action); }
          else if (key === "w") { e.preventDefault(); executeAction(shortcuts.navigation[1].action); }
          else if (key === "k") { e.preventDefault(); executeAction(shortcuts.navigation[2].action); }
          else if (key === "r") { e.preventDefault(); executeAction(shortcuts.navigation[3].action); }
        }
        
        if (e.shiftKey) {
          if (key === "t") { e.preventDefault(); executeAction(shortcuts.creation[0].action); }
          else if (key === "w") { e.preventDefault(); executeAction(shortcuts.creation[1].action); }
          else if (key === "k") { e.preventDefault(); executeAction(shortcuts.creation[2].action); }
          else if (key === "r") { e.preventDefault(); executeAction(shortcuts.creation[3].action); }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router, pathname]);

  if (!isOpen) return null;

  const renderShortcut = (item: ShortcutItem) => (
    <button 
      type="button"
      key={item.description}
      onClick={() => executeAction(item.action)}
      className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-surface-hover cursor-pointer transition-colors group text-left border-0 bg-transparent"
    >
      <div className="flex items-center gap-2.5">
        <div className="p-1.5 rounded-md bg-sunken border border-border group-hover:border-primary/30 transition-colors">
          <item.icon className="h-3.5 w-3.5 text-muted group-hover:text-primary transition-colors" />
        </div>
        <span className="font-medium text-xs text-foreground">{item.description}</span>
      </div>
      <div className="flex items-center gap-1">
        {item.keys.map((k, i) => (
          <React.Fragment key={i}>
            <kbd className="min-w-[20px] inline-flex items-center justify-center rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-[11px] font-semibold text-muted shadow-xs">
              {k}
            </kbd>
            {i < item.keys.length - 1 && <span className="text-muted text-xs">+</span>}
          </React.Fragment>
        ))}
      </div>
    </button>
  );

  return (
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-[var(--overlay)] p-4 animate-in fade-in duration-150">
      <div 
        className="w-full max-w-2xl bg-surface rounded-xl border border-border shadow-xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border bg-surface">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-accent-soft text-primary">
              <Keyboard className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-heading">Keyboard shortcuts</h2>
            </div>
          </div>
          <AppButton 
            variant="ghost" 
            size="icon" 
            aria-label="Close shortcuts"
            onClick={() => setIsOpen(false)}
            className="h-7 w-7 rounded-md hover:bg-danger-soft hover:text-danger text-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </AppButton>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 overflow-y-auto max-h-[60vh]">
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-heading pl-1">Navigation</h3>
            <div className="space-y-0.5">
              {shortcuts.navigation.map(renderShortcut)}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-heading pl-1">Create new</h3>
            <div className="space-y-0.5">
              {shortcuts.creation.map(renderShortcut)}
            </div>
          </div>

          <div className="space-y-2 md:col-span-2 mt-1 pt-3 border-t border-border">
            <h3 className="text-xs font-semibold text-heading pl-1">System</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
              {shortcuts.system.map(renderShortcut)}
            </div>
          </div>
        </div>
        
        <div className="bg-sunken p-2.5 text-center border-t border-border">
          <p className="text-[11px] text-muted">
            Tip: press <kbd className="px-1 py-0.5 rounded border border-border bg-surface text-[11px] font-mono">Shift + ?</kbd> anytime to open this menu
          </p>
        </div>
      </div>
    </div>
  );
}
