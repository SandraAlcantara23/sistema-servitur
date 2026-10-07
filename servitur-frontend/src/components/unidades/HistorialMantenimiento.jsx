import { useEffect, useMemo, useState } from 'react'
import { Wrench, Plus, Trash2, X, Check } from 'lucide-react'
import ConfirmDialog from '../common/ConfirmDialog.jsx'
import { api } from '../../services/api.js'

const CATEGORIAS = ['Preventivo', 'Correctivo']

const BADGE = {
  Preventivo: 'bg-green-500/15 text-green-600',
  Correctivo: 'bg-servitur-rojo/15 text-servitur-rojo',
}

const hoyISO = () => new Date().toISOString().slice(0, 10)

const FORM_VACIO = () => ({ categoria: CATEGORIAS[0], fecha: hoyISO(), descripcion: '' })

function formatearFecha(iso) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

/**
 * Historial de mantenimiento preventivo/correctivo de una unidad.
 * Props:
 *   unidad      -> { id, eco }
 *   mostrarToast(mensaje, tipo)
 *   registrar(accion, modulo, detalle) -> bitácora de auditoría
 */
export default function HistorialMantenimiento({ unidad, mostrarToast, registrar }) {
  const [registros, setRegistros] = useState([])
  const [cargando, setCargando] = useState(true)
  const [errorCarga, setErrorCarga] = useState('')
  const [filtro, setFiltro] = useState('Todos')
  const [formAbierto, setFormAbierto] = useState(false)
  const [form, setForm] = useState(FORM_VACIO())
  const [guardando, setGuardando] = useState(false)
  const [aEliminar, setAEliminar] = useState(null)

  useEffect(() => {
    let activo = true
    async function cargar() {
      setCargando(true)
      setErrorCarga('')
      try {
        const data = await api.get('/mantenimientos/')
        if (!activo) return
        setRegistros(data.filter((m) => Number(m.unidad) === Number(unidad.id)))
      } catch (err) {
        if (activo) setErrorCarga(err.message || 'No se pudo cargar el historial de mantenimiento.')
      } finally {
        if (activo) setCargando(false)
      }
    }
    cargar()
    return () => { activo = false }
  }, [unidad.id])

  const visibles = useMemo(() => {
    const lista = filtro === 'Todos' ? registros : registros.filter((m) => m.categoria === filtro)
    return [...lista].sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '') || b.id - a.id)
  }, [registros, filtro])

  const conteo = (cat) => registros.filter((m) => m.categoria === cat).length

  const abrirForm = () => {
    setForm(FORM_VACIO())
    setFormAbierto(true)
  }

  const guardar = async (e) => {
    e.preventDefault()
    if (!form.descripcion.trim()) {
      mostrarToast('Escribe una descripción del mantenimiento.', 'error')
      return
    }
    if (form.fecha > hoyISO()) {
      mostrarToast('La fecha del mantenimiento no puede ser futura.', 'error')
      return
    }
    setGuardando(true)
    try {
      const creado = await api.post('/mantenimientos/', {
        unidad: unidad.id,
        categoria: form.categoria,
        descripcion: form.descripcion.trim(),
        fecha: form.fecha,
      })
      setRegistros((prev) => [creado, ...prev])
      setFormAbierto(false)
      mostrarToast('Mantenimiento registrado correctamente.')
      registrar('crear', 'Mantenimiento', `Registró mantenimiento ${form.categoria.toLowerCase()} en la unidad ${unidad.eco}`)
    } catch (err) {
      mostrarToast(err.message || 'No se pudo registrar el mantenimiento.', 'error')
    } finally {
      setGuardando(false)
    }
  }

  const eliminar = async () => {
    const m = aEliminar
    setAEliminar(null)
    try {
      await api.delete(`/mantenimientos/${m.id}/`)
      setRegistros((prev) => prev.filter((x) => x.id !== m.id))
      mostrarToast('Registro de mantenimiento eliminado.')
      registrar('eliminar', 'Mantenimiento', `Eliminó un mantenimiento ${m.categoria.toLowerCase()} de la unidad ${unidad.eco}`)
    } catch (err) {
      mostrarToast(err.message || 'No se pudo eliminar el registro.', 'error')
    }
  }

  return (
    <div className="bg-servitur-tarjeta rounded-xl shadow-sm border border-servitur-texto-secundario/10 p-4 md:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="flex items-center gap-2 font-semibold text-servitur-texto">
            <Wrench className="w-4 h-4 text-servitur-azul" />
            Historial de mantenimiento
          </h2>
          <p className="text-xs text-servitur-texto-secundario mt-0.5">
            {registros.length} registro{registros.length === 1 ? '' : 's'} · {conteo('Preventivo')} preventivo
            {conteo('Preventivo') === 1 ? '' : 's'} · {conteo('Correctivo')} correctivo
            {conteo('Correctivo') === 1 ? '' : 's'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            aria-label="Filtrar por tipo de mantenimiento"
            className="border border-servitur-texto-secundario/30 rounded-lg px-2.5 py-2 text-sm outline-none focus:border-servitur-azul"
          >
            <option value="Todos">Todos</option>
            {CATEGORIAS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          {!formAbierto && (
            <button
              onClick={abrirForm}
              className="flex items-center gap-1.5 text-sm bg-servitur-azul hover:opacity-90 text-white px-3 py-2 rounded-lg"
            >
              <Plus className="w-4 h-4" /> Registrar
            </button>
          )}
        </div>
      </div>

      {formAbierto && (
        <form
          onSubmit={guardar}
          className="border border-servitur-azul/40 rounded-lg p-3 md:p-4 mb-4 space-y-3"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-servitur-texto-secundario mb-1">Tipo</label>
              <select
                value={form.categoria}
                onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                className="w-full border border-servitur-texto-secundario/30 rounded-lg px-2.5 py-2 text-sm outline-none focus:border-servitur-azul"
              >
                {CATEGORIAS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-servitur-texto-secundario mb-1">Fecha</label>
              <input
                required
                type="date"
                max={hoyISO()}
                value={form.fecha}
                onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                className="w-full border border-servitur-texto-secundario/30 rounded-lg px-2.5 py-2 text-sm outline-none focus:border-servitur-azul"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-servitur-texto-secundario mb-1">Descripción</label>
            <textarea
              required
              rows={3}
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              placeholder="Ej. Cambio de aceite y filtros, revisión de frenos…"
              className="w-full border border-servitur-texto-secundario/30 rounded-lg px-2.5 py-2 text-sm outline-none focus:border-servitur-azul resize-y"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setFormAbierto(false)}
              className="flex items-center gap-1.5 text-sm text-servitur-texto-secundario hover:underline"
            >
              <X className="w-4 h-4" /> Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="flex items-center gap-1.5 text-sm bg-servitur-azul hover:opacity-90 disabled:opacity-60 text-white px-4 py-2 rounded-lg"
            >
              <Check className="w-4 h-4" /> {guardando ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      )}

      {cargando ? (
        <p className="text-sm text-servitur-texto-secundario">Cargando historial…</p>
      ) : errorCarga ? (
        <p className="text-sm text-servitur-rojo">{errorCarga}</p>
      ) : visibles.length === 0 ? (
        <p className="text-sm text-servitur-texto-secundario">
          {registros.length === 0
            ? 'Esta unidad todavía no tiene mantenimientos registrados.'
            : 'No hay mantenimientos de ese tipo.'}
        </p>
      ) : (
        <ul className="divide-y divide-servitur-texto-secundario/10">
          {visibles.map((m) => (
            <li key={m.id} className="flex items-start justify-between gap-3 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${BADGE[m.categoria] || 'bg-servitur-texto-secundario/15 text-servitur-texto-secundario'}`}
                  >
                    {m.categoria}
                  </span>
                  <span className="text-xs text-servitur-texto-secundario">{formatearFecha(m.fecha)}</span>
                </div>
                <p className="text-sm text-servitur-texto mt-1 whitespace-pre-line break-words">{m.descripcion}</p>
              </div>
              <button
                onClick={() => setAEliminar(m)}
                aria-label="Eliminar registro de mantenimiento"
                className="text-servitur-texto-secundario hover:text-servitur-rojo p-1 shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        abierto={Boolean(aEliminar)}
        titulo="¿Eliminar este registro?"
        mensaje="Se quitará del historial de mantenimiento de la unidad. Esta acción no se puede deshacer."
        textoConfirmar="Eliminar"
        peligro
        onConfirmar={eliminar}
        onCancelar={() => setAEliminar(null)}
      />
    </div>
  )
}
