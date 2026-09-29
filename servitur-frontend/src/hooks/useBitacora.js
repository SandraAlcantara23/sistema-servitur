import { useAuth } from '../context/AuthContext.jsx'
import { registrarEvento } from '../utils/bitacora.js'

/**
 * Uso: const { registrar } = useBitacora()
 *      registrar('crear', 'Aforo', 'Registró aforo de 34 pasajeros en unidad 5200')
 */
export function useBitacora() {
  const { sesion } = useAuth()

  const registrar = (accion, modulo, detalle) => {
    registrarEvento({ usuario: sesion?.nombre, rol: sesion?.rol, accion, modulo, detalle })
  }

  return { registrar }
}