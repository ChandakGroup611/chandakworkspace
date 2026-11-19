"use client";

import { useEffect, useRef } from "react";

export function ClientHttpErrorReporter() {
  const isReloading = useRef(false);

  useEffect(() => {
    // 1. Restore form drafts if returning after a reload
    try {
      const raw = sessionStorage.getItem("chandak_form_draft_recovery");
      if (raw) {
        const { path, timestamp, drafts } = JSON.parse(raw);
        if (path === window.location.pathname && Date.now() - timestamp < 300000 && drafts) {
          setTimeout(() => {
            Object.entries(drafts).forEach(([name, val]) => {
              const el = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${name}"]`);
              if (el && !el.value) {
                el.value = String(val);
                el.dispatchEvent(new Event("input", { bubbles: true }));
                el.dispatchEvent(new Event("change", { bubbles: true }));
              }
            });
            sessionStorage.removeItem("chandak_form_draft_recovery");
          }, 400);
        }
      }
    } catch {}

    // 2. Intercept window.fetch to report all 4xx/5xx responses and connection drops
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        if (!response.ok && response.status >= 400) {
          const rawUrl = typeof args[0] === "string" ? args[0] : (args[0] instanceof Request ? args[0].url : String(args[0]));
          // Prevent recursive loop on error logging and background version polling
          if (!rawUrl.includes("/api/log-http-error") && !rawUrl.includes("/api/version")) {
            const method = (args[1]?.method || (args[0] instanceof Request ? args[0].method : "GET")).toUpperCase();
            originalFetch("/api/log-http-error", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                status: response.status,
                method,
                path: rawUrl,
                source: response.status === 403 ? "server-firewall" : "app",
                errorMessage: `HTTP ${response.status} from fetch`
              })
            }).catch(() => {});
          }
        }
        return response;
      } catch (err: any) {
        const rawUrl = typeof args[0] === "string" ? args[0] : (args[0] instanceof Request ? args[0].url : String(args[0]));
        if (!rawUrl.includes("/api/log-http-error") && !rawUrl.includes("/api/version")) {
          originalFetch("/api/log-http-error", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              status: 0,
              method: "GET",
              path: rawUrl,
              source: "app",
              errorMessage: err?.message || "Failed to fetch / network error"
            })
          }).catch(() => {});
        }
        throw err;
      }
    };

    // 3. Capture unhandled client errors (ChunkLoadError, Server Action not found)
    const handleError = (event: ErrorEvent) => {
      const msg = event?.message || "";
      const isChunkLoadError = msg.includes("ChunkLoadError") || msg.includes("Loading chunk");
      const isServerActionError = msg.includes("Failed to find Server Action") || msg.includes("Could not find the function");

      if (isChunkLoadError || isServerActionError) {
        if (!isReloading.current) {
          isReloading.current = true;
          originalFetch("/api/log-http-error", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              status: isChunkLoadError ? 404 : 405,
              method: "GET",
              path: window.location.pathname + window.location.search,
              source: "app",
              errorMessage: msg,
              metadata: { type: isChunkLoadError ? "ChunkLoadError" : "ServerActionNotFound" }
            })
          }).catch(() => {});

          saveFormDrafts();
          showReloadNoticeAndReload();
        }
        return;
      }

      // Log fatal script error
      originalFetch("/api/log-http-error", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: 500,
          method: "GET",
          path: window.location.pathname + window.location.search,
          source: "app",
          errorMessage: msg,
          errorStack: event?.error?.stack,
          metadata: { filename: event?.filename, lineno: event?.lineno }
        })
      }).catch(() => {});
    };

    // 4. Intercept unhandled promise rejections
    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event?.reason;
      const msg = typeof reason === "string" ? reason : reason?.message || "";
      const isChunkLoadError = msg.includes("ChunkLoadError") || msg.includes("Loading chunk");
      const isServerActionError = msg.includes("Failed to find Server Action") || msg.includes("Could not find the function");

      if (isChunkLoadError || isServerActionError) {
        if (!isReloading.current) {
          isReloading.current = true;
          saveFormDrafts();
          showReloadNoticeAndReload();
        }
      }
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);

    return () => {
      window.fetch = originalFetch;
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  return null;
}

function saveFormDrafts() {
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
  } catch {}
}

function showReloadNoticeAndReload() {
  const notice = document.createElement("div");
  notice.style.position = "fixed";
  notice.style.top = "16px";
  notice.style.right = "16px";
  notice.style.zIndex = "999999";
  notice.style.backgroundColor = "#0F172A";
  notice.style.color = "#FFFFFF";
  notice.style.padding = "12px 20px";
  notice.style.borderRadius = "8px";
  notice.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
  notice.style.fontSize = "14px";
  notice.style.fontWeight = "500";
  notice.innerText = "New version available — reloading to update...";
  document.body.appendChild(notice);

  setTimeout(() => {
    window.location.reload();
  }, 1200);
}
