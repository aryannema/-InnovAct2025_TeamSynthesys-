import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/**/*.{ts,tsx,mdx}",
    "./components/**/*.{ts,tsx,mdx}", // if you use /components outside /src
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0b0914",
        // primary purple scale
        primary: {
          50: "#f5e9ff",
          100: "#ead4ff",
          200: "#d5a9ff",
          300: "#bf7eff",
          400: "#a953ff",
          500: "#9438f5",
          600: "#792ad2",
          700: "#5f22a6",
          800: "#451a79",
          900: "#2c104d",
        },
      },
      boxShadow: {
        glow: "0 0 40px rgba(148,56,245,0.35)",
        insetGlow: "inset 0 0 60px rgba(148,56,245,0.25)",
      },
      backgroundImage: {
        "radial-fade":
          "radial-gradient(1200px 600px at 20% -10%, rgba(148,56,245,0.35), transparent 60%), radial-gradient(1000px 600px at 90% 10%, rgba(91,33,182,0.25), transparent 60%)",
        "hero-grad":
          "linear-gradient(180deg, rgba(17,12,28,0.85) 0%, rgba(9,8,18,0.95) 100%)",
      },
    },
  },
  plugins: [],
};
export default config;
