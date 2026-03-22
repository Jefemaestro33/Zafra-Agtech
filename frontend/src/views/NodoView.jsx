import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useApi, apiFetch } from '../hooks/useApi'
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import KpiCard from '../components/KpiCard'
import ScoreBadge from '../components/ScoreBadge'
import Loading from '../components/Loading'

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

  return (
    <div className="space-y-6">
      {/* Selector */}
      <div className="flex items-center gap-4">
        <select
          value={nodoId}
          onChange={e => setNodoId(Number(e.target.value))}
          className="border border-gray-200 rounded-lg px-4 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          {nodos?.map(n => (
            <option key={n.nodo_id} value={n.nodo_id}>{n.nombre} ({n.rol})</option>
          ))}
        </select>
        {sc && <ScoreBadge score={sc.score} nivel={sc.nivel} size="lg" />}
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard title="h10 (10cm)" value={u ? `${u.h10_avg?.toFixed(1)}%` : '—'} icon="💧" color="blue" />
        <KpiCard title="h20 (20cm)" value={u ? `${u.h20_avg?.toFixed(1)}%` : '—'} icon="💧" color="blue" />
        <KpiCard title="h30 (30cm)" value={u ? `${u.h30_avg?.toFixed(1)}%` : '—'} icon="💧" color="blue" />
        <KpiCard title="t20 (20cm)" value={u ? `${u.t20?.toFixed(1)}°C` : '—'} icon="🌡️" color="orange" />
        <KpiCard title="EC 30cm" value={u ? `${u.ec30?.toFixed(2)} dS/m` : '—'} icon="⚡" color="yellow" />
        <KpiCard title="Batería" value={u ? `${u.bateria?.toFixed(2)}V` : '—'} icon="🔋" color={u && u.bateria < 3.3 ? 'red' : 'green'} />
      </div>

      {/* Chart: Humidity 24h */}
      {fmt24.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Humedad por profundidad — Últimas 24h</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={fmt24}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="t" tick={{ fontSize: 11 }} interval={Math.floor(fmt24.length / 8)} />
              <YAxis unit="%" tick={{ fontSize: 11 }} domain={[15, 55]} />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="h10_avg" name="10cm" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} strokeWidth={2} />
              <Area type="monotone" dataKey="h20_avg" name="20cm" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.1} strokeWidth={2} />
              <Area type="monotone" dataKey="h30_avg" name="30cm" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.08} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Chart: Temp + EC 24h */}
      {fmt24.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Temperatura + EC — Últimas 24h</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={fmt24}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="t" tick={{ fontSize: 11 }} interval={Math.floor(fmt24.length / 8)} />
              <YAxis yAxisId="t" unit="°C" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="ec" orientation="right" unit=" dS/m" tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line yAxisId="t" type="monotone" dataKey="t20" name="Temp 20cm" stroke="#f97316" strokeWidth={2} dot={false} />
              <Line yAxisId="ec" type="monotone" dataKey="ec30" name="EC 30cm" stroke="#eab308" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Chart: h10 7 days */}
      {fmt7d.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Humedad 10cm — Últimos 7 días (por hora)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={fmt7d}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="t" tick={{ fontSize: 10 }} interval={Math.floor(fmt7d.length / 7)} />
              <YAxis unit="%" tick={{ fontSize: 11 }} domain={[15, 55]} />
              <Tooltip />
              <Area type="monotone" dataKey="h10_avg" name="h10 avg" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Score breakdown */}
      {sc && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Score Phytophthora — Desglose</h3>
          <div className="space-y-2">
            {Object.entries(sc.desglose)
              .filter(([k]) => !['score_total', 'nivel'].includes(k))
              .map(([key, d]) => (
                <div key={key} className="flex items-center justify-between py-2 border-b border-gray-50">
                  <span className="text-sm text-gray-600">{key.replace(/_/g, ' ')}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono text-gray-800">
                      {typeof d.valor === 'number' ? d.valor.toFixed(2) : d.valor}
                    </span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${d.puntos > 0 ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-400'}`}>
                      +{d.puntos}
                    </span>
                  </div>
                </div>
              ))}
            <div className="flex items-center justify-between pt-3">
              <span className="text-sm font-bold text-gray-700">Total</span>
              <ScoreBadge score={sc.score} nivel={sc.nivel} size="lg" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
