import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
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
