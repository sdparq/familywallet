/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Gris neutro para texto y bordes; el color se reserva para saldos
        line: '#e5e5e5',
      },
    },
  },
  plugins: [],
}
