import { useEffect, useState } from 'react'
import { Users, Plus, Search, Pencil, Trash2, X, Check, ImageOff, FileDown, FileSpreadsheet } from 'lucide-react'
import AppLayout from '../components/layout/AppLayout.jsx'
import EmptyState from '../components/common/EmptyState.jsx'
import ConfirmDialog from '../components/common/ConfirmDialog.jsx'
import Toast from '../components/common/Toast.jsx'
import { useToast } from '../hooks/useToast.js'
import AforoReportePrintable from '../components/reports/AforoReportePrintable.jsx'
import { exportarComoPDF, exportarAforoAExcel } from '../utils/exportReports.js'
import { useBitacora } from '../hooks/useBitacora.js'
import { api } from '../services/api.js'

const FORM_VACIO = { fecha: '', ruta: '', turno: '', pasajeros_ida: '', pasajeros_vuelta: '', foto: null }
const MES_ACTUAL = new Date().toISOString().slice(0, 7)

function extraerMensajeError(err) {
  const texto = err.message || 'No se pudo completar la operación.'
  try {
    const datos = JSON.parse(texto)
    if (datos.non_field_errors) {
      return 'Ya existe un registro de aforo para esa ruta, turno y fecha. Edítalo en vez de crear uno nuevo.'
    }
    const primerCampo = Object.values(datos)[0]
    return Array.isArray(primerCampo) ? primerCampo[0] : texto
  } catch {
    return texto
  }
}

