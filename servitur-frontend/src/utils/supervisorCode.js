const CLAVE_STORAGE = 'servitur_codigo_supervisor'
const CODIGO_POR_DEFECTO = 'SVT-SUP-2026'

/**
 * TODO: esto vive en localStorage solo como solución temporal mientras no hay backend.
 * Cuando se conecte Django, este código debe generarse y validarse en el servidor
 * (idealmente de un solo uso o con expiración), nunca solo del lado del navegador.
 */
export function obtenerCodigoSupervisor() {
  return localStorage.getItem(CLAVE_STORAGE) || CODIGO_POR_DEFECTO
}

export function guardarCodigoSupervisor(codigo) {
  localStorage.setItem(CLAVE_STORAGE, codigo)
}

export function generarCodigoAleatorio() {
  const sufijo = Math.random().toString(36).slice(2, 8).toUpperCase()
  return `SVT-SUP-${sufijo}`
}