// Capturas de la app web con datos de ejemplo (ninguna llamada llega a la base real).
const { chromium } = require('playwright');
const OUT = __dirname + '/shots/';
const ME = '00000000-0000-4000-8000-000000000001';
const ppl = [['Luis Aramayo', 41900, 9], ['Mariana Paz', 31000, 4], ['Jorge Mendoza', 26000, 2], ['Carla Vargas', 21230, 0], ['Ana', 33200, 5], ['Paola Tejerina', 61220, 2], ['René Castillo', 55900, 0]];
const id = (i) => i === 4 ? ME : `00000000-0000-4000-8000-0000000001${String(i).padStart(2, '0')}`;
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const now = Math.floor(Date.now() / 1000);
const user = { id: ME, aud: 'authenticated', role: 'authenticated', email: 'ejemplo@camina.test', app_metadata: {}, user_metadata: {}, created_at: '2026-10-01T00:00:00Z' };
const token = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: ME, role: 'authenticated', exp: now + 86400, aud: 'authenticated' })}.x`;
const session = { access_token: token, token_type: 'bearer', expires_in: 86400, expires_at: now + 86400, refresh_token: 'r', user };
const profile = { dark_mode: process.env.SCHEME !== 'light', id: ME, full_name: 'Ana', photo_url: null, daily_goal: 5000, city: 'Tarija', zone: 'Centro', ranking_visible: true, onboarded: true, birth_date: '1995-01-01', terms_accepted_at: '2026-10-01T00:00:00Z', interests: [], bio: null, created_at: '2026-10-01T00:00:00Z' };
const today = new Date(); const day = (d) => { const x = new Date(today); x.setDate(x.getDate() - d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
const groups = [
  { id: 'g1', name: 'Caminantes de la zona', invite_code: 'ZONA123', background: 'violeta', photo_url: null, banner_url: null, challenge_target: 200000, created_by: ME, group_members: [0, 1, 2, 3, 4].map((i) => ({ user_id: id(i) })) },
  { id: 'g2', name: 'Familia Suárez', invite_code: 'SUAREZ7', background: 'menta', photo_url: null, banner_url: null, challenge_target: null, created_by: ME, group_members: [3, 4, 6].map((i) => ({ user_id: id(i) })) },
];
const retos = [
  { id: 'r1', title: 'Invita a 5 amigos', description: 'Suma 5 amigos nuevos a Camina y gana Puntos extra.', kind: 'referrals', target: 5, reward_points: 10 },
  { id: 'r2', title: '5.000 pasos x 10 días', description: 'Camina 5.000 pasos por día durante 10 días seguidos.', kind: 'steps_streak', target: 10, reward_points: 10 },
  { id: 'r3', title: '5 metas esta semana', description: 'Cumple tu meta diaria 5 veces en la misma semana.', kind: 'weekly_goals', target: 5, reward_points: 5 },
];
const biz = [['Bloom', 'Belleza', -21.5335, -64.7330, 25, 'https://lcqqzufpkbdfitgtdjjk.supabase.co/storage/v1/object/public/business-logos/a3f1c9b0-0000-4000-8000-000000000001/logo.jpeg', 'paso_adelante', 3, 'https://lcqqzufpkbdfitgtdjjk.supabase.co/storage/v1/object/public/business-logos/a3f1c9b0-0000-4000-8000-000000000001/cover.jpeg'], ['Coco Barber', 'Barbería', -21.5372, -64.7262, 25, 'https://caminaapp.com/web/logos/coco-barber.jpg', 'primer_paso', 2, 'https://lcqqzufpkbdfitgtdjjk.supabase.co/storage/v1/object/public/business-logos/3972b304-511e-4b36-b61f-573b76a971b7/cover.jpeg'], ["Fripap's", 'Gastronomía', -21.5390, -64.7318, 25, 'https://lcqqzufpkbdfitgtdjjk.supabase.co/storage/v1/object/public/business-logos/23e8f136-13ec-412f-9a9d-26488c28cd19/logo.jpeg', 'primer_paso', 2, 'https://lcqqzufpkbdfitgtdjjk.supabase.co/storage/v1/object/public/business-logos/23e8f136-13ec-412f-9a9d-26488c28cd19/cover.jpeg']]
  .map((b, i) => ({ id: 'b' + i, name: b[0], category: b[1], lat: b[2], lng: b[3], logo_url: b[5], cover_url: b[8], plan: b[6], nben: b[7], approved: true, city: 'Tarija', address: i === 2 ? 'Calle Virginio Lema casi Suipacha' : 'Centro', description: i === 2 ? 'Salchipapas, tablas y más.' : null, cost: b[4] }));
const endOfMonth = (() => { const d = new Date(today.getFullYear(), today.getMonth() + 1, 0); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();
const firstOfMonth = endOfMonth.slice(0, 8) + '01';
const ruta = { month: firstOfMonth, ends_on: endOfMonth, joined: process.env.RUTA !== 'no', swaps_left: 1, completed_at: null, ticket_no: null, prev_completed: false, double_day: null, eligible_count: 4,
  locales: biz.map((b) => ({ name: b.name, logo_url: null, lat: b.lat, lng: b.lng })),
  stops: process.env.RUTA === 'no' ? [] : biz.slice(0, 3).map((b, i) => ({ business_id: b.id, name: b.name, category: b.category, logo_url: null, lat: b.lat, lng: b.lng, address: b.address, visit: i === 0 ? 'confirmed' : null })) };
const rpc = {
  promotion_counts: [{ promotion_id: 'pd2', participants: 140 }, { promotion_id: 'pr2', participants: 46 }, { promotion_id: 'pr3', participants: 128 }], promotion_ticket_counts: [{ promotion_id: 'pr2', taken: 31 }, { promotion_id: 'pd2', taken: 62 }],
  route_state: ruta, route_participation: { participants: 9, completed: 0 },
  global_weekly_ranking: ppl.map((p, i) => ({ user_id: id(i), full_name: p[0], photo_url: null, total_steps: p[1] })),
  community_weekly_average: 41200,
  my_weekly_rank: [{ rank_position: 5, total_steps: 74310 }],
  my_friends: [0, 2, 5].map((i) => ({ user_id: id(i), full_name: ppl[i][0], photo_url: null, relation: 'friends', bio: null, week_steps: ppl[i][1], streak: ppl[i][2] })),
  friend_requests_incoming: [{ user_id: id(6), full_name: ppl[6][0], photo_url: null }],
  friends_weekly_ranking: [0, 2, 4, 5].map((i) => ({ user_id: id(i), full_name: ppl[i][0], photo_url: null, total_steps: ppl[i][1], streak: ppl[i][2], is_me: i === 4 })),
  pending_group_invites: [],
  streak_days: [],
  reto_progress: [{ reto_id: 'r1', met: 0, claimable: false, claimed_now: false }, { reto_id: 'r2', met: 7, claimable: false, claimed_now: false }, { reto_id: 'r3', met: 2, claimable: false, claimed_now: false }],
  user_points_balance: Number(process.env.BAL || 85), register_device: 'ok',
  group_members_steps: ppl.map((p, i) => ({ user_id: id(i), day: day(0), steps: p[1] })),
  route_state: null, my_camina_card: null, challenge_progress: [],
};
const tables = {
  promotions: (() => {
    const d = (n) => new Date(Date.now() + n * 864e5).toISOString();
    const base = { winners_count: 3, req_steps: null, req_days: null, goal_mode: null, goal_steps: null, goal_days: null, bg_image_url: null, bg_logo: true, cta_url: null, photos: [], place_name: null, place_address: null, place_url: null, ticket_price: null, ticket_url: null, ticket_points: null, ticket_quota: null, status: 'approved' };
    if (process.env.DISCO) return [
      { ...base, id: 'pd1', kind: 'publicidad', title: 'Viernes Neón: entrada libre hasta las 00:00', description: 'Canjea tu entrada con Puntos en Camina.', prize: null, starts_at: d(-1), ends_at: d(10), bg_color: 'noche', cta_url: 'https://instagram.com/', business: { name: 'Tu disco', logo_url: null, category: 'Discoteca' } },
      { ...base, id: 'pd2', kind: 'evento', title: 'Viernes Neón', description: 'La fiesta de los viernes. Entrada libre hasta las 00:00 con Puntos de Camina; después, entrada general. Solo mayores de 18.', prize: 'VIP para 4', winners_count: 1, starts_at: (() => { const x = new Date(Date.now() + 2 * 864e5); x.setUTCHours(3, 0, 0, 0); return x.toISOString(); })(), ends_at: (() => { const x = new Date(Date.now() + 2 * 864e5); x.setUTCHours(9, 0, 0, 0); return x.toISOString(); })(), bg_color: 'coral', place_name: 'Tu disco', place_address: 'Centro, Tarija', ticket_points: 15, ticket_quota: 100, ticket_price: 'Bs 30', ticket_url: 'https://wa.me/59162714286', business: { name: 'Tu disco', logo_url: null, category: 'Discoteca' } },
    ];
    return [
      { ...base, id: 'pr1', kind: 'publicidad', title: 'Martes de 2x1 en salchipapas', description: 'Solo en Fripap\'s, de 17:00 a 20:00.', prize: null, starts_at: d(-2), ends_at: d(20), bg_color: 'coral', cta_url: 'https://instagram.com/fripaps', business: { name: "Fripap's", logo_url: 'https://caminaapp.com/web/locales/fripaps-logo.jpg', category: 'Gastronomía' } },
      { ...base, id: 'pr2', kind: 'evento', title: 'Caminata nocturna por el centro', description: 'Salimos de la plaza principal, 5 km a paso tranqui y sorteo al llegar.', prize: 'Kit de belleza Bloom', starts_at: (() => { const x = new Date(Date.now() + 7 * 864e5); x.setUTCHours(0, 0, 0, 0); return x.toISOString(); })(), ends_at: (() => { const x = new Date(Date.now() + 7 * 864e5); x.setUTCHours(3, 0, 0, 0); return x.toISOString(); })(), bg_color: 'violeta', photos: ['https://caminaapp.com/web/locales/bloom-cover.jpg'], place_name: 'Plaza Luis de Fuentes', place_address: 'Centro, Tarija', ticket_points: 10, ticket_quota: 80, business: { name: 'Bloom', logo_url: 'https://caminaapp.com/web/locales/bloom-logo.jpg', category: 'Belleza' } },
      { ...base, id: 'pr3', kind: 'desafio', title: 'Reto Fripap\'s: 50.000 pasos', description: 'Junta 50.000 pasos en 7 días y entra al sorteo.', prize: 'Combo para dos', starts_at: d(-1), ends_at: d(6), bg_color: 'aurora', goal_mode: 'total', goal_steps: 50000, goal_days: 7, business: { name: "Fripap's", logo_url: 'https://caminaapp.com/web/locales/fripaps-logo.jpg', category: 'Gastronomía' } },
    ];
  })(),
  promotion_entries: [], promotion_winners: [], promotion_tickets: [],
  profiles: [profile], groups, retos, businesses: biz, group_members: [0, 1, 2, 3, 4].map((i) => ({ group_id: 'g1', user_id: id(i), joined_at: '2026-11-01T00:00:00Z' })), group_notes: [], group_weekly_results: [], group_challenges: [], user_blocks: [],
  notifications_outbox: [
    ['Vas #5 en el ranking global', 'Te faltan 1.394 pasos para subir al #4. Una caminata y lo pasas.', 'weekly_rank', 1],
    ['Jorge te mandó un mensaje', 'En Los del Centro: mañana caminata 7 am en el parque', 'group_note', 3],
    ['Tus Puntos ya alcanzan 🎁', 'Tienes 1.066 Puntos: te alcanza para 7 premios. Date un gusto este fin de semana.', 'nearby', 20],
    ['Tu Ruta de noviembre sigue abierta', 'Te faltan 2 locales y quedan 15 días. Complétala y entra al sorteo.', 'route_reminder', 60],
    ['¡No cortes tu racha! 🔥', 'Llevas 5 días seguidos cumpliendo tu meta. Una caminata más y la mantienes.', 'streak_reminder', 200],
    ['Tus Puntos te están esperando 🎁', 'Tienes 12 Puntos que se vencen en los próximos 5 días.', 'points_expiring', 1500],
    ['Terminó la semana en Los del Centro 🏁', 'Quedaste #2 con 41.300 pasos. Ganó Daniela.', 'group_week', 2900],
  ].map((n, i) => ({ id: 'n' + i, user_id: ME, title: n[0], body: n[1], data: { type: n[2] }, created_at: new Date(Date.now() - n[3] * 60000).toISOString(), sent_at: new Date().toISOString() })),
  redemptions: [['confirmed', 0, 1]].map((r, i) => ({ id: 'rd' + i, user_id: ME, status: r[0], cost_points: biz[r[1]].cost, code: 'ABC12' + i, created_at: new Date(Date.now() - r[2] * 86400000).toISOString(), confirmed_at: null, expires_at: new Date(Date.now() - r[2] * 86400000 + 900000).toISOString(), benefit_id: 'be' + r[1] + '0', business_id: biz[r[1]].id, benefit: { id: 'be' + r[1] + '0', name: ['Clase de prueba', 'Manicura', 'Café + medialuna', 'Combo burger'][r[1]], cost_points: biz[r[1]].cost }, business: biz[r[1]] })), qa_accounts: process.env.QA ? [{ user_id: ME }] : [],
  benefits: biz.flatMap((b, i) => Array.from({ length: b.nben }, (_, k) => k).map((k) => ({ id: `be${i}${k}`, business_id: b.id, name: [['Manicura semipermanente', 'Pedicura tradicional', 'Tratamiento capilar'], ['Corte de cabello', 'Lavado de cabello'], ['Salchipapa clásica', 'Combo para dos']][i][k], type: k === 0 && i < 2 ? 'descuento' : 'gratis', cost_points: b.cost * (k ? 2 * k : 1), active: true, valid_days_mask: 127, discount_detail: i === 1 ? '20bs de descuento' : null, discount_percent: i === 0 ? 20 : null, with_purchase: i === 1 && k === 1 ? 'con tu corte de cabello' : null, new_customers_only: i === 1 && k === 0, daily_quota: null, image_url: [['https://caminaapp.com/web/locales/bloom-b1.jpg', 'https://caminaapp.com/web/locales/bloom-b2.jpg', 'https://caminaapp.com/web/locales/bloom-b1.jpg'], ['https://caminaapp.com/web/locales/coco-b1.jpg', 'https://caminaapp.com/web/locales/coco-cover.jpg'], ['https://caminaapp.com/web/locales/fripaps-b1.jpg', 'https://caminaapp.com/web/locales/fripaps-cover.jpg']][i][k], dine_in_only: false, valid_from: null, valid_to: null, business: b, ...(i === 2 && k === 1 ? { type: 'descuento', name: 'Combo Camina', combo_items: 'Salchipapa clásica + gaseosa personal', combo_price_bs: 25, combo_regular_bs: 32, discount_detail: 'Combo a Bs 25' } : {}) }))),
  public_profiles: ppl.map((p, i) => ({ id: id(i), full_name: p[0], photo_url: null })),
  steps_daily: [[0, 6230], [1, 7100], [2, 5400], [3, 8800], [4, 6000]].map(([d, st]) => ({ user_id: ME, day: day(d), steps: st, goal: 5000 })),
  points_ledger: [[0, 6, 'steps']].map(([d, a, r], i) => ({ id: 'pl' + i, user_id: ME, amount: a, reason: r, note: null, ref_day: day(d), earned_at: new Date(Date.now() - d * 86400000 - 3600000).toISOString(), expires_at: new Date(Date.now() + 80 * 86400000).toISOString() })),
};
const unknown = new Set();
