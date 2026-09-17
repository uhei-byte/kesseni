import React, { useEffect, useState } from 'react'
import { panggil, padamSesi, failKeBase64 } from '../lib/api'
import { useNavigate } from 'react-router-dom'
import { Medan, Pilihan, Spinner, useToast } from '../components/ui'
import { useKonfig } from '../lib/konfig.jsx'

const SEKSYEN = [
  { id: 'identiti', label: 'Identiti & Logo', ikon: '🎨' },
  { id: 'bayaran', label: 'Jenis Bayaran', ikon: '💳' },
  { id: 'yuran', label: 'Kadar Yuran', ikon: '📅' },
  { id: 'dokumen', label: 'Dokumen & Bank', ikon: '🧾' },
  { id: 'staf', label: 'Staff Database', ikon: '🗂️' },
  { id: 'keselamatan', label: 'Keselamatan', ikon: '🔒' }
]

const LABEL_IDENTITI = {
  NAMA_KELAB: ['Nama Penuh Organisasi', true],
  NAMA_SINGKAT: ['Nama Singkat (tajuk app & PWA)', false],
  NO_PENDAFTARAN: ['No. Pendaftaran', false],
  ALAMAT_KELAB: ['Alamat', true],
  TELEFON_KELAB: ['No. Telefon', false],
  EMAIL_ADMIN: ['Emel Admin (terima notifikasi bayaran baharu)', false],
  PORTAL_MESEJ: ['Mesej Pengumuman di Portal Ahli (kosong = tiada)', true]
}

const LABEL_DOKUMEN = {
  NAMA_BANK: 'Nama Bank',
  NO_AKAUN: 'No. Akaun Bank',
  PREFIX_INVOIS: 'Prefix No. Invois',
  PREFIX_RESIT: 'Prefix No. Resit',
  NAMA_PENANDATANGAN: 'Nama/Jawatan Penandatangan Resit',
  NOTA_KAKI_RESIT: 'Nota Kaki Resit',
  HANTAR_EMAIL: 'Hantar Emel Automatik (YA/TIDAK)',
  AMARAN_SIJIL_HARI: 'Amaran Sijil (hari sebelum tamat)',
  PORTAL_TUNJUK_YURAN: 'Papar Grid Yuran di Portal (YA/TIDAK)',
  KADAR_YURAN_LALAI: 'Kadar Yuran Lalai (RM/bulan)'
}

const LABEL_STAF = {
  STAF_SPREADSHEET_ID: 'ID / URL Google Sheet Staff Database (kosongkan jika dalam fail yang sama)',
  STAF_NAMA_TAB: 'Nama Tab Staff Database'
}

const JENIS_KOSONG = {
  Kod: '', Nama: '', Kategori: '', AmaunTetap: '',
  PilihBulan: 'TIDAK', WajibKeterangan: 'TIDAK', Aktif: 'YA', Susunan: 99, Keterangan: ''
}

