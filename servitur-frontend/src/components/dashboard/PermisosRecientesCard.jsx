import { ClipboardList, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'

const TIPO_LABELS = { personal: 'Permiso personal', oficio: 'Oficio de comisión' }
const ESTADO_LABELS = { pendiente: 'Pendiente', autorizado: 'Aprobado', rechazado: 'Rechazado' }
const ESTADO_STYLES = {
  pendiente: 'bg-amber-100 text-amber-700',
  autorizado: 'bg-green-100 text-green-700',
  rechazado: 'bg-red-100 text-red-700',
}

export default function PermisosRecientesCard({ permisos, cargando }) {
  return (
    <div className="bg-servitur-tarjeta rounded-xl shadow-sm border border-servitur-texto-secundario/10 p-4 md:p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="flex items-center gap-2 font-semibold text-servitur-texto">
          <ClipboardList className="w-4 h-4 text-servitur-azul" />
          Permisos recientes
        </h2>
        <Link to="/permisos" className="flex items-center gap-1 text-sm text-servitur-azul hover:underline">
          Ver todos <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {cargando ? (
        <p className="text-sm text-servitur-texto-secundario">Cargando...</p>
      ) : permisos.length === 0 ? (
        <p className="text-sm text-servitur-texto-secundario">Sin solicitudes registradas.</p>
      ) : (
        <ul className="space-y-3">
          {permisos.map((p) => (
            <li key={p.id} className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-servitur-texto truncate">{p.conductor_nombre}</p>
                <p className="text-xs text-servitur-texto-secundario">
                  {TIPO_LABELS[p.tipo] || p.tipo} · {p.fecha_inicio || '—'} — {p.fecha_fin || '—'}
                </p>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium shrink-0 ${ESTADO_STYLES[p.estado] || ''}`}>
                {ESTADO_LABELS[p.estado] || p.estado}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}