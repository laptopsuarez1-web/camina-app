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
};

export function resetRq() {
  rq.lastQuery = undefined;
  rq.queries = [];
  rq.lastMutation = undefined;
  rq.queryResult = { data: undefined };
  rq.invalidated = [];
}

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
