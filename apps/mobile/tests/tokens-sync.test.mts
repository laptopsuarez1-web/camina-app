// theme/tokens.ts y tailwind.config.js: los mismos colores viven en dos archivos y tienen que coincidir
// (si uno cambia y el otro no, el texto pasa a tener un color en las clases y otro en los íconos y bordes).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { colors } from '../src/theme/tokens.ts';

const require = createRequire(import.meta.url);
const tw = require('../tailwind.config.js').theme.extend.colors as Record<string, string | { light: string; dark: string }>;

const norm = (s: string) => s.toUpperCase();

// Clase de Tailwind -> clave en tokens.ts (la misma con camelCase). Los colores con variante clara/oscura viven en
// colors.light / colors.dark; los demás son planos.
const THEMED: Record<string, 'bg' | 'card' | 'line' | 'muted' | 'text' | 'aquaLight' | 'purpleLight'> = {
  bg: 'bg', card: 'card', line: 'line', muted: 'muted', text: 'text', 'aqua-light': 'aquaLight', 'purple-light': 'purpleLight',
};
const FLAT: Record<string, keyof typeof colors> = {
  aqua: 'aqua', 'aqua-deep': 'aquaDeep', 'aqua-ink': 'aquaInk', purple: 'purple', 'purple-ink': 'purpleInk', 'purple-soft': 'purpleSoft',
  'purple-deep': 'purpleDeep', warn: 'warn', 'warn-deep': 'warnDeep', 'warn-soft': 'warnSoft', 'warn-light': 'warnLight',
  'danger-ink': 'dangerInk', 'danger-soft': 'dangerSoft', 'danger-fill': 'dangerFill', 'auth-bg': 'authBg', 'auth-muted': 'authMuted',
  mint: 'mint', 'mint-dark': 'mintDark', 'mint-ink': 'mintInk', 'gold-ink': 'goldInk',
};

test('colores con variante clara y oscura: Tailwind y tokens.ts dicen lo mismo', () => {
  for (const [cls, key] of Object.entries(THEMED)) {
    const v = tw[cls] as { light: string; dark: string };
    assert.ok(v && typeof v === 'object', `falta ${cls} en tailwind.config.js`);
    assert.equal(norm(v.light), norm(colors.light[key]), `${cls} claro`);
    assert.equal(norm(v.dark), norm(colors.dark[key]), `${cls} oscuro`);
  }
});

test('colores planos: Tailwind y tokens.ts dicen lo mismo', () => {
  for (const [cls, key] of Object.entries(FLAT)) {
    const v = tw[cls];
    assert.equal(typeof v, 'string', `falta ${cls} en tailwind.config.js`);
    assert.equal(norm(v as string), norm(colors[key] as string), cls);
  }
});

test('todo color de Tailwind está cubierto por esta prueba (si agregás uno, sumalo arriba)', () => {
  const known = new Set([...Object.keys(THEMED), ...Object.keys(FLAT), 'auth-bg-soft']);
  const unknown = Object.keys(tw).filter((k) => !known.has(k));
  assert.deepEqual(unknown, []);
});

// Diferencias conocidas y aceptadas hoy (DS-20 de la auditoría del sistema de diseño). Si una se arregla, esta prueba avisa.
test('diferencias conocidas entre Tailwind y tokens.ts', () => {
  const soft = tw['auth-bg-soft'] as { light: string; dark: string };
  assert.equal(norm(soft.light), norm(colors.authBgSoft)); // el claro coincide
  assert.notEqual(norm(soft.dark), norm(colors.authBgSoft), 'si ahora coinciden, borrá esta excepción'); // el oscuro (#3A2668) solo existe en Tailwind
  assert.equal(norm(colors.aquaIcon), '#3B927E'); // aquaIcon es solo de tokens.ts: se usa en íconos, no en clases
  assert.ok(!('aqua-icon' in tw));
});

test('los colores de texto nuevos llegan a 4,5:1 sobre el blanco y sobre el lila del fondo (claro) o sobre la tarjeta oscura (oscuro)', () => {
  const lum = (hex: string) => {
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const ratio = (a: string, b: string) => {
    const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };
  const LIGHT_BG = ['#FFFFFF', colors.light.bg];
  const DARK_BG = [colors.dark.bg, colors.dark.card];
  for (const bg of LIGHT_BG) {
    for (const [name, fg] of [['muted', colors.light.muted], ['text', colors.light.text], ['aquaInk', colors.aquaInk], ['purpleInk', colors.purpleInk], ['warnDeep', colors.warnDeep], ['dangerInk', colors.dangerInk]] as const) {
      assert.ok(ratio(fg, bg) >= 4.5, `${name} ${fg} sobre ${bg}: ${ratio(fg, bg).toFixed(2)}`);
    }
  }
  for (const bg of DARK_BG) {
    for (const [name, fg] of [['muted', colors.dark.muted], ['text', colors.dark.text], ['mint', colors.mint], ['purpleSoft', colors.purpleSoft], ['warnSoft', colors.warnSoft], ['dangerSoft', colors.dangerSoft]] as const) {
      assert.ok(ratio(fg, bg) >= 4.5, `${name} ${fg} sobre ${bg}: ${ratio(fg, bg).toFixed(2)}`);
    }
  }
});

test('los rellenos con texto blanco llegan a 4,5:1 (botones verdes, morados y rojos)', () => {
  const lum = (hex: string) => {
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const onWhite = (bg: string) => 1.05 / (lum(bg) + 0.05);
  for (const [name, bg] of [['aquaDeep', colors.aquaDeep], ['purpleDeep', colors.purpleDeep], ['dangerFill', colors.dangerFill]] as const) {
    assert.ok(onWhite(bg) >= 4.5, `${name} ${bg} con texto blanco: ${onWhite(bg).toFixed(2)}`);
  }
});
