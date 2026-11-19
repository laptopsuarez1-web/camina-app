import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// "Avísame cuando salga" de la portada: guarda el correo en la tabla avisame (migración 0127).
// Responde ok solo si el correo quedó guardado (o ya estaba). Si la tabla todavía no existe o falla la base,
// responde error y la portada lo dice tal cual, con el correo de contacto como alternativa.
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const CIUDADES = ['Tarija', 'Santa Cruz', 'La Paz', 'Cochabamba', 'Otra'];

export async function POST(req: Request) {
  let body: { email?: unknown; ciudad?: unknown; web?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'datos' }, { status: 400 });
  }
  // Campo trampa para bots: una persona nunca lo llena.
  if (typeof body.web === 'string' && body.web.trim()) return NextResponse.json({ ok: true });

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!EMAIL.test(email) || email.length > 254) return NextResponse.json({ error: 'email' }, { status: 400 });
  const ciudad = typeof body.ciudad === 'string' && CIUDADES.includes(body.ciudad) ? body.ciudad : null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.json({ error: 'config' }, { status: 500 });

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { error } = await supabase.from('avisame').insert({ email, ciudad });
  // 23505: el correo ya estaba anotado. Para la persona es lo mismo: le vamos a avisar.
  if (error && error.code !== '23505') return NextResponse.json({ error: 'base' }, { status: 502 });
  return NextResponse.json({ ok: true });
}
