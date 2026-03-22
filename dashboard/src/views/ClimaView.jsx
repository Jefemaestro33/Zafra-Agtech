import { useApi } from '../hooks/useApi'
import { ComposedChart, Bar, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import KpiCard from '../components/KpiCard'
import Loading from '../components/Loading'

export default function ClimaView() {
  const { data: actual, loading: l1 } = useApi('/api/clima/actual')
  const { data: historico, loading: l2 } = useApi('/api/clima/historico?dias=30')

  if (l1 || l2) return <Loading />

  const u = actual?.ultima_lectura

  // Aggregate historico by day for charts
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

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Temperatura actual" value={u ? `${u.temp_ambiente}°C` : '—'} icon="🌡️" color="orange" />
        <KpiCard title="Precipitación acum. 7d" value={u ? `${u.precip_acum_7d} mm` : '—'} icon="🌧️" color="blue" />
        <KpiCard title="Humedad relativa" value={u ? `${u.humedad_relativa}%` : '—'} icon="💨" color="gray" />
        <KpiCard title="ETo del día" value={actual ? `${actual.eto_dia_mm} mm` : '—'} icon="☀️" color="yellow" />
      </div>

      {/* Precip + Temp chart */}
      {daily.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Precipitación + Temperatura — Último mes</h3>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={daily}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} interval={Math.floor(daily.length / 8)} />
              <YAxis yAxisId="precip" unit=" mm" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="temp" orientation="right" unit="°C" tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar yAxisId="precip" dataKey="precip_total" name="Precipitación (mm)" fill="#3b82f6" fillOpacity={0.7} radius={[4,4,0,0]} />
              <Line yAxisId="temp" type="monotone" dataKey="temp_avg" name="Temp promedio (°C)" stroke="#f97316" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ETo chart */}
      {daily.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Evapotranspiración diaria (ETo) — Último mes</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={daily}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} interval={Math.floor(daily.length / 8)} />
              <YAxis unit=" mm" tick={{ fontSize: 11 }} />
              <Tooltip />
              <Area type="monotone" dataKey="eto_total" name="ETo (mm/día)" stroke="#eab308" fill="#eab308" fillOpacity={0.2} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