export default function Operaciones() {
  const [registros, setRegistros] = useState([])
  const [rutas, setRutas] = useState([])
  const [turnos, setTurnos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [errorCarga, setErrorCarga] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [mostrarForm, setMostrarForm] = useState(false)
  const [nuevo, setNuevo] = useState(FORM_VACIO)
  const [errorAlta, setErrorAlta] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [editandoId, setEditandoId] = useState(null)
  const [formEdicion, setFormEdicion] = useState({})
  const [guardandoEdicion, setGuardandoEdicion] = useState(false)
  const [mesReporte, setMesReporte] = useState(MES_ACTUAL)
  const [turnosSeleccionados, setTurnosSeleccionados] = useState([])
  const [registroAEliminar, setRegistroAEliminar] = useState(null)
  const { toast, mostrarToast, cerrarToast } = useToast()
  const { registrar } = useBitacora()

  useEffect(() => {
    let activo = true
    async function cargar() {
      setCargando(true)
      setErrorCarga('')
      try {
        const [aforosData, rutasData, turnosData] = await Promise.all([
          api.get('/aforos/'),
          api.get('/rutas/'),
          api.get('/turnos/'),
        ])
        if (!activo) return
        setRegistros(aforosData)
        setRutas(rutasData)
        setTurnos(turnosData)
        setTurnosSeleccionados(turnosData.map((t) => t.id))
      } catch (err) {
        if (activo) setErrorCarga(err.message || 'No se pudieron cargar los registros de aforo.')
      } finally {
        if (activo) setCargando(false)
      }
    }
    cargar()
    return () => { activo = false }
  }, [])

  const nombreRuta = (id) => rutas.find((r) => r.id === Number(id))?.nombre || ''

  const filtrados = [...registros]
    .filter((r) =>
      nombreRuta(r.ruta).toLowerCase().includes(busqueda.trim().toLowerCase()) &&
      turnosSeleccionados.includes(r.turno),
    )
    .sort((a, b) => b.fecha.localeCompare(a.fecha))

  const registrosDelMes = registros
    .filter((r) => r.fecha.startsWith(mesReporte) && turnosSeleccionados.includes(r.turno))
    .sort((a, b) => a.fecha.localeCompare(b.fecha))

  const mesLabel = (() => {
    const [anio, mes] = mesReporte.split('-')
    return new Date(Number(anio), Number(mes) - 1, 1).toLocaleDateString('es-MX', {
      month: 'long',
      year: 'numeric',
    })
  })()

  const turnosLabel =
    turnosSeleccionados.length === turnos.length
      ? 'Todos los turnos'
      : turnosSeleccionados.length === 0
        ? 'Ninguno seleccionado'
        : turnos.filter((t) => turnosSeleccionados.includes(t.id)).map((t) => t.nombre).join(', ')

  const alternarTurno = (id) => {
    setTurnosSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    )
  }

  const descargarPDFMes = () => {
    setTimeout(() => exportarComoPDF(`aforo-${mesReporte}.pdf`), 50)
  }

  const descargarExcelMes = () => {
    exportarAforoAExcel(registrosDelMes, `aforo-${mesReporte}.xlsx`, mesLabel, turnosLabel)
  }

  const registrarAforo = async (e) => {
    e.preventDefault()

    if (!nuevo.fecha || !nuevo.ruta || !nuevo.turno) {
      setErrorAlta('Fecha, ruta y turno son obligatorios.')
      return
    }
    if (Number(nuevo.pasajeros_ida) < 0 || Number(nuevo.pasajeros_vuelta) < 0) {
      mostrarToast('El aforo no puede ser negativo.', 'error')
      return
    }
    setErrorAlta('')
    setEnviando(true)

    try {
      const fd = new FormData()
      fd.append('ruta', nuevo.ruta)
      fd.append('turno', nuevo.turno)
      fd.append('fecha', nuevo.fecha)
      fd.append('pasajeros_ida', nuevo.pasajeros_ida || 0)
      fd.append('pasajeros_vuelta', nuevo.pasajeros_vuelta || 0)
      if (nuevo.foto) fd.append('foto', nuevo.foto)

      const creado = await api.post('/aforos/', fd)
      setRegistros((prev) => [creado, ...prev])
      setNuevo(FORM_VACIO)
      setMostrarForm(false)
      mostrarToast('Aforo registrado correctamente.')
      registrar('crear', 'Aforo', `Registró aforo en ruta ${nombreRuta(creado.ruta)} (${creado.pasajeros_ida + creado.pasajeros_vuelta} pasajeros, ${creado.fecha})`)
    } catch (err) {
      setErrorAlta(extraerMensajeError(err))
    } finally {
      setEnviando(false)
    }
  }

  const iniciarEdicion = (r) => {
    setFormEdicion({ fecha: r.fecha, turno: r.turno, pasajeros_ida: r.pasajeros_ida, pasajeros_vuelta: r.pasajeros_vuelta })
    setEditandoId(r.id)
  }

  const cancelarEdicion = () => setEditandoId(null)

  const guardarEdicion = async (r) => {
    if (Number(formEdicion.pasajeros_ida) < 0 || Number(formEdicion.pasajeros_vuelta) < 0) {
      mostrarToast('El aforo no puede ser negativo.', 'error')
      return
    }
    setGuardandoEdicion(true)
    try {
      const actualizado = await api.patch(`/aforos/${r.id}/`, {
        fecha: formEdicion.fecha,
        turno: formEdicion.turno,
        pasajeros_ida: Number(formEdicion.pasajeros_ida),
        pasajeros_vuelta: Number(formEdicion.pasajeros_vuelta),
      })
      setRegistros((prev) => prev.map((x) => (x.id === r.id ? actualizado : x)))
      setEditandoId(null)
      mostrarToast('Registro actualizado correctamente.')
      registrar('actualizar', 'Aforo', `Actualizó el registro de aforo del ${actualizado.fecha} en ruta ${nombreRuta(actualizado.ruta)}`)
    } catch (err) {
      mostrarToast(extraerMensajeError(err), 'error')
    } finally {
      setGuardandoEdicion(false)
    }
  }

  const pedirConfirmacionEliminar = (r) => setRegistroAEliminar(r)
  const cancelarEliminar = () => setRegistroAEliminar(null)

  const confirmarEliminar = async () => {
    try {
      await api.delete(`/aforos/${registroAEliminar.id}/`)
      setRegistros((prev) => prev.filter((x) => x.id !== registroAEliminar.id))
      registrar('eliminar', 'Aforo', `Eliminó el registro de aforo del ${registroAEliminar.fecha} en ruta ${nombreRuta(registroAEliminar.ruta)}`)
      mostrarToast('Registro eliminado.')
    } catch (err) {
      mostrarToast(err.message || 'No se pudo eliminar el registro.', 'error')
    } finally {
      setRegistroAEliminar(null)
    }
  }

  const totalAforo = filtrados.reduce((acc, r) => acc + r.pasajeros_ida + r.pasajeros_vuelta, 0)

  return (
    <AppLayout>
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-semibold text-servitur-texto">
              <Users className="w-5 h-5 text-servitur-azul" />
              Aforo por ruta
            </h1>
            <p className="text-sm text-servitur-texto-secundario mt-0.5">
              Registro manual del conductor/operador: pasajeros acumulados por ruta, turno y fecha.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 border border-servitur-texto-secundario/30 rounded-lg px-3 py-2 bg-servitur-tarjeta">
              <Search className="w-4 h-4 text-servitur-texto-secundario" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por ruta..."
                className="outline-none text-sm bg-transparent w-44"
              />
            </div>
            <button
              onClick={() => setMostrarForm(!mostrarForm)}
              className="flex items-center gap-1.5 text-sm bg-servitur-azul hover:opacity-90 text-white px-3 py-2 rounded-lg"
            >
              <Plus className="w-4 h-4" />
              Registrar aforo
            </button>
          </div>
        </div>

        {errorCarga && (
          <div className="text-sm text-servitur-rojo bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {errorCarga}
          </div>
        )}

        <div className="bg-servitur-tarjeta rounded-xl shadow-sm border border-servitur-texto-secundario/10 p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm text-servitur-texto-secundario">Reporte mensual:</label>
              <input
                type="month"
                value={mesReporte}
                onChange={(e) => setMesReporte(e.target.value)}
                className="border border-servitur-texto-secundario/30 rounded-lg px-3 py-2 text-sm outline-none focus:border-servitur-azul"
              />
              <span className="text-xs text-servitur-texto-secundario hidden sm:inline">
                {registrosDelMes.length} registro{registrosDelMes.length === 1 ? '' : 's'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={descargarPDFMes}
                disabled={registrosDelMes.length === 0}
                className="flex items-center gap-1.5 text-sm border border-servitur-azul text-servitur-azul px-3 py-2 rounded-lg hover:bg-servitur-azul/5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              >
                <FileDown className="w-4 h-4" /> Descargar PDF
              </button>
              <button
                onClick={descargarExcelMes}
                disabled={registrosDelMes.length === 0}
                className="flex items-center gap-1.5 text-sm border border-servitur-azul text-servitur-azul px-3 py-2 rounded-lg hover:bg-servitur-azul/5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              >
                <FileSpreadsheet className="w-4 h-4" /> Descargar Excel
              </button>
            </div>
          </div>

          <div className="border-t border-servitur-texto-secundario/10 pt-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-servitur-texto-secundario">Filtrar por turno (aplica a la tabla y al reporte):</p>
              <div className="flex items-center gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => setTurnosSeleccionados(turnos.map((t) => t.id))}
                  className="text-servitur-azul hover:underline"
                >
                  Seleccionar todos
                </button>
                <button
                  type="button"
                  onClick={() => setTurnosSeleccionados([])}
                  className="text-servitur-texto-secundario hover:underline"
                >
                  Ninguno
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2">
              {turnos.map((t) => (
                <label key={t.id} className="flex items-center gap-2 text-sm text-servitur-texto cursor-pointer">
                  <input
                    type="checkbox"
                    checked={turnosSeleccionados.includes(t.id)}
                    onChange={() => alternarTurno(t.id)}
                    className="accent-servitur-azul w-4 h-4"
                  />
                  {t.nombre}
                </label>
              ))}
            </div>
          </div>
        </div>

        {mostrarForm && (
          <form
            onSubmit={registrarAforo}
            className="bg-servitur-tarjeta rounded-xl shadow-sm border border-servitur-texto-secundario/10 p-4 md:p-6 grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            <div>
              <label className="block text-sm font-medium text-servitur-texto mb-1">Fecha</label>
              <input
                required
                type="date"
                value={nuevo.fecha}
                onChange={(e) => setNuevo({ ...nuevo, fecha: e.target.value })}
                className="w-full border border-servitur-texto-secundario/30 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-servitur-azul"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-servitur-texto mb-1">Ruta</label>
              <select
                required
                value={nuevo.ruta}
                onChange={(e) => setNuevo({ ...nuevo, ruta: e.target.value })}
                className="w-full border border-servitur-texto-secundario/30 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-servitur-azul"
              >
                <option value="" disabled>Selecciona una ruta</option>
                {rutas.map((r) => (
                  <option key={r.id} value={r.id}>{r.nombre}</option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-servitur-texto mb-1">Turno</label>
              <select
                required
                value={nuevo.turno}
                onChange={(e) => setNuevo({ ...nuevo, turno: e.target.value })}
                className="w-full border border-servitur-texto-secundario/30 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-servitur-azul"
              >
                <option value="" disabled>Selecciona un turno</option>
                {turnos.map((t) => (
                  <option key={t.id} value={t.id}>{t.nombre}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-servitur-texto mb-1">Pasajeros de ida</label>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={nuevo.pasajeros_ida}
                onChange={(e) => setNuevo({ ...nuevo, pasajeros_ida: e.target.value })}
                className="w-full border border-servitur-texto-secundario/30 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-servitur-azul"
              />
              <p className="text-xs text-servitur-texto-secundario mt-1">Déjalo en blanco si ese turno no incluyó ida.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-servitur-texto mb-1">Pasajeros de vuelta</label>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={nuevo.pasajeros_vuelta}
                onChange={(e) => setNuevo({ ...nuevo, pasajeros_vuelta: e.target.value })}
                className="w-full border border-servitur-texto-secundario/30 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-servitur-azul"
              />
              <p className="text-xs text-servitur-texto-secundario mt-1">Déjalo en blanco si ese turno no incluyó vuelta.</p>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-servitur-texto mb-1">Foto de evidencia (opcional)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setNuevo({ ...nuevo, foto: e.target.files[0] || null })}
                className="w-full text-sm text-servitur-texto-secundario file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-servitur-azul file:text-white file:text-sm"
              />
            </div>

            {errorAlta && <p className="sm:col-span-2 text-sm text-servitur-rojo">{errorAlta}</p>}

            <div className="sm:col-span-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setNuevo(FORM_VACIO)
                  setMostrarForm(false)
                }}
                className="text-sm text-servitur-texto-secundario hover:underline"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={enviando}
                className="bg-servitur-azul hover:opacity-90 text-white text-sm font-medium px-5 py-2.5 rounded-lg disabled:opacity-60"
              >
                {enviando ? 'Guardando...' : 'Guardar registro'}
              </button>
            </div>
          </form>
        )}

        <div className="bg-servitur-tarjeta rounded-xl shadow-sm border border-servitur-texto-secundario/10 overflow-x-auto">
          {cargando ? (
            <p className="text-sm text-servitur-texto-secundario p-6 text-center">Cargando registros de aforo...</p>
          ) : filtrados.length === 0 ? (
            <EmptyState
              titulo="Sin registros de aforo"
              descripcion={
                busqueda
                  ? `No hay registros que coincidan con "${busqueda}".`
                  : 'Aún no se ha registrado ningún aforo.'
              }
              onLimpiar={() => setBusqueda('')}
            />
          ) : (
            <>
              <table className="w-full text-sm min-w-[760px]">
                <thead>
                  <tr className="text-left text-servitur-texto-secundario border-b border-servitur-texto-secundario/15">
                    <th className="font-medium py-3 px-4">Fecha</th>
                    <th className="font-medium py-3 px-2">Ruta</th>
                    <th className="font-medium py-3 px-2 hidden md:table-cell">Turno</th>
                    <th className="font-medium py-3 px-2">Ida</th>
                    <th className="font-medium py-3 px-2">Vuelta</th>
                    <th className="font-medium py-3 px-2 hidden sm:table-cell">Foto</th>
                    <th className="font-medium py-3 px-4">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((r) => {
                    const enEdicion = editandoId === r.id
                    return (
                      <tr key={r.id} className="border-b border-servitur-texto-secundario/10 last:border-0 hover:bg-servitur-fondo">
                        <td className="py-2.5 px-4 text-servitur-texto">
                          {enEdicion ? (
                            <input
                              type="date"
                              value={formEdicion.fecha}
                              onChange={(e) => setFormEdicion({ ...formEdicion, fecha: e.target.value })}
                              className="w-36 border border-servitur-azul/40 rounded px-1.5 py-1 text-sm outline-none focus:border-servitur-azul"
                            />
                          ) : (
                            r.fecha
                          )}
                        </td>
                        <td className="py-2.5 px-2 text-servitur-texto-secundario">{r.ruta_nombre}</td>
                        <td className="py-2.5 px-2 text-servitur-texto-secundario hidden md:table-cell">
                          {enEdicion ? (
                            <select
                              value={formEdicion.turno}
                              onChange={(e) => setFormEdicion({ ...formEdicion, turno: Number(e.target.value) })}
                              className="w-40 border border-servitur-azul/40 rounded px-1.5 py-1 text-sm outline-none focus:border-servitur-azul"
                            >
                              {turnos.map((t) => (
                                <option key={t.id} value={t.id}>{t.nombre}</option>
                              ))}
                            </select>
                          ) : (
                            r.turno_nombre
                          )}
                        </td>
                        <td className="py-2.5 px-2 font-medium text-servitur-texto">
                          {enEdicion ? (
                            <input
                              type="number"
                              min="0"
                              value={formEdicion.pasajeros_ida}
                              onChange={(e) => setFormEdicion({ ...formEdicion, pasajeros_ida: e.target.value })}
                              className="w-16 border border-servitur-azul/40 rounded px-1.5 py-1 text-sm outline-none focus:border-servitur-azul"
                            />
                          ) : (
                            r.pasajeros_ida
                          )}
                        </td>
                        <td className="py-2.5 px-2 font-medium text-servitur-texto">
                          {enEdicion ? (
                            <input
                              type="number"
                              min="0"
                              value={formEdicion.pasajeros_vuelta}
                              onChange={(e) => setFormEdicion({ ...formEdicion, pasajeros_vuelta: e.target.value })}
                              className="w-16 border border-servitur-azul/40 rounded px-1.5 py-1 text-sm outline-none focus:border-servitur-azul"
                            />
                          ) : (
                            r.pasajeros_vuelta
                          )}
                        </td>
                        <td className="py-2.5 px-2 hidden sm:table-cell">
                          {r.foto_url ? (
                            <a href={r.foto_url} target="_blank" rel="noopener noreferrer">
                              <img
                                src={r.foto_url}
                                alt="Evidencia de aforo"
                                className="w-10 h-10 object-cover rounded-lg border border-servitur-texto-secundario/15"
                              />
                            </a>
                          ) : (
                            <ImageOff className="w-4 h-4 text-servitur-texto-secundario/40" />
                          )}
                        </td>
                        <td className="py-2.5 px-4">
                          {enEdicion ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => guardarEdicion(r)}
                                disabled={guardandoEdicion}
                                title="Guardar"
                                className="flex items-center gap-1 text-xs text-green-700 hover:underline disabled:opacity-60"
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
                                onClick={() => iniciarEdicion(r)}
                                title="Editar"
                                className="flex items-center gap-1 text-xs text-servitur-azul hover:underline"
                              >
                                <Pencil className="w-3.5 h-3.5" /> Editar
                              </button>
                              <button
                                onClick={() => pedirConfirmacionEliminar(r)}
                                title="Eliminar"
                                className="flex items-center gap-1 text-xs text-servitur-rojo hover:underline"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Eliminar
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <div className="border-t border-servitur-texto-secundario/10 px-4 py-3 text-sm text-servitur-texto-secundario">
                Total acumulado{busqueda ? ' en esta búsqueda' : ''}:{' '}
                <span className="font-medium text-servitur-texto">
                  {totalAforo.toLocaleString('es-MX')} pasajeros
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="print-area">
        <AforoReportePrintable registros={registrosDelMes} mesLabel={mesLabel} turnosLabel={turnosLabel} />
      </div>

      <ConfirmDialog
        abierto={Boolean(registroAEliminar)}
        titulo="Eliminar registro de aforo"
        mensaje={
          registroAEliminar
            ? `Se eliminará el registro del ${registroAEliminar.fecha} (ruta ${registroAEliminar.ruta_nombre}). Esta acción no se puede deshacer.`
            : ''
        }
        textoConfirmar="Sí, eliminar"
        peligro
        onConfirmar={confirmarEliminar}
        onCancelar={cancelarEliminar}
      />

      <Toast toast={toast} onClose={cerrarToast} />
    </AppLayout>
  )
}