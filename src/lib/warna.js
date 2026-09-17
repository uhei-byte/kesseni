/** Jana skala warna 50–900 dari satu warna tema, kemudian pasang sebagai CSS variable */

function hexKeRgb(hex) {
  const h = String(hex || '').replace('#', '').trim()
  const penuh = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  if (!/^[0-9a-fA-F]{6}$/.test(penuh)) return null
  return [
    parseInt(penuh.substring(0, 2), 16),
    parseInt(penuh.substring(2, 4), 16),
    parseInt(penuh.substring(4, 6), 16)
  ]
}

const rgbKeHex = ([r, g, b]) =>
  '#' + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')

const campur = (a, b, nisbah) => a.map((v, i) => v + (b[i] - v) * nisbah)

const PETA = {
  50: ['putih', 0.94], 100: ['putih', 0.86], 200: ['putih', 0.72],
  300: ['putih', 0.54], 400: ['putih', 0.3], 500: ['putih', 0.12],
  600: ['asal', 0], 700: ['hitam', 0.1], 800: ['hitam', 0.24], 900: ['hitam', 0.4]
}

export function pasangTema(hex) {
  const asas = hexKeRgb(hex)
  if (!asas) return
  const putih = [255, 255, 255]
  const hitam = [0, 0, 0]
  const akar = document.documentElement

  Object.entries(PETA).forEach(([tahap, [arah, nisbah]]) => {
    const warna = arah === 'asal' ? asas : campur(asas, arah === 'putih' ? putih : hitam, nisbah)
    akar.style.setProperty(`--brand-${tahap}`, rgbKeHex(warna))
  })

  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', rgbKeHex(campur(asas, hitam, 0.1)))
}
