import { useApi } from '../hooks/useApi'
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
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard title="Vel. infiltración 10→20cm" value={`${latest.vel_10_20?.toFixed(4)} m/min`} icon="⬇️" color="blue" />
        <KpiCard title="τ secado 10cm" value={`${latest.tau_10?.toFixed(1)} h`} icon="⏱️" color="yellow" />
        <KpiCard title="Breaking point 10cm" value={`${latest.breaking_point_10?.toFixed(1)}% VWC`} icon="🎯" color="orange" />
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <div className="px-5 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Historial de firma hídrica</h2>
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
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((f, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-5 py-2.5">{f.nodo_id}</td>
                <td className="px-3 py-2.5 text-gray-500">{new Date(f.evento_riego).toLocaleDateString('es-MX')}</td>
                <td className="px-3 py-2.5 text-right font-mono">{f.vel_10_20?.toFixed(4)}</td>
                <td className="px-3 py-2.5 text-right font-mono">{f.tau_10?.toFixed(1)}</td>
                <td className="px-3 py-2.5 text-right font-mono">{f.tau_20?.toFixed(1)}</td>
                <td className="px-3 py-2.5 text-right font-mono">{f.breaking_point_10?.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
