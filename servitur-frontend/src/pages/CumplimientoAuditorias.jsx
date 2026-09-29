import { useEffect, useMemo, useState } from 'react'
import { ShieldCheck, Plus, Check, Pencil, X as XIcon } from 'lucide-react'
import AppLayout from '../components/layout/AppLayout.jsx'
import { api } from '../services/api.js'

// El backend regresa fecha_deteccion/fecha_limite/fecha_cierre/estado/
// cerrado_a_tiempo (estos dos últimos calculados en el modelo); aquí se
// traduce a la forma que usa esta pantalla.
function normalizar(h) {
  return {
    id: h.id,
    descripcion: h.descripcion,
    fechaDeteccion: h.fecha_deteccion,
    fechaLimite: h.fecha_limite,
    fechaCierre: h.fecha_cierre,
    estado: h.estado,
    cerradoATiempo: h.cerrado_a_tiempo,
    registradoPor: h.registrado_por_nombre,
  }
}

const mesActual = () => new Date().toISOString().slice(0, 7) // 'YYYY-MM'

export default function CumplimientoAuditorias() {
  const [hallazgos, setHallazgos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [mes, setMes] = useState(mesActual())

  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoId, setEditandoId] = useState(null)
  const [form, setForm] = useState({ descripcion: '', fecha_deteccion: '', fecha_limite: '' })
  const [guardando, setGuardando] = useState(false)
  const [cerrandoId, setCerrandoId] = useState(null)

  const cargar = () => {
    setCargando(true)
    setError('')
    api
      .get('/hallazgos-auditoria/')
      .then((datos) => setHallazgos(datos.map(normalizar)))
      .catch((err) => setError(err.message || 'No se pudieron cargar los hallazgos.'))
      .finally(() => setCargando(false))
  }

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // El indicador es sobre los hallazgos cuya fecha límite cae en el mes
  // seleccionado (no cuándo se detectaron ni cuándo se cerraron).
  const hallazgosDelMes = useMemo(
    () => hallazgos.filter((h) => h.fechaLimite?.slice(0, 7) === mes),
    [hallazgos, mes],
  )

  const totalMes = hallazgosDelMes.length
  const cerradosATiempo = hallazgosDelMes.filter((h) => h.cerradoATiempo).length
  const cumplimiento = totalMes === 0 ? null : Math.round((cerradosATiempo / totalMes) * 100)
  const abiertosActuales = hallazgos.filter((h) => h.estado === 'abierto').length

  const abrirNuevo = () => {
    setEditandoId(null)
    setForm({ descripcion: '', fecha_deteccion: '', fecha_limite: '' })
    setMostrarForm(true)
  }

  const abrirEdicion = (h) => {
    setEditandoId(h.id)
    setForm({ descripcion: h.descripcion, fecha_deteccion: h.fechaDeteccion, fecha_limite: h.fechaLimite })
    setMostrarForm(true)
  }

  const guardar = async (e) => {
    e.preventDefault()
    if (!form.descripcion.trim() || !form.fecha_deteccion || !form.fecha_limite) return
    setGuardando(true)
    setError('')
    try {
      if (editandoId) {
        const actualizado = normalizar(await api.patch(`/hallazgos-auditoria/${editandoId}/`, form))
        setHallazgos((prev) => prev.map((h) => (h.id === editandoId ? actualizado : h)))
      } else {
        const creado = normalizar(await api.post('/hallazgos-auditoria/', form))
        setHallazgos((prev) => [creado, ...prev])
      }
      setMostrarForm(false)
    } catch (err) {
      setError(err.message || 'No se pudo guardar el hallazgo.')
    } finally {
      setGuardando(false)
    }
  }

  const marcarCerrado = async (h) => {
    setCerrandoId(h.id)
    setError('')
    try {
      const hoy = new Date().toISOString().slice(0, 10)
      const actualizado = normalizar(await api.patch(`/hallazgos-auditoria/${h.id}/`, { fecha_cierre: hoy }))
      setHallazgos((prev) => prev.map((x) => (x.id === h.id ? actualizado : x)))
    } catch (err) {
      setError(err.message || 'No se pudo cerrar el hallazgo.')
    } finally {
      setCerrandoId(null)
    }
  }

  const reabrir = async (h) => {
    setCerrandoId(h.id)
    setError('')
    try {
      const actualizado = normalizar(await api.patch(`/hallazgos-auditoria/${h.id}/`, { fecha_cierre: null }))
      setHallazgos((prev) => prev.map((x) => (x.id === h.id ? actualizado : x)))
    } catch (err) {
      setError(err.message || 'No se pudo reabrir el hallazgo.')
    } finally {
      setCerrandoId(null)
    }
  }

  return (
    <AppLayout>
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-semibold text-servitur-texto">
              <ShieldCheck className="w-5 h-5 text-servitur-azul" />
              Auditorías de cumplimiento
            </h1>
            <p className="text-sm text-servitur-texto-secundario mt-0.5">
              Hallazgos de auditorías internas/externas y si se corrigieron dentro de su fecha límite.
            </p>
          </div>
          <button
            onClick={abrirNuevo}
            className="flex items-center gap-1.5 text-sm bg-servitur-rojo text-white px-3 py-2 rounded-lg hover:bg-servitur-rojo-hover self-start"
          >
            <Plus className="w-4 h-4" /> Nuevo hallazgo
          </button>
        </div>

        {error && (
          <div className="text-sm text-servitur-rojo bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
        )}

        <div className="bg-servitur-tarjeta rounded-xl shadow-sm border border-servitur-texto-secundario/10 p-4 flex items-center gap-2">
          <label className="text-xs font-medium text-servitur-texto-secundario">Mes a evaluar (según fecha límite):</label>
          <input
            type="month"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            className="border border-servitur-texto-secundario/30 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-servitur-azul"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-servitur-tarjeta rounded-xl shadow-sm border border-servitur-texto-secundario/10 border-l-4 border-l-servitur-azul p-4">
            <p className="text-sm text-servitur-texto-secundario">Cumplimiento a tiempo</p>
            <p className="text-2xl font-semibold text-servitur-texto mt-0.5">
              {cargando ? '…' : cumplimiento === null ? '—' : `${cumplimiento}%`}
            </p>
            <p className="text-xs text-servitur-texto-secundario mt-1">
              {totalMes === 0 ? 'Sin hallazgos con vencimiento ese mes' : `${cerradosATiempo} de ${totalMes} cerrados a tiempo`}
            </p>
          </div>
          <div className="bg-servitur-tarjeta rounded-xl shadow-sm border border-servitur-texto-secundario/10 p-4">
            <p className="text-sm text-servitur-texto-secundario">Hallazgos del mes</p>
            <p className="text-2xl font-semibold text-servitur-texto mt-0.5">{cargando ? '…' : totalMes}</p>
          </div>
          <div className="bg-servitur-tarjeta rounded-xl shadow-sm border border-servitur-texto-secundario/10 p-4">
            <p className="text-sm text-servitur-texto-secundario">Abiertos actualmente</p>
            <p className="text-2xl font-semibold text-servitur-texto mt-0.5">{cargando ? '…' : abiertosActuales}</p>
          </div>
        </div>

        {mostrarForm && (
          <form
            onSubmit={guardar}
            className="bg-servitur-tarjeta rounded-xl shadow-sm border border-servitur-texto-secundario/10 p-4 md:p-6 grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-servitur-texto mb-1">Descripción del hallazgo</label>
              <textarea
                required
                rows={2}
                value={form.descripcion}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                className="w-full border border-servitur-texto-secundario/30 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-servitur-azul resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-servitur-texto mb-1">Fecha de detección</label>
              <input
                required
                type="date"
                value={form.fecha_deteccion}
                onChange={(e) => setForm({ ...form, fecha_deteccion: e.target.value })}
                className="w-full border border-servitur-texto-secundario/30 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-servitur-azul"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-servitur-texto mb-1">Fecha límite</label>
              <input
                required
                type="date"
                value={form.fecha_limite}
                onChange={(e) => setForm({ ...form, fecha_limite: e.target.value })}
                className="w-full border border-servitur-texto-secundario/30 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-servitur-azul"
              />
            </div>
            <div className="sm:col-span-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setMostrarForm(false)}
                className="text-sm text-servitur-texto-secundario px-4 py-2.5 rounded-lg hover:bg-servitur-fondo"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardando}
                className="bg-servitur-azul text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:opacity-90 disabled:opacity-60"
              >
                {guardando ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        )}

        <div className="bg-servitur-tarjeta rounded-xl shadow-sm border border-servitur-texto-secundario/10 overflow-x-auto">
          {cargando ? (
            <p className="text-sm text-servitur-texto-secundario p-6 text-center">Cargando hallazgos...</p>
          ) : hallazgos.length === 0 ? (
            <p className="text-sm text-servitur-texto-secundario p-6 text-center">Todavía no hay hallazgos registrados.</p>
          ) : (
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="text-left text-servitur-texto-secundario border-b border-servitur-texto-secundario/15">
                  <th className="font-medium py-3 px-4">Descripción</th>
                  <th className="font-medium py-3 px-2">Detectado</th>
                  <th className="font-medium py-3 px-2">Fecha límite</th>
                  <th className="font-medium py-3 px-2">Estado</th>
                  <th className="font-medium py-3 px-2">Cerrado el</th>
                  <th className="font-medium py-3 px-4">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {[...hallazgos]
                  .sort((a, b) => b.fechaLimite.localeCompare(a.fechaLimite))
                  .map((h) => (
                    <tr key={h.id} className="border-b border-servitur-texto-secundario/10 last:border-0">
                      <td className="py-2.5 px-4 text-servitur-texto max-w-xs">{h.descripcion}</td>
                      <td className="py-2.5 px-2 text-servitur-texto-secundario whitespace-nowrap">{h.fechaDeteccion}</td>
                      <td className="py-2.5 px-2 text-servitur-texto-secundario whitespace-nowrap">{h.fechaLimite}</td>
                      <td className="py-2.5 px-2">
                        {h.estado === 'cerrado' ? (
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${
                              h.cerradoATiempo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {h.cerradoATiempo ? 'Cerrado a tiempo' : 'Cerrado tarde'}
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700">Abierto</span>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-servitur-texto-secundario whitespace-nowrap">{h.fechaCierre || '—'}</td>
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => abrirEdicion(h)}
                            className="flex items-center gap-1 text-xs text-servitur-azul hover:underline"
                          >
                            <Pencil className="w-3.5 h-3.5" /> Editar
                          </button>
                          {h.estado === 'abierto' ? (
                            <button
                              onClick={() => marcarCerrado(h)}
                              disabled={cerrandoId === h.id}
                              className="flex items-center gap-1 text-xs text-green-700 hover:underline disabled:opacity-50"
                            >
                              <Check className="w-3.5 h-3.5" /> {cerrandoId === h.id ? 'Cerrando...' : 'Marcar cerrado'}
                            </button>
                          ) : (
                            <button
                              onClick={() => reabrir(h)}
                              disabled={cerrandoId === h.id}
                              className="flex items-center gap-1 text-xs text-servitur-texto-secundario hover:underline disabled:opacity-50"
                            >
                              <XIcon className="w-3.5 h-3.5" /> Reabrir
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
