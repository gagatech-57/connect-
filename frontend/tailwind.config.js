/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fdfbf7',
          100: '#f9f3db',
          200: '#f1e2b2',
          300: '#e5ca80',
          400: '#d7af4e',
          500: '#d4af37', // Luxury Metallic Gold
          600: '#bfa030', // Deep Gold Accent
          700: '#9d8125',
          800: '#7a621c',
          900: '#5a4614',
        },
        dark: {
          bg: '#09090b',        // Premium pitch black
          card: '#16161a',      // Premium charcoal panel
          border: '#27272a',    // Zinc border lines
          text: '#f4f4f5',      // Ice white text
          muted: '#a1a1aa',     // Muted zinc gray text
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.5)',
        'glass-light': '0 8px 32px 0 rgba(212, 175, 55, 0.05)',
        'gold-glow': '0 4px 20px 0 rgba(212, 175, 55, 0.15)',
      }
    },
  },
  plugins: [],
}
