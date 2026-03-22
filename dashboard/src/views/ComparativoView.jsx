import { useState } from 'react'
import { useApi } from '../hooks/useApi'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine, Area, ComposedChart } from 'recharts'
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
        {[7, 14, 30, 90, 180].map(d => (
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

        const cs = bloque.cusum
        const hasDivergencia = cs?.estado === 'divergencia'

        // CUSUM chart data
        const cusumData = cs?.s_pos?.map((sp, i) => ({
          dia: chartData[i]?.dia || `${i}`,
          s_pos: sp,
          s_neg: cs.s_neg[i],
        })) || []

        return (
          <div key={bloque.bloque} className="space-y-4">
            {/* h10 chart */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-semibold text-gray-700">Bloque {bloque.bloque} — h10 promedio diario</h3>
                  {cs && (
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                      hasDivergencia
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : 'bg-green-50 text-green-700 border border-green-200'
                    }`}>
                      {hasDivergencia
                        ? `Divergencia desde ${cs.desde_dia} (${cs.tipo})`
                        : 'Normal'}
                    </span>
                  )}
                </div>
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

            {/* CUSUM chart */}
            {cusumData.length > 0 && cs.umbral_h > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-700">
                    CUSUM — Bloque {bloque.bloque}
                    <span className="text-xs text-gray-400 ml-2 font-normal">
                      (umbral h = {cs.umbral_h.toFixed(2)}, baseline μ = {cs.alarmas?.[0] ? `${deltas.slice(0,28).reduce((a,b)=>a+b,0)/28 || 0:.2f}` : '—'})
                    </span>
                  </h3>
                  {cs.total_alarmas > 0 && (
                    <span className="text-xs text-red-600 font-semibold">
                      {cs.total_alarmas} alarma{cs.total_alarmas > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <ComposedChart data={cusumData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="dia" tick={{ fontSize: 10 }} interval={Math.max(0, Math.floor(cusumData.length / 8))} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <ReferenceLine y={cs.umbral_h} stroke="#9ca3af" strokeDasharray="8 4" label={{ value: `h = ${cs.umbral_h.toFixed(1)}`, position: 'right', fontSize: 10, fill: '#9ca3af' }} />
                    <Line type="monotone" dataKey="s_pos" name="S+ (incremento)" stroke="#ef4444" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="s_neg" name="S- (decremento)" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
                <p className="text-xs text-gray-400 mt-2">
                  Cuando S+ o S- cruza la línea punteada (umbral h), se detecta divergencia sostenida entre tratamiento y testigo.
                </p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
