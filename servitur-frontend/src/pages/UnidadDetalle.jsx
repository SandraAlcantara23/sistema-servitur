import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Bus, User, Clock, FileDown, Pencil, X, Check } from 'lucide-react'
import AppLayout from '../components/layout/AppLayout.jsx'
import { exportarComoPDF } from '../utils/exportReports.js'
import UnidadReportePrintable from '../components/reports/UnidadReportePrintable.jsx'
import BloqueFotos from '../components/unidades/BloqueFotos.jsx'
import Toast from '../components/common/Toast.jsx'
import { useToast } from '../hooks/useToast.js'
import { useBitacora } from '../hooks/useBitacora.js'
import { api } from '../services/api.js'

const MOTIVOS_ENTREGA = ['Fin de contrato / turno', 'Renuncia', 'Despido', 'Cambio de unidad']

const CAMPOS_EDITABLES = [
  { key: 'conductorActual', label: 'Conductor', tipo: 'text', colSpan: '' },
  { key: 'domicilioConductor', label: 'Domicilio del conductor', tipo: 'text', colSpan: 'sm:col-span-2' },
  { key: 'ruta', label: 'Ruta', tipo: 'text', colSpan: '' },
  { key: 'rendimiento', label: 'Rendimiento (km/l)', tipo: 'number', colSpan: '', step: '0.1' },
  { key: 'recorrido', label: 'Recorrido (km)', tipo: 'number', colSpan: '' },
  { key: 'kilometraje', label: 'Kilometraje (km)', tipo: 'number', colSpan: '' },
]

// El backend regresa conductor_actual/domicilio_conductor/ruta_actual; aquí
// se traduce a los nombres que ya usan esta pantalla y su reporte.
function normalizar(u) {
  return {
    id: u.id,
    eco: u.eco,
    conductorActual: u.conductor_actual || '',
    domicilioConductor: u.domicilio_conductor || '',
    ruta: u.ruta_actual || '',
    rendimiento: u.rendimiento ?? 0,
    recorrido: u.recorrido ?? 0,
    kilometraje: u.kilometraje ?? 0,
    historialConductores: [],
  }
}

