/**
 * Klien API untuk backend Google Apps Script.
 *
 * NOTA PENTING (CORS):
 * Kita hantar body sebagai text/plain supaya browser TIDAK menghantar
 * preflight OPTIONS request — Apps Script tidak boleh menjawabnya.
 * Apps Script akan JSON.parse sendiri di sebelah server.
 */

import { API_URL } from '../config'

const KUNCI_TOKEN = 'keseni_token'
const KUNCI_TAMAT = 'keseni_tamat'
const KUNCI_ROLE = 'keseni_role'
const KUNCI_EMEL = 'keseni_emel'

export function simpanSesi(token, tamat, role, emel) {
  sessionStorage.setItem(KUNCI_TOKEN, token)
  sessionStorage.setItem(KUNCI_TAMAT, String(tamat))
  sessionStorage.setItem(KUNCI_ROLE, role || '')
  sessionStorage.setItem(KUNCI_EMEL, emel || '')
}

export function ambilToken() {
  const token = sessionStorage.getItem(KUNCI_TOKEN)
  const tamat = Number(sessionStorage.getItem(KUNCI_TAMAT) || 0)
  if (!token || (tamat && Date.now() > tamat)) return ''
  return token
}

export function ambilSesi() {
  return {
    token: ambilToken(),
    role: sessionStorage.getItem(KUNCI_ROLE) || '',
    emel: sessionStorage.getItem(KUNCI_EMEL) || ''
  }
}

/** Kebenaran di frontend hanya untuk paparan menu — kuat kuasa sebenar di server */
export const AKSES = {
  kewangan: ['Superadmin', 'Bendahari'],
  staf: ['Superadmin', 'Setiausaha'],
  yuran: ['Superadmin', 'Setiausaha', 'Bendahari'],
  tetapan: ['Superadmin'],
  pengguna: ['Superadmin']
}

export function boleh(bahagian) {
  return AKSES[bahagian]?.includes(ambilSesi().role) || false
}

export function padamSesi() {
  [KUNCI_TOKEN, KUNCI_TAMAT, KUNCI_ROLE, KUNCI_EMEL].forEach((k) => sessionStorage.removeItem(k))
}

export async function panggil(action, payload = {}, opsyen = {}) {
  if (!API_URL || API_URL.indexOf('XXXX') !== -1) {
    throw new Error('URL Apps Script belum ditetapkan. Sila isi API_URL dalam fail src/config.js')
  }
  const body = JSON.stringify({
    action,
    payload,
    token: opsyen.awam ? '' : ambilToken()
  })

  let res
  try {
    res = await fetch(API_URL, {
      method: 'POST',
      body,
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    })
  } catch (e) {
    throw new Error('Tidak dapat menghubungi pelayan. Semak sambungan internet atau URL API.')
  }

  const teks = await res.text()
  let data
  try {
    data = JSON.parse(teks)
  } catch (e) {
    throw new Error('Balasan pelayan tidak sah. Pastikan Apps Script di-deploy dengan akses "Anyone".')
  }

  if (data.kod === 'AUTH' && !opsyen.awam) {
    padamSesi()
    if (window.location.pathname.indexOf('/admin') === 0) window.location.href = '/admin/'
  }
  return data
}

/** Tukar File kepada base64 + kecilkan imej sebelum hantar */
export async function failKeBase64(file, maxLebar = 1600, kualiti = 0.75) {
  if (!file) return null
  const bacaAsal = () =>
    new Promise((resolve, reject) => {
      const fr = new FileReader()
      fr.onload = () => resolve({
        data: String(fr.result).split(',')[1],
        mime: file.type,
        nama: file.name
      })
      fr.onerror = reject
      fr.readAsDataURL(file)
    })

  if (!file.type.startsWith('image/')) return bacaAsal()

  try {
    const bitmap = await createImageBitmap(file)
    const skala = Math.min(1, maxLebar / bitmap.width)
    const kanvas = document.createElement('canvas')
    kanvas.width = Math.round(bitmap.width * skala)
    kanvas.height = Math.round(bitmap.height * skala)
    kanvas.getContext('2d').drawImage(bitmap, 0, 0, kanvas.width, kanvas.height)
    const dataUrl = kanvas.toDataURL('image/jpeg', kualiti)
    return { data: dataUrl.split(',')[1], mime: 'image/jpeg', nama: file.name.replace(/\.\w+$/, '.jpg') }
  } catch (e) {
    return bacaAsal()
  }
}
