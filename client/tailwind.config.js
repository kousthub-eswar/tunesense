/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    screens: {
      xs: '360px',
      sm: '480px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
    },
    extend: {
      colors: {
        bg: {
          main: '#09090D',
          elevated: '#13131B',
          subtle: '#1B1B27',
        },
        surface: {
          DEFAULT: '#13131B',
          secondary: '#1B1B27',
          hover: '#1F1F2C',
          border: '#272735',
          'border-active': 'rgba(150, 100, 255, 0.5)',
        },
        content: {
          primary: '#F7F5FF',
          secondary: '#A2A0B5',
          muted: '#6F6D82',
        },
        brand: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#B59AFF', // Highlight accent
          500: '#9664FF', // Primary accent
          600: '#844df0',
          700: '#7037dc',
        },
        vibe: {
          cyan: '#38bdf8',
          emerald: '#34d399',
          amber: '#fbbf24',
          rose: '#fb7185',
        },
      },
      fontFamily: {
        sans: [
          'Plus Jakarta Sans',
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      borderRadius: {
        card: '16px',
        button: '12px',
        input: '12px',
        artwork: '12px',
        player: '16px',
      },
      boxShadow: {
        card: '0 4px 20px -2px rgba(0, 0, 0, 0.5)',
        player: '0 -4px 24px -2px rgba(0, 0, 0, 0.65)',
        glow: 'none',
      },
      spacing: {
        'safe-bottom': 'calc(env(safe-area-inset-bottom, 0px) + 72px)',
      },
    },
  },
  plugins: [],
};
