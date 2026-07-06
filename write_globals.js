const fs = require('fs');

const cssContent = `@import "tailwindcss";

/* Import Phase 1 Enterprise Design Token Foundation Layers */
@import '../src/styles/themes/base.css';
@import '../src/styles/themes/executive-light.css';
@import '../src/styles/themes/midnight-operations.css';
@import '../src/styles/themes/glass-intelligence.css';
@import '../src/styles/themes/enterprise-bento.css';
@import '../src/styles/themes/tactical-utility.css';
@import '../src/styles/themes/material-ocean.css';
@import '../src/styles/themes/aurora-breeze.css';
@import '../src/styles/themes/pure-elegance.css';
@import '../src/styles/themes/pristine-white.css';

/* Force Tailwind v4 to use class-based dark mode instead of media queries */
@custom-variant dark (&:where(.dark, .dark *));

@theme {
  --font-sans: var(--app-font-family, ui-sans-serif, system-ui, sans-serif);
  
  --color-background: var(--bg-primary);
  --color-foreground: var(--text-primary);
  --color-surface: var(--bg-surface);
  --color-elevated: var(--bg-elevated);
  --color-muted: var(--text-muted);
  --color-subtle: var(--text-secondary);
  --color-border: var(--border-subtle);
  --color-border-active: var(--border-active);
  --color-accent: var(--accent-primary);
  --color-accent-secondary: var(--accent-secondary);
  --color-success: var(--success);
  --color-warning: var(--warning);
  --color-danger: var(--danger);

}

/* Universal Theme Enhancements */
@layer base {
  /* Force inputs, buttons, and tables to inherit the font */
  input, textarea, select, button, table, th, td {
    font-family: inherit;
  }
}

@layer utilities {
  .bg-surface {
    background-color: var(--color-surface);
    backdrop-filter: var(--backdrop-blur, blur(0)) var(--backdrop-saturate, saturate(100%));
  }
  .bg-elevated {
    background-color: var(--color-elevated);
    backdrop-filter: var(--backdrop-blur, blur(0)) var(--backdrop-saturate, saturate(100%));
  }

  .font-semibold {
    font-weight: var(--ui-weight-semibold, 600) !important;
  }
  .font-bold {
    font-weight: var(--ui-weight-bold, 700) !important;
  }
  .font-extrabold {
    font-weight: var(--ui-weight-extrabold, 800) !important;
  }

  /* Universal Light Theme Enforcement */
  /* Replaces hardcoded dark backgrounds and text colors when a light theme is active */
  .theme-light .bg-\\[\\#0A0D14\\],
  .theme-light .bg-\\[\\#0b0e17\\]\\/95,
  .theme-light .bg-\\[\\#1C1C21\\],
  .theme-light .bg-black\\/30,
  .theme-light .bg-black\\/40,
  .theme-light .bg-black\\/50,
  .theme-light .bg-white\\/5,
  .theme-light .bg-white\\/10,
  .theme-light .bg-white\\/20,
  .theme-light .bg-white\\/\\[0\\.02\\],
  .theme-light .bg-white\\/\\[0\\.05\\],
  .theme-light .bg-white\\/\\[0\\.1\\] {
    background-color: var(--color-surface) !important;
  }

  .theme-light .border-white\\/5,
  .theme-light .border-white\\/10,
  .theme-light .border-white\\/20 {
    border-color: var(--color-border) !important;
  }

  .theme-light .text-white {
    color: var(--color-foreground) !important;
  }
  
  .theme-light .text-gray-200,
  .theme-light .text-gray-300,
  .theme-light .text-gray-400 {
    color: var(--color-subtle) !important;
  }

  /* Protect buttons and badges that legitimately need white text */
  .theme-light [class*="bg-blue-"] .text-white,
  .theme-light [class*="bg-indigo-"] .text-white,
  .theme-light [class*="bg-purple-"] .text-white,
  .theme-light [class*="bg-emerald-"] .text-white,
  .theme-light [class*="bg-rose-"] .text-white,
  .theme-light [class*="bg-amber-"] .text-white,
  .theme-light [class*="bg-green-"] .text-white,
  .theme-light [class*="bg-red-"] .text-white,
  .theme-light [class*="bg-slate-800"] .text-white,
  .theme-light [class*="bg-slate-900"] .text-white,
  .theme-light [class*="from-blue-"] .text-white,
  .theme-light [class*="from-indigo-"] .text-white,
  .theme-light [class*="from-purple-"] .text-white,
  .theme-light [class*="from-emerald-"] .text-white,
  .theme-light [class*="from-rose-"] .text-white,
  .theme-light [class*="from-amber-"] .text-white,
  .theme-light [class*="bg-blue-"].text-white,
  .theme-light [class*="bg-indigo-"].text-white,
  .theme-light [class*="bg-purple-"].text-white,
  .theme-light [class*="bg-emerald-"].text-white,
  .theme-light [class*="bg-rose-"].text-white,
  .theme-light [class*="bg-amber-"].text-white,
  .theme-light [class*="bg-green-"].text-white,
  .theme-light [class*="bg-red-"].text-white,
  .theme-light [class*="bg-slate-800"].text-white,
  .theme-light [class*="bg-slate-900"].text-white,
  .theme-light [class*="from-blue-"].text-white,
  .theme-light [class*="from-indigo-"].text-white,
  .theme-light [class*="from-purple-"].text-white,
  .theme-light [class*="from-emerald-"].text-white,
  .theme-light [class*="from-rose-"].text-white,
  .theme-light [class*="from-amber-"].text-white {
    color: #ffffff !important;
  }
  
  /* Universal Field Styling (Inputs, Selects, Textareas) */
  input:not([type="checkbox"]):not([type="radio"]):not(:focus),
  select:not(:focus),
  textarea:not(:focus) {
    border-width: 1px !important;
    border-style: solid !important;
    border-color: rgba(0, 0, 0, 0.15) !important;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04) !important;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
  }

  .theme-dark input:not([type="checkbox"]):not([type="radio"]):not(:focus),
  .theme-dark select:not(:focus),
  .theme-dark textarea:not(:focus) {
    border-color: rgba(255, 255, 255, 0.15) !important;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2) !important;
  }

  input:not([type="checkbox"]):not([type="radio"]):not(:focus):hover,
  select:not(:focus):hover,
  textarea:not(:focus):hover {
    border-color: rgba(0, 0, 0, 0.3) !important;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08) !important;
    transform: translateY(-1px);
  }

  .theme-dark input:not([type="checkbox"]):not([type="radio"]):not(:focus):hover,
  .theme-dark select:not(:focus):hover,
  .theme-dark textarea:not(:focus):hover {
    border-color: rgba(255, 255, 255, 0.3) !important;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3) !important;
    transform: translateY(-1px);
  }
}
`;

fs.writeFileSync('d:/adios/app/globals.css', cssContent);
console.log('Successfully wrote exact globals.css without errors!');
