import { useEffect } from 'react'
import { CheckCircle2, AlertCircle, X } from 'lucide-react'

export default function Toast({ toast, onClose, duracion = 3000 }) {
  useEffect(() => {
    if (!toast) return undefined
    const temporizador = setTimeout(onClose, duracion)
    return () => clearTimeout(temporizador)
  }, [toast, onClose, duracion])

  if (!toast) return null

  const esError = toast.tipo === 'error'

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-xs">
      <div
        className={`flex items-start gap-2 px-4 py-3 rounded-lg shadow-lg text-sm text-white ${
          esError ? 'bg-servitur-rojo' : 'bg-green-600'
        }`}
      >
        {esError ? (
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
        ) : (
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
        )}
        <span className="flex-1">{toast.mensaje}</span>
        <button onClick={onClose} className="opacity-80 hover:opacity-100 shrink-0" aria-label="Cerrar">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}