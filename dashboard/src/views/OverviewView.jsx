import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApi } from '../hooks/useApi'
import { MapContainer, TileLayer, Marker, Tooltip, Popup, Polygon, Polyline } from 'react-leaflet'
import L from 'leaflet'
import { loadShapes } from '../hooks/useMapShapes'
import { narrate } from '../lib/nodeNarrative'
import { Satellite, Map, Radio, Droplets, Thermometer, Battery, Wifi, WifiOff, Globe } from 'lucide-react'
import KpiCard from '../components/KpiCard'
import ScoreBadge from '../components/ScoreBadge'
import Loading from '../components/Loading'

// ---------- Geometría: convex hull para perímetro del predio ----------
function convexHull(points) {
  if (points.length < 3) return points.slice()
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const cross = (O, A, B) => (A[0] - O[0]) * (B[1] - O[1]) - (A[1] - O[1]) * (B[0] - O[0])
  const lower = []
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop()
    lower.push(p)
  }
  const upper = []
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i]
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop()
    upper.push(p)
  }
  upper.pop(); lower.pop()
  return [...lower, ...upper]
}

function expandPolygon(points, factor) {
  if (!points.length) return points
  const cx = points.reduce((s, p) => s + p[0], 0) / points.length
  const cy = points.reduce((s, p) => s + p[1], 0) / points.length
  return points.map(p => [cx + (p[0] - cx) * factor, cy + (p[1] - cy) * factor])
}

function bboxOf(points) {
  if (!points.length) return null
  let n = points[0][0], s = n, w = points[0][1], e = w
  for (const [lat, lon] of points) {
    if (lat < s) s = lat
    if (lat > n) n = lat
    if (lon < w) w = lon
    if (lon > e) e = lon
  }
  return [[s, w], [n, e]]
}

// ---------- Marker custom: bola + label + pulso ----------
const SEV_COLOR = {
  red:   '#ef4444',
  amber: '#f59e0b',
  green: '#10b981',
  gray:  '#9ca3af',
}

