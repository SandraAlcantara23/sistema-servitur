import { Bus, User, ClipboardList, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react'

const ICONS = { unidades: Bus, conductores: User, permisos: ClipboardList, incidencias: AlertTriangle }

export default function StatCard({ stat, cargando }) {
  const Icon = ICONS[stat.key] ?? Bus
  const isRojo = stat.color === 'rojo'
  const TrendIcon = stat.trend === 'up' ? TrendingUp : TrendingDown

  return (
    <div
      className={`bg-servitur-tarjeta rounded-xl shadow-sm border border-servitur-texto-secundario/10 border-l-4 ${
        isRojo ? 'border-l-servitur-rojo' : 'border-l-servitur-azul'
      } p-4 flex items-start gap-3`}
    >
      <span
        className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${
          isRojo ? 'bg-gradient-to-br from-servitur-rojo to-servitur-rojo-hover' : 'bg-gradient-to-br from-servitur-azul to-servitur-azul-oscuro'
        } text-white shadow-sm`}
      >
        <Icon className="w-5 h-5" />
      </span>

      <div className="min-w-0">
        <p className="text-sm text-servitur-texto-secundario">{stat.label}</p>
        <p className="text-2xl font-semibold text-servitur-texto mt-0.5">
          {cargando ? '…' : stat.value}
          {!cargando && stat.total !== null && stat.total !== undefined && (
            <span className="text-base font-normal text-servitur-texto-secundario"> / {stat.total}</span>
          )}
        </p>
        {stat.delta && (
          <p
            className={`flex items-center gap-1 text-xs mt-1 ${
              stat.trend === 'up' ? 'text-green-600' : 'text-servitur-rojo'
            }`}
          >
            <TrendIcon className="w-3.5 h-3.5" />
            {stat.delta}
          </p>
        )}
      </div>
    </div>
  )
}