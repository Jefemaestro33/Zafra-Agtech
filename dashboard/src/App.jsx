import { useState, useEffect } from 'react'
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
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
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
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  const predio = predios?.find(p => p.predio_id === predioId) || predios?.[0]
  const alertCount = alertas?.length || 0
  const hasAlerts = alertCount > 0

  // Close mobile drawer on route change
  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-surface-0)' }}>
      {/* Top header — thin */}
      <header
        className="shrink-0 z-50"
        style={{
          background: 'var(--color-surface-1)',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <div className="px-4 sm:px-6 h-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Mobile menu toggle */}
            <button
              className="lg:hidden p-1.5 rounded-lg"
              style={{ color: 'var(--color-text-muted)' }}
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            {/* Desktop sidebar toggle */}
            <button
              className="hidden lg:flex p-1.5 rounded-lg transition-colors"
              style={{ color: 'var(--color-text-muted)' }}
              onClick={() => setCollapsed(!collapsed)}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-3)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              title={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
            >
              {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--color-glow-green)', border: '1px solid var(--color-accent-green-dim)' }}
            >
              <Leaf size={16} style={{ color: 'var(--color-accent-green)' }} />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
                AgTech Nextipac
              </h1>
              <p className="text-[10px] leading-none hidden sm:block" style={{ color: 'var(--color-text-muted)' }}>
                Monitoreo inteligente
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
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
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Mobile overlay */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-40 lg:hidden"
            style={{ background: 'rgba(0,0,0,0.5)' }}
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Sidebar — expanded */}
        <aside
          className={`
            shrink-0 overflow-y-auto scrollbar-none z-40
            fixed lg:static inset-y-0 left-0 top-12
            transform transition-all duration-200 ease-out
            ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            ${collapsed ? 'lg:hidden' : ''}
          `}
          style={{
            width: 256,
            background: 'var(--color-surface-1)',
            borderRight: '1px solid var(--color-border)',
          }}
        >
          {/* Predio selector */}
          <div className="px-4 pt-5 pb-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--color-text-muted)' }}>
              Predio
            </p>
            <div
              className="relative flex items-center rounded-xl"
              style={{ background: 'var(--color-surface-3)', border: '1px solid var(--color-border)' }}
            >
              <select
                value={predioId}
                onChange={e => setPredioId(Number(e.target.value))}
                className="w-full appearance-none bg-transparent px-3 py-2.5 pr-8 text-sm font-medium outline-none cursor-pointer"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {predios?.map(p => (
                  <option key={p.predio_id} value={p.predio_id} style={{ background: '#1e2231', color: '#f0f2f5' }}>
                    {p.nombre}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 pointer-events-none" style={{ color: 'var(--color-text-muted)' }} />
            </div>
          </div>

          {/* Context info */}
          {predio && (
            <div className="px-4 pb-4">
              <div
                className="rounded-xl px-3 py-3 space-y-1.5"
                style={{ background: 'var(--color-surface-3)', border: '1px solid var(--color-border)' }}
              >
                <span
                  className="inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide"
                  style={{ background: 'var(--color-accent-green-dim)', color: 'var(--color-accent-green)' }}
                >
                  {predio.cultivo || 'Aguacate Hass'}
                </span>
                <div className="space-y-0.5">
                  {[
                    predio.tipo_suelo || 'Andisol volcánico',
                    `${predio.hectareas || 4} hectáreas`,
                    predio.municipio || 'Nextipac, Jalisco',
                  ].map((item, i) => (
                    <p key={i} className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{item}</p>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="mx-4 mb-2" style={{ borderBottom: '1px solid var(--color-border)' }} />

          {/* Navigation */}
          <div className="px-3 pb-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-2 px-1" style={{ color: 'var(--color-text-muted)' }}>
              Navegación
            </p>
            <nav className="space-y-0.5">
              {tabs.map(t => {
                const isActive = t.path === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(t.path)
                const Icon = t.icon
                return (
                  <NavLink
                    key={t.path}
                    to={t.path}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
                    style={{
                      background: isActive ? 'var(--color-accent-green-dim)' : 'transparent',
                      color: isActive ? 'var(--color-accent-green)' : 'var(--color-text-muted)',
                      border: isActive ? '1px solid rgba(16,185,129,0.2)' : '1px solid transparent',
                    }}
                    onMouseEnter={e => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'var(--color-surface-3)'
                        e.currentTarget.style.color = 'var(--color-text-secondary)'
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'transparent'
                        e.currentTarget.style.color = 'var(--color-text-muted)'
                      }
                    }}
                  >
                    <Icon size={18} />
                    <span>{t.label}</span>
                  </NavLink>
                )
              })}
            </nav>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
            <Routes>
              <Route path="/" element={<OverviewView predioId={predioId} />} />
              <Route path="/nodo" element={<NodoView predioId={predioId} />} />
              <Route path="/nodo/:id" element={<NodoView predioId={predioId} />} />
              <Route path="/firma" element={<FirmaView predioId={predioId} />} />
              <Route path="/comparativo" element={<ComparativoView predioId={predioId} />} />
              <Route path="/clima" element={<ClimaView />} />
              <Route path="/alertas" element={<AlertasView predioId={predioId} />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  )
}
