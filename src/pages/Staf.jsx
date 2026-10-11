import React, { useEffect, useMemo, useState } from 'react'
import { panggil, ambilSesi, AKSES } from '../lib/api'
import { tarikhMY, warnaStatus, formatIC, muatTurunCSV } from '../lib/utils'
import { Jadual, Modal, Medan, Pilihan, Spinner, useToast, KadStat } from '../components/ui'

const KOSONG = {
  NoAhli: '', Nama: '', NoKP: '', Umur: '', Jantina: '', Jawatan: '', Jabatan: '',
  Emel: '', Telefon: '', Gambar: '', JawatanKelab: 'Ahli Biasa', Kategori: 'Ahli Biasa',
  StatusAhli: 'Aktif', TarikhSertai: '', Alamat: '', Catatan: ''
}

const WARNA_JAWATAN = {
  'Pengerusi': 'bg-purple-100 text-purple-800',
  'Timbalan Pengerusi': 'bg-purple-50 text-purple-700',
  'Setiausaha': 'bg-cyan-100 text-cyan-800',
  'Timbalan Setiausaha': 'bg-cyan-50 text-cyan-700',
  'Bendahari': 'bg-blue-100 text-blue-800',
  'AJK': 'bg-amber-50 text-amber-800',
  'Juru Audit': 'bg-emerald-50 text-emerald-800',
  'Ahli Biasa': 'bg-slate-100 text-slate-700'
}

/** Umur dari 6 digit pertama IC — dipaparkan serta-merta semasa menaip */
function umurDariIC(ic) {
  const d = String(ic || '').replace(/\D/g, '')
  if (d.length !== 12) return ''
  const yy = +d.slice(0, 2), mm = +d.slice(2, 4), dd = +d.slice(4, 6)
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return ''
  const kini = new Date()
  let tahun = 2000 + yy
  if (tahun > kini.getFullYear()) tahun = 1900 + yy
  const lahir = new Date(tahun, mm - 1, dd)
  if (lahir.getMonth() !== mm - 1) return ''
  let umur = kini.getFullYear() - lahir.getFullYear()
  const beza = kini.getMonth() - lahir.getMonth()
  if (beza < 0 || (beza === 0 && kini.getDate() < lahir.getDate())) umur--
  return umur >= 0 && umur < 130 ? umur : ''
}

/** Bin = Lelaki, Binti = Wanita; jika tiada, guna digit terakhir IC */
function jantinaAuto(nama, ic) {
  const t = ' ' + String(nama || '').toUpperCase().replace(/[^A-Z ]/g, ' ') + ' '
  if (/\s(BINTI|BT|BTE)\s/.test(t)) return 'Wanita'
  if (/\s(BIN|B)\s/.test(t)) return 'Lelaki'
  const d = String(ic || '').replace(/\D/g, '')
  if (d.length === 12) return +d[11] % 2 === 1 ? 'Lelaki' : 'Wanita'
  return ''
}

