import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  User, Camera, Upload, Phone, MapPin, Check,
  Bus, ClipboardList, FileBarChart, UserCog, Clock, Users,
} from 'lucide-react'
import AppLayout from '../components/layout/AppLayout.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../services/api.js'

const DESCRIPCION_ROL = {
  Administrador: 'Acceso total a unidades, operaciones, reportes, permisos, conductores y configuración del sistema.',
  Supervisor: 'Mismo acceso que Administrador, salvo la gestión de roles y el código de autorización de Supervisor en Configuración.',
  Monitoreo: 'Da seguimiento a las unidades, registra el aforo por ruta y consulta reportes y conductores.',
  RH: 'Gestiona permisos y oficios de los conductores, y consulta sus datos de contacto.',
  Conductor: 'Registra el aforo de su unidad y puede solicitar y consultar sus propios permisos.',
}

const ACCESOS_POR_ROL = {
  Administrador: [
    { label: 'Unidades', to: '/unidades', icon: Bus },
    { label: 'Aforo', to: '/operaciones', icon: Users },
    { label: 'Reportes', to: '/reportes', icon: FileBarChart },
    { label: 'Permisos', to: '/permisos', icon: ClipboardList },
    { label: 'Conductores', to: '/usuarios', icon: UserCog },
  ],
  Supervisor: [
    { label: 'Unidades', to: '/unidades', icon: Bus },
    { label: 'Aforo', to: '/operaciones', icon: Users },
    { label: 'Reportes', to: '/reportes', icon: FileBarChart },
    { label: 'Permisos', to: '/permisos', icon: ClipboardList },
    { label: 'Conductores', to: '/usuarios', icon: UserCog },
  ],
  Monitoreo: [
    { label: 'Unidades', to: '/unidades', icon: Bus },
    { label: 'Aforo', to: '/operaciones', icon: Users },
    { label: 'Reportes', to: '/reportes', icon: FileBarChart },
    { label: 'Conductores', to: '/usuarios', icon: UserCog },
  ],
  RH: [
    { label: 'Permisos pendientes', to: '/permisos', icon: ClipboardList },
    { label: 'Conductores', to: '/usuarios', icon: UserCog },
  ],
  Conductor: [
    { label: 'Aforo por ruta', to: '/operaciones', icon: Users },
    { label: 'Mis permisos', to: '/permisos', icon: ClipboardList },
  ],
}

const ACCION_LABELS = {
  crear: 'Creó',
  actualizar: 'Actualizó',
  eliminar: 'Eliminó',
  autorizar: 'Aprobó',
  rechazar: 'Rechazó',
  iniciar_sesion: 'Inició sesión',
  registrar_cuenta: 'Registró cuenta',
}

// El backend regresa accion/modulo/entidad_afectada por separado; aquí se
// arma una sola línea legible para la lista de "Actividad reciente".
function normalizarEvento(ev) {
  const accion = ACCION_LABELS[ev.accion] ?? ev.accion
  const detalle = ev.modulo ? `${accion} · ${ev.modulo} — ${ev.entidad_afectada}` : `${accion} — ${ev.entidad_afectada}`
  return { id: ev.id, usuarioId: ev.usuario, detalle, fecha: ev.fecha }
}

function tiempoRelativo(fechaISO) {
  const diffMs = Date.now() - new Date(fechaISO).getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'justo ahora'
  if (diffMin < 60) return `hace ${diffMin} min`
  const diffHoras = Math.floor(diffMin / 60)
  if (diffHoras < 24) return `hace ${diffHoras} h`
  const diffDias = Math.floor(diffHoras / 24)
  if (diffDias === 1) return 'hace 1 día'
  return `hace ${diffDias} días`
}

