import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Stratton brand: deep slate + warm gold accent
        ink: {
          50: "#f4f5f7",
          100: "#e6e8ec",
          200: "#c7cbd3",
          300: "#9aa1ad",
          400: "#6c7484",
          500: "#4a5161",
          600: "#363c4a",
          700: "#272c38",
          800: "#191d27",
          900: "#10131b",
          950: "#0a0d14",
        },
        gold: {
          400: "#f4c352",
          500: "#e9a82e",
          600: "#cc8a16",
          700: "#a26d10",
        },
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Inter", "Segoe UI", "Roboto", "Helvetica Neue", "sans-serif"],
        display: ["ui-sans-serif", "system-ui", "Inter", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
      animation: {
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "scale-in": "scale-in 200ms ease-out",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(233,168,46,0.45)" },
          "50%": { boxShadow: "0 0 0 22px rgba(233,168,46,0)" },
        },
        "scale-in": {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
