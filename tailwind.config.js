/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#58cc02',
          dark: '#46a302',
        },
        secondary: '#1cb0f6',
        accent: '#ffc800',
        error: '#ff4b4b',
        'bg-light': '#ffffff',
        'bg-dark': '#131f24',
        'text-light': '#4b4b4b',
        'text-dark': '#ffffff',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
