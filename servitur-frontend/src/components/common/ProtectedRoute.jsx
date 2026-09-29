import { Navigate } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { paginaPermitida } from '../../utils/rolesPermisos.js'
import AppLayout from '../layout/AppLayout.jsx'

export default function ProtectedRoute({ pagina, children }) {
  const { sesion } = useAuth()

  if (!sesion) {
    return <Navigate to="/" replace />
  }

  if (!paginaPermitida(sesion.rol, pagina)) {
    return (
      <AppLayout>
        <div className="bg-servitur-tarjeta rounded-xl shadow-sm border border-servitur-texto-secundario/10 p-10 text-center max-w-md mx-auto mt-10">
          <Lock className="w-10 h-10 text-servitur-rojo mx-auto mb-3" />
          <h1 className="text-lg font-semibold text-servitur-texto">Acceso no autorizado</h1>
          <p className="text-sm text-servitur-texto-secundario mt-1">
            Tu rol ({sesion.rol}) no tiene permiso para ver esta sección.
          </p>
        </div>
      </AppLayout>
    )
  }

  return children
}