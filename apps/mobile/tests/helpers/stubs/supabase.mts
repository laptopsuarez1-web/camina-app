// Supabase de mentira, en memoria: tablas con filas, filtros básicos y rpc programables.
// Sirve para ejecutar el queryFn REAL de cada hook y mirar qué consultó y qué calculó con la respuesta.
type Row = Record<string, any>;
export const db = {
  tables: {} as Record<string, Row[]>,
  rpc: {} as Record<string, (args: any) => { data?: any; error?: any } | any>,
  /** Cada consulta ejecutada: { table, filters: [['gte','day','2026-08-03'], ...] } */
  log: [] as { table: string; filters: [string, string, any][] }[],
  rpcLog: [] as { name: string; args: any }[],
  /** Escrituras (upsert/insert/update) hechas con from(): { table, op, row, opts } */
  writes: [] as { table: string; op: string; row: any; opts?: any }[],
  /** Error a devolver por tabla (lecturas) o por "tabla:write" (escrituras). */
  errors: {} as Record<string, any>,
  /** Persona devuelta por supabase.auth.getUser(). */
  user: null as null | { id: string },
};

export function resetDb() {
  db.tables = {};
  db.rpc = {};
  db.log = [];
  db.rpcLog = [];
  db.writes = [];
  db.errors = {};
  db.user = null;
}

class Query {
  private filters: [string, string, any][] = [];
  private orderBy: { col: string; asc: boolean }[] = [];
  private max: number | null = null;
  private single: null | 'maybe' = null;
  private write: null | { op: string; row: any; opts?: any } = null;
  private table: string;
  constructor(table: string) { this.table = table; }
  select(_cols?: string) { return this; }
  eq(col: string, v: any) { this.filters.push(['eq', col, v]); return this; }
  neq(col: string, v: any) { this.filters.push(['neq', col, v]); return this; }
  in(col: string, v: any[]) { this.filters.push(['in', col, v]); return this; }
  gte(col: string, v: any) { this.filters.push(['gte', col, v]); return this; }
  lte(col: string, v: any) { this.filters.push(['lte', col, v]); return this; }
  order(col: string, opts?: { ascending?: boolean }) { this.orderBy.push({ col, asc: opts?.ascending !== false }); return this; }
  limit(n: number) { this.max = n; return this; }
  maybeSingle() { this.single = 'maybe'; return this; }
  upsert(row: any, opts?: any) { this.write = { op: 'upsert', row, opts }; return this; }
  insert(row: any) { this.write = { op: 'insert', row }; return this; }
  update(row: any) { this.write = { op: 'update', row }; return this; }
  then(resolve: (v: any) => any, reject?: (e: any) => any) {
    return Promise.resolve(this.run()).then(resolve, reject);
  }
  private run() {
    if (this.write) {
      db.writes.push({ table: this.table, ...this.write });
      return { data: null, error: db.errors[`${this.table}:write`] ?? null };
    }
    db.log.push({ table: this.table, filters: [...this.filters] });
    if (db.errors[this.table]) return { data: null, error: db.errors[this.table] };
    let rows = [...(db.tables[this.table] ?? [])];
    for (const [op, col, v] of this.filters) {
      rows = rows.filter((r) =>
        op === 'eq' ? r[col] === v
        : op === 'neq' ? r[col] !== v
        : op === 'in' ? (v as any[]).includes(r[col])
        : op === 'gte' ? r[col] >= v
        : r[col] <= v);
    }
    for (const { col, asc } of [...this.orderBy].reverse()) {
      rows.sort((a, b) => (a[col] < b[col] ? -1 : a[col] > b[col] ? 1 : 0) * (asc ? 1 : -1));
    }
    if (this.max != null) rows = rows.slice(0, this.max);
    if (this.single) return { data: rows[0] ?? null, error: null };
    return { data: rows, error: null };
  }
}

export const supabase = {
  from(table: string) { return new Query(table); },
  auth: {
    async getUser() { return { data: { user: db.user }, error: null }; },
  },
  async rpc(name: string, args?: any) {
    db.rpcLog.push({ name, args });
    const handler = db.rpc[name];
    if (!handler) return { data: null, error: { message: `rpc ${name} no programada` } };
    const out = typeof handler === 'function' ? handler(args) : handler;
    if (out && typeof out === 'object' && ('data' in out || 'error' in out)) return { data: out.data ?? null, error: out.error ?? null };
    return { data: out, error: null };
  },
};
