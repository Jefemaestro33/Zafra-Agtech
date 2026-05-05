import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, ChevronDown, RefreshCw } from 'lucide-react'
import { useApi } from '../hooks/useApi'
import { useAuth } from '../hooks/useAuth'
import { narrate, severityRank, saludo } from '../lib/nodeNarrative'
import Loading from '../components/Loading'

const STRIPE = {
  red: 'var(--color-accent-red)',
  amber: 'var(--color-accent-amber)',
  green: 'var(--color-accent-green)',
}

function Renglon({ nodo, narrative, onClick }) {
  const stripe = STRIPE[narrative.severity]
  const isVerde = narrative.severity === 'green'

  return (
    <button
      onClick={onClick}
      className="w-full text-left transition-colors hover-surface"
      style={{
        borderLeft: `3px solid ${stripe}`,
        background: 'var(--color-surface-1)',
        borderTop: '1px solid var(--color-border)',
      }}
    >
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-3">
            <h3
              className="text-sm font-semibold truncate"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {narrative.headline}
            </h3>
            <span
              className="text-[11px] font-mono shrink-0"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {narrative.technical}
            </span>
          </div>
          {narrative.why && !isVerde && (
            <p
              className="text-[12px] mt-1 leading-snug"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {narrative.why}
            </p>
          )}
        </div>
        <ChevronRight
          size={16}
          className="shrink-0 mt-0.5"
          style={{ color: 'var(--color-text-muted)' }}
        />
      </div>
    </button>
  )
}

export default function HoyView({ predioId }) {
  const { user } = useAuth()
  const { data, loading, refetch } = useApi(`/api/predios/${predioId}/overview`)
  const [verVerdes, setVerVerdes] = useState(false)
  const navigate = useNavigate()

  const narrativas = useMemo(() => {
    if (!data) return []
    return data.nodos
      .map(n => ({ nodo: n, n: narrate(n) }))
      .sort((a, b) => {
        const r = severityRank(a.n.severity) - severityRank(b.n.severity)
        if (r !== 0) return r
        return (b.nodo.score_phytophthora || 0) - (a.nodo.score_phytophthora || 0)
      })
  }, [data])

  if (loading) return <Loading />
  if (!data) return null

  const pendientes = narrativas.filter(({ n }) => n.severity !== 'green')
  const verdes = narrativas.filter(({ n }) => n.severity === 'green')
  const nombrePredio = data.predio.nombre
  const primerNombre = user?.nombre?.split(' ')[0] || ''

  const heroTitulo = pendientes.length === 0
    ? `Todo tranquilo en ${nombrePredio}`
    : pendientes.length === 1
      ? `1 nodo por atender hoy`
      : `${pendientes.length} nodos por atender hoy`

  const heroSubtitulo = pendientes.length === 0
    ? 'Sin pendientes — todos los sensores reportan bien.'
    : `en ${nombrePredio}`

  return (
    <div className="space-y-6 animate-in">
      {/* Hero */}
      <div className="flex items-start justify-between">
        <div>
          <p
            className="text-sm mb-3"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {saludo()}{primerNombre ? `, ${primerNombre}` : ''}
          </p>
          <h1
            className="text-5xl sm:text-6xl tracking-tight font-semibold leading-none"
            style={{
              color: pendientes.length === 0
                ? 'var(--color-accent-green)'
                : 'var(--color-text-primary)',
            }}
          >
            {heroTitulo}
          </h1>
          <p
            className="text-sm mt-3"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {heroSubtitulo}
          </p>
        </div>
        <button
          onClick={refetch}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors"
          style={{
            background: 'var(--color-surface-2)',
            color: 'var(--color-text-primary)',
            border: '1px solid var(--color-border)',
          }}
          title="Refrescar"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Refrescar
        </button>
      </div>

      {/* Pendientes */}
      {pendientes.length > 0 && (
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'var(--color-surface-1)',
            border: '1px solid var(--color-border)',
          }}
        >
          {pendientes.map(({ nodo, n }) => (
            <Renglon
              key={nodo.nodo_id}
              nodo={nodo}
              narrative={n}
              onClick={() => navigate(`/nodo/${nodo.nodo_id}`)}
            />
          ))}
        </div>
      )}

      {/* Verdes (colapsable) */}
      {verdes.length > 0 && (
        <div>
          <button
            onClick={() => setVerVerdes(v => !v)}
            className="flex items-center gap-2 text-xs px-2 py-1.5 rounded-lg transition-colors hover-surface"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {verVerdes ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            {verdes.length === 1
              ? '1 nodo sin pendientes'
              : `${verdes.length} nodos sin pendientes`}
          </button>
          {verVerdes && (
            <div
              className="mt-2 rounded-2xl overflow-hidden"
              style={{
                background: 'var(--color-surface-1)',
                border: '1px solid var(--color-border)',
              }}
            >
              {verdes.map(({ nodo, n }) => (
                <Renglon
                  key={nodo.nodo_id}
                  nodo={nodo}
                  narrative={n}
                  onClick={() => navigate(`/nodo/${nodo.nodo_id}`)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty state — nodos = 0 */}
      {narrativas.length === 0 && (
        <div
          className="rounded-2xl px-6 py-12 text-center"
          style={{
            background: 'var(--color-surface-1)',
            border: '1px solid var(--color-border)',
          }}
        >
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Este predio no tiene nodos configurados todavía.
          </p>
        </div>
      )}
    </div>
  )
}
