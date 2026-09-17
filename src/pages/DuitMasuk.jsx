import React, { useEffect, useState, useMemo } from 'react'
import { panggil, failKeBase64 } from '../lib/api'
import { rm, tarikhMY, warnaStatus, hariIni, KATEGORI_MASUK, KAEDAH_BAYARAN, muatTurunCSV, BULAN } from '../lib/utils'
import { Jadual, Modal, Medan, Pilihan, Spinner, useToast } from '../components/ui'
import LihatResit from '../components/LihatResit'

const BORANG_KOSONG = {
  Tarikh: hariIni(), Kategori: 'Sumbangan', NoKP: '', Nama: '', Keterangan: '',
  Amaun: '', KaedahBayaran: 'Tunai', Status: 'Confirmed', TahunYuran: '', BulanYuran: '', Catatan: ''
}

export default function DuitMasuk() {
  const toast = useToast()
  const [data, setData] = useState(null)
  const [tapisStatus, setTapisStatus] = useState('')
  const [cari, setCari] = useState('')
  const [lihatFail, setLihatFail] = useState('')
  const [borang, setBorang] = useState(null)
  const [fail, setFail] = useState(null)
  const [sedangSimpan, setSedangSimpan] = useState(false)
  const [verify, setVerify] = useState(null)
  const [catatanVerify, setCatatanVerify] = useState('')

  const muat = () => {
    setData(null)
    panggil('senarai', { tab: 'DuitMasuk' })
      .then((r) => (r.ok ? setData(r.data.reverse()) : toast(r.mesej, 'ralat')))
      .catch((e) => toast(e.message, 'ralat'))
  }
  useEffect(muat, [])

  const ditapis = useMemo(() => {
    if (!data) return []
    return data.filter((d) => {
      if (tapisStatus && d.Status !== tapisStatus) return false
      if (cari) {
        const t = cari.toLowerCase()
        return [d.Nama, d.NoKP, d.Keterangan, d.ID, d.NoResit]
          .some((v) => String(v || '').toLowerCase().includes(t))
      }
      return true
    })
  }, [data, tapisStatus, cari])

  const jumlah = ditapis.filter((d) => d.Status === 'Confirmed')
    .reduce((s, d) => s + Number(d.Amaun || 0), 0)

  const simpan = async (e) => {
    e.preventDefault()
    setSedangSimpan(true)
    try {
      const lampiran = fail ? await failKeBase64(fail) : null
      const r = await panggil('simpanBaris', {
        tab: 'DuitMasuk', baris: borang._baris, data: borang, fail: lampiran
      })
      if (r.ok) { toast('Rekod disimpan', 'ok'); setBorang(null); setFail(null); muat() }
      else toast(r.mesej, 'ralat')
    } catch (err) { toast(err.message, 'ralat') }
    setSedangSimpan(false)
  }

  const buatVerify = async (keputusan) => {
    setSedangSimpan(true)
    try {
      const r = await panggil('verifyBayaran', { id: verify.ID, keputusan, catatan: catatanVerify })
      if (r.ok) {
        toast(r.mesej + (r.noResit ? ` · Resit ${r.noResit}` : ''), 'ok')
        setVerify(null); setCatatanVerify(''); muat()
      } else toast(r.mesej, 'ralat')
    } catch (err) { toast(err.message, 'ralat') }
    setSedangSimpan(false)
  }

  const padam = async (baris) => {
    if (!confirm('Padam rekod ini? Tindakan ini tidak boleh dibatalkan.')) return
    const r = await panggil('padamBaris', { tab: 'DuitMasuk', baris })
    r.ok ? (toast('Rekod dipadam', 'ok'), muat()) : toast(r.mesej, 'ralat')
  }

  if (!data) return <Spinner />

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Duit Masuk</h1>
          <p className="text-sm text-slate-500">
            {ditapis.length} rekod · Jumlah disahkan {rm(jumlah)}
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost btn-sm"
            onClick={() => muatTurunCSV('duit-masuk.csv', Object.keys(BORANG_KOSONG), ditapis)}>
            Muat Turun CSV
          </button>
          <button className="btn-primary btn-sm" onClick={() => { setBorang({ ...BORANG_KOSONG }); setFail(null) }}>
            + Rekod Baharu
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <input className="input max-w-xs" placeholder="Cari nama / IC / rujukan..."
          value={cari} onChange={(e) => setCari(e.target.value)} />
        <select className="input max-w-[180px]" value={tapisStatus} onChange={(e) => setTapisStatus(e.target.value)}>
          <option value="">Semua Status</option>
          <option>Pending</option><option>Confirmed</option><option>Ditolak</option>
        </select>
      </div>

      <Jadual kepala={['Tarikh', 'Nama / Keterangan', 'Kategori', 'Amaun', 'Status', 'Resit', 'Tindakan']}>
        {ditapis.map((d) => (
          <tr key={d.ID + d._baris} className="hover:bg-slate-50">
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{tarikhMY(d.Tarikh)}</td>
            <td className="px-4 py-3">
              <p className="font-medium text-slate-800">{d.Nama || '-'}</p>
              <p className="text-xs text-slate-500">{d.Keterangan || d.ID}</p>
            </td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{d.Kategori}</td>
            <td className="whitespace-nowrap px-4 py-3 font-medium">{rm(d.Amaun)}</td>
            <td className="px-4 py-3"><span className={`badge ${warnaStatus(d.Status)}`}>{d.Status}</span></td>
            <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{d.NoResit || '-'}</td>
            <td className="whitespace-nowrap px-4 py-3">
              <div className="flex gap-1">
                {d.ResitFileId && (
                  <button className="btn-ghost btn-sm" onClick={() => setLihatFail(d.ResitFileId)}>Bukti</button>
                )}
                {d.Status === 'Pending' && (
                  <button className="btn-primary btn-sm" onClick={() => { setVerify(d); setCatatanVerify('') }}>Sahkan</button>
                )}
                <button className="btn-ghost btn-sm" onClick={() => { setBorang({ ...d }); setFail(null) }}>Edit</button>
                <button className="btn-ghost btn-sm text-red-600" onClick={() => padam(d._baris)}>Padam</button>
              </div>
            </td>
          </tr>
        ))}
      </Jadual>

      <LihatResit fileId={lihatFail} tutup={() => setLihatFail('')} />

      {/* Modal verify */}
      <Modal buka={!!verify} tutup={() => setVerify(null)} tajuk="Sahkan Bayaran" saiz="max-w-lg">
        {verify && (
          <div className="space-y-4">
            <div className="rounded-lg bg-slate-50 p-4 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <span className="text-slate-500">Ahli</span><span className="font-medium">{verify.Nama}</span>
                <span className="text-slate-500">Kategori</span><span>{verify.Kategori}</span>
                <span className="text-slate-500">Amaun</span><span className="font-medium">{rm(verify.Amaun)}</span>
                <span className="text-slate-500">Tarikh</span><span>{tarikhMY(verify.Tarikh)}</span>
                {verify.BulanYuran && (
                  <>
                    <span className="text-slate-500">Bulan yuran</span>
                    <span>{String(verify.BulanYuran).split(',').map((b) => BULAN[Number(b) - 1]?.substring(0, 3)).join(', ')} {verify.TahunYuran}</span>
                  </>
                )}
              </div>
            </div>
            {verify.ResitFileId && (
              <button className="btn-ghost w-full" onClick={() => setLihatFail(verify.ResitFileId)}>
                Lihat bukti pembayaran
              </button>
            )}
            <Medan label="Catatan (pilihan — akan dihantar dalam emel kepada ahli)">
              <textarea className="input" rows={2} value={catatanVerify} onChange={(e) => setCatatanVerify(e.target.value)} />
            </Medan>
            <div className="flex gap-2">
              <button className="btn-primary flex-1" disabled={sedangSimpan} onClick={() => buatVerify('Confirmed')}>
                Sahkan &amp; Jana Resit
              </button>
              <button className="btn-danger flex-1" disabled={sedangSimpan} onClick={() => buatVerify('Ditolak')}>
                Tolak
              </button>
            </div>
            <p className="text-center text-xs text-slate-500">
              Emel pengesahan akan dihantar automatik kepada ahli.
            </p>
          </div>
        )}
      </Modal>

      {/* Modal borang */}
      <Modal buka={!!borang} tutup={() => setBorang(null)}
        tajuk={borang?._baris ? 'Kemaskini Rekod' : 'Rekod Duit Masuk Baharu'}>
        {borang && (
          <form onSubmit={simpan} className="grid gap-4 sm:grid-cols-2">
            <Medan label="Tarikh">
              <input type="date" className="input" value={String(borang.Tarikh).substring(0, 10)}
                onChange={(e) => setBorang({ ...borang, Tarikh: e.target.value })} required />
            </Medan>
            <Medan label="Kategori">
              <Pilihan nilai={borang.Kategori} kosong={null} senarai={KATEGORI_MASUK}
                tukar={(v) => setBorang({ ...borang, Kategori: v })} />
            </Medan>
            <Medan label="Nama Penyumbang / Ahli">
              <input className="input" value={borang.Nama}
                onChange={(e) => setBorang({ ...borang, Nama: e.target.value })} required />
            </Medan>
            <Medan label="No. Kad Pengenalan (jika ahli)">
              <input className="input" value={borang.NoKP}
                onChange={(e) => setBorang({ ...borang, NoKP: e.target.value })} />
            </Medan>
            <Medan label="Amaun (RM)">
              <input type="number" step="0.01" min="0" className="input" value={borang.Amaun}
                onChange={(e) => setBorang({ ...borang, Amaun: e.target.value })} required />
            </Medan>
            <Medan label="Kaedah Bayaran">
              <Pilihan nilai={borang.KaedahBayaran} kosong={null} senarai={KAEDAH_BAYARAN}
                tukar={(v) => setBorang({ ...borang, KaedahBayaran: v })} />
            </Medan>
            <Medan label="Keterangan" jajar="sm:col-span-2">
              <input className="input" value={borang.Keterangan}
                onChange={(e) => setBorang({ ...borang, Keterangan: e.target.value })} />
            </Medan>
            {borang.Kategori === 'Yuran Ahli' && (
              <>
                <Medan label="Tahun Yuran">
                  <input className="input" placeholder="2026" value={borang.TahunYuran}
                    onChange={(e) => setBorang({ ...borang, TahunYuran: e.target.value })} />
                </Medan>
                <Medan label="Bulan (nombor, pisah koma. Cth: 1,2,3)">
                  <input className="input" value={borang.BulanYuran}
                    onChange={(e) => setBorang({ ...borang, BulanYuran: e.target.value })} />
                </Medan>
              </>
            )}
            <Medan label="Status">
              <Pilihan nilai={borang.Status} kosong={null} senarai={['Confirmed', 'Pending', 'Ditolak']}
                tukar={(v) => setBorang({ ...borang, Status: v })} />
            </Medan>
            <Medan label="Bukti / Resit (pilihan)">
              <input type="file" accept="image/*,application/pdf" className="input"
                onChange={(e) => setFail(e.target.files[0] || null)} />
            </Medan>
            <div className="sm:col-span-2 flex gap-2">
              <button className="btn-primary flex-1" disabled={sedangSimpan}>
                {sedangSimpan ? 'Menyimpan...' : 'Simpan'}
              </button>
              <button type="button" className="btn-ghost" onClick={() => setBorang(null)}>Batal</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