function LegendItem({ color, label, count, pulse }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 ${pulse ? 'zafra-legend-pulse' : ''}`}
        style={{ background: color, border: '1.5px solid #fff', boxShadow: '0 0 0 1px rgba(0,0,0,0.4)' }}
      />
      <span className="flex-1">{label}</span>
      {count !== undefined && (
        <span className="font-mono opacity-70">{count}</span>
      )}
    </div>
  )
}

function nodoIcon({ severity, nombre, online }) {
  const color = online ? SEV_COLOR[severity] : SEV_COLOR.gray
  const cls = `zafra-node ${severity || 'gray'}${online ? '' : ' offline'}`
  const html = `
    <div class="${cls}">
      <div class="zafra-node-dot" style="background:${color}"></div>
      <div class="zafra-node-label">${(nombre || '').replace(/[<>]/g, '')}</div>
    </div>
  `
  return L.divIcon({
    className: 'zafra-node-icon',
    html,
    iconSize: [120, 40],
    iconAnchor: [60, 9],   // centro exacto del dot (14px alto + 2*2 border = 18px → centro y=9)
    popupAnchor: [0, -10],
  })
}

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
  const [tileMode, setTileMode] = useState('google')
  const navigate = useNavigate()

  // Hooks must run unconditionally (before any early return).
  const shapes = useMemo(() => loadShapes(predioId), [predioId])
  const nodosNarrative = useMemo(() => {
    if (!data) return []
    return data.nodos.map(n => ({ ...n, _narrative: narrate(n) }))
  }, [data])

  // Convex hull = perímetro del predio (a partir de nodos + shapes)
  const perimeter = useMemo(() => {
    if (!data) return null
    const allPoints = []
    for (const n of data.nodos) {
      if (n.lat != null && n.lon != null) allPoints.push([n.lat, n.lon])
    }
    for (const s of shapes.polygons || []) for (const p of s.points || []) allPoints.push(p)
    for (const s of shapes.lines || []) for (const p of s.points || []) allPoints.push(p)
    if (allPoints.length < 3) return null
    return expandPolygon(convexHull(allPoints), 1.18)
  }, [data, shapes])

  const mapBounds = useMemo(() => perimeter ? bboxOf(perimeter) : null, [perimeter])

  if (loading) return <Loading />
  if (!data) return null

  const { kpis, nodos, predio } = data
  const center = [predio.lat || 20.759661, predio.lon || -103.511879]
  const tile = TILES[tileMode]
  const sevCounts = nodosNarrative.reduce((acc, n) => {
    acc[n._narrative.severity] = (acc[n._narrative.severity] || 0) + 1
    return acc
  }, { red: 0, amber: 0, green: 0 })

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
              { key: 'google', label: 'Google', Icon: Globe },
              { key: 'esri', label: 'Esri', Icon: Satellite },
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
        <div className="relative h-[420px] sm:h-[480px] md:h-[540px] lg:h-[600px]">
          <MapContainer
            {...(mapBounds ? { bounds: mapBounds, boundsOptions: { padding: [40, 40] } } : { center, zoom: 17 })}
            style={{ height: '100%', width: '100%', background: 'var(--color-surface-3)' }}
            scrollWheelZoom={true}
          >
            <TileLayer attribution={tile.attribution} url={tile.url} />

            {/* Perímetro del predio — convex hull con borde grueso */}
            {perimeter && (
              <Polygon
                positions={perimeter}
                pathOptions={{
                  color: '#10b981',
                  weight: 3,
                  opacity: 0.95,
                  fillColor: '#10b981',
                  fillOpacity: 0.04,
                  dashArray: '12 6',
                }}
              />
            )}

            {/* Bloques internos del predio */}
            {shapes.polygons.map(s => (
              <Polygon
                key={s.id}
                positions={s.points}
                pathOptions={{ fillColor: s.fill, color: s.color, weight: 1.5, fillOpacity: 0.35, opacity: 0.9 }}
              >
                <Tooltip direction="center" permanent={false} sticky>
                  <strong>{s.label || `Bloque ${s.block ?? ''}`}</strong>
                </Tooltip>
              </Polygon>
            ))}

            {/* Líneas divisorias */}
            {shapes.lines.map(s => (
              <Polyline
                key={s.id}
                positions={s.points}
                pathOptions={{ color: s.color, weight: 3, opacity: 0.85, dashArray: s.block === 'linea' ? '8 4' : undefined }}
              />
            ))}

            {/* Nodos como markers custom */}
            {nodosNarrative.map(n => {
              if (n.lat == null || n.lon == null) return null
              const nv = n._narrative
              return (
                <Marker
                  key={n.nodo_id}
                  position={[n.lat, n.lon]}
                  icon={nodoIcon({ severity: nv.severity, nombre: n.nombre, online: n.online })}
                  eventHandlers={{ click: () => {} }}
                >
                  <Popup>
                    <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13, minWidth: 220 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <span style={{
                          width: 8, height: 8, borderRadius: '50%',
                          background: n.online ? SEV_COLOR[nv.severity] : SEV_COLOR.gray,
                          boxShadow: nv.severity === 'red' ? '0 0 6px rgba(239,68,68,0.6)' : 'none',
                        }} />
                        <strong style={{ color: 'var(--color-text-primary)' }}>{n.nombre}</strong>
                        {n.bloque && (
                          <span style={{
                            fontSize: 10, padding: '1px 6px', borderRadius: 4,
                            background: 'var(--color-surface-3)', color: 'var(--color-text-muted)',
                          }}>{n.bloque}</span>
                        )}
                      </div>
                      <div style={{ color: 'var(--color-text-primary)', fontWeight: 500, lineHeight: 1.35 }}>
                        {nv.headline.split(' — ').slice(1).join(' — ') || nv.headline}
                      </div>
                      {nv.why && (
                        <div style={{ marginTop: 4, color: 'var(--color-text-secondary)', fontSize: 11, lineHeight: 1.35 }}>
                          {nv.why}
                        </div>
                      )}
                      <div style={{
                        marginTop: 8, paddingTop: 6, borderTop: '1px solid var(--color-border)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      }}>
                        <span style={{ color: 'var(--color-text-muted)', fontSize: 10, fontFamily: 'monospace' }}>
                          {nv.technical}
                        </span>
                        <button
                          onClick={() => navigate(`/nodo/${n.nodo_id}`)}
                          style={{
                            fontSize: 11, padding: '3px 8px', borderRadius: 6, cursor: 'pointer',
                            background: 'var(--color-accent-green-dim)', color: 'var(--color-accent-green)',
                            border: '1px solid rgba(16,185,129,0.3)',
                          }}
                        >
                          Abrir →
                        </button>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )
            })}
          </MapContainer>

          {/* Leyenda flotante */}
          <div
            className="absolute bottom-3 right-3 rounded-xl px-3 py-2.5 z-[400]"
            style={{
              background: 'rgba(11, 13, 17, 0.85)',
              backdropFilter: 'blur(8px)',
              border: '1px solid var(--color-border)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            }}
          >
            <p className="text-[9px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
              Estado de nodos
            </p>
            <div className="space-y-1 text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
              <LegendItem color={SEV_COLOR.red} pulse label="Atender hoy" count={sevCounts.red} />
              <LegendItem color={SEV_COLOR.amber} label="Monitorear" count={sevCounts.amber} />
              <LegendItem color={SEV_COLOR.green} label="Sin pendientes" count={sevCounts.green} />
              <LegendItem color={SEV_COLOR.gray} label="Sin señal" count={nodosNarrative.filter(n => !n.online).length} />
            </div>
            <div className="mt-1.5 pt-1.5 flex items-center gap-1.5 text-[10px]" style={{ borderTop: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
              <span style={{ display: 'inline-block', width: 14, height: 0, borderTop: '2px dashed #10b981' }} />
              Perímetro
            </div>
          </div>
        </div>
      </div>

      {/* CSS de los markers custom */}
      <style>{`
        .zafra-node-icon { background: transparent !important; border: none !important; }
        .zafra-node {
          display: flex; flex-direction: column; align-items: center;
          gap: 3px; pointer-events: none;
        }
        .zafra-node-dot {
          width: 14px; height: 14px; border-radius: 50%;
          border: 2px solid #fff;
          box-shadow: 0 0 0 1px rgba(0,0,0,0.45), 0 1px 4px rgba(0,0,0,0.5);
          pointer-events: auto; cursor: pointer;
        }
        .zafra-node.red .zafra-node-dot {
          animation: zafra-pulse 1.6s ease-out infinite;
        }
        .zafra-node.offline .zafra-node-dot {
          opacity: 0.65;
          border-style: dashed;
        }
        .zafra-node-label {
          background: rgba(11,13,17,0.85);
          color: #f0f2f5;
          padding: 1px 6px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 600;
          white-space: nowrap;
          letter-spacing: 0.02em;
          pointer-events: auto;
          box-shadow: 0 1px 3px rgba(0,0,0,0.4);
          backdrop-filter: blur(2px);
        }
        @keyframes zafra-pulse {
          0%   { box-shadow: 0 0 0 1px rgba(0,0,0,0.45), 0 1px 4px rgba(0,0,0,0.5), 0 0 0 0 rgba(239,68,68,0.6); }
          70%  { box-shadow: 0 0 0 1px rgba(0,0,0,0.45), 0 1px 4px rgba(0,0,0,0.5), 0 0 0 14px rgba(239,68,68,0); }
          100% { box-shadow: 0 0 0 1px rgba(0,0,0,0.45), 0 1px 4px rgba(0,0,0,0.5), 0 0 0 0 rgba(239,68,68,0); }
        }
        .leaflet-popup-content-wrapper {
          background: var(--color-surface-1) !important;
          border: 1px solid var(--color-border) !important;
          border-radius: 12px !important;
          box-shadow: 0 8px 32px rgba(0,0,0,0.4) !important;
        }
        .leaflet-popup-content { margin: 12px 14px !important; color: var(--color-text-primary); }
        .leaflet-popup-tip { background: var(--color-surface-1) !important; box-shadow: none !important; }
        .leaflet-popup-close-button { color: var(--color-text-muted) !important; }
        .leaflet-tooltip {
          background: rgba(11,13,17,0.9) !important;
          border: 1px solid var(--color-border) !important;
          color: #f0f2f5 !important;
          font-size: 11px !important;
          padding: 3px 7px !important;
          border-radius: 4px !important;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3) !important;
        }
        .leaflet-tooltip-top:before, .leaflet-tooltip-bottom:before,
        .leaflet-tooltip-left:before, .leaflet-tooltip-right:before { display: none; }
      `}</style>

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
