/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class", // Enables class-based dark mode
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",      // ✅ Root-level pages folder
    "./src/**/*.{js,ts,jsx,tsx}",        // ✅ Your components & styles are inside src
    "./public/**/*.svg"                 // (optional) if using SVG components
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
