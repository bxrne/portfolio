import defaultTheme from "tailwindcss/defaultTheme";

/** @type {import('tailwindcss').Config} */
export default {

  content: [
    "./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Geist Mono", ...defaultTheme.fontFamily.sans],
        serif: ["Geist Mono", ...defaultTheme.fontFamily.serif],
      },
      colors: {
        gruvbox: {
          bg0_h: {
            light: "#f9f5d7",
          },
          bg0: {
            light: "#fbf1c7",
          },
          bg1: {
            light: "#ebdbb2",
          },
          bg2: {
            light: "#d5c4a1",
          },
          bg3: {
            light: "#bdae93",
          },
          bg4: {
            light: "#a89984",
          },
          fg0: {
            light: "#282828",
          },
          fg1: {
            light: "#3c3836",
          },
          fg2: {
            light: "#504945",
          },
          fg3: {
            light: "#665c54",
          },
          fg4: {
            light: "#7c6f64",
          },
          red: {
            light: "#9d0006",
          },
          green: {
            light: "#79740e",
          },
          yellow: {
            light: "#b57614",
          },
          blue: {
            light: "#076678",
          },
          purple: {
            light: "#8f3f71",
          },
          aqua: {
            light: "#427b58",
          },
          orange: {
            light: "#af3a03",
          },
          gray: "#928374",
        },
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
