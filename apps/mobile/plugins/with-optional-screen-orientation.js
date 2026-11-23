// Google Play: la app va siempre en vertical ("orientation": "portrait"), y eso hace que Android declare la pantalla
// vertical como requisito del dispositivo (android.hardware.screen.portrait), lo que la esconde de algunos equipos.
// Acá se declara como opcional: la app sigue en vertical, pero ningún dispositivo queda afuera por eso.
const { withAndroidManifest } = require('expo/config-plugins');

const FEATURES = ['android.hardware.screen.portrait', 'android.hardware.screen.landscape'];

module.exports = function withOptionalScreenOrientation(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    const list = (manifest['uses-feature'] = manifest['uses-feature'] ?? []);
    for (const name of FEATURES) {
      const found = list.find((f) => f.$?.['android:name'] === name);
      if (found) found.$['android:required'] = 'false';
      else list.push({ $: { 'android:name': name, 'android:required': 'false' } });
    }
    return cfg;
  });
};
