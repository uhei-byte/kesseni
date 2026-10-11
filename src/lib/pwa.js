/** Pendaftaran service worker + pengesan prompt pasang aplikasi */

export function daftarPWA() {
  if (!('serviceWorker' in navigator)) return
  if (location.protocol !== 'https:' && location.hostname !== 'localhost') return
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}

let peristiwaPasang = null
const pendengar = new Set()

window.addEventListener?.('beforeinstallprompt', (e) => {
  e.preventDefault()
  peristiwaPasang = e
  pendengar.forEach((f) => f(true))
})

window.addEventListener?.('appinstalled', () => {
  peristiwaPasang = null
  pendengar.forEach((f) => f(false))
})

export function bolehPasang() {
  return !!peristiwaPasang
}

export function dengarPasang(fungsi) {
  pendengar.add(fungsi)
  return () => pendengar.delete(fungsi)
}

export async function mintaPasang() {
  if (!peristiwaPasang) return false
  peristiwaPasang.prompt()
  const { outcome } = await peristiwaPasang.userChoice
  peristiwaPasang = null
  pendengar.forEach((f) => f(false))
  return outcome === 'accepted'
}
