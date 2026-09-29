import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ClipboardList, Check, X as XIcon, Plus, Pencil, Lock, Search,
  Paperclip, FileDown, FileSpreadsheet, BarChart3,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import AppLayout from '../components/layout/AppLayout.jsx'
import IncidenciasPanel from '../components/permisos/IncidenciasPanel.jsx'
import PermisosListPrintable from '../components/reports/PermisosListPrintable.jsx'
import { exportarComoPDF, exportarAExcel } from '../utils/exportReports.js'
import EmptyState from '../components/common/EmptyState.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useBitacora } from '../hooks/useBitacora.js'
import { api } from '../services/api.js'

const ROLES_CON_PERMISO = ['RH', 'Administrador', 'Supervisor']

const ESTATUS_STYLES = {
  Pendiente: 'bg-amber-100 text-amber-700',
  Aprobado: 'bg-green-100 text-green-700',
  Rechazado: 'bg-red-100 text-red-700',
}

const ESTATUS_FILTRO = ['Todos', 'Pendiente', 'Aprobado', 'Rechazado']

const TIPO_LABELS = { personal: 'Permiso personal', oficio: 'Oficio de comisión' }
const ESTADO_LABELS = { pendiente: 'Pendiente', autorizado: 'Aprobado', rechazado: 'Rechazado' }

const COLOR_BARRA = '#173F63'

// El backend maneja fechas/estatus/tipo en sus propias claves (fecha_inicio,
// estado="autorizado", tipo="oficio", etc.). Este helper traduce cada
// Permiso que devuelve la API a la forma que ya usan la tabla, el reporte
// imprimible y el export a Excel de esta pantalla.
function normalizar(p) {
  return {
    id: p.id,
    conductorId: p.conductor,
    conductor: p.conductor_nombre || '—',
    tipo: TIPO_LABELS[p.tipo] || p.tipo,
    tipoValor: p.tipo,
    fechaInicio: p.fecha_inicio || '',
    fechaFin: p.fecha_fin || '',
    motivo: p.motivo || '',
    documentoUrl: p.documento_url || null,
    documentoNombre: p.documento_url ? p.documento_url.split('/').pop() : null,
    solicitadoEl: p.creado ? new Date(p.creado).toLocaleDateString('es-MX') : '',
    estatus: ESTADO_LABELS[p.estado] || p.estado,
    estadoValor: p.estado,
    comentarioRH: p.comentario_rechazo || '',
  }
}

function lunesDeLaSemana(fecha) {
  const d = new Date(fecha + 'T00:00:00')
  const diaSemana = d.getDay()
  const diferencia = diaSemana === 0 ? -6 : 1 - diaSemana
  d.setDate(d.getDate() + diferencia)
  return d
}

function formatoFechaInput(fecha) {
  return fecha.toISOString().slice(0, 10)
}

// Agrupa las solicitudes por mes de su fecha de inicio, para la gráfica de
// "cuántos permisos hubo cada mes".
function agruparPorMes(lista) {
  const conteo = {}
  lista.forEach((item) => {
    if (!item.fechaInicio) return
    const mes = item.fechaInicio.slice(0, 7)
    conteo[mes] = (conteo[mes] || 0) + 1
  })
  return Object.entries(conteo)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, cantidad]) => ({
      etiqueta: new Date(mes + '-01T00:00:00').toLocaleDateString('es-MX', { month: 'short', year: '2-digit' }),
      cantidad,
    }))
}

