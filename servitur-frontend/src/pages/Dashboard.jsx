import { useEffect, useState } from 'react'
import AppLayout from '../components/layout/AppLayout.jsx'
import StatCard from '../components/dashboard/StatCard.jsx'
import WelcomeBanner from '../components/dashboard/WelcomeBanner.jsx'
import PermisosRecientesCard from '../components/dashboard/PermisosRecientesCard.jsx'
import LicenciasPorVencerCard from '../components/dashboard/LicenciasPorVencerCard.jsx'
import IncidenciasRecientesCard from '../components/dashboard/IncidenciasRecientesCard.jsx'
import ActividadRecienteCard from '../components/dashboard/ActividadRecienteCard.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../services/api.js'

export default function Dashboard() {
  const { sesion } = useAuth()
  const [unidades, setUnidades] = useState([])
  const [conductores, setConductores] = useState([])
  const [permisos, setPermisos] = useState([])
  const [incidencias, setIncidencias] = useState([])
  const [actividad, setActividad] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let activo = true
    async function cargarTodo() {
      setCargando(true)
      // Promise.allSettled porque no todos los roles que ven el Dashboard
      // (Admin/Supervisor/Monitoreo/RH) tienen acceso a todos los endpoints
      // (p. ej. RH no ve /unidades/) — si uno falla, los demás igual cargan.
      const resultados = await Promise.allSettled([
        api.get('/unidades/'),
        api.get('/conductores/'),
        api.get('/permisos/'),
        api.get('/incidencias/'),
        api.get('/bitacora/'),
      ])
      if (!activo) return
      const [rUnidades, rConductores, rPermisos, rIncidencias, rBitacora] = resultados
      setUnidades(rUnidades.status === 'fulfilled' ? rUnidades.value : [])
      setConductores(rConductores.status === 'fulfilled' ? rConductores.value : [])
      setPermisos(rPermisos.status === 'fulfilled' ? rPermisos.value : [])
      setIncidencias(rIncidencias.status === 'fulfilled' ? rIncidencias.value : [])
      setActividad(rBitacora.status === 'fulfilled' ? rBitacora.value : [])
      setCargando(false)
    }
    cargarTodo()
    return () => { activo = false }
  }, [])

  const hace7dias = new Date()
  hace7dias.setDate(hace7dias.getDate() - 7)
  const hace7diasISO = hace7dias.toISOString().slice(0, 10)

  const conductoresActivos = conductores.filter((c) => c.estatus === 'Activo').length
  const permisosPendientes = permisos.filter((p) => p.estado === 'pendiente').length
  const incidenciasUltimos7Dias = incidencias.filter((i) => i.fecha >= hace7diasISO).length

  const stats = [
    { key: 'unidades', label: 'Unidades registradas', value: unidades.length, total: null, color: 'azul' },
    { key: 'conductores', label: 'Conductores activos', value: conductoresActivos, total: conductores.length, color: 'rojo' },
    { key: 'permisos', label: 'Permisos pendientes', value: permisosPendientes, total: null, color: 'azul' },
    { key: 'incidencias', label: 'Incidencias (últimos 7 días)', value: incidenciasUltimos7Dias, total: null, color: 'rojo' },
  ]

  const licenciasPorVencer = conductores
    .filter((c) => c.estatus_licencia === 'Por vencer' || c.estatus_licencia === 'Vencida')
    .sort((a, b) => (a.vigencia_licencia || '').localeCompare(b.vigencia_licencia || ''))
    .slice(0, 5)

  const permisosRecientes = [...permisos]
    .sort((a, b) => (b.creado || '').localeCompare(a.creado || ''))
    .slice(0, 5)

  const incidenciasRecientes = [...incidencias]
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .slice(0, 5)

  const actividadReciente = actividad.slice(0, 6)

  return (
    <AppLayout>
      <div className="space-y-4 md:space-y-6">
        <WelcomeBanner userName={sesion?.nombre} />

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {stats.map((s) => (
            <StatCard key={s.key} stat={s} cargando={cargando} />
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
          <PermisosRecientesCard permisos={permisosRecientes} cargando={cargando} />
          <LicenciasPorVencerCard conductores={licenciasPorVencer} cargando={cargando} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
          <IncidenciasRecientesCard incidencias={incidenciasRecientes} cargando={cargando} />
          <ActividadRecienteCard eventos={actividadReciente} cargando={cargando} />
        </div>
      </div>
    </AppLayout>
  )
}