/** @type {import('tailwindcss').Config} */
module.exports = {
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
      },
    },
  },
  plugins: [],
};
