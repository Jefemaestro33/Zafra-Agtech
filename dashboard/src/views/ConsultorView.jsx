import { useState, useEffect, useRef } from 'react'
import {
  MessageCircleQuestion, Send, Loader2, LayoutDashboard, Radio, Droplets,
  GitCompareArrows, CloudSun, Trash2, Bot, User, Plus, ChevronLeft, Clock,
  MessageSquare,
} from 'lucide-react'
import { useApi } from '../hooks/useApi'
import { getToken } from '../hooks/useAuth'

const secciones = [
  { key: 'overview', label: 'Overview general', icon: LayoutDashboard, prompt: 'Analiza el estado general del predio basándote en los KPIs de overview: nodos online, score Phytophthora máximo, nodos que necesitan riego y ETo del día.' },
  { key: 'nodo', label: 'Nodo detalle', icon: Radio, prompt: 'Analiza los datos de sensores de los nodos: humedad a 3 profundidades (10, 20, 30 cm), temperatura, conductividad eléctrica y estado de batería.' },
  { key: 'firma', label: 'Firma hídrica', icon: Droplets, prompt: 'Interpreta las firmas hídricas del predio: velocidad de infiltración, constante de secado τ, breaking point y su evolución temporal comparando tratamiento vs testigo.' },
  { key: 'comparativo', label: 'Comparativo (CUSUM)', icon: GitCompareArrows, prompt: 'Analiza el análisis comparativo CUSUM entre nodos de tratamiento y testigo: divergencias detectadas, deltas de humedad y tendencias por bloque.' },
  { key: 'clima', label: 'Clima', icon: CloudSun, prompt: 'Interpreta los datos climáticos del predio: temperatura ambiente, precipitación acumulada, humedad relativa y evapotranspiración (ETo) calculada con Penman-Monteith.' },
]

const STORAGE_KEY = 'zafra_consultas_'

function loadConsultas(predioId) {
  try {
    const stored = localStorage.getItem(STORAGE_KEY + predioId)
    return stored ? JSON.parse(stored) : []
  } catch { return [] }
}

function saveConsultas(predioId, consultas) {
  localStorage.setItem(STORAGE_KEY + predioId, JSON.stringify(consultas))
}

function generateTitle(messages) {
  const first = messages.find(m => m.role === 'user')
  if (!first) return 'Nueva consulta'
  const text = first.content
  return text.length > 50 ? text.slice(0, 50) + '...' : text
}

function formatDate(iso) {
  const d = new Date(iso)
  const now = new Date()
  const diff = now - d
  if (diff < 60000) return 'Ahora'
  if (diff < 3600000) return `hace ${Math.floor(diff / 60000)} min`
  if (diff < 86400000) return `hace ${Math.floor(diff / 3600000)}h`
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{
          background: isUser ? 'var(--color-surface-4)' : 'var(--color-glow-green)',
          border: `1px solid ${isUser ? 'var(--color-border)' : 'var(--color-accent-green-dim)'}`,
        }}
      >
        {isUser ? <User size={14} style={{ color: 'var(--color-text-secondary)' }} /> : <Bot size={14} style={{ color: 'var(--color-accent-green)' }} />}
      </div>
      <div
        className="max-w-[80%] rounded-2xl px-4 py-3"
        style={{
          background: isUser ? 'var(--color-surface-3)' : 'var(--color-surface-2)',
          border: `1px solid ${isUser ? 'var(--color-border-light)' : 'var(--color-border)'}`,
        }}
      >
        {msg.section && !isUser && (
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--color-accent-green)' }}>
            Análisis — {msg.section}
          </p>
        )}
        <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--color-text-primary)' }}>
          {msg.content}
        </p>
        <p className="text-[10px] mt-2" style={{ color: 'var(--color-text-muted)' }}>
          {new Date(msg.timestamp).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  )
}

