import type { Config } from "tailwindcss";
export default {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: { extend: { colors: { brand: { DEFAULT: "#0F766E", light: "#14A394", dark: "#0B5A54" } } } },
  plugins: [],
} satisfies Config;
