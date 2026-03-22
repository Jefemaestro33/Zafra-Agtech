import { useState } from 'react'
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom'
import { useApi } from './hooks/useApi'
import OverviewView from './views/OverviewView'
import NodoView from './views/NodoView'
import FirmaView from './views/FirmaView'
import ComparativoView from './views/ComparativoView'
import ClimaView from './views/ClimaView'
import AlertasView from './views/AlertasView'

const tabs = [
  { path: '/', label: 'Overview', icon: '📊' },
  { path: '/nodo', label: 'Nodo detalle', icon: '📡' },
  { path: '/firma', label: 'Firma hídrica', icon: '💧' },
  { path: '/comparativo', label: 'Comparativo', icon: '⚖️' },
  { path: '/clima', label: 'Clima', icon: '🌤️' },
  { path: '/alertas', label: 'Alertas IA', icon: '🤖' },
]

export default function App() {
  const { data: predios } = useApi('/api/predios')
  const [predioId, setPredioId] = useState(1)
  const { data: alertas } = useApi(`/api/predios/${predioId}/alertas`)
  const navigate = useNavigate()

  const predio = predios?.find(p => p.predio_id === predioId) || predios?.[0]
  const alertCount = alertas?.length || 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Row 1 — Logo + notifications */}
      <header className="bg-green-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-12 flex items-center justify-between">
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="text-xl">🥑</span>
            AgTech Nextipac
          </h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/alertas')}
              className="relative p-2 text-white/80 hover:text-white transition-colors"
            >
              <span className="text-lg">🔔</span>
              {alertCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {alertCount}
                </span>
              )}
            </button>
            <div className="w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center text-xs font-bold">
              ED
            </div>
          </div>
        </div>
      </header>

      {/* Row 2 — Predio selector + tabs (scrollable on mobile) */}
      <nav className="bg-green-600">
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-4">
          <div className="flex items-center gap-3 shrink-0 py-2">
            <select
              value={predioId}
              onChange={e => setPredioId(Number(e.target.value))}
              className="text-sm rounded-lg px-3 py-1.5 bg-white/15 text-white border border-white/25 focus:outline-none focus:ring-2 focus:ring-white/40 [&>option]:text-gray-900 max-w-[140px] sm:max-w-none"
            >
              {predios?.map(p => (
                <option key={p.predio_id} value={p.predio_id}>{p.nombre}</option>
              ))}
            </select>
            {predio && (
              <span className="hidden lg:inline text-xs text-white/70">
                {predio.cultivo} · {predio.tipo_suelo} · {predio.hectareas}ha
              </span>
            )}
          </div>
          <div className="flex gap-0.5 overflow-x-auto scrollbar-none ml-auto">
            {tabs.map(t => (
              <NavLink
                key={t.path}
                to={t.path}
                end={t.path === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 sm:px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    isActive
                      ? 'border-white text-white'
                      : 'border-transparent text-white/70 hover:text-white hover:bg-white/10'
                  }`
                }
              >
                <span className="text-base">{t.icon}</span>
                <span className="hidden sm:inline">{t.label}</span>
              </NavLink>
            ))}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
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
