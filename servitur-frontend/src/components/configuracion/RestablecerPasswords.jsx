import { useEffect, useMemo, useState } from 'react'
import { KeyRound, Search } from 'lucide-react'
import ConfirmDialog from '../common/ConfirmDialog.jsx'
import CredencialesModal from '../common/CredencialesModal.jsx'
import { api } from '../../services/api.js'

// A quién puede restablecerle la contraseña cada rol (el backend aplica la
// misma regla; aquí solo se usa para mostrar únicamente lo que corresponde).
const ROLES_QUE_PUEDE_RESTABLECER = {
  Administrador: ['Administrador', 'Supervisor', 'Monitoreo', 'RH', 'Conductor'],
  Supervisor: ['Monitoreo', 'RH', 'Conductor'],
  RH: ['Conductor'],
}

/**
 * Sección de Configuración para ayudar a quien olvidó su contraseña:
 * genera una temporal que se muestra una sola vez.
 * Props:
 *   rol           -> rol del usuario conectado
 *   usuarioActual -> { id } del usuario conectado (para no listarse a sí mismo)
 *   mostrarToast(mensaje, tipo)
 */
export default function RestablecerPasswords({ rol, usuarioActual, mostrarToast }) {
  const [cuentas, setCuentas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [errorCarga, setErrorCarga] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [aRestablecer, setARestablecer] = useState(null)
  const [enCurso, setEnCurso] = useState(false)
  const [credenciales, setCredenciales] = useState(null)

  const rolesPermitidos = ROLES_QUE_PUEDE_RESTABLECER[rol] || []

  useEffect(() => {
    let activo = true
    async function cargar() {
      setCargando(true)
      setErrorCarga('')
      try {
        let lista
        if (rol === 'RH') {
          // RH no consulta /usuarios/; sus cuentas son las de los conductores.
          const conductores = await api.get('/conductores/')
          lista = conductores.map((c) => ({
            id: c.usuario,
            nombre: c.nombre_completo || c.usuario_username,
            usuario: c.usuario_username,
            rol: 'Conductor',
            activa: c.estatus === 'Activo',
          }))
        } else {
          const usuarios = await api.get('/usuarios/')
          lista = usuarios.map((u) => ({
            id: u.id,
            nombre: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username,
            usuario: u.username,
            rol: u.rol_nombre || 'Sin rol',
            activa: Boolean(u.is_active && u.activo),
          }))
        }
        if (activo) setCuentas(lista)
      } catch (err) {
        if (activo) setErrorCarga(err.message || 'No se pudieron cargar las cuentas.')
      } finally {
        if (activo) setCargando(false)
      }
    }
    cargar()
    return () => { activo = false }
  }, [rol])

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return cuentas
      .filter((c) => c.id !== usuarioActual?.id && rolesPermitidos.includes(c.rol))
      .filter((c) => !q || c.nombre.toLowerCase().includes(q) || c.usuario.toLowerCase().includes(q))
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
  }, [cuentas, busqueda, usuarioActual, rolesPermitidos])

  const restablecer = async () => {
    const cuenta = aRestablecer
    setARestablecer(null)
    setEnCurso(true)
    try {
      const r = await api.post(`/usuarios/${cuenta.id}/restablecer_password/`)
      setCredenciales({
        nombre: cuenta.nombre,
        usuario: r.usuario_username,
        password: r.password_temporal,
      })
    } catch (err) {
      mostrarToast(err.message || 'No se pudo restablecer la contraseña.', 'error')
    } finally {
      setEnCurso(false)
    }
  }

  return (
    <div className="bg-servitur-tarjeta rounded-xl shadow-sm border border-servitur-texto-secundario/10 p-4 md:p-6">
      <h2 className="flex items-center gap-2 font-semibold text-servitur-texto mb-1">
        <KeyRound className="w-4 h-4 text-servitur-azul" />
        Restablecer contraseñas
      </h2>
      <p className="text-sm text-servitur-texto-secundario mb-4">
        Para quien olvidó su contraseña: se genera una temporal que se muestra una sola vez y se
        cierran sus sesiones abiertas. La persona la cambia al entrar, en Configuración.
      </p>

      <div className="flex items-center gap-2 border border-servitur-texto-secundario/30 rounded-lg px-3 py-2 mb-3">
        <Search className="w-4 h-4 text-servitur-texto-secundario" />
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o usuario..."
          aria-label="Buscar cuenta"
          className="outline-none text-sm bg-transparent w-full"
        />
      </div>

      {cargando ? (
        <p className="text-sm text-servitur-texto-secundario">Cargando cuentas...</p>
      ) : errorCarga ? (
        <p className="text-sm text-servitur-rojo">{errorCarga}</p>
      ) : visibles.length === 0 ? (
        <p className="text-sm text-servitur-texto-secundario">No hay cuentas que coincidan.</p>
      ) : (
        <ul className="divide-y divide-servitur-texto-secundario/10 max-h-80 overflow-y-auto">
          {visibles.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-medium text-servitur-texto truncate">{c.nombre}</p>
                <p className="text-xs text-servitur-texto-secundario">
                  {c.usuario} · {c.rol}
                  {!c.activa && ' · Baja'}
                </p>
              </div>
              <button
                onClick={() => setARestablecer(c)}
                disabled={!c.activa || enCurso}
                title={c.activa ? '' : 'La cuenta está dada de baja'}
                className="flex items-center gap-1.5 text-xs border border-servitur-texto-secundario/30 text-servitur-texto px-3 py-1.5 rounded-lg hover:bg-servitur-fondo disabled:opacity-50 shrink-0"
              >
                <KeyRound className="w-3.5 h-3.5" /> Restablecer
              </button>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        abierto={Boolean(aRestablecer)}
        titulo="¿Restablecer la contraseña?"
        mensaje={aRestablecer ? `Se generará una contraseña temporal para ${aRestablecer.nombre} y se cerrarán sus sesiones abiertas. La contraseña actual dejará de funcionar.` : ''}
        textoConfirmar="Restablecer"
        onConfirmar={restablecer}
        onCancelar={() => setARestablecer(null)}
      />

      <CredencialesModal
        credenciales={credenciales}
        titulo={credenciales ? `Nueva contraseña de ${credenciales.nombre}` : undefined}
        onCerrar={() => setCredenciales(null)}
      />
    </div>
  )
}
