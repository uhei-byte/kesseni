import React, { useEffect, useMemo, useState } from 'react'
import { panggil } from '../lib/api'
import { rm, BULAN, muatTurunCSV } from '../lib/utils'
import { Spinner, useToast, KadStat } from '../components/ui'

const TAHUN_INI = new Date().getFullYear()

export default function RekodYuran() {
  const toast = useToast()
  const [tahun, setTahun] = useState(TAHUN_INI)
  const [rekod, setRekod] = useState(null)
  const [ahli, setAhli] = useState([])
  const [cari, setCari] = useState('')
  const [sedang, setSedang] = useState(false)

  const muat = () => {
    setRekod(null)
    Promise.all([
      panggil('senarai', { tab: 'RekodYuran' }),
      panggil('senarai', { tab: 'Staf' })
    ]).then(([y, a]) => {
      if (y.ok) setRekod(y.data); else toast(y.mesej, 'ralat')
      if (a.ok) setAhli(a.data.filter((x) => x.StatusAhli !== 'Tidak Aktif'))
      else toast(a.mesej, 'ralat')
    }).catch((e) => toast(e.message, 'ralat'))
  }
  useEffect(muat, [])

  const bersih = (ic) => String(ic || '').replace(/\D/g, '')

  const matriks = useMemo(() => {
    if (!rekod) return []
    const peta = {}
    rekod.filter((r) => Number(r.Tahun) === Number(tahun)).forEach((r) => {
      const k = bersih(r.NoKP)
      peta[k] = peta[k] || {}
      peta[k][Number(r.Bulan)] = r
    })
    return ahli
      .filter((a) => !cari || [a.Nama, a.NoKP].some((v) => String(v || '').toLowerCase().includes(cari.toLowerCase())))
      .map((a) => {
        const baris = peta[bersih(a.NoKP)] || {}
        const bulan = []
        let bayar = 0, tunggak = 0
        for (let b = 1; b <= 12; b++) {
          const r = baris[b]
          const status = r ? r.Status : 'Belum Bayar'
          const amaun = r ? Number(r.Amaun || 0) : 0
          if (status === 'Sudah Bayar') bayar += amaun
          if (status === 'Belum Bayar') tunggak += amaun
          bulan.push({ b, status, amaun })
        }
        return { ahli: a, bulan, bayar, tunggak }
      })
  }, [rekod, ahli, tahun, cari])

  const jana = async () => {
    if (!confirm(`Jana rekod yuran "Belum Bayar" untuk semua ahli aktif bagi tahun ${tahun}?`)) return
    setSedang(true)
    try {
      const r = await panggil('janaYuranTahunan', { tahun })
      r.ok ? (toast(r.mesej, 'ok'), muat()) : toast(r.mesej, 'ralat')
    } catch (e) { toast(e.message, 'ralat') }
    setSedang(false)
  }

  if (!rekod) return <Spinner />

  const jumBayar = matriks.reduce((s, m) => s + m.bayar, 0)
  const jumTunggak = matriks.reduce((s, m) => s + m.tunggak, 0)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Rekod Yuran Ahli</h1>
          <p className="text-sm text-slate-500">Status bayaran yuran mengikut bulan</p>
        </div>
        <div className="flex gap-2">
          <select className="input w-28" value={tahun} onChange={(e) => setTahun(Number(e.target.value))}>
            {[TAHUN_INI + 1, TAHUN_INI, TAHUN_INI - 1, TAHUN_INI - 2].map((t) => <option key={t}>{t}</option>)}
          </select>
          <button className="btn-ghost btn-sm" onClick={() => muatTurunCSV(
            `rekod-yuran-${tahun}.csv`,
            ['Nama', 'NoKP', 'Tahun', 'Bulan', 'Amaun', 'Status'],
            rekod.filter((r) => Number(r.Tahun) === Number(tahun))
          )}>Muat Turun CSV</button>
          <button className="btn-primary btn-sm" onClick={jana} disabled={sedang}>
            {sedang ? 'Menjana...' : `Jana Yuran ${tahun}`}
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <KadStat tajuk="Yuran Terkumpul" nilai={rm(jumBayar)} warna="text-emerald-600" />
        <KadStat tajuk="Yuran Tertunggak" nilai={rm(jumTunggak)} warna="text-red-600" />
        <KadStat tajuk="Ahli Dipaparkan" nilai={matriks.length} />
      </div>

      <input className="input max-w-xs" placeholder="Cari ahli..." value={cari} onChange={(e) => setCari(e.target.value)} />

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="sticky left-0 bg-slate-50 px-4 py-3 text-left font-medium">Ahli</th>
                {BULAN.map((b) => <th key={b} className="px-2 py-3 font-medium">{b.substring(0, 3)}</th>)}
                <th className="px-4 py-3 text-right font-medium">Tertunggak</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {matriks.length === 0 ? (
                <tr><td colSpan={14} className="px-4 py-10 text-center text-slate-400">
                  Tiada rekod. Klik "Jana Yuran {tahun}" untuk mula.
                </td></tr>
              ) : matriks.map((m) => (
                <tr key={m.ahli._baris} className="hover:bg-slate-50">
                  <td className="sticky left-0 bg-white px-4 py-2">
                    <p className="whitespace-nowrap font-medium text-slate-800">{m.ahli.Nama}</p>
                    <p className="text-xs text-slate-500">{m.ahli.Jabatan || m.ahli.Kategori}</p>
                  </td>
                  {m.bulan.map((b) => (
                    <td key={b.b} className="px-2 py-2 text-center">
                      <span title={`${BULAN[b.b - 1]} · ${b.status}`} className={`inline-block h-6 w-6 rounded ${
                        b.status === 'Sudah Bayar' ? 'bg-emerald-500'
                          : b.status === 'Pending' ? 'bg-amber-400'
                          : 'bg-slate-200'
                      }`} />
                    </td>
                  ))}
                  <td className={`whitespace-nowrap px-4 py-2 text-right font-medium ${
                    m.tunggak > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{rm(m.tunggak)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-emerald-500" /> Sudah Bayar</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-amber-400" /> Menunggu Pengesahan</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-slate-200" /> Belum Bayar</span>
      </div>
    </div>
  )
}
