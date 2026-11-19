"use client";

import { useEffect, useState, useRef } from "react";
import { AppButton } from "@/components/ui/AppButton";

export function DeploymentVersionBanner() {
  const [currentCommit, setCurrentCommit] = useState<string | null>(null);
  const [newVersionAvailable, setNewVersionAvailable] = useState(false);
  const isAutoReloading = useRef(false);

  useEffect(() => {
    let isMounted = true;
    let lastCheckedAt = Date.now();

    const checkVersion = () => {
      // R1: Pause when tab is hidden to eliminate background CPU/network load
      if (typeof document !== "undefined" && document.hidden) return;

      lastCheckedAt = Date.now();
      fetch("/api/version", { cache: "no-store" })
        .then((res) => res.json())
        .then((data) => {
          if (!isMounted) return;
          if (!currentCommit && data?.commit) {
            setCurrentCommit(data.commit);
            return;
          }
          if (currentCommit && data?.commit && data.commit !== currentCommit) {
            setNewVersionAvailable(true);
            if (!isAutoReloading.current) {
              isAutoReloading.current = true;
              // Save open form drafts
              saveOpenDrafts();
              setTimeout(() => {
                window.location.reload();
              }, 2000);
            }
          }
        })
        .catch(() => {});
    };

    // Initial check on mount
    checkVersion();

    // R1: Periodic poll every 10 minutes (600,000 ms), paused when tab is hidden
    const interval = setInterval(checkVersion, 600000);

    // Check on window focus only if at least 10 minutes have elapsed since last check
    const handleFocus = () => {
      if (Date.now() - lastCheckedAt >= 600000) {
        checkVersion();
      }
    };
    window.addEventListener("focus", handleFocus);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [currentCommit]);

  if (!newVersionAvailable) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-lg bg-slate-900 px-5 py-3 text-sm text-white shadow-2xl border border-slate-700 animate-in fade-in slide-in-from-bottom-2">
      <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
      <span>New update available — refreshing application cleanly...</span>
      <AppButton
        onClick={() => {
          saveOpenDrafts();
          window.location.reload();
        }}
        variant="primary"
        size="sm"
      >
        Reload Now
      </AppButton>
    </div>
  );
}

function saveOpenDrafts() {
  try {
    const inputs = document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input[name], textarea[name]");
    const drafts: Record<string, string> = {};
    inputs.forEach((input) => {
      if (input.name && input.value && !input.type.includes("password")) {
        drafts[input.name] = input.value;
      }
    });
    if (Object.keys(drafts).length > 0) {
      sessionStorage.setItem("chandak_form_draft_recovery", JSON.stringify({
        path: window.location.pathname,
        timestamp: Date.now(),
        drafts
      }));
    }
  } catch {
    // Ignore storage errors
  }
}
