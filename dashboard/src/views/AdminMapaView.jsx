import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, Polygon, Polyline, useMapEvents } from 'react-leaflet'
import { useApi } from '../hooks/useApi'
import { getToken } from '../hooks/useAuth'
import { loadShapes, saveShapes, BLOCK_COLORS } from '../hooks/useMapShapes'
import {
  Save, Loader2, Check, X, Satellite, Map as MapIcon, MousePointer, Globe,
  PenTool, Trash2, CornerDownLeft, Square, Minus,
} from 'lucide-react'
import Loading from '../components/Loading'

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

function authHeaders() {
  const token = getToken()
  return token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' }
}

function roleColor(rol) {
  return rol === 'tratamiento' ? '#10b981' : '#6b7280'
}

function MapClickHandler({ onMapClick, active }) {
  useMapEvents({
    click(e) {
      if (active) onMapClick(e.latlng)
    },
  })
  return null
}

export default function AdminMapaView({ predioId }) {
  const { data, loading, refetch } = useApi(`/api/predios/${predioId}/overview`)
  const [tileMode, setTileMode] = useState('esri')

  // Node positioning
  const [selectedNodo, setSelectedNodo] = useState(null)
  const [saving, setSaving] = useState(null)
  const [toast, setToast] = useState(null)
  const [drafts, setDrafts] = useState({})

  // Drawing mode
  const [mode, setMode] = useState('nodos') // 'nodos' | 'polygon' | 'line'
  const [shapes, setShapes] = useState({ polygons: [], lines: [] })
  const [drawingBlock, setDrawingBlock] = useState(null) // 1-4 or 'linea'
  const [currentPoints, setCurrentPoints] = useState([])

  useEffect(() => {
    if (data?.nodos) {
      const d = {}
      data.nodos.forEach(n => { d[n.nodo_id] = { lat: n.lat, lon: n.lon } })
      setDrafts(d)
    }
  }, [data])

  useEffect(() => {
    setShapes(loadShapes(predioId))
  }, [predioId])

  if (loading) return <Loading />
  if (!data) return null

  const { nodos, predio } = data
  const nodosConCoords = nodos.filter(n => n.lat && n.lon)
  const center = nodosConCoords.length > 0
    ? [nodosConCoords.reduce((s, n) => s + n.lat, 0) / nodosConCoords.length,
       nodosConCoords.reduce((s, n) => s + n.lon, 0) / nodosConCoords.length]
    : [predio.lat || 20.759661, predio.lon || -103.511879]

  const showToast = (type, message) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3000)
  }

  // ── Node handlers ──
  const handleMapClick = (latlng) => {
    if (mode === 'nodos' && selectedNodo) {
      setDrafts(prev => ({ ...prev, [selectedNodo]: { lat: latlng.lat, lon: latlng.lng } }))
    } else if ((mode === 'polygon' || mode === 'line') && drawingBlock) {
      setCurrentPoints(prev => [...prev, [latlng.lat, latlng.lng]])
    }
  }

  const handleSaveNodo = async (nodoId) => {
    const coords = drafts[nodoId]
    if (!coords) return
    setSaving(nodoId)
    try {
      const res = await fetch(`/api/nodos/${nodoId}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ lat: coords.lat, lon: coords.lon }) })
      if (!res.ok) throw new Error()
      showToast('success', `Nodo ${nodoId} guardado`)
      refetch()
    } catch { showToast('error', 'Error al guardar') }
    setSaving(null)
  }

  const handleSaveAll = async () => {
    setSaving('all')
    let ok = 0, fail = 0
    for (const nodo of nodos) {
      const coords = drafts[nodo.nodo_id]
      if (!coords) continue
      try {
        const res = await fetch(`/api/nodos/${nodo.nodo_id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ lat: coords.lat, lon: coords.lon }) })
        if (res.ok) ok++; else fail++
      } catch { fail++ }
    }
    setSaving(null)
    showToast(fail === 0 ? 'success' : 'error', fail === 0 ? `${ok} nodos guardados` : `${ok} guardados, ${fail} con error`)
    refetch()
  }

  const hasChanges = (nodoId) => {
    const nodo = nodos.find(n => n.nodo_id === nodoId)
    const draft = drafts[nodoId]
    if (!nodo || !draft) return false
    return nodo.lat !== draft.lat || nodo.lon !== draft.lon
  }

  const anyNodeChanges = nodos.some(n => hasChanges(n.nodo_id))

  // ── Drawing handlers ──
  const handleFinishShape = () => {
    if (currentPoints.length < 2) return
    const blockConfig = BLOCK_COLORS[drawingBlock] || BLOCK_COLORS['linea']
    const newShape = {
      id: Date.now().toString(),
      label: blockConfig.label,
      block: drawingBlock,
      color: blockConfig.stroke,
      fill: blockConfig.fill,
      points: currentPoints,
    }
    const updated = { ...shapes }
    if (mode === 'polygon' && currentPoints.length >= 3) {
      updated.polygons = [...updated.polygons, newShape]
    } else {
      updated.lines = [...updated.lines, newShape]
    }
    setShapes(updated)
    saveShapes(predioId, updated)
    setCurrentPoints([])
    showToast('success', `${mode === 'polygon' ? 'Poligono' : 'Linea'} guardado`)
  }

  const handleUndoPoint = () => {
    setCurrentPoints(prev => prev.slice(0, -1))
  }

  const handleCancelDraw = () => {
    setCurrentPoints([])
  }

  const handleDeleteShape = (type, id) => {
    const updated = { ...shapes }
    if (type === 'polygon') updated.polygons = updated.polygons.filter(s => s.id !== id)
    else updated.lines = updated.lines.filter(s => s.id !== id)
    setShapes(updated)
    saveShapes(predioId, updated)
    showToast('success', 'Forma eliminada')
  }

  const handleClearAll = () => {
    const updated = { polygons: [], lines: [] }
    setShapes(updated)
    saveShapes(predioId, updated)
    showToast('success', 'Todas las formas eliminadas')
  }

  const isDrawing = (mode === 'polygon' || mode === 'line') && drawingBlock
  const isActive = (mode === 'nodos' && selectedNodo) || isDrawing

  return (
    <div className="space-y-4">
      {/* Toast */}
      {toast && (
        <div className="fixed top-16 right-4 z-50 animate-in">
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl"
            style={{ background: toast.type === 'error' ? 'var(--color-glow-red)' : 'var(--color-glow-green)', border: `1px solid ${toast.type === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`, color: toast.type === 'error' ? 'var(--color-accent-red)' : 'var(--color-accent-green)' }}>
            {toast.type === 'error' ? <X size={16} /> : <Check size={16} />}
            <span className="text-sm font-medium">{toast.message}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between animate-in">
        <div>
          <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>Posicionar nodos y dibujar cuadrantes</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            {mode === 'nodos' ? (selectedNodo ? `Haz clic en el mapa para posicionar el nodo ${nodos.find(n => n.nodo_id === selectedNodo)?.nombre || ''}` : 'Selecciona un nodo o cambia a modo dibujo')
              : isDrawing ? `Haz clic para agregar puntos al ${mode === 'polygon' ? 'poligono' : 'linea'} del ${BLOCK_COLORS[drawingBlock]?.label || 'bloque'}`
              : 'Selecciona un bloque y haz clic en el mapa para dibujar'}
          </p>
        </div>
        {anyNodeChanges && mode === 'nodos' && (
          <button onClick={handleSaveAll} disabled={saving === 'all'}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold"
            style={{ background: 'var(--color-accent-green-dim)', color: 'var(--color-accent-green)', border: '1px solid rgba(16,185,129,0.3)' }}>
            {saving === 'all' ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Guardar todos
          </button>
        )}
      </div>

      {/* Mode selector */}
      <div className="animate-in stagger-1">
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-2 px-1" style={{ color: 'var(--color-text-muted)' }}>Modo</p>
        <div className="flex gap-2">
          {[
            { key: 'nodos', label: 'Posicionar nodos', Icon: MousePointer },
            { key: 'polygon', label: 'Dibujar poligono', Icon: Square },
            { key: 'line', label: 'Dibujar linea', Icon: Minus },
          ].map(m => (
            <button key={m.key} onClick={() => { setMode(m.key); setSelectedNodo(null); setDrawingBlock(null); setCurrentPoints([]) }}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all"
              style={{
                background: mode === m.key ? 'var(--color-accent-green-dim)' : 'var(--color-surface-2)',
                color: mode === m.key ? 'var(--color-accent-green)' : 'var(--color-text-muted)',
                border: `1px solid ${mode === m.key ? 'rgba(16,185,129,0.3)' : 'var(--color-border)'}`,
              }}
              onMouseEnter={e => { if (mode !== m.key) e.currentTarget.style.background = 'var(--color-surface-3)' }}
              onMouseLeave={e => { if (mode !== m.key) e.currentTarget.style.background = 'var(--color-surface-2)' }}>
              <m.Icon size={16} /> {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Node selector (nodos mode) */}
      {mode === 'nodos' && (
        <div className="animate-in">
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-2 px-1" style={{ color: 'var(--color-text-muted)' }}>Selecciona nodo</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {nodos.map(n => {
              const isSelected = selectedNodo === n.nodo_id
              const changed = hasChanges(n.nodo_id)
              return (
                <button key={n.nodo_id} onClick={() => setSelectedNodo(isSelected ? null : n.nodo_id)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all"
                  style={{
                    background: isSelected ? 'var(--color-accent-green-dim)' : 'var(--color-surface-2)',
                    border: `1px solid ${isSelected ? 'rgba(16,185,129,0.3)' : changed ? 'var(--color-accent-amber)' : 'var(--color-border)'}`,
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--color-surface-3)' }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'var(--color-surface-2)' }}>
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ background: roleColor(n.rol), boxShadow: `0 0 6px ${roleColor(n.rol)}60` }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate" style={{ color: isSelected ? 'var(--color-accent-green)' : 'var(--color-text-primary)' }}>{n.nombre}</p>
                    <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{n.rol} · B{n.bloque}</p>
                  </div>
                  {changed && <div className="w-2 h-2 rounded-full shrink-0" style={{ background: 'var(--color-accent-amber)' }} />}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Block selector (draw mode) */}
      {(mode === 'polygon' || mode === 'line') && (
        <div className="animate-in">
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-2 px-1" style={{ color: 'var(--color-text-muted)' }}>
            {mode === 'polygon' ? 'Selecciona bloque para dibujar poligono' : 'Selecciona tipo de linea'}
          </p>
          <div className="flex gap-2 flex-wrap">
            {(mode === 'polygon'
              ? [{ key: 1 }, { key: 2 }, { key: 3 }, { key: 4 }]
              : [{ key: 1 }, { key: 2 }, { key: 3 }, { key: 4 }, { key: 'linea' }]
            ).map(b => {
              const config = BLOCK_COLORS[b.key]
              const isSelected = drawingBlock === b.key
              return (
                <button key={b.key} onClick={() => { setDrawingBlock(isSelected ? null : b.key); setCurrentPoints([]) }}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all"
                  style={{
                    background: isSelected ? `${config.stroke}20` : 'var(--color-surface-2)',
                    color: isSelected ? config.stroke : 'var(--color-text-muted)',
                    border: `1px solid ${isSelected ? `${config.stroke}50` : 'var(--color-border)'}`,
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--color-surface-3)' }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'var(--color-surface-2)' }}>
                  <div className="w-3 h-3 rounded-full" style={{ background: config.stroke }} />
                  {config.label}
                </button>
              )
            })}
          </div>

          {/* Drawing controls */}
          {isDrawing && (
            <div className="flex items-center gap-2 mt-3">
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {currentPoints.length} punto{currentPoints.length !== 1 ? 's' : ''}
              </span>
              {currentPoints.length > 0 && (
                <button onClick={handleUndoPoint} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg"
                  style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}>
                  <CornerDownLeft size={12} /> Deshacer
                </button>
              )}
              {((mode === 'polygon' && currentPoints.length >= 3) || (mode === 'line' && currentPoints.length >= 2)) && (
                <button onClick={handleFinishShape} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg"
                  style={{ background: 'var(--color-accent-green-dim)', color: 'var(--color-accent-green)', border: '1px solid rgba(16,185,129,0.3)' }}>
                  <Check size={12} /> Terminar {mode === 'polygon' ? 'poligono' : 'linea'}
                </button>
              )}
              {currentPoints.length > 0 && (
                <button onClick={handleCancelDraw} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg"
                  style={{ background: 'var(--color-surface-3)', color: 'var(--color-accent-red)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <X size={12} /> Cancelar
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Map */}
      <div className="rounded-2xl overflow-hidden animate-in stagger-2" style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
        <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{predio.nombre || 'Predio'}</h3>
          <div className="flex gap-1">
            {[
              { key: 'esri', label: 'Esri', Icon: Satellite },
              { key: 'google', label: 'Google', Icon: Globe },
              { key: 'mapa', label: 'Mapa', Icon: MapIcon },
            ].map(m => (
              <button key={m.key} onClick={() => setTileMode(m.key)}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all"
                style={{
                  background: tileMode === m.key ? 'var(--color-accent-green-dim)' : 'var(--color-surface-3)',
                  color: tileMode === m.key ? 'var(--color-accent-green)' : 'var(--color-text-muted)',
                  border: `1px solid ${tileMode === m.key ? 'rgba(16,185,129,0.3)' : 'var(--color-border)'}`,
                }}>
                <m.Icon size={12} /> {m.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ height: 500, cursor: isActive ? 'crosshair' : 'grab' }}>
          <MapContainer center={center} zoom={18} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
            <TileLayer key={tileMode} attribution={TILES[tileMode].attribution} url={TILES[tileMode].url} />
            <MapClickHandler onMapClick={handleMapClick} active={isActive} />

            {/* Saved polygons */}
            {shapes.polygons.map(s => (
              <Polygon key={s.id} positions={s.points} pathOptions={{ fillColor: s.fill, color: s.color, weight: 2, fillOpacity: 0.3 }}>
                <Popup><div style={{ fontFamily: 'Plus Jakarta Sans', fontSize: 13 }}>
                  <strong>{s.label}</strong>
                  <div style={{ marginTop: 6 }}>
                    <button onClick={() => handleDeleteShape('polygon', s.id)} style={{ color: '#ef4444', fontSize: 12, cursor: 'pointer', background: 'none', border: 'none' }}>Eliminar poligono</button>
                  </div>
                </div></Popup>
              </Polygon>
            ))}

            {/* Saved lines */}
            {shapes.lines.map(s => (
              <Polyline key={s.id} positions={s.points} pathOptions={{ color: s.color, weight: 3, dashArray: s.block === 'linea' ? '8 4' : undefined }}>
                <Popup><div style={{ fontFamily: 'Plus Jakarta Sans', fontSize: 13 }}>
                  <strong>{s.label}</strong>
                  <div style={{ marginTop: 6 }}>
                    <button onClick={() => handleDeleteShape('line', s.id)} style={{ color: '#ef4444', fontSize: 12, cursor: 'pointer', background: 'none', border: 'none' }}>Eliminar linea</button>
                  </div>
                </div></Popup>
              </Polyline>
            ))}

            {/* Current drawing preview */}
            {currentPoints.length >= 2 && mode === 'polygon' && (
              <Polygon positions={currentPoints} pathOptions={{ fillColor: BLOCK_COLORS[drawingBlock]?.fill || 'rgba(255,255,255,0.1)', color: BLOCK_COLORS[drawingBlock]?.stroke || '#fff', weight: 2, fillOpacity: 0.3, dashArray: '4 4' }} />
            )}
            {currentPoints.length >= 2 && mode === 'line' && (
              <Polyline positions={currentPoints} pathOptions={{ color: BLOCK_COLORS[drawingBlock]?.stroke || '#fff', weight: 3, dashArray: '4 4' }} />
            )}
            {/* Drawing point markers */}
            {currentPoints.map((p, i) => (
              <CircleMarker key={`draw-${i}`} center={p} radius={4}
                pathOptions={{ fillColor: BLOCK_COLORS[drawingBlock]?.stroke || '#fff', color: '#fff', weight: 1, fillOpacity: 1 }} />
            ))}

            {/* Node markers */}
            {nodos.map(n => {
              const coords = drafts[n.nodo_id]
              if (!coords?.lat || !coords?.lon) return null
              const isSelected = selectedNodo === n.nodo_id
              const changed = hasChanges(n.nodo_id)
              return (
                <CircleMarker key={n.nodo_id} center={[coords.lat, coords.lon]}
                  radius={isSelected ? 12 : 9}
                  pathOptions={{
                    fillColor: isSelected ? '#10b981' : roleColor(n.rol),
                    color: isSelected ? '#fff' : changed ? '#f59e0b' : 'rgba(255,255,255,0.6)',
                    weight: isSelected ? 3 : 2, fillOpacity: 0.9,
                  }}
                  eventHandlers={{ click: () => { if (mode === 'nodos') setSelectedNodo(n.nodo_id) } }}>
                  <Popup>
                    <div style={{ fontFamily: 'Plus Jakarta Sans', fontSize: 13 }}>
                      <strong>{n.nombre}</strong>
                      <div style={{ marginTop: 4, fontSize: 11, color: '#666' }}>{n.rol} · Bloque {n.bloque}</div>
                      <div style={{ marginTop: 4, fontSize: 11, fontFamily: 'monospace' }}>{coords.lat.toFixed(6)}, {coords.lon.toFixed(6)}</div>
                      {changed && <div style={{ marginTop: 6 }}><span style={{ color: '#f59e0b', fontSize: 11, fontWeight: 600 }}>Sin guardar</span></div>}
                    </div>
                  </Popup>
                </CircleMarker>
              )
            })}
          </MapContainer>
        </div>
      </div>

      {/* Saved shapes list */}
      {(shapes.polygons.length > 0 || shapes.lines.length > 0) && (
        <div className="rounded-2xl overflow-hidden animate-in stagger-3" style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
          <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              Formas guardadas ({shapes.polygons.length + shapes.lines.length})
            </h3>
            <button onClick={handleClearAll} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors"
              style={{ color: 'var(--color-text-muted)', background: 'var(--color-surface-3)', border: '1px solid var(--color-border)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-glow-red)'; e.currentTarget.style.color = 'var(--color-accent-red)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-surface-3)'; e.currentTarget.style.color = 'var(--color-text-muted)' }}>
              <Trash2 size={12} /> Borrar todas
            </button>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
            {shapes.polygons.map(s => (
              <div key={s.id} className="flex items-center justify-between px-5 py-3 transition-colors"
                onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-3)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <div className="flex items-center gap-3">
                  <Square size={14} style={{ color: s.color }} />
                  <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{s.label}</span>
                  <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{s.points.length} vertices</span>
                </div>
                <button onClick={() => handleDeleteShape('polygon', s.id)} className="p-1.5 rounded-lg transition-colors"
                  style={{ color: 'var(--color-text-muted)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-glow-red)'; e.currentTarget.style.color = 'var(--color-accent-red)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-muted)' }}>
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
            {shapes.lines.map(s => (
              <div key={s.id} className="flex items-center justify-between px-5 py-3 transition-colors"
                onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-3)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <div className="flex items-center gap-3">
                  <Minus size={14} style={{ color: s.color }} />
                  <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{s.label}</span>
                  <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{s.points.length} puntos</span>
                </div>
                <button onClick={() => handleDeleteShape('line', s.id)} className="p-1.5 rounded-lg transition-colors"
                  style={{ color: 'var(--color-text-muted)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-glow-red)'; e.currentTarget.style.color = 'var(--color-accent-red)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-muted)' }}>
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Coordinates table */}
      {mode === 'nodos' && (
        <div className="rounded-2xl overflow-hidden animate-in stagger-3" style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
          <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Coordenadas de nodos</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  {['Nodo', 'Rol', 'Bloque', 'Latitud', 'Longitud', ''].map(h => (
                    <th key={h} className="px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-left"
                      style={{ color: 'var(--color-text-muted)', background: 'var(--color-surface-3)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {nodos.map(n => {
                  const coords = drafts[n.nodo_id]
                  const changed = hasChanges(n.nodo_id)
                  return (
                    <tr key={n.nodo_id} className="transition-colors"
                      style={{ borderBottom: '1px solid var(--color-border)', background: selectedNodo === n.nodo_id ? 'var(--color-accent-green-dim)' : 'transparent' }}
                      onMouseEnter={e => { if (selectedNodo !== n.nodo_id) e.currentTarget.style.background = 'var(--color-surface-3)' }}
                      onMouseLeave={e => { if (selectedNodo !== n.nodo_id) e.currentTarget.style.background = 'transparent' }}>
                      <td className="px-5 py-3"><span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{n.nombre}</span></td>
                      <td className="px-5 py-3">
                        <span className="text-[11px] px-2 py-0.5 rounded-md"
                          style={{ background: n.rol === 'tratamiento' ? 'var(--color-accent-green-dim)' : 'var(--color-surface-4)', color: n.rol === 'tratamiento' ? 'var(--color-accent-green)' : 'var(--color-text-muted)' }}>
                          {n.rol}
                        </span>
                      </td>
                      <td className="px-5 py-3" style={{ color: 'var(--color-text-secondary)' }}>{n.bloque}</td>
                      <td className="px-5 py-3 font-mono text-[12px]" style={{ color: changed ? 'var(--color-accent-amber)' : 'var(--color-text-secondary)' }}>{coords?.lat?.toFixed(6) || '—'}</td>
                      <td className="px-5 py-3 font-mono text-[12px]" style={{ color: changed ? 'var(--color-accent-amber)' : 'var(--color-text-secondary)' }}>{coords?.lon?.toFixed(6) || '—'}</td>
                      <td className="px-5 py-3">
                        {changed && (
                          <button onClick={() => handleSaveNodo(n.nodo_id)} disabled={saving === n.nodo_id}
                            className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg font-medium"
                            style={{ background: 'var(--color-accent-green-dim)', color: 'var(--color-accent-green)', border: '1px solid rgba(16,185,129,0.3)' }}>
                            {saving === n.nodo_id ? <Loader2 size={10} className="animate-spin" /> : <Save size={10} />} Guardar
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
