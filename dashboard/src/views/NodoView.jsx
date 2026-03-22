import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useApi, apiFetch } from '../hooks/useApi'
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Droplets, Thermometer, Zap, BatteryMedium, ChevronDown } from 'lucide-react'
import KpiCard from '../components/KpiCard'
import ScoreBadge from '../components/ScoreBadge'
import Loading from '../components/Loading'

const CHART_COLORS = {
  h10: '#22d3ee',
  h20: '#8b5cf6',
  h30: '#3b82f6',
  temp: '#f59e0b',
  ec: '#f97316',
}

function ChartCard({ title, subtitle, children, className = '' }) {
  return (
    <div
      className={`rounded-2xl overflow-hidden ${className}`}
      style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
    >
      <div className="px-5 pt-5 pb-2">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{title}</h3>
        {subtitle && <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{subtitle}</p>}
      </div>
      <div className="px-3 pb-4">
        {children}
      </div>
    </div>
  )
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div
      className="rounded-xl px-4 py-3 text-xs shadow-2xl"
      style={{
        background: 'var(--color-surface-3)',
        border: '1px solid var(--color-border-light)',
      }}
    >
      <p className="font-semibold mb-1.5" style={{ color: 'var(--color-text-primary)' }}>{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 py-0.5">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span style={{ color: 'var(--color-text-muted)' }}>{p.name}:</span>
          <span className="font-mono font-semibold" style={{ color: p.color }}>
            {typeof p.value === 'number' ? p.value.toFixed(2) : p.value}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function NodoView({ predioId }) {
  const { id } = useParams()
  const [nodoId, setNodoId] = useState(Number(id) || 1)
  const { data: nodos } = useApi(`/api/predios/${predioId}/nodos`)
  const { data: detalle, loading } = useApi(`/api/nodos/${nodoId}`, [nodoId])
  const [lecturas24h, setLecturas24h] = useState([])
  const [lecturas7d, setLecturas7d] = useState([])

  useEffect(() => { if (id) setNodoId(Number(id)) }, [id])

  useEffect(() => {
    apiFetch(`/api/nodos/${nodoId}/lecturas?intervalo=5min`)
      .then(d => setLecturas24h(d.datos || []))
      .catch(() => {})
    apiFetch(`/api/nodos/${nodoId}/lecturas?desde=2026-06-24&hasta=2026-07-01&intervalo=1h`)
      .then(d => setLecturas7d(d.datos || []))
      .catch(() => {})
  }, [nodoId])

  if (loading) return <Loading />
  if (!detalle) return null

  const u = detalle.ultima_lectura
  const sc = detalle.score_phytophthora

  const fmt24 = lecturas24h.slice(-288).map(r => ({
    ...r,
    t: new Date(r.tiempo).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
  }))

  const fmt7d = lecturas7d.map(r => ({
    ...r,
    t: new Date(r.tiempo).toLocaleDateString('es-MX', { month: 'short', day: 'numeric', hour: '2-digit' }),
  }))

  const axisStyle = { fontSize: 11, fill: 'var(--color-text-muted)' }
  const gridColor = 'rgba(42, 47, 64, 0.6)'

  return (
    <div className="space-y-6">
      {/* Selector */}
      <div className="flex items-center gap-4 animate-in">
        <div
          className="relative flex items-center"
          style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 12 }}
        >
          <select
            value={nodoId}
            onChange={e => setNodoId(Number(e.target.value))}
            className="appearance-none bg-transparent px-4 py-2.5 pr-9 text-sm font-medium outline-none cursor-pointer"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {nodos?.map(n => (
              <option key={n.nodo_id} value={n.nodo_id} style={{ background: '#1e2231', color: '#f0f2f5' }}>
                {n.nombre} ({n.rol})
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-3 pointer-events-none" style={{ color: 'var(--color-text-muted)' }} />
        </div>
        {sc && <ScoreBadge score={sc.score} nivel={sc.nivel} size="lg" />}
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="animate-in stagger-1">
          <KpiCard title="h10 (10cm)" value={u ? `${u.h10_avg?.toFixed(1)}%` : '—'} icon={Droplets} color="blue" />
        </div>
        <div className="animate-in stagger-2">
          <KpiCard title="h20 (20cm)" value={u ? `${u.h20_avg?.toFixed(1)}%` : '—'} icon={Droplets} color="blue" />
        </div>
        <div className="animate-in stagger-3">
          <KpiCard title="h30 (30cm)" value={u ? `${u.h30_avg?.toFixed(1)}%` : '—'} icon={Droplets} color="blue" />
        </div>
        <div className="animate-in stagger-4">
          <KpiCard title="Temp 20cm" value={u ? `${u.t20?.toFixed(1)}°C` : '—'} icon={Thermometer} color="orange" />
        </div>
        <div className="animate-in stagger-5">
          <KpiCard title="EC 30cm" value={u ? `${u.ec30?.toFixed(2)} dS/m` : '—'} icon={Zap} color="yellow" />
        </div>
        <div className="animate-in stagger-6">
          <KpiCard title="Batería" value={u ? `${u.bateria?.toFixed(2)}V` : '—'} icon={BatteryMedium} color={u && u.bateria < 3.3 ? 'red' : 'green'} />
        </div>
      </div>

      {/* Chart: Humidity 24h */}
      {fmt24.length > 0 && (
        <ChartCard title="Humedad por profundidad" subtitle="Últimas 24 horas · Intervalo 5 min" className="animate-in stagger-3">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={fmt24}>
              <defs>
                <linearGradient id="grad-h10" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_COLORS.h10} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={CHART_COLORS.h10} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="grad-h20" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_COLORS.h20} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={CHART_COLORS.h20} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="grad-h30" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_COLORS.h30} stopOpacity={0.15} />
                  <stop offset="100%" stopColor={CHART_COLORS.h30} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="t" tick={axisStyle} interval={Math.floor(fmt24.length / 8)} />
              <YAxis unit="%" tick={axisStyle} domain={[15, 55]} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, color: 'var(--color-text-muted)' }} />
              <Area type="monotone" dataKey="h10_avg" name="10cm" stroke={CHART_COLORS.h10} fill="url(#grad-h10)" strokeWidth={2} />
              <Area type="monotone" dataKey="h20_avg" name="20cm" stroke={CHART_COLORS.h20} fill="url(#grad-h20)" strokeWidth={2} />
              <Area type="monotone" dataKey="h30_avg" name="30cm" stroke={CHART_COLORS.h30} fill="url(#grad-h30)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Chart: Temp + EC 24h */}
      {fmt24.length > 0 && (
        <ChartCard title="Temperatura + Conductividad eléctrica" subtitle="Últimas 24 horas" className="animate-in stagger-4">
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={fmt24}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="t" tick={axisStyle} interval={Math.floor(fmt24.length / 8)} />
              <YAxis yAxisId="t" unit="°C" tick={axisStyle} />
              <YAxis yAxisId="ec" orientation="right" unit=" dS/m" tick={axisStyle} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, color: 'var(--color-text-muted)' }} />
              <Line yAxisId="t" type="monotone" dataKey="t20" name="Temp 20cm" stroke={CHART_COLORS.temp} strokeWidth={2} dot={false} />
              <Line yAxisId="ec" type="monotone" dataKey="ec30" name="EC 30cm" stroke={CHART_COLORS.ec} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Chart: h10 7 days */}
      {fmt7d.length > 0 && (
        <ChartCard title="Humedad 10cm" subtitle="Últimos 7 días · Intervalo 1 hora" className="animate-in stagger-5">
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={fmt7d}>
              <defs>
                <linearGradient id="grad-h10-7d" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_COLORS.h10} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={CHART_COLORS.h10} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="t" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} interval={Math.floor(fmt7d.length / 7)} />
              <YAxis unit="%" tick={axisStyle} domain={[15, 55]} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="h10_avg" name="h10 avg" stroke={CHART_COLORS.h10} fill="url(#grad-h10-7d)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Score breakdown */}
      {sc && (
        <div
          className="rounded-2xl overflow-hidden animate-in stagger-6"
          style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
        >
          <div className="px-5 pt-5 pb-3">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              Score Phytophthora — Desglose
            </h3>
          </div>
          <div className="px-5 pb-5">
            <div className="space-y-1">
              {Object.entries(sc.desglose)
                .filter(([k]) => !['score_total', 'nivel'].includes(k))
                .map(([key, d]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between py-2.5 px-3 rounded-lg transition-colors"
                    style={{ borderBottom: '1px solid var(--color-border)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-3)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                      {key.replace(/_/g, ' ')}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-mono" style={{ color: 'var(--color-text-primary)' }}>
                        {typeof d.valor === 'number' ? d.valor.toFixed(2) : d.valor}
                      </span>
                      <span
                        className="text-xs font-bold px-2.5 py-0.5 rounded-md"
                        style={{
                          background: d.puntos > 0 ? 'var(--color-glow-red)' : 'var(--color-surface-4)',
                          color: d.puntos > 0 ? 'var(--color-accent-red)' : 'var(--color-text-muted)',
                          border: `1px solid ${d.puntos > 0 ? 'rgba(239,68,68,0.2)' : 'var(--color-border)'}`,
                        }}
                      >
                        +{d.puntos}
                      </span>
                    </div>
                  </div>
                ))}
              <div className="flex items-center justify-between pt-4 px-3">
                <span className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>Total</span>
                <ScoreBadge score={sc.score} nivel={sc.nivel} size="lg" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
