import logo from '../../assets/logo.jpeg'

export default function UnidadReportePrintable({ unidad, asignacion, entrega }) {
  const fechaGeneracion = new Date().toLocaleDateString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  const fotosAsignacion = asignacion?.fotos ?? []
  const fotosEntrega = entrega?.fotos ?? []

  return (
    <div className="bg-white text-black p-10 text-sm" style={{ width: '210mm', minHeight: '297mm' }}>
      {/* Encabezado tipo formato corporativo */}
      <table className="w-full border border-black border-collapse mb-6">
        <tbody>
          <tr>
            <td className="border border-black p-3 w-40 align-middle">
              <img src={logo} alt="Servitur Gran Clas" className="w-32" />
            </td>
            <td className="border border-black p-3 text-center align-middle">
              <p className="font-bold text-base">FORMATO</p>
              <p className="font-semibold mt-1">REPORTE GENERAL DE UNIDAD</p>
            </td>
            <td className="border border-black p-3 w-52 align-middle text-xs leading-relaxed">
              <p><span className="font-semibold">Código:</span> SVT-UN-{unidad.eco}</p>
              <p><span className="font-semibold">Fecha de emisión:</span> {fechaGeneracion}</p>
              <p><span className="font-semibold">Ruta:</span> {unidad.ruta}</p>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Datos generales de la unidad */}
      <p className="font-semibold mb-1">Datos de la unidad</p>
      <table className="w-full border border-black border-collapse mb-6 text-xs">
        <tbody>
          <tr>
            <td className="border border-black p-2 font-semibold w-1/4">Unidad (ECO)</td>
            <td className="border border-black p-2 w-1/4">{unidad.eco}</td>
            <td className="border border-black p-2 font-semibold w-1/4">Conductor</td>
            <td className="border border-black p-2 w-1/4">{unidad.conductorActual}</td>
          </tr>
          <tr>
            <td className="border border-black p-2 font-semibold">Domicilio del conductor</td>
            <td className="border border-black p-2" colSpan={3}>{unidad.domicilioConductor}</td>
          </tr>
          <tr>
            <td className="border border-black p-2 font-semibold">Ruta</td>
            <td className="border border-black p-2">{unidad.ruta}</td>
            <td className="border border-black p-2 font-semibold">Rendimiento</td>
            <td className="border border-black p-2">{unidad.rendimiento} km/l</td>
          </tr>
          <tr>
            <td className="border border-black p-2 font-semibold">Recorrido</td>
            <td className="border border-black p-2">{unidad.recorrido} km</td>
            <td className="border border-black p-2 font-semibold"></td>
            <td className="border border-black p-2"></td>
          </tr>
        </tbody>
      </table>

      {/* Historial de conductores */}
      <p className="font-semibold mb-1">Historial de conductores</p>
      <table className="w-full border border-black border-collapse mb-6 text-xs">
        <thead>
          <tr>
            <th className="border border-black p-2 text-left">Conductor</th>
            <th className="border border-black p-2 text-left">Desde</th>
            <th className="border border-black p-2 text-left">Hasta</th>
          </tr>
        </thead>
        <tbody>
          {unidad.historialConductores.map((h, i) => (
            <tr key={i}>
              <td className="border border-black p-2">
                {h.nombre} {!h.hasta && '(actual)'}
              </td>
              <td className="border border-black p-2">{h.desde}</td>
              <td className="border border-black p-2">{h.hasta ?? 'presente'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Evidencia fotográfica */}
      <p className="font-semibold mb-2">Evidencia del Reporte de la Unidad</p>

      <p className="font-semibold mb-1 text-[11px]">Asignación (inicio)</p>
      <table className="w-full border border-black border-collapse mb-4 text-xs">
        <tbody>
          <tr>
            <td className="border border-black p-2 font-semibold w-1/4">Fecha de asignación</td>
            <td className="border border-black p-2" colSpan={3}>{asignacion?.fecha || '—'}</td>
          </tr>
          <tr>
            <td className="border border-black p-2 align-top" colSpan={4}>
              {fotosAsignacion.length === 0 ? (
                <span className="text-gray-500">Sin fotografías registradas.</span>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {fotosAsignacion.map((foto, i) => (
                    <img key={i} src={foto.url} alt="" className="w-24 h-20 object-cover border border-black" />
                  ))}
                </div>
              )}
            </td>
          </tr>
        </tbody>
      </table>

      <p className="font-semibold mb-1 text-[11px]">Entrega / devolución</p>
      <table className="w-full border border-black border-collapse mb-6 text-xs">
        <tbody>
          <tr>
            <td className="border border-black p-2 font-semibold w-1/4">Motivo</td>
            <td className="border border-black p-2 w-1/4">{entrega?.motivo || '—'}</td>
            <td className="border border-black p-2 font-semibold w-1/4">Fecha de entrega</td>
            <td className="border border-black p-2 w-1/4">{entrega?.fecha || '—'}</td>
          </tr>
          <tr>
            <td className="border border-black p-2 align-top" colSpan={4}>
              {fotosEntrega.length === 0 ? (
                <span className="text-gray-500">Sin fotografías registradas.</span>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {fotosEntrega.map((foto, i) => (
                    <img key={i} src={foto.url} alt="" className="w-24 h-20 object-cover border border-black" />
                  ))}
                </div>
              )}
            </td>
          </tr>
        </tbody>
      </table>

      <p className="text-[10px] text-gray-500 mt-10 text-center">
        Servitur Gran Clas — Calidad y Seguridad a su Servicio · Documento generado automáticamente el {fechaGeneracion}
      </p>
    </div>
  )
}