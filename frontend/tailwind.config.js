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
          50: '#fafafa',        // Porcelain premium white
          100: '#f4f4f5',        // Soft zinc white
          200: '#e4e4e7',
          300: '#d4d4d8',
          400: '#a1a1aa',
          500: '#18181b',        // Solid black-zinc accent
          600: '#09090b',        // Deep black
          700: '#27272a',
          800: '#3f3f46',
          900: '#52525b',
        },
        dark: {
          bg: '#09090b',        // Premium pitch black
          card: '#121215',      // Charcoal zinc panel
          border: '#1f1f23',    // Dark border
          text: '#fafafa',      // Ice white text
          muted: '#71717a',     // Zinc gray text
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.45)',
        'glass-light': '0 8px 32px 0 rgba(24, 24, 27, 0.03)',
        'brand-glow': '0 4px 20px 0 rgba(24, 24, 27, 0.1)',
      }
    },
  },
  plugins: [],
}
