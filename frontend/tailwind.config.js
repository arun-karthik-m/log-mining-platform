/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        surface: {
          0: '#000000',
          1: '#0a0a0a',
          2: '#111111',
          3: '#1a1a1a',
          4: '#222222',
          5: '#2a2a2a',
        },
        accent: {
          DEFAULT: '#00d4ff',
          50: '#f0fdff',
          100: '#ccf7fe',
          200: '#99edfd',
          300: '#55e0fc',
          400: '#00d4ff',
          500: '#00b4d8',
          600: '#0090b0',
          700: '#00738e',
          800: '#005c74',
          900: '#004d62',
        },
        violet: {
          DEFAULT: '#7c3aed',
          50: '#f5f3ff',
          400: '#a78bfa',
          500: '#7c3aed',
          600: '#6d28d9',
        },
        emerald: {
          DEFAULT: '#10b981',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
        },
        danger: {
          DEFAULT: '#ef4444',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
        },
        warning: {
          DEFAULT: '#f59e0b',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        },
        zinc: {
          50: '#fafafa',
          100: '#f4f4f5',
          200: '#e4e4e7',
          300: '#d4d4d8',
          400: '#a1a1aa',
          500: '#71717a',
          600: '#52525b',
          700: '#3f3f46',
          800: '#27272a',
          900: '#18181b',
          950: '#09090b',
        },
      },
      boxShadow: {
        'glow-sm': '0 0 15px -3px rgba(0, 212, 255, 0.15)',
        'glow': '0 0 30px -5px rgba(0, 212, 255, 0.2)',
        'glow-lg': '0 0 60px -10px rgba(0, 212, 255, 0.3)',
        'glow-violet': '0 0 30px -5px rgba(124, 58, 237, 0.2)',
        'glow-danger': '0 0 30px -5px rgba(239, 68, 68, 0.2)',
        'glow-emerald': '0 0 30px -5px rgba(16, 185, 129, 0.2)',
        'inner-glow': 'inset 0 1px 0 0 rgba(255,255,255,0.05)',
        'card': '0 0 0 1px rgba(255,255,255,0.05), 0 20px 50px -12px rgba(0,0,0,0.5)',
        'card-hover': '0 0 0 1px rgba(0,212,255,0.15), 0 25px 60px -12px rgba(0,0,0,0.6)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-mesh': 'radial-gradient(at 40% 20%, rgba(0, 212, 255, 0.08) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(124, 58, 237, 0.06) 0px, transparent 50%), radial-gradient(at 0% 50%, rgba(16, 185, 129, 0.04) 0px, transparent 50%)',
        'noise': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E\")",
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'fade-in-up': 'fadeInUp 0.5s ease-out',
        'fade-in-down': 'fadeInDown 0.4s ease-out',
        'slide-in-left': 'slideInLeft 0.4s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        'float': 'float 6s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'gradient-x': 'gradientX 3s ease infinite',
        'spin-slow': 'spin 8s linear infinite',
        'breathe': 'breathe 4s ease-in-out infinite',
        'counter': 'counter 1.5s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(0, 212, 255, 0.1)' },
          '50%': { boxShadow: '0 0 40px rgba(0, 212, 255, 0.3)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
        gradientX: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        breathe: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '1' },
        },
      },
      transitionTimingFunction: {
        'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
}
