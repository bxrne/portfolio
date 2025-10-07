import defaultTheme from "tailwindcss/defaultTheme";

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
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
            dark: "#1d2021",
          },
          bg0: {
            light: "#fbf1c7",
            dark: "#282828",
          },
          bg1: {
            light: "#ebdbb2",
            dark: "#3c3836",
          },
          bg2: {
            light: "#d5c4a1",
            dark: "#504945",
          },
          bg3: {
            light: "#bdae93",
            dark: "#665c54",
          },
          bg4: {
            light: "#a89984",
            dark: "#7c6f64",
          },
          fg0: {
            light: "#282828",
            dark: "#fbf1c7",
          },
          fg1: {
            light: "#3c3836",
            dark: "#ebdbb2",
          },
          fg2: {
            light: "#504945",
            dark: "#d5c4a1",
          },
          fg3: {
            light: "#665c54",
            dark: "#bdae93",
          },
          fg4: {
            light: "#7c6f64",
            dark: "#a89984",
          },
          red: {
            light: "#9d0006",
            dark: "#fb4934",
          },
          green: {
            light: "#79740e",
            dark: "#b8bb26",
          },
          yellow: {
            light: "#b57614",
            dark: "#fabd2f",
          },
          blue: {
            light: "#076678",
            dark: "#83a598",
          },
          purple: {
            light: "#8f3f71",
            dark: "#d3869b",
          },
          aqua: {
            light: "#427b58",
            dark: "#8ec07c",
          },
          orange: {
            light: "#af3a03",
            dark: "#fe8019",
          },
          gray: "#928374",
        },
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
