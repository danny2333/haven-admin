import type { Config } from "tailwindcss"

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        haven: "#e378ac",
        "haven-dark": "#c0547a",
      },
    },
  },
  plugins: [],
}
export default config
