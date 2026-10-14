/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/context/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#1D4ED8",
          primary: "#1D4ED8",
          secondary: "#2563EB",
          hover: "#1E40AF",
          light: "#EFF6FF",
          dark: "#0F172A",
          accent: "#0284C7",
        },
        "brand-primary": "#1D4ED8",
        "brand-hover": "#1E40AF",
        "brand-light": "#EFF6FF",
        "brand-dark": "#0F172A",
        "brand-success": "#10B981",
        "brand-warning": "#F59E0B",
        "brand-danger": "#EF4444",
        gold: {
          DEFAULT: "#D4A843",
          light: "#F0C96A",
          dim: "#8B6B20",
        },
      },
    },
  },
  plugins: [],
};
