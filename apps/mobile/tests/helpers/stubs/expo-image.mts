// expo-image mínimo para probar en Node: la descarga anticipada de fotos no hace nada y anota qué se pidió.
export const prefetched: string[][] = [];
export const Image = {
  async prefetch(urls: string | string[]) {
    prefetched.push(Array.isArray(urls) ? urls : [urls]);
    return true;
  },
};
