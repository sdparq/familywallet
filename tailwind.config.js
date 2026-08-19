/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0f1720',
        sand: '#f6f4ef',
        gold: '#c8973f',
      },
    },
  },
  plugins: [],
}
