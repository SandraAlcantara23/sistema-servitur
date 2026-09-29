import logo from '../../assets/logo.jpeg'

export default function ConductoresListPrintable({ conductores }) {
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
              <p className="font-semibold mt-1">LISTADO DE CONDUCTORES</p>
            </td>
            <td className="border border-black p-3 w-52 align-middle text-xs leading-relaxed">
              <p><span className="font-semibold">Fecha de emisión:</span> {fechaGeneracion}</p>
              <p><span className="font-semibold">Registros:</span> {conductores.length}</p>
            </td>
          </tr>
        </tbody>
      </table>

      <table className="w-full border border-black border-collapse text-xs">
        <thead>
          <tr>
            <th className="border border-black p-2 text-left">Nombre</th>
            <th className="border border-black p-2 text-left">Teléfono</th>
            <th className="border border-black p-2 text-left">Domicilio</th>
            <th className="border border-black p-2 text-left">Licencia</th>
            <th className="border border-black p-2 text-left">Unidad</th>
            <th className="border border-black p-2 text-left">Estatus</th>
          </tr>
        </thead>
        <tbody>
          {conductores.map((c) => (
            <tr key={c.id}>
              <td className="border border-black p-2">{c.nombre}</td>
              <td className="border border-black p-2">{c.telefono}</td>
              <td className="border border-black p-2">{c.domicilio}</td>
              <td className="border border-black p-2">{c.licencia}</td>
              <td className="border border-black p-2">{c.unidadAsignada}</td>
              <td className="border border-black p-2">{c.estatus}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="text-[10px] text-gray-500 mt-10 text-center">
        Servitur Gran Clas — Calidad y Seguridad a su Servicio · Documento generado automáticamente el {fechaGeneracion}
      </p>
    </div>
  )
}