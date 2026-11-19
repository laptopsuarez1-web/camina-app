'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Users, Zap } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { GestionShell, useGestion } from '@/components/gestion/GestionShell';
import { ClienteForm } from '@/components/gestion/ClienteForm';
import { Avatar, Badge, Button, Card, Empty, SearchBox, Skeleton, inputCls } from '@/components/gestion/ui';
import { STATUS_LABEL, fmtDate, fullName, initials, matchesSearch, money, type Client, type ClientStatus } from '@/lib/gestion';

const COLS = 'id, business_id, first_name, last_name, phone, email, registered_at, service_id, status, notes, custom, created_by_email, created_at';

async function loadAll(businessId: string) {
  const all: Client[] = [];
  for (let from = 0; from < 20000; from += 1000) {
    const { data } = await supabase.from('gestion_clients').select(COLS).eq('business_id', businessId).order('first_name').range(from, from + 999);
    all.push(...((data as Client[]) ?? []));
    if (!data || data.length < 1000) break;
  }
  return all;
}

function Lista() {
  const { business, settings, services, can, openQuick, version } = useGestion();
  const router = useRouter();
  const [clients, setClients] = useState<Client[] | null>(null);
  const [balances, setBalances] = useState<Map<string, number>>(new Map());
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'' | ClientStatus>('');
  const [service, setService] = useState('');
  const [deuda, setDeuda] = useState(false);
  const [sort, setSort] = useState<'name' | 'recent' | 'balance'>('name');
  const [form, setForm] = useState(false);
  const [limit, setLimit] = useState(50);
  const canMoney = can('finance.view');

  useEffect(() => {
    loadAll(business.id).then(setClients);
    if (canMoney)
      supabase.rpc('gestion_balances', { p_business: business.id }).then(({ data }) => {
        setBalances(new Map(((data as { client_id: string; balance: number }[]) ?? []).map((b) => [b.client_id, Number(b.balance)])));
      });
  }, [business.id, canMoney, version]);

  const filtered = useMemo(() => {
    const list = (clients ?? []).filter(
      (c) =>
        matchesSearch(c, q) &&
        (!status || c.status === status) &&
        (!service || c.service_id === service) &&
        (!deuda || (balances.get(c.id) ?? 0) > 0)
    );
    if (sort === 'recent') list.sort((a, b) => b.created_at.localeCompare(a.created_at));
    if (sort === 'balance') list.sort((a, b) => (balances.get(b.id) ?? 0) - (balances.get(a.id) ?? 0));
    return list;
  }, [clients, q, status, service, deuda, sort, balances]);

  const svcName = (id: string | null) => services.find((s) => s.id === id)?.name ?? '—';
  const plural = settings.client_plural.toLowerCase();

  return (
    <>
      <Card className="mb-4" pad={false}>
        <div className="p-3 sm:p-4 flex flex-wrap gap-2">
          <SearchBox value={q} onChange={setQ} placeholder={`Buscar ${plural} por nombre, teléfono o correo`} />
          <select aria-label="Estado" value={status} onChange={(e) => setStatus(e.target.value as ClientStatus | '')} className={`${inputCls} w-auto`}>
            <option value="">Todos los estados</option>
            <option value="activo">Activos</option>
            <option value="inactivo">Inactivos</option>
            <option value="suspendido">Suspendidos</option>
          </select>
          <select aria-label="Servicio" value={service} onChange={(e) => setService(e.target.value)} className={`${inputCls} w-auto`}>
            <option value="">Todos los servicios</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select aria-label="Orden" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className={`${inputCls} w-auto`}>
            <option value="name">Nombre (A–Z)</option>
            <option value="recent">Más recientes</option>
            {canMoney && <option value="balance">Mayor deuda</option>}
          </select>
          {canMoney && (
            <label className="flex items-center gap-2 text-[13px] px-2 h-11 cursor-pointer">
              <input type="checkbox" checked={deuda} onChange={(e) => setDeuda(e.target.checked)} className="w-4 h-4" />
              Solo con deuda
            </label>
          )}
          {can('clients.edit') && (
            <Button variant="primary" icon={Plus} onClick={() => setForm(true)} className="ml-auto">
              Nuevo {settings.client_singular.toLowerCase()}
            </Button>
          )}
        </div>
      </Card>

      <Card pad={false}>
        {!clients ? (
          <div className="p-4 flex flex-col gap-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Empty
            icon={Users}
            title={clients.length ? 'Nada coincide con la búsqueda' : `Todavía no hay ${plural}`}
            text={clients.length ? 'Prueba con otro nombre o quita filtros.' : `Registra a tu primer ${settings.client_singular.toLowerCase()} para empezar.`}
            action={
              !clients.length && can('clients.edit') ? (
                <Button variant="primary" icon={Plus} onClick={() => setForm(true)}>
                  Nuevo {settings.client_singular.toLowerCase()}
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <p className="px-4 sm:px-5 py-2.5 text-[12px] text-muted border-b border-line">
              {filtered.length} {filtered.length === 1 ? settings.client_singular.toLowerCase() : plural}
            </p>
            {/* Tabla en compu */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-[13px] border-collapse">
                <thead>
                  <tr className="text-left text-muted text-[11.5px] uppercase tracking-wide">
                    <th className="font-semibold px-5 py-2.5">Nombre</th>
                    <th className="font-semibold px-3 py-2.5">Teléfono</th>
                    <th className="font-semibold px-3 py-2.5">Servicio</th>
                    <th className="font-semibold px-3 py-2.5">Registro</th>
                    <th className="font-semibold px-3 py-2.5">Estado</th>
                    {canMoney && <th className="font-semibold px-3 py-2.5 text-right">Saldo</th>}
                    <th className="px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, limit).map((c) => {
                    const bal = balances.get(c.id) ?? 0;
                    return (
                      <tr
                        key={c.id}
                        className="border-t border-line hover:bg-purple-light cursor-pointer"
                        onClick={() => router.push(`/gestion/clientes/ficha?id=${c.id}`)}
                      >
                        <td className="px-5 py-2.5">
                          <Link href={`/gestion/clientes/ficha?id=${c.id}`} className="flex items-center gap-2.5 font-semibold" onClick={(e) => e.stopPropagation()}>
                            <Avatar text={initials(c)} />
                            {fullName(c)}
                          </Link>
                        </td>
                        <td className="px-3 py-2.5 text-muted">{c.phone ?? '—'}</td>
                        <td className="px-3 py-2.5">{svcName(c.service_id)}</td>
                        <td className="px-3 py-2.5 text-muted tabular-nums">{fmtDate(c.registered_at)}</td>
                        <td className="px-3 py-2.5">
                          <Badge tone={c.status === 'activo' ? 'ok' : c.status === 'suspendido' ? 'danger' : 'neutral'}>{STATUS_LABEL[c.status]}</Badge>
                        </td>
                        {canMoney && (
                          <td className={`px-3 py-2.5 text-right font-semibold tabular-nums ${bal > 0 ? 'gx-text-danger' : bal < 0 ? 'gx-text-ok' : 'text-muted'}`}>
                            {bal === 0 ? '—' : money(Math.abs(bal), settings.currency) + (bal < 0 ? ' a favor' : '')}
                          </td>
                        )}
                        <td className="px-3 py-2.5 text-right">
                          {can('visits.create') && c.status !== 'suspendido' && (
                            <Button
                              size="sm"
                              icon={Zap}
                              aria-label={`Registrar ${settings.session_singular.toLowerCase()} de ${fullName(c)}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                openQuick(c.id);
                              }}
                            >
                              Registrar
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* Lista en celular */}
            <ul className="md:hidden m-0 p-0 list-none">
              {filtered.slice(0, limit).map((c) => {
                const bal = balances.get(c.id) ?? 0;
                return (
                  <li key={c.id} className="border-t border-line first:border-t-0 flex items-center gap-2 pr-2">
                    <Link href={`/gestion/clientes/ficha?id=${c.id}`} className="flex items-center gap-3 px-4 py-3 flex-1 min-w-0">
                      <Avatar text={initials(c)} />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-[14px] truncate">{fullName(c)}</p>
                        <p className="text-[12px] text-muted truncate">
                          {STATUS_LABEL[c.status]} · {svcName(c.service_id)}
                          {canMoney && bal > 0 ? ` · debe ${money(bal, settings.currency)}` : ''}
                        </p>
                      </div>
                    </Link>
                    {can('visits.create') && c.status !== 'suspendido' && (
                      <button
                        type="button"
                        onClick={() => openQuick(c.id)}
                        aria-label={`Registrar ${settings.session_singular.toLowerCase()} de ${fullName(c)}`}
                        className="w-11 h-11 rounded-full bg-purple-light flex items-center justify-center shrink-0"
                      >
                        <Zap size={17} />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
            {filtered.length > limit && (
              <div className="p-3 border-t border-line text-center">
                <Button size="sm" onClick={() => setLimit(limit + 100)}>
                  Ver más ({filtered.length - limit} restantes)
                </Button>
              </div>
            )}
          </>
        )}
      </Card>

      <ClienteForm
        open={form}
        onClose={() => setForm(false)}
        onSaved={(c) => {
          setForm(false);
          router.push(`/gestion/clientes/ficha?id=${c.id}`);
        }}
      />
    </>
  );
}

export default function ClientesPage() {
  return (
    <GestionShell
      need={['clients.view']}
      title={(s) => s.client_plural}
      subtitle="Busca, filtra y entra a la ficha completa de cada uno."
    >
      <Lista />
    </GestionShell>
  );
}
