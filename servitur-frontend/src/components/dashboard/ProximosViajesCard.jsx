import { Bus, MoreVertical, ChevronRight } from 'lucide-react'
import EstadoBadge from './EstadoBadge.jsx'

export default function ProximosViajesCard({ viajes }) {
  return (
    <div className="bg-servitur-tarjeta rounded-xl shadow-sm border border-servitur-texto-secundario/10 p-4 md:p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="flex items-center gap-2 font-semibold text-servitur-texto">
          <Bus className="w-4 h-4 text-servitur-azul" />
          Próximos viajes
        </h2>
        <button className="flex items-center gap-1 text-sm text-servitur-azul hover:underline">
          Ver todos <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="overflow-x-auto -mx-4 md:mx-0">
        <table className="w-full text-sm min-w-[520px]">
          <thead>
            <tr className="text-left text-servitur-texto-secundario border-b border-servitur-texto-secundario/15">
              <th className="font-medium py-2 px-4 md:px-2">Hora</th>
              <th className="font-medium py-2 px-2">Ruta</th>
              <th className="font-medium py-2 px-2">Unidad</th>
              <th className="font-medium py-2 px-2">Conductor</th>
              <th className="font-medium py-2 px-2">Estado</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {viajes.map((v, i) => (
              <tr key={i} className="border-b border-servitur-texto-secundario/10 last:border-0">
                <td className="py-2.5 px-4 md:px-2 text-servitur-texto">{v.hora}</td>
                <td className="py-2.5 px-2 text-servitur-texto">{v.ruta}</td>
                <td className="py-2.5 px-2 text-servitur-texto-secundario">{v.unidad}</td>
                <td className="py-2.5 px-2 text-servitur-texto">{v.conductor}</td>
                <td className="py-2.5 px-2">
                  <EstadoBadge estado={v.estado} />
                </td>
                <td className="py-2.5 px-2 text-servitur-texto-secundario">
                  <MoreVertical className="w-4 h-4" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}