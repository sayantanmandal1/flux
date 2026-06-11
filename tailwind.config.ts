import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/renderer/src/**/*.{ts,tsx}',
    './src/renderer/index.html'
  ],
  theme: {
    extend: {
      colors: {
        flux: {
          purple: '#7C3AED',
          indigo: '#4F46E5',
          dark: '#0a0a0a',
          surface: '#111111',
          border: 'rgba(255,255,255,0.08)',
          muted: 'rgba(255,255,255,0.4)',
        }
      },
      backgroundImage: {
        'flux-gradient': 'linear-gradient(135deg, #7C3AED 0%, #6366F1 50%, #4F46E5 100%)',
        'flux-gradient-h': 'linear-gradient(90deg, #7C3AED, #4F46E5)',
        'glass': 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
      },
      backdropBlur: {
        xs: '2px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Geist', 'Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-left': 'slideLeft 0.3s ease-out',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'progress-shimmer': 'progressShimmer 1.5s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(12px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideLeft: {
          '0%': { transform: 'translateX(12px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        progressShimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      boxShadow: {
        'glass': '0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)',
        'glass-lg': '0 8px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)',
        'flux-glow': '0 0 40px rgba(124,58,237,0.3)',
        'flux-glow-lg': '0 0 80px rgba(124,58,237,0.4)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      }
    }
  },
  plugins: []
}

export default config
