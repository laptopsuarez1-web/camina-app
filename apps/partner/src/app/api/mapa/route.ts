import { NextResponse } from 'next/server';

// Convierte un link corto de Google Maps (el que da "Compartir" en el celular, maps.app.goo.gl/…)
// en coordenadas. El navegador no puede seguir esa redirección por CORS, así que la sigue el
// servidor. Solo se siguen saltos a dominios de Google, para no usarlo como proxy hacia otro lado.
const HOSTS_PERMITIDOS = /^(maps\.app\.goo\.gl|goo\.gl|g\.co|maps\.google\.[a-z.]+|(www\.)?google\.[a-z.]+)$/i;

function coordsDe(url: string): { lat: number; lng: number } | null {
  const t = decodeURIComponent(url);
  const m =
    t.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) ||
    t.match(/[?&](?:q|ll|query|center)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/) ||
    t.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (!m) return null;
  const lat = parseFloat(m[1]);
  const lng = parseFloat(m[2]);
  if (!isFinite(lat) || !isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

export async function GET(req: Request) {
  const link = new URL(req.url).searchParams.get('url')?.trim() ?? '';
  let actual: URL;
  try {
    actual = new URL(link);
  } catch {
    return NextResponse.json({ error: 'link' }, { status: 400 });
  }

  for (let salto = 0; salto < 5; salto++) {
    if (actual.protocol !== 'https:' || !HOSTS_PERMITIDOS.test(actual.hostname)) {
      return NextResponse.json({ error: 'link' }, { status: 400 });
    }
    const punto = coordsDe(actual.toString());
    if (punto) return NextResponse.json(punto);

    let res: Response;
    try {
      res = await fetch(actual, { redirect: 'manual', signal: AbortSignal.timeout(8000) });
    } catch {
      return NextResponse.json({ error: 'red' }, { status: 502 });
    }
    const destino = res.headers.get('location');
    if (!destino) break;
    actual = new URL(destino, actual);
  }
  return NextResponse.json({ error: 'sin-coordenadas' }, { status: 422 });
}
