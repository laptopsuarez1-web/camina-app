import { QueryClient } from '@tanstack/react-query';

// Un solo cliente para toda la app: el layout lo monta y el store de sesión lo vacía al
// cerrar sesión o al entrar con otra cuenta, para que no queden datos de la persona anterior.
export const queryClient = new QueryClient();
