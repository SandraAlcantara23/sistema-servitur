import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

/**
 * Muestra UNA sola vez el usuario y la contraseña temporal de una cuenta
 * (alta de conductor o restablecimiento de contraseña).
 * Props:
 *   credenciales -> { nombre, usuario, password } | null
 *   titulo       -> texto opcional del encabezado
 *   onCerrar()
 */
export default function CredencialesModal({ credenciales, titulo, onCerrar }) {
  const [copiado, setCopiado] = useState(false)

  if (!credenciales) return null

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(credenciales.password)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 1500)
    } catch {
      // Sin permiso de portapapeles: la contraseña se puede seleccionar con un clic.
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative bg-servitur-tarjeta rounded-xl shadow-xl w-full max-w-md p-5">
        <h2 className="text-base font-semibold text-servitur-texto mb-1">
          {titulo || `Credenciales de ${credenciales.nombre}`}
        </h2>
        <p className="text-sm text-servitur-texto-secundario mb-4">
          Entrégaselas a la persona. La contraseña temporal solo se muestra ahora; después
          no se podrá consultar. Debe cambiarla en Configuración al iniciar sesión.
        </p>
        <div className="space-y-2 text-sm">
          <p>
            <span className="text-servitur-texto-secundario">Usuario: </span>
            <span className="font-mono font-semibold text-servitur-texto select-all">{credenciales.usuario}</span>
          </p>
          <p className="flex flex-wrap items-center gap-2">
            <span className="text-servitur-texto-secundario">Contraseña temporal: </span>
            <span className="font-mono font-semibold text-servitur-texto select-all">{credenciales.password}</span>
            <button
              type="button"
              onClick={copiar}
              className="flex items-center gap-1 text-xs text-servitur-azul hover:underline"
            >
              {copiado ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiado ? 'Copiada' : 'Copiar'}
            </button>
          </p>
        </div>
        <div className="flex justify-end mt-5">
          <button
            type="button"
            onClick={onCerrar}
            className="text-sm bg-servitur-azul hover:opacity-90 text-white px-4 py-2 rounded-lg"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  )
}
