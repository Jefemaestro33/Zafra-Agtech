import { useState } from 'react'
import { useApi } from '../hooks/useApi'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine, ComposedChart } from 'recharts'
import { AlertTriangle, CheckCircle } from 'lucide-react'
import Loading from '../components/Loading'

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div
      className="rounded-xl px-4 py-3 text-xs shadow-2xl"
      style={{ background: 'var(--color-surface-3)', border: '1px solid var(--color-border-light)' }}
    >
      <p className="font-semibold mb-1.5" style={{ color: 'var(--color-text-primary)' }}>{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 py-0.5">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span style={{ color: 'var(--color-text-muted)' }}>{p.name}:</span>
          <span className="font-mono font-semibold" style={{ color: p.color }}>
            {typeof p.value === 'number' ? p.value.toFixed(2) : p.value}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function ComparativoView({ predioId }) {
  const [dias, setDias] = useState(30)
  const { data, loading } = useApi(`/api/predios/${predioId}/comparativo?dias=${dias}`, [dias])

  if (loading) return <Loading />
  if (!data || data.length === 0) {
    return <p style={{ color: 'var(--color-text-muted)' }}>Sin datos comparativos.</p>
  }

  const gridColor = 'rgba(42, 47, 64, 0.6)'
  const axisStyle = { fontSize: 11, fill: 'var(--color-text-muted)' }

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex gap-2 animate-in">
        {[7, 14, 30, 90, 180].map(d => (
          <button
            key={d}
            onClick={() => setDias(d)}
            className="px-4 py-1.5 text-sm rounded-lg transition-all duration-200"
            style={{
              background: dias === d ? 'var(--color-accent-green-dim)' : 'var(--color-surface-3)',
              color: dias === d ? 'var(--color-accent-green)' : 'var(--color-text-muted)',
              border: `1px solid ${dias === d ? 'rgba(16,185,129,0.3)' : 'var(--color-border)'}`,
            }}
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

        const cusumData = cs?.s_pos?.map((sp, i) => ({
          dia: chartData[i]?.dia || `${i}`,
          s_pos: sp,
          s_neg: cs.s_neg[i],
        })) || []

        return (
          <div key={bloque.bloque} className="space-y-4">
            {/* h10 chart */}
            <div
              className="rounded-2xl overflow-hidden animate-in stagger-2"
              style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
            >
              <div className="px-5 pt-5 pb-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                      Bloque {bloque.bloque} — h10 promedio diario
                    </h3>
                    {cs && (
                      <span
                        className="text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1.5"
                        style={{
                          background: hasDivergencia ? 'var(--color-glow-red)' : 'var(--color-glow-green)',
                          color: hasDivergencia ? 'var(--color-accent-red)' : 'var(--color-accent-green)',
                          border: `1px solid ${hasDivergencia ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
                        }}
                      >
                        {hasDivergencia ? <AlertTriangle size={12} /> : <CheckCircle size={12} />}
                        {hasDivergencia
                          ? `Divergencia desde ${cs.desde_dia} (${cs.tipo})`
                          : 'Normal'}
                      </span>
                    )}
                  </div>
                  <span
                    className="text-xs px-2.5 py-1 rounded-full font-semibold"
                    style={{
                      background: avgDelta < 0 ? 'var(--color-glow-green)' : 'var(--color-glow-amber)',
                      color: avgDelta < 0 ? 'var(--color-accent-green)' : 'var(--color-accent-amber)',
                      border: `1px solid ${avgDelta < 0 ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`,
                    }}
                  >
                    Δ promedio: {avgDelta.toFixed(2)}%
                  </span>
                </div>
              </div>
              <div className="px-3 pb-4">
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis dataKey="dia" tick={axisStyle} />
                    <YAxis unit="%" tick={axisStyle} domain={[15, 50]} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12, color: 'var(--color-text-muted)' }} />
                    <Line type="monotone" dataKey="tratamiento" name="Tratamiento" stroke="#10b981" strokeWidth={2.5} dot={false} />
                    <Line type="monotone" dataKey="testigo" name="Testigo" stroke="#6b7280" strokeWidth={1.5} dot={false} strokeDasharray="6 4" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* CUSUM chart */}
            {cusumData.length > 0 && cs.umbral_h > 0 && (
              <div
                className="rounded-2xl overflow-hidden animate-in stagger-3"
                style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
              >
                <div className="px-5 pt-5 pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                        CUSUM — Bloque {bloque.bloque}
                      </h3>
                      <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                        Umbral h = {cs.umbral_h.toFixed(2)} · Cuando S+ o S- cruza el umbral, divergencia sostenida
                      </p>
                    </div>
                    {cs.total_alarmas > 0 && (
                      <span
                        className="text-xs font-semibold flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                        style={{
                          background: 'var(--color-glow-red)',
                          color: 'var(--color-accent-red)',
                          border: '1px solid rgba(239,68,68,0.3)',
                        }}
                      >
                        <AlertTriangle size={12} />
                        {cs.total_alarmas} alarma{cs.total_alarmas > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
                <div className="px-3 pb-4">
                  <ResponsiveContainer width="100%" height={200}>
                    <ComposedChart data={cusumData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                      <XAxis dataKey="dia" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} interval={Math.max(0, Math.floor(cusumData.length / 8))} />
                      <YAxis tick={axisStyle} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 12, color: 'var(--color-text-muted)' }} />
                      <ReferenceLine
                        y={cs.umbral_h}
                        stroke="var(--color-text-muted)"
                        strokeDasharray="8 4"
                        strokeOpacity={0.5}
                        label={{ value: `h = ${cs.umbral_h.toFixed(1)}`, position: 'right', fontSize: 10, fill: 'var(--color-text-muted)' }}
                      />
                      <Line type="monotone" dataKey="s_pos" name="S+ (incremento)" stroke="#ef4444" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="s_neg" name="S- (decremento)" stroke="#3b82f6" strokeWidth={2} dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
