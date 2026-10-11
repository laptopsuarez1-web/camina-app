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
        muted: { light: '#655483', dark: '#B9AED9' },
        text: { light: '#291C47', dark: '#F0EBFA' },
        aqua: '#4FC3A8',
        // Verde oscuro para fondos de botón con texto blanco: el aqua no llega a 4.5:1 de contraste.
        'aqua-deep': '#1F7A66',
        // Verde para TEXTO en modo claro (en oscuro: `dark:text-mint`). Sobre el vidrio, aqua-deep no llega a 4.5:1.
        'aqua-ink': '#1A6555',
        'aqua-light': { light: '#E3F5F0', dark: '#1C3A34' },
        purple: '#8B4FD1',
        // Morado para TEXTO: `text-purple-ink dark:text-purple-soft`.
        'purple-ink': '#8149C2',
        'purple-soft': '#C9ADF5',
        'purple-deep': '#5B31A3',
        'purple-light': { light: '#F1EBFA', dark: '#2E2247' },
        warn: '#F2985C',
        // Naranja para TEXTO: `text-warn-deep dark:text-warn-soft`.
        'warn-deep': '#9A4A13',
        'warn-soft': '#FFB27A',
        'warn-light': '#FDEEE2',
        // Rojo: texto (`text-danger-ink dark:text-danger-soft`) y relleno con texto blanco (`bg-danger-fill`).
        'danger-ink': '#C0262B',
        'danger-soft': '#FF8388',
        'danger-fill': '#CF3F44',
        'auth-bg': '#241748',
        'auth-bg-soft': { light: '#2F1E5C', dark: '#3A2668' },
        'auth-muted': '#C4B8E8',
        mint: '#7FEDC4',
        'mint-dark': '#12281F',
        // Texto e íconos sobre un chip mint.
        'mint-ink': '#156650',
        // Ámbar para texto sobre avisos de fondo ámbar claro.
        'gold-ink': '#8F6307',
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
