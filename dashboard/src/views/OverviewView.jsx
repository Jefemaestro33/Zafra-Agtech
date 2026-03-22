import { useNavigate } from 'react-router-dom'
import { useApi } from '../hooks/useApi'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import KpiCard from '../components/KpiCard'
import ScoreBadge from '../components/ScoreBadge'
import Loading from '../components/Loading'

function scoreColor(score) {
  if (score >= 76) return '#ef4444'
  if (score >= 51) return '#f97316'
  if (score >= 26) return '#eab308'
  return '#22c55e'
}

export default function OverviewView({ predioId }) {
  const { data, loading } = useApi(`/api/predios/${predioId}/overview`)
  const navigate = useNavigate()

  if (loading) return <Loading />
  if (!data) return null

  const { kpis, nodos, predio } = data
  const center = [predio.lat || 20.7005, predio.lon || -103.418]

  const scoreMaxColor = kpis.score_phytophthora_max >= 76 ? 'red'
    : kpis.score_phytophthora_max >= 51 ? 'orange'
    : kpis.score_phytophthora_max >= 26 ? 'yellow' : 'green'

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Nodos online"
          value={`${kpis.nodos_online}/${kpis.nodos_total}`}
          icon="📡"
          color={kpis.nodos_online === kpis.nodos_total ? 'green' : 'red'}
        />
        <KpiCard
          title="Score Phytophthora máx."
          value={kpis.score_phytophthora_max}
          subtitle={kpis.score_phytophthora_max >= 76 ? 'CRÍTICO' : kpis.score_phytophthora_max >= 51 ? 'ALTO' : kpis.score_phytophthora_max >= 26 ? 'MODERADO' : 'BAJO'}
          icon="🦠"
          color={scoreMaxColor}
        />
        <KpiCard
          title="Necesitan riego"
          value={kpis.nodos_necesitan_riego}
          icon="💧"
          color={kpis.nodos_necesitan_riego > 0 ? 'orange' : 'blue'}
        />
        <KpiCard
          title="ETo del día"
          value={`${kpis.eto_dia_mm} mm`}
          icon="☀️"
          color="yellow"
        />
      </div>

      {/* Map */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Mapa de nodos — {predio.nombre}</h2>
        </div>
        <div style={{ height: 400 }}>
          <MapContainer center={center} zoom={17} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {nodos.map(n => (
              <CircleMarker
                key={n.nodo_id}
                center={[n.lat, n.lon]}
                radius={14}
                pathOptions={{
                  fillColor: scoreColor(n.score_phytophthora),
                  color: '#fff',
                  weight: 2,
                  fillOpacity: 0.85,
                }}
                eventHandlers={{ click: () => navigate(`/nodo/${n.nodo_id}`) }}
              >
                <Popup>
                  <div className="text-sm">
                    <strong>{n.nombre}</strong><br />
                    Score: {n.score_phytophthora} ({n.nivel})<br />
                    h10: {n.ultima_lectura?.h10_avg?.toFixed(1)}%<br />
                    t20: {n.ultima_lectura?.t20?.toFixed(1)}°C
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Todos los nodos</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="text-left px-5 py-2.5">Nodo</th>
                <th className="text-left px-3 py-2.5">Rol</th>
                <th className="text-right px-3 py-2.5">h10 %</th>
                <th className="text-right px-3 py-2.5">t20 °C</th>
                <th className="text-right px-3 py-2.5">Batería</th>
                <th className="text-center px-3 py-2.5">Score</th>
                <th className="text-center px-3 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {nodos.map(n => (
                <tr
                  key={n.nodo_id}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/nodo/${n.nodo_id}`)}
                >
                  <td className="px-5 py-3 font-medium text-gray-900">{n.nombre}</td>
                  <td className="px-3 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${n.rol === 'tratamiento' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {n.rol}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right font-mono">{n.ultima_lectura?.h10_avg?.toFixed(1)}</td>
                  <td className="px-3 py-3 text-right font-mono">{n.ultima_lectura?.t20?.toFixed(1)}</td>
                  <td className="px-3 py-3 text-right font-mono">{n.ultima_lectura?.bateria?.toFixed(2)}V</td>
                  <td className="px-3 py-3 text-center">
                    <ScoreBadge score={n.score_phytophthora} nivel={n.nivel} />
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className={`w-2.5 h-2.5 rounded-full inline-block ${n.online ? 'bg-green-500' : 'bg-red-500'}`} />
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
