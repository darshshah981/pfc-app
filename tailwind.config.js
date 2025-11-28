/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Soft Modern palette - warm, approachable tones
        cream: {
          50: '#FDFBF7',
          100: '#FAF7F0',
        },
        sage: {
          50: '#E8F0E9',
          100: '#D1E1D3',
          200: '#B3CDB7',
          300: '#95B99B',
          400: '#7FA583',
          500: '#6B8F71',
          600: '#5A7A5F',
          700: '#4A654E',
          800: '#3A503E',
          900: '#2A3B2E',
        },
        warm: {
          50: '#F5F3EF',
          100: '#E8E4DD',
          200: '#D4CFC4',
          300: '#B8B0A2',
          400: '#9B9181',
          500: '#7D7366',
          600: '#635B50',
          700: '#4A443B',
          800: '#312D27',
          900: '#1A1A1A',
        },
        coral: {
          50: '#FDF2F1',
          100: '#FADBD8',
          500: '#D4726A',
          600: '#C45C54',
        },
        moss: {
          500: '#7BA05B',
          600: '#6A8C4D',
        },
      },
      fontFamily: {
        sans: ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.25rem',
      },
    },
  },
  plugins: [],
}
