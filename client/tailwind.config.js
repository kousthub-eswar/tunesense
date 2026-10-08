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
          main: '#0B0D13',
          elevated: '#121520',
          subtle: '#181C2A',
        },
        surface: {
          DEFAULT: '#191D2B',
          hover: '#22273A',
          border: 'rgba(255, 255, 255, 0.08)',
          'border-active': 'rgba(139, 92, 246, 0.4)',
        },
        content: {
          primary: '#F8FAFC',
          secondary: '#94A3B8',
          muted: '#64748B',
        },
        brand: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6', // Primary vibrant accent
          600: '#7c3aed',
          700: '#6d28d9',
          glow: 'rgba(139, 92, 246, 0.35)',
        },
        vibe: {
          cyan: '#06b6d4',
          emerald: '#10b981',
          amber: '#f59e0b',
          rose: '#f43f5e',
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
        glow: '0 0 20px -2px rgba(139, 92, 246, 0.3)',
      },
      spacing: {
        'safe-bottom': 'calc(env(safe-area-inset-bottom, 0px) + 72px)',
      },
    },
  },
  plugins: [],
};
