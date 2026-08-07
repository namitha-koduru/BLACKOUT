/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Party-style dark theme palette used across Phases 3 & 6.
        mystery: {
          bg: '#0f0c29',
          bg2: '#302b63',
          bg3: '#24243e',
          gold: '#facc15',
          pink: '#ec4899',
          purple: '#a855f7',
          teal: '#2dd4bf',
        },
      },
      backgroundImage: {
        'party-gradient': 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
      },
      backdropBlur: {
        glass: '10px',
      },
    },
  },
  plugins: [],
};
