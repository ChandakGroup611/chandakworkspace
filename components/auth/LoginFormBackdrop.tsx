"use client";

/**
 * Login form side: an animated backdrop that echoes the 3D brand scene on the left.
 * Every colour comes from the user's saved theme (ThemeScript applies it to <html> before paint,
 * including a custom accent), so the page matches the colours they picked in Settings.
 *   - Four backdrop designs take turns, crossfading every 3 seconds (pure CSS, 12 s cycle):
 *       aurora (drifting accent glows + dotted blueprint grid), rings (pulses from the card),
 *       beams (diagonal light sweeping across), waves (flowing contour lines).
 *   - The left edge fades into the 3D scene, so the two halves read as one page.
 *   - Glass tiles for the workspace modules float in the corners and light up one by one.
 *   - A stepped-pyramid outline pulses up its steps every 2 seconds, in time with the left scene.
 *   - The form sits on a glass card with a light that travels around its border.
 * Pure CSS (no JS loop). Honours prefers-reduced-motion (static). Decorative only.
 *
 *   <LoginFormBackdrop />                         inside a `relative` container, behind the form
 *   <div className={formMotion.card}>…</div>      glass card with the travelling border light
 *   <div className={formMotion.item} style={{ "--d": 2 }} />   staggered entrance for form rows
 *   <AppButton className={formMotion.sheen} />    light sweep across the main button
 */
import React from "react";
import { LOGIN_MODULES } from "./LoginScene3D";
import s from "./LoginFormBackdrop.module.css";

const STEPS = 7;
const SPECKS = 12;
// four modules, one per corner zone (the pyramid outline takes the bottom-right)
const TILES = LOGIN_MODULES.slice(0, 4);
const RINGS = 4;
const WAVES = 5;
// one wave per 600 units, repeated across 2400 so it can slide 600 units and loop seamlessly
const wavePath = (y: number, amp: number) =>
  `M0 ${y}` + [0, 600, 1200, 1800].map((x) => ` C ${x + 200} ${y - amp}, ${x + 400} ${y + amp}, ${x + 600} ${y}`).join("");

export function LoginFormBackdrop() {
  return (
    <div className={s.backdrop} aria-hidden>
      {/* design 1: aurora */}
      <div className={s.design} style={{ "--s": 0 } as React.CSSProperties}>
        <div className={`${s.blob} ${s.blobA}`} />
        <div className={`${s.blob} ${s.blobB}`} />
        <div className={`${s.blob} ${s.blobC}`} />
        <div className={s.grid} />
      </div>
      {/* design 2: rings pulsing out from behind the card */}
      <div className={s.design} style={{ "--s": 1 } as React.CSSProperties}>
        <div className={s.ringGlow} />
        {Array.from({ length: RINGS }).map((_, i) => (
          <i key={i} className={s.ring} style={{ "--r": i } as React.CSSProperties} />
        ))}
      </div>
      {/* design 3: diagonal beams of light */}
      <div className={s.design} style={{ "--s": 2 } as React.CSSProperties}>
        <div className={s.beams} />
        <div className={s.beamGlow} />
      </div>
      {/* design 4: flowing contour waves */}
      <div className={s.design} style={{ "--s": 3 } as React.CSSProperties}>
        <svg className={s.waves} viewBox="0 0 2400 600" preserveAspectRatio="none">
          {Array.from({ length: WAVES }).map((_, i) => (
            <path key={i} className={s.wave} style={{ "--w": i } as React.CSSProperties} d={wavePath(300 + i * 36, 70 - i * 8)} />
          ))}
        </svg>
        <div className={s.waveGlow} />
      </div>
      <div className={s.specks}>
        {Array.from({ length: SPECKS }).map((_, i) => (
          <i key={i} className={s.speck} style={{ "--n": i } as React.CSSProperties} />
        ))}
      </div>
      {TILES.map(({ label, Icon }, i) => (
        <div key={label} className={`${s.tile} ${s[`tile${i}`]}`} style={{ "--t": i } as React.CSSProperties}>
          <Icon className={s.tileIcon} />
          <span>{label}</span>
        </div>
      ))}
      <div className={s.steps}>
        {Array.from({ length: STEPS }).map((_, i) => (
          <i key={i} className={s.step} style={{ "--i": i } as React.CSSProperties} />
        ))}
      </div>
    </div>
  );
}

/** Classes for the form: glass `card`, staggered entrance (`item` + `--d` order), heading `underline`, button `sheen`. */
export const formMotion = { card: s.card, item: s.item, sheen: s.sheen, underline: s.underline };

/** Page-level blend: `sceneBleed` wraps the 3D scene so it runs on under the form side and fades out;
 *  `seam` (a direct child of the page root) tints that fade with the theme accent. */
export const loginBlend = { sceneBleed: s.sceneBleed, seam: s.seam };

export default LoginFormBackdrop;
