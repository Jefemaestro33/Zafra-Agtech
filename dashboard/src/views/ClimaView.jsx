import { useApi } from '../hooks/useApi'
import { ComposedChart, Bar, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Thermometer, CloudRain, Wind, Sun } from 'lucide-react'
import KpiCard from '../components/KpiCard'
import Loading from '../components/Loading'

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div
      className="rounded-xl px-4 py-3 text-xs shadow-2xl"
      style={{ background: 'var(--color-surface-3)', border: '1px solid var(--color-border-light)' }}
    >
      <p className="font-semibold mb-1.5" style={{ color: 'var(--color-text-primary)' }}>{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 py-0.5">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color || p.fill }} />
          <span style={{ color: 'var(--color-text-muted)' }}>{p.name}:</span>
          <span className="font-mono font-semibold" style={{ color: p.color || p.fill }}>
            {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function ClimaView() {
  const { data: actual, loading: l1 } = useApi('/api/clima/actual')
  const { data: historico, loading: l2 } = useApi('/api/clima/historico?dias=30')

  if (l1 || l2) return <Loading />

  const u = actual?.ultima_lectura

  const dailyMap = {}
  historico?.datos?.forEach(r => {
    const day = new Date(r.tiempo).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })
    if (!dailyMap[day]) dailyMap[day] = { day, temps: [], precips: [], etos: [], hrs: [] }
    if (r.temp_ambiente != null) dailyMap[day].temps.push(r.temp_ambiente)
    if (r.precipitacion != null) dailyMap[day].precips.push(r.precipitacion)
    if (r.eto != null) dailyMap[day].etos.push(r.eto)
    if (r.humedad_relativa != null) dailyMap[day].hrs.push(r.humedad_relativa)
  })
  const daily = Object.values(dailyMap).map(d => ({
    day: d.day,
    temp_avg: d.temps.length ? +(d.temps.reduce((a, b) => a + b, 0) / d.temps.length).toFixed(1) : null,
    precip_total: d.precips.length ? +d.precips.reduce((a, b) => a + b, 0).toFixed(1) : 0,
    eto_total: d.etos.length ? +d.etos.reduce((a, b) => a + b, 0).toFixed(2) : 0,
  }))

  const gridColor = 'rgba(42, 47, 64, 0.6)'
  const axisStyle = { fontSize: 11, fill: 'var(--color-text-muted)' }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="animate-in stagger-1">
          <KpiCard title="Temperatura actual" value={u ? `${u.temp_ambiente}°C` : '—'} icon={Thermometer} color="orange" />
        </div>
        <div className="animate-in stagger-2">
          <KpiCard title="Precipitación acum. 7d" value={u ? `${u.precip_acum_7d} mm` : '—'} icon={CloudRain} color="blue" />
        </div>
        <div className="animate-in stagger-3">
          <KpiCard title="Humedad relativa" value={u ? `${u.humedad_relativa}%` : '—'} icon={Wind} color="gray" />
        </div>
        <div className="animate-in stagger-4">
          <KpiCard title="ETo del día" value={actual ? `${actual.eto_dia_mm} mm` : '—'} icon={Sun} color="yellow" />
        </div>
      </div>

      {/* Precip + Temp chart */}
      {daily.length > 0 && (
        <div
          className="rounded-2xl overflow-hidden animate-in stagger-3"
          style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
        >
          <div className="px-5 pt-5 pb-2">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              Precipitación + Temperatura
            </h3>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Último mes · Datos reales Open-Meteo</p>
          </div>
          <div className="px-3 pb-4">
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={daily}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="day" tick={axisStyle} interval={Math.floor(daily.length / 8)} />
                <YAxis yAxisId="precip" unit=" mm" tick={axisStyle} />
                <YAxis yAxisId="temp" orientation="right" unit="°C" tick={axisStyle} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, color: 'var(--color-text-muted)' }} />
                <Bar yAxisId="precip" dataKey="precip_total" name="Precipitación (mm)" fill="#3b82f6" fillOpacity={0.7} radius={[4,4,0,0]} />
                <Line yAxisId="temp" type="monotone" dataKey="temp_avg" name="Temp promedio (°C)" stroke="#f59e0b" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ETo chart */}
      {daily.length > 0 && (
        <div
          className="rounded-2xl overflow-hidden animate-in stagger-4"
          style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
        >
          <div className="px-5 pt-5 pb-2">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              Evapotranspiración diaria (ETo)
            </h3>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Último mes · Penman-Monteith FAO-56</p>
          </div>
          <div className="px-3 pb-4">
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={daily}>
                <defs>
                  <linearGradient id="grad-eto" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="day" tick={axisStyle} interval={Math.floor(daily.length / 8)} />
                <YAxis unit=" mm" tick={axisStyle} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="eto_total" name="ETo (mm/día)" stroke="#f59e0b" fill="url(#grad-eto)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}