export default function Tetapan() {
  const toast = useToast()
  const navigate = useNavigate()
  const { muatSemula, kelab, versi } = useKonfig()

  const [seksyen, setSeksyen] = useState('identiti')
  const [tetapan, setTetapan] = useState(null)
  const [kadar, setKadar] = useState([])
  const [jenis, setJenis] = useState([])
  const [sedang, setSedang] = useState(false)
  const [statusStaf, setStatusStaf] = useState('')
  const [kl, setKl] = useState({ lama: '', baru: '', ulang: '' })

  const muat = () => {
    Promise.all([
      panggil('senarai', { tab: 'Tetapan' }),
      panggil('senarai', { tab: 'KadarYuran' }),
      panggil('senarai', { tab: 'JenisBayaran' })
    ]).then(([t, k, j]) => {
      if (t.ok) { const o = {}; t.data.forEach((r) => (o[r.Kunci] = r.Nilai)); setTetapan(o) }
      if (k.ok) setKadar(k.data.map((r) => ({ Kategori: r.Kategori, KadarBulanan: r.KadarBulanan, Aktif: r.Aktif })))
      if (j.ok) setJenis(j.data.map((r) => ({ ...JENIS_KOSONG, ...r })))
    }).catch((e) => toast(e.message, 'ralat'))
  }
  useEffect(muat, [])

  const simpanTetapan = async (e) => {
    e?.preventDefault?.()
    setSedang(true)
    try {
      const r = await panggil('simpanTetapan', { tetapan })
      if (r.ok) { toast('Tetapan disimpan', 'ok'); muatSemula() } else toast(r.mesej, 'ralat')
    } catch (err) { toast(err.message, 'ralat') }
    setSedang(false)
  }

  const muatNaikLogo = async (fail) => {
    if (!fail) return
    setSedang(true)
    try {
      const lampiran = await failKeBase64(fail, 512, 0.92)
      const r = await panggil('simpanLogo', { fail: lampiran })
      if (r.ok) { toast('Logo dikemaskini', 'ok'); muat(); muatSemula() }
      else toast(r.mesej, 'ralat')
    } catch (err) { toast(err.message, 'ralat') }
    setSedang(false)
  }

  const simpanKadar = async () => {
    setSedang(true)
    try {
      const r = await panggil('simpanKadar', { kadar: kadar.filter((k) => String(k.Kategori).trim()) })
      if (r.ok) { toast('Kadar yuran disimpan', 'ok'); muat(); muatSemula() } else toast(r.mesej, 'ralat')
    } catch (err) { toast(err.message, 'ralat') }
    setSedang(false)
  }

  const simpanJenis = async () => {
    setSedang(true)
    try {
      const r = await panggil('simpanJenisBayaran', { jenis })
      if (r.ok) { toast('Jenis bayaran disimpan', 'ok'); muat(); muatSemula() } else toast(r.mesej, 'ralat')
    } catch (err) { toast(err.message, 'ralat') }
    setSedang(false)
  }

  const sambungStaf = async () => {
    setSedang(true); setStatusStaf('')
    try {
      await panggil('simpanTetapan', { tetapan })
      const r = await panggil('setupStaf')
      setStatusStaf(r.mesej)
      r.ok ? toast('Staff database disambung', 'ok') : toast(r.mesej, 'ralat')
    } catch (err) { setStatusStaf(err.message); toast(err.message, 'ralat') }
    setSedang(false)
  }

  const tukarKataLaluan = async (e) => {
    e.preventDefault()
    if (kl.baru !== kl.ulang) return toast('Kata laluan baharu tidak sepadan', 'ralat')
    setSedang(true)
    try {
      const r = await panggil('tukarKataLaluan', { lama: kl.lama, baru: kl.baru })
      if (r.ok) {
        toast('Kata laluan ditukar. Sila log masuk semula.', 'ok')
        setTimeout(() => { padamSesi(); navigate('/login') }, 1500)
      } else toast(r.mesej, 'ralat')
    } catch (err) { toast(err.message, 'ralat') }
    setSedang(false)
  }

  const ubahJenis = (i, medan, nilai) =>
    setJenis((s) => s.map((j, k) => (k === i ? { ...j, [medan]: nilai } : j)))

  if (!tetapan) return <Spinner />

  return (
    <div className="max-w-4xl space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Konfigurasi Sistem</h1>
        <p className="text-sm text-slate-500">
          Semua identiti, logo, jenis bayaran dan kadar dikawal dari sini — tiada perubahan kod diperlukan.
          {versi && <span className="ml-1 text-slate-400">Versi {versi}</span>}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {SEKSYEN.map((s) => (
          <button key={s.id} onClick={() => setSeksyen(s.id)}
            className={seksyen === s.id ? 'btn-primary btn-sm' : 'btn-ghost btn-sm'}>
            <span>{s.ikon}</span> {s.label}
          </button>
        ))}
      </div>

      {/* ---------------- IDENTITI & LOGO ---------------- */}
      {seksyen === 'identiti' && (
        <>
          <div className="card space-y-4 p-5">
            <div>
              <h2 className="font-medium text-slate-800">Logo Organisasi</h2>
              <p className="text-xs text-slate-500">
                Logo ini digunakan pada portal ahli, panel admin, resit dan invois.
                Format PNG/JPG/WEBP, maksimum 2MB. Disyorkan imej segi empat sama.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-5">
              <div className="flex h-28 w-28 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-2">
                <img src={kelab?.logo || '/icons/logo.png'} alt="Logo semasa"
                  className="max-h-full max-w-full object-contain" />
              </div>
              <div className="space-y-2">
                <input type="file" accept="image/png,image/jpeg,image/webp" className="input"
                  disabled={sedang} onChange={(e) => muatNaikLogo(e.target.files[0])} />
                <p className="text-xs text-slate-500">
                  Logo disimpan dalam Google Drive dan dikongsi melalui pautan kerana ia perlu
                  dipaparkan pada resit dan portal awam.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={simpanTetapan} className="card space-y-4 p-5">
            <h2 className="font-medium text-slate-800">Identiti Organisasi</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {Object.entries(LABEL_IDENTITI).map(([k, [label, lebar]]) => (
                <Medan key={k} label={label} jajar={lebar ? 'sm:col-span-2' : ''}>
                  <input className="input" value={tetapan[k] ?? ''}
                    onChange={(e) => setTetapan({ ...tetapan, [k]: e.target.value })} />
                </Medan>
              ))}
              <Medan label="Warna Tema Sistem">
                <div className="flex gap-2">
                  <input type="color" className="h-10 w-14 cursor-pointer rounded border border-slate-300"
                    value={tetapan.TEMA_WARNA || '#0f766e'}
                    onChange={(e) => setTetapan({ ...tetapan, TEMA_WARNA: e.target.value })} />
                  <input className="input" value={tetapan.TEMA_WARNA || ''}
                    onChange={(e) => setTetapan({ ...tetapan, TEMA_WARNA: e.target.value })} />
                </div>
              </Medan>
            </div>
            <button className="btn-primary" disabled={sedang}>Simpan Identiti</button>
          </form>
        </>
      )}

      {/* ---------------- JENIS BAYARAN ---------------- */}
      {seksyen === 'bayaran' && (
        <div className="card space-y-4 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-medium text-slate-800">Jenis Bayaran</h2>
              <p className="max-w-2xl text-xs text-slate-500">
                Senarai ini yang muncul sebagai pilihan di portal ahli. Tambah apa sahaja jenis
                bayaran baharu — derma khas, tabung kematian, yuran aktiviti — tanpa perlu ubah kod.
              </p>
            </div>
            <button className="btn-ghost btn-sm"
              onClick={() => setJenis([...jenis, { ...JENIS_KOSONG, Susunan: jenis.length + 1 }])}>
              + Jenis Baharu
            </button>
          </div>

          <div className="space-y-3">
            {jenis.map((j, i) => (
              <div key={i} className="rounded-xl border border-slate-200 p-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <Medan label="Nama (dipapar kepada ahli)">
                    <input className="input" value={j.Nama}
                      onChange={(e) => ubahJenis(i, 'Nama', e.target.value)} />
                  </Medan>
                  <Medan label="Kategori (untuk laporan)">
                    <input className="input" value={j.Kategori} placeholder="Cth: Sumbangan"
                      onChange={(e) => ubahJenis(i, 'Kategori', e.target.value)} />
                  </Medan>
                  <Medan label="Amaun Tetap (RM) — kosong = ahli isi sendiri">
                    <input type="number" step="0.01" className="input" value={j.AmaunTetap}
                      onChange={(e) => ubahJenis(i, 'AmaunTetap', e.target.value)} />
                  </Medan>
                  <Medan label="Pilih Bulan Yuran?">
                    <Pilihan nilai={j.PilihBulan} kosong={null} senarai={['TIDAK', 'YA']}
                      tukar={(v) => ubahJenis(i, 'PilihBulan', v)} />
                  </Medan>
                  <Medan label="Keterangan Wajib?">
                    <Pilihan nilai={j.WajibKeterangan} kosong={null} senarai={['TIDAK', 'YA']}
                      tukar={(v) => ubahJenis(i, 'WajibKeterangan', v)} />
                  </Medan>
                  <Medan label="Aktif?">
                    <Pilihan nilai={j.Aktif} kosong={null} senarai={['YA', 'TIDAK']}
                      tukar={(v) => ubahJenis(i, 'Aktif', v)} />
                  </Medan>
                  <Medan label="Nota ringkas untuk ahli" jajar="sm:col-span-2">
                    <input className="input" value={j.Keterangan}
                      onChange={(e) => ubahJenis(i, 'Keterangan', e.target.value)} />
                  </Medan>
                  <Medan label="Susunan">
                    <div className="flex gap-2">
                      <input type="number" className="input" value={j.Susunan}
                        onChange={(e) => ubahJenis(i, 'Susunan', e.target.value)} />
                      <button className="btn-ghost btn-sm text-red-600"
                        onClick={() => setJenis(jenis.filter((_, k) => k !== i))}>Buang</button>
                    </div>
                  </Medan>
                </div>
              </div>
            ))}
          </div>

          <button className="btn-primary" onClick={simpanJenis} disabled={sedang}>
            Simpan Jenis Bayaran
          </button>
        </div>
      )}

      {/* ---------------- KADAR YURAN ---------------- */}
      {seksyen === 'yuran' && (
        <div className="card space-y-4 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-medium text-slate-800">Kadar Yuran Ikut Kategori</h2>
              <p className="text-xs text-slate-500">
                Kadar baharu digunakan untuk pengiraan akan datang. Rekod bulan lepas tidak berubah.
              </p>
            </div>
            <button className="btn-ghost btn-sm"
              onClick={() => setKadar([...kadar, { Kategori: '', KadarBulanan: 10, Aktif: 'YA' }])}>
              + Kategori
            </button>
          </div>
          <div className="space-y-2">
            {kadar.map((k, i) => (
              <div key={i} className="flex flex-wrap gap-2">
                <input className="input min-w-[160px] flex-1" placeholder="Nama kategori" value={k.Kategori}
                  onChange={(e) => { const s = [...kadar]; s[i] = { ...k, Kategori: e.target.value }; setKadar(s) }} />
                <input type="number" step="0.01" className="input w-32" value={k.KadarBulanan}
                  onChange={(e) => { const s = [...kadar]; s[i] = { ...k, KadarBulanan: e.target.value }; setKadar(s) }} />
                <select className="input w-28" value={k.Aktif}
                  onChange={(e) => { const s = [...kadar]; s[i] = { ...k, Aktif: e.target.value }; setKadar(s) }}>
                  <option>YA</option><option>TIDAK</option>
                </select>
                <button className="btn-ghost btn-sm text-red-600"
                  onClick={() => setKadar(kadar.filter((_, j) => j !== i))}>Buang</button>
              </div>
            ))}
          </div>
          <button className="btn-primary" onClick={simpanKadar} disabled={sedang}>Simpan Kadar Yuran</button>
        </div>
      )}

      {/* ---------------- DOKUMEN & BANK ---------------- */}
      {seksyen === 'dokumen' && (
        <form onSubmit={simpanTetapan} className="card space-y-4 p-5">
          <div>
            <h2 className="font-medium text-slate-800">Dokumen, Bank &amp; Operasi</h2>
            <p className="text-xs text-slate-500">
              Maklumat ini muncul pada resit, invois dan portal ahli.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {Object.entries(LABEL_DOKUMEN).map(([k, label]) => (
              <Medan key={k} label={label} jajar={k === 'NOTA_KAKI_RESIT' ? 'sm:col-span-2' : ''}>
                <input className="input" value={tetapan[k] ?? ''}
                  onChange={(e) => setTetapan({ ...tetapan, [k]: e.target.value })} />
              </Medan>
            ))}
          </div>
          <button className="btn-primary" disabled={sedang}>Simpan</button>
        </form>
      )}

      {/* ---------------- STAFF DATABASE ---------------- */}
      {seksyen === 'staf' && (
        <div className="card space-y-4 p-5">
          <div>
            <h2 className="font-medium text-slate-800">Sambungan Staff Database</h2>
            <p className="text-xs text-slate-500">
              Sistem membaca senarai staf terus dari Google Sheet sedia ada. Lajur asal tidak diubah —
              hanya lajur ROLE, KATEGORI YURAN, STATUS AHLI dan ALAMAT KEDIAMAN ditambah jika belum ada.
            </p>
          </div>
          <div className="grid gap-4">
            {Object.entries(LABEL_STAF).map(([k, label]) => (
              <Medan key={k} label={label}>
                <input className="input" value={tetapan[k] ?? ''}
                  placeholder={k === 'STAF_NAMA_TAB' ? 'Staf' : 'Tampal URL atau ID Google Sheet'}
                  onChange={(e) => setTetapan({ ...tetapan, [k]: e.target.value })} />
              </Medan>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn-primary" disabled={sedang} onClick={simpanTetapan}>Simpan Sambungan</button>
            <button className="btn-ghost" disabled={sedang} onClick={sambungStaf}>Sambung &amp; Semak Struktur</button>
          </div>
          {statusStaf && <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-700">{statusStaf}</p>}
        </div>
      )}

      {/* ---------------- KESELAMATAN ---------------- */}
      {seksyen === 'keselamatan' && (
        <form onSubmit={tukarKataLaluan} className="card space-y-4 p-5">
          <div>
            <h2 className="font-medium text-slate-800">Tukar Kata Laluan Anda</h2>
            <p className="text-xs text-slate-500">
              Minimum 8 aksara. Anda perlu log masuk semula selepas menukar.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Medan label="Kata Laluan Semasa">
              <input type="password" className="input" value={kl.lama}
                onChange={(e) => setKl({ ...kl, lama: e.target.value })} required />
            </Medan>
            <Medan label="Kata Laluan Baharu">
              <input type="password" className="input" value={kl.baru} minLength={8}
                onChange={(e) => setKl({ ...kl, baru: e.target.value })} required />
            </Medan>
            <Medan label="Ulang Kata Laluan Baharu">
              <input type="password" className="input" value={kl.ulang} minLength={8}
                onChange={(e) => setKl({ ...kl, ulang: e.target.value })} required />
            </Medan>
          </div>
          <button className="btn-primary" disabled={sedang}>Tukar Kata Laluan</button>
        </form>
      )}
    </div>
  )
}
