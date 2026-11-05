// Configuración de la app. Toma todo de app.json y solo cambia algo si se pide una temporada al hacer la build:
//   CAMINA_TEMPORADA=navidad  →  ícono y pantalla de inicio con la corona navideña (assets/navidad/).
// Sin esa variable la app queda exactamente igual que con app.json.
module.exports = ({ config }) => {
  if (process.env.CAMINA_TEMPORADA !== 'navidad') return config;
  const plugins = (config.plugins ?? []).map((p) =>
    Array.isArray(p) && p[0] === 'expo-splash-screen' ? [p[0], { ...p[1], image: './assets/navidad/splash-icon.png' }] : p,
  );
  return {
    ...config,
    icon: './assets/navidad/icon.png',
    splash: { ...config.splash, image: './assets/navidad/splash-icon.png' },
    android: {
      ...config.android,
      adaptiveIcon: { ...config.android?.adaptiveIcon, foregroundImage: './assets/navidad/android-icon-foreground.png' },
    },
    plugins,
  };
};
