import { NavLink } from 'react-router-dom'
import {
  Home,
  Bus,
  Users,
  FileBarChart,
  ClipboardList,
  UserCog,
  Settings,
  History,
  ShieldCheck,
} from 'lucide-react'
import busSide from '../../assets/bus-hero.png'
import logoBlanco from '../../assets/logo-blanco.png'
import { useAuth } from '../../context/AuthContext.jsx'
import { paginaPermitida } from '../../utils/rolesPermisos.js'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Inicio', icon: Home, pagina: 'dashboard' },
  { to: '/unidades', label: 'Unidades', icon: Bus, pagina: 'unidades' },
  { to: '/operaciones', label: 'Aforo', icon: Users, pagina: 'operaciones' },
  { to: '/reportes', label: 'Reportes', icon: FileBarChart, pagina: 'reportes' },
  { to: '/permisos', label: 'Permisos', icon: ClipboardList, pagina: 'permisos' },
  { to: '/usuarios', label: 'Conductores', icon: UserCog, pagina: 'usuarios' },
  { to: '/auditoria', label: 'Auditoría', icon: History, pagina: 'auditoria' },
  { to: '/cumplimiento', label: 'Cumplimiento', icon: ShieldCheck, pagina: 'cumplimiento' },
  { to: '/configuracion', label: 'Configuración', icon: Settings, pagina: 'configuracion' },
]

export default function Sidebar({ forceVisible = false }) {
  const { sesion } = useAuth()
  const itemsVisibles = NAV_ITEMS.filter((item) => paginaPermitida(sesion?.rol, item.pagina))

  return (
    <aside
      className={`${
        forceVisible ? 'flex' : 'hidden lg:flex'
      } lg:flex flex-col w-64 h-screen sticky top-0 shrink-0 bg-servitur-azul-oscuro text-white relative overflow-hidden`}
    >
      {/* Franja diagonal roja de marca */}
      <div
        className="absolute top-0 right-0 w-24 h-24 bg-servitur-rojo"
        style={{ clipPath: 'polygon(100% 0, 100% 100%, 40% 0)' }}
      />

      <div className="px-6 py-6 relative">
        <img src={logoBlanco} alt="Servitur Gran Clas" className="w-44 lg:w-52" />
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {itemsVisibles.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-servitur-rojo text-white'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <Icon className="w-5 h-5 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Silueta del camión + tagline en la parte inferior */}
      <div className="relative mt-auto">
        <div className="relative h-40 overflow-hidden opacity-30">
          <img src={busSide} alt="" className="w-full h-full object-cover object-left" />
          <div className="absolute inset-0 bg-servitur-azul-oscuro/70" />
        </div>
        <p className="absolute inset-x-0 bottom-6 text-center text-sm text-white/80 font-medium">
          Calidad y Seguridad
          <br />a su Servicio
        </p>
      </div>
    </aside>
  )
}