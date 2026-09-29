/** @type {import('tailwindcss').Config} */
// Paleta y tokens portados 1:1 de las variables CSS del prototipo (camina-full.html :root / [data-theme="dark"]).
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: { light: '#F7F3FC', dark: '#16101F' },
        card: { light: '#FFFFFF', dark: '#221933' },
        line: { light: '#E1D2F5', dark: '#3A2C52' },
        muted: { light: '#7C6A9C', dark: '#9E8FC0' },
        text: { light: '#291C47', dark: '#F0EBFA' },
        aqua: '#4FC3A8',
        'aqua-light': { light: '#E3F5F0', dark: '#1C3A34' },
        purple: '#8B4FD1',
        'purple-light': { light: '#F1EBFA', dark: '#2E2247' },
        warn: '#F2985C',
        'warn-light': '#FDEEE2',
        'auth-bg': '#200a52',
        'auth-bg-soft': { light: '#301070', dark: '#3A2668' },
        'auth-muted': '#C4B8E8',
        mint: '#7FEDC4',
        'mint-dark': '#12281F',
      },
      borderRadius: {
        sm: '10px',
        md: '14px',
        lg: '20px',
        xl: '28px',
      },
    },
  },
  plugins: [],
};
