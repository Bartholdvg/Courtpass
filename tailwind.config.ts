import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        lime: "#BFEF45",
        dark: "#0D1A0F",
        surface: "#132015",
        surface2: "#0F1C12",
        muted: "#3A5040",
        border: "#1E3022",
        text: "#E8F0E9",
        text2: "#8BAA8F",
        text3: "#4A6650",
      },
      fontFamily: {
        playfair: ["var(--font-playfair)"],
        "dm-sans": ["var(--font-dm-sans)"],
      },
      keyframes: {
        "slide-in-left": {
          "0%": { transform: "translateX(-100%)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-subtle": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.4", transform: "scale(0.85)" },
        },
      },
      animation: {
        "slide-in-left": "slide-in-left 0.3s ease-out",
        "fade-up": "fade-up 0.6s ease-out",
        "pulse-subtle": "pulse-subtle 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
}

export default config
