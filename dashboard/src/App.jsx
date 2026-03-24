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
  Star,
  Trash2,
  MessageCircleQuestion,
} from 'lucide-react'
import OverviewView from './views/OverviewView'
import NodoView from './views/NodoView'
import FirmaView from './views/FirmaView'
import ComparativoView from './views/ComparativoView'
import ClimaView from './views/ClimaView'
import AlertasView from './views/AlertasView'
import PredioView from './views/PredioView'
import ConsultorView from './views/ConsultorView'

const tabs = [
  { path: '/predio', label: 'Predio', icon: Info },
  { path: '/', label: 'Overview', icon: LayoutDashboard },
  { path: '/nodo', label: 'Nodo detalle', icon: Radio },
  { path: '/firma', label: 'Firma hídrica', icon: Droplets },
  { path: '/comparativo', label: 'Comparativo', icon: GitCompareArrows },
  { path: '/clima', label: 'Clima', icon: CloudSun },
  {
    path: '/alertas',
    label: 'Alertas',
    icon: Bell,
    sub: [
      { path: '/alertas', label: 'Todas', icon: Bell },
      { path: '/alertas/destacadas', label: 'Destacadas', icon: Star },
      { path: '/alertas/borradas', label: 'Borradas', icon: Trash2 },
    ],
  },
  { path: '/consultor', label: 'Consultor', icon: MessageCircleQuestion },
]

