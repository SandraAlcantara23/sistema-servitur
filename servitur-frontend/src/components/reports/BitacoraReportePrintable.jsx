import logo from '../../assets/logo.jpeg'

const ACCION_LABELS = {
  crear: 'Creó',
  actualizar: 'Actualizó',
  eliminar: 'Eliminó',
  aprobar: 'Aprobó',
  rechazar: 'Rechazó',
  iniciar_sesion: 'Inició sesión',
  registrar_cuenta: 'Registró cuenta',
}

export default function BitacoraReportePrintable({ eventos, filtrosLabel }) {
  const fechaGeneracion = new Date().toLocaleDateString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  return (
    <div className="bg-white text-black p-10 text-sm" style={{ width: '210mm', minHeight: '297mm' }}>
      <table className="w-full border border-black border-collapse mb-6">
        <tbody>
          <tr>
            <td className="border border-black p-3 w-40 align-middle">
              <img src={logo} alt="Servitur Gran Clas" className="w-32" />
            </td>
            <td className="border border-black p-3 text-center align-middle">
              <p className="font-bold text-base">FORMATO</p>
              <p className="font-semibold mt-1">BITÁCORA DE AUDITORÍA</p>
            </td>
            <td className="border border-black p-3 w-56 align-middle text-xs leading-relaxed">
              <p><span className="font-semibold">Filtros:</span> {filtrosLabel}</p>
              <p><span className="font-semibold">Eventos:</span> {eventos.length}</p>
            </td>
          </tr>
        </tbody>
      </table>

      <table className="w-full border border-black border-collapse text-xs">
        <thead>
          <tr>
            <th className="border border-black p-2 text-left">Fecha y hora</th>
            <th className="border border-black p-2 text-left">Usuario</th>
            <th className="border border-black p-2 text-left">Rol</th>
            <th className="border border-black p-2 text-left">Acción</th>
            <th className="border border-black p-2 text-left">Módulo</th>
            <th className="border border-black p-2 text-left">Detalle</th>
          </tr>
        </thead>
        <tbody>
          {eventos.length === 0 ? (
            <tr>
              <td className="border border-black p-3 text-center text-gray-500" colSpan={6}>
                No hay eventos con estos filtros.
              </td>
            </tr>
          ) : (
            eventos.map((ev) => (
              <tr key={ev.id}>
                <td className="border border-black p-1.5">{new Date(ev.fecha).toLocaleString('es-MX')}</td>
                <td className="border border-black p-1.5 font-semibold">{ev.usuario}</td>
                <td className="border border-black p-1.5">{ev.rol}</td>
                <td className="border border-black p-1.5">{ACCION_LABELS[ev.accion] ?? ev.accion}</td>
                <td className="border border-black p-1.5">{ev.modulo}</td>
                <td className="border border-black p-1.5">{ev.detalle}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <p className="text-[10px] text-gray-500 mt-10 text-center">
        Servitur Gran Clas — Calidad y Seguridad a su Servicio · Documento generado automáticamente el {fechaGeneracion}
      </p>
    </div>
  )
}