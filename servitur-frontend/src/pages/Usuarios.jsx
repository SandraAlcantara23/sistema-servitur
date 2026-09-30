import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserCog, Search, Plus, FileDown, FileSpreadsheet } from 'lucide-react'
import AppLayout from '../components/layout/AppLayout.jsx'
import { exportarComoPDF, exportarAExcel } from '../utils/exportReports.js'
import ConductoresListPrintable from '../components/reports/ConductoresListPrintable.jsx'
import EmptyState from '../components/common/EmptyState.jsx'
import Toast from '../components/common/Toast.jsx'
import { useToast } from '../hooks/useToast.js'
import { useBitacora } from '../hooks/useBitacora.js'
import { api } from '../services/api.js'

const ESTATUS_STYLES = {
  Activo: 'bg-green-100 text-green-700',
  Baja: 'bg-gray-100 text-gray-500',
}

const FORM_VACIO = {
  nombre: '', clave: '', telefono: '', domicilio: '',
  licenciaNumero: '', vigenciaLicencia: '', unidadAsignada: '',
}

// El backend regresa cada Conductor con sus propios nombres de campo
// (nombre_completo, unidad_asignada_eco, estatus_licencia, etc.); aquí se
// traduce a la forma que ya usan la tabla y los reportes de esta pantalla.
function normalizar(c) {
  return {
    id: c.id,
    nombre: c.nombre_completo,
    telefono: c.telefono || '',
    domicilio: c.domicilio,
    licencia: c.estatus_licencia || 'Vigente',
    licenciaNumero: c.licencia,
    vigenciaLicencia: c.vigencia_licencia,
    unidadAsignada: c.unidad_asignada_eco || '',
    unidadAsignadaId: c.unidad_asignada,
    estatus: c.estatus,
    clave: c.clave,
  }
}

