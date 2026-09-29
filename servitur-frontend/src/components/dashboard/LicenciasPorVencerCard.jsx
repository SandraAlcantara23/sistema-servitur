import { CreditCard, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'

const ESTADO_STYLES = {
  'Por vencer': 'bg-amber-100 text-amber-700',
  Vencida: 'bg-red-100 text-red-700',
}

export default function LicenciasPorVencerCard({ conductores, cargando }) {
  return (
    <div className="bg-servitur-tarjeta rounded-xl shadow-sm border border-servitur-texto-secundario/10 p-4 md:p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="flex items-center gap-2 font-semibold text-servitur-texto">
          <CreditCard className="w-4 h-4 text-servitur-azul" />
          Licencias por vencer
        </h2>
        <Link to="/usuarios" className="flex items-center gap-1 text-sm text-servitur-azul hover:underline">
          Ver conductores <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {cargando ? (
        <p className="text-sm text-servitur-texto-secundario">Cargando...</p>
      ) : conductores.length === 0 ? (
        <p className="text-sm text-servitur-texto-secundario">No hay licencias vencidas ni por vencer.</p>
      ) : (
        <ul className="space-y-3">
          {conductores.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-servitur-texto truncate">{c.nombre_completo}</p>
                <p className="text-xs text-servitur-texto-secundario">Vence: {c.vigencia_licencia}</p>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium shrink-0 ${ESTADO_STYLES[c.estatus_licencia] || ''}`}>
                {c.estatus_licencia}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}