import React, { createContext, useContext, useEffect, useState } from 'react'
import { panggil } from './api'
import { pasangTema } from './warna'
import { LALAI } from '../config'

const KonfigCtx = createContext({ kelab: LALAI, jenisBayaran: [], kadarYuran: [], memuat: true })

export const useKonfig = () => useContext(KonfigCtx)

const KUNCI_CACHE = 'keseni_konfig'

export function KonfigProvider({ children }) {
  const [konfig, setKonfig] = useState(() => {
    // Papar konfigurasi terakhir dahulu supaya logo & warna tidak berkelip
    try {
      const simpan = localStorage.getItem(KUNCI_CACHE)
      if (simpan) return { ...JSON.parse(simpan), memuat: true }
    } catch (e) {}
    return { kelab: LALAI, jenisBayaran: [], kadarYuran: [], memuat: true }
  })

  const muatSemula = async () => {
    try {
      const r = await panggil('infoKelab', {}, { awam: true })
      if (r.ok) {
        const baharu = {
          kelab: { ...LALAI, ...r.kelab },
          jenisBayaran: r.jenisBayaran || [],
          kadarYuran: r.kadarYuran || [],
          versi: r.versi,
          memuat: false
        }
        setKonfig(baharu)
        try { localStorage.setItem(KUNCI_CACHE, JSON.stringify(baharu)) } catch (e) {}
        return baharu
      }
    } catch (e) { /* guna cache / lalai */ }
    setKonfig((k) => ({ ...k, memuat: false }))
    return null
  }

  useEffect(() => { muatSemula() }, [])

  useEffect(() => {
    if (konfig.kelab?.tema) pasangTema(konfig.kelab.tema)
    if (konfig.kelab?.namaSingkat) {
      document.title = `${konfig.kelab.namaSingkat} · Sistem Kewangan`
    }
  }, [konfig.kelab?.tema, konfig.kelab?.namaSingkat])

  return (
    <KonfigCtx.Provider value={{ ...konfig, muatSemula }}>
      {children}
    </KonfigCtx.Provider>
  )
}

/** Logo organisasi — jatuh balik ke ikon lalai jika tiada logo dikonfigurasi */
export function Logo({ saiz = 40, kelas = '' }) {
  const { kelab } = useKonfig()
  const [gagal, setGagal] = useState(false)
  const src = !gagal && kelab?.logo ? kelab.logo : '/icons/logo.png'
  return (
    <img src={src} alt={kelab?.namaSingkat || 'Logo'} onError={() => setGagal(true)}
      style={{ width: saiz, height: saiz, objectFit: 'contain' }}
      className={`rounded ${kelas}`} />
  )
}
