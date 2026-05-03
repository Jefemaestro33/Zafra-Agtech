import { useState, useEffect, lazy, Suspense } from 'react'
import { createPortal } from 'react-dom'
import { Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useApi } from './hooks/useApi'
import { useAuth } from './hooks/useAuth'
import ErrorBoundary from './components/ErrorBoundary'
import ProfileMenu from './components/ProfileMenu'
import {
  LayoutDashboard, Radio, Droplets, GitCompareArrows, CloudSun, BrainCircuit,
  Bell, Leaf, Menu, X, ChevronsLeft, ChevronsRight, Info, Star, Trash2,
  MessageCircleQuestion, Users, UserCog, History, Download, Receipt, DollarSign,
  Settings, BellRing, Plug, DatabaseBackup, BookOpen, LogOut, ChevronUp, PlusCircle, FilePenLine, MapPinned,
  Loader2,
} from 'lucide-react'
import Loading from './components/Loading'

// Lazy-loaded views for code splitting
const OverviewView = lazy(() => import('./views/OverviewView'))
const NodoView = lazy(() => import('./views/NodoView'))
const FirmaView = lazy(() => import('./views/FirmaView'))
const ComparativoView = lazy(() => import('./views/ComparativoView'))
const ClimaView = lazy(() => import('./views/ClimaView'))
const AlertasView = lazy(() => import('./views/AlertasView'))
const PredioView = lazy(() => import('./views/PredioView'))
const ConsultorView = lazy(() => import('./views/ConsultorView'))
const ProximamenteView = lazy(() => import('./views/ProximamenteView'))
const NuevoPredioView = lazy(() => import('./views/NuevoPredioView'))
const AdminPrediosView = lazy(() => import('./views/AdminPrediosView'))
const LoginView = lazy(() => import('./views/LoginView'))
const ConfigAlertasView = lazy(() => import('./views/ConfigAlertasView'))
const ConfigNotificacionesView = lazy(() => import('./views/ConfigNotificacionesView'))
const ConfigIntegracionesView = lazy(() => import('./views/ConfigIntegracionesView'))
const ConfigRespaldosView = lazy(() => import('./views/ConfigRespaldosView'))
const AdminMapaView = lazy(() => import('./views/AdminMapaView'))
const ExportView = lazy(() => import('./views/ExportView'))

const tabs = [
  { path: '/predio', label: 'Predio', icon: Info },
  { path: '/', label: 'Overview', icon: LayoutDashboard },
  { path: '/nodo', label: 'Nodo detalle', icon: Radio },
  { path: '/firma', label: 'Firma hídrica', icon: Droplets },
  { path: '/comparativo', label: 'Comparativo', icon: GitCompareArrows },
  { path: '/clima', label: 'Clima', icon: CloudSun },
  {
    path: '/alertas', label: 'Alertas', icon: Bell,
    sub: [
      { path: '/alertas', label: 'Todas', icon: Bell },
      { path: '/alertas/destacadas', label: 'Destacadas', icon: Star },
      { path: '/alertas/borradas', label: 'Borradas', icon: Trash2 },
    ],
  },
  { path: '/consultor', label: 'Consultor', icon: MessageCircleQuestion },
  { type: 'section', label: 'Administrador' },
  { path: '/admin/predios', label: 'Gestionar predios', icon: FilePenLine },
  { path: '/agronomos', label: 'Agrónomos', icon: Users },
  { path: '/usuarios', label: 'Usuarios', icon: UserCog },
  { path: '/historial', label: 'Historial', icon: History },
  { path: '/exportar', label: 'Exportar datos', icon: Download },
  { path: '/contabilidad', label: 'Contabilidad', icon: Receipt },
  { path: '/finanzas', label: 'Finanzas', icon: DollarSign },
]

