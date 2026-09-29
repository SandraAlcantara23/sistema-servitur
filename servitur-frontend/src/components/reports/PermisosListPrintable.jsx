import logo from '../../assets/logo.jpeg'

export default function PermisosListPrintable({ solicitudes }) {
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
              <p className="font-semibold mt-1">LISTADO DE PERMISOS Y OFICIOS</p>
            </td>
            <td className="border border-black p-3 w-52 align-middle text-xs leading-relaxed">
              <p><span className="font-semibold">Fecha de emisión:</span> {fechaGeneracion}</p>
              <p><span className="font-semibold">Registros:</span> {solicitudes.length}</p>
            </td>
          </tr>
        </tbody>
      </table>

      <table className="w-full border border-black border-collapse text-xs">
        <thead>
          <tr>
            <th className="border border-black p-2 text-left">Conductor</th>
            <th className="border border-black p-2 text-left">Tipo</th>
            <th className="border border-black p-2 text-left">Periodo</th>
            <th className="border border-black p-2 text-left">Motivo</th>
            <th className="border border-black p-2 text-left">Estatus</th>
            <th className="border border-black p-2 text-left">Comentario RH</th>
          </tr>
        </thead>
        <tbody>
          {solicitudes.length === 0 ? (
            <tr>
              <td className="border border-black p-2 text-gray-500" colSpan={6}>Sin registros con estos filtros.</td>
            </tr>
          ) : (
            solicitudes.map((s) => (
              <tr key={s.id}>
                <td className="border border-black p-2">{s.conductor}</td>
                <td className="border border-black p-2">{s.tipo}</td>
                <td className="border border-black p-2">{s.fechaInicio} — {s.fechaFin}</td>
                <td className="border border-black p-2">{s.motivo}</td>
                <td className="border border-black p-2">{s.estatus}</td>
                <td className="border border-black p-2">{s.comentarioRH || '—'}</td>
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