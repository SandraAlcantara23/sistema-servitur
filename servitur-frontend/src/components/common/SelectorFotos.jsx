import { useRef } from 'react'
import { Camera, Upload, X, ImageOff } from 'lucide-react'

/**
 * Selector de fotos simple para usar DENTRO de un formulario que ya tiene su
 * propio botón de guardar (a diferencia de BloqueFotos, que trae su propio
 * flujo de "editar/guardar"). Útil para evidencias rápidas, como la foto del
 * aforo registrado.
 */
export default function SelectorFotos({ fotos, setFotos, label = 'Foto(s) de evidencia (opcional)' }) {
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

  return (
    <div>
      <label className="block text-sm font-medium text-servitur-texto mb-1">{label}</label>

      <div className="flex flex-wrap gap-2 mb-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 text-sm border border-servitur-texto-secundario/30 px-3 py-2 rounded-lg hover:bg-servitur-fondo"
        >
          <Upload className="w-4 h-4" /> Subir desde archivos
        </button>
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          className="flex items-center gap-1.5 text-sm border border-servitur-texto-secundario/30 px-3 py-2 rounded-lg hover:bg-servitur-fondo"
        >
          <Camera className="w-4 h-4" /> Tomar foto (móvil)
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleAgregarFotos} className="hidden" />
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleAgregarFotos} className="hidden" />
      </div>

      {fotos.length === 0 ? (
        <div className="flex items-center gap-2 text-xs text-servitur-texto-secundario">
          <ImageOff className="w-4 h-4" /> Todavía no hay fotos aquí.
        </div>
      ) : (
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
          {fotos.map((foto, i) => (
            <div key={i} className="relative group">
              <img
                src={foto.url}
                alt={foto.nombre ?? ''}
                className="w-full h-16 object-cover rounded-lg border border-servitur-texto-secundario/15"
              />
              <button
                type="button"
                onClick={() => quitarFoto(i)}
                className="absolute -top-1.5 -right-1.5 bg-servitur-rojo text-white rounded-full w-5 h-5 flex items-center justify-center"
                aria-label="Quitar foto"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}