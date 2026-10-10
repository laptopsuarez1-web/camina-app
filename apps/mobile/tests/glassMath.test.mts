// components/ui/glassMath.ts: cuentas del vidrio (0 = sólido, 1 = cristal; 0,65 por defecto) de tarjetas y barra.
// components/ui/backgrounds.ts: forma de las paletas de fondo (sin fijar colores concretos: el fondo se está eligiendo).
import test from 'node:test';
import assert from 'node:assert/strict';
import { glassOn, cardFill, blurWeb, barFill } from '../src/components/ui/glassMath.ts';
import { paletteFor } from '../src/components/ui/backgrounds.ts';

type Rgba = { r: number; g: number; b: number; a: number };
function parse(rgba: string): Rgba {
  const m = rgba.match(/^rgba\((\d+),(\d+),(\d+),([\d.]+)\)$/);
  assert.ok(m, `no es un rgba() válido: ${rgba}`);
  return { r: +m![1], g: +m![2], b: +m![3], a: +m![4] };
}
const STEPS = Array.from({ length: 101 }, (_, i) => i / 100);
const SOLID_DARK = '#2A2038';

test('glassOn: el vidrio se apaga hasta 0,04 inclusive y se enciende apenas pasa', () => {
  assert.equal(glassOn(0), false);
  assert.equal(glassOn(0.04), false);
  assert.equal(glassOn(0.041), true);
  assert.equal(glassOn(0.65), true);
  assert.equal(glassOn(1), true);
  assert.equal(glassOn(-1), false);
});

test('cardFill en Sólido (0): blanco pleno en claro y el color sólido en oscuro', () => {
  assert.deepEqual(cardFill(0, false, SOLID_DARK), ['rgba(255,255,255,1)', 'rgba(255,255,255,1)']);
  assert.deepEqual(cardFill(0, true, SOLID_DARK), [SOLID_DARK, SOLID_DARK]);
  assert.deepEqual(cardFill(0.04, false, SOLID_DARK), ['rgba(255,255,255,1)', 'rgba(255,255,255,1)']);
});

test('cardFill claro: valores exactos en el extremo Cristal (1) y en el valor por defecto (0,65)', () => {
  const [top1, bot1] = cardFill(1, false, SOLID_DARK);
  assert.equal(top1, 'rgba(255,255,255,0.220)'); // arriba nunca baja de 0,22
  assert.equal(bot1, 'rgba(167,139,250,0.100)'); // abajo: lila pleno y nunca baja de 0,10
  const [top65, bot65] = cardFill(0.65, false, SOLID_DARK);
  assert.equal(top65, 'rgba(255,255,255,0.480)');
  assert.equal(bot65, 'rgba(167,139,250,0.207)'); // (1 - 0,65) ^ 1,5
});

test('cardFill oscuro: valores exactos en Cristal (1) y por defecto (0,65)', () => {
  assert.deepEqual(cardFill(1, true, SOLID_DARK), ['rgba(255,255,255,0.080)', 'rgba(255,255,255,0.030)']);
  assert.deepEqual(cardFill(0.65, true, SOLID_DARK), ['rgba(255,255,255,0.122)', 'rgba(255,255,255,0.051)']);
});

test('cardFill: cuanto más cristal, más transparente (la opacidad nunca sube) en claro y oscuro', () => {
  for (const dark of [false, true]) {
    let prev: [number, number] | null = null;
    for (const a of STEPS.filter((x) => glassOn(x))) {
      const [top, bot] = cardFill(a, dark, SOLID_DARK).map((c) => parse(c).a) as [number, number];
      if (prev) {
        assert.ok(top <= prev[0] + 1e-9, `arriba sube en ${a} (${dark ? 'oscuro' : 'claro'}): ${prev[0]} -> ${top}`);
        assert.ok(bot <= prev[1] + 1e-9, `abajo sube en ${a} (${dark ? 'oscuro' : 'claro'}): ${prev[1]} -> ${bot}`);
      }
      prev = [top, bot];
    }
  }
});

test('cardFill: siempre rgba válido, canales 0-255 y opacidad 0-1, para todo el recorrido del deslizador', () => {
  for (const dark of [false, true]) {
    for (const a of STEPS) {
      for (const c of cardFill(a, dark, SOLID_DARK)) {
        if (!c.startsWith('rgba')) continue; // el sólido oscuro es un color hexadecimal
        const { r, g, b, a: alpha } = parse(c);
        for (const ch of [r, g, b]) assert.ok(ch >= 0 && ch <= 255, c);
        assert.ok(alpha >= 0 && alpha <= 1, c);
      }
    }
  }
});

