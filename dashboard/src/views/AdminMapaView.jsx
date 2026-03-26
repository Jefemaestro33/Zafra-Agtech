import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, CircleMarker, Marker, Popup, useMapEvents } from 'react-leaflet'
import { useApi } from '../hooks/useApi'
import { getToken } from '../hooks/useAuth'
import {
  Save, Loader2, Check, X, Radio, Satellite, Map, MousePointer, GripVertical, Globe,
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
  const [tileMode, setTileMode] = useState('satelital')
  const [selectedNodo, setSelectedNodo] = useState(null)
  const [saving, setSaving] = useState(null)
  const [toast, setToast] = useState(null)
  const [drafts, setDrafts] = useState({})

  useEffect(() => {
    if (data?.nodos) {
      const d = {}
      data.nodos.forEach(n => {
        d[n.nodo_id] = { lat: n.lat, lon: n.lon }
      })
      setDrafts(d)
    }
  }, [data])

  if (loading) return <Loading />
  if (!data) return null

  const { nodos, predio } = data
  const center = [predio.lat || 20.759661, predio.lon || -103.511879]

  const showToast = (type, message) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3000)
  }

  const handleMapClick = (latlng) => {
    if (!selectedNodo) return
    setDrafts(prev => ({
      ...prev,
      [selectedNodo]: { lat: latlng.lat, lon: latlng.lng },
    }))
  }

  const handleSaveNodo = async (nodoId) => {
    const coords = drafts[nodoId]
    if (!coords) return
    setSaving(nodoId)
    try {
      const res = await fetch(`/api/nodos/${nodoId}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ lat: coords.lat, lon: coords.lon }),
      })
      if (!res.ok) throw new Error()
      showToast('success', `Nodo ${nodoId} guardado`)
      refetch()
    } catch {
      showToast('error', 'Error al guardar coordenadas')
    }
    setSaving(null)
  }

  const handleSaveAll = async () => {
    setSaving('all')
    let ok = 0
    let fail = 0
    for (const nodo of nodos) {
      const coords = drafts[nodo.nodo_id]
      if (!coords) continue
      try {
        const res = await fetch(`/api/nodos/${nodo.nodo_id}`, {
          method: 'PUT',
          headers: authHeaders(),
          body: JSON.stringify({ lat: coords.lat, lon: coords.lon }),
        })
        if (res.ok) ok++
        else fail++
      } catch { fail++ }
    }
    setSaving(null)
    if (fail === 0) showToast('success', `${ok} nodos guardados`)
    else showToast('error', `${ok} guardados, ${fail} con error`)
    refetch()
  }

  const hasChanges = (nodoId) => {
    const nodo = nodos.find(n => n.nodo_id === nodoId)
    const draft = drafts[nodoId]
    if (!nodo || !draft) return false
    return nodo.lat !== draft.lat || nodo.lon !== draft.lon
  }

  const anyChanges = nodos.some(n => hasChanges(n.nodo_id))

  return (
    <div className="space-y-4">
      {/* Toast */}
      {toast && (
        <div className="fixed top-16 right-4 z-50 animate-in">
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl"
            style={{
              background: toast.type === 'error' ? 'var(--color-glow-red)' : 'var(--color-glow-green)',
              border: `1px solid ${toast.type === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
              color: toast.type === 'error' ? 'var(--color-accent-red)' : 'var(--color-accent-green)',
            }}
          >
            {toast.type === 'error' ? <X size={16} /> : <Check size={16} />}
            <span className="text-sm font-medium">{toast.message}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between animate-in">
        <div>
          <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Posicionar nodos en el mapa
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            {selectedNodo
              ? `Haz clic en el mapa para posicionar el nodo ${nodos.find(n => n.nodo_id === selectedNodo)?.nombre || selectedNodo}`
              : 'Selecciona un nodo de la lista y haz clic en el mapa donde esta ubicado'}
          </p>
        </div>
        <div className="flex gap-2">
          {anyChanges && (
            <button
              onClick={handleSaveAll}
              disabled={saving === 'all'}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors"
              style={{ background: 'var(--color-accent-green-dim)', color: 'var(--color-accent-green)', border: '1px solid rgba(16,185,129,0.3)' }}
            >
              {saving === 'all' ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Guardar todos
            </button>
          )}
        </div>
      </div>

      {/* Node selector */}
      <div className="animate-in stagger-1">
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-2 px-1" style={{ color: 'var(--color-text-muted)' }}>
          Selecciona nodo a posicionar
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {nodos.map(n => {
            const isSelected = selectedNodo === n.nodo_id
            const changed = hasChanges(n.nodo_id)
            return (
              <button
                key={n.nodo_id}
                onClick={() => setSelectedNodo(isSelected ? null : n.nodo_id)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all duration-200"
                style={{
                  background: isSelected ? 'var(--color-accent-green-dim)' : 'var(--color-surface-2)',
                  color: isSelected ? 'var(--color-accent-green)' : 'var(--color-text-muted)',
                  border: `1px solid ${isSelected ? 'rgba(16,185,129,0.3)' : changed ? 'var(--color-accent-amber)' : 'var(--color-border)'}`,
                }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--color-surface-3)' }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'var(--color-surface-2)' }}
              >
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ background: roleColor(n.rol), boxShadow: `0 0 6px ${roleColor(n.rol)}60` }}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate" style={{ color: isSelected ? 'var(--color-accent-green)' : 'var(--color-text-primary)' }}>
                    {n.nombre}
                  </p>
                  <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                    {n.rol} · B{n.bloque}
                  </p>
                </div>
                {changed && (
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: 'var(--color-accent-amber)' }} title="Sin guardar" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Instructions */}
      {selectedNodo && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl animate-in"
          style={{ background: 'var(--color-glow-green)', border: '1px solid rgba(16,185,129,0.2)' }}
        >
          <MousePointer size={16} style={{ color: 'var(--color-accent-green)' }} />
          <p className="text-xs" style={{ color: 'var(--color-accent-green)' }}>
            Haz clic en el mapa donde esta el <strong>{nodos.find(n => n.nodo_id === selectedNodo)?.nombre}</strong>. El marcador se movera a esa posicion.
          </p>
        </div>
      )}

      {/* Map */}
      <div
        className="rounded-2xl overflow-hidden animate-in stagger-2"
        style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
      >
        <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {predio.nombre || 'Predio'}
          </h3>
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
        <div style={{ height: 500, cursor: selectedNodo ? 'crosshair' : 'grab' }}>
          <MapContainer center={center} zoom={18} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
            <TileLayer key={tileMode} attribution={TILES[tileMode].attribution} url={TILES[tileMode].url} />
            <MapClickHandler onMapClick={handleMapClick} active={!!selectedNodo} />
            {nodos.map(n => {
              const coords = drafts[n.nodo_id]
              if (!coords?.lat || !coords?.lon) return null
              const isSelected = selectedNodo === n.nodo_id
              const changed = hasChanges(n.nodo_id)
              return (
                <CircleMarker
                  key={n.nodo_id}
                  center={[coords.lat, coords.lon]}
                  radius={isSelected ? 12 : 9}
                  pathOptions={{
                    fillColor: isSelected ? '#10b981' : roleColor(n.rol),
                    color: isSelected ? '#fff' : changed ? '#f59e0b' : 'rgba(255,255,255,0.6)',
                    weight: isSelected ? 3 : 2,
                    fillOpacity: 0.9,
                  }}
                  eventHandlers={{
                    click: () => setSelectedNodo(n.nodo_id),
                  }}
                >
                  <Popup>
                    <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13 }}>
                      <strong>{n.nombre}</strong>
                      <div style={{ marginTop: 4, fontSize: 11, color: '#666' }}>
                        {n.rol} · Bloque {n.bloque}
                      </div>
                      <div style={{ marginTop: 4, fontSize: 11, fontFamily: 'monospace' }}>
                        {coords.lat.toFixed(6)}, {coords.lon.toFixed(6)}
                      </div>
                      {changed && (
                        <div style={{ marginTop: 6 }}>
                          <span style={{ color: '#f59e0b', fontSize: 11, fontWeight: 600 }}>Sin guardar</span>
                        </div>
                      )}
                    </div>
                  </Popup>
                </CircleMarker>
              )
            })}
          </MapContainer>
        </div>
      </div>

      {/* Coordinates table */}
      <div
        className="rounded-2xl overflow-hidden animate-in stagger-3"
        style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
      >
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
                  <tr
                    key={n.nodo_id}
                    className="transition-colors"
                    style={{ borderBottom: '1px solid var(--color-border)', background: selectedNodo === n.nodo_id ? 'var(--color-accent-green-dim)' : 'transparent' }}
                    onMouseEnter={e => { if (selectedNodo !== n.nodo_id) e.currentTarget.style.background = 'var(--color-surface-3)' }}
                    onMouseLeave={e => { if (selectedNodo !== n.nodo_id) e.currentTarget.style.background = 'transparent' }}
                  >
                    <td className="px-5 py-3">
                      <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{n.nombre}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-[11px] px-2 py-0.5 rounded-md"
                        style={{
                          background: n.rol === 'tratamiento' ? 'var(--color-accent-green-dim)' : 'var(--color-surface-4)',
                          color: n.rol === 'tratamiento' ? 'var(--color-accent-green)' : 'var(--color-text-muted)',
                        }}>{n.rol}</span>
                    </td>
                    <td className="px-5 py-3" style={{ color: 'var(--color-text-secondary)' }}>{n.bloque}</td>
                    <td className="px-5 py-3 font-mono text-[12px]" style={{ color: changed ? 'var(--color-accent-amber)' : 'var(--color-text-secondary)' }}>
                      {coords?.lat?.toFixed(6) || '—'}
                    </td>
                    <td className="px-5 py-3 font-mono text-[12px]" style={{ color: changed ? 'var(--color-accent-amber)' : 'var(--color-text-secondary)' }}>
                      {coords?.lon?.toFixed(6) || '—'}
                    </td>
                    <td className="px-5 py-3">
                      {changed && (
                        <button
                          onClick={() => handleSaveNodo(n.nodo_id)}
                          disabled={saving === n.nodo_id}
                          className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg font-medium"
                          style={{ background: 'var(--color-accent-green-dim)', color: 'var(--color-accent-green)', border: '1px solid rgba(16,185,129,0.3)' }}
                        >
                          {saving === n.nodo_id ? <Loader2 size={10} className="animate-spin" /> : <Save size={10} />}
                          Guardar
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
    </div>
  )
}
