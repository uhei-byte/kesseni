import React, { useEffect, useState, useMemo } from 'react'
import { panggil, failKeBase64 } from '../lib/api'
import { rm, tarikhMY, hariIni, KATEGORI_KELUAR, KAEDAH_BAYARAN, muatTurunCSV } from '../lib/utils'
import { Jadual, Modal, Medan, Pilihan, Spinner, useToast } from '../components/ui'
import LihatResit from '../components/LihatResit'

const KOSONG = {
  Tarikh: hariIni(), Kategori: 'Bayaran', Perkara: '', PenerimaNama: '',
  Amaun: '', KaedahBayaran: 'Pindahan Bank', Catatan: ''
}

export default function DuitKeluar() {
  const toast = useToast()
  const [data, setData] = useState(null)
  const [cari, setCari] = useState('')
  const [tapisKategori, setTapisKategori] = useState('')
  const [borang, setBorang] = useState(null)
  const [fail, setFail] = useState(null)
  const [simpanSedang, setSimpanSedang] = useState(false)
  const [lihatFail, setLihatFail] = useState('')

  const muat = () => {
    setData(null)
    panggil('senarai', { tab: 'DuitKeluar' })
      .then((r) => (r.ok ? setData(r.data.reverse()) : toast(r.mesej, 'ralat')))
      .catch((e) => toast(e.message, 'ralat'))
  }
  useEffect(muat, [])

  const ditapis = useMemo(() => {
    if (!data) return []
    return data.filter((d) => {
      if (tapisKategori && d.Kategori !== tapisKategori) return false
      if (cari) {
        const t = cari.toLowerCase()
        return [d.Perkara, d.PenerimaNama, d.ID].some((v) => String(v || '').toLowerCase().includes(t))
      }
      return true
    })
  }, [data, cari, tapisKategori])

  const jumlah = ditapis.reduce((s, d) => s + Number(d.Amaun || 0), 0)

  const simpan = async (e) => {
    e.preventDefault()
    setSimpanSedang(true)
    try {
      const lampiran = fail ? await failKeBase64(fail) : null
      const r = await panggil('simpanBaris', {
        tab: 'DuitKeluar', baris: borang._baris, data: borang, fail: lampiran
      })
      if (r.ok) { toast('Rekod disimpan', 'ok'); setBorang(null); setFail(null); muat() }
      else toast(r.mesej, 'ralat')
    } catch (err) { toast(err.message, 'ralat') }
    setSimpanSedang(false)
  }

  const padam = async (baris) => {
    if (!confirm('Padam rekod ini?')) return
    const r = await panggil('padamBaris', { tab: 'DuitKeluar', baris })
    r.ok ? (toast('Rekod dipadam', 'ok'), muat()) : toast(r.mesej, 'ralat')
  }

  if (!data) return <Spinner />

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Duit Keluar</h1>
          <p className="text-sm text-slate-500">{ditapis.length} rekod · Jumlah {rm(jumlah)}</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost btn-sm"
            onClick={() => muatTurunCSV('duit-keluar.csv', Object.keys(KOSONG), ditapis)}>Muat Turun CSV</button>
          <button className="btn-primary btn-sm" onClick={() => { setBorang({ ...KOSONG }); setFail(null) }}>
            + Rekod Baharu
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <input className="input max-w-xs" placeholder="Cari perkara / penerima..."
          value={cari} onChange={(e) => setCari(e.target.value)} />
        <select className="input max-w-[180px]" value={tapisKategori} onChange={(e) => setTapisKategori(e.target.value)}>
          <option value="">Semua Kategori</option>
          {KATEGORI_KELUAR.map((k) => <option key={k}>{k}</option>)}
        </select>
      </div>

      <Jadual kepala={['Tarikh', 'Perkara', 'Penerima', 'Kategori', 'Amaun', 'Tindakan']}>
        {ditapis.map((d) => (
          <tr key={d.ID + d._baris} className="hover:bg-slate-50">
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{tarikhMY(d.Tarikh)}</td>
            <td className="px-4 py-3">
              <p className="font-medium text-slate-800">{d.Perkara}</p>
              {d.Catatan && <p className="text-xs text-slate-500">{d.Catatan}</p>}
            </td>
            <td className="px-4 py-3 text-slate-600">{d.PenerimaNama || '-'}</td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{d.Kategori}</td>
            <td className="whitespace-nowrap px-4 py-3 font-medium text-red-600">{rm(d.Amaun)}</td>
            <td className="whitespace-nowrap px-4 py-3">
              <div className="flex gap-1">
                {d.ResitFileId && <button className="btn-ghost btn-sm" onClick={() => setLihatFail(d.ResitFileId)}>Bukti</button>}
                <button className="btn-ghost btn-sm" onClick={() => { setBorang({ ...d }); setFail(null) }}>Edit</button>
                <button className="btn-ghost btn-sm text-red-600" onClick={() => padam(d._baris)}>Padam</button>
              </div>
            </td>
          </tr>
        ))}
      </Jadual>

      <LihatResit fileId={lihatFail} tutup={() => setLihatFail('')} />

      <Modal buka={!!borang} tutup={() => setBorang(null)}
        tajuk={borang?._baris ? 'Kemaskini Rekod' : 'Rekod Duit Keluar Baharu'}>
        {borang && (
          <form onSubmit={simpan} className="grid gap-4 sm:grid-cols-2">
            <Medan label="Tarikh">
              <input type="date" className="input" value={String(borang.Tarikh).substring(0, 10)}
                onChange={(e) => setBorang({ ...borang, Tarikh: e.target.value })} required />
            </Medan>
            <Medan label="Kategori">
              <Pilihan nilai={borang.Kategori} kosong={null} senarai={KATEGORI_KELUAR}
                tukar={(v) => setBorang({ ...borang, Kategori: v })} />
            </Medan>
            <Medan label="Perkara / Tujuan" jajar="sm:col-span-2">
              <input className="input" value={borang.Perkara}
                onChange={(e) => setBorang({ ...borang, Perkara: e.target.value })} required />
            </Medan>
            <Medan label="Dibayar Kepada">
              <input className="input" value={borang.PenerimaNama}
                onChange={(e) => setBorang({ ...borang, PenerimaNama: e.target.value })} />
            </Medan>
            <Medan label="Amaun (RM)">
              <input type="number" step="0.01" min="0" className="input" value={borang.Amaun}
                onChange={(e) => setBorang({ ...borang, Amaun: e.target.value })} required />
            </Medan>
            <Medan label="Kaedah Bayaran">
              <Pilihan nilai={borang.KaedahBayaran} kosong={null} senarai={KAEDAH_BAYARAN}
                tukar={(v) => setBorang({ ...borang, KaedahBayaran: v })} />
            </Medan>
            <Medan label="Resit / Invois (pilihan)">
              <input type="file" accept="image/*,application/pdf" className="input"
                onChange={(e) => setFail(e.target.files[0] || null)} />
            </Medan>
            <Medan label="Catatan" jajar="sm:col-span-2">
              <textarea className="input" rows={2} value={borang.Catatan}
                onChange={(e) => setBorang({ ...borang, Catatan: e.target.value })} />
            </Medan>
            <div className="sm:col-span-2 flex gap-2">
              <button className="btn-primary flex-1" disabled={simpanSedang}>
                {simpanSedang ? 'Menyimpan...' : 'Simpan'}
              </button>
              <button type="button" className="btn-ghost" onClick={() => setBorang(null)}>Batal</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
