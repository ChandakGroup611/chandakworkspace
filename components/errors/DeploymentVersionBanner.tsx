"use client";

import { useEffect, useState, useRef } from "react";
import { AppButton } from "@/components/ui/AppButton";

export function DeploymentVersionBanner() {
  const [currentCommit, setCurrentCommit] = useState<string | null>(null);
  const [newVersionAvailable, setNewVersionAvailable] = useState(false);
  const isAutoReloading = useRef(false);

  useEffect(() => {
    let isMounted = true;

    // Fetch initial version from /api/version
    fetch("/api/version", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data?.commit) {
          setCurrentCommit(data.commit);
        }
      })
      .catch(() => {});

    // Periodic poll every 5 minutes (300,000 ms)
    const interval = setInterval(() => {
      fetch("/api/version", { cache: "no-store" })
        .then((res) => res.json())
        .then((data) => {
          if (!isMounted) return;
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
    }, 300000);

    return () => {
      isMounted = false;
      clearInterval(interval);
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
