// Busca el Place ID de Google de cada local (nombre + dirección + coordenadas) y lo guarda en businesses.google_place_id.
// Necesita "Places API (New)" habilitada en el proyecto de Google de la clave. Uso:
//   GOOGLE_PLACES_KEY=... SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node supabase/scripts/fill-place-ids.mjs [--dry]
const { GOOGLE_PLACES_KEY: key, SUPABASE_URL: url, SUPABASE_SERVICE_KEY: svc } = process.env;
const dry = process.argv.includes('--dry');
if (!key || !url || !svc) throw new Error('Faltan GOOGLE_PLACES_KEY, SUPABASE_URL o SUPABASE_SERVICE_KEY');
const sb = (path, init = {}) => fetch(`${url}/rest/v1/${path}`, { ...init, headers: { apikey: svc, Authorization: `Bearer ${svc}`, 'Content-Type': 'application/json', ...init.headers } });
const rows = await (await sb('businesses?select=id,name,address,lat,lng&google_place_id=is.null&lat=not.is.null')).json();
for (const b of rows) {
  const body = { textQuery: [b.name, b.address, 'Tarija, Bolivia'].filter(Boolean).join(' '), maxResultCount: 1,
    locationBias: { circle: { center: { latitude: b.lat, longitude: b.lng }, radius: 150 } } };
  const r = await fetch('https://places.googleapis.com/v1/places:searchText', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress' }, body: JSON.stringify(body) });
  const j = await r.json();
  const p = j.places?.[0];
  console.log(b.name, '→', p ? `${p.id} (${p.displayName?.text}, ${p.formattedAddress})` : `sin resultado ${j.error?.message ?? ''}`);
  if (p && !dry) await sb(`businesses?id=eq.${b.id}`, { method: 'PATCH', body: JSON.stringify({ google_place_id: p.id }) });
}
