import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { User, Lock } from 'lucide-react'
import logo from '../assets/logo.jpeg'
import busHero from '../assets/bus-hero.png'
import { useAuth } from '../context/AuthContext.jsx'
import { RUTA_INICIO_POR_ROL } from '../utils/rolesPermisos.js'

export default function Login() {
  const [username, setUsername] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const navigate = useNavigate()
  const { iniciarSesion } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!username.trim() || !contrasena) {
      setError('Ingresa tu usuario y contraseña.')
      return
    }

    setCargando(true)
    try {
      const perfil = await iniciarSesion(username.trim(), contrasena)
      navigate(RUTA_INICIO_POR_ROL[perfil.rol] ?? '/dashboard')
    } catch (err) {
      setError(err.message || 'No se pudo iniciar sesión.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-servitur-fondo p-4">
      <div className="w-full max-w-4xl bg-servitur-tarjeta rounded-2xl shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-2">
        {/* Banner del camión en móvil — arriba del formulario */}
        <div className="md:hidden h-40 sm:h-48 overflow-hidden">
          <img
            src={busHero}
            alt="Autobús Servitur Gran Clas"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Panel izquierdo — foto real del camión, lado a lado en tablet/desktop */}
        <div className="relative hidden md:flex items-center justify-center bg-servitur-azul-oscuro overflow-hidden">
          <img
            src={busHero}
            alt="Autobús Servitur Gran Clas"
            className="w-full h-full object-contain"
          />
        </div>

        {/* Panel derecho — formulario */}
        <div className="flex flex-col justify-center px-6 py-10 sm:px-10 md:px-12 md:py-12">
          <div className="text-center mb-8">
            <img
              src={logo}
              alt="Servitur Gran Clas — Calidad y Seguridad a su Servicio"
              className="mx-auto w-64 sm:w-72"
            />
          </div>

          <p className="text-servitur-texto-secundario text-sm mb-6">
            Ingresa tus credenciales para acceder al sistema.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="username" className="block text-servitur-texto font-medium mb-1.5">
                Usuario:
              </label>
              <div className="flex items-center border border-servitur-texto-secundario/40 rounded-lg px-3 focus-within:border-servitur-azul focus-within:ring-1 focus-within:ring-servitur-azul">
                <User className="w-5 h-5 text-servitur-texto-secundario shrink-0" />
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="tu.usuario"
                  autoComplete="username"
                  className="w-full px-3 py-3 text-base outline-none bg-transparent text-servitur-texto placeholder:text-servitur-texto-secundario/60"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="contrasena" className="block text-servitur-texto font-medium mb-1.5">
                Contraseña:
              </label>
              <div className="flex items-center border border-servitur-texto-secundario/40 rounded-lg px-3 focus-within:border-servitur-azul focus-within:ring-1 focus-within:ring-servitur-azul">
                <Lock className="w-5 h-5 text-servitur-texto-secundario shrink-0" />
                <input
                  id="contrasena"
                  type="password"
                  value={contrasena}
                  onChange={(e) => setContrasena(e.target.value)}
                  placeholder="Contraseña"
                  autoComplete="current-password"
                  className="w-full px-3 py-3 text-base outline-none bg-transparent text-servitur-texto placeholder:text-servitur-texto-secundario/60"
                  required
                />
              </div>
            </div>

            {error && <p className="text-sm text-servitur-rojo">{error}</p>}

            <button
              type="submit"
              disabled={cargando}
              className="w-full bg-servitur-rojo hover:bg-servitur-rojo-hover disabled:opacity-60 text-white font-semibold py-3 rounded-lg transition-colors duration-200 mt-2"
            >
              {cargando ? 'Ingresando…' : 'Iniciar Sesión'}
            </button>
          </form>

          <p className="text-center text-sm text-servitur-texto-secundario mt-4">
            ¿No tienes cuenta?{' '}
            <Link to="/registro" className="text-servitur-azul font-medium hover:underline">
              Regístrate
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}