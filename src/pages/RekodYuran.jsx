import React, { useEffect, useMemo, useState } from 'react'
import { panggil, failKeBase64, ambilSesi, AKSES } from '../lib/api'
import { rm, BULAN, KAEDAH_BAYARAN, hariIni, muatTurunCSV } from '../lib/utils'
import { Spinner, useToast, KadStat, Modal, Medan, Pilihan } from '../components/ui'

const TAHUN_INI = new Date().getFullYear()

export default function RekodYuran() {
  const toast = useToast()
  const { role } = ambilSesi()
  const bolehRekod = AKSES.kewangan.includes(role)

  const [tahun, setTahun] = useState(TAHUN_INI)
  const [matriks, setMatriks] = useState(null)
  const [jumlah, setJumlah] = useState({ terkumpul: 0, tertunggak: 0 })
  const [cari, setCari] = useState('')
  const [sedang, setSedang] = useState(false)

  const [pilih, setPilih] = useState(null)   // { noKP, nama, baris, bulan: [] }
  const [borang, setBorang] = useState(null)
  const [fail, setFail] = useState(null)
  const [lihat, setLihat] = useState(null)

  /** Semua pengiraan dibuat di server (action matriksYuran) supaya angka di sini
   *  mustahil bercanggah dengan portal ahli dan papan pemuka. */
  const muat = () => {
    setMatriks(null); setPilih(null)
    panggil('matriksYuran', { tahun })
      .then((r) => {
        if (r.ok) {
          setMatriks(r.data)
          setJumlah({ terkumpul: r.jumlahTerkumpul, tertunggak: r.jumlahTertunggak })
        } else { toast(r.mesej, 'ralat'); setMatriks([]) }
      })
      .catch((e) => { toast(e.message, 'ralat'); setMatriks([]) })
  }
  useEffect(muat, [tahun])

  const ditapis = useMemo(() => {
    if (!matriks) return []
    if (!cari) return matriks
    const t = cari.toLowerCase()
    return matriks.filter((m) => [m.nama, m.noKP, m.noAhli]
      .some((v) => String(v || '').toLowerCase().includes(t)))
  }, [matriks, cari])

  const jana = async () => {
    if (!confirm(`Jana rekod yuran "Belum Bayar" untuk semua ahli aktif bagi tahun ${tahun}?`)) return
    setSedang(true)
    try {
      const r = await panggil('janaYuranTahunan', { tahun })
      r.ok ? (toast(r.mesej, 'ok'), muat()) : toast(r.mesej, 'ralat')
    } catch (e) { toast(e.message, 'ralat') }
    setSedang(false)
  }

  const klikSel = (m, sel) => {
    if (sel.status !== 'Belum Bayar') {
      setLihat({ nama: m.nama, tempoh: sel.nama, status: sel.status, amaun: sel.amaun, rujukan: sel.rujukan })
      return
    }
    if (!bolehRekod) return
    setPilih((s) => {
      if (!s || s.noKP !== m.noKP) return { noKP: m.noKP, nama: m.nama, baris: m, bulan: [sel.bulan] }
      const ada = s.bulan.includes(sel.bulan)
      const bulan = ada ? s.bulan.filter((x) => x !== sel.bulan) : [...s.bulan, sel.bulan].sort((a, b) => a - b)
      return bulan.length ? { ...s, bulan } : null
    })
  }

  const bukaBorang = () => {
    if (!pilih) return
    setFail(null)
    setBorang({
      amaun: (pilih.baris.kadar * pilih.bulan.length).toFixed(2),
      kaedah: 'Tunai', tarikh: hariIni(), catatan: ''
    })
  }

  const simpan = async (e) => {
    e.preventDefault()
    setSedang(true)
    try {
      const lampiran = fail ? await failKeBase64(fail) : null
      const r = await panggil('rekodBayaranYuran', {
        noKP: pilih.noKP, tahun, bulan: pilih.bulan,
        amaun: Number(borang.amaun), kaedah: borang.kaedah,
        tarikh: borang.tarikh, catatan: borang.catatan, fail: lampiran
      })
      if (r.ok) { toast(r.mesej, 'ok'); setBorang(null); setPilih(null); setFail(null); muat() }
      else toast(r.mesej, 'ralat')
    } catch (err) { toast(err.message, 'ralat') }
    setSedang(false)
  }

  if (!matriks) return <Spinner />

  const warnaSel = (status) =>
    status === 'Sudah Bayar' ? 'bg-emerald-500'
      : status === 'Pending' ? 'bg-amber-400' : 'bg-slate-200'

  return (
    <div className="space-y-4 pb-24">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Rekod Yuran Ahli</h1>
          <p className="text-sm text-slate-500">
            {bolehRekod
              ? 'Klik tempoh yang belum bayar untuk rekodkan bayaran bagi pihak ahli'
              : 'Status bayaran yuran mengikut tempoh'}
          </p>
        </div>
        <div className="flex gap-2">
          <select className="input w-28" value={tahun} onChange={(e) => setTahun(Number(e.target.value))}>
            {[TAHUN_INI + 1, TAHUN_INI, TAHUN_INI - 1, TAHUN_INI - 2].map((t) => <option key={t}>{t}</option>)}
          </select>
          <button className="btn-ghost btn-sm" onClick={() => muatTurunCSV(
            `rekod-yuran-${tahun}.csv`,
            ['noAhli', 'nama', 'noKP', 'kategori', 'mod', 'kadar', 'terkumpul', 'tertunggak'],
            ditapis
          )}>Muat Turun CSV</button>
          <button className="btn-primary btn-sm" onClick={jana} disabled={sedang}>
            {sedang ? 'Menjana...' : `Jana Yuran ${tahun}`}
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <KadStat tajuk="Yuran Terkumpul" nilai={rm(jumlah.terkumpul)} warna="text-emerald-600" />
        <KadStat tajuk="Yuran Tertunggak" nilai={rm(jumlah.tertunggak)} warna="text-red-600"
          sub="Termasuk tempoh yang rekodnya belum dijana" />
        <KadStat tajuk="Ahli Dipaparkan" nilai={ditapis.length} />
      </div>

      <input className="input max-w-xs" placeholder="Cari ahli / no. keahlian..."
        value={cari} onChange={(e) => setCari(e.target.value)} />

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
              {ditapis.length === 0 ? (
                <tr><td colSpan={14} className="px-4 py-10 text-center text-slate-400">
                  Tiada ahli aktif dijumpai.
                </td></tr>
              ) : ditapis.map((m) => {
                const dipilihAhli = pilih && pilih.noKP === m.noKP
                return (
                  <tr key={m.noKP} className={dipilihAhli ? 'bg-brand-50' : 'hover:bg-slate-50'}>
                    <td className={`sticky left-0 px-4 py-2 ${dipilihAhli ? 'bg-brand-50' : 'bg-white'}`}>
                      <p className="whitespace-nowrap font-medium text-slate-800">{m.nama}</p>
                      <p className="text-xs text-slate-500">
                        {m.noAhli ? m.noAhli + ' · ' : ''}
                        {m.kategori} · {rm(m.kadar)}/{m.mod === 'Tahunan' ? 'tahun' : 'bulan'}
                      </p>
                    </td>

                    {m.mod === 'Tahunan' ? (
                      <td colSpan={12} className="px-2 py-2">
                        <button
                          type="button"
                          onClick={() => klikSel(m, m.sel[0])}
                          disabled={!bolehRekod && m.sel[0].status === 'Belum Bayar'}
                          className={`flex w-full items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-xs transition-colors ${
                            dipilihAhli && pilih.bulan.includes(0)
                              ? 'bg-brand-700 text-white'
                              : m.sel[0].status === 'Sudah Bayar' ? 'bg-emerald-50 text-emerald-800'
                              : m.sel[0].status === 'Pending' ? 'bg-amber-50 text-amber-800'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          <span className={`h-3 w-3 rounded ${
                            dipilihAhli && pilih.bulan.includes(0) ? 'bg-white' : warnaSel(m.sel[0].status)}`} />
                          Yuran Tahunan · {m.sel[0].status}
                        </button>
                      </td>
                    ) : m.sel.map((sel) => {
                      const ditanda = dipilihAhli && pilih.bulan.includes(sel.bulan)
                      const bolehKlik = bolehRekod || sel.status !== 'Belum Bayar'
                      return (
                        <td key={sel.bulan} className="px-2 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => klikSel(m, sel)}
                            disabled={!bolehKlik}
                            title={`${sel.nama} · ${sel.status} · ${rm(sel.amaun)}${
                              sel.status === 'Belum Bayar' && bolehRekod ? ' — klik untuk rekod bayaran' : ''}`}
                            className={`h-6 w-6 rounded transition-all ${
                              ditanda ? 'bg-brand-700 ring-2 ring-brand-300 ring-offset-1' : warnaSel(sel.status)
                            } ${bolehKlik ? 'cursor-pointer hover:scale-110' : 'cursor-default'}`}
                          />
                        </td>
                      )
                    })}

                    <td className={`whitespace-nowrap px-4 py-2 text-right font-medium ${
                      m.tertunggak > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{rm(m.tertunggak)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-emerald-500" /> Sudah Bayar</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-amber-400" /> Menunggu Pengesahan</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-slate-200" /> Belum Bayar</span>
        {bolehRekod && (
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-brand-700" /> Dipilih</span>
        )}
        <span>Mod yuran (bulanan/tahunan) ditentukan oleh kategori ahli di Tetapan → Kadar Yuran.</span>
      </div>

      {pilih && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white px-4 py-3 shadow-lg no-print">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-medium text-slate-800">{pilih.nama}</p>
              <p className="text-xs text-slate-500">
                {pilih.bulan.map((b) => (b === 0 ? 'Yuran Tahunan' : BULAN[b - 1].substring(0, 3))).join(', ')}
                {' · '}{rm(pilih.baris.kadar * pilih.bulan.length)}
              </p>
            </div>
            <div className="flex gap-2">
              <button className="btn-ghost btn-sm" onClick={() => setPilih(null)}>Batal</button>
              <button className="btn-primary btn-sm" onClick={bukaBorang}>Rekod Bayaran</button>
            </div>
          </div>
        </div>
      )}

      <Modal buka={!!borang} tutup={() => setBorang(null)} tajuk="Rekod Bayaran Bagi Pihak Ahli" saiz="max-w-lg">
        {borang && pilih && (
          <form onSubmit={simpan} className="space-y-4">
            <div className="rounded-lg bg-slate-50 p-4 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <span className="text-slate-500">Ahli</span><span className="font-medium">{pilih.nama}</span>
                <span className="text-slate-500">No. Keahlian</span><span>{pilih.baris.noAhli || '-'}</span>
                <span className="text-slate-500">Kategori</span>
                <span>{pilih.baris.kategori} ({pilih.baris.mod})</span>
                <span className="text-slate-500">Tempoh</span>
                <span className="font-medium">
                  {pilih.bulan.map((b) => (b === 0 ? 'Yuran Tahunan' : BULAN[b - 1])).join(', ')} {tahun}
                </span>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Medan label="Amaun (RM)">
                <input type="number" step="0.01" min="0" className="input" value={borang.amaun}
                  onChange={(e) => setBorang({ ...borang, amaun: e.target.value })} required />
              </Medan>
              <Medan label="Tarikh Bayaran">
                <input type="date" className="input" value={borang.tarikh}
                  onChange={(e) => setBorang({ ...borang, tarikh: e.target.value })} required />
              </Medan>
              <Medan label="Kaedah Bayaran">
                <Pilihan nilai={borang.kaedah} kosong={null} senarai={KAEDAH_BAYARAN}
                  tukar={(v) => setBorang({ ...borang, kaedah: v })} />
              </Medan>
              <Medan label="Bukti (pilihan)">
                <input type="file" accept="image/*,application/pdf" className="input"
                  onChange={(e) => setFail(e.target.files[0] || null)} />
              </Medan>
              <Medan label="Catatan (pilihan)" jajar="sm:col-span-2">
                <input className="input" value={borang.catatan} placeholder="Cth: Bayar tunai kepada Bendahari"
                  onChange={(e) => setBorang({ ...borang, catatan: e.target.value })} />
              </Medan>
            </div>

            <p className="rounded-lg bg-brand-50 p-3 text-xs text-brand-900">
              Rekod ini terus bertaraf <b>Confirmed</b>. Resit rasmi dijana automatik dan diemelkan kepada ahli.
            </p>

            <div className="flex gap-2">
              <button className="btn-primary flex-1" disabled={sedang}>
                {sedang ? 'Menyimpan...' : 'Simpan & Jana Resit'}
              </button>
              <button type="button" className="btn-ghost" onClick={() => setBorang(null)}>Batal</button>
            </div>
          </form>
        )}
      </Modal>

      <Modal buka={!!lihat} tutup={() => setLihat(null)} tajuk="Butiran Bayaran" saiz="max-w-sm">
        {lihat && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <span className="text-slate-500">Ahli</span><span className="font-medium">{lihat.nama}</span>
              <span className="text-slate-500">Tempoh</span><span>{lihat.tempoh}</span>
              <span className="text-slate-500">Status</span>
              <span className={lihat.status === 'Sudah Bayar' ? 'text-emerald-700' : 'text-amber-700'}>
                {lihat.status}
              </span>
              <span className="text-slate-500">Amaun</span><span>{rm(lihat.amaun)}</span>
              <span className="text-slate-500">Rujukan</span><span>{lihat.rujukan || '-'}</span>
            </div>
            {lihat.status === 'Pending' && (
              <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                Ahli dah hantar bukti melalui portal. Pergi ke <b>Duit Masuk</b> untuk sahkan.
              </p>
            )}
            <button className="btn-ghost w-full" onClick={() => setLihat(null)}>Tutup</button>
          </div>
        )}
      </Modal>
    </div>
  )
}
