import defaultTheme from "tailwindcss/defaultTheme";

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", ...defaultTheme.fontFamily.sans],
        serif: ["Playfair Display", ...defaultTheme.fontFamily.serif],
        mono: ["Geist Mono", "JetBrains Mono", ...defaultTheme.fontFamily.mono],
      },
      colors: {
        paper: {
          bg: "#faf8f5",
          fg: "#1a1a1a",
          muted: "#6b6b6b",
          border: "#e0dcd7",
          accent: "#1a1a1a",
          hover: "#555555",
        },
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
