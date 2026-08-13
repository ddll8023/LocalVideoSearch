/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js}'],
  theme: {
    extend: {
      colors: {
        ink: '#e8eceb',
        canvas: '#0b0e10',
        panel: '#15191d',
        primary: {
          50: '#182326',
          100: '#223136',
          500: '#78959a',
          600: '#637f84',
          700: '#9db5b8'
        },
        accent: {
          100: '#2b281f',
          500: '#9c8a66',
          700: '#c4af80'
        },
        zinc: {
          50: '#111518',
          100: '#181d21',
          200: '#273036',
          300: '#3a454c',
          400: '#738087',
          500: '#9ca8ad',
          600: '#b8c2c5',
          700: '#d0d8da',
          800: '#e1e6e7',
          900: '#eef1f0',
          950: '#080a0b'
        },
        red: {
          50: '#271d20',
          100: '#3c292d',
          200: '#5d3d43',
          300: '#795258',
          500: '#a8757c',
          600: '#b78389',
          700: '#d3aeb1',
          800: '#e2c5c7',
          900: '#f0dedf'
        },
        amber: {
          50: '#28251d',
          100: '#3d3829',
          200: '#5f543b',
          300: '#7b6b48',
          500: '#a18c63',
          600: '#b29c70',
          700: '#d0bb8c',
          800: '#e0cfaa',
          900: '#eee5cf'
        },
        emerald: {
          50: '#182624',
          100: '#233835',
          200: '#38524d',
          300: '#527269',
          500: '#789b91',
          600: '#89aa9e',
          700: '#b4cec6',
          800: '#d0e1dc',
          900: '#e4efec'
        },
        green: {
          50: '#182624',
          100: '#233835',
          200: '#38524d',
          500: '#789b91',
          600: '#89aa9e',
          700: '#b4cec6',
          800: '#d0e1dc'
        },
        yellow: {
          50: '#28251d',
          100: '#3d3829',
          200: '#5f543b',
          500: '#a18c63',
          600: '#b29c70',
          700: '#d0bb8c',
          800: '#e0cfaa',
          900: '#eee5cf'
        }
      },
      fontFamily: {
        sans: ['Avenir Next', 'HarmonyOS Sans SC', 'Microsoft YaHei', 'sans-serif']
      },
      boxShadow: {
        line: '0 1px 0 rgba(232, 236, 235, 0.06)',
        lift: '0 22px 55px rgba(0, 0, 0, 0.32)',
        glow: '0 0 0 1px rgba(120, 149, 154, 0.16), 0 18px 45px rgba(0, 0, 0, 0.28)'
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translate3d(0, 18px, 0) scale(0.985)' },
          '100%': { opacity: '1', transform: 'translate3d(0, 0, 0) scale(1)' }
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        'scan-line': {
          '0%': { transform: 'translate3d(-120%, 0, 0)', opacity: '0' },
          '12%': { opacity: '0.8' },
          '48%': { opacity: '0.28' },
          '68%': { opacity: '0' },
          '100%': { transform: 'translate3d(220%, 0, 0)', opacity: '0' }
        },
        shimmer: {
          '0%': { backgroundPosition: '-220% 0' },
          '100%': { backgroundPosition: '220% 0' }
        },
        'ambient-drift': {
          '0%, 100%': { transform: 'translate3d(-2%, -1%, 0) scale(1)' },
          '50%': { transform: 'translate3d(2%, 1%, 0) scale(1.06)' }
        },
        'signal-pulse': {
          '0%, 100%': { opacity: '0.42', transform: 'scale(0.92)' },
          '50%': { opacity: '1', transform: 'scale(1)' }
        }
      },
      animation: {
        'fade-up': 'fade-up 0.65s cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-in': 'fade-in 0.35s ease-out both',
        'scan-line': 'scan-line 7s cubic-bezier(0.4, 0, 0.2, 1) infinite',
        shimmer: 'shimmer 2.2s linear infinite',
        'ambient-drift': 'ambient-drift 18s ease-in-out infinite',
        'signal-pulse': 'signal-pulse 2.4s ease-in-out infinite'
      }
    }
  },
  plugins: []
}
