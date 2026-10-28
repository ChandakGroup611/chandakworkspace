"use client";

/**
 * Login brand scene: the Chandak stepped pyramid (from the logo) built in real 3D.
 *   - The steps assemble one by one, then a light wave runs up the steps every 2 seconds.
 *   - The pyramid turns slowly; the workspace modules orbit it, and every 2 seconds the orbit turns
 *     the next module to the front, highlights it, and the caption below scrolls up to describe it.
 *   - A blueprint grid moves underneath; the whole scene tilts toward the pointer.
 * Pure CSS 3D + one requestAnimationFrame loop (no 3D library). Honours prefers-reduced-motion
 * (static). Decorative only: hidden from assistive technology.
 *
 *   <LoginScene3D />                   left half of the login page (large screens)
 *   <LoginScene3D variant="compact" /> small animated header above the form (phones / tablets)
 *   <LoginScene3D variant="backdrop" /> full-screen background (idle screensaver), no captions
 */
import React, { useEffect, useRef, useState } from "react";
import { ClipboardList, Ticket, FileText, ShieldCheck, Truck, PenTool } from "lucide-react";
import s from "./LoginScene3D.module.css";

export const LOGIN_MODULES = [
  { label: "Tasks", Icon: ClipboardList, line: "Plan work, assign owners and track every deadline." },
  { label: "Tickets", Icon: Ticket, line: "Raise, route and resolve IT and service requests." },
  { label: "Requirements", Icon: FileText, line: "Capture needs and move them through approvals." },
  { label: "AMC", Icon: ShieldCheck, line: "Contracts, renewals and spend for every service." },
  { label: "Fleet", Icon: Truck, line: "Vehicles, compliance, trips and maintenance in one place." },
  { label: "Design", Icon: PenTool, line: "Drawings and design approvals, tracked end to end." },
];
const LAYERS = 7;            // the logo's stepped pyramid
const STEP_MS = 2000;        // one module every 2 seconds
const SLOT = 360 / LOGIN_MODULES.length;

export function LoginScene3D({ variant = "hero" }: { variant?: "hero" | "compact" | "backdrop" }) {
  const root = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);              // counts up forever; module = step % 6
  const [reduce, setReduce] = useState(false);
  const showOrbit = variant !== "compact";
  const showCaption = variant !== "compact";

  // the 2-second module showcase
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(mq.matches);
    if (mq.matches || !showOrbit) return;
    const id = window.setInterval(() => { if (!document.hidden) setStep((n) => n + 1); }, STEP_MS);
    return () => window.clearInterval(id);
  }, [showOrbit]);

  // continuous motion: pyramid spin, orbit easing to the active module, pointer tilt
  const target = useRef(0);
  target.current = -step * SLOT;
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.style.setProperty("--spin", "-28");
      el.style.setProperty("--orbit", "0");
      return;
    }
    let raf = 0, spin = -28, orbit = 0, tx = 0, ty = 0, cx = 0, cy = 0, last = performance.now();
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      tx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - 0.5) * 2));
      ty = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height - 0.5) * 2));
    };
    const onLeave = () => { tx = 0; ty = 0; };
    const tick = (now: number) => {
      const dt = Math.min(64, now - last); last = now;
      spin = (spin + dt * 0.012) % 360;                 // pyramid: one turn ≈ 30 s
      orbit += (target.current - orbit) * Math.min(1, dt * 0.006); // orbit: eases to the next module
      cx += (tx - cx) * 0.06; cy += (ty - cy) * 0.06;
      el.style.setProperty("--spin", spin.toFixed(2));
      el.style.setProperty("--orbit", orbit.toFixed(2));
      el.style.setProperty("--tilt-x", (-cy * 7).toFixed(2));
      el.style.setProperty("--tilt-y", (cx * 9).toFixed(2));
      raf = requestAnimationFrame(tick);
    };
    const onVis = () => { cancelAnimationFrame(raf); if (!document.hidden) { last = performance.now(); raf = requestAnimationFrame(tick); } };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    document.addEventListener("visibilitychange", onVis);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  const active = step % LOGIN_MODULES.length;
  // caption position: always scrolls up; after the last module it scrolls onto a copy of the first,
  // then jumps back to the real first one without animating
  const [tick, setTick] = useState({ pos: 0, animate: true });
  useEffect(() => {
    if (step === 0) return;
    if (active !== 0) { setTick({ pos: active, animate: true }); return; }
    setTick({ pos: LOGIN_MODULES.length, animate: true });
    const t = window.setTimeout(() => setTick({ pos: 0, animate: false }), 750);
    return () => window.clearTimeout(t);
  }, [step, active]);
  return (
    <div ref={root} className={`${s.scene} ${s[variant]}`} aria-hidden>
      <div className={s.glow} />
      <div className={s.stars} />
      <div className={s.floorWrap}><div className={s.floor} /></div>

      <div className={s.stage}>
        <div className={s.world}>
          {/* stepped pyramid: 7 slabs, widest at the bottom; a light wave runs up the steps */}
          <div className={s.pyramid}>
            {Array.from({ length: LAYERS }).map((_, i) => (
              <div key={i} className={s.slab} style={{ "--i": i, "--w": 100 - i * 13 } as React.CSSProperties}>
                <div className={s.lift}>
                  <i className={`${s.face} ${s.top}`} />
                  <i className={`${s.face} ${s.front}`} />
                  <i className={`${s.face} ${s.back}`} />
                  <i className={`${s.face} ${s.left}`} />
                  <i className={`${s.face} ${s.right}`} />
                </div>
              </div>
            ))}
            <div className={s.beacon} />
          </div>

          {/* modules: the active one turns to the front and lights up */}
          {showOrbit && (
            <div className={s.orbit}>
              <div className={s.ring} />
              {LOGIN_MODULES.map(({ label, Icon }, i) => (
                <div key={label} className={s.node} style={{ "--a": SLOT * i } as React.CSSProperties}>
                  <div className={`${s.chip} ${i === active && !reduce ? s.chipActive : ""}`}>
                    <Icon className={s.chipIcon} aria-hidden />
                    <span>{label}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* caption that scrolls up to the active module */}
      {showCaption && (
        <div className={s.ticker}>
          <div className={s.tickerTrack} style={{ transform: `translateY(calc(${-tick.pos} * var(--tick-h)))`, transition: tick.animate ? undefined : "none" }}>
            {[...LOGIN_MODULES, LOGIN_MODULES[0]].map(({ label, Icon, line }, i) => (
              <div key={`${label}-${i}`} className={s.tickerItem}>
                <span className={s.tickerHead}>
                  <Icon className={s.tickerIcon} aria-hidden />
                  <span className={s.tickerLabel}>{label}</span>
                </span>
                <span className={s.tickerLine}>{line}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Classes for text placed over the hero scene (light ink that stays readable in every theme). */
export const sceneInk = { title: s.title, subtitle: s.subtitle, motto: s.motto };

export default LoginScene3D;
