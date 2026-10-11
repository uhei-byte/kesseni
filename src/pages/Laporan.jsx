import React, { useEffect, useState } from 'react'
import { panggil } from '../lib/api'
import { rm, tarikhMY, muatTurunCSV } from '../lib/utils'
import { KadStat, Spinner, useToast, Jadual } from '../components/ui'

function awalTahun() {
  return `${new Date().getFullYear()}-01-01`
}
function hujungTahun() {
  return `${new Date().getFullYear()}-12-31`
}

export default function Laporan() {
  const toast = useToast()
  const [dari, setDari] = useState(awalTahun())
  const [hingga, setHingga] = useState(hujungTahun())
  const [data, setData] = useState(null)
  const [memuat, setMemuat] = useState(false)

  const jana = async () => {
    setMemuat(true)
    try {
      const r = await panggil('laporan', { dari, hingga })
      r.ok ? setData(r) : toast(r.mesej, 'ralat')
    } catch (e) { toast(e.message, 'ralat') }
    setMemuat(false)
  }
  useEffect(() => { jana() }, [])

  return (
    <div className="space-y-4">
      <div className="no-print">
        <h1 className="text-xl font-semibold text-slate-800">Laporan Kewangan</h1>
        <p className="text-sm text-slate-500">Penyata pendapatan dan perbelanjaan mengikut tempoh</p>
      </div>

      <div className="card flex flex-wrap items-end gap-3 p-4 no-print">
        <div>
          <label className="label">Dari</label>
          <input type="date" className="input" value={dari} onChange={(e) => setDari(e.target.value)} />
        </div>
        <div>
          <label className="label">Hingga</label>
          <input type="date" className="input" value={hingga} onChange={(e) => setHingga(e.target.value)} />
        </div>
        <button className="btn-primary" onClick={jana} disabled={memuat}>
          {memuat ? 'Menjana...' : 'Jana Laporan'}
        </button>
        <button className="btn-ghost" onClick={() => window.print()}>Cetak / PDF</button>
      </div>

      {memuat && <Spinner />}

      {data && !memuat && (
        <div className="print-area space-y-4">
          <div className="hidden print:block">
            <h2 className="text-lg font-bold">Penyata Kewangan KESSENI</h2>
            <p className="text-sm text-slate-600">
              Tempoh: {tarikhMY(data.dari)} hingga {tarikhMY(data.hingga)}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <KadStat tajuk="Jumlah Pendapatan" nilai={rm(data.jumlahMasuk)} warna="text-emerald-600" />
            <KadStat tajuk="Jumlah Perbelanjaan" nilai={rm(data.jumlahKeluar)} warna="text-red-600" />
            <KadStat tajuk="Lebihan / Kurangan" nilai={rm(data.baki)}
              warna={data.baki >= 0 ? 'text-brand-700' : 'text-red-600'} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="card p-4">
              <h3 className="mb-3 font-medium text-slate-800">Pendapatan Ikut Kategori</h3>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-slate-100">
                  {data.masukIkutKategori.map((k) => (
                    <tr key={k.kategori}>
                      <td className="py-2 text-slate-600">{k.kategori}</td>
                      <td className="py-2 text-right font-medium">{rm(k.amaun)}</td>
                    </tr>
                  ))}
                  <tr className="font-semibold">
                    <td className="py-2">Jumlah</td>
                    <td className="py-2 text-right text-emerald-700">{rm(data.jumlahMasuk)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="card p-4">
              <h3 className="mb-3 font-medium text-slate-800">Perbelanjaan Ikut Kategori</h3>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-slate-100">
                  {data.keluarIkutKategori.map((k) => (
                    <tr key={k.kategori}>
                      <td className="py-2 text-slate-600">{k.kategori}</td>
                      <td className="py-2 text-right font-medium">{rm(k.amaun)}</td>
                    </tr>
                  ))}
                  <tr className="font-semibold">
                    <td className="py-2">Jumlah</td>
                    <td className="py-2 text-right text-red-700">{rm(data.jumlahKeluar)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end gap-2 no-print">
            <button className="btn-ghost btn-sm" onClick={() => muatTurunCSV('laporan-masuk.csv',
              ['Tarikh', 'Kategori', 'Nama', 'Keterangan', 'Amaun', 'NoResit'], data.masuk)}>
              CSV Pendapatan
            </button>
            <button className="btn-ghost btn-sm" onClick={() => muatTurunCSV('laporan-keluar.csv',
              ['Tarikh', 'Kategori', 'Perkara', 'PenerimaNama', 'Amaun'], data.keluar)}>
              CSV Perbelanjaan
            </button>
          </div>

          <Jadual kepala={['Tarikh', 'Jenis', 'Keterangan', 'Kategori', 'Amaun']}>
            {[...data.masuk.map((m) => ({ ...m, _jenis: 'Masuk' })),
              ...data.keluar.map((k) => ({ ...k, _jenis: 'Keluar' }))]
              .sort((a, b) => String(a.Tarikh).localeCompare(String(b.Tarikh)))
              .map((t, i) => (
                <tr key={i}>
                  <td className="whitespace-nowrap px-4 py-2 text-slate-600">{tarikhMY(t.Tarikh)}</td>
                  <td className="px-4 py-2">
                    <span className={`badge ${t._jenis === 'Masuk' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                      {t._jenis}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-slate-700">{t.Nama || t.Perkara || t.Keterangan || '-'}</td>
                  <td className="px-4 py-2 text-slate-600">{t.Kategori}</td>
                  <td className={`whitespace-nowrap px-4 py-2 text-right font-medium ${
                    t._jenis === 'Masuk' ? 'text-emerald-700' : 'text-red-700'}`}>{rm(t.Amaun)}</td>
                </tr>
              ))}
          </Jadual>
        </div>
      )}
    </div>
  )
}
