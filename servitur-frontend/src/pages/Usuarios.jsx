import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bus, FileDown, Search, Pencil, Check, X } from 'lucide-react'
import AppLayout from '../components/layout/AppLayout.jsx'
import { exportarComoPDF } from '../utils/exportReports.js'
import UnidadReportePrintable from '../components/reports/UnidadReportePrintable.jsx'
import RendimientoGeneralPrintable from '../components/reports/RendimientoGeneralPrintable.jsx'
import EmptyState from '../components/common/EmptyState.jsx'
import Toast from '../components/common/Toast.jsx'
import { useToast } from '../hooks/useToast.js'
import { useBitacora } from '../hooks/useBitacora.js'
import { api } from '../services/api.js'

// El backend regresa conductor_actual/domicilio_conductor/ruta_actual; aquí
// se traduce a los nombres que ya usan la tabla y los reportes de esta
// pantalla.
function normalizar(u) {
  return {
    id: u.id,
    eco: u.eco,
    conductorActual: u.conductor_actual || 'Sin asignar',
    domicilioConductor: u.domicilio_conductor || '—',
    ruta: u.ruta_actual || 'Sin asignar',
    rendimiento: u.rendimiento ?? 0,
    recorrido: u.recorrido ?? 0,
    kilometraje: u.kilometraje ?? 0,
  }
}

