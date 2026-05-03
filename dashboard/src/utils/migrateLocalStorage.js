// One-time migration: rename all `agtech_*` localStorage keys to `zafra_*`.
// Must run synchronously before any component reads localStorage.
const FLAG = 'zafra_migration_v1_done'
const OLD = 'agtech_'
const NEW = 'zafra_'

export function migrateAgtechToZafra() {
  if (typeof window === 'undefined') return
  if (localStorage.getItem(FLAG) === '1') return

  const keys = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k && k.startsWith(OLD)) keys.push(k)
  }

  for (const oldKey of keys) {
    const newKey = NEW + oldKey.slice(OLD.length)
    if (localStorage.getItem(newKey) === null) {
      const value = localStorage.getItem(oldKey)
      if (value !== null) localStorage.setItem(newKey, value)
    }
    localStorage.removeItem(oldKey)
  }

  localStorage.setItem(FLAG, '1')
}
