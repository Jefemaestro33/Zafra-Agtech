import { useState } from 'react'
import { useApi } from '../hooks/useApi'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import Loading from '../components/Loading'

export default function ComparativoView({ predioId }) {
  const [dias, setDias] = useState(30)
  const { data, loading } = useApi(`/api/predios/${predioId}/comparativo?dias=${dias}`, [dias])

  if (loading) return <Loading />
  if (!data || data.length === 0) return <p className="text-gray-400">Sin datos comparativos.</p>

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex gap-2">
        {[7, 14, 30, 90].map(d => (
          <button
            key={d}
            onClick={() => setDias(d)}
            className={`px-4 py-1.5 text-sm rounded-lg border transition-colors ${
              dias === d ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}
          >
            {d}d
          </button>
        ))}
      </div>

      {data.map(bloque => {
        const chartData = bloque.dias.map(d => ({
          dia: new Date(d.dia).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' }),
          tratamiento: d.tratamiento?.h10_avg,
          testigo: d.testigo?.h10_avg,
          delta: d.delta_h10,
        }))

        const deltas = chartData.filter(d => d.delta != null).map(d => d.delta)
        const avgDelta = deltas.length ? deltas.reduce((s, d) => s + d, 0) / deltas.length : 0

        return (
          <div key={bloque.bloque} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700">Bloque {bloque.bloque} — h10 promedio diario</h3>
              <span className={`text-xs px-2 py-1 rounded-full font-semibold ${avgDelta < 0 ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}`}>
                Δ promedio: {avgDelta.toFixed(2)}%
              </span>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
                <YAxis unit="%" tick={{ fontSize: 11 }} domain={[15, 50]} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="tratamiento" name="Tratamiento" stroke="#22c55e" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="testigo" name="Testigo" stroke="#6b7280" strokeWidth={2} dot={false} strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )
      })}
    </div>
  )
}
