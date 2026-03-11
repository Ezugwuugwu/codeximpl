import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    fontFamily: {
      sans: ["Inter", "sans-serif"],
    },
    fontSize: {
      sm: ["0.9375rem", { lineHeight: "1.4rem" }],
      base: ["1rem", { lineHeight: "1.5rem" }],
      lg: ["1.125rem", { lineHeight: "1.75rem" }],
      xl: ["1.25rem", { lineHeight: "1.75rem" }],
      "2xl": ["1.75rem", { lineHeight: "2.1rem" }],
      "3xl": ["1.75rem", { lineHeight: "2.1rem" }],
      "4xl": ["2.25rem", { lineHeight: "2.6rem" }],
    },
    extend: {
      colors: {
        ink: "#0f172a",
        mist: "#e2e8f0",
        mint: "#06d6a0",
        ember: "#ef476f",
      },
    },
  },
  plugins: [],
} satisfies Config;
