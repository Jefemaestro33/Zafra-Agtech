import { useState } from 'react'
import { Download, FileSpreadsheet, Radio, Droplets, Bell, Loader2, Check } from 'lucide-react'

const exports = [
  {
    id: 'lecturas',
    icon: Radio,
    title: 'Lecturas de sensores',
    desc: 'Datos crudos de todos los nodos: humedad, temperatura, EC, bateria.',
    hasDias: true,
  },
  {
    id: 'alertas',
    icon: Bell,
    title: 'Alertas y eventos',
    desc: 'Historial completo de alertas Phytophthora, riego, offline y bateria.',
    hasDias: false,
  },
  {
    id: 'firma',
    icon: Droplets,
    title: 'Firma hidrica',
    desc: 'Constantes de secado (tau), velocidad de infiltracion y breaking points.',
    hasDias: false,
  },
]

export default function ExportView({ predioId }) {
  const [downloading, setDownloading] = useState(null)
  const [done, setDone] = useState(null)
  const [dias, setDias] = useState(7)

  const handleDownload = async (id) => {
    setDownloading(id)
    try {
      const url = id === 'lecturas'
        ? `/api/export/${id}?predio_id=${predioId}&dias=${dias}`
        : `/api/export/${id}?predio_id=${predioId}`
      const res = await fetch(url)
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = res.headers.get('content-disposition')?.split('filename=')[1] || `zafra_${id}.csv`
      a.click()
      URL.revokeObjectURL(a.href)
      setDone(id)
      setTimeout(() => setDone(null), 2000)
    } catch (e) {
      console.error('Export failed:', e)
    } finally {
      setDownloading(null)
    }
  }

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'var(--color-glow-cyan)' }}>
          <Download size={20} style={{ color: 'var(--color-accent-cyan)' }} />
        </div>
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>Exportar datos</h1>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Descarga datos en formato CSV</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {exports.map((ex) => {
          const Icon = ex.icon
          const isLoading = downloading === ex.id
          const isDone = done === ex.id
          return (
            <div key={ex.id} className="p-5 rounded-2xl"
              style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border)' }}>
              <div className="flex items-start gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'var(--color-glow-green)' }}>
                  <Icon size={18} style={{ color: 'var(--color-accent-green)' }} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{ex.title}</h3>
                  <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{ex.desc}</p>
                </div>
              </div>

              {ex.hasDias && (
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>Periodo:</span>
                  {[7, 30, 90, 180].map(d => (
                    <button key={d} onClick={() => setDias(d)}
                      className="text-[11px] px-2 py-0.5 rounded-lg transition-all"
                      style={{
                        background: dias === d ? 'var(--color-accent-green-dim)' : 'var(--color-surface-2)',
                        color: dias === d ? 'var(--color-accent-green)' : 'var(--color-text-muted)',
                        border: dias === d ? '1px solid var(--color-accent-green-dim)' : '1px solid var(--color-border)',
                      }}>
                      {d}d
                    </button>
                  ))}
                </div>
              )}

              <button onClick={() => handleDownload(ex.id)} disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-medium transition-all"
                style={{
                  background: isDone ? 'var(--color-accent-green-dim)' : 'var(--color-surface-2)',
                  color: isDone ? 'var(--color-accent-green)' : 'var(--color-text-primary)',
                  border: '1px solid var(--color-border)',
                  cursor: isLoading ? 'wait' : 'pointer',
                }}>
                {isLoading ? <><Loader2 size={14} className="animate-spin" /> Descargando...</>
                  : isDone ? <><Check size={14} /> Descargado</>
                  : <><FileSpreadsheet size={14} /> Descargar CSV</>}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
