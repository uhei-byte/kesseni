import React, { useEffect, useMemo, useState } from 'react'
import { panggil, failKeBase64 } from '../lib/api'
import { useKonfig, Logo } from '../lib/konfig.jsx'
import { rm, tarikhMY, BULAN, KAEDAH_BAYARAN, warnaStatus, hariIni } from '../lib/utils'
import { Medan, Pilihan, useToast, Spinner } from '../components/ui'
import DokumenCetak from '../components/DokumenCetak'
import { bolehPasang, dengarPasang, mintaPasang } from '../lib/pwa'

const TAHUN_SEMASA = new Date().getFullYear()

export default function PortalApp() {
  const toast = useToast()
  const { kelab, jenisBayaran, memuat: memuatKonfig } = useKonfig()

  const [noKP, setNoKP] = useState('')
  const [tahun, setTahun] = useState(TAHUN_SEMASA)
  const [semak, setSemak] = useState(null)
  const [memuat, setMemuat] = useState(false)
  const [tab, setTab] = useState('bayar')
  const [sejarah, setSejarah] = useState([])
  const [cetak, setCetak] = useState(null)
  const [pasangAda, setPasangAda] = useState(bolehPasang())

  // borang
  const [kodJenis, setKodJenis] = useState('')
  const [bulanDipilih, setBulanDipilih] = useState([])
  const [amaun, setAmaun] = useState('')
  const [kaedah, setKaedah] = useState('Pindahan Bank')
  const [keterangan, setKeterangan] = useState('')
  const [tarikh, setTarikh] = useState(hariIni())
  const [fail, setFail] = useState(null)
  const [menghantar, setMenghantar] = useState(false)
  const [selesai, setSelesai] = useState(null)

  useEffect(() => dengarPasang(setPasangAda), [])

  useEffect(() => {
    if (!kodJenis && jenisBayaran.length) setKodJenis(jenisBayaran[0].kod)
  }, [jenisBayaran, kodJenis])

  const jenis = useMemo(
    () => jenisBayaran.find((j) => j.kod === kodJenis) || null,
    [jenisBayaran, kodJenis]
  )

  // Amaun automatik: yuran ikut bulan dipilih, atau amaun tetap yang dikonfigurasi
  useEffect(() => {
    if (!jenis) return
    if (jenis.pilihBulan && semak) {
      setAmaun(String((bulanDipilih.length * semak.kadar).toFixed(2)))
    } else if (jenis.amaunTetap != null) {
      setAmaun(String(Number(jenis.amaunTetap).toFixed(2)))
    }
  }, [jenis, bulanDipilih, semak])

  const buatSemakan = async (e) => {
    e?.preventDefault()
    if (!noKP.trim()) return
    setMemuat(true); setSelesai(null); setCetak(null)
    try {
      const r = await panggil('semakAhli', { noKP, tahun }, { awam: true })
      if (!r.ok) { toast(r.mesej, 'ralat'); setSemak(null) }
      else {
        setSemak(r)
        setBulanDipilih([])
        const s = await panggil('semakStatusBayaran', { noKP }, { awam: true })
        if (s.ok) setSejarah(s.senarai)
      }
    } catch (err) { toast(err.message, 'ralat') }
    setMemuat(false)
  }

  const togolBulan = (b) =>
    setBulanDipilih((s) => (s.includes(b) ? s.filter((x) => x !== b) : [...s, b].sort((a, c) => a - c)))

  const hantar = async (e) => {
    e.preventDefault()
    if (!jenis) return toast('Sila pilih jenis bayaran', 'ralat')
    if (!fail) return toast('Sila muat naik bukti pembayaran', 'ralat')
    if (Number(amaun) <= 0) return toast('Amaun tidak sah', 'ralat')
    if (jenis.pilihBulan && bulanDipilih.length === 0) return toast('Sila pilih bulan yuran', 'ralat')
    if (jenis.wajibKeterangan && !keterangan.trim()) return toast('Sila isi keterangan', 'ralat')

    setMenghantar(true)
    try {
      const lampiran = await failKeBase64(fail)
      const r = await panggil('hantarBayaran', {
        noKP, kategori: jenis.kategori, amaun: Number(amaun), kaedah, keterangan, tarikh,
        tahunYuran: jenis.pilihBulan ? tahun : '',
        bulanYuran: jenis.pilihBulan ? bulanDipilih : [],
        fail: lampiran
      }, { awam: true })
      if (r.ok) {
        setSelesai(r)
        toast('Bayaran berjaya dihantar', 'ok')
        setFail(null); setKeterangan(''); setBulanDipilih([])
        buatSemakan()
      } else toast(r.mesej, 'ralat')
    } catch (err) { toast(err.message, 'ralat') }
    setMenghantar(false)
  }

  const bukaResit = async (rekod) => {
    try {
      const r = await panggil('dapatResit', { noKP, id: rekod.id }, { awam: true })
      r.ok ? setCetak(r.resit) : toast(r.mesej, 'ralat')
    } catch (err) { toast(err.message, 'ralat') }
  }

  if (cetak) {
    return (
      <div className="min-h-screen bg-slate-100 p-4">
        <div className="mx-auto mb-4 flex max-w-3xl gap-2 no-print">
          <button className="btn-ghost btn-sm" onClick={() => setCetak(null)}>← Kembali</button>
          <button className="btn-primary btn-sm" onClick={() => window.print()}>Cetak / Simpan PDF</button>
        </div>
        <DokumenCetak jenis="resit" dok={cetak} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-slate-50">
      <header className="border-b border-brand-100 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <Logo saiz={44} />
            <div className="min-w-0">
              <h1 className="truncate text-sm font-bold leading-tight text-brand-800 sm:text-base">
                {kelab.nama}
              </h1>
              <p className="text-xs text-slate-500">{kelab.pendaftaran}</p>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            {pasangAda && (
              <button className="btn-ghost btn-sm" onClick={mintaPasang}>Pasang App</button>
            )}
            <a href="/admin/" className="btn-ghost btn-sm">Admin</a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        {kelab.mesejPortal && (
          <div className="mb-4 rounded-xl border border-brand-200 bg-brand-50 p-4 text-sm text-brand-900">
            {kelab.mesejPortal}
          </div>
        )}

        <div className="card p-5">
          <h2 className="mb-1 font-semibold text-slate-800">Portal Ahli</h2>
          <p className="mb-4 text-sm text-slate-500">
            Masukkan No. Kad Pengenalan untuk semak status bayaran dan hantar bukti pembayaran.
          </p>
          <form onSubmit={buatSemakan} className="flex flex-col gap-3 sm:flex-row">
            <input className="input flex-1" placeholder="Contoh: 780227106118" value={noKP}
              onChange={(e) => setNoKP(e.target.value)} inputMode="numeric" />
            {kelab.tunjukYuran && (
              <select className="input sm:w-32" value={tahun} onChange={(e) => setTahun(Number(e.target.value))}>
                {[TAHUN_SEMASA + 1, TAHUN_SEMASA, TAHUN_SEMASA - 1, TAHUN_SEMASA - 2].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            )}
            <button className="btn-primary sm:w-32" disabled={memuat || memuatKonfig}>
              {memuat ? 'Menyemak...' : 'Semak'}
            </button>
          </form>
        </div>

        {memuat && <Spinner />}

        {semak && !memuat && (
          <>
            <div className="card mt-4 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-slate-800">{semak.ahli.nama}</p>
                  <p className="text-sm text-slate-500">
                    {[semak.ahli.jawatan, semak.ahli.jabatan].filter(Boolean).join(' · ')}
                  </p>
                </div>
                {kelab.tunjukYuran && (
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Yuran tertunggak {semak.tahun}</p>
                    <p className={`text-xl font-semibold ${semak.jumlahTertunggak > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {rm(semak.jumlahTertunggak)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {semak.bilanganTertunggak} bulan · kadar {rm(semak.kadar)}/bulan
                    </p>
                  </div>
                )}
              </div>

              {kelab.tunjukYuran && (
                <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {semak.bulan.map((b) => (
                    <div key={b.bulan} className={`rounded-lg border p-2 text-center text-xs ${
                      b.status === 'Sudah Bayar' ? 'border-emerald-200 bg-emerald-50'
                        : b.status === 'Pending' ? 'border-amber-200 bg-amber-50'
                        : 'border-slate-200 bg-white'
                    }`}>
                      <p className="font-medium text-slate-700">{b.nama.substring(0, 3)}</p>
                      <p className={`mt-1 ${
                        b.status === 'Sudah Bayar' ? 'text-emerald-700'
                          : b.status === 'Pending' ? 'text-amber-700' : 'text-slate-400'
                      }`}>
                        {b.status === 'Sudah Bayar' ? 'Bayar' : b.status === 'Pending' ? 'Semak' : '-'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 flex gap-2">
              <button onClick={() => setTab('bayar')}
                className={tab === 'bayar' ? 'btn-primary btn-sm' : 'btn-ghost btn-sm'}>Hantar Bayaran</button>
              <button onClick={() => setTab('sejarah')}
                className={tab === 'sejarah' ? 'btn-primary btn-sm' : 'btn-ghost btn-sm'}>Sejarah &amp; Resit</button>
            </div>

            {tab === 'bayar' && (
              <div className="card mt-3 p-5">
                {selesai ? (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm">
                    <p className="font-semibold text-emerald-800">Bayaran berjaya dihantar</p>
                    <p className="mt-1 text-emerald-700">
                      No. rujukan: <b>{selesai.id}</b>. Status kini <b>Pending</b> — resit rasmi akan
                      dijana dan diemel kepada anda sebaik sahaja bayaran disahkan.
                    </p>
                    <button className="btn-ghost btn-sm mt-3" onClick={() => setSelesai(null)}>
                      Hantar bayaran lain
                    </button>
                  </div>
                ) : (
                  <form onSubmit={hantar} className="grid gap-4 sm:grid-cols-2">
                    <Medan label="Jenis Bayaran">
                      <select className="input" value={kodJenis} onChange={(e) => setKodJenis(e.target.value)}>
                        {jenisBayaran.map((j) => <option key={j.kod} value={j.kod}>{j.nama}</option>)}
                      </select>
                      {jenis?.keterangan && <p className="mt-1 text-xs text-slate-500">{jenis.keterangan}</p>}
                    </Medan>
                    <Medan label="Tarikh Bayaran">
                      <input type="date" className="input" value={tarikh} onChange={(e) => setTarikh(e.target.value)} />
                    </Medan>

                    {jenis?.pilihBulan && (
                      <Medan label={`Pilih bulan (${tahun})`} jajar="sm:col-span-2">
                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                          {semak.bulan.map((b) => {
                            const dikunci = b.status !== 'Belum Bayar'
                            const aktif = bulanDipilih.includes(b.bulan)
                            return (
                              <button type="button" key={b.bulan} disabled={dikunci}
                                onClick={() => togolBulan(b.bulan)}
                                className={`rounded-lg border px-2 py-2 text-xs transition-colors ${
                                  dikunci ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                                    : aktif ? 'border-brand-600 bg-brand-600 text-white'
                                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                                }`}>
                                {BULAN[b.bulan - 1].substring(0, 3)}
                              </button>
                            )
                          })}
                        </div>
                      </Medan>
                    )}

                    <Medan label="Amaun (RM)">
                      <input type="number" step="0.01" min="0" className="input" value={amaun}
                        onChange={(e) => setAmaun(e.target.value)}
                        readOnly={jenis?.pilihBulan || jenis?.amaunTetap != null} />
                    </Medan>
                    <Medan label="Kaedah Bayaran">
                      <Pilihan nilai={kaedah} tukar={setKaedah} senarai={KAEDAH_BAYARAN} kosong={null} />
                    </Medan>

                    <Medan label={`Keterangan${jenis?.wajibKeterangan ? '' : ' (pilihan)'}`} jajar="sm:col-span-2">
                      <input className="input" value={keterangan} onChange={(e) => setKeterangan(e.target.value)}
                        placeholder="Contoh: Sumbangan program Maulidur Rasul" />
                    </Medan>

                    <Medan label="Bukti Pembayaran (JPG/PNG/PDF, maks 5MB)" jajar="sm:col-span-2">
                      <input type="file" accept="image/*,application/pdf" className="input"
                        onChange={(e) => setFail(e.target.files[0] || null)} />
                    </Medan>

                    <div className="sm:col-span-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                      <p className="font-medium text-slate-700">Maklumat Akaun Bank</p>
                      <p>{kelab.bank}</p>
                      <p>No. Akaun: <b>{kelab.akaun}</b></p>
                      <p className="mt-1">Nama akaun: {kelab.nama}</p>
                    </div>

                    <div className="sm:col-span-2">
                      <button className="btn-primary w-full" disabled={menghantar}>
                        {menghantar ? 'Menghantar...' : 'Hantar Bayaran'}
                      </button>
                      <p className="mt-2 text-center text-xs text-slate-500">
                        Bayaran akan disemak dan disahkan sebelum resit rasmi dikeluarkan.
                      </p>
                    </div>
                  </form>
                )}
              </div>
            )}

            {tab === 'sejarah' && (
              <div className="card mt-3 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Tarikh</th><th className="px-4 py-3">Kategori</th>
                        <th className="px-4 py-3">Amaun</th><th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Resit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sejarah.length === 0 ? (
                        <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400">Tiada rekod bayaran</td></tr>
                      ) : sejarah.map((s) => (
                        <tr key={s.id}>
                          <td className="whitespace-nowrap px-4 py-3">{tarikhMY(s.tarikh)}</td>
                          <td className="px-4 py-3">{s.kategori}</td>
                          <td className="whitespace-nowrap px-4 py-3 font-medium">{rm(s.amaun)}</td>
                          <td className="px-4 py-3">
                            <span className={`badge ${warnaStatus(s.status)}`}>{s.status}</span>
                            {s.catatan && <p className="mt-1 text-xs text-slate-500">{s.catatan}</p>}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            {s.noResit ? (
                              <button className="btn-ghost btn-sm" onClick={() => bukaResit(s)}>
                                {s.noResit}
                              </button>
                            ) : <span className="text-xs text-slate-400">-</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        <footer className="mt-10 pb-6 text-center text-xs text-slate-400">
          {kelab.nama} · {kelab.pendaftaran}
        </footer>
      </main>
    </div>
  )
}
