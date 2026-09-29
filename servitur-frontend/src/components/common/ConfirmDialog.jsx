/**
 * Diálogo modal de confirmación, para acciones destructivas (eliminar) u
 * otras que valga la pena confirmar antes de ejecutar.
 */
export default function ConfirmDialog({
  abierto,
  titulo = '¿Estás segura?',
  mensaje,
  textoConfirmar = 'Confirmar',
  textoCancelar = 'Cancelar',
  peligro = false,
  onConfirmar,
  onCancelar,
}) {
  if (!abierto) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancelar} />
      <div className="relative bg-servitur-tarjeta rounded-xl shadow-xl w-full max-w-sm p-5">
        <h2 className="text-base font-semibold text-servitur-texto mb-1">{titulo}</h2>
        {mensaje && <p className="text-sm text-servitur-texto-secundario mb-5">{mensaje}</p>}
        <div className="flex justify-end gap-3 mt-2">
          <button
            type="button"
            onClick={onCancelar}
            className="text-sm text-servitur-texto-secundario hover:underline px-2"
          >
            {textoCancelar}
          </button>
          <button
            type="button"
            onClick={onConfirmar}
            className={`text-sm text-white font-medium px-4 py-2 rounded-lg hover:opacity-90 ${
              peligro ? 'bg-servitur-rojo' : 'bg-servitur-azul'
            }`}
          >
            {textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  )
}