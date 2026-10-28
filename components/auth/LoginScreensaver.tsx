"use client";

/**
 * Idle "live screen". After `idleMs` (default 5 minutes) with no mouse, touch, scroll or key
 * input, the same 3D Chandak scene as the login page takes over the whole screen: the stepped
 * pyramid turning with its step wave, and the modules (Tasks, Tickets, Requirements, AMC, Fleet,
 * Design) brought to the front one by one with their caption, plus a live clock.
 * Any mouse move, touch or key press hides it and the page underneath is exactly as it was
 * (nothing is reloaded or reset). Off while `disabled` (e.g. while signing in).
 */
import React, { useEffect, useRef, useState } from "react";
import { LoginScene3D } from "./LoginScene3D";
import s from "./LoginScreensaver.module.css";

export function LoginScreensaver({ idleMs = 5 * 60 * 1000, disabled = false }: { idleMs?: number; disabled?: boolean }) {
  const [on, setOn] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const onRef = useRef(false);
  onRef.current = on;

  // idle detection
  useEffect(() => {
    if (disabled) { window.clearTimeout(timer.current); setOn(false); return; }
    const arm = () => {
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setOn(true), idleMs);
    };
    const activity = (e: Event) => {
      if (onRef.current) {
        setOn(false);
        // the key press that wakes the screen shouldn't also type into the page
        if (e.type === "keydown") e.preventDefault();
      }
      arm();
    };
    const events = ["pointermove", "pointerdown", "keydown", "wheel", "touchstart"] as const;
    events.forEach((ev) => window.addEventListener(ev, activity, { passive: ev !== "keydown", capture: true }));
    arm();
    return () => {
      window.clearTimeout(timer.current);
      events.forEach((ev) => window.removeEventListener(ev, activity, { capture: true } as EventListenerOptions));
    };
  }, [idleMs, disabled]);

  // live clock while showing
  useEffect(() => {
    if (!on) return;
    setNow(new Date());
    const clock = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(clock);
  }, [on]);

  if (!on) return null;
  const time = now ? now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
  const date = now ? now.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" }) : "";

  return (
    <div className={s.overlay} role="presentation" aria-hidden>
      <LoginScene3D variant="backdrop" />
      <div className={s.brand}>
        <span className={s.plate}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/Chandak_Group_Official_Logo.png" alt="" className={s.logo} />
        </span>
      </div>
      <div className={s.footer}>
        <div className={s.time}>{time}</div>
        <div className={s.date}>{date}</div>
        <div className={s.hint}>Chandak Workspace · move the mouse or press any key to continue</div>
      </div>
    </div>
  );
}

export default LoginScreensaver;
