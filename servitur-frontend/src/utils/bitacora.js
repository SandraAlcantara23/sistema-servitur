// La bitácora de auditoría REAL vive en el servidor (modelo BitacoraAuditoria
// en Django): el backend registra cada alta, cambio y baja con el usuario que
// la hizo, y la pantalla "Auditoría" la consulta desde /api/bitacora/.
//
// Antes este archivo guardaba una bitácora simulada en localStorage, lo cual
// no sirve como auditoría (cualquiera podía borrarla o falsearla desde el
// navegador). Se deja `registrarEvento` como función vacía para no tener que
// tocar las pantallas que todavía la llaman; ya no guarda nada.

export function registrarEvento() {
  return null
}

export function obtenerBitacora() {
  return []
}

export function limpiarBitacora() {
  // Limpia lo que haya quedado de la versión anterior (simulada) en este navegador.
  try {
    localStorage.removeItem('servitur_bitacora')
  } catch {
    // sin acceso a localStorage: no pasa nada
  }
}
