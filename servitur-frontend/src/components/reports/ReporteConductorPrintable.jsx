import logo from '../../assets/logo.jpeg'

export default function ReporteConductorPrintable({ datos }) {
  const fechaGeneracion = new Date().toLocaleDateString('es-MX')

  return (
    <div className="bg-white text-black p-8 text-xs" style={{ width: '210mm', minHeight: '297mm' }}>
      {/* Encabezado tipo formato */}
      <table className="w-full border border-black border-collapse mb-4">
        <tbody>
          <tr>
            <td className="border border-black p-2 w-32 align-middle">
              <img src={logo} alt="Servitur Gran Clas" className="w-24" />
            </td>
            <td className="border border-black p-2 text-center align-middle">
              <p className="font-bold">REPORTE DE CONDUCTOR</p>
              <p className="text-[10px]">FOPR-MAN-01-02</p>
            </td>
            <td className="border border-black p-2 w-40 align-middle text-[10px] leading-relaxed">
              <p><span className="font-semibold">Fecha de emisión:</span> {fechaGeneracion}</p>
              <p><span className="font-semibold">Servicio:</span> {datos.tipoServicio}</p>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Datos generales */}
      <table className="w-full border border-black border-collapse mb-4">
        <tbody>
          <tr>
            <td className="border border-black p-1.5 font-semibold w-1/6">Autobús</td>
            <td className="border border-black p-1.5 w-1/6">{datos.unidad}</td>
            <td className="border border-black p-1.5 font-semibold w-1/6">Tecnología</td>
            <td className="border border-black p-1.5 w-1/6">{datos.tecnologia}</td>
            <td className="border border-black p-1.5 font-semibold w-1/6">KMS</td>
            <td className="border border-black p-1.5 w-1/6">{datos.kms}</td>
          </tr>
          <tr>
            <td className="border border-black p-1.5 font-semibold">Tipo de servicio</td>
            <td className="border border-black p-1.5">{datos.tipoServicioTexto}</td>
            <td className="border border-black p-1.5 font-semibold">Fecha de ingreso</td>
            <td className="border border-black p-1.5">{datos.fechaIngreso}</td>
            <td className="border border-black p-1.5 font-semibold">Fecha de salida</td>
            <td className="border border-black p-1.5">{datos.fechaSalida}</td>
          </tr>
          <tr>
            <td className="border border-black p-1.5 font-semibold">Conductor</td>
            <td className="border border-black p-1.5" colSpan={5}>{datos.conductor}</td>
          </tr>
        </tbody>
      </table>

      {/* Las 12 categorías */}
      <table className="w-full border border-black border-collapse mb-4">
        <thead>
          <tr>
            <th className="border border-black p-1.5 text-left w-1/6">Categoría</th>
            <th className="border border-black p-1.5 text-left w-2/5">Actividades reportadas por el conductor</th>
            <th className="border border-black p-1.5 text-left w-2/5">Diagnóstico técnico (mantenimiento)</th>
          </tr>
        </thead>
        <tbody>
          {datos.categorias.map((cat, i) => (
            <tr key={i}>
              <td className="border border-black p-1.5 font-semibold align-top">{i + 1}. {cat.nombre}</td>
              <td className="border border-black p-1.5 align-top whitespace-pre-wrap">{cat.actividad || '—'}</td>
              <td className="border border-black p-1.5 align-top whitespace-pre-wrap">
                {cat.diagnostico || '—'}
                {cat.firma && <p className="mt-1 text-[10px] italic">Firma: {cat.firma}</p>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Conformidad */}
      <table className="w-full border border-black border-collapse mb-4">
        <tbody>
          <tr>
            <td className="border border-black p-2 w-1/2">
              <p className="font-semibold">Nombre y firma del conductor (conformidad)</p>
              <p className="mt-4">{datos.conformidadConductor || '—'}</p>
            </td>
            <td className="border border-black p-2 w-1/2">
              <p className="font-semibold">Firma del jefe de mantenimiento</p>
              <p className="mt-4">{datos.firmaJefeMantenimiento || '—'}</p>
            </td>
          </tr>
        </tbody>
      </table>

      <p className="text-[9px] text-gray-500 mt-8 text-center">
        Servitur Gran Clas — Calidad y Seguridad a su Servicio · Documento generado automáticamente el {fechaGeneracion}
      </p>
    </div>
  )
}