import { useState } from 'react'
import { Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useApi } from './hooks/useApi'
import {
  LayoutDashboard,
  Radio,
  Droplets,
  GitCompareArrows,
  CloudSun,
  BrainCircuit,
  Bell,
  ChevronDown,
  Leaf,
} from 'lucide-react'
import OverviewView from './views/OverviewView'
import NodoView from './views/NodoView'
import FirmaView from './views/FirmaView'
import ComparativoView from './views/ComparativoView'
import ClimaView from './views/ClimaView'
import AlertasView from './views/AlertasView'

const tabs = [
  { path: '/', label: 'Overview', icon: LayoutDashboard },
  { path: '/nodo', label: 'Nodo detalle', icon: Radio },
  { path: '/firma', label: 'Firma hídrica', icon: Droplets },
  { path: '/comparativo', label: 'Comparativo', icon: GitCompareArrows },
  { path: '/clima', label: 'Clima', icon: CloudSun },
  { path: '/alertas', label: 'Alertas IA', icon: BrainCircuit },
]

export default function App() {
  const { data: predios } = useApi('/api/predios')
  const [predioId, setPredioId] = useState(1)
  const { data: alertas } = useApi(`/api/predios/${predioId}/alertas`)
  const navigate = useNavigate()
  const location = useLocation()

  const predio = predios?.find(p => p.predio_id === predioId) || predios?.[0]
  const alertCount = alertas?.length || 0
  const hasAlerts = alertCount > 0

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-surface-0)' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-50"
        style={{
          background: 'linear-gradient(180deg, var(--color-surface-1) 0%, var(--color-surface-2) 100%)',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        {/* Row 1 — Brand + Actions */}
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--color-glow-green)', border: '1px solid var(--color-accent-green-dim)' }}
            >
              <Leaf size={18} style={{ color: 'var(--color-accent-green)' }} />
            </div>
            <div>
              <h1 className="text-[15px] font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
                AgTech Nextipac
              </h1>
              <p className="text-[11px] leading-none" style={{ color: 'var(--color-text-muted)' }}>
                Monitoreo inteligente
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Predio selector */}
            <div
              className="relative flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm cursor-pointer"
              style={{
                background: 'var(--color-surface-3)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-secondary)',
              }}
            >
              <select
                value={predioId}
                onChange={e => setPredioId(Number(e.target.value))}
                className="appearance-none bg-transparent outline-none text-sm pr-5 cursor-pointer"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {predios?.map(p => (
                  <option key={p.predio_id} value={p.predio_id} style={{ background: '#1e2231', color: '#f0f2f5' }}>
                    {p.nombre}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 pointer-events-none" style={{ color: 'var(--color-text-muted)' }} />
            </div>

            {/* Alerts bell */}
            <button
              onClick={() => navigate('/alertas')}
              className="relative p-2 rounded-lg transition-colors"
              style={{ color: hasAlerts ? 'var(--color-accent-amber)' : 'var(--color-text-muted)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-3)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <Bell size={18} />
              {hasAlerts && (
                <span
                  className="absolute -top-0.5 -right-0.5 text-[10px] font-bold rounded-full w-[18px] h-[18px] flex items-center justify-center"
                  style={{ background: 'var(--color-accent-red)', color: '#fff' }}
                >
                  {alertCount}
                </span>
              )}
            </button>

            {/* Avatar */}
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
              style={{
                background: 'var(--color-surface-4)',
                color: 'var(--color-text-secondary)',
                border: '1px solid var(--color-border)',
              }}
            >
              ED
            </div>
          </div>
        </div>

        {/* Row 2 — Navigation tabs */}
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
          <div className="flex gap-1 overflow-x-auto scrollbar-none -mb-px">
            {tabs.map(t => {
              const isActive = t.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(t.path)
              const Icon = t.icon
              return (
                <NavLink
                  key={t.path}
                  to={t.path}
                  className="group flex items-center gap-2 px-3.5 py-2.5 text-sm font-medium whitespace-nowrap transition-all duration-200 border-b-2 shrink-0"
                  style={{
                    borderColor: isActive ? 'var(--color-accent-green)' : 'transparent',
                    color: isActive ? 'var(--color-accent-green)' : 'var(--color-text-muted)',
                  }}
                  onMouseEnter={e => {
                    if (!isActive) {
                      e.currentTarget.style.color = 'var(--color-text-secondary)'
                      e.currentTarget.style.background = 'var(--color-surface-3)'
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isActive) {
                      e.currentTarget.style.color = 'var(--color-text-muted)'
                      e.currentTarget.style.background = 'transparent'
                    }
                  }}
                >
                  <Icon size={16} />
                  <span className="hidden sm:inline">{t.label}</span>
                </NavLink>
              )
            })}
          </div>
        </div>
      </header>

      {/* Predio context bar */}
      {predio && (
        <div
          className="border-b"
          style={{
            background: 'var(--color-surface-1)',
            borderColor: 'var(--color-border)',
          }}
        >
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-2 flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
              <span
                className="px-2 py-0.5 rounded-md text-[11px] font-medium"
                style={{ background: 'var(--color-accent-green-dim)', color: 'var(--color-accent-green)' }}
              >
                {predio.cultivo || 'Aguacate Hass'}
              </span>
              <span>·</span>
              <span>{predio.tipo_suelo || 'Andisol volcánico'}</span>
              <span>·</span>
              <span>{predio.hectareas || 4} ha</span>
              <span className="hidden sm:inline">·</span>
              <span className="hidden sm:inline">{predio.municipio || 'Nextipac, Jalisco'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
        <Routes>
          <Route path="/" element={<OverviewView predioId={predioId} />} />
          <Route path="/nodo" element={<NodoView predioId={predioId} />} />
          <Route path="/nodo/:id" element={<NodoView predioId={predioId} />} />
          <Route path="/firma" element={<FirmaView predioId={predioId} />} />
          <Route path="/comparativo" element={<ComparativoView predioId={predioId} />} />
          <Route path="/clima" element={<ClimaView />} />
          <Route path="/alertas" element={<AlertasView predioId={predioId} />} />
        </Routes>
      </main>
    </div>
  )
}
