import { useApi } from '../hooks/useApi'
import { MapPin, Sprout, Mountain, Ruler, Calendar, Server, Database, Cpu, Wifi, Clock, ChevronDown } from 'lucide-react'
import Loading from '../components/Loading'

function InfoCard({ icon: Icon, label, value, color = 'var(--color-accent-green)' }) {
  return (
    <div
      className="flex items-center gap-4 px-4 py-3.5 rounded-xl transition-colors"
      style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-3)'}
      onMouseLeave={e => e.currentTarget.style.background = 'var(--color-surface-2)'}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${color}15`, border: `1px solid ${color}30` }}
      >
        <Icon size={18} style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
        <p className="text-sm font-semibold mt-0.5" style={{ color: 'var(--color-text-primary)' }}>{value || '—'}</p>
      </div>
    </div>
  )
}

function StatusDot({ ok }) {
  return (
    <span
      className="w-2 h-2 rounded-full inline-block"
      style={{
        background: ok ? 'var(--color-accent-green)' : 'var(--color-accent-red)',
        boxShadow: ok ? '0 0 6px rgba(16,185,129,0.4)' : '0 0 6px rgba(239,68,68,0.4)',
      }}
    />
  )
}

export default function PredioView({ predioId, onChangePredio, predios }) {
  const { data: overview, loading } = useApi(`/api/predios/${predioId}/overview`)
  const { data: health } = useApi('/api/health')

  if (loading) return <Loading />

  const predio = overview?.predio || predios?.find(p => p.predio_id === predioId)
  const kpis = overview?.kpis

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div className="animate-in">
        <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
          Información del Predio
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
          Configuración, datos del predio y estado del sistema
        </p>
      </div>

      {/* Predio selector */}
      <div
        className="rounded-2xl p-5 animate-in stagger-1"
        style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
      >
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--color-text-muted)' }}>
          Predio activo
        </p>
        <div
          className="relative flex items-center rounded-xl"
          style={{ background: 'var(--color-surface-3)', border: '1px solid var(--color-border)' }}
        >
          <select
            value={predioId}
            onChange={e => onChangePredio(Number(e.target.value))}
            className="w-full appearance-none bg-transparent px-4 py-3 pr-10 text-sm font-semibold outline-none cursor-pointer"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {predios?.map(p => (
              <option key={p.predio_id} value={p.predio_id} style={{ background: '#1e2231', color: '#f0f2f5' }}>
                {p.nombre}
              </option>
            ))}
          </select>
          <ChevronDown size={16} className="absolute right-3 pointer-events-none" style={{ color: 'var(--color-text-muted)' }} />
        </div>
        <p className="text-[11px] mt-2" style={{ color: 'var(--color-text-muted)' }}>
          Selecciona un predio para actualizar todos los dashboards
        </p>
      </div>

      {/* Predio details */}
      <div className="animate-in stagger-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-3 px-1" style={{ color: 'var(--color-text-muted)' }}>
          Datos del predio
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <InfoCard icon={MapPin} label="Nombre" value={predio?.nombre || 'Nextipac Piloto'} />
          <InfoCard icon={Sprout} label="Cultivo" value={predio?.cultivo || 'Aguacate Hass'} color="var(--color-accent-green)" />
          <InfoCard icon={Mountain} label="Tipo de suelo" value={predio?.tipo_suelo || 'Andisol volcánico'} color="var(--color-accent-amber)" />
          <InfoCard icon={Ruler} label="Superficie" value={`${predio?.hectareas || 4} hectáreas`} color="var(--color-accent-cyan)" />
          <InfoCard icon={MapPin} label="Ubicación" value={predio?.municipio || 'Nextipac, Jalisco'} color="var(--color-accent-blue)" />
          <InfoCard icon={Calendar} label="Fecha de instalación" value={predio?.fecha_instalacion || 'Pendiente — junio 2026'} color="var(--color-accent-violet)" />
        </div>
      </div>

      {/* Quick stats from overview */}
      {kpis && (
        <div className="animate-in stagger-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-3 px-1" style={{ color: 'var(--color-text-muted)' }}>
            Resumen operativo
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <InfoCard icon={Wifi} label="Nodos online" value={`${kpis.nodos_online}/${kpis.nodos_total}`} color="var(--color-accent-green)" />
            <InfoCard icon={Sprout} label="Score Phytophthora máx." value={`${kpis.score_phytophthora_max}/100`} color={kpis.score_phytophthora_max >= 51 ? 'var(--color-accent-red)' : 'var(--color-accent-green)'} />
            <InfoCard icon={Ruler} label="Necesitan riego" value={kpis.nodos_necesitan_riego} color="var(--color-accent-amber)" />
            <InfoCard icon={Clock} label="ETo del día" value={`${kpis.eto_dia_mm} mm`} color="var(--color-accent-amber)" />
          </div>
        </div>
      )}

      {/* System status */}
      <div className="animate-in stagger-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-3 px-1" style={{ color: 'var(--color-text-muted)' }}>
          Estado del sistema
        </p>
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
        >
          {[
            { icon: Server, label: 'API Backend', value: health?.status === 'ok' ? 'Operativo' : 'Sin respuesta', ok: health?.status === 'ok' },
            { icon: Database, label: 'PostgreSQL (Railway)', value: health?.database || 'Conectado', ok: health?.status === 'ok' },
            { icon: Cpu, label: 'VPS / Hosting', value: 'Railway · Auto-deploy', ok: true },
            { icon: Wifi, label: 'Nodos IoT', value: kpis ? `${kpis.nodos_online}/${kpis.nodos_total} online` : '—', ok: kpis?.nodos_online === kpis?.nodos_total },
            { icon: Clock, label: 'Último refresh', value: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }), ok: true },
          ].map((item, i) => (
            <div
              key={i}
              className="flex items-center justify-between px-5 py-3.5 transition-colors"
              style={{ borderBottom: i < 4 ? '1px solid var(--color-border)' : 'none' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-3)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div className="flex items-center gap-3">
                <item.icon size={16} style={{ color: 'var(--color-text-muted)' }} />
                <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{item.label}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="text-sm font-mono" style={{ color: 'var(--color-text-primary)' }}>{item.value}</span>
                <StatusDot ok={item.ok} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
