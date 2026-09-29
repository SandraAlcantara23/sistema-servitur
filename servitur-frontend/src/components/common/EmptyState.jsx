import { SearchX } from 'lucide-react'

export default function EmptyState({ titulo = 'Sin resultados', descripcion, onLimpiar, colSpan }) {
  const contenido = (
    <div className="flex flex-col items-center justify-center text-center py-12 px-4">
      <span className="w-12 h-12 rounded-full bg-servitur-fondo flex items-center justify-center mb-3">
        <SearchX className="w-6 h-6 text-servitur-texto-secundario" />
      </span>
      <p className="text-sm font-medium text-servitur-texto">{titulo}</p>
      {descripcion && <p className="text-sm text-servitur-texto-secundario mt-1 max-w-sm">{descripcion}</p>}
      {onLimpiar && (
        <button onClick={onLimpiar} className="text-sm text-servitur-azul hover:underline mt-3">
          Limpiar filtros
        </button>
      )}
    </div>
  )

  if (colSpan) {
    return (
      <tr>
        <td colSpan={colSpan}>{contenido}</td>
      </tr>
    )
  }

  return contenido
}