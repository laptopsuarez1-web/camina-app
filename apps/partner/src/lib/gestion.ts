'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

// Módulo de Gestión: clientes, asistencia, caja y reportes. Las reglas y permisos viven en la base
// (migración 0128): la pantalla solo oculta lo que el servidor igual rechazaría.

export type Permission =
  | 'dashboard.view'
  | 'clients.view'
  | 'clients.edit'
  | 'clients.history'
  | 'clinical.view'
  | 'clinical.edit'
  | 'visits.create'
  | 'visits.void'
  | 'payments.create'
  | 'payments.view'
  | 'payments.void'
  | 'receipts.issue'
  | 'finance.view'
  | 'finance.adjust'
  | 'packages.sell'
  | 'agenda.view'
  | 'agenda.edit'
  | 'reports.view'
  | 'reports.export'
  | 'settings.manage'
  | 'staff.manage'
  | 'audit.view';

export const PERMISSION_GROUPS: { title: string; items: { key: Permission; label: string }[] }[] = [
  {
    title: 'Clientes',
    items: [
      { key: 'clients.view', label: 'Ver datos básicos' },
      { key: 'clients.edit', label: 'Crear y editar' },
      { key: 'clients.history', label: 'Ver historial completo' },
      { key: 'clinical.view', label: 'Leer notas clínicas' },
      { key: 'clinical.edit', label: 'Escribir notas clínicas' },
    ],
  },
  {
    title: 'Asistencia y agenda',
    items: [
      { key: 'visits.create', label: 'Registrar asistencias' },
      { key: 'visits.void', label: 'Anular asistencias' },
      { key: 'agenda.view', label: 'Ver agenda' },
      { key: 'agenda.edit', label: 'Agendar y cambiar citas' },
    ],
  },
  {
    title: 'Caja',
    items: [
      { key: 'payments.create', label: 'Registrar cobros' },
      { key: 'payments.view', label: 'Consultar pagos' },
      { key: 'payments.void', label: 'Anular pagos' },
      { key: 'receipts.issue', label: 'Emitir comprobantes' },
      { key: 'packages.sell', label: 'Vender paquetes' },
    ],
  },
  {
    title: 'Finanzas y estadísticas',
    items: [
      { key: 'dashboard.view', label: 'Panel con ingresos' },
      { key: 'finance.view', label: 'Saldos y deudas' },
      { key: 'finance.adjust', label: 'Descuentos y ajustes' },
      { key: 'reports.view', label: 'Ver reportes' },
      { key: 'reports.export', label: 'Exportar PDF y Excel' },
    ],
  },
  {
    title: 'Administración',
    items: [
      { key: 'settings.manage', label: 'Configuración, servicios y precios' },
      { key: 'staff.manage', label: 'Empleados y permisos' },
      { key: 'audit.view', label: 'Registro de auditoría' },
    ],
  },
];

export interface CustomField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select';
  options?: string[];
}

export interface GestionSettings {
  business_id: string;
  display_name: string | null;
  activity_type: string;
  client_singular: string;
  client_plural: string;
  session_singular: string;
  session_plural: string;
  currency: string;
  timezone: string;
  payment_methods: string[];
  custom_fields: CustomField[];
  clinical_enabled: boolean;
  receipt_footer: string | null;
}

export interface GestionAccess {
  member: boolean;
  owner?: boolean;
  role_name?: string;
  permissions?: Permission[];
  settings?: GestionSettings;
}

export interface Service {
  id: string;
  name: string;
  price: number;
  duration_min: number | null;
  sessions_included: number;
  active: boolean;
}

export type ClientStatus = 'activo' | 'inactivo' | 'suspendido';

export interface Client {
  id: string;
  business_id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  registered_at: string;
  service_id: string | null;
  status: ClientStatus;
  notes: string | null;
  custom: Record<string, string | number | null>;
  created_by_email: string | null;
  created_at: string;
}

export interface Visit {
  id: string;
  client_id: string;
  service_id: string | null;
  service_name: string | null;
  occurred_at: string;
  status: 'asistio' | 'falto' | 'cancelo';
  charge: number;
  list_price: number | null;
  package_id: string | null;
  notes: string | null;
  created_by_email: string | null;
  voided_at: string | null;
  void_reason: string | null;
}

export interface Payment {
  id: string;
  client_id: string;
  amount: number;
  method: string;
  paid_at: string;
  visit_id: string | null;
  package_id: string | null;
  concept: string | null;
  notes: string | null;
  receipt_number: number;
  created_by_email: string | null;
  voided_at: string | null;
  void_reason: string | null;
}

export interface Adjustment {
  id: string;
  client_id: string;
  kind: 'descuento' | 'cargo';
  amount: number;
  reason: string;
  created_by_email: string | null;
  created_at: string;
  voided_at: string | null;
}

export interface Pack {
  id: string;
  client_id: string;
  service_id: string | null;
  name: string;
  sessions_total: number;
  price: number;
  purchased_at: string;
  expires_on: string | null;
  created_by_email: string | null;
  voided_at: string | null;
}

export interface Appointment {
  id: string;
  client_id: string;
  service_id: string | null;
  starts_at: string;
  duration_min: number;
  status: 'programada' | 'atendida' | 'cancelada' | 'no_asistio';
  notes: string | null;
  created_by_email: string | null;
}

