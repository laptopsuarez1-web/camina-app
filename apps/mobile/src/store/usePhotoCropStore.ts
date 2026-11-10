import { create } from 'zustand';

// Pedido de recorte: la foto elegida, la proporción del marco y, al terminar, el rectángulo (en px de la foto) que quedó dentro.
export type CropRect = { x: number; y: number; width: number; height: number };
export type CropRequest = {
  id: number;
  uri: string;
  width: number;
  height: number;
  aspect: number;
  title: string;
  round?: boolean;
};

type State = {
  request: CropRequest | null;
  // Se llama al confirmar (con el rectángulo) o al cancelar (null). Hace el recorte real y devuelve la promesa a quien pidió.
  finish: (rect: CropRect | null) => Promise<void>;
};

let resolver: ((r: CropRect | null) => void) | null = null;
let seq = 0;

export const usePhotoCropStore = create<State>((set) => ({
  request: null,
  finish: async (rect) => {
    const r = resolver;
    resolver = null;
    set({ request: null });
    r?.(rect);
  },
}));

export function askCrop(req: Omit<CropRequest, 'id'>): Promise<CropRect | null> {
  return new Promise((resolve) => {
    resolver?.(null);
    resolver = resolve;
    usePhotoCropStore.setState({ request: { ...req, id: ++seq } });
  });
}
