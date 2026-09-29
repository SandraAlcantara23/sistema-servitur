import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Plus, Clock, FileDown, FileSpreadsheet } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid,
  LineChart, Line,
} from 'recharts'
import { useAuth } from '../../context/AuthContext.jsx'
import { useBitacora } from '../../hooks/useBitacora.js'
import EmptyState from '../common/EmptyState.jsx'
import IncidenciasReportePrintable from '../reports/IncidenciasReportePrintable.jsx'
import { exportarComoPDF, exportarIncidenciasAExcel } from '../../utils/exportReports.js'
import { api } from '../../services/api.js'

const COLOR_BARRA = '#173F63'
const COLOR_LINEA = '#C9252D'
const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
const DIAS_JS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'] // getDay(): 0 = Domingo

const TIPOS_INCIDENCIA = [
  { value: 'retraso', label: 'Retraso' },
  { value: 'falla_mecanica', label: 'Falla mecánica' },
  { value: 'accidente_menor', label: 'Accidente menor' },
  { value: 'queja_cliente', label: 'Queja de cliente' },
]
const TIPO_LABELS = Object.fromEntries(TIPOS_INCIDENCIA.map((t) => [t.value, t.label]))

// El backend regresa conductor_nombre/unidad_eco/tipo (clave); aquí se
// traduce a la forma que ya usan las gráficas, la tabla y los reportes.
function normalizar(inc) {
  return {
    id: inc.id,
    conductorId: inc.conductor,
    conductor: inc.conductor_nombre,
    unidadId: inc.unidad,
    unidad: inc.unidad_eco,
    tipoValor: inc.tipo,
    tipo: TIPO_LABELS[inc.tipo] || inc.tipo,
    fecha: inc.fecha,
    descripcion: inc.descripcion,
  }
}

function agruparPor(lista, llave) {
  const conteo = {}
  lista.forEach((item) => {
    conteo[item[llave]] = (conteo[item[llave]] || 0) + 1
  })
  return Object.entries(conteo)
    .map(([nombre, cantidad]) => ({ nombre, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad)
}

function agruparPorDiaSemana(lista) {
  const conteo = Object.fromEntries(DIAS_SEMANA.map((d) => [d, 0]))
  lista.forEach((item) => {
    const dia = DIAS_JS[new Date(item.fecha + 'T00:00:00').getDay()]
    conteo[dia] += 1
  })
  return DIAS_SEMANA.map((dia) => ({ nombre: dia.slice(0, 3), diaCompleto: dia, cantidad: conteo[dia] }))
}

function agruparPorDia(lista) {
  const conteo = {}
  lista.forEach((item) => {
    conteo[item.fecha] = (conteo[item.fecha] || 0) + 1
  })
  return Object.entries(conteo)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([fecha, cantidad]) => ({
      etiqueta: new Date(fecha + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }),
      cantidad,
    }))
}

function lunesDeLaSemana(fecha) {
  const d = new Date(fecha + 'T00:00:00')
  const diaSemana = d.getDay()
  const diferencia = diaSemana === 0 ? -6 : 1 - diaSemana
  d.setDate(d.getDate() + diferencia)
  return d
}

function agruparPorSemana(lista) {
  const conteo = {}
  lista.forEach((item) => {
    const clave = lunesDeLaSemana(item.fecha).toISOString().slice(0, 10)
    conteo[clave] = (conteo[clave] || 0) + 1
  })
  return Object.entries(conteo)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([clave, cantidad]) => ({
      etiqueta: 'Sem. ' + new Date(clave + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }),
      cantidad,
    }))
}

function agruparPorMes(lista) {
  const conteo = {}
  lista.forEach((item) => {
    const mes = item.fecha.slice(0, 7)
    conteo[mes] = (conteo[mes] || 0) + 1
  })
  return Object.entries(conteo)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, cantidad]) => ({
      etiqueta: new Date(mes + '-01').toLocaleDateString('es-MX', { month: 'short', year: '2-digit' }),
      cantidad,
    }))
}