export default function App() {
  const { user, loading: authLoading, login, logout } = useAuth()
  const { data: predios } = useApi(user ? '/api/predios' : null)
  const [predioId, setPredioId] = useState(() => {
    const saved = localStorage.getItem('zafra_predio_id')
    return saved ? parseInt(saved, 10) : 1
  })

  // Validate predioId against actual predios
  useEffect(() => {
    if (predios && predios.length > 0) {
      const exists = predios.some(p => p.predio_id === predioId)
      if (!exists) setPredioId(predios[0].predio_id)
    }
  }, [predios, predioId])

  useEffect(() => {
    localStorage.setItem('zafra_predio_id', String(predioId))
  }, [predioId])
  const { data: alertas } = useApi(user ? `/api/predios/${predioId}/alertas` : null)
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [alertasOpen, setAlertasOpen] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)

  const alertCount = alertas?.length || 0
  const hasAlerts = alertCount > 0

  useEffect(() => { setMobileOpen(false); setProfileMenuOpen(false) }, [location.pathname])
  useEffect(() => { if (location.pathname.startsWith('/alertas')) setAlertasOpen(true) }, [location.pathname])

  const handleLogout = () => {
    logout()
    window.location.replace('/')
  }

  // Observador (cuenta YC, etc.) no ve la sección "Administrador" del sidebar.
  const visibleTabs = user?.rol === 'observador'
    ? tabs.slice(0, tabs.findIndex(t => t.type === 'section' && t.label === 'Administrador'))
    : tabs

  // Auth loading screen
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-surface-0)' }}>
        <div className="flex flex-col items-center gap-3 animate-in">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'var(--color-glow-green)', border: '1px solid var(--color-accent-green-dim)' }}>
            <Leaf size={24} style={{ color: 'var(--color-accent-green)' }} />
          </div>
          <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-accent-green)' }} />
        </div>
      </div>
    )
  }

  // Login screen (no user)
  if (!user) {
    return <Suspense fallback={<Loading />}><LoginView onLogin={login} /></Suspense>
  }

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
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50" style={{ background: 'var(--color-surface-1)', borderBottom: '1px solid var(--color-border)' }}>
        {/* Mobile: hamburger + wordmark + bell */}
        <div className="lg:hidden h-12 flex items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button className="p-1.5 rounded-lg" style={{ color: 'var(--color-text-muted)' }} onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <h1 className="text-2xl tracking-tight" style={{ color: 'var(--color-text-primary)', fontFamily: '"Fraunces", Georgia, serif', fontWeight: 700 }}>Zafra</h1>
          </div>
          <button onClick={() => navigate('/alertas')}
            className="relative p-2 rounded-lg transition-colors hover-surface"
            style={{ color: hasAlerts ? 'var(--color-accent-amber)' : 'var(--color-text-muted)' }}>
            <Bell size={18} />
            {hasAlerts && (
              <span className="absolute -top-0.5 -right-0.5 text-[10px] font-bold rounded-full w-[18px] h-[18px] flex items-center justify-center"
                style={{ background: 'var(--color-accent-red)', color: '#fff' }}>{alertCount}</span>
            )}
          </button>
        </div>
        {/* Desktop: wordmark centered in sidebar-width column, bell on right */}
        <div className="hidden lg:flex h-12 items-center">
          <div
            className="flex items-center justify-center shrink-0 overflow-hidden transition-[width] duration-200 ease-out"
            style={{ width: collapsed ? 60 : 220 }}
          >
            <h1
              className="text-2xl tracking-tight whitespace-nowrap transition-opacity duration-150"
              style={{ color: 'var(--color-text-primary)', fontFamily: '"Fraunces", Georgia, serif', fontWeight: 700, opacity: collapsed ? 0 : 1 }}
            >
              Zafra
            </h1>
          </div>
          <div className="flex-1 flex items-center justify-end px-6">
            <button onClick={() => navigate('/alertas')}
              className="relative p-2 rounded-lg transition-colors hover-surface"
              style={{ color: hasAlerts ? 'var(--color-accent-amber)' : 'var(--color-text-muted)' }}>
              <Bell size={18} />
              {hasAlerts && (
                <span className="absolute -top-0.5 -right-0.5 text-[10px] font-bold rounded-full w-[18px] h-[18px] flex items-center justify-center"
                  style={{ background: 'var(--color-accent-red)', color: '#fff' }}>{alertCount}</span>
              )}
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {mobileOpen && <div className="fixed inset-0 z-40 lg:hidden" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setMobileOpen(false)} />}

        {/* Sidebar */}
        <aside
          className={`
            shrink-0 overflow-y-auto overflow-x-hidden scrollbar-none z-40 flex flex-col
            fixed inset-y-0 left-0 top-12
            transform transition-all duration-200 ease-out
            ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}
          style={{ width: collapsed ? 60 : 220, background: 'var(--color-surface-1)', borderRight: '1px solid var(--color-border)' }}
        >
          {/* Toggle */}
          <div className="px-2 pt-3 pb-2 flex justify-center shrink-0">
            <button onClick={() => setCollapsed(!collapsed)}
              className="p-2 rounded-lg transition-colors w-full flex items-center justify-center hover-surface"
              style={{ color: 'var(--color-text-muted)' }}>
              {collapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
            </button>
          </div>

          {/* Expanded */}
          {!collapsed && (
            <div className="flex flex-col flex-1 min-h-0">
              <div className="px-3 pb-4 flex-1 overflow-y-auto scrollbar-none">
                <nav className="space-y-0.5">
                  {visibleTabs.map((t, idx) => {
                    if (t.type === 'section') return (
                      <div key={idx} className="pt-4 pb-1 px-1">
                        <div className="mb-2" style={{ borderTop: '1px solid var(--color-border)' }} />
                        <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>{t.label}</p>
                      </div>
                    )
                    const active = isTabActive(t)
                    const Icon = t.icon
                    const hasSub = !!t.sub
                    const subOpen = hasSub && alertasOpen
                    return (
                      <div key={t.path}>
                        <div className={`nav-item flex items-center rounded-xl text-sm font-medium cursor-pointer ${active ? 'nav-active' : ''}`}
                          style={{
                            background: active ? 'var(--color-accent-green-dim)' : 'transparent',
                            color: active ? 'var(--color-accent-green)' : 'var(--color-text-muted)',
                            border: active ? '1px solid rgba(16,185,129,0.2)' : '1px solid transparent',
                          }}>
                          <NavLink to={t.path} end={t.path === '/' || t.path === '/alertas'}
                            onClick={() => { setMobileOpen(false); if (hasSub) setAlertasOpen(!alertasOpen) }}
                            className="flex items-center gap-3 px-3 py-2.5 flex-1">
                            <Icon size={18} /><span>{t.label}</span>
                          </NavLink>
                          {hasSub && (
                            <button onClick={e => { e.preventDefault(); setAlertasOpen(!alertasOpen) }} className="pr-3 py-2.5" style={{ color: 'inherit' }}>
                              <ChevronsRight size={14} style={{ transform: subOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                            </button>
                          )}
                        </div>
                        {hasSub && subOpen && (
                          <div className="ml-5 mt-0.5 space-y-0.5 border-l" style={{ borderColor: 'var(--color-border)' }}>
                            {t.sub.map(sub => {
                              const sa = isSubActive(sub); const SI = sub.icon
                              return (
                                <NavLink key={sub.path} to={sub.path} end onClick={() => setMobileOpen(false)}
                                  className={`nav-item flex items-center gap-2.5 pl-4 pr-3 py-2 rounded-r-lg text-xs font-medium ${sa ? 'nav-active' : ''}`}
                                  style={{ background: sa ? 'var(--color-accent-green-dim)' : 'transparent', color: sa ? 'var(--color-accent-green)' : 'var(--color-text-muted)' }}>
                                  <SI size={14} /><span>{sub.label}</span>
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
              <div className="mt-auto px-3 pb-4 relative">
                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 12 }}>
                  {profileMenuOpen && (
                    <div className="absolute bottom-full left-3 right-3 mb-2 z-40">
                      <ProfileMenu user={user} onClose={() => setProfileMenuOpen(false)} onLogout={handleLogout} />
                    </div>
                  )}
                  <button
                    onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors hover-surface"
                    style={{ background: profileMenuOpen ? 'var(--color-surface-3)' : 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                      style={{ background: 'var(--color-accent-green-dim)', color: 'var(--color-accent-green)', border: '1px solid rgba(16,185,129,0.2)' }}
                    >
                      {user.iniciales}
                    </div>
                    <div className="min-w-0 text-left">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>{user.nombre}</p>
                      <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{user.rol === 'admin' ? 'Admin' : user.rol === 'agronomo' ? 'Agrónomo' : 'Solo lectura'}</p>
                    </div>
                    <ChevronUp size={14} className="ml-auto" style={{ color: 'var(--color-text-muted)', transform: profileMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Collapsed */}
          {collapsed && (
            <div className="flex flex-col flex-1 min-h-0">
              <nav className="px-1.5 pb-4 space-y-1 flex-1 overflow-y-auto scrollbar-none">
                {visibleTabs.map((t, idx) => {
                  if (t.type === 'section') return <div key={idx} className="my-2 mx-2" style={{ borderBottom: '1px solid var(--color-border)' }} />
                  const active = isTabActive(t); const Icon = t.icon
                  return (
                    <NavLink key={t.path} to={t.path} end={t.path === '/' || t.path === '/alertas'}
                      className={`nav-item flex items-center justify-center w-10 h-10 mx-auto rounded-xl ${active ? 'nav-active' : ''}`}
                      style={{
                        background: active ? 'var(--color-accent-green-dim)' : 'transparent',
                        color: active ? 'var(--color-accent-green)' : 'var(--color-text-muted)',
                        border: active ? '1px solid rgba(16,185,129,0.2)' : '1px solid transparent',
                      }}
                      title={t.label}>
                      <Icon size={20} />
                    </NavLink>
                  )
                })}
              </nav>
              <div className="mt-auto pb-4 flex justify-center">
                {profileMenuOpen && createPortal(
                  <ProfileMenu user={user} compact onClose={() => setProfileMenuOpen(false)} onLogout={handleLogout} />,
                  document.body
                )}
                <button
                  onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold transition-colors"
                  style={{ background: profileMenuOpen ? 'var(--color-surface-3)' : 'var(--color-accent-green-dim)', color: 'var(--color-accent-green)', border: '1px solid rgba(16,185,129,0.2)' }}
                  title={`${user.nombre} — ${user.rol === 'admin' ? 'Admin' : user.rol === 'agronomo' ? 'Agrónomo' : 'Solo lectura'}`}
                >
                  {user.iniciales}
                </button>
              </div>
            </div>
          )}
        </aside>

        {/* Main */}
        <main className={`flex-1 overflow-y-auto mt-12 ${collapsed ? 'lg:ml-[60px]' : 'lg:ml-[220px]'} transition-all duration-200`}>
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
            <ErrorBoundary>
            <Suspense fallback={<Loading />}>
            <Routes>
              <Route path="/" element={<OverviewView predioId={predioId} />} />
              <Route path="/predio" element={<PredioView predioId={predioId} onChangePredio={setPredioId} predios={predios} user={user} />} />
              <Route path="/nodo" element={<NodoView predioId={predioId} />} />
              <Route path="/nodo/:id" element={<NodoView predioId={predioId} />} />
              <Route path="/firma" element={<FirmaView predioId={predioId} />} />
              <Route path="/comparativo" element={<ComparativoView predioId={predioId} />} />
              <Route path="/clima" element={<ClimaView />} />
              <Route path="/alertas" element={<AlertasView predioId={predioId} filter="todas" />} />
              <Route path="/alertas/destacadas" element={<AlertasView predioId={predioId} filter="destacadas" />} />
              <Route path="/alertas/borradas" element={<AlertasView predioId={predioId} filter="borradas" />} />
              <Route path="/consultor" element={<ConsultorView predioId={predioId} />} />
              <Route path="/admin/predios" element={<AdminPrediosView predioId={predioId} predios={predios} onChangePredio={setPredioId} onCreated={(id) => { setPredioId(id); navigate('/predio') }} />} />
              <Route path="/agronomos" element={<ProximamenteView title="Agrónomos" description="Gestión del equipo de campo: agregar, quitar y asignar agrónomos a predios. Control de accesos por rol." icon={Users} />} />
              <Route path="/usuarios" element={<ProximamenteView title="Usuarios" description="Administración de usuarios del sistema: roles (admin, agrónomo, observador), permisos y accesos al dashboard." icon={UserCog} />} />
              <Route path="/historial" element={<ProximamenteView title="Historial de actividad" description="Registro completo de quién hizo qué y cuándo: cambios en predios, alertas generadas, diagnósticos IA, y acciones del equipo." icon={History} />} />
              <Route path="/exportar" element={<ExportView predioId={predioId} />} />
              <Route path="/contabilidad" element={<ProximamenteView title="Contabilidad" description="Registro de gastos operativos, costos de laboratorio, hardware y mantenimiento por predio." icon={Receipt} />} />
              <Route path="/finanzas" element={<ProximamenteView title="Finanzas" description="Proyección de ingresos por predio, tracking del 30% de incremento de producción, y análisis de rentabilidad." icon={DollarSign} />} />
              <Route path="/config/alertas" element={<ConfigAlertasView />} />
              <Route path="/config/notificaciones" element={<ConfigNotificacionesView />} />
              <Route path="/config/integraciones" element={<ConfigIntegracionesView />} />
              <Route path="/config/respaldos" element={<ConfigRespaldosView />} />
              <Route path="/docs" element={<ProximamenteView title="Documentación" description="Guías de uso del sistema, documentación técnica, y recursos de ayuda para el equipo." icon={BookOpen} />} />
            </Routes>
            </Suspense>
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  )
}
