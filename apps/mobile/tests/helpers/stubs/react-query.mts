// Doble de @tanstack/react-query: en vez de ejecutar una consulta, guarda las opciones con que el hook la
// declaró (queryKey, enabled, queryFn...) para que la prueba llame a queryFn / mutationFn directamente.
export const rq = {
  /** Opciones de la última llamada a useQuery. */
  lastQuery: undefined as any,
  /** Todas las llamadas a useQuery de la última pasada del hook (en orden). */
  queries: [] as any[],
  lastMutation: undefined as any,
  /** Lo que devuelve useQuery (por ejemplo { data: [...] }) para hooks que leen el resultado de otro hook. */
  queryResult: { data: undefined } as any,
  invalidated: [] as any[],
  /** Cuántas veces el QueryClient real de la app fue vaciado / se le cancelaron consultas. */
  clears: 0,
  cancels: 0,
};

export function resetRq() {
  rq.lastQuery = undefined;
  rq.queries = [];
  rq.lastMutation = undefined;
  rq.queryResult = { data: undefined };
  rq.invalidated = [];
  rq.clears = 0;
  rq.cancels = 0;
}

export class QueryClient {
  clear() { rq.clears++; }
  cancelQueries() { rq.cancels++; return Promise.resolve(); }
  invalidateQueries(arg: any) { rq.invalidated.push(arg); }
}

export const keepPreviousData = (prev: unknown) => prev;

export function useQuery(options: any) {
  rq.lastQuery = options;
  rq.queries.push(options);
  return rq.queryResult;
}

export function useMutation(options: any) {
  rq.lastMutation = options;
  return { mutate: () => {}, mutateAsync: async () => {}, isPending: false };
}

export function useQueryClient() {
  return { invalidateQueries: (arg: any) => rq.invalidated.push(arg) };
}
