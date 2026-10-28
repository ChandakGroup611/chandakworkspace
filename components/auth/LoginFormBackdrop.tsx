"use client";

/**
 * Login form side: an animated backdrop that echoes the 3D brand scene on the left.
 * Every colour comes from the user's saved theme (ThemeScript applies it to <html> before paint,
 * including a custom accent), so the page matches the colours they picked in Settings.
 *   - An aurora of three accent glows drifts slowly behind the form.
 *   - A dotted blueprint grid slides diagonally, faded out around the form.
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

export function LoginFormBackdrop() {
  return (
    <div className={s.backdrop} aria-hidden>
      <div className={`${s.blob} ${s.blobA}`} />
      <div className={`${s.blob} ${s.blobB}`} />
      <div className={`${s.blob} ${s.blobC}`} />
      <div className={s.grid} />
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

export default LoginFormBackdrop;
