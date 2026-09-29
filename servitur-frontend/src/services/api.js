/**
 * src/services/api.js
 *
 * Cliente HTTP para hablar con el backend Django. Adjunta el JWT
 * automáticamente y, si el access token expiró (401), intenta refrescarlo
 * una vez con el refresh token y reintenta la petición original.
 *
 * Soporta tanto payloads JSON normales como FormData (multipart), esto
 * último para endpoints que suben archivos (p. ej. el documento de un
 * Permiso). Cuando el body es una instancia de FormData, NO se hace
 * JSON.stringify ni se fuerza el header Content-Type: el navegador arma el
 * boundary del multipart automáticamente.
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

const CLAVE_ACCESS = 'servitur_access'
const CLAVE_REFRESH = 'servitur_refresh'

export function getAccessToken() {
  return localStorage.getItem(CLAVE_ACCESS)
}

export function getRefreshToken() {
  return localStorage.getItem(CLAVE_REFRESH)
}

function guardarTokens({ access, refresh }) {
  if (access) localStorage.setItem(CLAVE_ACCESS, access)
  if (refresh) localStorage.setItem(CLAVE_REFRESH, refresh)
}

function limpiarTokens() {
  localStorage.removeItem(CLAVE_ACCESS)
  localStorage.removeItem(CLAVE_REFRESH)
}

export async function login(username, password) {
  const res = await fetch(`${BASE_URL}/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  if (!res.ok) {
    throw new Error('Usuario o contraseña incorrectos.')
  }
  const tokens = await res.json()
  guardarTokens(tokens)

  // El AuthContext espera el perfil (rol, nombre, etc.), no los tokens
  // crudos, así que aquí mismo pedimos /me/ y eso es lo que regresamos.
  const perfil = await apiFetch('/me/')
  return perfil
}

export function logout() {
  limpiarTokens()
}

async function refrescarToken() {
  const refresh = getRefreshToken()
  if (!refresh) return false
  try {
    const res = await fetch(`${BASE_URL}/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    })
    if (!res.ok) return false
    const datos = await res.json()
    guardarTokens(datos)
    return true
  } catch {
    return false
  }
}

/**
 * Petición genérica a la API. `body` puede ser:
 *  - undefined: sin cuerpo (GET/DELETE)
 *  - un objeto plano: se manda como JSON
 *  - una instancia de FormData: se manda tal cual (multipart), sin
 *    Content-Type manual, para poder incluir archivos.
 */
export async function apiFetch(path, { method = 'GET', body, headers = {} } = {}) {
  const esFormData = body instanceof FormData

  const construirHeaders = () => {
    const h = { ...headers }
    const access = getAccessToken()
    if (access) h.Authorization = `Bearer ${access}`
    if (!esFormData && body !== undefined) h['Content-Type'] = 'application/json'
    return h
  }

  const construirBody = () => {
    if (body === undefined) return undefined
    return esFormData ? body : JSON.stringify(body)
  }

  let res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: construirHeaders(),
    body: construirBody(),
  })

  if (res.status === 401) {
    const refrescado = await refrescarToken()
    if (refrescado) {
      res = await fetch(`${BASE_URL}${path}`, {
        method,
        headers: construirHeaders(),
        body: construirBody(),
      })
    }
  }

  if (!res.ok) {
    let detalle = ''
    try {
      const datosError = await res.json()
      detalle = typeof datosError === 'string' ? datosError : JSON.stringify(datosError)
    } catch {
      detalle = res.statusText
    }
    throw new Error(detalle || `Error ${res.status}`)
  }

  if (res.status === 204) return null
  return res.json()
}

export const api = {
  get: (path) => apiFetch(path, { method: 'GET' }),
  post: (path, body) => apiFetch(path, { method: 'POST', body }),
  patch: (path, body) => apiFetch(path, { method: 'PATCH', body }),
  put: (path, body) => apiFetch(path, { method: 'PUT', body }),
  delete: (path) => apiFetch(path, { method: 'DELETE' }),
}