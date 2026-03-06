/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        fsm: {
          bg: "#35595e",
          panel: "#e8dacc",
          ink: "#2b241f",
          accent: "#a8552a",
          accentDark: "#7a3d1e"
        }
      }
    }
  },
  plugins: []
};