export interface ClientSummary {
  sessions_month: number;
  sessions_total: number;
  absences_total: number;
  paid_month: number;
  paid_total: number;
  charges_total: number;
  discounts_total: number;
  balance: number;
  last_payment: { amount: number; paid_at: string; method: string } | null;
  last_visit: string | null;
  next_appointment: { id: string; starts_at: string } | null;
  packages: { id: string; name: string; sessions_total: number; remaining: number; expires_on: string | null; price: number }[];
}

// ---------------------------------------------------------------- Acceso (con caché por negocio)

const cache = new Map<string, Promise<GestionAccess>>();
const listeners = new Set<() => void>();

export function invalidateGestionAccess() {
  cache.clear();
  listeners.forEach((l) => l());
}

function fetchAccess(businessId: string): Promise<GestionAccess> {
  let p = cache.get(businessId);
  if (!p) {
    p = Promise.resolve(supabase.rpc('gestion_my_access', { p_business: businessId })).then(({ data, error }) => {
      if (error || !data) {
        cache.delete(businessId);
        return { member: false } as GestionAccess;
      }
      return data as GestionAccess;
    });
    cache.set(businessId, p);
  }
  return p;
}

export function useGestionAccess(businessId: string | undefined) {
  const [access, setAccess] = useState<GestionAccess | null>(null);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const l = () => setVersion((v) => v + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  useEffect(() => {
    if (!businessId) return;
    let alive = true;
    fetchAccess(businessId).then((a) => alive && setAccess(a));
    return () => {
      alive = false;
    };
  }, [businessId, version]);
  const can = useCallback((p: Permission) => !!access?.permissions?.includes(p), [access]);
  return { access, can, loading: !!businessId && access === null };
}

// ---------------------------------------------------------------- Formatos

export function money(v: number | string | null | undefined, currency = 'Bs') {
  const n = Number(v ?? 0);
  const s = n.toLocaleString('es-BO', { minimumFractionDigits: n % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 });
  return `${currency} ${s}`;
}

export function fullName(c: Pick<Client, 'first_name' | 'last_name'> | null | undefined) {
  if (!c) return '—';
  return `${c.first_name} ${c.last_name}`.trim();
}

export function initials(c: Pick<Client, 'first_name' | 'last_name'>) {
  return ((c.first_name[0] ?? '') + (c.last_name[0] ?? '')).toUpperCase();
}

export function fmtDate(iso: string | null | undefined, tz?: string) {
  if (!iso) return '—';
  const d = iso.length === 10 ? new Date(iso + 'T12:00:00') : new Date(iso);
  return d.toLocaleDateString('es-BO', { day: 'numeric', month: 'short', year: 'numeric', timeZone: iso.length === 10 ? undefined : tz });
}

export function fmtDateTime(iso: string | null | undefined, tz?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-BO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: tz });
}

export function fmtTime(iso: string, tz?: string) {
  return new Date(iso).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', timeZone: tz });
}

// Fecha local (YYYY-MM-DD) en la zona del negocio.
export function localDay(d: Date = new Date(), tz = 'America/La_Paz') {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

// Valor para <input type="datetime-local"> con la hora actual del navegador.
export function nowLocalInput() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export function inputToIso(v: string) {
  return v ? new Date(v).toISOString() : null;
}

export function addDays(day: string, n: number) {
  const d = new Date(day + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// Inicio del día local (en la zona del negocio) como ISO UTC, para filtrar consultas.
export function dayStartIso(day: string, tz = 'America/La_Paz') {
  // Busca el desfase de la zona para ese día.
  const guess = new Date(day + 'T00:00:00Z');
  const asTz = new Date(guess.toLocaleString('en-US', { timeZone: tz }));
  const asUtc = new Date(guess.toLocaleString('en-US', { timeZone: 'UTC' }));
  return new Date(guess.getTime() + (asUtc.getTime() - asTz.getTime())).toISOString();
}

export const STATUS_LABEL: Record<ClientStatus, string> = { activo: 'Activo', inactivo: 'Inactivo', suspendido: 'Suspendido' };
export const VISIT_LABEL: Record<Visit['status'], string> = { asistio: 'Asistió', falto: 'Faltó', cancelo: 'Canceló' };
export const APPT_LABEL: Record<Appointment['status'], string> = {
  programada: 'Programada',
  atendida: 'Atendida',
  cancelada: 'Cancelada',
  no_asistio: 'No asistió',
};

export function lower(s: string) {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

export function matchesSearch(c: Client, q: string) {
  if (!q) return true;
  const n = q
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
  const hay = `${c.first_name} ${c.last_name} ${c.phone ?? ''} ${c.email ?? ''}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
  return n.split(/\s+/).every((t) => hay.includes(t));
}

// A dónde va un empleado invitado al entrar: a Gestión si tiene un rol ahí, si no a Canjes. Null si no es empleado.
export async function destinoEmpleado(): Promise<string | null> {
  const { data: businessId } = await supabase.rpc('claim_staff_invite');
  if (!businessId) return null;
  const { data } = await supabase.rpc('gestion_my_access', { p_business: businessId });
  return (data as GestionAccess | null)?.member ? '/gestion' : '/canjes';
}