export default function ConsultorView({ predioId }) {
  const [consultas, setConsultas] = useState(() => loadConsultas(predioId))
  const [activeId, setActiveId] = useState(null) // null = new chat, string = viewing existing
  const [selectedSection, setSelectedSection] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const messagesEndRef = useRef(null)

  const { data: overview } = useApi(`/api/predios/${predioId}/overview`)
  const { data: firma } = useApi(`/api/predios/${predioId}/firma`)
  const { data: comparativo } = useApi(`/api/predios/${predioId}/comparativo?dias=30`)
  const { data: clima } = useApi('/api/clima/actual')

  // Reload consultas when predioId changes
  useEffect(() => {
    const loaded = loadConsultas(predioId)
    setConsultas(loaded)
    setActiveId(null)
    setMessages([])
    setSelectedSection(null)
  }, [predioId])

  // Load messages when selecting a consulta
  useEffect(() => {
    if (activeId) {
      const c = consultas.find(c => c.id === activeId)
      if (c) {
        setMessages(c.messages)
        setSelectedSection(c.section || null)
      }
    }
  }, [activeId])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const persistConsulta = (msgs, section) => {
    const now = new Date().toISOString()
    let updated
    if (activeId) {
      updated = consultas.map(c => c.id === activeId ? { ...c, messages: msgs, updatedAt: now, title: generateTitle(msgs) } : c)
    } else {
      const newId = Date.now().toString()
      const newConsulta = { id: newId, title: generateTitle(msgs), section, messages: msgs, createdAt: now, updatedAt: now }
      updated = [newConsulta, ...consultas]
      setActiveId(newId)
    }
    setConsultas(updated)
    saveConsultas(predioId, updated)
  }

  const buildContext = (sectionKey) => {
    let ctx = ''
    if (sectionKey === 'overview' && overview) {
      const k = overview.kpis
      ctx = `KPIs actuales: ${k.nodos_online}/${k.nodos_total} nodos online, Score Phytophthora máx: ${k.score_phytophthora_max}, Nodos que necesitan riego: ${k.nodos_necesitan_riego}, ETo: ${k.eto_dia_mm}mm.\nNodos:\n${overview.nodos.map(n => `- ${n.nombre} (${n.rol}): h10=${n.ultima_lectura?.h10_avg?.toFixed(1)}%, t20=${n.ultima_lectura?.t20?.toFixed(1)}°C, score=${n.score_phytophthora}`).join('\n')}`
    }
    if (sectionKey === 'nodo' && overview) {
      ctx = `Datos de sensores por nodo:\n${overview.nodos.map(n => `- ${n.nombre} (${n.rol}): h10=${n.ultima_lectura?.h10_avg?.toFixed(1)}%, h20=${n.ultima_lectura?.h20_avg?.toFixed(1)}%, h30=${n.ultima_lectura?.h30_avg?.toFixed(1)}%, t20=${n.ultima_lectura?.t20?.toFixed(1)}°C, EC=${n.ultima_lectura?.ec30?.toFixed(2)} dS/m, bat=${n.ultima_lectura?.bateria?.toFixed(2)}V`).join('\n')}`
    }
    if (sectionKey === 'firma' && firma?.length) {
      const recent = firma.slice(0, 8)
      ctx = `Últimas ${recent.length} firmas hídricas:\n${recent.map(f => `- Nodo ${f.nodo_id}: vel=${f.vel_10_20?.toFixed(4)} m/min, τ10=${f.tau_10?.toFixed(1)}h, τ20=${f.tau_20?.toFixed(1)}h, BP=${f.breaking_point_10?.toFixed(1)}% VWC`).join('\n')}`
    }
    if (sectionKey === 'comparativo' && comparativo?.length) {
      ctx = comparativo.map(b => {
        const cs = b.cusum
        return `Bloque ${b.bloque}: ${cs?.estado === 'divergencia' ? `DIVERGENCIA detectada (${cs.tipo}) desde día ${cs.desde_dia}, ${cs.total_alarmas} alarmas` : 'Normal, sin divergencia'}`
      }).join('\n')
    }
    if (sectionKey === 'clima' && clima) {
      const u = clima.ultima_lectura
      ctx = u ? `Clima actual: Temp=${u.temp_ambiente}°C, Precip 7d=${u.precip_acum_7d}mm, HR=${u.humedad_relativa}%, ETo=${clima.eto_dia_mm}mm/día` : 'Sin datos climáticos disponibles'
    }
    return ctx
  }

  const handleSend = async () => {
    if (!input.trim() && !selectedSection) return

    const sectionConfig = selectedSection ? secciones.find(s => s.key === selectedSection) : null
    const userMessage = input.trim() || (sectionConfig ? `Analiza la sección "${sectionConfig.label}" y dame tu interpretación.` : '')
    if (!userMessage) return

    const userMsg = { role: 'user', content: userMessage, timestamp: new Date().toISOString() }
    const newMsgs = [...messages, userMsg]
    setMessages(newMsgs)
    setInput('')
    setLoading(true)

    try {
      const context = selectedSection ? buildContext(selectedSection) : ''
      const systemPrompt = sectionConfig?.prompt || 'Eres un consultor experto en agricultura de aguacate Hass. Responde preguntas técnicas sobre los datos de sensores IoT del predio.'
      const fullPrompt = context
        ? `${systemPrompt}\n\nDATOS ACTUALES DEL SISTEMA:\n${context}\n\nPREGUNTA DEL USUARIO:\n${userMessage}`
        : `${systemPrompt}\n\nPREGUNTA DEL USUARIO:\n${userMessage}`

      const headers = { 'Content-Type': 'application/json' }
      const token = getToken()
      if (token) headers['Authorization'] = `Bearer ${token}`

      const res = await fetch('/api/alertas/1/diagnostico', {
        method: 'POST',
        headers,
        body: JSON.stringify({ prompt_override: fullPrompt }),
      })

      let aiContent = 'No se pudo obtener respuesta de la IA. Verifica que la API de Claude esté configurada.'
      if (res.ok) {
        const data = await res.json()
        const d = data.diagnostico
        if (d) {
          if (typeof d === 'string') aiContent = d
          else if (d.raw_response) aiContent = d.raw_response
          else if (d.raw) aiContent = d.raw
          else if (d.diagnostico) aiContent = [d.diagnostico, d.recomendacion_1, d.recomendacion_2, d.referencia].filter(Boolean).join('\n\n')
          else aiContent = JSON.stringify(d, null, 2)
        }
      }

      const aiMsg = { role: 'assistant', content: aiContent, timestamp: new Date().toISOString(), section: sectionConfig?.label }
      const finalMsgs = [...newMsgs, aiMsg]
      setMessages(finalMsgs)
      persistConsulta(finalMsgs, selectedSection)
    } catch (e) {
      const errMsg = { role: 'assistant', content: `Error de conexión: ${e.message}`, timestamp: new Date().toISOString() }
      const finalMsgs = [...newMsgs, errMsg]
      setMessages(finalMsgs)
      persistConsulta(finalMsgs, selectedSection)
    } finally {
      setLoading(false)
    }
  }

  const handleNewChat = () => {
    setActiveId(null)
    setMessages([])
    setSelectedSection(null)
    setInput('')
    setShowHistory(false)
  }

  const handleSelectConsulta = (id) => {
    setActiveId(id)
    setShowHistory(false)
  }

  const handleDeleteConsulta = (e, id) => {
    e.stopPropagation()
    const updated = consultas.filter(c => c.id !== id)
    setConsultas(updated)
    saveConsultas(predioId, updated)
    if (activeId === id) {
      setActiveId(null)
      setMessages([])
    }
  }

  const activeConsulta = activeId ? consultas.find(c => c.id === activeId) : null
  const isViewingHistory = activeId && messages.length > 0

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between animate-in">
        <div className="flex items-center gap-3">
          {isViewingHistory && (
            <button
              onClick={handleNewChat}
              className="p-2 rounded-xl transition-colors"
              style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-3)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--color-surface-2)'}
              title="Nueva consulta"
            >
              <ChevronLeft size={16} />
            </button>
          )}
          <div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
              {isViewingHistory ? activeConsulta?.title || 'Consulta' : 'Consultor'}
            </h2>
            <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              {isViewingHistory
                ? formatDate(activeConsulta?.createdAt)
                : `${consultas.length} consulta${consultas.length !== 1 ? 's' : ''} guardada${consultas.length !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {consultas.length > 0 && (
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
              style={{
                background: showHistory ? 'var(--color-accent-green-dim)' : 'var(--color-surface-3)',
                color: showHistory ? 'var(--color-accent-green)' : 'var(--color-text-muted)',
                border: `1px solid ${showHistory ? 'rgba(16,185,129,0.3)' : 'var(--color-border)'}`,
              }}
              onMouseEnter={e => { if (!showHistory) { e.currentTarget.style.background = 'var(--color-surface-4)' } }}
              onMouseLeave={e => { if (!showHistory) { e.currentTarget.style.background = 'var(--color-surface-3)' } }}
            >
              <Clock size={12} /> Historial
            </button>
          )}
          <button
            onClick={handleNewChat}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
            style={{ background: 'var(--color-accent-green-dim)', color: 'var(--color-accent-green)', border: '1px solid rgba(16,185,129,0.3)' }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 0 12px rgba(16,185,129,0.2)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
          >
            <Plus size={12} /> Nueva consulta
          </button>
        </div>
      </div>

      {/* History panel */}
      {showHistory && (
        <div
          className="rounded-2xl overflow-hidden animate-in"
          style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', maxHeight: 320, overflowY: 'auto' }}
        >
          <div className="p-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-2 px-1" style={{ color: 'var(--color-text-muted)' }}>
              Consultas anteriores ({consultas.length})
            </p>
            <div className="space-y-1">
              {consultas.map(c => {
                const isActive = activeId === c.id
                const msgCount = c.messages.filter(m => m.role === 'user').length
                const sectionLabel = c.section ? secciones.find(s => s.key === c.section)?.label : null
                return (
                  <div
                    key={c.id}
                    onClick={() => handleSelectConsulta(c.id)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 group"
                    style={{
                      background: isActive ? 'var(--color-accent-green-dim)' : 'transparent',
                      border: isActive ? '1px solid rgba(16,185,129,0.2)' : '1px solid transparent',
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--color-surface-3)' }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: 'var(--color-surface-3)', border: '1px solid var(--color-border)' }}
                    >
                      <MessageSquare size={14} style={{ color: isActive ? 'var(--color-accent-green)' : 'var(--color-text-muted)' }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate" style={{ color: isActive ? 'var(--color-accent-green)' : 'var(--color-text-primary)' }}>
                        {c.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {sectionLabel && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--color-surface-4)', color: 'var(--color-text-muted)' }}>
                            {sectionLabel}
                          </span>
                        )}
                        <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                          {msgCount} pregunta{msgCount !== 1 ? 's' : ''} · {formatDate(c.updatedAt || c.createdAt)}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDeleteConsulta(e, c.id)}
                      className="p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-all shrink-0"
                      style={{ color: 'var(--color-text-muted)' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-glow-red)'; e.currentTarget.style.color = 'var(--color-accent-red)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-muted)' }}
                      title="Eliminar consulta"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Section selector */}
      {!showHistory && (
        <div className="animate-in stagger-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-2 px-1" style={{ color: 'var(--color-text-muted)' }}>
            Sección a analizar
          </p>
          <div className="flex gap-2 flex-wrap">
            {secciones.map(s => {
              const active = selectedSection === s.key
              const Icon = s.icon
              return (
                <button
                  key={s.key}
                  onClick={() => setSelectedSection(active ? null : s.key)}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-200"
                  style={{
                    background: active ? 'var(--color-accent-green-dim)' : 'var(--color-surface-2)',
                    color: active ? 'var(--color-accent-green)' : 'var(--color-text-muted)',
                    border: `1px solid ${active ? 'rgba(16,185,129,0.3)' : 'var(--color-border)'}`,
                  }}
                  onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'var(--color-surface-3)'; e.currentTarget.style.color = 'var(--color-text-secondary)' } }}
                  onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'var(--color-surface-2)'; e.currentTarget.style.color = 'var(--color-text-muted)' } }}
                >
                  <Icon size={16} />
                  {s.label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Chat area */}
      {!showHistory && (
        <div
          className="rounded-2xl overflow-hidden flex flex-col animate-in stagger-2"
          style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', minHeight: 400, maxHeight: 'calc(100vh - 360px)' }}
        >
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full py-12">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: 'var(--color-glow-green)', border: '1px solid var(--color-accent-green-dim)' }}
                >
                  <MessageCircleQuestion size={28} style={{ color: 'var(--color-accent-green)' }} />
                </div>
                <p className="text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
                  {selectedSection ? `Pregunta sobre ${secciones.find(s => s.key === selectedSection)?.label}` : 'Selecciona una sección para empezar'}
                </p>
                <p className="text-xs mt-1 text-center max-w-sm" style={{ color: 'var(--color-text-muted)' }}>
                  {selectedSection
                    ? 'Escribe tu pregunta o presiona enviar para un análisis automático de la sección seleccionada'
                    : 'Elige qué parte del dashboard quieres que la IA analice e interprete para ti'}
                </p>
              </div>
            )}
            {messages.map((msg, i) => (
              <MessageBubble key={i} msg={msg} />
            ))}
            {loading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--color-glow-green)', border: '1px solid var(--color-accent-green-dim)' }}>
                  <Bot size={14} style={{ color: 'var(--color-accent-green)' }} />
                </div>
                <div className="rounded-2xl px-4 py-3" style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
                  <div className="flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin" style={{ color: 'var(--color-accent-green)' }} />
                    <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Analizando datos...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4" style={{ borderTop: '1px solid var(--color-border)' }}>
            <div className="flex gap-2">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                placeholder={selectedSection ? `Pregunta sobre ${secciones.find(s => s.key === selectedSection)?.label}...` : 'Selecciona una sección primero o escribe una pregunta libre...'}
                className="flex-1 rounded-xl px-4 py-3 text-sm outline-none"
                style={{ background: 'var(--color-surface-3)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                disabled={loading}
              />
              <button
                onClick={handleSend}
                disabled={loading || (!input.trim() && !selectedSection)}
                className="px-4 rounded-xl transition-all duration-200 disabled:opacity-30 flex items-center justify-center"
                style={{
                  background: 'var(--color-accent-green-dim)',
                  color: 'var(--color-accent-green)',
                  border: '1px solid rgba(16,185,129,0.3)',
                }}
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </div>
            {selectedSection && (
              <p className="text-[11px] mt-2 px-1" style={{ color: 'var(--color-text-muted)' }}>
                Contexto: datos en tiempo real de "{secciones.find(s => s.key === selectedSection)?.label}" · Enter para enviar
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
