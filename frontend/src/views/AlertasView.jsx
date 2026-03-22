import { useState } from 'react'
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

function alertEmoji(tipo) {
  if (tipo?.includes('phytophthora')) return '🔴'
  if (tipo?.includes('riego')) return '🟠'
  if (tipo?.includes('offline')) return '🔵'
  if (tipo?.includes('bateria')) return '🟡'
  return '⚪'
}

function formatDatos(datos) {
  if (!datos) return null
  if (typeof datos === 'string') {
    try { datos = JSON.parse(datos) } catch { return datos }
  }
  const entries = Object.entries(datos).filter(([k]) =>
    !['score_total', 'nivel', 'umbral', 'diagnostico_ia'].includes(k)
  )
  return entries.slice(0, 6).map(([k, v]) => {
    if (typeof v === 'object' && v !== null) {
      return `${k.replace(/_/g, ' ')}: ${v.valor ?? JSON.stringify(v)} (+${v.puntos ?? 0}pts)`
    }
    return `${k.replace(/_/g, ' ')}: ${typeof v === 'number' ? (v.toFixed ? v.toFixed(2) : v) : v}`
  }).join(' · ')
}

function getDiagnostico(datos) {
  if (!datos) return null
  if (typeof datos === 'string') {
    try { datos = JSON.parse(datos) } catch { return null }
  }
  return datos.diagnostico_ia || null
}

function DiagnosticoSection({ diag }) {
  if (!diag) return null
  return (
    <div className="mt-3 space-y-2">
      {diag.diagnostico && (
        <div className="px-3 py-2 bg-red-50 rounded-lg border border-red-100">
          <p className="text-xs font-semibold text-red-700 mb-1">DIAGNÓSTICO</p>
          <p className="text-sm text-gray-800">{diag.diagnostico}</p>
        </div>
      )}
      {diag.recomendacion_1 && (
        <div className="px-3 py-2 bg-green-50 rounded-lg border border-green-100">
          <p className="text-xs font-semibold text-green-700 mb-1">RECOMENDACIÓN 1</p>
          <p className="text-sm text-gray-800">{diag.recomendacion_1}</p>
        </div>
      )}
      {diag.recomendacion_2 && (
        <div className="px-3 py-2 bg-green-50 rounded-lg border border-green-100">
          <p className="text-xs font-semibold text-green-700 mb-1">RECOMENDACIÓN 2</p>
          <p className="text-sm text-gray-800">{diag.recomendacion_2}</p>
        </div>
      )}
      {diag.referencia && (
        <div className="px-3 py-2 bg-blue-50 rounded-lg border border-blue-100">
          <p className="text-xs font-semibold text-blue-700 mb-1">REFERENCIA</p>
          <p className="text-sm text-gray-700 italic">{diag.referencia}</p>
        </div>
      )}
      {diag.raw && !diag.diagnostico && (
        <div className="px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{diag.raw}</p>
        </div>
      )}
      {diag.raw_response && !diag.diagnostico && !diag.raw && (
        <div className="px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{diag.raw_response}</p>
        </div>
      )}
    </div>
  )
}

function AlertaCard({ a, onDiagnosticoGenerated }) {
  const [loadingDiag, setLoadingDiag] = useState(false)
  const [loadingReporte, setLoadingReporte] = useState(false)
  const [reporte, setReporte] = useState(null)
  const [localDiag, setLocalDiag] = useState(null)
  const [copied, setCopied] = useState(false)

  const diag = localDiag || getDiagnostico(a.datos)

  const handleGenerarDiagnostico = async () => {
    setLoadingDiag(true)
    try {
      const r = await fetch(`/api/alertas/${a.id}/diagnostico`, { method: 'POST' })
      const data = await r.json()
      setLocalDiag(data.diagnostico)
      if (onDiagnosticoGenerated) onDiagnosticoGenerated()
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingDiag(false)
    }
  }

  const handleEnviarSalvador = () => {
    const d = diag || {}
    const emoji = alertEmoji(a.tipo)
    const text = [
      `${emoji} *${alertTitle(a.tipo)}* — ${a.nombre || `Nodo ${a.nodo_id}`}`,
      '',
      d.diagnostico ? `*DIAGNÓSTICO:* ${d.diagnostico}` : '',
      d.recomendacion_1 ? `*RECOMENDACIÓN 1:* ${d.recomendacion_1}` : '',
      d.recomendacion_2 ? `*RECOMENDACIÓN 2:* ${d.recomendacion_2}` : '',
      d.referencia ? `_Ref: ${d.referencia}_` : '',
      '',
      '_Diagnóstico generado por IA. Verificar en campo._',
    ].filter(Boolean).join('\n')

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleGenerarReporte = async () => {
    setLoadingReporte(true)
    try {
      const r = await fetch('/api/reportes/agricultor?predio_id=1', { method: 'POST' })
      const data = await r.json()
      setReporte(data.reporte)
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingReporte(false)
    }
  }

  const handleCopiarReporte = () => {
    if (reporte) {
      navigator.clipboard.writeText(reporte).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
    }
  }

  return (
    <div className={`bg-white rounded-xl border border-gray-200 border-l-4 ${alertBorder(a.tipo)} p-5`}>
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-gray-800">{alertTitle(a.tipo)}</h3>
            <span className="text-xs text-gray-400">{a.nombre || `Nodo ${a.nodo_id}`}</span>
            <span className="text-xs text-gray-400">·</span>
            <span className="text-xs text-gray-400">{timeAgo(a.tiempo)}</span>
          </div>
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{formatDatos(a.datos)}</p>

          {/* Diagnóstico IA */}
          {diag ? (
            <DiagnosticoSection diag={diag} />
          ) : (
            <div className="mt-3">
              <button
                onClick={handleGenerarDiagnostico}
                disabled={loadingDiag}
                className="text-xs px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {loadingDiag ? (
                  <span className="flex items-center gap-1.5">
                    <span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
                    Generando diagnóstico...
                  </span>
                ) : (
                  'Generar diagnóstico IA'
                )}
              </button>
            </div>
          )}

          {/* Reporte agricultor */}
          {reporte && (
            <div className="mt-3 px-3 py-2 bg-yellow-50 rounded-lg border border-yellow-100">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold text-yellow-700">REPORTE PARA AGRICULTOR</p>
                <button onClick={handleCopiarReporte} className="text-xs text-yellow-600 hover:text-yellow-800">
                  {copied ? 'Copiado' : 'Copiar'}
                </button>
              </div>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{reporte}</p>
            </div>
          )}
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={handleEnviarSalvador}
          disabled={!diag}
          className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
            diag
              ? 'border-green-200 text-green-700 bg-green-50 hover:bg-green-100'
              : 'border-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          {copied ? 'Copiado al clipboard' : 'Enviar a Salvador'}
        </button>
        <button
          onClick={handleGenerarReporte}
          disabled={loadingReporte}
          className="text-xs px-3 py-1.5 rounded-lg border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors disabled:opacity-50"
        >
          {loadingReporte ? 'Generando...' : 'Generar reporte'}
        </button>
      </div>
    </div>
  )
}

export default function AlertasView({ predioId }) {
  const { data: alertas, loading, refetch } = useApi(`/api/predios/${predioId}/alertas`)

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
            <AlertaCard key={a.id} a={a} onDiagnosticoGenerated={refetch} />
          ))}
        </div>
      )}
    </div>
  )
}
