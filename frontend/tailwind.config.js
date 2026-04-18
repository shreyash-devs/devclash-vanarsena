/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#080808',
        surface: '#0f0f0f',
        'surface-flat': '#141414',
        border: '#1e1e1e',
        'text-primary': '#f0f0f0',
        'text-secondary': '#888888',
        accent: '#6366f1',
        mono: '#a78bfa',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
