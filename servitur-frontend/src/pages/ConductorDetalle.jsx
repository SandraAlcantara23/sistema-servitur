import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, User, Phone, MapPin, CreditCard, Bus, FileDown, ClipboardList, AlertTriangle, Pencil, Check } from 'lucide-react'
import AppLayout from '../components/layout/AppLayout.jsx'
import { exportarComoPDF } from '../utils/exportReports.js'
import ConductorReportePrintable from '../components/reports/ConductorReportePrintable.jsx'
import Toast from '../components/common/Toast.jsx'
import { useToast } from '../hooks/useToast.js'
import { useBitacora } from '../hooks/useBitacora.js'
import { api } from '../services/api.js'

const ESTATUS_STYLES = {
  Activo: 'bg-green-100 text-green-700',
  Baja: 'bg-gray-100 text-gray-500',
}

const PERMISO_ESTATUS_STYLES = {
  Pendiente: 'bg-amber-100 text-amber-700',
  Aprobado: 'bg-green-100 text-green-700',
  Rechazado: 'bg-red-100 text-red-700',
}

const TIPO_PERMISO_LABELS = { personal: 'Permiso personal', oficio: 'Oficio de comisión' }
const ESTADO_PERMISO_LABELS = { pendiente: 'Pendiente', autorizado: 'Aprobado', rechazado: 'Rechazado' }
const TIPO_INCIDENCIA_LABELS = {
  retraso: 'Retraso', falla_mecanica: 'Falla mecánica',
  accidente_menor: 'Accidente menor', queja_cliente: 'Queja de cliente',
}

function normalizarConductor(c) {
  return {
    id: c.id,
    nombre: c.nombre_completo,
    telefono: c.telefono || '',
    domicilio: c.domicilio || '',
    licencia: c.estatus_licencia || 'Vigente',
    licenciaNumero: c.licencia,
    vigenciaLicencia: c.vigencia_licencia || '',
    unidadAsignada: c.unidad_asignada_eco || '',
    unidadAsignadaId: c.unidad_asignada || '',
    estatus: c.estatus,
  }
}

