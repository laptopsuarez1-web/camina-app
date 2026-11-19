import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// "Avísame cuando salga" de la portada: guarda el WhatsApp o el correo en la tabla avisame (migración 0127).
// Responde ok solo si el contacto quedó guardado (o ya estaba). Si la tabla todavía no existe o falla la base,
// responde error y la portada lo dice tal cual, con el contacto de Camina como alternativa.
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const CIUDADES = ['Tarija', 'Santa Cruz', 'La Paz', 'Cochabamba', 'Otra'];

// Número de WhatsApp: se aceptan espacios y guiones; un número boliviano de 8 cifras recibe el +591.
function telefono(v: string) {
  const d = v.replace(/[\s\-().]/g, '');
  if (/^[67]\d{7}$/.test(d)) return `+591${d}`;
  if (/^\+?\d{8,15}$/.test(d)) return d.startsWith('+') ? d : `+${d}`;
  return null;
}

export async function POST(req: Request) {
  let body: { canal?: unknown; contacto?: unknown; ciudad?: unknown; web?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'datos' }, { status: 400 });
  }
  // Campo trampa para bots: una persona nunca lo llena.
  if (typeof body.web === 'string' && body.web.trim()) return NextResponse.json({ ok: true });

  const canal = body.canal === 'email' ? 'email' : body.canal === 'whatsapp' ? 'whatsapp' : null;
  const raw = typeof body.contacto === 'string' ? body.contacto.trim() : '';
  let contacto: string | null = null;
  if (canal === 'email') contacto = EMAIL.test(raw) && raw.length <= 254 ? raw.toLowerCase() : null;
  if (canal === 'whatsapp') contacto = telefono(raw);
  if (!canal || !contacto) return NextResponse.json({ error: 'contacto' }, { status: 400 });
  const ciudad = typeof body.ciudad === 'string' && CIUDADES.includes(body.ciudad) ? body.ciudad : null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.json({ error: 'config' }, { status: 500 });

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { error } = await supabase.from('avisame').insert({ canal, contacto, ciudad });
  // 23505: ya estaba anotado. Para la persona es lo mismo: le vamos a avisar.
  if (error && error.code !== '23505') return NextResponse.json({ error: 'base' }, { status: 502 });
  return NextResponse.json({ ok: true });
}
