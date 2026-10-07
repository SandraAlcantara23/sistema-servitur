import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Settings, Lock, User, Palette, ShieldCheck, Copy, RefreshCw, Check, Bell, Monitor, Users } from 'lucide-react'
import AppLayout from '../components/layout/AppLayout.jsx'
import RestablecerPasswords from '../components/configuracion/RestablecerPasswords.jsx'
import Toast from '../components/common/Toast.jsx'
import { useToast } from '../hooks/useToast.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useTheme } from '../context/ThemeContext.jsx'
import { seccionConfigPermitida, paginaPermitida, EVENTO_REQUIERE_PAGINA } from '../utils/rolesPermisos.js'
import { api } from '../services/api.js'

// Los "colores" de cada tema son solo para el swatch que se muestra junto al
// nombre (varios puntos = varios colores de marca; uno solo = un tono liso).
const TEMAS = [
  { valor: 'light', nombre: 'Claro (colores Servitur)', colores: ['#C9252D', '#173F63', '#FFFFFF'] },
  { valor: 'dark', nombre: 'Oscuro', colores: ['#111822'] },
]

const EVENTOS_NOTIFICACION = [
  { id: 'permiso', label: 'Nueva solicitud de permiso' },
  { id: 'incidencia', label: 'Incidencia registrada' },
  { id: 'retraso', label: 'Retraso reportado' },
  { id: 'reporteConductor', label: 'Nuevo Reporte del Conductor guardado' },
]

