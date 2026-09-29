import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { User, Lock, Mail, Phone, UserCog, ShieldCheck, Eye, EyeOff } from 'lucide-react'
import logo from '../assets/logo.jpeg'
import busHero from '../assets/bus-hero.png'
import { api } from '../services/api.js'

const ROLES = ['Conductor', 'Monitoreo', 'Supervisor']
const ROLES_CON_CODIGO = ['Monitoreo', 'Supervisor']

export default function Registro() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    nombre: '',
    apellidoPaterno: '',
    apellidoMaterno: '',
    correo: '',
    telefono: '',
    contrasena: '',
    confirmarContrasena: '',
    rol: ROLES[0],
    codigoAutorizacion: '',
  })
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [verContrasena, setVerContrasena] = useState(false)
  const [verConfirmarContrasena, setVerConfirmarContrasena] = useState(false)

  const actualizar = (campo, valor) => setForm((prev) => ({ ...prev, [campo]: valor }))

  const handleSubmit = async (e) => {
    e.preventDefault()

    const correoValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo.trim())
    if (!correoValido) {
      setError('Ingresa un correo electrónico válido.')
      return
    }

    const telefonoLimpio = form.telefono.replace(/\D/g, '')
    if (telefonoLimpio.length !== 10) {
      setError('El teléfono debe tener 10 dígitos.')
      return
    }

    if (form.contrasena.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }

    if (form.contrasena !== form.confirmarContrasena) {
      setError('Las contraseñas no coinciden.')
      return
    }

    if (ROLES_CON_CODIGO.includes(form.rol) && !form.codigoAutorizacion.trim()) {
      setError(`Ingresa el código de autorización de ${form.rol}.`)
      return
    }

    setError('')
    setEnviando(true)

    const apellidos = [form.apellidoPaterno, form.apellidoMaterno].filter(Boolean).join(' ').trim()

    try {
      await api.post('/registro/', {
        first_name: form.nombre.trim(),
        last_name: apellidos,
        email: form.correo.trim(),
        telefono: telefonoLimpio,
        password: form.contrasena,
        rol: form.rol,
        codigo_autorizacion: form.codigoAutorizacion.trim(),
      })
      navigate('/')
    } catch (err) {
      let detalle = err.message || 'No se pudo crear la cuenta.'
      try {
        const parsed = JSON.parse(detalle)
        detalle = parsed.detail || detalle
      } catch {
        // err.message ya era texto plano, se usa tal cual
      }
      setError(detalle)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-servitur-fondo p-4">
      <div className="w-full max-w-4xl bg-servitur-tarjeta rounded-2xl shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-2">
        <div className="md:hidden h-40 sm:h-48 overflow-hidden">
          <img src={busHero} alt="Autobús Servitur Gran Clas" className="w-full h-full object-cover" />
        </div>

        <div className="relative hidden md:flex items-center justify-center bg-servitur-azul-oscuro overflow-hidden">
          <img src={busHero} alt="Autobús Servitur Gran Clas" className="w-full h-full object-contain" />
        </div>

        <div className="flex flex-col justify-center px-6 py-10 sm:px-10 md:px-12 md:py-12">
          <div className="text-center mb-6">
            <img src={logo} alt="Servitur Gran Clas" className="mx-auto w-56 sm:w-64" />
          </div>

          <p className="text-servitur-texto-secundario text-sm mb-6 text-center">
            Crea tu cuenta para acceder al sistema.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-servitur-texto font-medium mb-1 text-sm">Nombre(s)</label>
                <div className="flex items-center border border-servitur-texto-secundario/40 rounded-lg px-3 focus-within:border-servitur-azul">
                  <User className="w-4 h-4 text-servitur-texto-secundario shrink-0" />
                  <input
                    type="text"
                    required
                    value={form.nombre}
                    onChange={(e) => actualizar('nombre', e.target.value)}
                    className="w-full px-2 py-2.5 text-sm outline-none bg-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-servitur-texto font-medium mb-1 text-sm">Apellido paterno</label>
                <input
                  type="text"
                  required
                  value={form.apellidoPaterno}
                  onChange={(e) => actualizar('apellidoPaterno', e.target.value)}
                  className="w-full border border-servitur-texto-secundario/40 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-servitur-azul"
                />
              </div>
              <div>
                <label className="block text-servitur-texto font-medium mb-1 text-sm">Apellido materno</label>
                <input
                  type="text"
                  value={form.apellidoMaterno}
                  onChange={(e) => actualizar('apellidoMaterno', e.target.value)}
                  className="w-full border border-servitur-texto-secundario/40 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-servitur-azul"
                />
              </div>
            </div>

            <div>
              <label className="block text-servitur-texto font-medium mb-1 text-sm">Correo electrónico</label>
              <div className="flex items-center border border-servitur-texto-secundario/40 rounded-lg px-3 focus-within:border-servitur-azul">
                <Mail className="w-4 h-4 text-servitur-texto-secundario shrink-0" />
                <input
                  type="email"
                  required
                  value={form.correo}
                  onChange={(e) => actualizar('correo', e.target.value)}
                  className="w-full px-2 py-2.5 text-sm outline-none bg-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-servitur-texto font-medium mb-1 text-sm">Teléfono</label>
                <div className="flex items-center border border-servitur-texto-secundario/40 rounded-lg px-3 focus-within:border-servitur-azul">
                  <Phone className="w-4 h-4 text-servitur-texto-secundario shrink-0" />
                  <input
                    type="tel"
                    required
                    inputMode="numeric"
                    maxLength={10}
                    value={form.telefono}
                    onChange={(e) => actualizar('telefono', e.target.value.replace(/\D/g, ''))}
                    placeholder="10 dígitos, sin espacios"
                    className="w-full px-2 py-2.5 text-sm outline-none bg-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-servitur-texto font-medium mb-1 text-sm">Rol</label>
                <div className="flex items-center border border-servitur-texto-secundario/40 rounded-lg px-3 focus-within:border-servitur-azul">
                  <UserCog className="w-4 h-4 text-servitur-texto-secundario shrink-0" />
                  <select
                    value={form.rol}
                    onChange={(e) => actualizar('rol', e.target.value)}
                    className="w-full px-2 py-2.5 text-sm outline-none bg-transparent"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {form.rol === 'Conductor' && (
              <p className="text-xs text-servitur-texto-secundario -mt-1">
                Tu cuenta se creará de inmediato, pero un administrador debe completar tu ficha de conductor
                (clave, licencia, unidad) antes de que puedas usar Aforo y Permisos.
              </p>
            )}

            {ROLES_CON_CODIGO.includes(form.rol) && (
              <div>
                <label className="block text-servitur-texto font-medium mb-1 text-sm">
                  Código de autorización de {form.rol}
                </label>
                <div className="flex items-center border border-servitur-texto-secundario/40 rounded-lg px-3 focus-within:border-servitur-azul">
                  <ShieldCheck className="w-4 h-4 text-servitur-texto-secundario shrink-0" />
                  <input
                    type="text"
                    required
                    value={form.codigoAutorizacion}
                    onChange={(e) => actualizar('codigoAutorizacion', e.target.value)}
                    placeholder="Proporcionado por RH o Administración"
                    className="w-full px-2 py-2.5 text-sm outline-none bg-transparent"
                  />
                </div>
                <p className="text-xs text-servitur-texto-secundario mt-1">
                  Solicítalo a RH o a Administración — evita que cualquiera se registre como {form.rol}.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-servitur-texto font-medium mb-1 text-sm">Contraseña</label>
                <div className="flex items-center border border-servitur-texto-secundario/40 rounded-lg px-3 focus-within:border-servitur-azul">
                  <Lock className="w-4 h-4 text-servitur-texto-secundario shrink-0" />
                  <input
                    type={verContrasena ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={form.contrasena}
                    onChange={(e) => actualizar('contrasena', e.target.value)}
                    className="w-full px-2 py-2.5 text-sm outline-none bg-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setVerContrasena((v) => !v)}
                    className="text-servitur-texto-secundario shrink-0"
                    aria-label={verContrasena ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {verContrasena ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-servitur-texto-secundario mt-1">Mínimo 8 caracteres.</p>
              </div>
              <div>
                <label className="block text-servitur-texto font-medium mb-1 text-sm">Confirmar contraseña</label>
                <div className="flex items-center border border-servitur-texto-secundario/40 rounded-lg px-3 focus-within:border-servitur-azul">
                  <Lock className="w-4 h-4 text-servitur-texto-secundario shrink-0" />
                  <input
                    type={verConfirmarContrasena ? 'text' : 'password'}
                    required
                    value={form.confirmarContrasena}
                    onChange={(e) => actualizar('confirmarContrasena', e.target.value)}
                    className="w-full px-2 py-2.5 text-sm outline-none bg-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setVerConfirmarContrasena((v) => !v)}
                    className="text-servitur-texto-secundario shrink-0"
                    aria-label={verConfirmarContrasena ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {verConfirmarContrasena ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {error && <p className="text-sm text-servitur-rojo">{error}</p>}

            <button
              type="submit"
              disabled={enviando}
              className="w-full bg-servitur-rojo hover:bg-servitur-rojo-hover text-white font-semibold py-3 rounded-lg transition-colors duration-200 mt-2 disabled:opacity-60"
            >
              {enviando ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>
          </form>

          <p className="text-center text-sm text-servitur-texto-secundario mt-4">
            ¿Ya tienes cuenta?{' '}
            <Link to="/" className="text-servitur-azul font-medium hover:underline">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}