export default function Staf() {
  const toast = useToast()
  const { role } = ambilSesi()
  const bolehEdit = AKSES.staf.includes(role)

  const [data, setData] = useState(null)
  const [senaraiJawatan, setSenaraiJawatan] = useState([])
  const [kadar, setKadar] = useState([])
  const [cari, setCari] = useState('')
  const [tapisJabatan, setTapisJabatan] = useState('')
  const [tapisJawatan, setTapisJawatan] = useState('')
  const [borang, setBorang] = useState(null)
  const [sedang, setSedang] = useState(false)
  const [ralat, setRalat] = useState('')

  const muat = () => {
    setData(null); setRalat('')
    Promise.all([
      panggil('senarai', { tab: 'Staf' }),
      panggil('senarai', { tab: 'KadarYuran' })
    ]).then(([s, k]) => {
      if (s.ok) { setData(s.data); if (s.senaraiJawatan) setSenaraiJawatan(s.senaraiJawatan) }
      else { setRalat(s.mesej); setData([]) }
      if (k.ok) setKadar(k.data)
    }).catch((e) => { setRalat(e.message); setData([]) })
  }
  useEffect(muat, [])

  const jabatanSenarai = useMemo(
    () => [...new Set((data || []).map((d) => d.Jabatan).filter(Boolean))].sort(),
    [data]
  )

  const ditapis = useMemo(() => {
    if (!data) return []
    return data.filter((d) => {
      if (tapisJabatan && d.Jabatan !== tapisJabatan) return false
      if (tapisJawatan && d.JawatanKelab !== tapisJawatan) return false
      if (cari) {
        const t = cari.toLowerCase()
        return [d.Nama, d.NoKP, d.Emel, d.NoAhli, d.Jawatan, d.Telefon]
          .some((v) => String(v || '').toLowerCase().includes(t))
      }
      return true
    })
  }, [data, cari, tapisJabatan, tapisJawatan])

  // Umur & jantina dikira serta-merta dalam borang
  const umurAuto = borang ? umurDariIC(borang.NoKP) : ''
  const jantinaAutoNilai = borang ? jantinaAuto(borang.Nama, borang.NoKP) : ''

  const simpan = async (e) => {
    e.preventDefault()
    setSedang(true)
    try {
      const r = await panggil('simpanStaf', { baris: borang._baris, data: borang })
      if (r.ok) {
        toast('Rekod disimpan' + (r.noAhli ? ` · No. Keahlian ${r.noAhli}` : ''), 'ok')
        setBorang(null); muat()
      } else toast(r.mesej, 'ralat')
    } catch (err) { toast(err.message, 'ralat') }
    setSedang(false)
  }

  const padam = async (baris) => {
    if (!confirm('Padam rekod ini daripada staff database? Rekod yuran sedia ada tidak dipadam.')) return
    const r = await panggil('padamStaf', { baris })
    r.ok ? (toast('Rekod dipadam', 'ok'), muat()) : toast(r.mesej, 'ralat')
  }

  const janaNoAhli = async () => {
    if (!confirm('Jana No. Keahlian untuk semua ahli yang belum ada? Nombor diberi ikut turutan tarikh sertai.')) return
    setSedang(true)
    try {
      const r = await panggil('janaNoKeahlian')
      r.ok ? (toast(r.mesej, 'ok'), muat()) : toast(r.mesej, 'ralat')
    } catch (err) { toast(err.message, 'ralat') }
    setSedang(false)
  }

  if (!data) return <Spinner />

  const tiadaNoAhli = data.filter((d) => !String(d.NoAhli || '').trim()).length
  const bilJawatan = (nama) => data.filter((d) => d.JawatanKelab === nama).length

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Staf &amp; Ahli</h1>
          <p className="text-sm text-slate-500">
            Data dibaca terus dari Staff Database (master) · {data.length} rekod
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost btn-sm" onClick={() => muatTurunCSV('senarai-ahli.csv',
            ['NoAhli', 'Nama', 'NoKP', 'Umur', 'Jantina', 'Jawatan', 'Jabatan', 'Emel',
             'Telefon', 'JawatanKelab', 'Kategori', 'StatusAhli', 'TarikhSertai'], ditapis)}>
            Muat Turun CSV
          </button>
          {bolehEdit && (
            <button className="btn-primary btn-sm" onClick={() => setBorang({ ...KOSONG })}>+ Tambah Ahli</button>
          )}
        </div>
      </div>

      {ralat && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-medium">Staff database tidak dapat dibaca</p>
          <p className="mt-1">{ralat}</p>
          <p className="mt-1 text-xs">Semak tetapan Staff Database di halaman Tetapan.</p>
        </div>
      )}

      {tiadaNoAhli > 0 && bolehEdit && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-900">
            <b>{tiadaNoAhli} ahli</b> belum ada No. Keahlian.
          </p>
          <button className="btn-primary btn-sm" onClick={janaNoAhli} disabled={sedang}>
            Jana No. Keahlian
          </button>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-4">
        <KadStat tajuk="Jumlah Ahli" nilai={data.length} ikon="👥" />
        <KadStat tajuk="Ahli Aktif" nilai={data.filter((d) => d.StatusAhli !== 'Tidak Aktif').length}
          warna="text-emerald-600" />
        <KadStat tajuk="AJK" nilai={data.filter((d) =>
          d.JawatanKelab && d.JawatanKelab !== 'Ahli Biasa').length} sub="Semua jawatan kelab" />
        <KadStat tajuk="Ahli Biasa" nilai={bilJawatan('Ahli Biasa')} />
      </div>

      <div className="flex flex-wrap gap-2">
        <input className="input max-w-xs" placeholder="Cari nama / IC / no. keahlian..."
          value={cari} onChange={(e) => setCari(e.target.value)} />
        <select className="input max-w-[180px]" value={tapisJabatan} onChange={(e) => setTapisJabatan(e.target.value)}>
          <option value="">Semua Jabatan/Unit</option>
          {jabatanSenarai.map((j) => <option key={j}>{j}</option>)}
        </select>
        <select className="input max-w-[200px]" value={tapisJawatan} onChange={(e) => setTapisJawatan(e.target.value)}>
          <option value="">Semua Jawatan Kelab</option>
          {senaraiJawatan.map((r) => <option key={r}>{r}</option>)}
        </select>
      </div>

      <Jadual kepala={['No. Keahlian', 'Nama', 'Jawatan Kerja / Unit', 'No. K/P', 'Umur / Jantina',
                       'Jawatan Kelab', 'Status', 'Tindakan']}>
        {ditapis.map((d) => (
          <tr key={d._baris} className="hover:bg-slate-50">
            <td className="whitespace-nowrap px-4 py-3 font-medium text-brand-700">
              {d.NoAhli || <span className="text-xs font-normal text-slate-400">-</span>}
            </td>
            <td className="px-4 py-3">
              <div className="flex items-center gap-2">
                {d.Gambar && (
                  <a href={d.Gambar} target="_blank" rel="noreferrer"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-xs text-brand-700">
                    📷
                  </a>
                )}
                <div>
                  <p className="font-medium text-slate-800">{d.Nama}</p>
                  <p className="text-xs text-slate-500">{d.Emel || '-'}</p>
                </div>
              </div>
            </td>
            <td className="px-4 py-3 text-slate-600">
              <p>{d.Jawatan || '-'}</p>
              <p className="text-xs text-slate-500">{d.Jabatan || '-'}</p>
            </td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatIC(d.NoKP)}</td>
            <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600">
              {d.Umur || '-'} · {d.Jantina || '-'}
            </td>
            <td className="px-4 py-3">
              <span className={`badge ${WARNA_JAWATAN[d.JawatanKelab] || 'bg-slate-100 text-slate-700'}`}>
                {d.JawatanKelab}
              </span>
              {d.TahapAkses && d.TahapAkses !== 'Tiada' && (
                <p className="mt-1 text-xs text-slate-500">Akses {d.TahapAkses}</p>
              )}
            </td>
            <td className="px-4 py-3">
              <span className={`badge ${warnaStatus(d.StatusAhli)}`}>{d.StatusAhli}</span>
              {d.TarikhSertai && (
                <p className="mt-1 text-xs text-slate-500">Sertai {tarikhMY(d.TarikhSertai)}</p>
              )}
            </td>
            <td className="whitespace-nowrap px-4 py-3">
              <div className="flex gap-1">
                {bolehEdit && (
                  <button className="btn-ghost btn-sm" onClick={() => setBorang({ ...KOSONG, ...d })}>Edit</button>
                )}
                {role === 'Penuh' && (
                  <button className="btn-ghost btn-sm text-red-600" onClick={() => padam(d._baris)}>Padam</button>
                )}
              </div>
            </td>
          </tr>
        ))}
      </Jadual>

      <p className="text-xs text-slate-500">
        Umur dikira dari No. Kad Pengenalan dan jantina dari nama (Bin/Binti) — kedua-duanya
        dikemaskini automatik setiap kali rekod dibaca, jadi umur tidak akan jadi basi.
      </p>

      <Modal buka={!!borang} tutup={() => setBorang(null)} saiz="max-w-3xl"
        tajuk={borang?._baris ? 'Kemaskini Rekod Ahli' : 'Tambah Ahli Baharu'}>
        {borang && (
          <form onSubmit={simpan} className="grid gap-4 sm:grid-cols-2">
            {borang.NoAhli && (
              <div className="sm:col-span-2 rounded-lg bg-brand-50 p-3 text-sm">
                <span className="text-slate-600">No. Keahlian: </span>
                <b className="text-brand-800">{borang.NoAhli}</b>
              </div>
            )}
            {!borang._baris && (
              <p className="sm:col-span-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                No. Keahlian akan dijana automatik semasa simpan.
              </p>
            )}

            <Medan label="Nama Penuh" jajar="sm:col-span-2">
              <input className="input" value={borang.Nama}
                onChange={(e) => setBorang({ ...borang, Nama: e.target.value })} required />
            </Medan>
            <Medan label="No. Kad Pengenalan">
              <input className="input" value={borang.NoKP} inputMode="numeric"
                onChange={(e) => setBorang({ ...borang, NoKP: e.target.value })} required />
            </Medan>
            <Medan label="Umur & Jantina (auto)">
              <div className="flex gap-2">
                <input className="input bg-slate-50" readOnly value={umurAuto || borang.Umur || ''}
                  placeholder="dari IC" />
                <input className="input bg-slate-50" readOnly value={jantinaAutoNilai || borang.Jantina || ''}
                  placeholder="dari nama" />
              </div>
            </Medan>
            <Medan label="Jawatan Kerja (hospital/jabatan)">
              <input className="input" value={borang.Jawatan}
                onChange={(e) => setBorang({ ...borang, Jawatan: e.target.value })} />
            </Medan>
            <Medan label="Jabatan / Unit">
              <input className="input" value={borang.Jabatan}
                onChange={(e) => setBorang({ ...borang, Jabatan: e.target.value })} />
            </Medan>
            <Medan label="Emel">
              <input type="email" className="input" value={borang.Emel}
                onChange={(e) => setBorang({ ...borang, Emel: e.target.value })} />
            </Medan>
            <Medan label="No. Telefon">
              <input className="input" value={borang.Telefon}
                onChange={(e) => setBorang({ ...borang, Telefon: e.target.value })} />
            </Medan>
            <Medan label="Pautan Gambar (Drive)" jajar="sm:col-span-2">
              <input className="input" value={borang.Gambar}
                onChange={(e) => setBorang({ ...borang, Gambar: e.target.value })} />
            </Medan>

            <div className="sm:col-span-2 border-t border-slate-200 pt-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Keahlian Kelab</p>
            </div>
            <Medan label="Jawatan Dalam Kelab">
              <Pilihan nilai={borang.JawatanKelab} kosong={null}
                senarai={senaraiJawatan.length ? senaraiJawatan : ['Ahli Biasa']}
                tukar={(v) => setBorang({ ...borang, JawatanKelab: v })} />
            </Medan>
            <Medan label="Kategori Yuran">
              <Pilihan nilai={borang.Kategori} kosong={null}
                senarai={kadar.length ? kadar.map((k) => k.Kategori) : ['Ahli Biasa']}
                tukar={(v) => setBorang({ ...borang, Kategori: v })} />
              {kadar.find((k) => k.Kategori === borang.Kategori) && (
                <p className="mt-1 text-xs text-slate-500">
                  {kadar.find((k) => k.Kategori === borang.Kategori).Mod || 'Bulanan'} ·
                  RM {kadar.find((k) => k.Kategori === borang.Kategori).Kadar}
                </p>
              )}
            </Medan>
            <div className="sm:col-span-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
              Jawatan menentukan tahap akses mengikut peta di Tetapan → Akses Jawatan.
              Akses log masuk sebenar tetap perlu dicipta di halaman Pengguna.
            </div>
            <Medan label="Status Ahli">
              <Pilihan nilai={borang.StatusAhli} kosong={null} senarai={['Aktif', 'Tidak Aktif']}
                tukar={(v) => setBorang({ ...borang, StatusAhli: v })} />
            </Medan>
            <Medan label="Tarikh Sertai (kosong = hari ini)">
              <input type="date" className="input" value={String(borang.TarikhSertai || '').substring(0, 10)}
                onChange={(e) => setBorang({ ...borang, TarikhSertai: e.target.value })} />
            </Medan>
            <Medan label="Alamat Kediaman" jajar="sm:col-span-2">
              <textarea className="input" rows={2} value={borang.Alamat}
                onChange={(e) => setBorang({ ...borang, Alamat: e.target.value })} />
            </Medan>
            <Medan label="Catatan" jajar="sm:col-span-2">
              <input className="input" value={borang.Catatan}
                onChange={(e) => setBorang({ ...borang, Catatan: e.target.value })} />
            </Medan>

            <div className="sm:col-span-2 flex gap-2">
              <button className="btn-primary flex-1" disabled={sedang}>{sedang ? 'Menyimpan...' : 'Simpan'}</button>
              <button type="button" className="btn-ghost" onClick={() => setBorang(null)}>Batal</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
