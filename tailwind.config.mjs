import defaultTheme from "tailwindcss/defaultTheme";

export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Geist Mono", "JetBrains Mono", "Fira Code", ...defaultTheme.fontFamily.mono],
        mono: ["Geist Mono", "JetBrains Mono", "Fira Code", ...defaultTheme.fontFamily.mono],
      },
      colors: {
        paper: {
          bg: "#ffffff",
          fg: "#000000",
          muted: "#555555",
          border: "#000000",
          accent: "#000000",
          hover: "#333333",
        },
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
