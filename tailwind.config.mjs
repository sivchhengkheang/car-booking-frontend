/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        airbnb: {
          coral: "#FF385C",
          "coral-hover": "#E00B41",
        },
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