export default function Usuarios() {
  const [busqueda, setBusqueda] = useState('')
  const [listaConductores, setListaConductores] = useState([])
  const [unidades, setUnidades] = useState([])
  const [cargando, setCargando] = useState(true)
  const [errorCarga, setErrorCarga] = useState('')
  const [mostrarForm, setMostrarForm] = useState(false)
  const [nuevo, setNuevo] = useState(FORM_VACIO)
  const [errorAlta, setErrorAlta] = useState('')
  const [enviando, setEnviando] = useState(false)
  const navigate = useNavigate()
  const { toast, mostrarToast, cerrarToast } = useToast()
  const { registrar } = useBitacora()

  useEffect(() => {
    let activo = true
    async function cargar() {
      setCargando(true)
      setErrorCarga('')
      try {
        const [conductoresData, unidadesData] = await Promise.all([
          api.get('/conductores/'),
          api.get('/unidades/'),
        ])
        if (!activo) return
        setListaConductores(conductoresData.map(normalizar))
        setUnidades(unidadesData)
      } catch (err) {
        if (activo) setErrorCarga(err.message || 'No se pudieron cargar los conductores.')
      } finally {
        if (activo) setCargando(false)
      }
    }
    cargar()
    return () => { activo = false }
  }, [])

  const filtrados = listaConductores.filter((c) =>
    c.nombre.toLowerCase().includes(busqueda.trim().toLowerCase()),
  )

  const darDeAlta = async (e) => {
    e.preventDefault()

    if (nuevo.telefono && nuevo.telefono.length !== 10) {
      setErrorAlta('El teléfono debe tener 10 dígitos.')
      return
    }
    if (!nuevo.nombre || !nuevo.clave || !nuevo.licenciaNumero || !nuevo.vigenciaLicencia) {
      setErrorAlta('Nombre, clave, número de licencia y vigencia son obligatorios.')
      return
    }
    setErrorAlta('')
    setEnviando(true)

    try {
      const creado = await api.post('/conductores/', {
        nombre: nuevo.nombre,
        clave: nuevo.clave,
        telefono: nuevo.telefono,
        domicilio: nuevo.domicilio,
        licencia: nuevo.licenciaNumero,
        vigencia_licencia: nuevo.vigenciaLicencia,
        unidad_asignada: nuevo.unidadAsignada || null,
      })
      const conductorNuevo = normalizar(creado)
      setListaConductores((prev) => [conductorNuevo, ...prev])
      setNuevo(FORM_VACIO)
      setMostrarForm(false)
      mostrarToast('Conductor dado de alta correctamente.')
      registrar('crear', 'Conductores', `Dio de alta a ${conductorNuevo.nombre} (unidad asignada: ${conductorNuevo.unidadAsignada || 'ninguna'})`)
    } catch (err) {
      setErrorAlta(err.message || 'No se pudo dar de alta al conductor.')
    } finally {
      setEnviando(false)
    }
  }

  const descargarPDF = () => {
    setTimeout(() => exportarComoPDF('conductores-listado.pdf'), 50)
  }

  const descargarExcel = () => {
    const filas = filtrados.map((c) => ({
      Nombre: c.nombre,
      Teléfono: c.telefono,
      Domicilio: c.domicilio,
      Licencia: c.licencia,
      'Unidad asignada': c.unidadAsignada,
      Estatus: c.estatus,
    }))
    exportarAExcel(filas, 'conductores-listado.xlsx')
  }

  return (
    <AppLayout>
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-semibold text-servitur-texto">
              <UserCog className="w-5 h-5 text-servitur-azul" />
              Conductores
            </h1>
            <p className="text-sm text-servitur-texto-secundario mt-0.5">
              Datos de contacto, domicilio, licencia y unidad asignada de cada conductor. Da clic en uno para ver su perfil completo.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 border border-servitur-texto-secundario/30 rounded-lg px-3 py-2 bg-servitur-tarjeta">
              <Search className="w-4 h-4 text-servitur-texto-secundario" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar conductor..."
                className="outline-none text-sm bg-transparent w-40"
              />
            </div>
            <button
              onClick={descargarPDF}
              className="flex items-center gap-1.5 text-sm border border-servitur-azul text-servitur-azul px-3 py-2 rounded-lg hover:bg-servitur-azul/5"
            >
              <FileDown className="w-4 h-4" /> PDF
            </button>
            <button
              onClick={descargarExcel}
              className="flex items-center gap-1.5 text-sm border border-green-700 text-green-700 px-3 py-2 rounded-lg hover:bg-green-50"
            >
              <FileSpreadsheet className="w-4 h-4" /> Excel
            </button>
            <button
              onClick={() => setMostrarForm(!mostrarForm)}
              className="flex items-center gap-1.5 text-sm bg-servitur-azul hover:opacity-90 text-white px-3 py-2 rounded-lg"
            >
              <Plus className="w-4 h-4" />
              Nuevo
            </button>
          </div>
        </div>

        {errorCarga && (
          <div className="text-sm text-servitur-rojo bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {errorCarga}
          </div>
        )}

        {mostrarForm && (
          <form
            onSubmit={darDeAlta}
            className="bg-servitur-tarjeta rounded-xl shadow-sm border border-servitur-texto-secundario/10 p-4 md:p-6 grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            <div>
              <label className="block text-sm font-medium text-servitur-texto mb-1">Nombre completo</label>
              <input
                required
                type="text"
                value={nuevo.nombre}
                onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })}
                className="w-full border border-servitur-texto-secundario/30 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-servitur-azul"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-servitur-texto mb-1">Clave de empleado</label>
              <input
                required
                type="text"
                value={nuevo.clave}
                onChange={(e) => setNuevo({ ...nuevo, clave: e.target.value })}
                placeholder="Ej. C0012"
                className="w-full border border-servitur-texto-secundario/30 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-servitur-azul"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-servitur-texto mb-1">Teléfono</label>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                value={nuevo.telefono}
                onChange={(e) => setNuevo({ ...nuevo, telefono: e.target.value.replace(/\D/g, '') })}
                placeholder="10 dígitos"
                className="w-full border border-servitur-texto-secundario/30 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-servitur-azul"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-servitur-texto mb-1">Domicilio</label>
              <input
                type="text"
                value={nuevo.domicilio}
                onChange={(e) => setNuevo({ ...nuevo, domicilio: e.target.value })}
                placeholder="Calle, número, colonia, municipio"
                className="w-full border border-servitur-texto-secundario/30 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-servitur-azul"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-servitur-texto mb-1">Número de licencia</label>
              <input
                required
                type="text"
                value={nuevo.licenciaNumero}
                onChange={(e) => setNuevo({ ...nuevo, licenciaNumero: e.target.value })}
                className="w-full border border-servitur-texto-secundario/30 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-servitur-azul"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-servitur-texto mb-1">Vigencia de la licencia</label>
              <input
                required
                type="date"
                value={nuevo.vigenciaLicencia}
                onChange={(e) => setNuevo({ ...nuevo, vigenciaLicencia: e.target.value })}
                className="w-full border border-servitur-texto-secundario/30 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-servitur-azul"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-servitur-texto mb-1">Unidad asignada</label>
              <select
                value={nuevo.unidadAsignada}
                onChange={(e) => setNuevo({ ...nuevo, unidadAsignada: e.target.value })}
                className="w-full border border-servitur-texto-secundario/30 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-servitur-azul"
              >
                <option value="">Sin unidad asignada</option>
                {unidades.map((u) => (
                  <option key={u.id} value={u.id}>{u.eco}</option>
                ))}
              </select>
            </div>
            {errorAlta && <p className="sm:col-span-2 text-sm text-servitur-rojo">{errorAlta}</p>}

            <div className="sm:col-span-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setMostrarForm(false)}
                className="text-sm text-servitur-texto-secundario hover:underline"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={enviando}
                className="bg-servitur-azul hover:opacity-90 text-white text-sm font-medium px-5 py-2.5 rounded-lg disabled:opacity-60"
              >
                {enviando ? 'Guardando...' : 'Dar de alta'}
              </button>
            </div>
          </form>
        )}

        <div className="bg-servitur-tarjeta rounded-xl shadow-sm border border-servitur-texto-secundario/10 overflow-x-auto">
          {cargando ? (
            <p className="text-sm text-servitur-texto-secundario p-6 text-center">Cargando conductores...</p>
          ) : filtrados.length === 0 ? (
            <EmptyState
              titulo="No se encontraron conductores"
              descripcion={'No hay ningún conductor que coincida con "' + busqueda + '".'}
              onLimpiar={() => setBusqueda('')}
            />
          ) : (
            <table className="w-full text-sm min-w-[780px]">
              <thead>
                <tr className="text-left text-servitur-texto-secundario border-b border-servitur-texto-secundario/15">
                  <th className="font-medium py-3 px-4">Nombre completo</th>
                  <th className="font-medium py-3 px-2">Teléfono</th>
                  <th className="font-medium py-3 px-2">Domicilio</th>
                  <th className="font-medium py-3 px-2">Licencia</th>
                  <th className="font-medium py-3 px-2">Unidad asignada</th>
                  <th className="font-medium py-3 px-4">Estatus</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => navigate('/usuarios/' + c.id)}
                    className="border-b border-servitur-texto-secundario/10 last:border-0 cursor-pointer hover:bg-servitur-fondo"
                  >
                    <td className="py-2.5 px-4 font-medium text-servitur-texto">{c.nombre}</td>
                    <td className="py-2.5 px-2 text-servitur-texto-secundario">{c.telefono}</td>
                    <td className="py-2.5 px-2 text-servitur-texto-secundario">{c.domicilio}</td>
                    <td className="py-2.5 px-2 text-servitur-texto-secundario">{c.licencia}</td>
                    <td className="py-2.5 px-2 text-servitur-texto-secundario">{c.unidadAsignada || 'Sin asignar'}</td>
                    <td className="py-2.5 px-4">
                      <span className={'px-2.5 py-1 rounded-full text-xs font-medium ' + ESTATUS_STYLES[c.estatus]}>
                        {c.estatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="print-area">
        <ConductoresListPrintable conductores={filtrados} />
      </div>

      <Toast toast={toast} onClose={cerrarToast} />
    </AppLayout>
  )
}