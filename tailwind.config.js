/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./cloud/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@decernhq/cloud/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f9ff",
          100: "#e0f2fe",
          200: "#bae6fd",
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1",
          800: "#075985",
          900: "#0c4a6e",
          950: "#082f49",
        },
        /* Colori semantic: usano le variabili CSS, cambiano con .dark su html */
        app: {
          bg: "var(--app-bg)",
          card: "var(--app-card)",
          text: "var(--app-text)",
          "text-muted": "var(--app-text-muted)",
          border: "var(--app-border)",
          "input-bg": "var(--app-input-bg)",
          hover: "var(--app-hover)",
          active: "var(--app-active)",
          "active-text": "var(--app-active-text)",
        },
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
};
