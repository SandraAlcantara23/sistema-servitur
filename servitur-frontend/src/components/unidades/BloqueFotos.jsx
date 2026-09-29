import { useRef, useState } from 'react'
import { Camera, Upload, X, Check, Pencil, ImageOff } from 'lucide-react'

export default function BloqueFotos({ titulo, subtitulo, fotos, setFotos, children }) {
  const [editando, setEditando] = useState(true)
  const [guardadoEl, setGuardadoEl] = useState(null)
  const fileInputRef = useRef(null)
  const cameraInputRef = useRef(null)

  const handleAgregarFotos = (e) => {
    const nuevas = Array.from(e.target.files).map((file) => ({
      file,
      url: URL.createObjectURL(file),
      nombre: file.name,
    }))
    setFotos((prev) => [...prev, ...nuevas])
    e.target.value = ''
  }

  const quitarFoto = (index) => {
    setFotos((prev) => prev.filter((_, i) => i !== index))
  }

  const guardar = () => {
    setEditando(false)
    setGuardadoEl(new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }))
  }

  return (
    <div className="bg-servitur-tarjeta rounded-xl shadow-sm border border-servitur-texto-secundario/10 p-4 md:p-5">
      <div className="flex items-center justify-between gap-2 mb-1">
        <h2 className="font-semibold text-servitur-texto">{titulo}</h2>
        {!editando && (
          <button
            onClick={() => setEditando(true)}
            className="flex items-center gap-1 text-xs text-servitur-azul hover:underline shrink-0"
          >
            <Pencil className="w-3.5 h-3.5" /> Editar
          </button>
        )}
      </div>

      {editando ? (
        subtitulo && <p className="text-xs text-servitur-texto-secundario mb-3">{subtitulo}</p>
      ) : (
        guardadoEl && (
          <p className="flex items-center gap-1 text-xs text-green-600 mb-3">
            <Check className="w-3.5 h-3.5" /> Guardado a las {guardadoEl}
          </p>
        )
      )}

      {editando && children}

      {editando && (
        <div className="flex flex-wrap gap-2 mb-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 text-sm border border-servitur-texto-secundario/30 px-3 py-2 rounded-lg hover:bg-servitur-fondo"
          >
            <Upload className="w-4 h-4" /> Subir desde archivos
          </button>
          <button
            onClick={() => cameraInputRef.current?.click()}
            className="flex items-center gap-1.5 text-sm border border-servitur-texto-secundario/30 px-3 py-2 rounded-lg hover:bg-servitur-fondo"
          >
            <Camera className="w-4 h-4" /> Tomar foto (móvil)
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleAgregarFotos} className="hidden" />
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleAgregarFotos} className="hidden" />
        </div>
      )}

      {fotos.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-6 text-servitur-texto-secundario">
          <ImageOff className="w-7 h-7 mb-2" />
          <p className="text-sm">Todavía no hay fotos aquí.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3 mb-3">
          {fotos.map((foto, i) => (
            <div key={i} className="relative group">
              <img
                src={foto.url}
                alt={foto.nombre ?? ''}
                className="w-full h-24 object-cover rounded-lg border border-servitur-texto-secundario/15"
              />
              {editando && (
                <button
                  onClick={() => quitarFoto(i)}
                  className="absolute -top-1.5 -right-1.5 bg-servitur-rojo text-white rounded-full w-5 h-5 flex items-center justify-center"
                  aria-label="Quitar foto"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {editando && (
        <button
          onClick={guardar}
          className="flex items-center gap-1.5 text-sm bg-servitur-rojo hover:bg-servitur-rojo-hover text-white px-4 py-2 rounded-lg"
        >
          <Check className="w-4 h-4" /> Guardar
        </button>
      )}
    </div>
  )
}