export default function App() {
  const { data: predios } = useApi('/api/predios')
  const [predioId, setPredioId] = useState(1)
  const { data: alertas } = useApi(`/api/predios/${predioId}/alertas`)
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [alertasOpen, setAlertasOpen] = useState(false)

  const alertCount = alertas?.length || 0
  const hasAlerts = alertCount > 0

  useEffect(() => { setMobileOpen(false) }, [location.pathname])
  useEffect(() => {
    if (location.pathname.startsWith('/alertas')) setAlertasOpen(true)
  }, [location.pathname])

  const isTabActive = (t) => {
    if (t.path === '/') return location.pathname === '/'
    return location.pathname.startsWith(t.path)
  }

  const isSubActive = (sub) => {
    if (sub.path === '/alertas') return location.pathname === '/alertas'
    return location.pathname === sub.path
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-surface-0)' }}>
      {/* Top header */}
      <header
        className="shrink-0 z-50"
        style={{ background: 'var(--color-surface-1)', borderBottom: '1px solid var(--color-border)' }}
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
            <h1 className="text-sm font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
              AgTech
            </h1>
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
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
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
            shrink-0 overflow-y-auto overflow-x-hidden scrollbar-none z-40 flex flex-col
            fixed lg:sticky inset-y-0 left-0 top-12 lg:top-12 lg:h-[calc(100vh-48px)]
            transform transition-all duration-200 ease-out
            ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}
          style={{
            width: collapsed ? 60 : 220,
            background: 'var(--color-surface-1)',
            borderRight: '1px solid var(--color-border)',
          }}
        >
          {/* Toggle */}
          <div className="px-2 pt-3 pb-2 flex justify-center">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-2 rounded-lg transition-colors w-full flex items-center justify-center"
              style={{ color: 'var(--color-text-muted)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-3)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {collapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
            </button>
          </div>

          {/* Expanded nav */}
          {!collapsed && (
            <div className="flex flex-col flex-1">
              <div className="px-3 pb-4">
                <nav className="space-y-0.5">
                  {tabs.map(t => {
                    const active = isTabActive(t)
                    const Icon = t.icon
                    const hasSub = !!t.sub
                    const subOpen = hasSub && alertasOpen

                    return (
                      <div key={t.path}>
                        <div
                          className="flex items-center rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer"
                          style={{
                            background: active ? 'var(--color-accent-green-dim)' : 'transparent',
                            color: active ? 'var(--color-accent-green)' : 'var(--color-text-muted)',
                            border: active ? '1px solid rgba(16,185,129,0.2)' : '1px solid transparent',
                          }}
                          onMouseEnter={e => {
                            if (!active) { e.currentTarget.style.background = 'var(--color-surface-3)'; e.currentTarget.style.color = 'var(--color-text-secondary)' }
                          }}
                          onMouseLeave={e => {
                            if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-muted)' }
                          }}
                        >
                          <NavLink
                            to={t.path}
                            end={t.path === '/' || t.path === '/alertas'}
                            onClick={() => {
                              setMobileOpen(false)
                              if (hasSub) setAlertasOpen(!alertasOpen)
                            }}
                            className="flex items-center gap-3 px-3 py-2.5 flex-1"
                          >
                            <Icon size={18} />
                            <span>{t.label}</span>
                          </NavLink>
                          {hasSub && (
                            <button
                              onClick={(e) => { e.preventDefault(); setAlertasOpen(!alertasOpen) }}
                              className="pr-3 py-2.5"
                              style={{ color: 'inherit' }}
                            >
                              <ChevronsRight
                                size={14}
                                style={{
                                  transform: subOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                                  transition: 'transform 0.2s',
                                }}
                              />
                            </button>
                          )}
                        </div>

                        {/* Sub-items */}
                        {hasSub && subOpen && (
                          <div className="ml-5 mt-0.5 space-y-0.5 border-l" style={{ borderColor: 'var(--color-border)' }}>
                            {t.sub.map(sub => {
                              const subActive = isSubActive(sub)
                              const SubIcon = sub.icon
                              return (
                                <NavLink
                                  key={sub.path}
                                  to={sub.path}
                                  end
                                  onClick={() => setMobileOpen(false)}
                                  className="flex items-center gap-2.5 pl-4 pr-3 py-2 rounded-r-lg text-xs font-medium transition-all duration-200"
                                  style={{
                                    background: subActive ? 'var(--color-accent-green-dim)' : 'transparent',
                                    color: subActive ? 'var(--color-accent-green)' : 'var(--color-text-muted)',
                                  }}
                                  onMouseEnter={e => {
                                    if (!subActive) { e.currentTarget.style.background = 'var(--color-surface-3)'; e.currentTarget.style.color = 'var(--color-text-secondary)' }
                                  }}
                                  onMouseLeave={e => {
                                    if (!subActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-muted)' }
                                  }}
                                >
                                  <SubIcon size={14} />
                                  <span>{sub.label}</span>
                                </NavLink>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </nav>
              </div>

              {/* Profile — bottom */}
              <div className="mt-auto px-3 pb-4">
                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 12 }}>
                  <div
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                    style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                      style={{ background: 'var(--color-accent-green-dim)', color: 'var(--color-accent-green)', border: '1px solid rgba(16,185,129,0.2)' }}
                    >
                      ED
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>Ernest Darell</p>
                      <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Admin</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Collapsed nav */}
          {collapsed && (
            <div className="flex flex-col flex-1">
              <nav className="px-1.5 pb-4 space-y-1">
                {tabs.map(t => {
                  const active = isTabActive(t)
                  const Icon = t.icon
                  return (
                    <NavLink
                      key={t.path}
                      to={t.path}
                      end={t.path === '/' || t.path === '/alertas'}
                      className="flex items-center justify-center w-10 h-10 mx-auto rounded-xl transition-all duration-200"
                      style={{
                        background: active ? 'var(--color-accent-green-dim)' : 'transparent',
                        color: active ? 'var(--color-accent-green)' : 'var(--color-text-muted)',
                        border: active ? '1px solid rgba(16,185,129,0.2)' : '1px solid transparent',
                      }}
                      onMouseEnter={e => {
                        if (!active) { e.currentTarget.style.background = 'var(--color-surface-3)'; e.currentTarget.style.color = 'var(--color-text-secondary)' }
                      }}
                      onMouseLeave={e => {
                        if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-muted)' }
                      }}
                      title={t.label}
                    >
                      <Icon size={20} />
                    </NavLink>
                  )
                })}
              </nav>

              <div className="mt-auto pb-4 flex justify-center">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold"
                  style={{ background: 'var(--color-accent-green-dim)', color: 'var(--color-accent-green)', border: '1px solid rgba(16,185,129,0.2)' }}
                  title="Ernest Darell — Admin"
                >
                  ED
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* Main */}
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
              <Route path="/alertas" element={<AlertasView predioId={predioId} filter="todas" />} />
              <Route path="/alertas/destacadas" element={<AlertasView predioId={predioId} filter="destacadas" />} />
              <Route path="/alertas/borradas" element={<AlertasView predioId={predioId} filter="borradas" />} />
              <Route path="/consultor" element={<ConsultorView predioId={predioId} />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  )
}
