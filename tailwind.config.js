/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        parchment: {
          DEFAULT: '#F6F0E4',
          strong: '#FFFBF2',
          deep: '#EDE4D3',
        },
        ink: {
          DEFAULT: '#211A12',
          soft: '#4A3D2D',
        },
        muted: '#8A7E6D',
        sand: '#D9CEBB',
        gold: {
          DEFAULT: '#C79634',
          light: '#E8C26B',
          deep: '#7C5A1D',
          pale: '#F2DCA4',
        },
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        serif: ['Fraunces', 'Georgia', 'serif'],
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Inter',
          'ui-sans-serif',
          'system-ui',
          'sans-serif',
        ],
      },
      boxShadow: {
        glass:
          '0 1px 0 0 rgba(255,255,255,0.55) inset, 0 24px 70px -28px rgba(33,26,18,0.55)',
        'glass-dark':
          '0 1px 0 0 rgba(255,255,255,0.08) inset, 0 24px 70px -28px rgba(0,0,0,0.7)',
        lift: '0 2px 6px rgba(33,26,18,0.08), 0 18px 40px -20px rgba(33,26,18,0.35)',
        gold:
          '0 1px 0 0 rgba(255,255,255,0.35) inset, 0 10px 24px -10px rgba(124,90,29,0.65)',
      },
      keyframes: {
        'oz-pulse': {
          '0%': { transform: 'scale(1)', opacity: '0.65' },
          '70%': { transform: 'scale(2.1)', opacity: '0' },
          '100%': { transform: 'scale(2.1)', opacity: '0' },
        },
        'oz-float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        'oz-loader': {
          '0%': { transform: 'translateX(-110%)' },
          '100%': { transform: 'translateX(310%)' },
        },
      },
      animation: {
        'oz-pulse': 'oz-pulse 2.6s ease-out infinite',
        'oz-float': 'oz-float 3.4s ease-in-out infinite',
        'oz-loader': 'oz-loader 1.15s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