const GRANULARIDADES = [
  { id: 'dia', label: 'Día' },
  { id: 'semana', label: 'Semana' },
  { id: 'mes', label: 'Mes' },
]

export default function IncidenciasPanel() {
  const { sesion } = useAuth()
  const esConductor = sesion?.rol === 'Conductor'
  const { registrar } = useBitacora()

  const [incidencias, setIncidencias] = useState([])
  const [conductores, setConductores] = useState([])
  const [unidades, setUnidades] = useState([])
  const [cargando, setCargando] = useState(true)
  const [errorCarga, setErrorCarga] = useState('')

  const [mostrarForm, setMostrarForm] = useState(false)
  const [nueva, setNueva] = useState({ conductor: '', unidad: '', tipo: TIPOS_INCIDENCIA[0].value, fecha: '', descripcion: '' })
  const [enviando, setEnviando] = useState(false)
  const [granularidad, setGranularidad] = useState('mes')
  const [rangoDesde, setRangoDesde] = useState('')
  const [rangoHasta, setRangoHasta] = useState('')

  useEffect(() => {
    let activo = true
    async function cargar() {
      setCargando(true)
      setErrorCarga('')
      try {
        const tareas = [api.get('/incidencias/')]
        if (!esConductor) tareas.push(api.get('/conductores/'), api.get('/unidades/'))
        const resultados = await Promise.all(tareas)
        if (!activo) return
        setIncidencias(resultados[0].map(normalizar))
        if (!esConductor) {
          setConductores(resultados[1])
          setUnidades(resultados[2])
          setNueva((prev) => ({ ...prev, unidad: resultados[2][0]?.id ?? '' }))
        }
      } catch (err) {
        if (activo) setErrorCarga(err.message || 'No se pudieron cargar las incidencias.')
      } finally {
        if (activo) setCargando(false)
      }
    }
    cargar()
    return () => { activo = false }
  }, [esConductor])

  // El backend ya filtra por rol (un Conductor solo recibe las suyas).
  const incidenciasDelRol = incidencias

  const incidenciasVisibles = incidenciasDelRol.filter((i) => {
    if (rangoDesde && i.fecha < rangoDesde) return false
    if (rangoHasta && i.fecha > rangoHasta) return false
    return true
  })

  const formatoFechaInput = (fecha) => fecha.toISOString().slice(0, 10)

  const seleccionarEstaSemana = () => {
    const hoy = new Date()
    const lunes = lunesDeLaSemana(formatoFechaInput(hoy))
    const domingo = new Date(lunes)
    domingo.setDate(domingo.getDate() + 6)
    setRangoDesde(formatoFechaInput(lunes))
    setRangoHasta(formatoFechaInput(domingo))
  }

  const seleccionarEsteMes = () => {
    const hoy = new Date()
    const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
    const fin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)
    setRangoDesde(formatoFechaInput(inicio))
    setRangoHasta(formatoFechaInput(fin))
  }

  const limpiarRango = () => {
    setRangoDesde('')
    setRangoHasta('')
  }

  const retrasos = useMemo(() => incidenciasVisibles.filter((i) => i.tipoValor === 'retraso'), [incidenciasVisibles])
  // Siniestralidad: percances/choques/accidentes viales — indicador propio
  // del proveedor, aparte del conteo general de incidencias.
  const siniestros = useMemo(() => incidenciasVisibles.filter((i) => i.tipoValor === 'accidente_menor'), [incidenciasVisibles])

  const porConductor = useMemo(() => agruparPor(incidenciasVisibles, 'conductor'), [incidenciasVisibles])
  const porUnidad = useMemo(() => agruparPor(incidenciasVisibles, 'unidad'), [incidenciasVisibles])
  const retrasosPorUnidad = useMemo(() => agruparPor(retrasos, 'unidad'), [retrasos])
  const porDiaSemana = useMemo(() => agruparPorDiaSemana(incidenciasVisibles), [incidenciasVisibles])

  const porTiempo = useMemo(() => {
    if (granularidad === 'dia') return agruparPorDia(incidenciasVisibles)
    if (granularidad === 'semana') return agruparPorSemana(incidenciasVisibles)
    return agruparPorMes(incidenciasVisibles)
  }, [incidenciasVisibles, granularidad])

  const porSemanaReporte = useMemo(() => agruparPorSemana(incidenciasVisibles), [incidenciasVisibles])
  const porMesReporte = useMemo(() => agruparPorMes(incidenciasVisibles), [incidenciasVisibles])

  const etiquetaRango = rangoDesde || rangoHasta
    ? ` · Del ${rangoDesde || '…'} al ${rangoHasta || '…'}`
    : ' · Todo el historial'
  const alcanceReporte = (esConductor ? `Solo las incidencias de ${sesion?.nombre ?? 'este conductor'}` : 'Todas las incidencias') + etiquetaRango

  const descargarPDF = () => {
    setTimeout(() => exportarComoPDF('incidencias-retrasos.pdf'), 200)
  }

  const descargarExcel = () => {
    exportarIncidenciasAExcel({
      incidencias: incidenciasVisibles,
      porUnidad,
      retrasosPorUnidad,
      porSemana: porSemanaReporte,
      porMes: porMesReporte,
      porDiaSemana,
      totalIncidencias: incidenciasVisibles.length,
      totalRetrasos: retrasos.length,
      alcance: alcanceReporte,
    }, 'incidencias-retrasos.xlsx')
  }

  const registrarIncidencia = async (e) => {
    e.preventDefault()
    if (!nueva.conductor || !nueva.unidad || !nueva.fecha) return
    setEnviando(true)
    try {
      const creada = normalizar(await api.post('/incidencias/', {
        conductor: nueva.conductor,
        unidad: nueva.unidad,
        tipo: nueva.tipo,
        fecha: nueva.fecha,
        descripcion: nueva.descripcion,
      }))
      setIncidencias((prev) => [creada, ...prev])
      registrar('crear', 'Incidencias', `Registró ${creada.tipo} de ${creada.conductor} en unidad ${creada.unidad} (${creada.fecha})`)
      setNueva({ conductor: '', unidad: unidades[0]?.id ?? '', tipo: TIPOS_INCIDENCIA[0].value, fecha: '', descripcion: '' })
      setMostrarForm(false)
    } catch (err) {
      setErrorCarga(err.message || 'No se pudo registrar la incidencia.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {errorCarga && (
        <div className="text-sm text-servitur-rojo bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {errorCarga}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-sm text-servitur-texto-secundario">
          {esConductor
            ? 'Tus retrasos e incidencias registrados, con su evolución en el tiempo.'
            : 'Registro de retrasos e incidencias por conductor y unidad, con su evolución en el tiempo.'}
        </p>
        {!esConductor && (
          <button
            onClick={() => setMostrarForm((v) => !v)}
            className="flex items-center gap-1.5 text-sm bg-servitur-rojo text-white px-3 py-2 rounded-lg hover:bg-servitur-rojo-hover self-start"
          >
            <Plus className="w-4 h-4" /> Registrar incidencia
          </button>
        )}
      </div>

      {cargando ? (
        <p className="text-sm text-servitur-texto-secundario p-6 text-center">Cargando incidencias...</p>
      ) : (
        <>
          {incidenciasDelRol.length > 0 && (
            <div className="bg-servitur-tarjeta rounded-xl shadow-sm border border-servitur-texto-secundario/10 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-servitur-texto-secundario mr-1">Periodo:</span>
                <button
                  onClick={seleccionarEstaSemana}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                    rangoDesde || rangoHasta ? 'border-servitur-texto-secundario/30 text-servitur-texto-secundario hover:text-servitur-texto' : 'border-servitur-azul bg-servitur-azul/5 text-servitur-azul'
                  }`}
                >
                  Esta semana
                </button>
                <button
                  onClick={seleccionarEsteMes}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-servitur-texto-secundario/30 text-servitur-texto-secundario hover:text-servitur-texto"
                >
                  Este mes
                </button>
                <button
                  onClick={limpiarRango}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                    !rangoDesde && !rangoHasta ? 'border-servitur-azul bg-servitur-azul/5 text-servitur-azul' : 'border-servitur-texto-secundario/30 text-servitur-texto-secundario hover:text-servitur-texto'
                  }`}
                >
                  Todo
                </button>
                <span className="text-xs text-servitur-texto-secundario mx-1">o rango personalizado:</span>
                <input
                  type="date"
                  value={rangoDesde}
                  onChange={(e) => setRangoDesde(e.target.value)}
                  className="border border-servitur-texto-secundario/30 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-servitur-azul"
                />
                <span className="text-xs text-servitur-texto-secundario">a</span>
                <input
                  type="date"
                  value={rangoHasta}
                  min={rangoDesde || undefined}
                  onChange={(e) => setRangoHasta(e.target.value)}
                  className="border border-servitur-texto-secundario/30 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-servitur-azul"
                />
              </div>
            </div>
          )}

          {incidenciasDelRol.length > 0 && (
            <div className="bg-servitur-tarjeta rounded-xl shadow-sm border border-servitur-texto-secundario/10 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-sm text-servitur-texto">
                <span className="font-semibold">{incidenciasVisibles.length}</span> incidencia{incidenciasVisibles.length === 1 ? '' : 's'} registrada{incidenciasVisibles.length === 1 ? '' : 's'}
                {' · '}
                <span className="font-semibold">{retrasos.length}</span> {retrasos.length === 1 ? 'es retraso' : 'son retrasos'}
                {' · '}
                <span className="font-semibold">{siniestros.length}</span> de siniestralidad (percances/choques)
                {(rangoDesde || rangoHasta) && (
                  <span className="text-servitur-texto-secundario"> (periodo seleccionado)</span>
                )}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={descargarPDF}
                  disabled={incidenciasVisibles.length === 0}
                  className="flex items-center gap-1.5 text-sm border border-servitur-azul text-servitur-azul px-3 py-2 rounded-lg hover:bg-servitur-azul/5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                >
                  <FileDown className="w-4 h-4" /> Descargar PDF
                </button>
                <button
                  onClick={descargarExcel}
                  disabled={incidenciasVisibles.length === 0}
                  className="flex items-center gap-1.5 text-sm border border-servitur-azul text-servitur-azul px-3 py-2 rounded-lg hover:bg-servitur-azul/5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                >
                  <FileSpreadsheet className="w-4 h-4" /> Descargar Excel
                </button>
              </div>
            </div>
          )}

          {mostrarForm && (
            <form
              onSubmit={registrarIncidencia}
              className="bg-servitur-tarjeta rounded-xl shadow-sm border border-servitur-texto-secundario/10 p-4 md:p-6 grid grid-cols-1 sm:grid-cols-2 gap-4"
            >
              <div>
                <label className="block text-sm font-medium text-servitur-texto mb-1">Conductor</label>
                <select
                  required
                  value={nueva.conductor}
                  onChange={(e) => setNueva({ ...nueva, conductor: e.target.value })}
                  className="w-full border border-servitur-texto-secundario/30 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-servitur-azul"
                >
                  <option value="">Selecciona un conductor...</option>
                  {conductores.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre_completo}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-servitur-texto mb-1">Unidad</label>
                <select
                  required
                  value={nueva.unidad}
                  onChange={(e) => setNueva({ ...nueva, unidad: e.target.value })}
                  className="w-full border border-servitur-texto-secundario/30 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-servitur-azul"
                >
                  {unidades.map((u) => (
                    <option key={u.id} value={u.id}>{u.eco}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-servitur-texto mb-1">Tipo</label>
                <select
                  value={nueva.tipo}
                  onChange={(e) => setNueva({ ...nueva, tipo: e.target.value })}
                  className="w-full border border-servitur-texto-secundario/30 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-servitur-azul"
                >
                  {TIPOS_INCIDENCIA.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-servitur-texto mb-1">Fecha</label>
                <input
                  required
                  type="date"
                  value={nueva.fecha}
                  onChange={(e) => setNueva({ ...nueva, fecha: e.target.value })}
                  className="w-full border border-servitur-texto-secundario/30 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-servitur-azul"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-servitur-texto mb-1">Descripción</label>
                <textarea
                  required
                  rows={2}
                  value={nueva.descripcion}
                  onChange={(e) => setNueva({ ...nueva, descripcion: e.target.value })}
                  className="w-full border border-servitur-texto-secundario/30 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-servitur-azul resize-none"
                />
              </div>
              <div className="sm:col-span-2 flex justify-end">
                <button
                  type="submit"
                  disabled={enviando}
                  className="bg-servitur-azul text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:opacity-90 disabled:opacity-60"
                >
                  {enviando ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          )}

          {incidenciasVisibles.length === 0 ? (
            <div className="bg-servitur-tarjeta rounded-xl shadow-sm border border-servitur-texto-secundario/10">
              <EmptyState
                titulo={incidenciasDelRol.length === 0 ? 'Sin incidencias registradas' : 'Sin incidencias en este periodo'}
                descripcion={
                  incidenciasDelRol.length === 0
                    ? (esConductor ? 'No tienes incidencias registradas por ahora.' : 'Todavía no hay incidencias registradas.')
                    : 'No hay incidencias dentro del rango de fechas que elegiste.'
                }
                onLimpiar={incidenciasDelRol.length > 0 ? limpiarRango : undefined}
              />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                <div className="bg-servitur-tarjeta rounded-xl shadow-sm border border-servitur-texto-secundario/10 p-4 md:p-5">
                  <h2 className="font-semibold text-servitur-texto mb-3">Incidencias por conductor</h2>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={porConductor} layout="vertical" margin={{ left: 16 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                        <YAxis type="category" dataKey="nombre" width={130} tick={{ fontSize: 12, fill: '#252525' }} />
                        <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 13 }} cursor={{ fill: '#F4F5F6' }} />
                        <Bar dataKey="cantidad" fill={COLOR_BARRA} radius={[0, 4, 4, 0]} maxBarSize={22} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-servitur-tarjeta rounded-xl shadow-sm border border-servitur-texto-secundario/10 p-4 md:p-5">
                  <h2 className="font-semibold text-servitur-texto mb-3">Incidencias por unidad</h2>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={porUnidad} layout="vertical" margin={{ left: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                        <YAxis type="category" dataKey="nombre" width={60} tick={{ fontSize: 12, fill: '#252525' }} />
                        <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 13 }} cursor={{ fill: '#F4F5F6' }} />
                        <Bar dataKey="cantidad" fill={COLOR_LINEA} radius={[0, 4, 4, 0]} maxBarSize={22} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-servitur-tarjeta rounded-xl shadow-sm border border-servitur-texto-secundario/10 p-4 md:p-5">
                  <h2 className="font-semibold text-servitur-texto mb-3">Retrasos por unidad</h2>
                  {retrasos.length === 0 ? (
                    <p className="text-sm text-servitur-texto-secundario h-64 flex items-center justify-center">
                      No hay retrasos registrados.
                    </p>
                  ) : (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={retrasosPorUnidad} layout="vertical" margin={{ left: 8 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                          <YAxis type="category" dataKey="nombre" width={60} tick={{ fontSize: 12, fill: '#252525' }} />
                          <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 13 }} cursor={{ fill: '#F4F5F6' }} />
                          <Bar dataKey="cantidad" fill="#D97706" radius={[0, 4, 4, 0]} maxBarSize={22} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                <div className="bg-servitur-tarjeta rounded-xl shadow-sm border border-servitur-texto-secundario/10 p-4 md:p-5">
                  <h2 className="font-semibold text-servitur-texto mb-3">Incidencias por día de la semana</h2>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={porDiaSemana} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                        <XAxis dataKey="nombre" tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={{ stroke: '#E5E7EB' }} tickLine={false} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                        <Tooltip
                          contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 13 }}
                          labelFormatter={(_, payload) => payload?.[0]?.payload?.diaCompleto ?? ''}
                        />
                        <Bar dataKey="cantidad" fill={COLOR_BARRA} radius={[4, 4, 0, 0]} maxBarSize={36} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-servitur-tarjeta rounded-xl shadow-sm border border-servitur-texto-secundario/10 p-4 md:p-5 lg:col-span-2">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                    <h2 className="font-semibold text-servitur-texto flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-servitur-azul" /> Tendencia
                    </h2>
                    <div className="flex items-center gap-1.5 bg-servitur-fondo rounded-lg p-1 self-start">
                      {GRANULARIDADES.map((g) => (
                        <button
                          key={g.id}
                          onClick={() => setGranularidad(g.id)}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                            granularidad === g.id
                              ? 'bg-servitur-azul text-white'
                              : 'text-servitur-texto-secundario hover:text-servitur-texto'
                          }`}
                        >
                          {g.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={porTiempo} margin={{ top: 4, right: 16, left: -16, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                        <XAxis dataKey="etiqueta" tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={{ stroke: '#E5E7EB' }} tickLine={false} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 13 }} />
                        <Legend wrapperStyle={{ fontSize: 13 }} formatter={() => 'Incidencias registradas'} />
                        <Line type="monotone" dataKey="cantidad" stroke={COLOR_LINEA} strokeWidth={2.5} dot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="bg-servitur-tarjeta rounded-xl shadow-sm border border-servitur-texto-secundario/10 overflow-x-auto">
                <table className="w-full text-sm min-w-[640px]">
                  <thead>
                    <tr className="text-left text-servitur-texto-secundario border-b border-servitur-texto-secundario/15">
                      <th className="font-medium py-3 px-4">Fecha</th>
                      <th className="font-medium py-3 px-2">Conductor</th>
                      <th className="font-medium py-3 px-2">Unidad</th>
                      <th className="font-medium py-3 px-2">Tipo</th>
                      <th className="font-medium py-3 px-4">Descripción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...incidenciasVisibles]
                      .sort((a, b) => b.fecha.localeCompare(a.fecha))
                      .map((inc) => (
                        <tr key={inc.id} className="border-b border-servitur-texto-secundario/10 last:border-0">
                          <td className="py-2.5 px-4 text-servitur-texto-secundario">{inc.fecha}</td>
                          <td className="py-2.5 px-2 font-medium text-servitur-texto">{inc.conductor}</td>
                          <td className="py-2.5 px-2 text-servitur-texto-secundario">{inc.unidad}</td>
                          <td className="py-2.5 px-2">
                            <span className="flex items-center gap-1 text-xs text-servitur-rojo">
                              <AlertTriangle className="w-3.5 h-3.5" /> {inc.tipo}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-servitur-texto-secundario">{inc.descripcion}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                <div className="border-t border-servitur-texto-secundario/10 px-4 py-3 text-sm text-servitur-texto-secundario">
                  Total: <span className="font-medium text-servitur-texto">{incidenciasVisibles.length} incidencia{incidenciasVisibles.length === 1 ? '' : 's'}</span>
                  {' · '}
                  <span className="font-medium text-servitur-texto">{retrasos.length} retraso{retrasos.length === 1 ? '' : 's'}</span>
                  {' · '}
                  <span className="font-medium text-servitur-texto">{siniestros.length} de siniestralidad</span>
                </div>
              </div>
            </>
          )}
        </>
      )}

      <div className="print-area">
        <IncidenciasReportePrintable
          incidencias={incidenciasVisibles}
          porUnidad={porUnidad}
          retrasosPorUnidad={retrasosPorUnidad}
          porSemana={porSemanaReporte}
          porMes={porMesReporte}
          porDiaSemana={porDiaSemana}
          totalIncidencias={incidenciasVisibles.length}
          totalRetrasos={retrasos.length}
          alcance={alcanceReporte}
        />
      </div>
    </div>
  )
}