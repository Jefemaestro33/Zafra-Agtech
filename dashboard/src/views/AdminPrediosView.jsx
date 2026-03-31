import { useState } from 'react'
import { FilePenLine, MapPinned, PlusCircle } from 'lucide-react'
import AdminPredioView from './AdminPredioView'
import AdminMapaView from './AdminMapaView'
import NuevoPredioView from './NuevoPredioView'

const sections = [
  { id: 'editar', label: 'Editar predio', icon: FilePenLine },
  { id: 'mapa', label: 'Posicionar nodos', icon: MapPinned },
  { id: 'nuevo', label: 'Nuevo predio', icon: PlusCircle },
]

export default function AdminPrediosView({ predioId, predios, onChangePredio, onCreated }) {
  const [active, setActive] = useState('editar')

  return (
    <div className="space-y-5 animate-in">
      {/* Tab bar */}
      <div className="flex gap-2 flex-wrap">
        {sections.map(s => {
          const Icon = s.icon
          const isActive = active === s.id
          return (
            <button
              key={s.id}
              onClick={() => setActive(s.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all"
              style={{
                background: isActive ? 'var(--color-accent-green-dim)' : 'var(--color-surface-2)',
                color: isActive ? 'var(--color-accent-green)' : 'var(--color-text-muted)',
                border: isActive ? '1px solid rgba(16,185,129,0.3)' : '1px solid var(--color-border)',
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--color-surface-3)' }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = isActive ? 'var(--color-accent-green-dim)' : 'var(--color-surface-2)' }}
            >
              <Icon size={14} />
              {s.label}
            </button>
          )
        })}
      </div>

      {/* Content */}
      {active === 'editar' && (
        <AdminPredioView predioId={predioId} predios={predios} onChangePredio={onChangePredio} />
      )}
      {active === 'mapa' && (
        <AdminMapaView predioId={predioId} />
      )}
      {active === 'nuevo' && (
        <NuevoPredioView onCreated={onCreated} />
      )}
    </div>
  )
}
