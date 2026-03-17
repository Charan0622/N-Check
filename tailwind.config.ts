import type { Config } from "tailwindcss";

const config: Config = {
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
        nvidia: {
          50:  '#f0ffd6',
          100: '#d9ff99',
          200: '#b8e65c',
          300: '#9cd422',
          400: '#86c811',
          500: '#76b900',
          600: '#639c00',
          700: '#4d7a00',
          800: '#3a5c00',
          900: '#1e3000',
          950: '#0f1800',
        },
      },
    },
  },
  plugins: [],
};
export default config;