test('cardFill claro: el tinte lila llega al máximo en 0,65 y no sigue subiendo (el canal verde no pasa de 139)', () => {
  const g = (a: number) => parse(cardFill(a, false, SOLID_DARK)[1]).g;
  assert.equal(g(0.65), 139);
  assert.equal(g(1), 139);
  assert.ok(g(0.3) > g(0.65));
});

test('cardFill acepta otro tinte (el de la paleta de fondo)', () => {
  const bot = cardFill(1, false, SOLID_DARK, [215, 205, 245])[1];
  assert.equal(bot, 'rgba(215,205,245,0.100)');
});

test('blurWeb: de blur(18px) saturate(160%) a blur(28px) saturate(200%)', () => {
  assert.equal(blurWeb(0), 'blur(18px) saturate(160%)');
  assert.equal(blurWeb(1), 'blur(28px) saturate(200%)');
  assert.equal(blurWeb(0.65), 'blur(25px) saturate(186%)');
});

test('barFill: sin vidrio es blanco (claro) o #221933 (oscuro) en cualquier plataforma', () => {
  for (const p of ['ios', 'android', 'web'] as const) {
    assert.equal(barFill(0, false, p), '#fff');
    assert.equal(barFill(0, true, p), '#221933');
    assert.equal(barFill(0.04, false, p), '#fff');
  }
});

test('barFill con vidrio: Android es la más opaca, iOS la más transparente (claro y oscuro, valor por defecto)', () => {
  for (const dark of [false, true]) {
    const alpha = (p: 'ios' | 'android' | 'web') => parse(barFill(0.65, dark, p)).a;
    assert.ok(alpha('android') > alpha('ios'), `${dark ? 'oscuro' : 'claro'}: android ${alpha('android')} <= ios ${alpha('ios')}`);
  }
});

test('barFill: valores exactos en Cristal (1)', () => {
  assert.equal(barFill(1, true, 'ios'), 'rgba(34,25,51,0.600)');
  assert.equal(barFill(1, true, 'android'), 'rgba(34,25,51,0.820)');
  assert.equal(barFill(1, true, 'web'), 'rgba(34,25,51,0.660)');
  // claro/iOS: canal = 255 - (255 - tinte) * 0,58 => (204, 188, 252) y opacidad 0,45
  assert.equal(barFill(1, false, 'ios'), 'rgba(204,188,252,0.450)');
  assert.equal(barFill(1, false, 'android'), 'rgba(204,188,252,0.800)');
  assert.equal(barFill(1, false, 'web'), 'rgba(204,188,252,0.260)');
});

test('barFill: la opacidad nunca sube al aumentar el cristal, en las tres plataformas', () => {
  for (const dark of [false, true]) {
    for (const p of ['ios', 'android', 'web'] as const) {
      let prev = Infinity;
      for (const a of STEPS.filter((x) => glassOn(x))) {
        const alpha = parse(barFill(a, dark, p)).a;
        assert.ok(alpha <= prev + 1e-9, `${p} ${dark ? 'oscuro' : 'claro'} sube en ${a}`);
        prev = alpha;
      }
    }
  }
});

test('paletas de fondo: base con 2 colores o más, luces dentro de la pantalla y colores válidos', () => {
  const hex = /^#[0-9A-Fa-f]{6}$/;
  for (const dark of [false, true]) {
    const p = paletteFor(dark);
    assert.ok(p.base.length >= 2);
    for (const c of p.base) assert.match(c, hex);
    if (p.end) {
      assert.ok(p.end.x >= 0 && p.end.x <= 1 && p.end.y >= 0 && p.end.y <= 1);
    }
    assert.ok(p.glows.length > 0);
    for (const g of p.glows) {
      assert.match(g.c, hex);
      for (const k of ['x', 'y', 'r', 'a'] as const) assert.ok(g[k] >= 0 && g[k] <= 1, `${k}=${g[k]}`);
      assert.ok(g.r > 0);
    }
  }
});

test('paletas de fondo: el tinte del vidrio está definido en modo claro (lo usa cardFill) y son canales RGB', () => {
  const light = paletteFor(false);
  assert.ok(light.tint);
  for (const ch of light.tint!) assert.ok(Number.isInteger(ch) && ch >= 0 && ch <= 255);
  assert.notDeepEqual(paletteFor(true).base, light.base);
});
