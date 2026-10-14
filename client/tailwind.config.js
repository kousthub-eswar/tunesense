/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
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
        // Core Design Tokens with Dynamic Mode Support
        fog: 'rgb(var(--fog-rgb) / <alpha-value>)',
        ink: {
          DEFAULT: 'rgb(var(--ink-rgb) / <alpha-value>)',
          primary: 'var(--ink-primary)',
          secondary: 'var(--ink-secondary)',
          muted: 'var(--ink-muted)',
          subtle: 'var(--ink-subtle)',
        },
        ultramarine: {
          DEFAULT: '#3D3BF3',
          hover: '#2D2BE3',
          subtle: 'rgba(61, 59, 243, 0.08)',
          glow: 'rgba(61, 59, 243, 0.25)',
        },
        tangerine: '#FF7A3D',
        mint: '#5ADBB5',
        orchid: '#C77DFF',

        // Mood Hues
        mood: {
          energetic: '#FF7A3D',
          happy: '#FFC93C',
          relaxed: '#5ADBB5',
          chill: '#6EC6FF',
          melancholic: '#6C7BD9',
          focus: '#3D3BF3',
          party: '#FF4D8D',
          sleepy: '#C77DFF',
          stressed: '#FF7A3D',
          calm: '#5ADBB5',
        },

        // Surface / Frosted Panels
        surface: {
          DEFAULT: 'rgb(var(--surface-rgb) / 0.70)',
          solid: 'var(--surface-solid)',
          hover: 'rgb(var(--surface-rgb) / 0.88)',
          border: 'var(--surface-border)',
          subtle: 'rgb(var(--surface-rgb) / 0.40)',
          secondary: 'rgb(var(--surface-rgb) / 0.80)',
        },

        // Legacy compatibility mappings pointing cleanly to new palette
        brand: {
          50: '#F0F1FE',
          100: '#E1E3FD',
          200: '#C3C6FC',
          300: '#999EFA',
          400: '#6468F6',
          500: '#3D3BF3', // ultramarine
          600: '#2D2BE3',
          700: '#1F1DC7',
        },
        content: {
          DEFAULT: 'rgb(var(--ink-rgb) / <alpha-value>)',
          primary: 'var(--ink-primary)',
          secondary: 'var(--ink-secondary)',
          muted: 'var(--ink-muted)',
        },
        bg: {
          main: 'rgb(var(--fog-rgb) / <alpha-value>)',
          elevated: 'rgb(var(--surface-rgb) / 0.75)',
          subtle: 'rgb(var(--surface-rgb) / 0.50)',
        },
        vibe: {
          cyan: '#6EC6FF',
          emerald: '#5ADBB5',
          amber: '#FFC93C',
          rose: '#FF4D8D',
        },
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'sans-serif'],
        body: ['"Figtree"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        sans: ['"Figtree"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      fontSize: {
        'scale-14': ['14px', { lineHeight: '1.55' }],
        'scale-16': ['16px', { lineHeight: '1.55' }],
        'scale-20': ['20px', { lineHeight: '1.4' }],
        'scale-28': ['28px', { lineHeight: '1.25', letterSpacing: '-0.02em' }],
        'scale-44': ['44px', { lineHeight: '1.15', letterSpacing: '-0.03em' }],
        'scale-72': ['72px', { lineHeight: '1.05', letterSpacing: '-0.04em' }],
      },
      borderRadius: {
        album: '20px',
        panel: '28px',
        chip: '10px',
        button: '9999px',
        full: '9999px',
      },
      boxShadow: {
        panel: '0 8px 30px rgba(27, 31, 59, 0.06)',
        pill: '0 12px 36px rgba(27, 31, 59, 0.12)',
        subtle: '0 4px 20px rgba(27, 31, 59, 0.05)',
      },
      maxWidth: {
        content: '1200px',
      },
    },
  },
  plugins: [],
};
