export const BULAN = [
  'Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun',
  'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'
]

export const KATEGORI_MASUK = ['Yuran Ahli', 'Sumbangan', 'Tumpang', 'Jualan', 'Lain-lain']
export const KATEGORI_KELUAR = ['Bayaran', 'Sumbangan', 'Program', 'Pentadbiran', 'Lain-lain']
export const KAEDAH_BAYARAN = ['Pindahan Bank', 'Tunai', 'Cek', 'DuitNow / QR', 'Lain-lain']

export function rm(nilai) {
  const n = Number(nilai) || 0
  return 'RM ' + n.toLocaleString('ms-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function tarikhMY(tarikh) {
  if (!tarikh) return '-'
  const s = String(tarikh).substring(0, 10)
  const bhg = s.split('-')
  if (bhg.length !== 3) return s
  return `${bhg[2]}/${bhg[1]}/${bhg[0]}`
}

export function hariIni() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function formatIC(ic) {
  const bersih = String(ic || '').replace(/\D/g, '')
  if (bersih.length !== 12) return ic
  return `${bersih.slice(0, 6)}-${bersih.slice(6, 8)}-${bersih.slice(8)}`
}

export function warnaStatus(status) {
  switch (status) {
    case 'Confirmed':
    case 'Sudah Bayar': return 'bg-emerald-100 text-emerald-800'
    case 'Pending': return 'bg-amber-100 text-amber-800'
    case 'Ditolak': return 'bg-red-100 text-red-800'
    case 'Belum Bayar': return 'bg-slate-100 text-slate-700'
    case 'Aktif': return 'bg-emerald-100 text-emerald-800'
    case 'Tidak Aktif': return 'bg-slate-100 text-slate-500'
    case 'Batal': return 'bg-red-100 text-red-800'
    default: return 'bg-slate-100 text-slate-700'
  }
}

export function muatTurunCSV(namaFail, header, baris) {
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const isi = [header.map(escape).join(','), ...baris.map((r) => header.map((h) => escape(r[h])).join(','))].join('\n')
  const blob = new Blob(['﻿' + isi], { type: 'text/csv;charset=utf-8;' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = namaFail
  a.click()
  URL.revokeObjectURL(a.href)
}
