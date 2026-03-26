import { useState, useEffect } from 'react'
import { MessageCircleQuestion, Send, Loader2, LayoutDashboard, Radio, Droplets, GitCompareArrows, CloudSun, Trash2, Bot, User } from 'lucide-react'
import { useApi } from '../hooks/useApi'

const secciones = [
  { key: 'overview', label: 'Overview general', icon: LayoutDashboard, prompt: 'Analiza el estado general del predio basándote en los KPIs de overview: nodos online, score Phytophthora máximo, nodos que necesitan riego y ETo del día.' },
  { key: 'nodo', label: 'Nodo detalle', icon: Radio, prompt: 'Analiza los datos de sensores de los nodos: humedad a 3 profundidades (10, 20, 30 cm), temperatura, conductividad eléctrica y estado de batería.' },
  { key: 'firma', label: 'Firma hídrica', icon: Droplets, prompt: 'Interpreta las firmas hídricas del predio: velocidad de infiltración, constante de secado τ, breaking point y su evolución temporal comparando tratamiento vs testigo.' },
  { key: 'comparativo', label: 'Comparativo (CUSUM)', icon: GitCompareArrows, prompt: 'Analiza el análisis comparativo CUSUM entre nodos de tratamiento y testigo: divergencias detectadas, deltas de humedad y tendencias por bloque.' },
  { key: 'clima', label: 'Clima', icon: CloudSun, prompt: 'Interpreta los datos climáticos del predio: temperatura ambiente, precipitación acumulada, humedad relativa y evapotranspiración (ETo) calculada con Penman-Monteith.' },
]

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

const STORAGE_KEY = 'agtech_consultor_'

export default function ConsultorView({ predioId }) {
  const [selectedSection, setSelectedSection] = useState(null)
  const [messages, setMessages] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY + predioId)
      return stored ? JSON.parse(stored) : []
    } catch { return [] }
  })
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  // Persist messages on change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY + predioId, JSON.stringify(messages))
  }, [messages, predioId])

  // Reload when predioId changes
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY + predioId)
      setMessages(stored ? JSON.parse(stored) : [])
    } catch { setMessages([]) }
  }, [predioId])

  const { data: overview } = useApi(`/api/predios/${predioId}/overview`)
  const { data: firma } = useApi(`/api/predios/${predioId}/firma`)
  const { data: comparativo } = useApi(`/api/predios/${predioId}/comparativo?dias=30`)
  const { data: clima } = useApi('/api/clima/actual')

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
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const context = selectedSection ? buildContext(selectedSection) : ''
      const systemPrompt = sectionConfig?.prompt || 'Eres un consultor experto en agricultura de aguacate Hass. Responde preguntas técnicas sobre los datos de sensores IoT del predio.'

      const fullPrompt = context
        ? `${systemPrompt}\n\nDATOS ACTUALES DEL SISTEMA:\n${context}\n\nPREGUNTA DEL USUARIO:\n${userMessage}`
        : `${systemPrompt}\n\nPREGUNTA DEL USUARIO:\n${userMessage}`

      const res = await fetch('/api/alertas/1/diagnostico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      setMessages(prev => [...prev, aiMsg])
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Error de conexión: ${e.message}`, timestamp: new Date().toISOString() }])
    } finally {
      setLoading(false)
    }
  }

  const handleClear = () => {
    setMessages([])
    setSelectedSection(null)
    localStorage.removeItem(STORAGE_KEY + predioId)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between animate-in">
        <div>
          <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>Consultor IA</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Selecciona una sección y haz preguntas sobre tus datos
          </p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
            style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-glow-red)'; e.currentTarget.style.color = 'var(--color-accent-red)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-surface-3)'; e.currentTarget.style.color = 'var(--color-text-muted)' }}
          >
            <Trash2 size={12} /> Limpiar chat
          </button>
        )}
      </div>

      {/* Section selector */}
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

      {/* Chat area */}
      <div
        className="rounded-2xl overflow-hidden flex flex-col animate-in stagger-2"
        style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', minHeight: 400, maxHeight: 'calc(100vh - 320px)' }}
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
    </div>
  )
}
