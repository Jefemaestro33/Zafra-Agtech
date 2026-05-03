const STORAGE_KEY = 'zafra_map_shapes_'

// shapes = { polygons: [...], lines: [...] }
// polygon = { id, label, color, points: [[lat,lon], ...] }
// line = { id, label, color, points: [[lat,lon], ...] }

export function loadShapes(predioId) {
  try {
    const stored = localStorage.getItem(STORAGE_KEY + predioId)
    return stored ? JSON.parse(stored) : { polygons: [], lines: [] }
  } catch { return { polygons: [], lines: [] } }
}

export function saveShapes(predioId, shapes) {
  localStorage.setItem(STORAGE_KEY + predioId, JSON.stringify(shapes))
}

export const BLOCK_COLORS = {
  1: { fill: 'rgba(16,185,129,0.15)', stroke: '#10b981', label: 'Bloque 1' },
  2: { fill: 'rgba(34,211,238,0.15)', stroke: '#22d3ee', label: 'Bloque 2' },
  3: { fill: 'rgba(245,158,11,0.15)', stroke: '#f59e0b', label: 'Bloque 3' },
  4: { fill: 'rgba(139,92,246,0.15)', stroke: '#8b5cf6', label: 'Bloque 4' },
  linea: { fill: 'transparent', stroke: '#f0f2f5', label: 'Linea divisoria' },
}
