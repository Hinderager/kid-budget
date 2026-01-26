import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Category colors
        housing: "#3B82F6",
        utilities: "#06B6D4",
        food: "#22C55E",
        transportation: "#F97316",
        healthcare: "#EF4444",
        family: "#EC4899",
        debt: "#8B5CF6",
        personal: "#EAB308",
        misc: "#6B7280",
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
} satisfies Config;
