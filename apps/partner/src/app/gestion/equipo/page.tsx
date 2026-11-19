'use client';

import { useCallback, useEffect, useState } from 'react';
import { UserPlus, ShieldCheck, Trash2, Plus, Pencil, Copy } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { mensajeError } from '@/lib/errors';
import { avisarPorCorreo } from '@/lib/email';
import { GestionShell, useGestion } from '@/components/gestion/GestionShell';
import { Badge, Button, Card, CardTitle, Empty, Field, Modal, Notice, Skeleton, inputCls } from '@/components/gestion/ui';
import { PERMISSION_GROUPS, fmtDate, invalidateGestionAccess, type Permission } from '@/lib/gestion';

interface Role {
  id: string;
  name: string;
  permissions: Permission[];
  is_system: boolean;
}

interface Staff {
  id: string;
  email: string;
  display_name: string | null;
  user_id: string | null;
  gestion_role_id: string | null;
  created_at: string;
}

function Equipo() {
  const { business, can, access } = useGestion();
  const [roles, setRoles] = useState<Role[] | null>(null);
  const [staff, setStaff] = useState<Staff[] | null>(null);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [roleId, setRoleId] = useState('');
  const [msg, setMsg] = useState<{ tone: 'ok' | 'danger' | 'warn'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [editRole, setEditRole] = useState<Role | 'new' | null>(null);
  const [me, setMe] = useState<string | null>(null);
  const mine = new Set(access.permissions ?? []);

  const load = useCallback(async () => {
    const [r, s] = await Promise.all([
      supabase.from('gestion_roles').select('id, name, permissions, is_system').eq('business_id', business.id).order('created_at'),
      supabase.from('business_staff').select('id, email, display_name, user_id, gestion_role_id, created_at').eq('business_id', business.id).order('created_at'),
    ]);
    const rs = (r.data as Role[]) ?? [];
    setRoles(rs);
    setStaff((s.data as Staff[]) ?? []);
    setRoleId((cur) => cur || rs.find((x) => x.name === 'Recepción')?.id || rs[0]?.id || '');
  }, [business.id]);

  useEffect(() => {
    load();
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
  }, [load]);

  async function invite() {
    setSaving(true);
    setMsg(null);
    const { error } = await supabase.rpc('gestion_invite_staff', { p_business: business.id, p_email: email, p_role: roleId, p_name: name || null });
    if (error) {
      setSaving(false);
      return setMsg({ tone: 'danger', text: mensajeError(error) });
    }
    const correo = email.trim().toLowerCase();
    const sent = await avisarPorCorreo('gestion_invite', business.id, correo);
    setSaving(false);
    setEmail('');
    setName('');
    setMsg(
      sent
        ? { tone: 'ok', text: `Listo. Le mandamos un correo a ${correo} para que entre.` }
        : { tone: 'warn', text: `Quedó invitado, pero no pudimos mandar el correo. Pásale este link: ${window.location.origin}/unirme?email=${encodeURIComponent(correo)}` }
    );
    load();
  }

  async function changeRole(s: Staff, role: string) {
    setMsg(null);
    const { error } = await supabase.rpc('gestion_set_staff_role', { p_staff: s.id, p_role: role || null });
    if (error) setMsg({ tone: 'danger', text: mensajeError(error) });
    load();
  }

  async function remove(s: Staff) {
    if (!confirm(`¿Quitar a ${s.email}? Pierde el acceso al instante.`)) return;
    const { error } = await supabase.rpc('gestion_remove_staff', { p_staff: s.id });
    if (error) setMsg({ tone: 'danger', text: mensajeError(error) });
    load();
  }

  if (!roles || !staff) return <Skeleton className="h-64" />;
  const roleName = (id: string | null) => roles.find((r) => r.id === id)?.name;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_1fr] gap-4 items-start">
      <div className="flex flex-col gap-4">
        <Card>
          <CardTitle>Invitar a una persona</CardTitle>
          <p className="text-[12.5px] text-muted mb-3">
            Le llega un correo para crear su cuenta y entra con el rol que elijas. Puedes hacerlo desde cualquier lugar y cambiarle o quitarle el acceso cuando quieras.
          </p>
          <form
            className="grid grid-cols-1 sm:grid-cols-2 gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              invite();
            }}
          >
            <Field label="Correo">
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="persona@correo.com" />
            </Field>
            <Field label="Nombre (opcional)">
              <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} maxLength={80} />
            </Field>
            <Field label="Rol">
              <select value={roleId} onChange={(e) => setRoleId(e.target.value)} className={inputCls}>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </Field>
            <div className="flex items-end">
              <Button type="submit" variant="primary" icon={UserPlus} disabled={saving || !email.includes('@') || !roleId} className="w-full">
                {saving ? 'Invitando…' : 'Invitar'}
              </Button>
            </div>
          </form>
          {msg && (
            <div className="mt-3">
              <Notice tone={msg.tone}>{msg.text}</Notice>
            </div>
          )}
        </Card>

        <Card pad={false}>
          <div className="p-4 sm:p-5 pb-2">
            <CardTitle>Equipo</CardTitle>
          </div>
          <ul className="m-0 p-0 list-none">
            <li className="border-t border-line px-4 sm:px-5 py-3 flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-[13.5px]">Propietario</p>
                <p className="text-[12px] text-muted">Acceso completo, no se puede quitar.</p>
              </div>
              <Badge tone="info">Administrador</Badge>
            </li>
            {staff.length === 0 && <Empty title="Todavía no invitaste a nadie" />}
            {staff.map((s) => (
              <li key={s.id} className="border-t border-line px-4 sm:px-5 py-3 flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[13.5px] truncate">{s.display_name ?? s.email}</p>
                  <p className="text-[12px] text-muted truncate">
                    {s.display_name ? `${s.email} · ` : ''}
                    {s.user_id ? 'Cuenta activa' : 'Invitación pendiente'} · desde {fmtDate(s.created_at)}
                  </p>
                </div>
                <select
                  aria-label={`Rol de ${s.email}`}
                  value={s.gestion_role_id ?? ''}
                  disabled={s.user_id === me}
                  onChange={(e) => changeRole(s, e.target.value)}
                  className={`${inputCls} w-auto h-9`}
                >
                  <option value="">Sin acceso a Gestión</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
                {!s.gestion_role_id && <Badge>Solo canjes</Badge>}
                {!s.user_id && (
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={Copy}
                    aria-label="Copiar link de invitación"
                    onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/unirme?email=${encodeURIComponent(s.email)}`)}
                  />
                )}
                {s.user_id !== me && <Button size="sm" variant="ghost" icon={Trash2} aria-label={`Quitar a ${s.email}`} onClick={() => remove(s)} />}
              </li>
            ))}
          </ul>
          {staff.some((s) => s.gestion_role_id) && (
            <p className="px-4 sm:px-5 py-3 text-[12px] text-muted border-t border-line">
              Roles: {Array.from(new Set(staff.map((s) => roleName(s.gestion_role_id)).filter(Boolean))).join(', ')}.
            </p>
          )}
        </Card>
      </div>

      <Card pad={false}>
        <div className="p-4 sm:p-5 pb-2">
          <CardTitle
            action={
              <Button size="sm" icon={Plus} onClick={() => setEditRole('new')}>
                Nuevo rol
              </Button>
            }
          >
            Roles y permisos
          </CardTitle>
          <p className="text-[12px] text-muted">El servidor controla cada permiso: si un rol no lo tiene, la acción se rechaza aunque alguien intente forzarla.</p>
        </div>
        <ul className="m-0 p-0 list-none">
          {roles.map((r) => (
            <li key={r.id} className="border-t border-line px-4 sm:px-5 py-3 flex items-start gap-3">
              <ShieldCheck size={16} className="text-muted mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-[13.5px]">{r.name}</p>
                <p className="text-[12px] text-muted">
                  {r.permissions.length} permisos · {staff.filter((s) => s.gestion_role_id === r.id).length} personas
                </p>
              </div>
              {can('staff.manage') && <Button size="sm" variant="ghost" icon={Pencil} aria-label={`Editar ${r.name}`} onClick={() => setEditRole(r)} />}
            </li>
          ))}
        </ul>
      </Card>

      <RolModal
        role={editRole}
        mine={mine}
        onClose={() => setEditRole(null)}
        onSaved={() => {
          setEditRole(null);
          invalidateGestionAccess();
          load();
        }}
      />
    </div>
  );
}

function RolModal({ role, mine, onClose, onSaved }: { role: Role | 'new' | null; mine: Set<Permission>; onClose: () => void; onSaved: () => void }) {
  const { business } = useGestion();
  const [name, setName] = useState('');
  const [perms, setPerms] = useState<Set<Permission>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!role) return;
    setError(null);
    setName(role === 'new' ? '' : role.name);
    setPerms(new Set(role === 'new' ? ['clients.view'] : role.permissions));
  }, [role]);

  if (!role) return null;
  const toggle = (p: Permission) => {
    const n = new Set(perms);
    if (n.has(p)) n.delete(p);
    else n.add(p);
    setPerms(n);
  };

  async function save() {
    setSaving(true);
    setError(null);
    const { error: e } = await supabase.rpc('gestion_save_role', {
      p_business: business.id,
      p_id: role === 'new' ? null : (role as Role).id,
      p_name: name,
      p_permissions: [...perms],
    });
    setSaving(false);
    if (e) return setError(mensajeError(e));
    onSaved();
  }

  async function del() {
    if (role === 'new' || !role) return;
    if (!confirm(`¿Borrar el rol «${role.name}»?`)) return;
    const { error: e } = await supabase.rpc('gestion_delete_role', { p_role: role.id });
    if (e) return setError(mensajeError(e));
    onSaved();
  }

  return (
    <Modal
      open
      wide
      onClose={onClose}
      title={role === 'new' ? 'Nuevo rol' : `Rol: ${role.name}`}
      footer={
        <>
          {role !== 'new' && (
            <Button variant="danger" onClick={del} className="mr-auto">
              Borrar
            </Button>
          )}
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={save} disabled={saving || !name.trim()}>
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
        </>
      }
    >
      <Field label="Nombre del rol" className="mb-4">
        <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} maxLength={40} />
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {PERMISSION_GROUPS.map((g) => (
          <fieldset key={g.title} className="border border-line rounded-xl p-3 m-0">
            <legend className="px-1 text-[12px] font-bold uppercase tracking-wide text-muted">{g.title}</legend>
            {g.items.map((it) => (
              <label key={it.key} className={`flex items-center gap-2.5 py-1.5 text-[13px] ${mine.has(it.key) ? 'cursor-pointer' : 'opacity-50'}`}>
                <input type="checkbox" className="w-4 h-4" checked={perms.has(it.key)} disabled={!mine.has(it.key)} onChange={() => toggle(it.key)} />
                {it.label}
              </label>
            ))}
          </fieldset>
        ))}
      </div>
      {error && (
        <div className="mt-3">
          <Notice tone="danger">{error}</Notice>
        </div>
      )}
    </Modal>
  );
}

export default function EquipoGestionPage() {
  return (
    <GestionShell need={['staff.manage']} title="Equipo y permisos" subtitle="Invita personas, asigna roles y revoca accesos en cualquier momento.">
      <Equipo />
    </GestionShell>
  );
}
