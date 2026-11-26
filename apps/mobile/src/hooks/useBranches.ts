import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { MAIN_PLACE, type BenefitBranchRule, type Branch } from '@/lib/branches';

const EMPTY_BRANCHES: ReadonlyMap<string, Branch[]> = new Map();
const EMPTY_RULES: BranchRules = { rules: new Map(), usedToday: new Map() };

// Sucursales de los comercios (0133), agrupadas por comercio. Son pocas filas: se bajan todas las que la base deja ver
// (solo de comercios aprobados). Si algo falla (por ejemplo, la base todavía no tiene la tabla) se sigue sin sucursales:
// la app se ve igual que antes y nunca se rompe por esto.
export function useBranches() {
  const userId = useAuthStore((s) => s.session?.user.id);
  return useQuery({
    queryKey: ['business-branches', userId],
    enabled: !!userId,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<ReadonlyMap<string, Branch[]>> => {
      try {
        const { data, error } = await supabase
          .from('business_branches')
          .select('id, business_id, name, address, lat, lng, opening_hours')
          .order('created_at', { ascending: true })
          .limit(2000);
        if (error || !data?.length) return EMPTY_BRANCHES;
        const map = new Map<string, Branch[]>();
        for (const row of data as Branch[]) {
          const list = map.get(row.business_id);
          if (list) list.push(row);
          else map.set(row.business_id, [row]);
        }
        return map;
      } catch {
        return EMPTY_BRANCHES;
      }
    },
  });
}

export type BranchRules = {
  // Por premio: en qué sucursales vale (sin entrada = vale en todas).
  rules: ReadonlyMap<string, BenefitBranchRule[]>;
  // Por premio: canjes de hoy en cada sucursal con cupos propios (clave = id de sucursal o MAIN_PLACE).
  usedToday: ReadonlyMap<string, ReadonlyMap<string, number>>;
};

// Premios que el comercio eligió solo para algunas sucursales, y sus cupos de hoy por sucursal.
// Igual que arriba: si falla, todos los premios valen en todas las sucursales (como antes) y el servidor igual controla.
export function useBenefitBranchRules() {
  const userId = useAuthStore((s) => s.session?.user.id);
  return useQuery({
    queryKey: ['benefit-branch-rules', userId],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async (): Promise<BranchRules> => {
      try {
        const [rulesRes, usedRes] = await Promise.all([
          supabase.from('benefit_branches').select('benefit_id, branch_id, daily_quota').limit(5000),
          supabase.rpc('benefits_branch_remaining_today'),
        ]);
        if (rulesRes.error || !rulesRes.data?.length) return EMPTY_RULES;
        const rules = new Map<string, BenefitBranchRule[]>();
        for (const r of rulesRes.data as { benefit_id: string; branch_id: string | null; daily_quota: number | null }[]) {
          const list = rules.get(r.benefit_id);
          const rule = { branch_id: r.branch_id, daily_quota: r.daily_quota };
          if (list) list.push(rule);
          else rules.set(r.benefit_id, [rule]);
        }
        const usedToday = new Map<string, Map<string, number>>();
        if (!usedRes.error) {
          for (const u of (usedRes.data ?? []) as { benefit_id: string; branch_id: string | null; redeemed_today: number }[]) {
            const m = usedToday.get(u.benefit_id) ?? new Map<string, number>();
            m.set(u.branch_id ?? MAIN_PLACE, u.redeemed_today);
            usedToday.set(u.benefit_id, m);
          }
        }
        return { rules, usedToday };
      } catch {
        return EMPTY_RULES;
      }
    },
  });
}
