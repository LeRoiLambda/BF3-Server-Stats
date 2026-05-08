import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        accent: {
          400: "#22d3ee",
          500: "#06b6d4"
        }
      }
    }
  },
  plugins: []
};

export default config;
