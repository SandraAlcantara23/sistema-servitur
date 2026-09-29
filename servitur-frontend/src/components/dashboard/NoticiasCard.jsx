import { Megaphone, AlertTriangle, Info, Wrench } from 'lucide-react'

const ICONS = { alerta: AlertTriangle, info: Info, mantenimiento: Wrench }
const ICON_BG = { alerta: 'bg-servitur-rojo', info: 'bg-servitur-azul', mantenimiento: 'bg-servitur-texto-secundario' }

export default function NoticiasCard({ noticias }) {
  return (
    <div className="bg-servitur-tarjeta rounded-xl shadow-sm border border-servitur-texto-secundario/10 p-4 md:p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="flex items-center gap-2 font-semibold text-servitur-texto">
          <Megaphone className="w-4 h-4 text-servitur-azul" />
          Noticias / Avisos
        </h2>
        <button className="text-sm text-servitur-azul hover:underline">Ver todas</button>
      </div>

      <ul className="space-y-4">
        {noticias.map((n, i) => {
          const Icon = ICONS[n.tipo] ?? Info
          return (
            <li key={i} className="flex items-start gap-3">
              <span className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-white ${ICON_BG[n.tipo]}`}>
                <Icon className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-servitur-texto">{n.titulo}</p>
                <p className="text-sm text-servitur-texto-secundario">{n.detalle}</p>
                <p className="text-xs text-servitur-texto-secundario/70 mt-0.5">{n.hora}</p>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}