const formatearFechaSesion = (iso) => {
  try {
    return new Date(iso).toLocaleString('es-MX', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export default function Configuracion() {
  const { sesion, actualizarSesion, cerrarSesion } = useAuth()
  const { tema, setTema } = useTheme()
  const navigate = useNavigate()
  const { toast, mostrarToast, cerrarToast } = useToast()
  const rolActualUsuario = sesion?.rol

  const [codigoSupervisor, setCodigoSupervisor] = useState('')
  const [cargandoCodigo, setCargandoCodigo] = useState(false)
  const [regenerandoCodigo, setRegenerandoCodigo] = useState(false)
  const [copiado, setCopiado] = useState(false)

  // Datos de usuario
  const [nombre, setNombre] = useState(sesion?.nombre ?? '')
  const [correo, setCorreo] = useState(sesion?.email ?? '')
  const [guardandoDatos, setGuardandoDatos] = useState(false)
  const [errorDatos, setErrorDatos] = useState('')
  const [datosGuardados, setDatosGuardados] = useState(false)

  // Contraseña
  const [passwordActual, setPasswordActual] = useState('')
  const [passwordNueva, setPasswordNueva] = useState('')
  const [cambiandoPassword, setCambiandoPassword] = useState(false)
  const [errorPassword, setErrorPassword] = useState('')
  const [passwordActualizada, setPasswordActualizada] = useState(false)

  // Notificaciones
  const [notificaciones, setNotificaciones] = useState(() =>
    Object.fromEntries(
      EVENTOS_NOTIFICACION.map((e) => [
        e.id,
        sesion?.preferencias_notificaciones?.[e.id] ?? { sistema: true, correo: false },
      ]),
    ),
  )
  const [guardandoNotificaciones, setGuardandoNotificaciones] = useState(false)
  const [notificacionesGuardadas, setNotificacionesGuardadas] = useState(false)

  // Gestión de roles: conteo real de usuarios por rol
  const [conteoRoles, setConteoRoles] = useState({})
  const [cargandoConteo, setCargandoConteo] = useState(false)

  // Sesión y seguridad
  const [sesionesActivas, setSesionesActivas] = useState([])
  const [cargandoSesiones, setCargandoSesiones] = useState(false)
  const [cerrandoSesiones, setCerrandoSesiones] = useState(false)
  const [cerrandoSesionId, setCerrandoSesionId] = useState(null)
  const [errorSesiones, setErrorSesiones] = useState('')

  useEffect(() => {
    if (!seccionConfigPermitida(rolActualUsuario, 'gestionRoles')) return
    let activo = true
    setCargandoConteo(true)
    api.get('/usuarios/')
      .then((usuarios) => {
        if (!activo) return
        const conteo = {}
        usuarios.forEach((u) => {
          const rol = u.rol_nombre || 'Sin rol'
          conteo[rol] = (conteo[rol] || 0) + 1
        })
        setConteoRoles(conteo)
      })
      .catch(() => { if (activo) setConteoRoles({}) })
      .finally(() => { if (activo) setCargandoConteo(false) })
    return () => { activo = false }
  }, [rolActualUsuario])

  useEffect(() => {
    if (!seccionConfigPermitida(rolActualUsuario, 'codigoSupervisor')) return
    let activo = true
    setCargandoCodigo(true)
    api.get('/configuracion/codigo-supervisor/')
      .then((datos) => { if (activo) setCodigoSupervisor(datos.codigo_supervisor) })
      .catch(() => {})
      .finally(() => { if (activo) setCargandoCodigo(false) })
    return () => { activo = false }
  }, [rolActualUsuario])

  useEffect(() => {
    if (!seccionConfigPermitida(rolActualUsuario, 'sesionSeguridad')) return
    let activo = true
    setCargandoSesiones(true)
    api.get('/sesiones/')
      .then((datos) => { if (activo) setSesionesActivas(datos) })
      .catch(() => {})
      .finally(() => { if (activo) setCargandoSesiones(false) })
    return () => { activo = false }
  }, [rolActualUsuario])

  const eventosNotificacionVisibles = EVENTOS_NOTIFICACION.filter((e) =>
    paginaPermitida(rolActualUsuario, EVENTO_REQUIERE_PAGINA[e.id]),
  )

  const regenerarCodigo = async () => {
    setRegenerandoCodigo(true)
    try {
      const datos = await api.post('/configuracion/codigo-supervisor/')
      setCodigoSupervisor(datos.codigo_supervisor)
    } catch {
      // silencioso: el usuario puede reintentar con el botón
    } finally {
      setRegenerandoCodigo(false)
    }
  }

  const copiarCodigo = () => {
    navigator.clipboard.writeText(codigoSupervisor)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 1500)
  }

  const alternarNotificacion = (id, canal) => {
    setNotificaciones((prev) => ({
      ...prev,
      [id]: { ...prev[id], [canal]: !prev[id][canal] },
    }))
  }

  const guardarDatosUsuario = async () => {
    if (!sesion?.id) return
    setErrorDatos('')
    setGuardandoDatos(true)
    try {
      const partes = nombre.trim().split(' ', 2)
      const first_name = partes[0] || ''
      const last_name = nombre.trim().slice(first_name.length).trim()
      const actualizado = await api.patch(`/usuarios/${sesion.id}/`, {
        first_name,
        last_name,
        email: correo,
      })
      actualizarSesion({
        nombre: `${actualizado.first_name} ${actualizado.last_name}`.trim() || actualizado.username,
        email: actualizado.email,
      })
      setDatosGuardados(true)
      setTimeout(() => setDatosGuardados(false), 1500)
    } catch (err) {
      setErrorDatos(err.message || 'No se pudieron guardar los datos.')
    } finally {
      setGuardandoDatos(false)
    }
  }

  const actualizarPassword = async () => {
    setErrorPassword('')
    if (!passwordActual || !passwordNueva) {
      setErrorPassword('Completa ambos campos.')
      return
    }
    setCambiandoPassword(true)
    try {
      await api.post('/usuarios/cambiar_password/', { actual: passwordActual, nueva: passwordNueva })
      setPasswordActual('')
      setPasswordNueva('')
      setPasswordActualizada(true)
      setTimeout(() => setPasswordActualizada(false), 1500)
    } catch (err) {
      setErrorPassword(err.message || 'No se pudo actualizar la contraseña.')
    } finally {
      setCambiandoPassword(false)
    }
  }

  const guardarNotificaciones = async () => {
    if (!sesion?.id) return
    setGuardandoNotificaciones(true)
    try {
      const actualizado = await api.patch(`/usuarios/${sesion.id}/`, {
        preferencias_notificaciones: notificaciones,
      })
      actualizarSesion({ preferencias_notificaciones: actualizado.preferencias_notificaciones })
      setNotificacionesGuardadas(true)
      setTimeout(() => setNotificacionesGuardadas(false), 1500)
    } catch {
      // silencioso: no es crítico, el usuario puede reintentar
    } finally {
      setGuardandoNotificaciones(false)
    }
  }

  const cerrarTodasLasSesiones = async () => {
    setErrorSesiones('')
    setCerrandoSesiones(true)
    try {
      await api.post('/sesiones/cerrar_todas/')
      // Esto también cierra la sesión actual (es "todos los dispositivos"),
      // así que se limpia la sesión local y se regresa al login.
      cerrarSesion()
      navigate('/')
    } catch (err) {
      setErrorSesiones(err.message || 'No se pudieron cerrar las sesiones.')
      setCerrandoSesiones(false)
    }
  }

  const cerrarUnaSesion = async (id) => {
    setErrorSesiones('')
    setCerrandoSesionId(id)
    try {
      await api.post(`/sesiones/${id}/cerrar/`)
      setSesionesActivas((prev) => prev.filter((s) => s.id !== id))
    } catch (err) {
      setErrorSesiones(err.message || 'No se pudo cerrar esa sesión.')
    } finally {
      setCerrandoSesionId(null)
    }
  }

  return (
    <AppLayout>
      <div className="space-y-4 md:space-y-6 max-w-2xl mx-auto">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold text-servitur-texto">
            <Settings className="w-5 h-5 text-servitur-azul" />
            Configuración
          </h1>
          <p className="text-sm text-servitur-texto-secundario mt-0.5">
            Ajustes de tu cuenta y de la plataforma.
          </p>
        </div>

        {/* Datos de usuario */}
        {seccionConfigPermitida(rolActualUsuario, 'datosUsuario') && (
        <div className="bg-servitur-tarjeta rounded-xl shadow-sm border border-servitur-texto-secundario/10 p-4 md:p-6">
          <h2 className="flex items-center gap-2 font-semibold text-servitur-texto mb-4">
            <User className="w-4 h-4 text-servitur-azul" />
            Datos de usuario
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-servitur-texto mb-1">Nombre completo</label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full border border-servitur-texto-secundario/30 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-servitur-azul"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-servitur-texto mb-1">Correo electrónico</label>
              <input
                type="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                placeholder="correo@servitur.com"
                className="w-full border border-servitur-texto-secundario/30 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-servitur-azul"
              />
            </div>
          </div>
          {errorDatos && <p className="text-sm text-servitur-rojo mt-3">{errorDatos}</p>}
          <button
            onClick={guardarDatosUsuario}
            disabled={guardandoDatos}
            className="mt-4 text-sm bg-servitur-azul text-white px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-60"
          >
            {guardandoDatos ? 'Guardando...' : datosGuardados ? 'Guardado' : 'Guardar cambios'}
          </button>
        </div>
        )}

        {/* Cambio de contraseña */}
        {seccionConfigPermitida(rolActualUsuario, 'contrasena') && (
        <div className="bg-servitur-tarjeta rounded-xl shadow-sm border border-servitur-texto-secundario/10 p-4 md:p-6">
          <h2 className="flex items-center gap-2 font-semibold text-servitur-texto mb-4">
            <Lock className="w-4 h-4 text-servitur-azul" />
            Cambiar contraseña
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-servitur-texto mb-1">Contraseña actual</label>
              <input
                type="password"
                value={passwordActual}
                onChange={(e) => setPasswordActual(e.target.value)}
                className="w-full border border-servitur-texto-secundario/30 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-servitur-azul"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-servitur-texto mb-1">Nueva contraseña</label>
              <input
                type="password"
                value={passwordNueva}
                onChange={(e) => setPasswordNueva(e.target.value)}
                className="w-full border border-servitur-texto-secundario/30 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-servitur-azul"
              />
            </div>
          </div>
          {errorPassword && <p className="text-sm text-servitur-rojo mt-3">{errorPassword}</p>}
          <button
            onClick={actualizarPassword}
            disabled={cambiandoPassword}
            className="mt-4 text-sm bg-servitur-azul text-white px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-60"
          >
            {cambiandoPassword ? 'Actualizando...' : passwordActualizada ? 'Actualizada' : 'Actualizar contraseña'}
          </button>
        </div>
        )}

        {/* Restablecer contraseñas de otras cuentas (Administrador, Supervisor y RH) */}
        {seccionConfigPermitida(rolActualUsuario, 'restablecerPasswords') && (
          <RestablecerPasswords
            rol={rolActualUsuario}
            usuarioActual={sesion}
            mostrarToast={mostrarToast}
          />
        )}

        {/* Código de autorización de Supervisor */}
        {seccionConfigPermitida(rolActualUsuario, 'codigoSupervisor') && (
        <div className="bg-servitur-tarjeta rounded-xl shadow-sm border border-servitur-texto-secundario/10 p-4 md:p-6">
          <h2 className="flex items-center gap-2 font-semibold text-servitur-texto mb-1">
            <ShieldCheck className="w-4 h-4 text-servitur-azul" />
            Código de autorización de Supervisor
          </h2>
          <p className="text-sm text-servitur-texto-secundario mb-4">
            Compártelo solo con las personas que deban registrarse como Supervisor. Cualquiera con este código puede crear una cuenta con ese rol.
          </p>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 flex items-center justify-between border border-servitur-texto-secundario/30 rounded-lg px-3 py-2.5 bg-servitur-fondo">
              <span className="font-mono text-sm text-servitur-texto tracking-wide">
                {cargandoCodigo ? 'Cargando...' : codigoSupervisor}
              </span>
              <button
                onClick={copiarCodigo}
                disabled={cargandoCodigo || !codigoSupervisor}
                className="flex items-center gap-1 text-xs text-servitur-azul hover:underline shrink-0 disabled:opacity-50"
              >
                {copiado ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiado ? 'Copiado' : 'Copiar'}
              </button>
            </div>
            <button
              onClick={regenerarCodigo}
              disabled={regenerandoCodigo}
              className="flex items-center gap-1.5 text-sm bg-servitur-azul text-white px-4 py-2.5 rounded-lg hover:opacity-90 shrink-0 disabled:opacity-60"
            >
              <RefreshCw className="w-4 h-4" />
              {regenerandoCodigo ? 'Generando...' : 'Generar nuevo código'}
            </button>
          </div>

          <p className="text-xs text-servitur-texto-secundario mt-3">
            Al generar uno nuevo, el código anterior deja de funcionar de inmediato.
          </p>
        </div>
        )}

        {/* Notificaciones */}
        {seccionConfigPermitida(rolActualUsuario, 'notificaciones') && (
        <div className="bg-servitur-tarjeta rounded-xl shadow-sm border border-servitur-texto-secundario/10 p-4 md:p-6">
          <h2 className="flex items-center gap-2 font-semibold text-servitur-texto mb-1">
            <Bell className="w-4 h-4 text-servitur-azul" />
            Notificaciones
          </h2>
          <p className="text-sm text-servitur-texto-secundario mb-4">
            Elige qué avisos quieres recibir y por dónde.
          </p>

          <div className="space-y-1">
            <div className="grid grid-cols-[1fr_auto_auto] gap-3 text-xs font-medium text-servitur-texto-secundario pb-2 border-b border-servitur-texto-secundario/15">
              <span>Evento</span>
              <span className="w-16 text-center">Sistema</span>
              <span className="w-16 text-center">Correo</span>
            </div>
            {eventosNotificacionVisibles.map((evento) => (
              <div key={evento.id} className="grid grid-cols-[1fr_auto_auto] gap-3 items-center py-2 border-b border-servitur-texto-secundario/10 last:border-0">
                <span className="text-sm text-servitur-texto">{evento.label}</span>
                <span className="w-16 flex justify-center">
                  <input
                    type="checkbox"
                    checked={notificaciones[evento.id].sistema}
                    onChange={() => alternarNotificacion(evento.id, 'sistema')}
                  />
                </span>
                <span className="w-16 flex justify-center">
                  <input
                    type="checkbox"
                    checked={notificaciones[evento.id].correo}
                    onChange={() => alternarNotificacion(evento.id, 'correo')}
                  />
                </span>
              </div>
            ))}
          </div>

          <p className="text-xs text-servitur-texto-secundario mt-3">
            El sistema todavía no envía correos ni avisos en tiempo real — esto solo guarda tu preferencia para cuando esa parte esté lista.
          </p>

          <button
            onClick={guardarNotificaciones}
            disabled={guardandoNotificaciones}
            className="mt-4 text-sm bg-servitur-azul text-white px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-60"
          >
            {guardandoNotificaciones ? 'Guardando...' : notificacionesGuardadas ? 'Guardado' : 'Guardar preferencias'}
          </button>
        </div>
        )}

        {/* Sesión y seguridad */}
        {seccionConfigPermitida(rolActualUsuario, 'sesionSeguridad') && (
        <div className="bg-servitur-tarjeta rounded-xl shadow-sm border border-servitur-texto-secundario/10 p-4 md:p-6">
          <h2 className="flex items-center gap-2 font-semibold text-servitur-texto mb-1">
            <Monitor className="w-4 h-4 text-servitur-azul" />
            Sesión y seguridad
          </h2>
          <p className="text-sm text-servitur-texto-secundario mb-4">
            Revisa dónde has iniciado sesión y ciérralas si algo se ve raro.
          </p>

          {cargandoSesiones ? (
            <p className="text-sm text-servitur-texto-secundario mb-4">Cargando...</p>
          ) : sesionesActivas.length === 0 ? (
            <p className="text-sm text-servitur-texto-secundario mb-4">No hay sesiones activas registradas.</p>
          ) : (
            <ul className="space-y-2 mb-4">
              {sesionesActivas.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 text-sm border border-servitur-texto-secundario/15 rounded-lg px-3 py-2">
                  <div>
                    <p className="text-servitur-texto">{s.dispositivo || 'Dispositivo desconocido'}</p>
                    {s.ip && <p className="text-xs text-servitur-texto-secundario">IP: {s.ip}</p>}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-servitur-texto-secundario">{formatearFechaSesion(s.creado)}</span>
                    <button
                      onClick={() => cerrarUnaSesion(s.id)}
                      disabled={cerrandoSesionId === s.id}
                      className="text-xs text-servitur-rojo hover:underline disabled:opacity-50"
                    >
                      {cerrandoSesionId === s.id ? 'Cerrando...' : 'Cerrar'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {errorSesiones && <p className="text-sm text-servitur-rojo mb-3">{errorSesiones}</p>}

          <button
            onClick={cerrarTodasLasSesiones}
            disabled={cerrandoSesiones}
            className="text-sm border border-servitur-rojo text-servitur-rojo px-4 py-2 rounded-lg hover:bg-servitur-rojo/5 disabled:opacity-60"
          >
            {cerrandoSesiones ? 'Cerrando...' : 'Cerrar sesión en todos los dispositivos'}
          </button>
        </div>
        )}

        {/* Gestión de roles — solo visible para Administrador */}
        {seccionConfigPermitida(rolActualUsuario, 'gestionRoles') && (
          <div className="bg-servitur-tarjeta rounded-xl shadow-sm border border-servitur-texto-secundario/10 p-4 md:p-6">
            <h2 className="flex items-center gap-2 font-semibold text-servitur-texto mb-1">
              <Users className="w-4 h-4 text-servitur-azul" />
              Gestión de roles
            </h2>
            <p className="text-sm text-servitur-texto-secundario mb-4">
              Cuántas cuentas hay por rol en el sistema.
            </p>

            {cargandoConteo ? (
              <p className="text-sm text-servitur-texto-secundario mb-4">Cargando...</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                {Object.entries(conteoRoles).map(([rol, cantidad]) => (
                  <div key={rol} className="border border-servitur-texto-secundario/15 rounded-lg px-3 py-2.5 text-center">
                    <p className="text-lg font-semibold text-servitur-texto">{cantidad}</p>
                    <p className="text-xs text-servitur-texto-secundario">{rol}</p>
                  </div>
                ))}
              </div>
            )}

            <Link to="/usuarios" className="text-sm text-servitur-azul hover:underline">
              Ver todos los usuarios →
            </Link>
          </div>
        )}

        {/* Apariencia */}
        {seccionConfigPermitida(rolActualUsuario, 'apariencia') && (
        <div className="bg-servitur-tarjeta rounded-xl shadow-sm border border-servitur-texto-secundario/10 p-4 md:p-6">
          <h2 className="flex items-center gap-2 font-semibold text-servitur-texto mb-4">
            <Palette className="w-4 h-4 text-servitur-azul" />
            Apariencia
          </h2>
          <div className="space-y-2">
            {TEMAS.map((t) => (
              <label
                key={t.valor}
                className="flex items-center gap-3 border border-servitur-texto-secundario/20 rounded-lg px-3 py-2.5 cursor-pointer hover:bg-servitur-fondo"
              >
                <input
                  type="radio"
                  name="tema"
                  checked={tema === t.valor}
                  onChange={() => setTema(t.valor)}
                />
                <span className="flex -space-x-1">
                  {t.colores.map((c, i) => (
                    <span
                      key={i}
                      className="w-4 h-4 rounded-full border border-servitur-texto-secundario/20"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </span>
                <span className="text-sm text-servitur-texto">{t.nombre}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-servitur-texto-secundario mt-3">
            El tema se guarda en este navegador y se aplica a todo el sistema.
          </p>
        </div>
        )}
      </div>

      <Toast toast={toast} onClose={cerrarToast} />
    </AppLayout>
  )
}