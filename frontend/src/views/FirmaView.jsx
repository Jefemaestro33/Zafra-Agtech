import { useApi } from '../hooks/useApi'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import KpiCard from '../components/KpiCard'
import EmptyState from '../components/EmptyState'
import Loading from '../components/Loading'

export default function FirmaView({ predioId }) {
  const { data, loading } = useApi(`/api/predios/${predioId}/firma`)

  if (loading) return <Loading />

  if (!data || data.length === 0) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KpiCard title="Vel. infiltración 10→20cm" value="—" icon="⬇️" color="blue" subtitle="Pendiente de cálculo" />
          <KpiCard title="τ secado 10cm" value="—" icon="⏱️" color="yellow" subtitle="Pendiente de cálculo" />
          <KpiCard title="Breaking point" value="—" icon="🎯" color="orange" subtitle="Pendiente de cálculo" />
        </div>
        <EmptyState
          icon="💧"
          title="Firma hídrica pendiente"
          description="La firma hídrica se calculará cuando se implementen los algoritmos de detección de eventos de riego en firma_hidrica.py. Cada evento de riego generará métricas de velocidad de infiltración, constante de secado (τ) y breaking point dinámico."
        />
      </div>
    )
  }

  const latest = data[0]

  // Build chart data: tau_10 evolution grouped by nodo
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
    tratamiento: ['#22c55e', '#15803d', '#4ade80', '#166534'],
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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard title="Vel. infiltración 10→20cm" value={latest.vel_10_20 != null ? `${latest.vel_10_20.toFixed(4)} m/min` : '—'} icon="⬇️" color="blue" />
        <KpiCard title="τ secado 10cm" value={latest.tau_10 != null ? `${latest.tau_10.toFixed(1)} h` : '—'} icon="⏱️" color="yellow" />
        <KpiCard title="Breaking point 10cm" value={latest.breaking_point_10 != null ? `${latest.breaking_point_10.toFixed(1)}% VWC` : '—'} icon="🎯" color="orange" />
      </div>

      {/* Tau evolution chart */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Evolución de τ secado 10cm por nodo</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={Math.max(0, Math.floor(chartData.length / 8))} />
              <YAxis unit=" h" tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              {nodoKeys.map(k => (
                <Line
                  key={k}
                  type="monotone"
                  dataKey={k}
                  name={k}
                  stroke={nodoColors[k]}
                  strokeWidth={nodoRoles[k] === 'tratamiento' ? 2 : 1.5}
                  strokeDasharray={nodoRoles[k] === 'testigo' ? '5 5' : undefined}
                  dot={false}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
          <p className="text-xs text-gray-400 mt-2">Líneas sólidas = tratamiento, punteadas = testigo</p>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <div className="px-5 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Historial de firma hídrica ({data.length} eventos)</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="text-left px-5 py-2">Nodo</th>
              <th className="text-left px-3 py-2">Evento</th>
              <th className="text-right px-3 py-2">vel 10→20</th>
              <th className="text-right px-3 py-2">τ10</th>
              <th className="text-right px-3 py-2">τ20</th>
              <th className="text-right px-3 py-2">BP 10cm</th>
              <th className="text-right px-3 py-2">Δh max</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((f, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-5 py-2.5">{f.nodo_id}</td>
                <td className="px-3 py-2.5 text-gray-500">{new Date(f.evento_riego).toLocaleDateString('es-MX')}</td>
                <td className="px-3 py-2.5 text-right font-mono">{f.vel_10_20?.toFixed(4) ?? '—'}</td>
                <td className="px-3 py-2.5 text-right font-mono">{f.tau_10?.toFixed(1) ?? '—'}</td>
                <td className="px-3 py-2.5 text-right font-mono">{f.tau_20?.toFixed(1) ?? '—'}</td>
                <td className="px-3 py-2.5 text-right font-mono">{f.breaking_point_10?.toFixed(1) ?? '—'}</td>
                <td className="px-3 py-2.5 text-right font-mono">{f.delta_h_max?.toFixed(1) ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
