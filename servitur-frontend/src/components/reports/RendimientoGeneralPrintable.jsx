import logo from '../../assets/logo.jpeg'

export default function RendimientoGeneralPrintable({ unidades }) {
  const fechaGeneracion = new Date().toLocaleDateString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  const rendimientos = unidades.map((u) => Number(u.rendimiento))
  const maxRendimiento = Math.max(...rendimientos)
  const promedio = (rendimientos.reduce((a, b) => a + b, 0) / rendimientos.length).toFixed(1)

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
              <p className="font-semibold mt-1">REPORTE GENERAL DE RENDIMIENTO DE LA FLOTILLA</p>
            </td>
            <td className="border border-black p-3 w-52 align-middle text-xs leading-relaxed">
              <p><span className="font-semibold">Fecha de emisión:</span> {fechaGeneracion}</p>
              <p><span className="font-semibold">Unidades:</span> {unidades.length}</p>
              <p><span className="font-semibold">Promedio:</span> {promedio} km/l</p>
            </td>
          </tr>
        </tbody>
      </table>

      <table className="w-full border border-black border-collapse text-xs">
        <thead>
          <tr>
            <th className="border border-black p-2 text-left">ECO</th>
            <th className="border border-black p-2 text-left">Conductor</th>
            <th className="border border-black p-2 text-left">Ruta</th>
            <th className="border border-black p-2 text-left">Recorrido</th>
            <th className="border border-black p-2 text-left w-1/3">Rendimiento (km/l)</th>
          </tr>
        </thead>
        <tbody>
          {unidades.map((u) => {
            const porcentaje = (Number(u.rendimiento) / maxRendimiento) * 100
            return (
              <tr key={u.id}>
                <td className="border border-black p-2 font-semibold">{u.eco}</td>
                <td className="border border-black p-2">{u.conductorActual}</td>
                <td className="border border-black p-2">{u.ruta}</td>
                <td className="border border-black p-2">{u.recorrido} km</td>
                <td className="border border-black p-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200" style={{ height: '10px' }}>
                      <div
                        style={{
                          width: `${porcentaje}%`,
                          height: '10px',
                          backgroundColor: '#173F63',
                        }}
                      />
                    </div>
                    <span className="w-10 text-right">{u.rendimiento}</span>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <p className="text-[10px] text-gray-500 mt-10 text-center">
        Servitur Gran Clas — Calidad y Seguridad a su Servicio · Documento generado automáticamente el {fechaGeneracion}
      </p>
    </div>
  )
}