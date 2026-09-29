// TODO: esto es una bitácora 100% simulada en localStorage, solo para
// demostrar el concepto mientras no existe backend. Cuando se conecte
// Django, cada acción debe registrarse del lado del servidor (nunca solo
// en el navegador, donde cualquiera podría borrar o falsear el historial).

const CLAVE = 'servitur_bitacora'
const LIMITE_EVENTOS = 500

function obtenerTodos() {
  try {
    const guardados = localStorage.getItem(CLAVE)
    return guardados ? JSON.parse(guardados) : []
  } catch {
    return []
  }
}

/**
 * Registra un evento en la bitácora.
 * accion sugeridas: 'crear' | 'actualizar' | 'eliminar' | 'aprobar' | 'rechazar' | 'iniciar_sesion' | 'registrar_cuenta'
 */
export function registrarEvento({ usuario, rol, accion, modulo, detalle }) {
  const eventos = obtenerTodos()
  const nuevo = {
    id: (eventos[0]?.id ?? 0) + 1,
    fecha: new Date().toISOString(),
    usuario: usuario || 'Usuario desconocido',
    rol: rol || '—',
    accion,
    modulo,
    detalle,
  }
  const actualizados = [nuevo, ...eventos].slice(0, LIMITE_EVENTOS)
  localStorage.setItem(CLAVE, JSON.stringify(actualizados))
  return nuevo
}

export function obtenerBitacora() {
  return obtenerTodos()
}

export function limpiarBitacora() {
  localStorage.removeItem(CLAVE)
}