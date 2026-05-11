/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js}'],
  theme: {
    extend: {
      colors: {
        ink: '#1f2933',
        canvas: '#f7f7f2',
        panel: '#ffffff',
        primary: {
          50: '#ecfdf8',
          100: '#d1faee',
          500: '#14b8a6',
          600: '#0f766e',
          700: '#115e59'
        },
        accent: {
          100: '#fef3c7',
          500: '#f59e0b',
          700: '#b45309'
        }
      },
      fontFamily: {
        sans: ['HarmonyOS Sans SC', 'Microsoft YaHei', 'sans-serif']
      },
      boxShadow: {
        line: '0 1px 0 rgba(31, 41, 51, 0.08)',
        lift: '0 20px 45px rgba(31, 41, 51, 0.08)'
      }
    }
  },
  plugins: []
}

