"use client";

/**
 * Login brand scene: the Chandak stepped pyramid (from the logo) built in real 3D, assembling layer
 * by layer, slowly turning, with the workspace modules orbiting it over a blueprint grid.
 * Pure CSS 3D + one requestAnimationFrame loop (no 3D library). The scene tilts toward the pointer.
 * Honours prefers-reduced-motion (static, no orbit or tilt). Decorative only: hidden from assistive tech.
 *
 *   <LoginScene3D />                  left half of the login page (large screens)
 *   <LoginScene3D variant="compact" /> small animated header above the form (phones / tablets)
 */
import React, { useEffect, useRef } from "react";
import { ClipboardList, Ticket, FileText, ShieldCheck, Truck, PenTool } from "lucide-react";
import s from "./LoginScene3D.module.css";

const MODULES = [
  { label: "Tasks", Icon: ClipboardList },
  { label: "Tickets", Icon: Ticket },
  { label: "Requirements", Icon: FileText },
  { label: "AMC", Icon: ShieldCheck },
  { label: "Fleet", Icon: Truck },
  { label: "Design", Icon: PenTool },
];
const LAYERS = 7; // the logo's stepped pyramid

export function LoginScene3D({ variant = "hero" }: { variant?: "hero" | "compact" }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduce.matches) { el.style.setProperty("--spin", "-28"); return; }

    let raf = 0, spin = -28, tx = 0, ty = 0, cx = 0, cy = 0, last = performance.now();
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - 0.5) * 2;   // -1 … 1
      ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
    };
    const onLeave = () => { tx = 0; ty = 0; };
    const tick = (now: number) => {
      const dt = Math.min(64, now - last); last = now;
      spin = (spin + dt * 0.012) % 360;                    // one turn ≈ 30 s
      cx += (tx - cx) * 0.06; cy += (ty - cy) * 0.06;      // eased tilt
      el.style.setProperty("--spin", spin.toFixed(2));
      el.style.setProperty("--tilt-x", (-cy * 7).toFixed(2));
      el.style.setProperty("--tilt-y", (cx * 9).toFixed(2));
      raf = requestAnimationFrame(tick);
    };
    // pause while the tab is hidden
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

  const compact = variant === "compact";
  return (
    <div ref={root} className={`${s.scene} ${compact ? s.compact : s.hero}`} aria-hidden>
      <div className={s.glow} />
      <div className={s.stars} />
      {/* blueprint floor */}
      <div className={s.floorWrap}><div className={s.floor} /></div>

      <div className={s.stage}>
        <div className={s.world}>
          {/* stepped pyramid: 7 slabs, widest at the bottom */}
          <div className={s.pyramid}>
            {Array.from({ length: LAYERS }).map((_, i) => {
              const size = 100 - i * 13; // % of the base
              return (
                <div key={i} className={s.slab} style={{ "--i": i, "--w": size } as React.CSSProperties}>
                  <i className={`${s.face} ${s.top}`} />
                  <i className={`${s.face} ${s.front}`} />
                  <i className={`${s.face} ${s.back}`} />
                  <i className={`${s.face} ${s.left}`} />
                  <i className={`${s.face} ${s.right}`} />
                </div>
              );
            })}
            <div className={s.beacon} />
          </div>

          {/* module orbit */}
          {!compact && (
            <div className={s.orbit}>
              <div className={s.ring} />
              {MODULES.map(({ label, Icon }, i) => (
                <div key={label} className={s.node} style={{ "--a": (360 / MODULES.length) * i } as React.CSSProperties}>
                  <div className={s.chip}>
                    <Icon className={s.chipIcon} aria-hidden />
                    <span>{label}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Classes for text placed over the hero scene (light ink that stays readable in every theme). */
export const sceneInk = { title: s.title, subtitle: s.subtitle, motto: s.motto };

export default LoginScene3D;
