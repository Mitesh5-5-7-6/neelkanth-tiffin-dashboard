/** @type {import('tailwindcss').Config} */
const config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#4F46E5",
        primaryLight: "#E0E7FF",

        success: "#16A34A",
        successLight: "#DCFCE7",

        warning: "#EA580C",
        warningLight: "#FFEDD5",

        danger: "#DC2626",
        dangerLight: "#FEE2E2",

        purple: "#7C3AED",
        purpleLight: "#F3E8FF",

        bg: "#F8FAFC",
        card: "#FFFFFF",

        text: "#0F172A",
        muted: "#64748B",
        border: "#E2E8F0",
      },
    },
  },
  plugins: [],
};

export default config;
