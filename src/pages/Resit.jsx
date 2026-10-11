import React, { useEffect, useMemo, useState } from 'react'
import { panggil } from '../lib/api'
import { rm, tarikhMY, hariIni, KAEDAH_BAYARAN, muatTurunCSV } from '../lib/utils'
import { Jadual, Modal, Medan, Pilihan, Spinner, useToast } from '../components/ui'
import DokumenCetak from '../components/DokumenCetak'

const KOSONG = {
  tarikh: hariIni(), daripadaNama: '', perkara: '', amaun: '',
  kaedah: 'Tunai', rujukanMasukID: '', catatan: ''
}

export default function Resit() {
  const toast = useToast()
  const [data, setData] = useState(null)
  const [cari, setCari] = useState('')
  const [borang, setBorang] = useState(null)
  const [cetak, setCetak] = useState(null)
  const [sedang, setSedang] = useState(false)

  const muat = () => {
    setData(null)
    panggil('senarai', { tab: 'Resit' })
      .then((s) => (s.ok ? setData(s.data.reverse()) : toast(s.mesej, 'ralat')))
      .catch((e) => toast(e.message, 'ralat'))
  }
  useEffect(muat, [])

  const ditapis = useMemo(() => {
    if (!data) return []
    if (!cari) return data
    const t = cari.toLowerCase()
    return data.filter((d) => [d.NoResit, d.DaripadaNama, d.Perkara].some((v) => String(v || '').toLowerCase().includes(t)))
  }, [data, cari])

  const jana = async (e) => {
    e.preventDefault()
    setSedang(true)
    try {
      const r = await panggil('janaResit', borang)
      if (r.ok) { toast('Resit ' + r.noResit + ' dijana', 'ok'); setBorang(null); muat() }
      else toast(r.mesej, 'ralat')
    } catch (err) { toast(err.message, 'ralat') }
    setSedang(false)
  }

  const padam = async (baris) => {
    if (!confirm('Padam resit ini?')) return
    const r = await panggil('padamBaris', { tab: 'Resit', baris })
    r.ok ? (toast('Resit dipadam', 'ok'), muat()) : toast(r.mesej, 'ralat')
  }

  if (!data) return <Spinner />

  if (cetak) {
    return (
      <div>
        <div className="mb-4 flex gap-2 no-print">
          <button className="btn-ghost btn-sm" onClick={() => setCetak(null)}>← Kembali</button>
          <button className="btn-primary btn-sm" onClick={() => window.print()}>Cetak / Simpan PDF</button>
        </div>
        <DokumenCetak jenis="resit" dok={cetak} />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Resit</h1>
          <p className="text-sm text-slate-500">
            {ditapis.length} resit · Resit untuk bayaran ahli dijana automatik semasa pengesahan
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost btn-sm" onClick={() => muatTurunCSV('resit.csv',
            ['NoResit', 'Tarikh', 'DaripadaNama', 'Perkara', 'Amaun'], ditapis)}>Muat Turun CSV</button>
          <button className="btn-primary btn-sm" onClick={() => setBorang({ ...KOSONG })}>+ Resit Manual</button>
        </div>
      </div>

      <input className="input max-w-xs" placeholder="Cari no. resit / nama..."
        value={cari} onChange={(e) => setCari(e.target.value)} />

      <Jadual kepala={['No. Resit', 'Tarikh', 'Daripada', 'Perkara', 'Amaun', 'Tindakan']}>
        {ditapis.map((d) => (
          <tr key={d.NoResit} className="hover:bg-slate-50">
            <td className="whitespace-nowrap px-4 py-3 font-medium text-brand-700">{d.NoResit}</td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{tarikhMY(d.Tarikh)}</td>
            <td className="px-4 py-3 text-slate-700">{d.DaripadaNama}</td>
            <td className="px-4 py-3 text-slate-600">{d.Perkara}</td>
            <td className="whitespace-nowrap px-4 py-3 font-medium">{rm(d.Amaun)}</td>
            <td className="whitespace-nowrap px-4 py-3">
              <div className="flex gap-1">
                <button className="btn-ghost btn-sm" onClick={() => setCetak(d)}>Cetak</button>
                <button className="btn-ghost btn-sm text-red-600" onClick={() => padam(d._baris)}>Padam</button>
              </div>
            </td>
          </tr>
        ))}
      </Jadual>

      <Modal buka={!!borang} tutup={() => setBorang(null)} tajuk="Jana Resit Manual">
        {borang && (
          <form onSubmit={jana} className="grid gap-4 sm:grid-cols-2">
            <Medan label="Tarikh">
              <input type="date" className="input" value={borang.tarikh}
                onChange={(e) => setBorang({ ...borang, tarikh: e.target.value })} required />
            </Medan>
            <Medan label="Amaun (RM)">
              <input type="number" step="0.01" min="0" className="input" value={borang.amaun}
                onChange={(e) => setBorang({ ...borang, amaun: e.target.value })} required />
            </Medan>
            <Medan label="Diterima Daripada" jajar="sm:col-span-2">
              <input className="input" value={borang.daripadaNama}
                onChange={(e) => setBorang({ ...borang, daripadaNama: e.target.value })} required />
            </Medan>
            <Medan label="Perkara" jajar="sm:col-span-2">
              <input className="input" value={borang.perkara}
                onChange={(e) => setBorang({ ...borang, perkara: e.target.value })} required />
            </Medan>
            <Medan label="Kaedah Bayaran">
              <Pilihan nilai={borang.kaedah} kosong={null} senarai={KAEDAH_BAYARAN}
                tukar={(v) => setBorang({ ...borang, kaedah: v })} />
            </Medan>
            <Medan label="Rujukan Duit Masuk (pilihan)">
              <input className="input" value={borang.rujukanMasukID}
                onChange={(e) => setBorang({ ...borang, rujukanMasukID: e.target.value })} />
            </Medan>
            <Medan label="Catatan" jajar="sm:col-span-2">
              <input className="input" value={borang.catatan}
                onChange={(e) => setBorang({ ...borang, catatan: e.target.value })} />
            </Medan>
            <div className="sm:col-span-2 flex gap-2">
              <button className="btn-primary flex-1" disabled={sedang}>{sedang ? 'Menjana...' : 'Jana Resit'}</button>
              <button type="button" className="btn-ghost" onClick={() => setBorang(null)}>Batal</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