export default function ConductorDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [conductor, setConductor] = useState(null)
  const [unidades, setUnidades] = useState([])
  const [permisos, setPermisos] = useState([])
  const [incidencias, setIncidencias] = useState([])
  const [cargando, setCargando] = useState(true)
  const [errorCarga, setErrorCarga] = useState('')
  const [editando, setEditando] = useState(false)
  const [datos, setDatos] = useState({})
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const { toast, mostrarToast, cerrarToast } = useToast()
  const { registrar } = useBitacora()

  useEffect(() => {
    let activo = true
    async function cargar() {
      setCargando(true)
      setErrorCarga('')
      try {
        const [c, unidadesData, permisosData, incidenciasData] = await Promise.all([
          api.get(`/conductores/${id}/`),
          api.get('/unidades/'),
          api.get('/permisos/'),
          api.get('/incidencias/'),
        ])
        if (!activo) return
        const normalizado = normalizarConductor(c)
        setConductor(normalizado)
        setDatos(normalizado)
        setUnidades(unidadesData)
        setPermisos(permisosData.filter((p) => String(p.conductor) === String(id)))
        setIncidencias(incidenciasData.filter((inc) => String(inc.conductor) === String(id)))
      } catch (err) {
        if (activo) setErrorCarga(err.message || 'No se pudo cargar el conductor.')
      } finally {
        if (activo) setCargando(false)
      }
    }
    cargar()
    return () => { activo = false }
  }, [id])

  if (cargando) {
    return (
      <AppLayout>
        <p className="text-servitur-texto-secundario">Cargando...</p>
      </AppLayout>
    )
  }

  if (errorCarga || !conductor) {
    return (
      <AppLayout>
        <p className="text-servitur-rojo">{errorCarga || 'No se encontró el conductor.'}</p>
        <Link to="/usuarios" className="text-servitur-azul text-sm hover:underline">
          Volver a Usuarios
        </Link>
      </AppLayout>
    )
  }

  const guardarCambios = async () => {
    if (datos.telefono && datos.telefono.replace(/\D/g, '').length !== 10) {
      setError('El teléfono debe tener 10 dígitos.')
      return
    }
    setError('')
    setGuardando(true)
    try {
      const actualizado = await api.patch(`/conductores/${id}/`, {
        telefono: datos.telefono,
        domicilio: datos.domicilio,
        vigencia_licencia: datos.vigenciaLicencia,
        unidad_asignada: datos.unidadAsignadaId || null,
        estatus: datos.estatus,
      })
      const normalizado = normalizarConductor(actualizado)
      setConductor(normalizado)
      setDatos(normalizado)
      setEditando(false)
      mostrarToast('Datos del conductor actualizados correctamente.')
      registrar('actualizar', 'Conductores', `Actualizó los datos de ${normalizado.nombre}`)
    } catch (err) {
      setError(err.message || 'No se pudieron guardar los cambios.')
    } finally {
      setGuardando(false)
    }
  }

  const actualizarCampo = (campo, valor) => setDatos((prev) => ({ ...prev, [campo]: valor }))

  return (
    <AppLayout>
      <div className="space-y-4 md:space-y-6">
        <button
          onClick={() => navigate('/usuarios')}
          className="flex items-center gap-1.5 text-sm text-servitur-azul hover:underline"
        >
          <ArrowLeft className="w-4 h-4" /> Volver a Usuarios
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="flex items-center gap-2 text-xl font-semibold text-servitur-texto">
            <User className="w-5 h-5 text-servitur-azul" />
            {conductor.nombre}
            <span className={`ml-1 px-2.5 py-1 rounded-full text-xs font-medium ${ESTATUS_STYLES[datos.estatus]}`}>
              {datos.estatus}
            </span>
          </h1>

          <div className="flex items-center gap-2">
            {editando ? (
              <button
                onClick={guardarCambios}
                disabled={guardando}
                className="flex items-center gap-1.5 text-sm bg-servitur-azul text-white px-3 py-2 rounded-lg hover:opacity-90 disabled:opacity-60"
              >
                <Check className="w-4 h-4" /> {guardando ? 'Guardando...' : 'Guardar cambios'}
              </button>
            ) : (
              <button
                onClick={() => setEditando(true)}
                className="flex items-center gap-1.5 text-sm border border-servitur-texto-secundario/30 text-servitur-texto px-3 py-2 rounded-lg hover:bg-servitur-fondo"
              >
                <Pencil className="w-4 h-4" /> Editar
              </button>
            )}
            <button
              onClick={() => exportarComoPDF(`reporte-${conductor.nombre.replace(/\s+/g, '-')}.pdf`)}
              className="flex items-center gap-1.5 text-sm border border-servitur-azul text-servitur-azul px-3 py-2 rounded-lg hover:bg-servitur-azul/5"
            >
              <FileDown className="w-4 h-4" /> Descargar reporte (PDF)
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-servitur-rojo -mt-2">{error}</p>}

        <div className="bg-servitur-tarjeta rounded-xl shadow-sm border border-servitur-texto-secundario/10 p-4 md:p-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="sm:col-span-2">
            <p className="text-xs text-servitur-texto-secundario flex items-center gap-1"><MapPin className="w-3 h-3" /> Domicilio</p>
            {editando ? (
              <input
                type="text"
                value={datos.domicilio}
                onChange={(e) => actualizarCampo('domicilio', e.target.value)}
                className="w-full mt-0.5 border border-servitur-texto-secundario/30 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-servitur-azul"
              />
            ) : (
              <p className="text-sm font-medium text-servitur-texto mt-0.5">{datos.domicilio || '—'}</p>
            )}
          </div>
          <div>
            <p className="text-xs text-servitur-texto-secundario flex items-center gap-1"><Phone className="w-3 h-3" /> Teléfono</p>
            {editando ? (
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                value={datos.telefono}
                onChange={(e) => actualizarCampo('telefono', e.target.value.replace(/\D/g, ''))}
                className="w-full mt-0.5 border border-servitur-texto-secundario/30 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-servitur-azul"
              />
            ) : (
              <p className="text-sm font-medium text-servitur-texto mt-0.5">{datos.telefono || '—'}</p>
            )}
          </div>
          <div>
            <p className="text-xs text-servitur-texto-secundario flex items-center gap-1"><CreditCard className="w-3 h-3" /> Licencia</p>
            {editando ? (
              <input
                type="date"
                value={datos.vigenciaLicencia}
                onChange={(e) => actualizarCampo('vigenciaLicencia', e.target.value)}
                className="w-full mt-0.5 border border-servitur-texto-secundario/30 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-servitur-azul"
              />
            ) : (
              <p className="text-sm font-medium text-servitur-texto mt-0.5">
                {datos.licencia} <span className="text-xs text-servitur-texto-secundario">({datos.licenciaNumero}, vence {datos.vigenciaLicencia})</span>
              </p>
            )}
          </div>
          <div>
            <p className="text-xs text-servitur-texto-secundario flex items-center gap-1"><Bus className="w-3 h-3" /> Unidad asignada</p>
            {editando ? (
              <select
                value={datos.unidadAsignadaId || ''}
                onChange={(e) => actualizarCampo('unidadAsignadaId', e.target.value)}
                className="w-full mt-0.5 border border-servitur-texto-secundario/30 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-servitur-azul"
              >
                <option value="">Sin unidad asignada</option>
                {unidades.map((u) => (
                  <option key={u.id} value={u.id}>{u.eco}</option>
                ))}
              </select>
            ) : datos.unidadAsignada ? (
              <p className="text-sm font-medium text-servitur-azul mt-0.5">{datos.unidadAsignada}</p>
            ) : (
              <p className="text-sm text-servitur-texto-secundario mt-0.5">Sin unidad asignada</p>
            )}
          </div>
          {editando && (
            <div>
              <p className="text-xs text-servitur-texto-secundario">Estatus</p>
              <select
                value={datos.estatus}
                onChange={(e) => actualizarCampo('estatus', e.target.value)}
                className="w-full mt-0.5 border border-servitur-texto-secundario/30 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-servitur-azul"
              >
                <option>Activo</option>
                <option>Baja</option>
              </select>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <div className="bg-servitur-tarjeta rounded-xl shadow-sm border border-servitur-texto-secundario/10 p-4 md:p-5">
            <h2 className="flex items-center gap-2 font-semibold text-servitur-texto mb-3">
              <ClipboardList className="w-4 h-4 text-servitur-azul" />
              Permisos y oficios
            </h2>
            {permisos.length === 0 ? (
              <p className="text-sm text-servitur-texto-secundario">Sin solicitudes registradas.</p>
            ) : (
              <ul className="space-y-3">
                {permisos.map((p) => (
                  <li key={p.id} className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-servitur-texto">{TIPO_PERMISO_LABELS[p.tipo] || p.tipo}</p>
                      <p className="text-xs text-servitur-texto-secundario">{p.fecha_inicio} — {p.fecha_fin} · {p.motivo}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium shrink-0 ${PERMISO_ESTATUS_STYLES[ESTADO_PERMISO_LABELS[p.estado] || p.estado]}`}>
                      {ESTADO_PERMISO_LABELS[p.estado] || p.estado}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-servitur-tarjeta rounded-xl shadow-sm border border-servitur-texto-secundario/10 p-4 md:p-5">
            <h2 className="flex items-center gap-2 font-semibold text-servitur-texto mb-3">
              <AlertTriangle className="w-4 h-4 text-servitur-azul" />
              Incidencias
            </h2>
            {incidencias.length === 0 ? (
              <p className="text-sm text-servitur-texto-secundario">Sin incidencias registradas.</p>
            ) : (
              <ul className="space-y-3">
                {incidencias.map((inc) => (
                  <li key={inc.id}>
                    <p className="text-sm font-medium text-servitur-texto">
                      {TIPO_INCIDENCIA_LABELS[inc.tipo] || inc.tipo} <span className="text-xs text-servitur-texto-secundario font-normal">— Unidad {inc.unidad_eco}</span>
                    </p>
                    <p className="text-xs text-servitur-texto-secundario">{inc.fecha} · {inc.descripcion}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="print-area">
        <ConductorReportePrintable
          conductor={conductor}
          permisos={permisos}
          incidencias={incidencias}
        />
      </div>

      <Toast toast={toast} onClose={cerrarToast} />
    </AppLayout>
  )
}