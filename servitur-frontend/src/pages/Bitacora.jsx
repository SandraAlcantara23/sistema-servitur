import { useEffect, useMemo, useState } from 'react'
import { History, Search, FileDown, FileSpreadsheet } from 'lucide-react'
import AppLayout from '../components/layout/AppLayout.jsx'
import EmptyState from '../components/common/EmptyState.jsx'
import { exportarComoPDF, exportarAExcel } from '../utils/exportReports.js'
import BitacoraReportePrintable from '../components/reports/BitacoraReportePrintable.jsx'
import { api } from '../services/api.js'

const ACCION_LABELS = {
  crear: 'Creó',
  actualizar: 'Actualizó',
  eliminar: 'Eliminó',
  autorizar: 'Autorizó',
  rechazar: 'Rechazó',
  iniciar_sesion: 'Inició sesión',
  registrar_cuenta: 'Registró cuenta',
}

const ACCION_STYLES = {
  crear: 'bg-green-100 text-green-700',
  actualizar: 'bg-blue-100 text-blue-700',
  eliminar: 'bg-red-100 text-red-700',
  autorizar: 'bg-green-100 text-green-700',
  rechazar: 'bg-red-100 text-red-700',
  iniciar_sesion: 'bg-gray-100 text-gray-600',
  registrar_cuenta: 'bg-amber-100 text-amber-700',
}

// El backend regresa usuario_nombre/rol/modulo/entidad_afectada; aquí se
// traduce a los nombres que ya usa esta pantalla y su reporte.
function normalizarEvento(ev) {
  return {
    id: ev.id,
    fecha: ev.fecha,
    usuario: ev.usuario_nombre,
    rol: ev.rol || '—',
    accion: ev.accion,
    modulo: ev.modulo || '—',
    detalle: ev.entidad_afectada,
  }
}

