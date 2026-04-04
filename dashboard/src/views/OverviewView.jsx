import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApi } from '../hooks/useApi'
import { MapContainer, TileLayer, CircleMarker, Popup, Polygon, Polyline } from 'react-leaflet'
import { loadShapes } from '../hooks/useMapShapes'
import { Satellite, Map, Radio, Droplets, Thermometer, Battery, Wifi, WifiOff, Globe } from 'lucide-react'
import KpiCard from '../components/KpiCard'
import ScoreBadge from '../components/ScoreBadge'
import Loading from '../components/Loading'

function scoreColor(score) {
  if (score >= 76) return '#ef4444'
  if (score >= 51) return '#f97316'
  if (score >= 26) return '#f59e0b'
  return '#10b981'
}

function scoreGlow(score) {
  if (score >= 76) return '0 0 12px rgba(239,68,68,0.5)'
  if (score >= 51) return '0 0 10px rgba(249,115,22,0.4)'
  if (score >= 26) return '0 0 8px rgba(245,158,11,0.3)'
  return '0 0 8px rgba(16,185,129,0.3)'
}

const TILES = {
  esri: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Esri',
  },
  google: {
    url: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
    attribution: 'Google',
  },
  mapa: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap',
  },
}

export default function OverviewView({ predioId }) {
  const { data, loading } = useApi(`/api/predios/${predioId}/overview`)
  const [tileMode, setTileMode] = useState('esri')
  const navigate = useNavigate()

  if (loading) return <Loading />
  if (!data) return null

  const { kpis, nodos, predio } = data
  const center = [predio.lat || 20.759661, predio.lon || -103.511879]
  const shapes = loadShapes(predioId)
  const tile = TILES[tileMode]

  const scoreMaxColor = kpis.score_phytophthora_max >= 76 ? 'red'
    : kpis.score_phytophthora_max >= 51 ? 'orange'
    : kpis.score_phytophthora_max >= 26 ? 'yellow' : 'green'

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="animate-in stagger-1">
          <KpiCard
            title="Nodos online"
            value={`${kpis.nodos_online}/${kpis.nodos_total}`}
            icon={Radio}
            color={kpis.nodos_online === kpis.nodos_total ? 'green' : 'red'}
            subtitle={kpis.nodos_online === kpis.nodos_total ? 'Todos conectados' : `${kpis.nodos_total - kpis.nodos_online} offline`}
          />
        </div>
        <div className="animate-in stagger-2">
          <KpiCard
            title="Score Phytophthora máx."
            value={kpis.score_phytophthora_max}
            subtitle={kpis.score_phytophthora_max >= 76 ? 'CRÍTICO — Acción inmediata' : kpis.score_phytophthora_max >= 51 ? 'ALTO — Monitorear' : kpis.score_phytophthora_max >= 26 ? 'MODERADO' : 'BAJO — Normal'}
            icon="🦠"
            color={scoreMaxColor}
          />
        </div>
        <div className="animate-in stagger-3">
          <KpiCard
            title="Necesitan riego"
            value={kpis.nodos_necesitan_riego}
            icon={Droplets}
            color={kpis.nodos_necesitan_riego > 0 ? 'orange' : 'blue'}
            subtitle={kpis.nodos_necesitan_riego > 0 ? 'Programar riego' : 'Sin necesidad'}
          />
        </div>
        <div className="animate-in stagger-4">
          <KpiCard
            title="ETo del día"
            value={`${kpis.eto_dia_mm} mm`}
            icon="☀️"
            color="yellow"
            subtitle="Evapotranspiración referencia"
          />
        </div>
      </div>

      {/* Map */}
      <div
        className="rounded-2xl overflow-hidden animate-in stagger-3"
        style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
      >
        <div
          className="px-5 py-3 flex items-center justify-between"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            Mapa de nodos — {predio.nombre}
          </h2>
          <div className="flex gap-1">
            {[
              { key: 'esri', label: 'Esri', Icon: Satellite },
              { key: 'google', label: 'Google', Icon: Globe },
              { key: 'mapa', label: 'Mapa', Icon: Map },
            ].map(m => (
              <button
                key={m.key}
                onClick={() => setTileMode(m.key)}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all duration-200"
                style={{
                  background: tileMode === m.key ? 'var(--color-accent-green-dim)' : 'var(--color-surface-3)',
                  color: tileMode === m.key ? 'var(--color-accent-green)' : 'var(--color-text-muted)',
                  border: `1px solid ${tileMode === m.key ? 'rgba(16,185,129,0.3)' : 'var(--color-border)'}`,
                }}
              >
                <m.Icon size={12} />
                {m.label}
              </button>
            ))}
          </div>
        </div>
        <div className="h-[320px] sm:h-[380px] md:h-[420px] lg:h-[480px]">
          <MapContainer center={center} zoom={17} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
            <TileLayer attribution={tile.attribution} url={tile.url} />
            {shapes.polygons.map(s => (
              <Polygon key={s.id} positions={s.points} pathOptions={{ fillColor: s.fill, color: s.color, weight: 2, fillOpacity: 0.3 }} />
            ))}
            {shapes.lines.map(s => (
              <Polyline key={s.id} positions={s.points} pathOptions={{ color: s.color, weight: 3, dashArray: s.block === 'linea' ? '8 4' : undefined }} />
            ))}
            {nodos.map(n => (
              <CircleMarker
                key={n.nodo_id}
                center={[n.lat, n.lon]}
                radius={10}
                pathOptions={{
                  fillColor: scoreColor(n.score_phytophthora),
                  color: 'rgba(255,255,255,0.6)',
                  weight: 2,
                  fillOpacity: 0.9,
                }}
                eventHandlers={{ click: () => navigate(`/nodo/${n.nodo_id}`) }}
              >
                <Popup>
                  <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13 }}>
                    <strong style={{ color: 'var(--color-text-primary)' }}>{n.nombre}</strong>
                    <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <span>Score: <strong style={{ color: scoreColor(n.score_phytophthora) }}>{n.score_phytophthora}</strong> ({n.nivel})</span>
                      <span>h10: {n.ultima_lectura?.h10_avg?.toFixed(1)}% VWC</span>
                      <span>t20: {n.ultima_lectura?.t20?.toFixed(1)}°C</span>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
      </div>

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
            Todos los nodos
          </h2>
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {nodos.length} nodos · Auto-refresh 30s
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                {['Nodo', 'Rol', 'h10 %', 't20 °C', 'EC dS/m', 'Batería', 'Score', 'Status'].map((h, i) => (
                  <th
                    key={h}
                    className={`px-5 py-3 text-[11px] font-semibold uppercase tracking-wider ${
                      ['h10 %', 't20 °C', 'EC dS/m', 'Batería'].includes(h) ? 'text-right' : i > 5 ? 'text-center' : 'text-left'
                    }`}
                    style={{ color: 'var(--color-text-muted)', background: 'var(--color-surface-3)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {nodos.map((n, idx) => (
                <tr
                  key={n.nodo_id}
                  className="cursor-pointer transition-colors duration-150"
                  onClick={() => navigate(`/nodo/${n.nodo_id}`)}
                  style={{ borderBottom: '1px solid var(--color-border)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-3)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{
                          background: scoreColor(n.score_phytophthora),
                          boxShadow: scoreGlow(n.score_phytophthora),
                        }}
                      />
                      <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                        {n.nombre}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className="text-[11px] px-2.5 py-1 rounded-md font-medium"
                      style={{
                        background: n.rol === 'tratamiento' ? 'var(--color-accent-green-dim)' : 'var(--color-surface-4)',
                        color: n.rol === 'tratamiento' ? 'var(--color-accent-green)' : 'var(--color-text-muted)',
                        border: `1px solid ${n.rol === 'tratamiento' ? 'rgba(16,185,129,0.2)' : 'var(--color-border)'}`,
                      }}
                    >
                      {n.rol}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono text-[13px]" style={{ color: 'var(--color-accent-cyan)' }}>
                    {n.ultima_lectura?.h10_avg?.toFixed(1)}
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono text-[13px]" style={{ color: 'var(--color-accent-amber)' }}>
                    {n.ultima_lectura?.t20?.toFixed(1)}
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>
                    {n.ultima_lectura?.ec30?.toFixed(2) ?? '—'}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <span className="font-mono text-[13px]" style={{
                      color: n.ultima_lectura?.bateria < 3.3 ? 'var(--color-accent-red)' : 'var(--color-accent-green)'
                    }}>
                      {n.ultima_lectura?.bateria?.toFixed(2)}V
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <ScoreBadge score={n.score_phytophthora} nivel={n.nivel} />
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <div className="flex items-center justify-center">
                      {n.online ? (
                        <Wifi size={14} style={{ color: 'var(--color-accent-green)' }} />
                      ) : (
                        <WifiOff size={14} style={{ color: 'var(--color-accent-red)' }} />
                      )}
                    </div>
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
