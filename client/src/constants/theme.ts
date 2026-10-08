export const DESIGN_TOKENS = {
  colors: {
    bg: {
      main: '#0B0D13',
      elevated: '#121520',
      subtle: '#181C2A',
    },
    surface: {
      default: '#191D2B',
      hover: '#22273A',
      border: 'rgba(255, 255, 255, 0.08)',
    },
    brand: {
      accent: '#8B5CF6', // Sonic Violet
      glow: 'rgba(139, 92, 246, 0.35)',
    },
    text: {
      primary: '#F8FAFC',
      secondary: '#94A3B8',
      muted: '#64748B',
    },
  },
  radius: {
    card: '16px',
    button: '12px',
    input: '12px',
    artwork: '12px',
    player: '16px',
  },
} as const;
