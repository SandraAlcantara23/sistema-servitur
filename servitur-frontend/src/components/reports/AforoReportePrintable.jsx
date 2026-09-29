import logo from '../../assets/logo.jpeg'

export default function AforoReportePrintable({ registros, mesLabel, turnosLabel }) {
  const fechaGeneracion = new Date().toLocaleDateString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  const totalAforo = registros.reduce((acc, r) => acc + Number(r.pasajeros_ida || 0) + Number(r.pasajeros_vuelta || 0), 0)
  const conFoto = registros.filter((r) => r.foto_url)

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
              <p className="font-semibold mt-1">REPORTE MENSUAL DE AFORO POR RUTA</p>
            </td>
            <td className="border border-black p-3 w-56 align-middle text-xs leading-relaxed">
              <p><span className="font-semibold">Periodo:</span> {mesLabel}</p>
              <p><span className="font-semibold">Turnos:</span> {turnosLabel}</p>
              <p><span className="font-semibold">Registros:</span> {registros.length}</p>
              <p><span className="font-semibold">Aforo acumulado:</span> {totalAforo.toLocaleString('es-MX')}</p>
            </td>
          </tr>
        </tbody>
      </table>

      <table className="w-full border border-black border-collapse text-xs mb-8">
        <thead>
          <tr>
            <th className="border border-black p-2 text-left">Fecha</th>
            <th className="border border-black p-2 text-left">Turno</th>
            <th className="border border-black p-2 text-left">Ruta</th>
            <th className="border border-black p-2 text-left">Ida</th>
            <th className="border border-black p-2 text-left">Vuelta</th>
            <th className="border border-black p-2 text-left">Total</th>
          </tr>
        </thead>
        <tbody>
          {registros.length === 0 ? (
            <tr>
              <td className="border border-black p-3 text-center text-gray-500" colSpan={6}>
                No hay registros de aforo en este periodo/turnos.
              </td>
            </tr>
          ) : (
            registros.map((r) => (
              <tr key={r.id}>
                <td className="border border-black p-2">{r.fecha}</td>
                <td className="border border-black p-2">{r.turno_nombre}</td>
                <td className="border border-black p-2">{r.ruta_nombre}</td>
                <td className="border border-black p-2">{r.pasajeros_ida}</td>
                <td className="border border-black p-2">{r.pasajeros_vuelta}</td>
                <td className="border border-black p-2 font-semibold">{r.pasajeros_ida + r.pasajeros_vuelta}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <p className="font-semibold text-sm mb-3">Evidencia fotográfica</p>

      {conFoto.length === 0 ? (
        <p className="text-xs text-gray-500">No se registraron fotos de evidencia en este periodo/turnos.</p>
      ) : (
        <div className="space-y-4">
          {conFoto.map((r) => (
            <div key={r.id} className="border border-black p-3">
              <p className="text-xs font-semibold mb-2">
                {r.fecha} · {r.turno_nombre} · {r.ruta_nombre} · Total: {r.pasajeros_ida + r.pasajeros_vuelta}
              </p>
              <img
                src={r.foto_url}
                alt="Evidencia de aforo"
                className="object-cover border border-black"
                style={{ width: '110px', height: '110px' }}
              />
            </div>
          ))}
        </div>
      )}

      <p className="text-[10px] text-gray-500 mt-10 text-center">
        Servitur Gran Clas — Calidad y Seguridad a su Servicio · Documento generado automáticamente el {fechaGeneracion}
      </p>
    </div>
  )
}