export default function MiPerfil() {
  const { sesion, actualizarSesion } = useAuth()
  const usuarioActual = {
    nombre: sesion?.nombre ?? 'Usuario',
    rol: sesion?.rol ?? '',
    miembroDesde: sesion?.miembro_desde ?? '—',
  }

  const [telefono, setTelefono] = useState(sesion?.telefono ?? '')
  const [domicilio, setDomicilio] = useState(sesion?.domicilio ?? '')
  const [guardado, setGuardado] = useState(false)
  const [guardandoContacto, setGuardandoContacto] = useState(false)
  const [errorContacto, setErrorContacto] = useState('')
  const [subiendoFoto, setSubiendoFoto] = useState(false)
  const [errorFoto, setErrorFoto] = useState('')
  const fileInputRef = useRef(null)
  const cameraInputRef = useRef(null)

  const [actividadReciente, setActividadReciente] = useState([])
  const [cargandoActividad, setCargandoActividad] = useState(true)

  useEffect(() => {
    let activo = true
    api.get('/bitacora/')
      .then((eventos) => {
        if (!activo) return
        const propios = eventos
          .filter((ev) => ev.usuario === sesion?.id)
          .slice(0, 5)
          .map(normalizarEvento)
        setActividadReciente(propios)
      })
      .catch(() => { if (activo) setActividadReciente([]) })
      .finally(() => { if (activo) setCargandoActividad(false) })
    return () => { activo = false }
  }, [sesion?.id])

  const handleFoto = async (e) => {
    const archivo = e.target.files[0]
    e.target.value = ''
    if (!archivo || !sesion?.id) return

    setErrorFoto('')
    setSubiendoFoto(true)
    try {
      const form = new FormData()
      form.append('foto', archivo)
      const actualizado = await api.patch(`/usuarios/${sesion.id}/`, form)
      actualizarSesion({ foto_url: actualizado.foto_url })
    } catch (err) {
      setErrorFoto(err.message || 'No se pudo actualizar la foto.')
    } finally {
      setSubiendoFoto(false)
    }
  }

  const guardarDatosContacto = async () => {
    if (telefono && telefono.length !== 10) {
      setErrorContacto('El teléfono debe tener 10 dígitos.')
      return
    }
    setErrorContacto('')
    if (!sesion?.id) return
    setGuardandoContacto(true)
    try {
      const actualizado = await api.patch(`/usuarios/${sesion.id}/`, { telefono, domicilio })
      actualizarSesion({ telefono: actualizado.telefono, domicilio: actualizado.domicilio })
      setGuardado(true)
      setTimeout(() => setGuardado(false), 1500)
    } catch (err) {
      setErrorContacto(err.message || 'No se pudieron guardar los datos de contacto.')
    } finally {
      setGuardandoContacto(false)
    }
  }

  const accesos = ACCESOS_POR_ROL[usuarioActual.rol] ?? []

  return (
    <AppLayout>
      <div className="max-w-lg mx-auto space-y-4 md:space-y-6">
        <h1 className="flex items-center gap-2 text-xl font-semibold text-servitur-texto">
          <User className="w-5 h-5 text-servitur-azul" />
          Mi perfil
        </h1>

        {/* Encabezado con foto */}
        <div className="bg-servitur-tarjeta rounded-xl shadow-sm border border-servitur-texto-secundario/10 p-6">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              {sesion?.foto_url ? (
                <img src={sesion.foto_url} alt="Foto de perfil" className="w-16 h-16 rounded-full object-cover" />
              ) : (
                <span className="w-16 h-16 rounded-full bg-servitur-azul flex items-center justify-center text-white">
                  <User className="w-8 h-8" />
                </span>
              )}
            </div>
            <div>
              <p className="text-lg font-medium text-servitur-texto">{usuarioActual.nombre}</p>
              <p className="text-sm text-servitur-texto-secundario">{usuarioActual.rol}</p>
              <p className="text-xs text-servitur-texto-secundario flex items-center gap-1 mt-0.5">
                <Clock className="w-3 h-3" /> Miembro desde {usuarioActual.miembroDesde}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={subiendoFoto}
              className="flex items-center gap-1.5 text-xs border border-servitur-texto-secundario/30 px-3 py-1.5 rounded-lg hover:bg-servitur-fondo disabled:opacity-50"
            >
              <Upload className="w-3.5 h-3.5" /> {subiendoFoto ? 'Subiendo...' : 'Subir foto'}
            </button>
            <button
              onClick={() => cameraInputRef.current?.click()}
              disabled={subiendoFoto}
              className="flex items-center gap-1.5 text-xs border border-servitur-texto-secundario/30 px-3 py-1.5 rounded-lg hover:bg-servitur-fondo disabled:opacity-50"
            >
              <Camera className="w-3.5 h-3.5" /> Tomar foto (móvil)
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFoto} className="hidden" />
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFoto} className="hidden" />
          </div>
          {errorFoto && <p className="text-sm text-servitur-rojo mt-2">{errorFoto}</p>}
        </div>

        {/* Descripción del rol */}
        <div className="bg-servitur-tarjeta rounded-xl shadow-sm border border-servitur-texto-secundario/10 p-4 md:p-5">
          <h2 className="font-semibold text-servitur-texto mb-1.5">Tu rol: {usuarioActual.rol}</h2>
          <p className="text-sm text-servitur-texto-secundario">
            {DESCRIPCION_ROL[usuarioActual.rol] ?? 'Sin descripción disponible para este rol.'}
          </p>
        </div>

        {/* Datos de contacto */}
        <div className="bg-servitur-tarjeta rounded-xl shadow-sm border border-servitur-texto-secundario/10 p-4 md:p-5">
          <h2 className="font-semibold text-servitur-texto mb-3">Datos de contacto</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-servitur-texto-secundario mb-1 flex items-center gap-1">
                <Phone className="w-3 h-3" /> Teléfono
              </label>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                value={telefono}
                onChange={(e) => setTelefono(e.target.value.replace(/\D/g, ''))}
                placeholder="10 dígitos"
                className="w-full border border-servitur-texto-secundario/30 rounded-lg px-3 py-2 text-sm outline-none focus:border-servitur-azul"
              />
            </div>
            <div>
              <label className="block text-xs text-servitur-texto-secundario mb-1 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Domicilio
              </label>
              <input
                type="text"
                value={domicilio}
                onChange={(e) => setDomicilio(e.target.value)}
                placeholder="Calle, número, colonia, municipio"
                className="w-full border border-servitur-texto-secundario/30 rounded-lg px-3 py-2 text-sm outline-none focus:border-servitur-azul"
              />
            </div>
          </div>
          {errorContacto && <p className="text-sm text-servitur-rojo mt-3">{errorContacto}</p>}
          <button
            onClick={guardarDatosContacto}
            disabled={guardandoContacto}
            className="mt-4 flex items-center gap-1.5 text-sm bg-servitur-azul text-white px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-60"
          >
            {guardado ? <Check className="w-4 h-4" /> : null}
            {guardandoContacto ? 'Guardando...' : guardado ? 'Guardado' : 'Guardar cambios'}
          </button>
        </div>

        {/* Accesos rápidos según el rol */}
        <div className="bg-servitur-tarjeta rounded-xl shadow-sm border border-servitur-texto-secundario/10 p-4 md:p-5">
          <h2 className="font-semibold text-servitur-texto mb-3">Accesos rápidos</h2>
          <div className="grid grid-cols-2 gap-3">
            {accesos.map(({ label, to, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="flex items-center gap-2 border border-servitur-texto-secundario/20 rounded-lg px-3 py-2.5 text-sm text-servitur-texto hover:bg-servitur-fondo"
              >
                <Icon className="w-4 h-4 text-servitur-azul shrink-0" />
                {label}
              </Link>
            ))}
          </div>
        </div>

        {/* Actividad reciente */}
        <div className="bg-servitur-tarjeta rounded-xl shadow-sm border border-servitur-texto-secundario/10 p-4 md:p-5">
          <h2 className="font-semibold text-servitur-texto mb-3">Actividad reciente</h2>
          {cargandoActividad ? (
            <p className="text-sm text-servitur-texto-secundario">Cargando...</p>
          ) : actividadReciente.length === 0 ? (
            <p className="text-sm text-servitur-texto-secundario">
              Todavía no tienes actividad registrada.
            </p>
          ) : (
            <ul className="space-y-3">
              {actividadReciente.map((ev) => (
                <li key={ev.id} className="text-sm">
                  <p className="text-servitur-texto">{ev.detalle}</p>
                  <p className="text-xs text-servitur-texto-secundario">{tiempoRelativo(ev.fecha)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="text-sm text-servitur-texto-secundario">
          Para cambiar tu contraseña, correo o nombre de usuario, ve a{' '}
          <Link to="/configuracion" className="text-servitur-azul font-medium hover:underline">
            Configuración
          </Link>.
        </p>
      </div>
    </AppLayout>
  )
}