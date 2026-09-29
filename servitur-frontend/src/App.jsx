import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import ProtectedRoute from './components/common/ProtectedRoute.jsx'
import Login from './pages/Login.jsx'
import Registro from './pages/Registro.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Unidades from './pages/Unidades.jsx'
import UnidadDetalle from './pages/UnidadDetalle.jsx'
import Operaciones from './pages/Operaciones.jsx'
import Reportes from './pages/Reportes.jsx'
import Permisos from './pages/Permisos.jsx'
import Usuarios from './pages/Usuarios.jsx'
import ConductorDetalle from './pages/ConductorDetalle.jsx'
import Configuracion from './pages/Configuracion.jsx'
import MiPerfil from './pages/MiPerfil.jsx'
import Bitacora from './pages/Bitacora.jsx'
import CumplimientoAuditorias from './pages/CumplimientoAuditorias.jsx'

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/registro" element={<Registro />} />
            <Route path="/dashboard" element={<ProtectedRoute pagina="dashboard"><Dashboard /></ProtectedRoute>} />
            <Route path="/unidades" element={<ProtectedRoute pagina="unidades"><Unidades /></ProtectedRoute>} />
            <Route path="/unidades/:eco" element={<ProtectedRoute pagina="unidades"><UnidadDetalle /></ProtectedRoute>} />
            <Route path="/operaciones" element={<ProtectedRoute pagina="operaciones"><Operaciones /></ProtectedRoute>} />
            <Route path="/reportes" element={<ProtectedRoute pagina="reportes"><Reportes /></ProtectedRoute>} />
            <Route path="/permisos" element={<ProtectedRoute pagina="permisos"><Permisos /></ProtectedRoute>} />
            <Route path="/usuarios" element={<ProtectedRoute pagina="usuarios"><Usuarios /></ProtectedRoute>} />
            <Route path="/usuarios/:id" element={<ProtectedRoute pagina="usuarios"><ConductorDetalle /></ProtectedRoute>} />
            <Route path="/configuracion" element={<ProtectedRoute pagina="configuracion"><Configuracion /></ProtectedRoute>} />
            <Route path="/auditoria" element={<ProtectedRoute pagina="auditoria"><Bitacora /></ProtectedRoute>} />
            <Route path="/cumplimiento" element={<ProtectedRoute pagina="cumplimiento"><CumplimientoAuditorias /></ProtectedRoute>} />
            <Route path="/perfil" element={<ProtectedRoute pagina="perfil"><MiPerfil /></ProtectedRoute>} />
            {/* Viajes y Rutas se arman después */}
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  )
}