export default function Bitacora() {
  const [eventos, setEventos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [errorCarga, setErrorCarga] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [filtroModulo, setFiltroModulo] = useState('Todos')
  const [filtroAccion, setFiltroAccion] = useState('Todas')

  useEffect(() => {
    let activo = true
    async function cargar() {
      setCargando(true)
      setErrorCarga('')
      try {
        const data = await api.get('/bitacora/')
        if (activo) setEventos(data.map(normalizarEvento))
      } catch (err) {
        if (activo) setErrorCarga(err.message || 'No se pudo cargar la bitácora.')
      } finally {
        if (activo) setCargando(false)
      }
    }
    cargar()
    return () => { activo = false }
  }, [])

  const modulos = useMemo(() => ['Todos', ...new Set(eventos.map((e) => e.modulo))], [eventos])
  const acciones = useMemo(() => ['Todas', ...new Set(eventos.map((e) => e.accion))], [eventos])

  const eventosFiltrados = eventos.filter((e) => {
    const coincideBusqueda = e.usuario.toLowerCase().includes(busqueda.trim().toLowerCase())
    const coincideModulo = filtroModulo === 'Todos' || e.modulo === filtroModulo
    const coincideAccion = filtroAccion === 'Todas' || e.accion === filtroAccion
    return coincideBusqueda && coincideModulo && coincideAccion
  })

  const filtrosLabel = [
    busqueda ? `usuario contiene "${busqueda}"` : null,
    filtroModulo !== 'Todos' ? `módulo: ${filtroModulo}` : null,
    filtroAccion !== 'Todas' ? `acción: ${ACCION_LABELS[filtroAccion] ?? filtroAccion}` : null,
  ].filter(Boolean).join(' · ') || 'Ninguno (todos los eventos)'

  const descargarPDF = () => {
    setTimeout(() => exportarComoPDF('bitacora-auditoria.pdf'), 200)
  }

  const descargarExcel = () => {
    const filas = eventosFiltrados.map((e) => ({
      'Fecha y hora': new Date(e.fecha).toLocaleString('es-MX'),
      Usuario: e.usuario,
      Rol: e.rol,
      Acción: ACCION_LABELS[e.accion] ?? e.accion,
      Módulo: e.modulo,
      Detalle: e.detalle,
    }))
    exportarAExcel(filas, 'bitacora-auditoria.xlsx', 'Bitácora de auditoría')
  }

  return (
    <AppLayout>
      <div className="space-y-4 md:space-y-6">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold text-servitur-texto">
            <History className="w-5 h-5 text-servitur-azul" />
            Bitácora de auditoría
          </h1>
          <p className="text-sm text-servitur-texto-secundario mt-0.5">
            Quién hizo qué y cuándo — registro de altas, ediciones, bajas, aprobaciones y rechazos en el sistema.
          </p>
        </div>

        {errorCarga && (
          <div className="text-sm text-servitur-rojo bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {errorCarga}
          </div>
        )}

        <div className="bg-servitur-tarjeta rounded-xl shadow-sm border border-servitur-texto-secundario/10 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 border border-servitur-texto-secundario/30 rounded-lg px-3 py-2 bg-servitur-fondo">
              <Search className="w-4 h-4 text-servitur-texto-secundario" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por usuario..."
                className="outline-none text-sm bg-transparent w-40"
              />
            </div>
            <select
              value={filtroModulo}
              onChange={(e) => setFiltroModulo(e.target.value)}
              className="border border-servitur-texto-secundario/30 rounded-lg px-3 py-2 text-sm outline-none bg-servitur-fondo focus:border-servitur-azul"
            >
              {modulos.map((m) => (
                <option key={m} value={m}>{m === 'Todos' ? 'Todos los módulos' : m}</option>
              ))}
            </select>
            <select
              value={filtroAccion}
              onChange={(e) => setFiltroAccion(e.target.value)}
              className="border border-servitur-texto-secundario/30 rounded-lg px-3 py-2 text-sm outline-none bg-servitur-fondo focus:border-servitur-azul"
            >
              {acciones.map((a) => (
                <option key={a} value={a}>{a === 'Todas' ? 'Todas las acciones' : (ACCION_LABELS[a] ?? a)}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={descargarPDF}
              disabled={eventosFiltrados.length === 0}
              className="flex items-center gap-1.5 text-sm border border-servitur-azul text-servitur-azul px-3 py-2 rounded-lg hover:bg-servitur-azul/5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
            >
              <FileDown className="w-4 h-4" /> PDF
            </button>
            <button
              onClick={descargarExcel}
              disabled={eventosFiltrados.length === 0}
              className="flex items-center gap-1.5 text-sm border border-servitur-azul text-servitur-azul px-3 py-2 rounded-lg hover:bg-servitur-azul/5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
            >
              <FileSpreadsheet className="w-4 h-4" /> Excel
            </button>
          </div>
        </div>

        <div className="bg-servitur-tarjeta rounded-xl shadow-sm border border-servitur-texto-secundario/10 overflow-x-auto">
          {cargando ? (
            <p className="text-sm text-servitur-texto-secundario p-6 text-center">Cargando bitácora...</p>
          ) : eventosFiltrados.length === 0 ? (
            <EmptyState
              titulo="Sin eventos"
              descripcion={
                eventos.length === 0
                  ? 'Todavía no hay eventos registrados en la bitácora.'
                  : 'No hay eventos que coincidan con estos filtros.'
              }
              onLimpiar={
                eventos.length > 0
                  ? () => {
                      setBusqueda('')
                      setFiltroModulo('Todos')
                      setFiltroAccion('Todas')
                    }
                  : undefined
              }
            />
          ) : (
            <>
              <table className="w-full text-sm min-w-[780px]">
                <thead>
                  <tr className="text-left text-servitur-texto-secundario border-b border-servitur-texto-secundario/15">
                    <th className="font-medium py-3 px-4">Fecha y hora</th>
                    <th className="font-medium py-3 px-2">Usuario</th>
                    <th className="font-medium py-3 px-2 hidden sm:table-cell">Rol</th>
                    <th className="font-medium py-3 px-2">Acción</th>
                    <th className="font-medium py-3 px-2">Módulo</th>
                    <th className="font-medium py-3 px-4">Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {eventosFiltrados.map((ev) => (
                    <tr key={ev.id} className="border-b border-servitur-texto-secundario/10 last:border-0 hover:bg-servitur-fondo">
                      <td className="py-2.5 px-4 text-servitur-texto-secundario whitespace-nowrap">
                        {new Date(ev.fecha).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="py-2.5 px-2 font-medium text-servitur-texto">{ev.usuario}</td>
                      <td className="py-2.5 px-2 text-servitur-texto-secundario hidden sm:table-cell">{ev.rol}</td>
                      <td className="py-2.5 px-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ACCION_STYLES[ev.accion] ?? 'bg-gray-100 text-gray-600'}`}>
                          {ACCION_LABELS[ev.accion] ?? ev.accion}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-servitur-texto-secundario">{ev.modulo}</td>
                      <td className="py-2.5 px-4 text-servitur-texto-secundario">{ev.detalle}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="border-t border-servitur-texto-secundario/10 px-4 py-3 text-sm text-servitur-texto-secundario">
                Total: <span className="font-medium text-servitur-texto">{eventosFiltrados.length} evento{eventosFiltrados.length === 1 ? '' : 's'}</span>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="print-area">
        <BitacoraReportePrintable eventos={eventosFiltrados} filtrosLabel={filtrosLabel} />
      </div>
    </AppLayout>
  )
}