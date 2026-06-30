/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'siem-dark':           '#ffffff',
        'siem-card':           '#f8f8f8',
        'siem-border':         '#e8e8e8',
        'siem-text':           '#1a1a1a',
        'siem-text-secondary': '#666666',
        'critical': '#ff1744',
        'high':     '#ff9100',
        'medium':   '#ffea00',
        'low':      '#00e676',
        'info':     '#2979ff',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0', transform: 'translateY(-6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)'    },
        },
        flashRow: {
          '0%':   { backgroundColor: 'rgba(41,121,255,0.20)' },
          '100%': { backgroundColor: 'transparent'           },
        },
        slideInRight: {
          '0%':   { opacity: '0', transform: 'translateX(12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)'    },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 4px rgba(41,121,255,0.3)' },
          '50%':      { boxShadow: '0 0 14px rgba(41,121,255,0.7)' },
        },
      },
      animation: {
        'fade-in':     'fadeIn 0.4s ease forwards',
        'flash-row':   'flashRow 2s ease forwards',
        'slide-right': 'slideInRight 0.3s ease forwards',
        'pulse-glow':  'pulseGlow 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}