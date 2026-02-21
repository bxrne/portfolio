import defaultTheme from "tailwindcss/defaultTheme";

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",

  content: [
    "./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Geist Mono", "JetBrains Mono", ...defaultTheme.fontFamily.mono],
        serif: ["Geist Mono", "JetBrains Mono", ...defaultTheme.fontFamily.mono],
        mono: ["Geist Mono", "JetBrains Mono", ...defaultTheme.fontFamily.mono],
      },
      colors: {
        terminal: {
          bg: "#06080f",
          panel: "#0e1222",
          border: "#2a314a",
          fg: "#e6ebff",
          muted: "#a2adcb",
          accent: "#ff9838",
          "accent-soft": "#3d2718",
          glow: "#5f6fff",
          "glow-soft": "#182042",
        },
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
