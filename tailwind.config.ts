import type { Config } from "tailwindcss";

/**
 * PS Jewellers design tokens — gold-on-white theme.
 * Source of truth for the visual system; see Design.md for the full
 * rationale and component-level documentation once that doc is updated
 * for the v2 (Tailwind) redesign.
 */
export default {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#171a23",
          soft: "#3d4152",
        },
        gold: {
          50: "#fbf4e6",
          100: "#f4e4bd",
          200: "#ecd292",
          300: "#e2bd66",
          400: "#d6a941",
          500: "#c1912b", // primary brand gold
          600: "#a67722",
          700: "#82601d",
          800: "#5f451a",
          900: "#3f2e14",
        },
        paper: "#ffffff",
        cream: "#fbf8f2",
        line: "#ece3d2",
        muted: "#7a7566",
        success: "#3f7a4e",
        error: "#b3423a",
        warning: "#b9822f",
      },
      fontFamily: {
        serif: ['"Playfair Display"', "Georgia", "Times New Roman", "serif"],
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "sans-serif",
        ],
      },
      maxWidth: {
        content: "1440px",
      },
      boxShadow: {
        card: "0 12px 32px -12px rgba(23, 26, 35, 0.16)",
        elevated: "0 24px 60px -16px rgba(23, 26, 35, 0.22)",
      },
      borderRadius: {
        xs: "4px",
      },
    },
  },
  plugins: [],
} satisfies Config;
