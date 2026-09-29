import { AlertTriangle, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'

const TIPO_LABELS = {
  retraso: 'Retraso', falla_mecanica: 'Falla mecánica',
  accidente_menor: 'Accidente menor', queja_cliente: 'Queja de cliente',
}

export default function IncidenciasRecientesCard({ incidencias, cargando }) {
  return (
    <div className="bg-servitur-tarjeta rounded-xl shadow-sm border border-servitur-texto-secundario/10 p-4 md:p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="flex items-center gap-2 font-semibold text-servitur-texto">
          <AlertTriangle className="w-4 h-4 text-servitur-azul" />
          Incidencias recientes
        </h2>
        <Link to="/permisos" className="flex items-center gap-1 text-sm text-servitur-azul hover:underline">
          Ver todas <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {cargando ? (
        <p className="text-sm text-servitur-texto-secundario">Cargando...</p>
      ) : incidencias.length === 0 ? (
        <p className="text-sm text-servitur-texto-secundario">Sin incidencias registradas.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-servitur-texto-secundario border-b border-servitur-texto-secundario/15">
              <th className="font-medium py-2">Unidad</th>
              <th className="font-medium py-2">Tipo</th>
              <th className="font-medium py-2">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {incidencias.map((inc) => (
              <tr key={inc.id} className="border-b border-servitur-texto-secundario/10 last:border-0">
                <td className="py-2.5 text-servitur-texto">{inc.unidad_eco}</td>
                <td className="py-2.5 text-servitur-texto">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-servitur-rojo" />
                    {TIPO_LABELS[inc.tipo] || inc.tipo}
                  </span>
                </td>
                <td className="py-2.5 text-servitur-texto-secundario">{inc.fecha}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}