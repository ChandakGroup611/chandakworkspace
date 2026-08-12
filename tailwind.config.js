/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./*.tsx"
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--bg-primary)",
        foreground: "var(--text-primary)",
        surface: "var(--bg-surface)",
        elevated: "var(--bg-elevated)",
        muted: "var(--text-muted)",
        subtle: "var(--text-secondary)",
        border: "var(--border-subtle)",
        "border-active": "var(--border-active)",
        accent: "var(--accent-primary)",
        "accent-secondary": "var(--accent-secondary)",
        success: "var(--success)",
        warning: "var(--warning)",
        danger: "var(--danger)",
        "theme-btn-primary": "var(--btn-primary-bg)",
        "theme-btn-primary-text": "var(--btn-primary-text)",
        "theme-btn-secondary": "var(--btn-secondary-bg)",
        "theme-btn-secondary-text": "var(--btn-secondary-text)",
        "theme-tab-active": "var(--tab-active-bg)",
        "theme-tab-active-text": "var(--tab-active-text)",
        "theme-tab-inactive": "var(--tab-inactive-bg)",
        "theme-tab-inactive-text": "var(--tab-inactive-text)",
        "theme-heading": "var(--heading-text)",
        "theme-icon": "var(--icon-color)",
      },
    },
  },
  plugins: [],
};