export default function Permisos() {
  const [tab, setTab] = useState('solicitudes')
  const [solicitudes, setSolicitudes] = useState([])
  const [conductoresList, setConductoresList] = useState([])
  const [cargando, setCargando] = useState(true)
  const [errorCarga, setErrorCarga] = useState('')

  const [mostrarForm, setMostrarForm] = useState(false)
  const [nuevo, setNuevo] = useState({ conductor: '', tipo: 'personal', fechaInicio: '', fechaFin: '', motivo: '' })
  const [documento, setDocumento] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [editandoId, setEditandoId] = useState(null)
  const [rechazandoId, setRechazandoId] = useState(null)
  const [comentarioRechazo, setComentarioRechazo] = useState('')
  const [filtroConductor, setFiltroConductor] = useState('')
  const [filtroEstatus, setFiltroEstatus] = useState('Todos')
  const [errorSolicitud, setErrorSolicitud] = useState('')
  const [rangoDesde, setRangoDesde] = useState('')
  const [rangoHasta, setRangoHasta] = useState('')

  const { sesion } = useAuth()
  const rolActual = sesion?.rol
  const esConductor = rolActual === 'Conductor'
  const { registrar } = useBitacora()
  const puedeGestionar = ROLES_CON_PERMISO.includes(rolActual)

  useEffect(() => {
    let activo = true
    async function cargar() {
      setCargando(true)
      setErrorCarga('')
      try {
        const tareas = [api.get('/permisos/')]
        if (!esConductor) tareas.push(api.get('/conductores/'))
        const resultados = await Promise.all(tareas)
        if (!activo) return
        setSolicitudes(resultados[0].map(normalizar))
        if (!esConductor) setConductoresList(resultados[1])
      } catch (err) {
        if (activo) setErrorCarga(err.message || 'No se pudieron cargar las solicitudes.')
      } finally {
        if (activo) setCargando(false)
      }
    }
    cargar()
    return () => { activo = false }
  }, [esConductor])

  // El backend ya filtra por rol (un Conductor solo recibe lo suyo), así
  // que aquí no hace falta volver a filtrar por conductor.
  const solicitudesDelRol = solicitudes

  // Filtro por periodo (semana / mes / rango personalizado), con base en la
  // fecha de inicio del permiso. Alimenta tanto la tabla como la gráfica.
  const solicitudesVisibles = solicitudesDelRol.filter((s) => {
    if (rangoDesde && s.fechaInicio && s.fechaInicio < rangoDesde) return false
    if (rangoHasta && s.fechaInicio && s.fechaInicio > rangoHasta) return false
    return true
  })

  const solicitudesFiltradas = solicitudesVisibles.filter((s) => {
    const coincideConductor = s.conductor.toLowerCase().includes(filtroConductor.trim().toLowerCase())
    const coincideEstatus = filtroEstatus === 'Todos' || s.estatus === filtroEstatus
    return coincideConductor && coincideEstatus
  })

  const conteo = {
    Pendiente: solicitudesVisibles.filter((s) => s.estatus === 'Pendiente').length,
    Aprobado: solicitudesVisibles.filter((s) => s.estatus === 'Aprobado').length,
    Rechazado: solicitudesVisibles.filter((s) => s.estatus === 'Rechazado').length,
  }

  const porMes = useMemo(() => agruparPorMes(solicitudesVisibles), [solicitudesVisibles])

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

  const aprobar = async (id) => {
    const solicitud = solicitudes.find((s) => s.id === id)
    try {
      const actualizado = normalizar(await api.post(`/permisos/${id}/autorizar/`))
      setSolicitudes((prev) => prev.map((s) => (s.id === id ? actualizado : s)))
      setEditandoId(null)
      if (solicitud) registrar('aprobar', 'Permisos', `Aprobó ${solicitud.tipo} de ${solicitud.conductor} (${solicitud.fechaInicio} a ${solicitud.fechaFin})`)
    } catch (err) {
      setErrorCarga(err.message || 'No se pudo aprobar la solicitud.')
    }
  }

  const iniciarRechazo = (id) => {
    setRechazandoId(id)
    setComentarioRechazo('')
  }

  const confirmarRechazo = async (id) => {
    const solicitud = solicitudes.find((s) => s.id === id)
    try {
      const actualizado = normalizar(
        await api.post(`/permisos/${id}/rechazar/`, { comentario: comentarioRechazo })
      )
      setSolicitudes((prev) => prev.map((s) => (s.id === id ? actualizado : s)))
      setRechazandoId(null)
      setEditandoId(null)
      if (solicitud) registrar('rechazar', 'Permisos', `Rechazó ${solicitud.tipo} de ${solicitud.conductor} (${solicitud.fechaInicio} a ${solicitud.fechaFin})`)
    } catch (err) {
      setErrorCarga(err.message || 'No se pudo rechazar la solicitud.')
    }
  }

  const enviarSolicitud = async (e) => {
    e.preventDefault()

    if (nuevo.fechaFin < nuevo.fechaInicio) {
      setErrorSolicitud('La fecha de fin no puede ser anterior a la fecha de inicio.')
      return
    }
    if (!esConductor && !nuevo.conductor) {
      setErrorSolicitud('Selecciona el conductor.')
      return
    }
    setErrorSolicitud('')
    setEnviando(true)

    try {
      let creado
      if (documento) {
        const form = new FormData()
        if (!esConductor) form.append('conductor', nuevo.conductor)
        form.append('tipo', nuevo.tipo)
        form.append('fecha_inicio', nuevo.fechaInicio)
        form.append('fecha_fin', nuevo.fechaFin)
        form.append('motivo', nuevo.motivo)
        form.append('documento', documento)
        creado = await api.post('/permisos/', form)
      } else {
        creado = await api.post('/permisos/', {
          ...(esConductor ? {} : { conductor: nuevo.conductor }),
          tipo: nuevo.tipo,
          fecha_inicio: nuevo.fechaInicio,
          fecha_fin: nuevo.fechaFin,
          motivo: nuevo.motivo,
        })
      }
      const solicitudNormalizada = normalizar(creado)
      setSolicitudes((prev) => [solicitudNormalizada, ...prev])
      registrar('crear', 'Permisos', `Nueva solicitud de ${solicitudNormalizada.tipo} para ${solicitudNormalizada.conductor} (${nuevo.fechaInicio} a ${nuevo.fechaFin})`)
      setNuevo({ conductor: '', tipo: 'personal', fechaInicio: '', fechaFin: '', motivo: '' })
      setDocumento(null)
      setMostrarForm(false)
      setErrorSolicitud('')
    } catch (err) {
      setErrorSolicitud(err.message || 'No se pudo enviar la solicitud.')
    } finally {
      setEnviando(false)
    }
  }

  const descargarPDF = () => {
    setTimeout(() => exportarComoPDF('permisos-listado.pdf'), 50)
  }

  const descargarExcel = () => {
    const filas = solicitudesFiltradas.map((s) => ({
      Conductor: s.conductor,
      Tipo: s.tipo,
      'Fecha inicio': s.fechaInicio,
      'Fecha fin': s.fechaFin,
      Motivo: s.motivo,
      'Solicitado el': s.solicitadoEl,
      Estatus: s.estatus,
      'Comentario RH': s.comentarioRH ? s.comentarioRH : '',
    }))
    exportarAExcel(filas, 'permisos-listado.xlsx')
  }

  return (
    <AppLayout>
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-semibold text-servitur-texto">
              <ClipboardList className="w-5 h-5 text-servitur-azul" />
              Permisos y oficios
            </h1>
            <p className="text-sm text-servitur-texto-secundario mt-0.5">
              Solicitudes de los conductores (permiso personal u oficio de comisión) y su aprobación por RH.
            </p>
          </div>
          {tab === 'solicitudes' && (
            <button
              onClick={() => setMostrarForm(!mostrarForm)}
              className="flex items-center gap-1.5 text-sm bg-servitur-azul hover:opacity-90 text-white px-3 py-2 rounded-lg self-start"
            >
              <Plus className="w-4 h-4" /> Nueva solicitud
            </button>
          )}
        </div>

        <div className="flex gap-2 border-b border-servitur-texto-secundario/15">
          <button
            onClick={() => setTab('solicitudes')}
            className={
              tab === 'solicitudes'
                ? 'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors border-servitur-rojo text-servitur-rojo'
                : 'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors border-transparent text-servitur-texto-secundario hover:text-servitur-texto'
            }
          >
            Solicitudes de permiso
          </button>
          <button
            onClick={() => setTab('incidencias')}
            className={
              tab === 'incidencias'
                ? 'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors border-servitur-rojo text-servitur-rojo'
                : 'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors border-transparent text-servitur-texto-secundario hover:text-servitur-texto'
            }
          >
            Retrasos e incidencias
          </button>
        </div>

        {tab === 'incidencias' ? (
          <IncidenciasPanel />
        ) : (
          <div>
            {errorCarga && (
              <div className="mb-4 text-sm text-servitur-rojo bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {errorCarga}
              </div>
            )}

            {solicitudesDelRol.length > 0 && (
              <div className="bg-servitur-tarjeta rounded-xl shadow-sm border border-servitur-texto-secundario/10 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 md:mb-6">
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

            <div className="grid grid-cols-3 gap-3 mb-4 md:mb-6">
              <div className="bg-servitur-tarjeta rounded-xl shadow-sm border border-servitur-texto-secundario/10 p-3 text-center">
                <p className="text-xl font-semibold text-servitur-texto">{conteo.Pendiente}</p>
                <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                  Pendiente
                </span>
              </div>
              <div className="bg-servitur-tarjeta rounded-xl shadow-sm border border-servitur-texto-secundario/10 p-3 text-center">
                <p className="text-xl font-semibold text-servitur-texto">{conteo.Aprobado}</p>
                <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                  Aprobado
                </span>
              </div>
              <div className="bg-servitur-tarjeta rounded-xl shadow-sm border border-servitur-texto-secundario/10 p-3 text-center">
                <p className="text-xl font-semibold text-servitur-texto">{conteo.Rechazado}</p>
                <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                  Rechazado
                </span>
              </div>
            </div>

            {mostrarForm && (
              <form
                onSubmit={enviarSolicitud}
                className="bg-servitur-tarjeta rounded-xl shadow-sm border border-servitur-texto-secundario/10 p-4 md:p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 md:mb-6"
              >
                <div>
                  <label className="block text-sm font-medium text-servitur-texto mb-1">Conductor</label>
                  {esConductor ? (
                    <input
                      type="text"
                      readOnly
                      value={sesion?.nombre ?? ''}
                      className="w-full border border-servitur-texto-secundario/30 rounded-lg px-3 py-2.5 text-sm bg-servitur-fondo text-servitur-texto-secundario"
                    />
                  ) : (
                    <select
                      required
                      value={nuevo.conductor}
                      onChange={(e) => setNuevo({ ...nuevo, conductor: e.target.value })}
                      className="w-full border border-servitur-texto-secundario/30 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-servitur-azul"
                    >
                      <option value="">Selecciona un conductor...</option>
                      {conductoresList.map((c) => (
                        <option key={c.id} value={c.id}>{c.nombre_completo || c.clave}</option>
                      ))}
                    </select>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-servitur-texto mb-1">Tipo de solicitud</label>
                  <select
                    value={nuevo.tipo}
                    onChange={(e) => setNuevo({ ...nuevo, tipo: e.target.value })}
                    className="w-full border border-servitur-texto-secundario/30 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-servitur-azul"
                  >
                    <option value="personal">Permiso personal</option>
                    <option value="oficio">Oficio de comisión</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-servitur-texto mb-1">Fecha de inicio</label>
                  <input
                    required
                    type="date"
                    value={nuevo.fechaInicio}
                    onChange={(e) => setNuevo({ ...nuevo, fechaInicio: e.target.value })}
                    className="w-full border border-servitur-texto-secundario/30 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-servitur-azul"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-servitur-texto mb-1">Fecha de fin</label>
                  <input
                    required
                    type="date"
                    min={nuevo.fechaInicio || undefined}
                    value={nuevo.fechaFin}
                    onChange={(e) => setNuevo({ ...nuevo, fechaFin: e.target.value })}
                    className="w-full border border-servitur-texto-secundario/30 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-servitur-azul"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-servitur-texto mb-1">Motivo</label>
                  <textarea
                    required
                    rows={2}
                    value={nuevo.motivo}
                    onChange={(e) => setNuevo({ ...nuevo, motivo: e.target.value })}
                    className="w-full border border-servitur-texto-secundario/30 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-servitur-azul resize-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-servitur-texto mb-1">Documento de soporte (opcional)</label>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setDocumento(e.target.files[0] ? e.target.files[0] : null)}
                    className="w-full text-sm border border-servitur-texto-secundario/30 rounded-lg px-3 py-2 outline-none focus:border-servitur-azul"
                  />
                  <p className="text-xs text-servitur-texto-secundario mt-1">
                    Por ejemplo, la constancia de una cita médica o el comprobante del trámite.
                  </p>
                </div>
                <div className="sm:col-span-2 flex items-center justify-between gap-3">
                  {errorSolicitud ? (
                    <p className="text-sm text-servitur-rojo">{errorSolicitud}</p>
                  ) : (
                    <span />
                  )}
                  <button
                    type="submit"
                    disabled={enviando}
                    className="bg-servitur-azul text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:opacity-90 disabled:opacity-60"
                  >
                    {enviando ? 'Enviando...' : 'Enviar solicitud'}
                  </button>
                </div>
              </form>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4 md:mb-6">
              <div className="flex items-center gap-2 border border-servitur-texto-secundario/30 rounded-lg px-3 py-2 bg-servitur-tarjeta flex-1">
                <Search className="w-4 h-4 text-servitur-texto-secundario" />
                <input
                  type="text"
                  value={filtroConductor}
                  onChange={(e) => setFiltroConductor(e.target.value)}
                  placeholder="Buscar por conductor..."
                  className="outline-none text-sm bg-transparent w-full"
                />
              </div>
              <select
                value={filtroEstatus}
                onChange={(e) => setFiltroEstatus(e.target.value)}
                className="border border-servitur-texto-secundario/30 rounded-lg px-3 py-2 text-sm outline-none bg-servitur-tarjeta focus:border-servitur-azul"
              >
                {ESTATUS_FILTRO.map((e) => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
              <div className="flex items-center gap-2">
                <button
                  onClick={descargarPDF}
                  className="flex items-center gap-1.5 text-sm border border-servitur-azul text-servitur-azul px-3 py-2 rounded-lg hover:bg-servitur-azul/5"
                >
                  <FileDown className="w-4 h-4" /> PDF
                </button>
                <button
                  onClick={descargarExcel}
                  className="flex items-center gap-1.5 text-sm border border-green-700 text-green-700 px-3 py-2 rounded-lg hover:bg-green-50"
                >
                  <FileSpreadsheet className="w-4 h-4" /> Excel
                </button>
              </div>
            </div>

            <div className="bg-servitur-tarjeta rounded-xl shadow-sm border border-servitur-texto-secundario/10 overflow-x-auto">
              {cargando ? (
                <p className="text-sm text-servitur-texto-secundario p-6 text-center">Cargando solicitudes...</p>
              ) : solicitudesFiltradas.length === 0 ? (
                <EmptyState
                  titulo="No hay solicitudes con estos filtros"
                  descripcion="Prueba con otro nombre de conductor, cambia el estatus o el periodo seleccionado."
                  onLimpiar={() => {
                    setFiltroConductor('')
                    setFiltroEstatus('Todos')
                    limpiarRango()
                  }}
                />
              ) : (
                <table className="w-full text-sm min-w-[780px]">
                  <thead>
                    <tr className="text-left text-servitur-texto-secundario border-b border-servitur-texto-secundario/15">
                      <th className="font-medium py-3 px-4">Conductor</th>
                      <th className="font-medium py-3 px-2">Tipo</th>
                      <th className="font-medium py-3 px-2">Periodo</th>
                      <th className="font-medium py-3 px-2">Motivo</th>
                      <th className="font-medium py-3 px-2">Solicitado el</th>
                      <th className="font-medium py-3 px-2">Estatus</th>
                      <th className="font-medium py-3 px-4">RH</th>
                    </tr>
                  </thead>
                  <tbody>
                    {solicitudesFiltradas.map((s) => {
                      let celdaConductor
                      if (s.conductorId) {
                        celdaConductor = (
                          <Link to={'/usuarios/' + s.conductorId} className="text-servitur-azul hover:underline">
                            {s.conductor}
                          </Link>
                        )
                      } else {
                        celdaConductor = <span className="text-servitur-texto">{s.conductor}</span>
                      }

                      let celdaAdjunto = null
                      if (s.documentoUrl) {
                        celdaAdjunto = (
                          <a
                            href={s.documentoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 text-xs text-servitur-azul hover:underline mt-0.5"
                          >
                            <Paperclip className="w-3 h-3" />
                            {s.documentoNombre}
                          </a>
                        )
                      }

                      let celdaComentario = null
                      if (s.comentarioRH) {
                        celdaComentario = (
                          <p className="text-xs text-servitur-texto-secundario mt-1 max-w-[160px]" title={s.comentarioRH}>
                            {s.comentarioRH}
                          </p>
                        )
                      }

                      let celdaAcciones
                      if (rechazandoId === s.id) {
                        celdaAcciones = (
                          <div className="flex flex-col gap-1.5 min-w-[180px]">
                            <textarea
                              autoFocus
                              rows={2}
                              value={comentarioRechazo}
                              onChange={(e) => setComentarioRechazo(e.target.value)}
                              placeholder="Motivo del rechazo (opcional)"
                              className="w-full border border-servitur-texto-secundario/30 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-servitur-azul resize-none"
                            />
                            <div className="flex items-center gap-2">
                              <button onClick={() => confirmarRechazo(s.id)} className="text-xs text-servitur-rojo hover:underline">
                                Confirmar rechazo
                              </button>
                              <button onClick={() => setRechazandoId(null)} className="text-xs text-servitur-texto-secundario hover:underline">
                                Cancelar
                              </button>
                            </div>
                          </div>
                        )
                      } else if (s.estatus === 'Pendiente' || editandoId === s.id) {
                        if (puedeGestionar) {
                          celdaAcciones = (
                            <div className="flex items-center gap-2">
                              <button onClick={() => aprobar(s.id)} className="flex items-center gap-1 text-xs text-green-700 hover:underline">
                                <Check className="w-3.5 h-3.5" /> Aprobar
                              </button>
                              <button onClick={() => iniciarRechazo(s.id)} className="flex items-center gap-1 text-xs text-servitur-rojo hover:underline">
                                <XIcon className="w-3.5 h-3.5" /> Rechazar
                              </button>
                              {editandoId === s.id && (
                                <button onClick={() => setEditandoId(null)} className="text-xs text-servitur-texto-secundario hover:underline">
                                  Cancelar
                                </button>
                              )}
                            </div>
                          )
                        } else {
                          celdaAcciones = (
                            <span className="flex items-center gap-1 text-xs text-servitur-texto-secundario">
                              <Lock className="w-3.5 h-3.5" /> Solo RH / supervisores
                            </span>
                          )
                        }
                      } else if (puedeGestionar) {
                        celdaAcciones = (
                          <button onClick={() => setEditandoId(s.id)} className="flex items-center gap-1 text-xs text-servitur-azul hover:underline">
                            <Pencil className="w-3.5 h-3.5" /> Editar
                          </button>
                        )
                      } else {
                        celdaAcciones = <span className="text-xs text-servitur-texto-secundario">—</span>
                      }

                      return (
                        <tr key={s.id} className="border-b border-servitur-texto-secundario/10 last:border-0">
                          <td className="py-2.5 px-4 font-medium">{celdaConductor}</td>
                          <td className="py-2.5 px-2 text-servitur-texto-secundario">{s.tipo}</td>
                          <td className="py-2.5 px-2 text-servitur-texto-secundario">{s.fechaInicio} - {s.fechaFin}</td>
                          <td className="py-2.5 px-2 text-servitur-texto-secundario max-w-xs">
                            <span className="truncate block" title={s.motivo}>{s.motivo}</span>
                            {celdaAdjunto}
                          </td>
                          <td className="py-2.5 px-2 text-servitur-texto-secundario">{s.solicitadoEl}</td>
                          <td className="py-2.5 px-2">
                            <span className={'px-2.5 py-1 rounded-full text-xs font-medium ' + ESTATUS_STYLES[s.estatus]}>
                              {s.estatus}
                            </span>
                            {celdaComentario}
                          </td>
                          <td className="py-2.5 px-4">{celdaAcciones}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {solicitudesDelRol.length > 0 && (
              <div className="bg-servitur-tarjeta rounded-xl shadow-sm border border-servitur-texto-secundario/10 p-4 md:p-5 mt-4 md:mt-6">
                <h2 className="font-semibold text-servitur-texto mb-3 flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-servitur-azul" /> Solicitudes por mes
                </h2>
                {porMes.length === 0 ? (
                  <p className="text-sm text-servitur-texto-secundario h-64 flex items-center justify-center">
                    No hay solicitudes en este periodo.
                  </p>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={porMes} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                        <XAxis dataKey="etiqueta" tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={{ stroke: '#E5E7EB' }} tickLine={false} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                        <Tooltip
                          contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 13 }}
                          formatter={(value) => [value, 'Solicitudes']}
                        />
                        <Bar dataKey="cantidad" fill={COLOR_BARRA} radius={[4, 4, 0, 0]} maxBarSize={36} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="print-area">
        <PermisosListPrintable solicitudes={solicitudesFiltradas} />
      </div>
    </AppLayout>
  )
}