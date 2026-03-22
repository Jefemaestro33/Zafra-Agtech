import { useApi } from '../hooks/useApi'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { ArrowDownToLine, Timer, Target } from 'lucide-react'
import KpiCard from '../components/KpiCard'
import EmptyState from '../components/EmptyState'
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

export default function FirmaView({ predioId }) {
  const { data, loading } = useApi(`/api/predios/${predioId}/firma`)

  if (loading) return <Loading />

  if (!data || data.length === 0) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="animate-in stagger-1">
            <KpiCard title="Vel. infiltración 10→20cm" value="—" icon={ArrowDownToLine} color="blue" subtitle="Pendiente de cálculo" />
          </div>
          <div className="animate-in stagger-2">
            <KpiCard title="τ secado 10cm" value="—" icon={Timer} color="yellow" subtitle="Pendiente de cálculo" />
          </div>
          <div className="animate-in stagger-3">
            <KpiCard title="Breaking point" value="—" icon={Target} color="orange" subtitle="Pendiente de cálculo" />
          </div>
        </div>
        <EmptyState
          icon="💧"
          title="Firma hídrica pendiente"
          description="La firma hídrica se calculará cuando se implementen los algoritmos de detección de eventos de riego. Cada evento generará métricas de velocidad de infiltración, constante de secado (τ) y breaking point dinámico."
        />
      </div>
    )
  }

  const latest = data[0]

  const nodoColors = {}
  const nodoRoles = {}
  const chartMap = {}
  data.forEach(f => {
    if (f.tau_10 == null) return
    const date = new Date(f.evento_riego).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })
    if (!chartMap[date]) chartMap[date] = { date }
    const key = `Nodo ${f.nodo_id}`
    chartMap[date][key] = f.tau_10
    nodoColors[key] = nodoColors[key] || null
    nodoRoles[key] = f.nodo_id % 2 !== 0 ? 'tratamiento' : 'testigo'
  })
  const chartData = Object.values(chartMap).reverse()
  const nodoKeys = Object.keys(nodoColors)

  const roleColors = {
    tratamiento: ['#10b981', '#34d399', '#059669', '#6ee7b7'],
    testigo: ['#6b7280', '#9ca3af', '#4b5563', '#d1d5db'],
  }
  const tratIdx = { current: 0 }
  const testIdx = { current: 0 }
  nodoKeys.forEach(k => {
    const role = nodoRoles[k]
    if (role === 'tratamiento') {
      nodoColors[k] = roleColors.tratamiento[tratIdx.current % 4]
      tratIdx.current++
    } else {
      nodoColors[k] = roleColors.testigo[testIdx.current % 4]
      testIdx.current++
    }
  })

  const gridColor = 'rgba(42, 47, 64, 0.6)'
  const axisStyle = { fontSize: 11, fill: 'var(--color-text-muted)' }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="animate-in stagger-1">
          <KpiCard title="Vel. infiltración 10→20cm" value={latest.vel_10_20 != null ? `${latest.vel_10_20.toFixed(4)} m/min` : '—'} icon={ArrowDownToLine} color="blue" />
        </div>
        <div className="animate-in stagger-2">
          <KpiCard title="τ secado 10cm" value={latest.tau_10 != null ? `${latest.tau_10.toFixed(1)} h` : '—'} icon={Timer} color="yellow" />
        </div>
        <div className="animate-in stagger-3">
          <KpiCard title="Breaking point 10cm" value={latest.breaking_point_10 != null ? `${latest.breaking_point_10.toFixed(1)}% VWC` : '—'} icon={Target} color="orange" />
        </div>
      </div>

      {chartData.length > 0 && (
        <div
          className="rounded-2xl overflow-hidden animate-in stagger-3"
          style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
        >
          <div className="px-5 pt-5 pb-2">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              Evolución de τ secado 10cm por nodo
            </h3>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              Líneas sólidas = tratamiento · Punteadas = testigo
            </p>
          </div>
          <div className="px-3 pb-4">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="date" tick={axisStyle} interval={Math.max(0, Math.floor(chartData.length / 8))} />
                <YAxis unit=" h" tick={axisStyle} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, color: 'var(--color-text-muted)' }} />
                {nodoKeys.map(k => (
                  <Line
                    key={k}
                    type="monotone"
                    dataKey={k}
                    name={k}
                    stroke={nodoColors[k]}
                    strokeWidth={nodoRoles[k] === 'tratamiento' ? 2.5 : 1.5}
                    strokeDasharray={nodoRoles[k] === 'testigo' ? '6 4' : undefined}
                    dot={false}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Table */}
      <div
        className="rounded-2xl overflow-hidden animate-in stagger-4"
        style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
      >
        <div
          className="px-5 py-3 flex items-center justify-between"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            Historial de firma hídrica
          </h2>
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{data.length} eventos</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                {['Nodo', 'Evento', 'vel 10→20', 'τ10', 'τ20', 'BP 10cm', 'Δh max'].map((h, i) => (
                  <th
                    key={h}
                    className={`px-5 py-3 text-[11px] font-semibold uppercase tracking-wider ${i > 1 ? 'text-right' : 'text-left'}`}
                    style={{ color: 'var(--color-text-muted)', background: 'var(--color-surface-3)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((f, i) => (
                <tr
                  key={i}
                  style={{ borderBottom: '1px solid var(--color-border)' }}
                  className="transition-colors"
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-3)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td className="px-5 py-2.5" style={{ color: 'var(--color-text-primary)' }}>{f.nodo_id}</td>
                  <td className="px-5 py-2.5" style={{ color: 'var(--color-text-muted)' }}>
                    {new Date(f.evento_riego).toLocaleDateString('es-MX')}
                  </td>
                  <td className="px-5 py-2.5 text-right font-mono text-[13px]" style={{ color: 'var(--color-accent-cyan)' }}>
                    {f.vel_10_20?.toFixed(4) ?? '—'}
                  </td>
                  <td className="px-5 py-2.5 text-right font-mono text-[13px]" style={{ color: 'var(--color-accent-amber)' }}>
                    {f.tau_10?.toFixed(1) ?? '—'}
                  </td>
                  <td className="px-5 py-2.5 text-right font-mono text-[13px]" style={{ color: 'var(--color-accent-amber)' }}>
                    {f.tau_20?.toFixed(1) ?? '—'}
                  </td>
                  <td className="px-5 py-2.5 text-right font-mono text-[13px]" style={{ color: 'var(--color-accent-green)' }}>
                    {f.breaking_point_10?.toFixed(1) ?? '—'}
                  </td>
                  <td className="px-5 py-2.5 text-right font-mono text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>
                    {f.delta_h_max?.toFixed(1) ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
