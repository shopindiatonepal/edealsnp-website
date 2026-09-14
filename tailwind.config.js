/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#FFFFFF",
        panel: "#F5F5F2",
        ink: "#17181B",
        "ink-soft": "#63666B",
        "ink-faint": "#A0A2A6",
        line: "#E7E7E3",
        moss: "#3D6B54",
        "moss-deep": "#2C4E3E",
        sand: "#D8BE93",
        clay: "#B24A38",
      },
      fontFamily: {
        sans: ["Plus Jakarta Sans", "system-ui", "sans-serif"],
      },
      borderRadius: {
        sm: "6px",
        md: "10px",
        lg: "16px",
      },
      maxWidth: {
        wrap: "1180px",
      },
    },
  },
  plugins: [],
};
