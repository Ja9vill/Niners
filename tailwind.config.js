/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        indigo: {
          400: '#e8c44a',
          500: '#d4af37',
          600: '#b8960c',
        },
      },
    },
  },
  plugins: [],
}
