const STYLES = {
  'En ruta': 'bg-green-100 text-green-700',
  'En salida': 'bg-blue-100 text-blue-700',
  Programado: 'bg-gray-100 text-gray-600',
}

export default function EstadoBadge({ estado }) {
  return (
    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${STYLES[estado] ?? 'bg-gray-100 text-gray-600'}`}>
      {estado}
    </span>
  )
}
