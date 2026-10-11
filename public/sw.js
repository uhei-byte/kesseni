/**
 * Service worker ringkas.
 * - Aset statik: cache-first (pantas, boleh dibuka offline)
 * - Navigasi halaman: network-first dengan salinan cache sebagai sandaran
 * - Panggilan API (POST ke Apps Script): TIDAK PERNAH di-cache
 */
const CACHE = 'sistem-v3'
const TERAS = ['/', '/admin/', '/manifest.json', '/manifest-admin.json',
               '/icons/icon-192.png', '/icons/icon-512.png', '/favicon.png']

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(TERAS)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((kunci) => Promise.all(kunci.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (e) => {
  const permintaan = e.request
  if (permintaan.method !== 'GET') return                       // API guna POST — biar terus ke rangkaian
  const url = new URL(permintaan.url)
  if (url.origin !== self.location.origin) return               // Drive/fonts — biar penyemak imbas urus

  if (permintaan.mode === 'navigate') {
    e.respondWith(
      fetch(permintaan)
        .then((res) => {
          const salinan = res.clone()
          caches.open(CACHE).then((c) => c.put(permintaan, salinan))
          return res
        })
        .catch(() => caches.match(permintaan).then((r) => r || caches.match('/')))
    )
    return
  }

  e.respondWith(
    caches.match(permintaan).then((simpan) => simpan || fetch(permintaan).then((res) => {
      if (res.ok && (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/'))) {
        const salinan = res.clone()
        caches.open(CACHE).then((c) => c.put(permintaan, salinan))
      }
      return res
    }).catch(() => simpan))
  )
})
