import type { Config } from "tailwindcss";
import { fontFamily } from "tailwindcss/defaultTheme";

export default {
  prefix: "@",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter Variable", ...fontFamily.sans],
        display: ["Barlow Condensed", ...fontFamily.sans],
      },
      colors: {
        // Design tokens of the "tactical HQ" theme
        canvas: "#0E1217",
        surface: "#141A21",
        raised: "#1B232C",
        overlay: "#232D38",
        line: "#2C3743",
        "line-strong": "#3D4B5A",
        fg: "#E8EDF2",
        "fg-muted": "#9AA8B6",
        "fg-subtle": "#6C7A88",
        accent: "#E47220",
        "accent-hover": "#F58F45",
        "accent-fg": "#14100B",
        "accent-soft": "#3A2413",
        success: "#3FB56B",
        "success-soft": "#14301F",
        danger: "#E5534B",
        "danger-soft": "#3A1A18",
        warning: "#E3B341",
        "warning-soft": "#352B12",
        info: "#5B9BF5",
        "info-soft": "#16263F",
        // Country colors
        "orange-star": "rgb(208, 64, 56)",
        "blue-moon": "rgb(70, 110, 254)",
        "green-earth": "rgb(55, 164, 42)",
        "yellow-comet": "rgb(218, 165, 32)",
        "black-hole": "#800080",
      },
    },

    screens: {
      cellphone: "360px",
      tablet: "480px",
      large_tablet: "640px",
      smallscreen: "768px",
      laptop: "1024px",
      desktop: "1280px",
      monitor: "1640px",
      large_monitor: "1980px",
      ultra: "3600px",
      short: { raw: "(min-height: 600px)" },
      medium: { raw: "(min-height: 700px)" },
    },
  },
  safelist: [
    {
      // used through class names built at runtime, see ArmyChip
      pattern: /bg-(orange-star|blue-moon|green-earth|yellow-comet|black-hole)/,
    },
  ],
  plugins: [],
} satisfies Config;
