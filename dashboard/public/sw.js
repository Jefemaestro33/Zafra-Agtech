const CACHE_NAME = 'zafra-v2'

self.addEventListener('install', () => {
  // No precachear nada — el HTML siempre se trae fresco para no quedarse
  // con un index.html que apunta a hashes de assets ya borrados.
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys()
    await Promise.all(keys.map((k) => caches.delete(k)))
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', (event) => {
  // Pasamos todo a la red. Los assets con hash en el filename ya cachean
  // bien por HTTP, y el index.html se pide siempre fresco.
  return
})
