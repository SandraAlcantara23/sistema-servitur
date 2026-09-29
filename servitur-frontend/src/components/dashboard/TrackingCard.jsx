import { MapPin, ChevronRight } from 'lucide-react'

export default function TrackingCard({ resumen }) {
  return (
    <div className="bg-servitur-tarjeta rounded-xl shadow-sm border border-servitur-texto-secundario/10 p-4 md:p-5 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h2 className="flex items-center gap-2 font-semibold text-servitur-texto">
          <MapPin className="w-4 h-4 text-servitur-azul" />
          Seguimiento en tiempo real
        </h2>
        <button className="flex items-center gap-1 text-sm text-servitur-azul hover:underline">
          Ver mapa <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4 flex-1">
        {/* Placeholder del mapa — aquí se integrará Google Maps / Leaflet con la ubicación real de las unidades */}
        <div className="rounded-lg bg-servitur-fondo border border-dashed border-servitur-texto-secundario/30 flex items-center justify-center min-h-[180px] text-center px-4">
          <p className="text-sm text-servitur-texto-secundario">
            El mapa en tiempo real se conectará aquí
            <br />
            (Google Maps o Leaflet + ubicación GPS de las unidades)
          </p>
        </div>

        <ul className="flex sm:flex-col gap-3 sm:gap-2.5 sm:w-40 justify-between sm:justify-start flex-wrap">
          {resumen.map((r) => (
            <li key={r.estado} className="flex items-center justify-between gap-2 text-sm">
              <span className="flex items-center gap-2 text-servitur-texto">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: r.color }} />
                {r.estado}
              </span>
              <span className="font-medium text-servitur-texto">{r.cantidad}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
