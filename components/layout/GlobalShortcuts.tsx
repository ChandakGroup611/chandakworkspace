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

  // We only want to handle shortcuts if the user is NOT typing in an input field
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
        description: "Go to Dashboard",
        icon: LayoutDashboard,
        action: () => router.push("/")
      },
      {
        keys: ["Alt", "W"],
        description: "Go to Workspaces",
        icon: Layers,
        action: () => router.push("/workspaces")
      },
      {
        keys: ["Alt", "K"],
        description: "Go to Ticket Tracking",
        icon: TerminalSquare,
        action: () => router.push("/tickets")
      },
      {
        keys: ["Alt", "R"],
        description: "Go to Requirements",
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
        description: "Create New Ticket",
        icon: TerminalSquare,
        action: () => router.push("/tickets?create=true")
      },
      {
        keys: ["Alt", "Shift", "R"],
        description: "Create New Requirement",
        icon: FileText,
        action: () => router.push("/requirements?create=true")
      }
    ],
    system: [
      {
        keys: ["Shift", "?"],
        description: "Show Shortcuts Menu",
        icon: Keyboard,
        action: () => setIsOpen(true)
      }
    ]
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (isTyping()) return;

      // Check Shortcuts
      
      // Shift + ? for Help Modal
      if (e.shiftKey && e.key === "?") {
        e.preventDefault();
        setIsOpen(prev => !prev);
        return;
      }

      // Alt Modifiers
      if (e.altKey) {
        const key = e.key.toLowerCase();
        
        // Navigation (Alt + Key)
        if (!e.shiftKey) {
          if (key === "d") { e.preventDefault(); executeAction(shortcuts.navigation[0].action); }
          else if (key === "w") { e.preventDefault(); executeAction(shortcuts.navigation[1].action); }
          else if (key === "k") { e.preventDefault(); executeAction(shortcuts.navigation[2].action); }
          else if (key === "r") { e.preventDefault(); executeAction(shortcuts.navigation[3].action); }
        }
        
        // Creation (Alt + Shift + Key)
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
    <div 
      key={item.description}
      onClick={() => executeAction(item.action)}
      className="flex items-center justify-between p-3 rounded-lg hover:bg-surface-hover cursor-pointer transition-colors group"
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-md bg-background border border-border group-hover:border-theme-icon/50 group-hover:text-theme-icon transition-colors">
          <item.icon className="h-4 w-4 text-muted group-hover:text-theme-icon" />
        </div>
        <span className="font-medium text-sm text-foreground">{item.description}</span>
      </div>
      <div className="flex items-center gap-1.5">
        {item.keys.map((k, i) => (
          <React.Fragment key={i}>
            <kbd className="min-w-[24px] inline-flex items-center justify-center rounded border border-border bg-background px-1.5 py-1 font-mono text-[10px] font-semibold text-muted shadow-sm">
              {k}
            </kbd>
            {i < item.keys.length - 1 && <span className="text-muted/50 text-xs">+</span>}
          </React.Fragment>
        ))}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-surface rounded-2xl shadow-2xl border border-border/50 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border/50 bg-background/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-theme-btn-primary/10 text-theme-icon">
              <Keyboard className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground tracking-tight">Keyboard Shortcuts</h2>
              <p className="text-xs text-muted-foreground">Speed up your workflow with these hotkeys</p>
            </div>
          </div>
          <AppButton 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsOpen(false)}
            className="h-8 w-8 rounded-full hover:bg-danger/10 hover:text-danger text-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </AppButton>
        </div>

        {/* Content */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 overflow-y-auto max-h-[60vh]">
          
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-muted uppercase tracking-wider pl-1 mb-2">Navigation</h3>
            <div className="space-y-1">
              {shortcuts.navigation.map(renderShortcut)}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold text-muted uppercase tracking-wider pl-1 mb-2">Create New...</h3>
            <div className="space-y-1">
              {shortcuts.creation.map(renderShortcut)}
            </div>
          </div>

          <div className="space-y-3 md:col-span-2 mt-2 pt-6 border-t border-border/30">
            <h3 className="text-xs font-bold text-muted uppercase tracking-wider pl-1 mb-2">System</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              {shortcuts.system.map(renderShortcut)}
            </div>
          </div>

        </div>
        
        {/* Footer Hint */}
        <div className="bg-background/80 p-3 text-center border-t border-border/50">
          <p className="text-[11px] text-muted-foreground font-medium">
            Pro Tip: You can click on any shortcut above to execute it directly.
          </p>
        </div>
      </div>
    </div>
  );
}
