import logo from '../../assets/logo.jpeg'

export default function ConductorReportePrintable({ conductor, permisos, incidencias }) {
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
              <p className="font-semibold mt-1">REPORTE DE CONDUCTOR</p>
            </td>
            <td className="border border-black p-3 w-52 align-middle text-xs leading-relaxed">
              <p><span className="font-semibold">Fecha de emisión:</span> {fechaGeneracion}</p>
              <p><span className="font-semibold">Estatus:</span> {conductor.estatus}</p>
            </td>
          </tr>
        </tbody>
      </table>

      <p className="font-semibold mb-1">Datos generales</p>
      <table className="w-full border border-black border-collapse mb-6 text-xs">
        <tbody>
          <tr>
            <td className="border border-black p-2 font-semibold w-1/4">Nombre completo</td>
            <td className="border border-black p-2" colSpan={3}>{conductor.nombre}</td>
          </tr>
          <tr>
            <td className="border border-black p-2 font-semibold">Domicilio</td>
            <td className="border border-black p-2" colSpan={3}>{conductor.domicilio}</td>
          </tr>
          <tr>
            <td className="border border-black p-2 font-semibold">Teléfono</td>
            <td className="border border-black p-2">{conductor.telefono}</td>
            <td className="border border-black p-2 font-semibold">Licencia</td>
            <td className="border border-black p-2">{conductor.licencia}</td>
          </tr>
          <tr>
            <td className="border border-black p-2 font-semibold">Unidad asignada</td>
            <td className="border border-black p-2">{conductor.unidadAsignada}</td>
            <td className="border border-black p-2 font-semibold">Estatus</td>
            <td className="border border-black p-2">{conductor.estatus}</td>
          </tr>
        </tbody>
      </table>

      <p className="font-semibold mb-1">Historial de permisos y oficios</p>
      <table className="w-full border border-black border-collapse mb-6 text-xs">
        <thead>
          <tr>
            <th className="border border-black p-2 text-left">Tipo</th>
            <th className="border border-black p-2 text-left">Periodo</th>
            <th className="border border-black p-2 text-left">Motivo</th>
            <th className="border border-black p-2 text-left">Estatus</th>
          </tr>
        </thead>
        <tbody>
          {permisos.length === 0 ? (
            <tr>
              <td className="border border-black p-2 text-gray-500" colSpan={4}>Sin registros.</td>
            </tr>
          ) : (
            permisos.map((p) => (
              <tr key={p.id}>
                <td className="border border-black p-2">{p.tipo}</td>
                <td className="border border-black p-2">{p.fechaInicio} — {p.fechaFin}</td>
                <td className="border border-black p-2">{p.motivo}</td>
                <td className="border border-black p-2">{p.estatus}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <p className="font-semibold mb-1">Historial de incidencias</p>
      <table className="w-full border border-black border-collapse text-xs">
        <thead>
          <tr>
            <th className="border border-black p-2 text-left">Fecha</th>
            <th className="border border-black p-2 text-left">Unidad</th>
            <th className="border border-black p-2 text-left">Tipo</th>
            <th className="border border-black p-2 text-left">Descripción</th>
          </tr>
        </thead>
        <tbody>
          {incidencias.length === 0 ? (
            <tr>
              <td className="border border-black p-2 text-gray-500" colSpan={4}>Sin registros.</td>
            </tr>
          ) : (
            incidencias.map((inc) => (
              <tr key={inc.id}>
                <td className="border border-black p-2">{inc.fecha}</td>
                <td className="border border-black p-2">{inc.unidad}</td>
                <td className="border border-black p-2">{inc.tipo}</td>
                <td className="border border-black p-2">{inc.descripcion}</td>
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