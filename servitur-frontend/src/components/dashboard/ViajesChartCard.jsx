import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts'
import { LineChart } from 'lucide-react'

export default function ViajesChartCard({ data }) {
  return (
    <div className="bg-servitur-tarjeta rounded-xl shadow-sm border border-servitur-texto-secundario/10 p-4 md:p-5">
      <h2 className="flex items-center gap-2 font-semibold text-servitur-texto mb-4">
        <LineChart className="w-4 h-4 text-servitur-azul" />
        Resumen de viajes (últimos 7 días)
      </h2>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
            <XAxis dataKey="dia" tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={{ stroke: '#E5E7EB' }} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 13 }}
              cursor={{ fill: '#F4F5F6' }}
            />
            <Legend
              iconType="circle"
              wrapperStyle={{ fontSize: 13, paddingTop: 8 }}
              formatter={(value) => (value === 'realizados' ? 'Realizados' : 'Programados')}
            />
            <Bar dataKey="realizados" fill="#173F63" radius={[4, 4, 0, 0]} maxBarSize={28} />
            <Bar dataKey="programados" fill="#C9252D" radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
