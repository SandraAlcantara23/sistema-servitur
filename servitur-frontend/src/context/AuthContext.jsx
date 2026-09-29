import { createContext, useContext, useEffect, useState } from 'react'
import { login as loginApi, logout as logoutApi, getAccessToken, apiFetch } from '../services/api.js'

const CLAVE_SESION = 'servitur_sesion'
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [sesion, setSesion] = useState(() => {
    try {
      const guardada = localStorage.getItem(CLAVE_SESION)
      return guardada ? JSON.parse(guardada) : null
    } catch {
      return null
    }
  })
  const [cargando, setCargando] = useState(true)

  // Al montar la app: si hay un access token guardado, confirma con el
  // backend que sigue siendo válido y refresca el perfil (por si cambió
  // el rol, el nombre, etc. desde la última vez).
  useEffect(() => {
    const token = getAccessToken()
    if (!token) {
      setCargando(false)
      return
    }
    apiFetch('/me/')
      .then((perfil) => setSesion(perfil))
      .catch(() => setSesion(null))
      .finally(() => setCargando(false))
  }, [])

  useEffect(() => {
    if (sesion) {
      localStorage.setItem(CLAVE_SESION, JSON.stringify(sesion))
    } else {
      localStorage.removeItem(CLAVE_SESION)
    }
  }, [sesion])

  // Llama al backend real (/api/token/ + /api/me/) y guarda la sesión.
  // Lanza el Error tal cual si las credenciales son inválidas, para que
  // Login.jsx lo muestre.
  const iniciarSesion = async (username, password) => {
    const perfil = await loginApi(username, password)
    setSesion(perfil)
    return perfil
  }

  const cerrarSesion = () => {
    logoutApi()
    setSesion(null)
  }

  // Mezcla campos nuevos a la sesión actual (p. ej. después de guardar
  // teléfono/domicilio/foto en Mi Perfil), sin tener que volver a llamar a
  // /me/ ni recargar la página.
  const actualizarSesion = (datosParciales) => {
    setSesion((prev) => (prev ? { ...prev, ...datosParciales } : prev))
  }

  return (
    <AuthContext.Provider value={{ sesion, cargando, iniciarSesion, cerrarSesion, actualizarSesion }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const contexto = useContext(AuthContext)
  if (!contexto) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return contexto
}