export default function Unidades() {
  const [busqueda, setBusqueda] = useState('')
  const [unidades, setUnidades] = useState([])
  const [cargando, setCargando] = useState(true)
  const [errorCarga, setErrorCarga] = useState('')
  const [unidadParaPDF, setUnidadParaPDF] = useState(null)
  const [modoResumenGeneral, setModoResumenGeneral] = useState(false)
  const [editandoId, setEditandoId] = useState(null)
  const [form, setForm] = useState({})
  const navigate = useNavigate()
  const { toast, mostrarToast, cerrarToast } = useToast()
  const { registrar } = useBitacora()

  useEffect(() => {
    let activo = true
    async function cargar() {
      setCargando(true)
      setErrorCarga('')
      try {
        const data = await api.get('/unidades/')
        if (activo) setUnidades(data.map(normalizar))
      } catch (err) {
        if (activo) setErrorCarga(err.message || 'No se pudieron cargar las unidades.')
      } finally {
        if (activo) setCargando(false)
      }
    }
    cargar()
    return () => { activo = false }
  }, [])

  const filtradas = unidades.filter((u) => u.eco.includes(busqueda.trim()))

  const iniciarEdicion = (u, e) => {
    e.stopPropagation()
    setForm({ rendimiento: u.rendimiento, recorrido: u.recorrido, kilometraje: u.kilometraje })
    setEditandoId(u.id)
  }

  const cancelarEdicion = (e) => {
    e.stopPropagation()
    setEditandoId(null)
  }

  const guardarCambios = async (u, e) => {
    e.stopPropagation()
    const rendimiento = Number(form.rendimiento)
    const recorrido = Number(form.recorrido)
    const kilometraje = Number(form.kilometraje)

    if (rendimiento < 0 || recorrido < 0 || kilometraje < 0) {
      mostrarToast('Ninguno de estos valores puede ser negativo.', 'error')
      return
    }

    try {
      const actualizado = normalizar(await api.patch(`/unidades/${u.id}/`, { rendimiento, recorrido, kilometraje }))
      setUnidades((prev) => prev.map((x) => (x.id === u.id ? actualizado : x)))
      setEditandoId(null)
      mostrarToast('Datos de la unidad actualizados correctamente.')
      registrar('actualizar', 'Unidades', `Actualizó unidad ${u.eco} (rendimiento ${rendimiento} km/l, recorrido ${recorrido} km, kilometraje ${kilometraje} km)`)
    } catch (err) {
      mostrarToast(err.message || 'No se pudieron guardar los cambios.', 'error')
    }
  }

  const descargarReporteUnidad = (unidad) => {
    setModoResumenGeneral(false)
    setUnidadParaPDF(unidad)
    setTimeout(() => exportarComoPDF('reporte-unidad-' + unidad.eco + '.pdf'), 50)
  }

  const descargarRendimientoPDF = () => {
    setUnidadParaPDF(null)
    setModoResumenGeneral(true)
    setTimeout(() => exportarComoPDF('rendimiento-general-flotilla.pdf'), 50)
  }

  return (
    <AppLayout>
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-semibold text-servitur-texto">
              <Bus className="w-5 h-5 text-servitur-azul" />
              Unidades ({unidades.length})
            </h1>
            <p className="text-sm text-servitur-texto-secundario mt-0.5">
              Catálogo de la flotilla. Descarga el reporte general o el cálculo de rendimiento de cada unidad.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 border border-servitur-texto-secundario/30 rounded-lg px-3 py-2 bg-servitur-tarjeta">
              <Search className="w-4 h-4 text-servitur-texto-secundario" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por ECO..."
                className="outline-none text-sm bg-transparent w-32"
              />
            </div>
            <button
              onClick={descargarRendimientoPDF}
              className="flex items-center gap-1.5 text-sm bg-servitur-azul text-white px-3 py-2 rounded-lg hover:opacity-90"
            >
              <FileDown className="w-4 h-4" />
              Rendimiento general (PDF)
            </button>
          </div>
        </div>

        {errorCarga && (
          <div className="text-sm text-servitur-rojo bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {errorCarga}
          </div>
        )}

        <div className="bg-servitur-tarjeta rounded-xl shadow-sm border border-servitur-texto-secundario/10 overflow-x-auto">
          {cargando ? (
            <p className="text-sm text-servitur-texto-secundario p-6 text-center">Cargando unidades...</p>
          ) : filtradas.length === 0 ? (
            <EmptyState
              titulo="No se encontraron unidades"
              descripcion={'No hay ninguna unidad con el ECO "' + busqueda + '".'}
              onLimpiar={() => setBusqueda('')}
            />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-servitur-texto-secundario border-b border-servitur-texto-secundario/15">
                  <th className="font-medium py-3 px-4">Unidad (ECO)</th>
                  <th className="font-medium py-3 px-2">Conductor</th>
                  <th className="font-medium py-3 px-2 hidden lg:table-cell">Domicilio del conductor</th>
                  <th className="font-medium py-3 px-2 hidden sm:table-cell">Ruta</th>
                  <th className="font-medium py-3 px-2">Rendimiento</th>
                  <th className="font-medium py-3 px-2 hidden md:table-cell">Recorrido</th>
                  <th className="font-medium py-3 px-2 hidden md:table-cell">Kilometraje</th>
                  <th className="font-medium py-3 px-4">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map((u) => {
                  const enEdicion = editandoId === u.id
                  return (
                    <tr
                      key={u.id}
                      onClick={() => !enEdicion && navigate('/unidades/' + u.eco)}
                      className={`border-b border-servitur-texto-secundario/10 last:border-0 hover:bg-servitur-fondo ${
                        enEdicion ? '' : 'cursor-pointer'
                      }`}
                    >
                      <td className="py-2.5 px-4 font-medium text-servitur-texto">{u.eco}</td>
                      <td className="py-2.5 px-2 text-servitur-texto">{u.conductorActual}</td>
                      <td className="py-2.5 px-2 text-servitur-texto-secundario hidden lg:table-cell">{u.domicilioConductor}</td>
                      <td className="py-2.5 px-2 text-servitur-texto-secundario hidden sm:table-cell">{u.ruta}</td>
                      <td className="py-2.5 px-2 text-servitur-texto-secundario">
                        {enEdicion ? (
                          <input
                            type="number"
                            step="0.1"
                            value={form.rendimiento}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => setForm({ ...form, rendimiento: e.target.value })}
                            className="w-16 border border-servitur-azul/40 rounded px-1.5 py-1 text-sm outline-none focus:border-servitur-azul"
                          />
                        ) : (
                          `${u.rendimiento} km/l`
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-servitur-texto-secundario hidden md:table-cell">
                        {enEdicion ? (
                          <input
                            type="number"
                            value={form.recorrido}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => setForm({ ...form, recorrido: e.target.value })}
                            className="w-20 border border-servitur-azul/40 rounded px-1.5 py-1 text-sm outline-none focus:border-servitur-azul"
                          />
                        ) : (
                          `${u.recorrido} km`
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-servitur-texto-secundario hidden md:table-cell">
                        {enEdicion ? (
                          <input
                            type="number"
                            value={form.kilometraje}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => setForm({ ...form, kilometraje: e.target.value })}
                            className="w-24 border border-servitur-azul/40 rounded px-1.5 py-1 text-sm outline-none focus:border-servitur-azul"
                          />
                        ) : (
                          `${Number(u.kilometraje).toLocaleString('es-MX')} km`
                        )}
                      </td>
                      <td className="py-2.5 px-4" onClick={(e) => e.stopPropagation()}>
                        {enEdicion ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => guardarCambios(u, e)}
                              title="Guardar cambios"
                              className="flex items-center gap-1 text-xs text-green-700 hover:underline"
                            >
                              <Check className="w-3.5 h-3.5" /> Guardar
                            </button>
                            <button
                              onClick={cancelarEdicion}
                              title="Cancelar"
                              className="flex items-center gap-1 text-xs text-servitur-texto-secundario hover:underline"
                            >
                              <X className="w-3.5 h-3.5" /> Cancelar
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <button
                              onClick={(e) => iniciarEdicion(u, e)}
                              title="Editar rendimiento, recorrido y kilometraje"
                              className="flex items-center gap-1 text-xs text-servitur-azul hover:underline"
                            >
                              <Pencil className="w-3.5 h-3.5" /> Editar
                            </button>
                            <button
                              onClick={() => descargarReporteUnidad(u)}
                              title="Descargar reporte general en PDF"
                              className="flex items-center gap-1 text-xs text-servitur-azul hover:underline"
                            >
                              <FileDown className="w-3.5 h-3.5" /> PDF
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="print-area">
        {modoResumenGeneral ? (
          <RendimientoGeneralPrintable unidades={unidades} />
        ) : (
          unidadParaPDF && <UnidadReportePrintable unidad={unidadParaPDF} />
        )}
      </div>

      <Toast toast={toast} onClose={cerrarToast} />
    </AppLayout>
  )
}