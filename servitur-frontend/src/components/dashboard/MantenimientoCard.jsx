import { Wrench, ChevronRight } from 'lucide-react'

const DOT_COLOR = { orange: 'bg-amber-500', red: 'bg-servitur-rojo' }

export default function MantenimientoCard({ items }) {
  return (
    <div className="bg-servitur-tarjeta rounded-xl shadow-sm border border-servitur-texto-secundario/10 p-4 md:p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="flex items-center gap-2 font-semibold text-servitur-texto">
          <Wrench className="w-4 h-4 text-servitur-azul" />
          Mantenimientos próximos
        </h2>
        <button className="flex items-center gap-1 text-sm text-servitur-azul hover:underline">
          Ver todos <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-servitur-texto-secundario border-b border-servitur-texto-secundario/15">
            <th className="font-medium py-2">Unidad</th>
            <th className="font-medium py-2">Tipo</th>
            <th className="font-medium py-2">Fecha</th>
          </tr>
        </thead>
        <tbody>
          {items.map((m, i) => (
            <tr key={i} className="border-b border-servitur-texto-secundario/10 last:border-0">
              <td className="py-2.5 text-servitur-texto">{m.unidad}</td>
              <td className="py-2.5 text-servitur-texto">
                <span className="inline-flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${DOT_COLOR[m.color]}`} />
                  {m.tipo}
                </span>
              </td>
              <td className="py-2.5 text-servitur-texto-secundario">{m.fecha}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
