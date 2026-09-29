import logo from '../../assets/logo.jpeg'

function TablaResumen({ titulo, columnas, filas }) {
  return (
    <div className="mb-5">
      <p className="font-semibold text-xs mb-1.5">{titulo}</p>
      <table className="w-full border border-black border-collapse text-xs">
        <thead>
          <tr>
            {columnas.map((c) => (
              <th key={c} className="border border-black p-1.5 text-left">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.length === 0 ? (
            <tr>
              <td className="border border-black p-2 text-center text-gray-500" colSpan={columnas.length}>
                Sin datos.
              </td>
            </tr>
          ) : (
            filas.map((f, i) => (
              <tr key={i}>
                {f.map((valor, j) => (
                  <td key={j} className="border border-black p-1.5">{valor}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

export default function IncidenciasReportePrintable({
  incidencias,
  porUnidad,
  retrasosPorUnidad,
  porSemana,
  porMes,
  porDiaSemana,
  totalIncidencias,
  totalRetrasos,
  alcance,
}) {
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
              <p className="font-semibold mt-1">REPORTE DE INCIDENCIAS Y RETRASOS</p>
            </td>
            <td className="border border-black p-3 w-56 align-middle text-xs leading-relaxed">
              <p><span className="font-semibold">Alcance:</span> {alcance}</p>
              <p><span className="font-semibold">Total incidencias:</span> {totalIncidencias}</p>
              <p><span className="font-semibold">Total retrasos:</span> {totalRetrasos}</p>
            </td>
          </tr>
        </tbody>
      </table>

      <div className="grid grid-cols-2 gap-x-6">
        <TablaResumen
          titulo="Incidencias por unidad"
          columnas={['Unidad', 'Total']}
          filas={porUnidad.map((r) => [r.nombre, r.cantidad])}
        />
        <TablaResumen
          titulo="Retrasos por unidad"
          columnas={['Unidad', 'Total']}
          filas={retrasosPorUnidad.map((r) => [r.nombre, r.cantidad])}
        />
        <TablaResumen
          titulo="Incidencias por semana"
          columnas={['Semana', 'Total']}
          filas={porSemana.map((r) => [r.etiqueta, r.cantidad])}
        />
        <TablaResumen
          titulo="Incidencias por mes"
          columnas={['Mes', 'Total']}
          filas={porMes.map((r) => [r.etiqueta, r.cantidad])}
        />
      </div>

      <TablaResumen
        titulo="Incidencias por día de la semana"
        columnas={['Día', 'Total']}
        filas={porDiaSemana.map((r) => [r.diaCompleto, r.cantidad])}
      />

      <p className="font-semibold text-sm mb-2 mt-4">Detalle de incidencias</p>
      <table className="w-full border border-black border-collapse text-xs">
        <thead>
          <tr>
            <th className="border border-black p-2 text-left">Fecha</th>
            <th className="border border-black p-2 text-left">Conductor</th>
            <th className="border border-black p-2 text-left">Unidad</th>
            <th className="border border-black p-2 text-left">Tipo</th>
            <th className="border border-black p-2 text-left">Descripción</th>
          </tr>
        </thead>
        <tbody>
          {[...incidencias]
            .sort((a, b) => b.fecha.localeCompare(a.fecha))
            .map((inc) => (
              <tr key={inc.id}>
                <td className="border border-black p-1.5">{inc.fecha}</td>
                <td className="border border-black p-1.5">{inc.conductor}</td>
                <td className="border border-black p-1.5 font-semibold">{inc.unidad}</td>
                <td className="border border-black p-1.5">{inc.tipo}</td>
                <td className="border border-black p-1.5">{inc.descripcion}</td>
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