/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        fsm: {
          bg: "rgb(var(--fsm-bg) / <alpha-value>)",
          panel: "rgb(var(--fsm-panel) / <alpha-value>)",
          ink: "rgb(var(--fsm-ink) / <alpha-value>)",
          "ink-muted": "rgb(var(--fsm-ink-muted) / <alpha-value>)",
          border: "rgb(var(--fsm-border) / <alpha-value>)",
          accent: "rgb(var(--fsm-accent) / <alpha-value>)",
          accentDark: "rgb(var(--fsm-accent-dark) / <alpha-value>)",
          "blue-soft": "rgb(var(--fsm-blue-soft) / <alpha-value>)",
          "blue-soft-hover": "rgb(var(--fsm-blue-soft-hover) / <alpha-value>)",
          "blue-soft-2": "rgb(var(--fsm-blue-soft-2) / <alpha-value>)",
          "blue-soft-3": "rgb(var(--fsm-blue-soft-3) / <alpha-value>)",
          "red-soft": "rgb(var(--fsm-red-soft) / <alpha-value>)",
          "red-soft-hover": "rgb(var(--fsm-red-soft-hover) / <alpha-value>)",
          "red-accent": "rgb(var(--fsm-red-accent) / <alpha-value>)"
        }
      }
    }
  },
  plugins: []
};
