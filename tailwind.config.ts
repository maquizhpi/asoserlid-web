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
        // 🎨 Paleta corporativa ASOSERLID
        primary: {
          50:  "#E6F8F9",
          100: "#D9F4F5",
          200: "#B4E9EC",
          300: "#8FDEE2",
          400: "#57CFD3",
          500: "#33C3C9", // Turquesa principal
          600: "#2AAFB4",
          700: "#218F93",
          800: "#1B7175",
          900: "#174F52",
        },
        secondary: {
          50:  "#F2E7F5",
          100: "#E5CFF0",
          200: "#CAA0E0",
          300: "#AE70D1",
          400: "#8940AF",
          500: "#652B71", // Morado oscuro
          600: "#55235F",
          700: "#451C4E",
          800: "#35153D",
          900: "#26102D",
        },
        accent: {
          50:  "#E8EFF6",
          100: "#D2E0ED",
          200: "#A6C1DB",
          300: "#7BA3CA",
          400: "#4F84B8",
          500: "#173C61", // Azul profundo
          600: "#12314F",
          700: "#0E263E",
          800: "#0A1C2D",
          900: "#07141F",
        },
        light: "#FFFFFF",  // Blanco
        dark: "#3A3A3A",   // Gris oscuro
      },

      // 🧱 Tipografía
      fontFamily: {
        sans: ["'Poppins'", "ui-sans-serif", "system-ui"],
      },

      // 🪄 Sombras suaves tipo “material”
      boxShadow: {
        soft: "0 2px 8px rgba(0,0,0,0.05)",
        card: "0 4px 14px rgba(23,60,97,0.1)",
      },
    },
  },
  plugins: [],
};

export default config;
