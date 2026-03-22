import { useApi } from '../hooks/useApi'
import KpiCard from '../components/KpiCard'
import EmptyState from '../components/EmptyState'
import Loading from '../components/Loading'

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `hace ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  const days = Math.floor(hrs / 24)
  return `hace ${days}d`
}

function alertBorder(tipo) {
  if (tipo?.includes('phytophthora')) return 'border-l-red-500'
  if (tipo?.includes('riego')) return 'border-l-orange-500'
  if (tipo?.includes('offline')) return 'border-l-blue-500'
  if (tipo?.includes('bateria')) return 'border-l-yellow-500'
  return 'border-l-gray-300'
}

function alertTitle(tipo) {
  const map = {
    alerta_phytophthora: 'Alerta Phytophthora',
    necesita_riego: 'Necesita riego',
    offline: 'Sensor offline',
    bateria_baja: 'Batería baja',
  }
  return map[tipo] || tipo
}

function formatDatos(datos) {
  if (!datos) return null
  if (typeof datos === 'string') {
    try { datos = JSON.parse(datos) } catch { return datos }
  }
  const entries = Object.entries(datos).filter(([k]) => !['score_total', 'nivel', 'umbral'].includes(k))
  return entries.slice(0, 6).map(([k, v]) => {
    if (typeof v === 'object' && v !== null) {
      return `${k.replace(/_/g, ' ')}: ${v.valor ?? JSON.stringify(v)} (+${v.puntos ?? 0}pts)`
    }
    return `${k.replace(/_/g, ' ')}: ${typeof v === 'number' ? (v.toFixed ? v.toFixed(2) : v) : v}`
  }).join(' · ')
}

export default function AlertasView({ predioId }) {
  const { data: alertas, loading } = useApi(`/api/predios/${predioId}/alertas`)

  if (loading) return <Loading />

  const hoy = new Date().toDateString()
  const semana = Date.now() - 7 * 86400000
  const alertasHoy = alertas?.filter(a => new Date(a.tiempo).toDateString() === hoy).length || 0
  const alertasSemana = alertas?.filter(a => new Date(a.tiempo).getTime() > semana).length || 0

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard title="Alertas activas" value={alertas?.length || 0} icon="🔔" color={alertas?.length > 0 ? 'red' : 'green'} />
        <KpiCard title="Alertas hoy" value={alertasHoy} icon="📅" color="blue" />
        <KpiCard title="Alertas esta semana" value={alertasSemana} icon="📊" color="yellow" />
      </div>

      {/* Alert list */}
      {(!alertas || alertas.length === 0) ? (
        <EmptyState
          icon="✅"
          title="Sin alertas activas"
          description="Todos los nodos operan dentro de parámetros normales. Las alertas se generan automáticamente cuando el motor de reglas detecta condiciones de riesgo."
        />
      ) : (
        <div className="space-y-3">
          {alertas.map(a => (
            <div key={a.id} className={`bg-white rounded-xl border border-gray-200 border-l-4 ${alertBorder(a.tipo)} p-5`}>
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-gray-800">{alertTitle(a.tipo)}</h3>
                    <span className="text-xs text-gray-400">{a.nombre || `Nodo ${a.nodo_id}`}</span>
                    <span className="text-xs text-gray-400">·</span>
                    <span className="text-xs text-gray-400">{timeAgo(a.tiempo)}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{formatDatos(a.datos)}</p>
                  <div className="mt-3 px-3 py-2 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                    <p className="text-xs text-gray-400 italic">
                      Diagnóstico IA pendiente — se activará en siguiente versión
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button disabled className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-400 cursor-not-allowed">
                  Enviar a Salvador
                </button>
                <button disabled className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-400 cursor-not-allowed">
                  Generar reporte
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
