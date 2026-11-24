// Lee una ubicación de Google Maps en cualquiera de sus formas: "-21.53, -64.73", un link largo (…!3d-21.53!4d-64.73…,
// …@-21.53,-64.73…, ?q=…, ?ll=…, geo:…), el código de Google (Plus Code) o grados (21°32'07.8"S 64°43'46.6"W).
// !3d/!4d va primero: es el pin exacto del lugar; @ es solo el centro de la vista del mapa.
export function parseUbicacion(text: string): { lat: number; lng: number } | null {
  const t = text.trim();
  const dms = parseGrados(t);
  if (dms) return dms;
  const plus = parsePlusCode(t);
  if (plus) return plus;
  const m =
    t.match(/^geo:(-?\d+\.\d+),(-?\d+\.\d+)/i) ||
    t.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) ||
    t.match(/@(-?\d+\.\d+),\s*(-?\d+\.\d+)/) ||
    t.match(/[?&](?:q|ll|query|center|destination|daddr)=(-?\d+\.\d+)(?:,|%2C|\+)\s*(-?\d+\.\d+)/i) ||
    t.match(/^(-?\d+\.\d+)\s*[,; ]\s*(-?\d+\.\d+)$/);
  if (!m) return null;
  const lat = parseFloat(m[1]);
  const lng = parseFloat(m[2]);
  if (!isFinite(lat) || !isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

// El link corto de "Compartir" (maps.app.goo.gl/…) no trae coordenadas: lo resuelve /api/mapa.
export const esLinkCorto = (text: string) => /^https?:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps)\//i.test(text.trim());

export async function resolverLinkMapa(text: string): Promise<{ lat: number; lng: number } | null> {
  const directo = parseUbicacion(text);
  if (directo) return directo;
  if (!/^https?:\/\//i.test(text.trim())) return null;
  try {
    const res = await fetch(`/api/mapa?url=${encodeURIComponent(text.trim())}`);
    if (res.ok) return (await res.json()) as { lat: number; lng: number };
  } catch {
    // se avisa en pantalla
  }
  return null;
}

// 21°32'07.8"S 64°43'46.6"W (así lo muestra Google Maps al mantener apretado un punto).
function parseGrados(t: string): { lat: number; lng: number } | null {
  const re = /(\d{1,3})\s*[°º]\s*(\d{1,2})\s*['′’]\s*(\d{1,2}(?:\.\d+)?)\s*["″”]?\s*([NSEWO])/gi;
  const partes = [...t.matchAll(re)];
  if (partes.length !== 2) return null;
  const v = partes.map((m) => {
    const n = Number(m[1]) + Number(m[2]) / 60 + Number(m[3]) / 3600;
    return /[SWO]/i.test(m[4]) ? -n : n;
  });
  const lat = /[NS]/i.test(partes[0][4]) ? v[0] : v[1];
  const lng = /[NS]/i.test(partes[0][4]) ? v[1] : v[0];
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
}

// Plus Code de Google (ej. 57CRF796+5V o F796+5V Tarija): completo o corto. El corto se completa con Tarija.
const OLC = '23456789CFGHJMPQRVWX';
const REF_TARIJA = { lat: -21.5355, lng: -64.7296 };
function parsePlusCode(t: string): { lat: number; lng: number } | null {
  const m = t.toUpperCase().match(/^([23456789CFGHJMPQRVWX]{2,8})\+([23456789CFGHJMPQRVWX]{0,3})(?:\s|,|$)/);
  if (!m) return null;
  const antes = m[1];
  const despues = m[2];
  if (antes.length % 2 === 1) return null;
  const decode = (code: string) => {
    let lat = -90;
    let lng = -180;
    let res = 20;
    for (let i = 0; i < code.length; i += 2) {
      lat += OLC.indexOf(code[i]) * res;
      lng += OLC.indexOf(code[i + 1]) * res;
      if (i + 2 < code.length) res /= 20;
    }
    return { lat: lat + res / 2, lng: lng + res / 2 };
  };
  const cuerpo = antes + despues;
  const pares = cuerpo.length - (cuerpo.length % 2);
  const completo = (c: string) => decode(c.slice(0, Math.min(10, c.length - (c.length % 2))));
  if (antes.length === 8) {
    const p = completo(cuerpo);
    return Math.abs(p.lat) <= 90 ? p : null;
  }
  if (antes.length > 8 || pares < 2) return null;
  // Corto: se prueba con los prefijos vecinos a Tarija y se elige el más cercano.
  const celda = (v: number, o: number) => Math.floor((v + o) / 1) ;
  let mejor: { lat: number; lng: number } | null = null;
  let dist = Infinity;
  for (const dl of [-1, 0, 1]) {
    for (const dg of [-1, 0, 1]) {
      const la = celda(REF_TARIJA.lat, 90) + dl;
      const lo = celda(REF_TARIJA.lng, 180) + dg;
      const pre = OLC[Math.floor(la / 20)] + OLC[Math.floor(lo / 20)] + OLC[la % 20] + OLC[lo % 20];
      const falta = 8 - antes.length;
      if (falta < 0 || falta > 4) return null;
      const p = decode((pre.slice(0, falta) + cuerpo).slice(0, 10));
      const d = Math.hypot(p.lat - REF_TARIJA.lat, p.lng - REF_TARIJA.lng);
      if (d < dist) {
        dist = d;
        mejor = p;
      }
    }
  }
  return mejor && dist < 5 ? mejor : null;
}
