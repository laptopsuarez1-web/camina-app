// Exploración: abre la app de prueba y saca capturas de cada paso del recorrido (ninguna llamada llega a la base real).
const fs = require('fs'); const vm = require('vm');
const src = fs.readFileSync(__dirname + '/vhead.js', 'utf8') + '\nmodule.exports = { chromium, ME, user, session, rpc, tables, biz, day, ruta };';
const FIJA = Date.parse('2026-11-13T19:00:00Z'); class Fecha extends Date { constructor(...x) { if (x.length) super(...x); else super(FIJA); } static now() { return FIJA; } }
const m = { exports: {} }; vm.runInNewContext(src, { require, module: m, process, Buffer, console, __dirname, Date: Fecha, Math, Array, Number, String, JSON, Set });
const { chromium, ME, user, session, rpc, tables, biz, day, ruta } = m.exports; ruta.stops.forEach((s, i) => { s.logo_url = biz[i].logo_url; s.visit = null; }); ruta.locales.forEach((l, i) => { l.logo_url = biz[i].logo_url; }); rpc.route_state = ruta; rpc.my_route = ruta; rpc.route_prize = null; rpc.points_expiring_soon = 0;
rpc.user_badges = { featured: null, banner_url: null, routes: [{ month: '2026-10-01', completed_at: '2026-10-28T20:00:00Z' }], locals: [{ business_id: 'b2', name: "Fripap's", logo_url: biz[2].logo_url, category: 'Gastronomía', points: 22, level: 'fan' }, { business_id: 'b0', name: 'Bloom', logo_url: biz[0].logo_url, category: 'Belleza', points: 12, level: 'habitual' }, { business_id: 'b1', name: 'Coco Barber', logo_url: biz[1].logo_url, category: 'Barbería', points: 3, level: 'visitante' }] };
rpc.my_camina_card = { id: 'cc1', user_id: ME, stamps: 3, goal: 5, completed_at: null, expires_at: null, prize_benefit_id: null, redeemed_at: null, created_at: '2026-11-01T00:00:00Z' };
const OUT = __dirname + '/video/explore/'; fs.mkdirSync(OUT, { recursive: true });
const nowIso = () => new Date().toISOString();
const rdx = () => ({ id: 'rdx', user_id: ME, status: 'confirmed', cost_points: 25, code: '482100', created_at: nowIso(), confirmed_at: nowIso(), code_expires_at: new Date(Date.now() + 9e5).toISOString(), expires_at: new Date(Date.now() + 9e5).toISOString(), benefit_id: 'be20', business_id: 'b2', confirmed_via: 'local_code', new_place_bonus: null, loyalty_free: false, followup_extra: null });
rpc.redeem_with_local_code = { ok: true, redemption: rdx() }; rpc.answer_redemption_followup = null; rpc.my_email_verified = true; rpc.my_new_place_bonus = null;
module.exports = async function open() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 393, height: Number(process.env.VH || 852) }, deviceScaleFactor: Number(process.env.DSF || 2), colorScheme: 'dark', locale: 'es-BO', timezoneId: 'America/La_Paz', geolocation: { latitude: -21.5390, longitude: -64.7318 }, permissions: ['geolocation'] });
  await ctx.addInitScript(() => { try { localStorage.setItem('camina_profile_hint_seen', '1'); } catch {} });
  await ctx.addInitScript((d) => { try { localStorage.setItem('camina_steps_cache_v1', JSON.stringify({ day: d, steps: 6230 })); } catch {} }, day(0));
  await ctx.addInitScript((s) => { try { localStorage.setItem('sb-mock-auth-token', JSON.stringify(s)); } catch {} }, session);
  const unknown = new Set();
  await ctx.route('https://mock.supabase.co/**', async (route) => {
    const req = route.request(); const u = new URL(req.url()); const h = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'access-control-expose-headers': '*' };
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: h });
    const json = (body, status = 200) => route.fulfill({ status, headers: { ...h, 'content-type': 'application/json' }, body: JSON.stringify(body) });
    if (u.pathname.startsWith('/auth/v1/user')) return json(user);
    if (u.pathname.startsWith('/auth/v1/token')) return json(session);
    if (u.pathname.startsWith('/auth/')) return json({});
    const one = (req.headers()['accept'] || '').includes('vnd.pgrst.object');
    let mm = u.pathname.match(/\/rest\/v1\/rpc\/(.+)/);
    if (mm) { if (mm[1] === 'redeem_with_local_code' && !tables.redemptions.some((r) => r.id === 'rdx')) { const bn = tables.benefits.find((x) => x.id === 'be20'); tables.redemptions.push({ ...rdx(), benefit: bn, business: bn.business }); } if (!(mm[1] in rpc)) unknown.add('rpc ' + mm[1]); const v = mm[1] in rpc ? rpc[mm[1]] : []; return json(one && Array.isArray(v) ? (v[0] ?? null) : v); }
    mm = u.pathname.match(/\/rest\/v1\/(.+)/);
    if (mm) { if (!(mm[1] in tables)) unknown.add('tabla ' + mm[1]); let v = tables[mm[1]] ?? []; if (req.method() !== 'GET') return json(one ? (v[0] ?? null) : []); for (const [k, raw] of u.searchParams) { if (['select', 'order', 'limit', 'offset', 'on_conflict', 'columns'].includes(k)) continue; const x = /^(not\.)?(eq|neq|gte|lte|gt|lt|in|is)\.(.*)$/.exec(raw); if (!x) continue; const [, not, op, val] = x; const f = (row) => { const c = row[k]; if (c === undefined) return true; const sx = String(c); switch (op) { case 'eq': return sx === val; case 'neq': return sx !== val; case 'gte': return sx >= val; case 'lte': return sx <= val; case 'gt': return sx > val; case 'lt': return sx < val; case 'in': return val.replace(/^\(|\)$/g, '').split(',').map((z) => z.replace(/"/g, '')).includes(sx); case 'is': return val === 'null' ? c === null : true; } return true; }; v = v.filter((row) => (not ? !f(row) : f(row))); } return json(one ? (v[0] ?? null) : v); }
    return json({});
  });
  // El aviso rojo es del modo de desarrollo del navegador, no de la app: se oculta.
  await ctx.addInitScript(() => { const st = document.createElement('style'); st.textContent = '[data-testid*="logbox"],[data-testid*="toast"]{display:none!important}'; document.addEventListener('DOMContentLoaded', () => document.head.appendChild(st)); setInterval(() => { const w = document.createTreeWalker(document.body || document.documentElement, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { if (/cannot contain a nes|Invalid DOM|two children|Unexpected text/.test(n.textContent || '')) { let e = n.parentElement; for (let i = 0; i < 8 && e && e.parentElement; i++) { const r = e.getBoundingClientRect(); if (r.width > 250 && r.height < 120) { e.style.display = 'none'; break; } e = e.parentElement; } } } }, 150); });
  tables.promotions = tables.promotions.filter((p) => p.kind !== 'publicidad'); const orden = tables.public_profiles.map((p, i) => i).sort((a, b) => rpc.global_weekly_ranking[b].total_steps - rpc.global_weekly_ranking[a].total_steps); rpc.global_weekly_ranking = orden.map((i) => rpc.global_weekly_ranking[i]); const yo = rpc.global_weekly_ranking.findIndex((r) => r.user_id === ME); rpc.my_weekly_rank = [{ rank_position: yo + 1, total_steps: rpc.global_weekly_ranking[yo].total_steps }]; await ctx.addInitScript(() => { try { const nada = () => {}; Object.defineProperty(console, 'error', { get: () => nada, set: () => {}, configurable: false }); } catch (e) {} }); const page = await ctx.newPage(); const errs = []; if (process.env.FIJA) await page.clock.setFixedTime(new Date(FIJA)); page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
  return { browser, ctx, page, errs, unknown, OUT };
};
if (require.main === module) (async () => {
  const { browser, page, errs, unknown, OUT } = await module.exports();
  const s = (n) => page.screenshot({ path: OUT + n + '.jpg', type: 'jpeg', quality: 70 });
  const t0 = Date.now();
  await page.goto('http://localhost:8099/', { waitUntil: 'networkidle', timeout: 180000 }).catch((e) => errs.push('goto ' + e.message.slice(0, 80))); await page.waitForTimeout(3500); await s('01-inicio');
  console.log('carga', Date.now() - t0);
  const t1 = Date.now(); for (let i = 0; i < 10; i++) await page.screenshot({ type: 'jpeg', quality: 90 }); console.log('ms por captura', (Date.now() - t1) / 10);
  await page.getByText('Actividad', { exact: true }).last().click(); await page.waitForTimeout(2500); await s('02-actividad');
  await page.getByText('Canjes', { exact: true }).last().click(); await page.waitForTimeout(3000); await s('03-canjes');
  await page.mouse.move(196, 600); await page.mouse.wheel(0, 500); await page.waitForTimeout(1200); await s('04-canjes-abajo');
  await page.getByText("Fripap's", { exact: true }).first().click(); await page.waitForTimeout(3000); await s('05-ficha');
  await page.mouse.move(196, 600); await page.mouse.wheel(0, 420); await page.waitForTimeout(1200); await s('06-ficha-abajo');
  await page.getByRole('button', { name: /Canjear/ }).first().click().catch((e) => errs.push('canjear ' + e.message.slice(0, 120))); await page.waitForTimeout(2500); await s('07-codigo');
  await page.keyboard.type('48', { delay: 300 }); await page.waitForTimeout(400); await s('08-codigo-48');
  await page.keyboard.type('21', { delay: 300 }); await page.waitForTimeout(700); await s('09-canjeado'); await page.waitForTimeout(2500); await s('10-confirmado'); await page.waitForTimeout(2500); await s('11-confirmado2');
  console.log('botones:', await page.getByRole('button').allInnerTexts().then((a) => a.filter(Boolean).slice(-12).join(' | ')));
  console.log('sin datos:', [...unknown].join(', ') || 'nada'); console.log('errores:', errs.slice(0, 6));
  await browser.close();
})();