export default function UnidadDetalle() {
  const { eco } = useParams()
  const navigate = useNavigate()
  const [unidad, setUnidad] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [errorCarga, setErrorCarga] = useState('')
  const [editando, setEditando] = useState(false)
  const [form, setForm] = useState({})
  const [debug, setDebug] = useState(null)

  const [fotosAsignacion, setFotosAsignacion] = useState([])
  const [fechaAsignacion, setFechaAsignacion] = useState('')
  const [fotosEntrega, setFotosEntrega] = useState([])
  const [motivoEntrega, setMotivoEntrega] = useState(MOTIVOS_ENTREGA[0])
  const [fechaEntrega, setFechaEntrega] = useState('')
  const { toast, mostrarToast, cerrarToast } = useToast()
  const { registrar } = useBitacora()

  useEffect(() => {
    let activo = true
    async function cargar() {
      setCargando(true)
      setErrorCarga('')
      try {
        const data = await api.get('/unidades/')
        if (!activo) return
        const ecoBuscado = String(eco ?? '').trim()
        const encontrada = data.find((u) => String(u.eco ?? '').trim() === ecoBuscado)
        setDebug({
          ecoDeLaUrl: JSON.stringify(eco),
          totalUnidades: Array.isArray(data) ? data.length : 'NO ES ARREGLO: ' + JSON.stringify(data).slice(0, 200),
          primerosEco: Array.isArray(data) ? data.slice(0, 5).map((u) => JSON.stringify(u.eco)) : [],
        })
        setUnidad(encontrada ? normalizar(encontrada) : null)
      } catch (err) {
        if (activo) setErrorCarga(err.message || 'No se pudo cargar la unidad.')
      } finally {
        if (activo) setCargando(false)
      }
    }
    cargar()
    return () => { activo = false }
  }, [eco])

  if (cargando) {
    return (
      <AppLayout>
        <p className="text-servitur-texto-secundario">Cargando...</p>
      </AppLayout>
    )
  }

  if (errorCarga || !unidad) {
    return (
      <AppLayout>
        <p className="text-servitur-texto-secundario">{errorCarga || `No se encontró la unidad ${eco}.`}</p>
        <Link to="/unidades" className="text-servitur-azul text-sm hover:underline">
          Volver a Unidades
        </Link>
        {debug && (
          <pre className="mt-4 text-xs bg-black text-green-400 p-3 rounded-lg overflow-auto whitespace-pre-wrap">
            {JSON.stringify(debug, null, 2)}
          </pre>
        )}
      </AppLayout>
    )
  }

  const iniciarEdicion = () => {
    setForm({
      conductorActual: unidad.conductorActual,
      domicilioConductor: unidad.domicilioConductor,
      ruta: unidad.ruta,
      rendimiento: unidad.rendimiento,
      recorrido: unidad.recorrido,
      kilometraje: unidad.kilometraje,
    })
    setEditando(true)
  }

  const cancelarEdicion = () => setEditando(false)

  const guardarCambios = async (e) => {
    e.preventDefault()
    const rendimiento = Number(form.rendimiento)
    const recorrido = Number(form.recorrido)
    const kilometraje = Number(form.kilometraje)

    if (rendimiento < 0 || recorrido < 0 || kilometraje < 0) {
      mostrarToast('Ninguno de estos valores puede ser negativo.', 'error')
      return
    }

    try {
      const actualizada = normalizar(await api.patch(`/unidades/${unidad.id}/`, {
        conductor_actual: form.conductorActual,
        domicilio_conductor: form.domicilioConductor,
        ruta_actual: form.ruta,
        rendimiento,
        recorrido,
        kilometraje,
      }))
      setUnidad(actualizada)
      setEditando(false)
      mostrarToast('Datos de la unidad actualizados correctamente.')
      registrar('actualizar', 'Unidades', `Actualizó los datos de la unidad ${actualizada.eco}`)
    } catch (err) {
      mostrarToast(err.message || 'No se pudieron guardar los cambios.', 'error')
    }
  }

  return (
    <AppLayout>
      <div className="space-y-4 md:space-y-6">
        <button
          onClick={() => navigate('/unidades')}
          className="flex items-center gap-1.5 text-sm text-servitur-azul hover:underline"
        >
          <ArrowLeft className="w-4 h-4" /> Volver a Unidades
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="flex items-center gap-2 text-xl font-semibold text-servitur-texto">
            <Bus className="w-5 h-5 text-servitur-azul" />
            Unidad {unidad.eco}
          </h1>

          <div className="flex items-center gap-2">
            {!editando && (
              <button
                onClick={iniciarEdicion}
                className="flex items-center gap-1.5 text-sm border border-servitur-azul text-servitur-azul px-3 py-2 rounded-lg hover:bg-servitur-azul/5"
              >
                <Pencil className="w-4 h-4" /> Editar datos
              </button>
            )}
            <button
              onClick={() => exportarComoPDF(`reporte-unidad-${unidad.eco}.pdf`)}
              className="flex items-center gap-1.5 text-sm border border-servitur-azul text-servitur-azul px-3 py-2 rounded-lg hover:bg-servitur-azul/5"
            >
              <FileDown className="w-4 h-4" /> Reporte (PDF)
            </button>
          </div>
        </div>

        {/* Datos generales */}
        {editando ? (
          <form
            onSubmit={guardarCambios}
            className="bg-servitur-tarjeta rounded-xl shadow-sm border border-servitur-azul/40 p-4 md:p-6"
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {CAMPOS_EDITABLES.map(({ key, label, tipo, colSpan, step }) => (
                <div key={key} className={colSpan}>
                  <label className="block text-xs text-servitur-texto-secundario mb-1">{label}</label>
                  <input
                    required
                    type={tipo}
                    step={step}
                    value={form[key] ?? ''}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    className="w-full border border-servitur-texto-secundario/30 rounded-lg px-2.5 py-2 text-sm outline-none focus:border-servitur-azul"
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button
                type="button"
                onClick={cancelarEdicion}
                className="flex items-center gap-1.5 text-sm text-servitur-texto-secundario hover:underline"
              >
                <X className="w-4 h-4" /> Cancelar
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 text-sm bg-servitur-azul hover:opacity-90 text-white px-4 py-2 rounded-lg"
              >
                <Check className="w-4 h-4" /> Guardar cambios
              </button>
            </div>
          </form>
        ) : (
          <div className="bg-servitur-tarjeta rounded-xl shadow-sm border border-servitur-texto-secundario/10 p-4 md:p-6 grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-servitur-texto-secundario">Conductor</p>
              <p className="text-sm font-medium text-servitur-texto mt-0.5">{unidad.conductorActual || 'Sin asignar'}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs text-servitur-texto-secundario">Domicilio del conductor</p>
              <p className="text-sm font-medium text-servitur-texto mt-0.5">{unidad.domicilioConductor || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-servitur-texto-secundario">Ruta</p>
              <p className="text-sm font-medium text-servitur-texto mt-0.5">{unidad.ruta || 'Sin asignar'}</p>
            </div>
            <div>
              <p className="text-xs text-servitur-texto-secundario">Rendimiento</p>
              <p className="text-sm font-medium text-servitur-texto mt-0.5">{unidad.rendimiento} km/l</p>
            </div>
            <div>
              <p className="text-xs text-servitur-texto-secundario">Recorrido</p>
              <p className="text-sm font-medium text-servitur-texto mt-0.5">{unidad.recorrido} km</p>
            </div>
            <div>
              <p className="text-xs text-servitur-texto-secundario">Kilometraje</p>
              <p className="text-sm font-medium text-servitur-texto mt-0.5">
                {Number(unidad.kilometraje).toLocaleString('es-MX')} km
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Historial de conductores */}
          <div className="bg-servitur-tarjeta rounded-xl shadow-sm border border-servitur-texto-secundario/10 p-4 md:p-5 h-fit">
            <h2 className="flex items-center gap-2 font-semibold text-servitur-texto mb-3">
              <User className="w-4 h-4 text-servitur-azul" />
              Historial de conductores
            </h2>
            {unidad.historialConductores.length === 0 ? (
              <p className="text-sm text-servitur-texto-secundario">
                Todavía no se lleva un historial de asignaciones para esta unidad.
              </p>
            ) : (
              <ul className="space-y-3">
                {unidad.historialConductores.map((h, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${h.hasta ? 'bg-servitur-texto-secundario/40' : 'bg-green-500'}`} />
                    <div>
                      <p className="text-sm font-medium text-servitur-texto">
                        {h.nombre} {!h.hasta && <span className="text-xs text-green-600 font-normal">(actual)</span>}
                      </p>
                      <p className="text-xs text-servitur-texto-secundario flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        {h.desde} — {h.hasta ?? 'presente'}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Fotos: asignación inicial + entrega/devolución */}
          <div className="space-y-4 md:space-y-6">
            <BloqueFotos
              titulo="Fotos de asignación (inicio)"
              subtitulo="Evidencia de cómo se entrega la unidad al conductor al inicio de la asignación."
              fotos={fotosAsignacion}
              setFotos={setFotosAsignacion}
            >
              <div className="mb-3">
                <label className="block text-xs text-servitur-texto-secundario mb-1">Fecha de asignación</label>
                <input
                  type="date"
                  value={fechaAsignacion}
                  onChange={(e) => setFechaAsignacion(e.target.value)}
                  className="w-full sm:w-48 border border-servitur-texto-secundario/30 rounded-lg px-2.5 py-2 text-sm outline-none focus:border-servitur-azul"
                />
              </div>
            </BloqueFotos>

            <BloqueFotos
              titulo="Fotos de entrega / devolución"
              fotos={fotosEntrega}
              setFotos={setFotosEntrega}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs text-servitur-texto-secundario mb-1">Motivo</label>
                  <select
                    value={motivoEntrega}
                    onChange={(e) => setMotivoEntrega(e.target.value)}
                    className="w-full border border-servitur-texto-secundario/30 rounded-lg px-2.5 py-2 text-sm outline-none focus:border-servitur-azul"
                  >
                    {MOTIVOS_ENTREGA.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-servitur-texto-secundario mb-1">Fecha de entrega</label>
                  <input
                    type="date"
                    value={fechaEntrega}
                    onChange={(e) => setFechaEntrega(e.target.value)}
                    className="w-full border border-servitur-texto-secundario/30 rounded-lg px-2.5 py-2 text-sm outline-none focus:border-servitur-azul"
                  />
                </div>
              </div>
            </BloqueFotos>
          </div>
        </div>
      </div>

      {/* Área imprimible — invisible en pantalla, solo aparece al generar el PDF */}
      <div className="print-area">
        <UnidadReportePrintable
          unidad={unidad}
          asignacion={{ fecha: fechaAsignacion, fotos: fotosAsignacion }}
          entrega={{ fecha: fechaEntrega, motivo: motivoEntrega, fotos: fotosEntrega }}
        />
      </div>

      <Toast toast={toast} onClose={cerrarToast} />
    </AppLayout>
  )
}