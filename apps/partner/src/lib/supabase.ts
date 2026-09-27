'use client';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY. Copiá .env.local.example a .env.local y completá con los datos de tu proyecto Supabase.'
  );
}

// Cliente sin genérico <Database> por la misma razón que en apps/mobile/src/lib/supabase.ts:
// la inferencia de tipos de esta versión de supabase-js contra un Database escrito a mano
// no resuelve bien. Se tipa a mano en cada pantalla con las interfaces de este archivo.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type BusinessPlan = 'primer_paso' | 'paso_firme' | 'paso_adelante';

export interface Business {
  id: string;
  owner_user_id: string | null;
  name: string;
  category: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  instagram: string | null;
  hours_text: string | null;
  logo_url: string | null;
  plan: BusinessPlan;
}

export interface Benefit {
  id: string;
  business_id: string;
  name: string;
  type: 'gratis' | 'descuento';
  discount_detail: string | null;
  cost_points: number;
  daily_quota: number;
  active: boolean;
}

export interface Redemption {
  id: string;
  code: string;
  status: 'pending' | 'confirmed' | 'expired' | 'cancelled';
  created_at: string;
  confirmed_at: string | null;
}
