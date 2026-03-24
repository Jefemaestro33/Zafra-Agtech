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
  Leaf,
  Menu,
  X,
  ChevronsLeft,
  ChevronsRight,
  Info,
} from 'lucide-react'
import OverviewView from './views/OverviewView'
import NodoView from './views/NodoView'
import FirmaView from './views/FirmaView'
import ComparativoView from './views/ComparativoView'
import ClimaView from './views/ClimaView'
import AlertasView from './views/AlertasView'
import PredioView from './views/PredioView'

const tabs = [
  { path: '/predio', label: 'Predio', icon: Info },
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

  const alertCount = alertas?.length || 0
  const hasAlerts = alertCount > 0

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
            <button
              className="lg:hidden p-1.5 rounded-lg"
              style={{ color: 'var(--color-text-muted)' }}
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
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

        {/* Sidebar */}
        <aside
          className={`
            shrink-0 overflow-y-auto overflow-x-hidden scrollbar-none z-40
            fixed lg:static inset-y-0 left-0 top-12
            transform transition-all duration-200 ease-out
            ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}
          style={{
            width: collapsed ? 60 : 220,
            background: 'var(--color-surface-1)',
            borderRight: '1px solid var(--color-border)',
          }}
        >
          {/* Toggle button */}
          <div className="px-2 pt-3 pb-2 flex justify-center">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-2 rounded-lg transition-colors w-full flex items-center justify-center"
              style={{ color: 'var(--color-text-muted)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-3)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              title={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
            >
              {collapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
            </button>
          </div>

          {/* Navigation — expanded */}
          {!collapsed && (
            <div className="px-3 pb-4">
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
          )}

          {/* Navigation — collapsed (icon rail) */}
          {collapsed && (
            <nav className="px-1.5 pb-4 space-y-1">
              {tabs.map(t => {
                const isActive = t.path === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(t.path)
                const Icon = t.icon
                return (
                  <NavLink
                    key={t.path}
                    to={t.path}
                    className="flex items-center justify-center w-10 h-10 mx-auto rounded-xl transition-all duration-200"
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
                    title={t.label}
                  >
                    <Icon size={20} />
                  </NavLink>
                )
              })}
            </nav>
          )}
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
            <Routes>
              <Route path="/" element={<OverviewView predioId={predioId} />} />
              <Route path="/predio" element={<PredioView predioId={predioId} onChangePredio={setPredioId} predios={predios} />} />
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
