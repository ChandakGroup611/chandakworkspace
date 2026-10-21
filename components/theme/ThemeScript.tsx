/**
 * Render inside <head> in app/layout.tsx, BEFORE any stylesheet-dependent content:
 *
 *   <html lang="en" suppressHydrationWarning>
 *     <head><ThemeScript /></head>
 *     <body>...</body>
 *   </html>
 *
 * It runs synchronously before first paint and applies the saved theme, so users
 * no longer see a light-theme flash (or a dark flash) on every page load.
 * The old provider only applied the theme inside useEffect, after React hydrated.
 */
import { THEMES, LEGACY_THEME_MAP, DEFAULT_THEME, FONTS, WEIGHT_PROFILES, STORAGE_KEYS } from "./theme-registry";

const modes = Object.fromEntries(THEMES.map((t) => [t.id, t.mode]));
const fonts = Object.fromEntries(Object.entries(FONTS).map(([k, v]) => [k, v.stack]));

const script = `(function(){try{
var d=document.documentElement,ls=window.localStorage;
var M=${JSON.stringify(modes)},L=${JSON.stringify(LEGACY_THEME_MAP)},F=${JSON.stringify(fonts)},W=${JSON.stringify(WEIGHT_PROFILES)},K=${JSON.stringify(STORAGE_KEYS)};
var t=ls.getItem(K.theme)||"${DEFAULT_THEME}";if(!M[t])t=L[t]||"${DEFAULT_THEME}";
var m=M[t];
d.setAttribute("data-theme",t);d.setAttribute("data-mode",m);
d.classList.add(m==="dark"?"theme-dark":"theme-light");if(m==="dark")d.classList.add("dark");
d.style.colorScheme=m;
var dn=ls.getItem(K.density);d.setAttribute("data-density",dn==="compact"||dn==="dense"?dn:"comfortable");
var a=ls.getItem(K.accent);if(a&&a!=="theme-default"&&a.charAt(0)!=="#")d.setAttribute("data-accent",a);
var f=ls.getItem(K.font);d.style.setProperty("--app-font-family",F[f]||F.inter);
var w=W[ls.getItem(K.weight)]||W.standard;d.style.setProperty("--ui-weight-semibold",w.semibold);d.style.setProperty("--ui-weight-bold",w.bold);d.style.setProperty("--ui-weight-extrabold",w.extrabold);
var b=parseInt(ls.getItem(K.baseSize)||"",10);if(b>=12&&b<=20)d.style.setProperty("--base-font-size",b+"px");
}catch(e){document.documentElement.setAttribute("data-theme","${DEFAULT_THEME}");document.documentElement.setAttribute("data-mode","light");}})();`;

export function ThemeScript() {
  return <script id="chandak-theme-init" dangerouslySetInnerHTML={{ __html: script }} />;
}
