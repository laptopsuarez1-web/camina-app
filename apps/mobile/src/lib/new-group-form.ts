// Las pantallas de grupos son pestañas: siguen montadas al salir y conservan lo escrito.
// Después de crear o eliminar un grupo se marca el formulario como "usado" y "Grupo nuevo" arranca vacío la próxima vez.
let stale = false;
export const markNewGroupFormStale = () => { stale = true; };
export function consumeNewGroupFormStale() {
  const was = stale;
  stale = false;
  return was;
}
