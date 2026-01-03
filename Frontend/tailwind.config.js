/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: '#111323',
        primary: {
          DEFAULT: '#21CCEE',
          light: '#A5F0FC',
          'super-light': '#ECFDFF',
        },
        success: '#4DDB62',
        warning: '#FFBF66',
        error: '#E64F4F',
      },
    },
  },
  darkMode: 'class',
  plugins: [],
}
