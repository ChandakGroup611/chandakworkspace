"use client";

/**
 * Login brand scene in real 3D, built from 7 blocks (the 7 steps of the Chandak logo pyramid).
 *   - The blocks drop in one by one, then every 3 seconds they rebuild themselves into the next
 *     design: Chandak pyramid → twisted tower → city skyline → spiral stairs → floating floors →
 *     monolith ring → and round again. A light wave keeps running up the blocks.
 *   - The workspace modules orbit the scene; on the same 3-second beat the orbit turns the next
 *     module to the front, highlights it, and the caption below scrolls up to describe it.
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
const STEP_MS = 3000;        // a new design (and the next module) every 3 seconds
const SLOT = 360 / LOGIN_MODULES.length;

/* ---------- the designs: where each of the 7 blocks goes, in units of the base width ---------- */
type Block = { fx: number; fy: number; fz: number; ry: number; sx: number; sy: number; sz: number };
const H = 0.055;             // block height / base width (same as --h in the CSS)
const PITCH = 0.086;         // pyramid step + stripe gap
const rad = (d: number) => (d * Math.PI) / 180;
const onGround = (heightB: number) => H / 2 - heightB / 2; // centre of a block standing on the base line
const CITY = [ // x, z, height, width
  [-0.36, -0.3, 0.34, 0.24], [0.02, -0.38, 0.55, 0.22], [0.38, -0.26, 0.28, 0.26],
  [-0.34, 0.14, 0.22, 0.26], [0.04, 0.04, 0.68, 0.24], [0.4, 0.16, 0.42, 0.2], [-0.04, 0.44, 0.18, 0.3],
];
export const LOGIN_DESIGNS: { name: string; at: (i: number) => Block }[] = [
  { name: "Chandak Pyramid", at: (i) => ({ fx: 0, fy: -i * PITCH, fz: 0, ry: 0, sx: 1 - i * 0.13, sy: 1, sz: 1 - i * 0.13 }) },
  { name: "Twisted Tower", at: (i) => ({ fx: 0, fy: -i * 0.1 - 0.02, fz: 0, ry: i * 13, sx: 0.42, sy: 1.5, sz: 0.42 }) },
  { name: "City Skyline", at: (i) => { const [x, z, h0, w] = CITY[i]; const h = h0 * 0.82; return { fx: x, fy: onGround(h), fz: z, ry: 0, sx: w, sy: h / H, sz: w }; } },
  { name: "Spiral Stairs", at: (i) => { const a = i * 42 - 120; return { fx: 0.27 * Math.sin(rad(a)), fy: -i * 0.092 - 0.02, fz: 0.27 * Math.cos(rad(a)), ry: a + 90, sx: 0.4, sy: 1.4, sz: 0.17 }; } },
  { name: "Floating Floors", at: (i) => ({ fx: 0, fy: -i * 0.16 - 0.04, fz: 0, ry: (i % 2) * 45, sx: 1 - i * 0.1, sy: 0.7, sz: 1 - i * 0.1 }) },
  { name: "Monolith Ring", at: (i) => { const a = (i * 360) / LAYERS; const h = 0.34 + 0.07 * (i % 3); return { fx: 0.48 * Math.sin(rad(a)), fy: onGround(h), fz: 0.48 * Math.cos(rad(a)), ry: a, sx: 0.13, sy: h / H, sz: 0.2 }; } },
];

export function LoginScene3D({ variant = "hero" }: { variant?: "hero" | "compact" | "backdrop" }) {
  const root = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);              // counts up forever; module = step % 6
  const [reduce, setReduce] = useState(false);
  const showOrbit = variant !== "compact";
  const showCaption = variant !== "compact";

  // the 3-second beat: next design and next module (starts after the first build-up)
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(mq.matches);
    if (mq.matches) return;
    let id: number | undefined;
    const start = window.setTimeout(() => {
      id = window.setInterval(() => { if (!document.hidden) setStep((n) => n + 1); }, STEP_MS);
    }, 1200);
    return () => { window.clearTimeout(start); window.clearInterval(id); };
  }, []);

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
  const design = LOGIN_DESIGNS[step % LOGIN_DESIGNS.length];
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
          {/* 7 blocks arranged as the current design; a light wave runs up them */}
          <div className={s.pyramid} data-design={design.name}>
            {Array.from({ length: LAYERS }).map((_, i) => {
              const b = design.at(i);
              const vars = { "--i": i, "--fx": b.fx, "--fy": b.fy, "--fz": b.fz, "--ry": b.ry, "--sx": b.sx, "--sy": b.sy, "--sz": b.sz } as React.CSSProperties;
              return (
                <div key={i} className={s.slab} style={vars}>
                  <div className={s.drop}>
                    <div className={s.lift}>
                      <i className={`${s.face} ${s.top}`} />
                      <i className={`${s.face} ${s.front}`} />
                      <i className={`${s.face} ${s.back}`} />
                      <i className={`${s.face} ${s.left}`} />
                      <i className={`${s.face} ${s.right}`} />
                    </div>
                  </div>
                </div>
              );
            })}
            <div className={`${s.beaconWrap} ${step % LOGIN_DESIGNS.length === 0 ? "" : s.beaconOff}`}><div className={s.beacon} /></div>
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
