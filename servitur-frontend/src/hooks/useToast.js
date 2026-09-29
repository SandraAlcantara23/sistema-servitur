import { useCallback, useState } from 'react'

/**
 * Hook simple para mostrar un mensaje de confirmación flotante ("toast")
 * después de guardar, actualizar o eliminar algo. Cada página que lo use
 * mantiene su propio mensaje (no hay estado global todavía).
 *
 * Uso:
 *   const { toast, mostrarToast, cerrarToast } = useToast()
 *   mostrarToast('Cambios guardados correctamente')
 *   <Toast toast={toast} onClose={cerrarToast} />
 */
export function useToast() {
  const [toast, setToast] = useState(null)

  const mostrarToast = useCallback((mensaje, tipo = 'exito') => {
    setToast({ mensaje, tipo, id: Date.now() })
  }, [])

  const cerrarToast = useCallback(() => setToast(null), [])

  return { toast, mostrarToast, cerrarToast }
}