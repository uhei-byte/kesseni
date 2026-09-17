import React, { useEffect, useMemo, useState } from 'react'
import { panggil } from '../lib/api'
import { rm, tarikhMY, warnaStatus, hariIni, muatTurunCSV } from '../lib/utils'
import { Jadual, Modal, Medan, Pilihan, Spinner, useToast } from '../components/ui'
import DokumenCetak from '../components/DokumenCetak'

const KOSONG = {
  tarikh: hariIni(), kepadaNama: '', kepadaAlamat: '', kepadaEmel: '',
  perkara: '', amaun: '', catatan: '', hantarEmel: false
}

export default function Invois() {
  const toast = useToast()
  const [data, setData] = useState(null)
  const [cari, setCari] = useState('')
  const [borang, setBorang] = useState(null)
  const [cetak, setCetak] = useState(null)
  const [sedang, setSedang] = useState(false)

  const muat = () => {
    setData(null)
    panggil('senarai', { tab: 'Invois' })
      .then((i) => (i.ok ? setData(i.data.reverse()) : toast(i.mesej, 'ralat')))
      .catch((e) => toast(e.message, 'ralat'))
  }
  useEffect(muat, [])

  const ditapis = useMemo(() => {
    if (!data) return []
    if (!cari) return data
    const t = cari.toLowerCase()
    return data.filter((d) => [d.NoInvois, d.KepadaNama, d.Perkara].some((v) => String(v || '').toLowerCase().includes(t)))
  }, [data, cari])

  const jana = async (e) => {
    e.preventDefault()
    setSedang(true)
    try {
      const r = await panggil('janaInvois', borang)
      if (r.ok) { toast('Invois ' + r.noInvois + ' dijana', 'ok'); setBorang(null); muat() }
      else toast(r.mesej, 'ralat')
    } catch (err) { toast(err.message, 'ralat') }
    setSedang(false)
  }

  const tukarStatus = async (inv, status) => {
    const r = await panggil('simpanBaris', {
      tab: 'Invois', baris: inv._baris,
      data: { Status: status, TarikhBayar: status === 'Sudah Bayar' ? hariIni() : '' }
    })
    r.ok ? (toast('Status dikemaskini', 'ok'), muat()) : toast(r.mesej, 'ralat')
  }

  const padam = async (baris) => {
    if (!confirm('Padam invois ini?')) return
    const r = await panggil('padamBaris', { tab: 'Invois', baris })
    r.ok ? (toast('Invois dipadam', 'ok'), muat()) : toast(r.mesej, 'ralat')
  }

  if (!data) return <Spinner />

  if (cetak) {
    return (
      <div>
        <div className="mb-4 flex gap-2 no-print">
          <button className="btn-ghost btn-sm" onClick={() => setCetak(null)}>← Kembali</button>
          <button className="btn-primary btn-sm" onClick={() => window.print()}>Cetak / Simpan PDF</button>
        </div>
        <DokumenCetak jenis="invois" dok={cetak} />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Invois</h1>
          <p className="text-sm text-slate-500">{ditapis.length} invois</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost btn-sm" onClick={() => muatTurunCSV('invois.csv',
            ['NoInvois', 'Tarikh', 'KepadaNama', 'Perkara', 'Amaun', 'Status'], ditapis)}>Muat Turun CSV</button>
          <button className="btn-primary btn-sm" onClick={() => setBorang({ ...KOSONG })}>+ Invois Baharu</button>
        </div>
      </div>

      <input className="input max-w-xs" placeholder="Cari no. invois / nama..."
        value={cari} onChange={(e) => setCari(e.target.value)} />

      <Jadual kepala={['No. Invois', 'Tarikh', 'Kepada', 'Perkara', 'Amaun', 'Status', 'Tindakan']}>
        {ditapis.map((d) => (
          <tr key={d.NoInvois} className="hover:bg-slate-50">
            <td className="whitespace-nowrap px-4 py-3 font-medium text-brand-700">{d.NoInvois}</td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{tarikhMY(d.Tarikh)}</td>
            <td className="px-4 py-3 text-slate-700">{d.KepadaNama}</td>
            <td className="px-4 py-3 text-slate-600">{d.Perkara}</td>
            <td className="whitespace-nowrap px-4 py-3 font-medium">{rm(d.Amaun)}</td>
            <td className="px-4 py-3">
              <select className={`badge cursor-pointer border-0 ${warnaStatus(d.Status)}`}
                value={d.Status} onChange={(e) => tukarStatus(d, e.target.value)}>
                <option>Belum Bayar</option><option>Sudah Bayar</option><option>Batal</option>
              </select>
            </td>
            <td className="whitespace-nowrap px-4 py-3">
              <div className="flex gap-1">
                <button className="btn-ghost btn-sm" onClick={() => setCetak(d)}>Cetak</button>
                <button className="btn-ghost btn-sm text-red-600" onClick={() => padam(d._baris)}>Padam</button>
              </div>
            </td>
          </tr>
        ))}
      </Jadual>

      <Modal buka={!!borang} tutup={() => setBorang(null)} tajuk="Jana Invois Baharu">
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
            <Medan label="Kepada (Nama)" jajar="sm:col-span-2">
              <input className="input" value={borang.kepadaNama}
                onChange={(e) => setBorang({ ...borang, kepadaNama: e.target.value })} required />
            </Medan>
            <Medan label="Alamat" jajar="sm:col-span-2">
              <textarea className="input" rows={2} value={borang.kepadaAlamat}
                onChange={(e) => setBorang({ ...borang, kepadaAlamat: e.target.value })} />
            </Medan>
            <Medan label="Emel Penerima">
              <input type="email" className="input" value={borang.kepadaEmel}
                onChange={(e) => setBorang({ ...borang, kepadaEmel: e.target.value })} />
            </Medan>
            <Medan label="Hantar emel invois?">
              <Pilihan nilai={borang.hantarEmel ? 'YA' : 'TIDAK'} kosong={null} senarai={['TIDAK', 'YA']}
                tukar={(v) => setBorang({ ...borang, hantarEmel: v === 'YA' })} />
            </Medan>
            <Medan label="Perkara" jajar="sm:col-span-2">
              <input className="input" value={borang.perkara}
                onChange={(e) => setBorang({ ...borang, perkara: e.target.value })} required />
            </Medan>
            <Medan label="Catatan" jajar="sm:col-span-2">
              <input className="input" value={borang.catatan}
                onChange={(e) => setBorang({ ...borang, catatan: e.target.value })} />
            </Medan>
            <div className="sm:col-span-2 flex gap-2">
              <button className="btn-primary flex-1" disabled={sedang}>{sedang ? 'Menjana...' : 'Jana Invois'}</button>
              <button type="button" className="btn-ghost" onClick={() => setBorang(null)}>Batal</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
