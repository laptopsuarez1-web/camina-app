// Exporta la línea de tiempo de «¿Y si cada paso…?» a JSON para la banda sonora (cortes, palabras y letras de las leyendas).
// Uso: npx esbuild scripts/ysi_linea.ts --bundle --platform=node --outfile=/tmp/ysi_linea.js && node /tmp/ysi_linea.js > public/audio/ysi-linea.json
import { bordes, CIERRE, INTRO, MONTAJE, TARJETA, TOMAS } from '../src/ysiDatos';

const tomas = TOMAS.map((t, i) => ({
  desde: bordes[i],
  hasta: bordes[i + 1],
  leyenda: t.leyenda ?? null,
  palabras: (t.palabras ?? []).map((p) => ({ t: p.t, en: p.en ?? 0, efecto: p.efecto ?? null })),
  rafaga: t.rafaga ? { n: t.rafaga.length, cada: t.cada ?? 5 } : null,
}));
console.log(JSON.stringify({ fps: 30, intro: INTRO, montaje: MONTAJE, tarjeta: TARJETA, cierre: CIERRE, tomas }, null, 1));
