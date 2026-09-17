import React, { useEffect, useMemo, useState } from 'react'
import { panggil, ambilSesi } from '../lib/api'
import { tarikhMY, warnaStatus, formatIC, muatTurunCSV } from '../lib/utils'
import { Jadual, Modal, Medan, Pilihan, Spinner, useToast, KadStat } from '../components/ui'

const KOSONG = {
  Nama: '', NoKP: '', Umur: '', Jantina: 'Wanita', Jawatan: '', Jabatan: '',
  Emel: '', Telefon: '', SijilCP: '', TarikhMula: '', TarikhTamat: '', Gambar: '',
  Role: 'Ahli', Kategori: 'Ahli Biasa', StatusAhli: 'Aktif', Alamat: '', Catatan: ''
}

const HURAIAN_ROLE = {
  Superadmin: 'Kawalan penuh — tetapan, akaun pengguna, padam rekod',
  Bendahari: 'Urus kewangan — sahkan bayaran, duit masuk/keluar, invois, resit',
  Setiausaha: 'Urus staf & rekod yuran, lihat laporan',
  Ahli: 'Guna portal ahli sahaja (tiada akses panel admin)'
}

export default function Staf() {
  const toast = useToast()
  const { role } = ambilSesi()
  const [data, setData] = useState(null)
  const [senaraiRole, setSenaraiRole] = useState(['Superadmin', 'Bendahari', 'Setiausaha', 'Ahli'])
  const [kadar, setKadar] = useState([])
  const [cari, setCari] = useState('')
  const [tapisJabatan, setTapisJabatan] = useState('')
  const [tapisRole, setTapisRole] = useState('')
  const [borang, setBorang] = useState(null)
  const [sedang, setSedang] = useState(false)
  const [ralat, setRalat] = useState('')

  const muat = () => {
    setData(null); setRalat('')
    Promise.all([
      panggil('senarai', { tab: 'Staf' }),
      panggil('senarai', { tab: 'KadarYuran' })
    ]).then(([s, k]) => {
      if (s.ok) { setData(s.data); if (s.senaraiRole) setSenaraiRole(s.senaraiRole) }
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
      if (tapisRole && d.Role !== tapisRole) return false
      if (cari) {
        const t = cari.toLowerCase()
        return [d.Nama, d.NoKP, d.Emel, d.Jawatan, d.Telefon]
          .some((v) => String(v || '').toLowerCase().includes(t))
      }
      return true
    })
  }, [data, cari, tapisJabatan, tapisRole])

  const simpan = async (e) => {
    e.preventDefault()
    setSedang(true)
    try {
      const r = await panggil('simpanStaf', { baris: borang._baris, data: borang })
      if (r.ok) { toast('Rekod staf disimpan', 'ok'); setBorang(null); muat() }
      else toast(r.mesej, 'ralat')
    } catch (err) { toast(err.message, 'ralat') }
    setSedang(false)
  }

  const padam = async (baris) => {
    if (!confirm('Padam rekod staf ini daripada staff database? Rekod yuran sedia ada tidak dipadam.')) return
    const r = await panggil('padamStaf', { baris })
    r.ok ? (toast('Rekod dipadam', 'ok'), muat()) : toast(r.mesej, 'ralat')
  }

  if (!data) return <Spinner />

  const bilRole = (nama) => data.filter((d) => d.Role === nama).length

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
          <button className="btn-ghost btn-sm" onClick={() => muatTurunCSV('senarai-staf.csv',
            ['Nama', 'NoKP', 'Jawatan', 'Jabatan', 'Emel', 'Telefon', 'Role', 'Kategori', 'StatusAhli'], ditapis)}>
            Muat Turun CSV
          </button>
          <button className="btn-primary btn-sm" onClick={() => setBorang({ ...KOSONG })}>+ Tambah Staf</button>
        </div>
      </div>

      {ralat && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-medium">Staff database tidak dapat dibaca</p>
          <p className="mt-1">{ralat}</p>
          <p className="mt-1 text-xs">
            Semak <b>STAF_SPREADSHEET_ID</b> dan <b>STAF_NAMA_TAB</b> di halaman Tetapan.
          </p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-4">
        <KadStat tajuk="Jumlah Staf" nilai={data.length} ikon="👥" />
        <KadStat tajuk="Ahli Aktif" nilai={data.filter((d) => d.StatusAhli !== 'Tidak Aktif').length} warna="text-emerald-600" />
        <KadStat tajuk="Bendahari" nilai={bilRole('Bendahari')} />
        <KadStat tajuk="Setiausaha" nilai={bilRole('Setiausaha')} />
      </div>

      <div className="flex flex-wrap gap-2">
        <input className="input max-w-xs" placeholder="Cari nama / IC / emel..."
          value={cari} onChange={(e) => setCari(e.target.value)} />
        <select className="input max-w-[180px]" value={tapisJabatan} onChange={(e) => setTapisJabatan(e.target.value)}>
          <option value="">Semua Jabatan/Unit</option>
          {jabatanSenarai.map((j) => <option key={j}>{j}</option>)}
        </select>
        <select className="input max-w-[160px]" value={tapisRole} onChange={(e) => setTapisRole(e.target.value)}>
          <option value="">Semua Role</option>
          {senaraiRole.map((r) => <option key={r}>{r}</option>)}
        </select>
      </div>

      <Jadual kepala={['Nama', 'Jawatan / Unit', 'No. K/P', 'Hubungi', 'Sijil C&P', 'Role', 'Status', 'Tindakan']}>
        {ditapis.map((d) => (
          <tr key={d._baris} className="hover:bg-slate-50">
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
            <td className="px-4 py-3 text-xs text-slate-600">{d.Telefon || '-'}</td>
            <td className="px-4 py-3 text-xs">
              {d.SijilCP ? (
                <>
                  <span className="badge bg-emerald-100 text-emerald-800">Ada</span>
                  {d.TarikhTamat && <p className="mt-1 text-slate-500">Tamat {tarikhMY(d.TarikhTamat)}</p>}
                </>
              ) : <span className="text-slate-400">-</span>}
            </td>
            <td className="px-4 py-3">
              <span className={`badge ${
                d.Role === 'Superadmin' ? 'bg-purple-100 text-purple-800'
                  : d.Role === 'Bendahari' ? 'bg-blue-100 text-blue-800'
                  : d.Role === 'Setiausaha' ? 'bg-cyan-100 text-cyan-800'
                  : 'bg-slate-100 text-slate-700'
              }`}>{d.Role}</span>
            </td>
            <td className="px-4 py-3"><span className={`badge ${warnaStatus(d.StatusAhli)}`}>{d.StatusAhli}</span></td>
            <td className="whitespace-nowrap px-4 py-3">
              <div className="flex gap-1">
                <button className="btn-ghost btn-sm" onClick={() => setBorang({ ...KOSONG, ...d })}>Edit</button>
                {role === 'Superadmin' && (
                  <button className="btn-ghost btn-sm text-red-600" onClick={() => padam(d._baris)}>Padam</button>
                )}
              </div>
            </td>
          </tr>
        ))}
      </Jadual>

      <p className="text-xs text-slate-500">
        Nota: rekod ini ditulis terus ke Staff Database sedia ada. Lajur asal (nama, jawatan, sijil)
        tidak diubah strukturnya — sistem hanya menambah lajur ROLE, KATEGORI YURAN, STATUS AHLI dan ALAMAT.
      </p>

      <Modal buka={!!borang} tutup={() => setBorang(null)} saiz="max-w-3xl"
        tajuk={borang?._baris ? 'Kemaskini Rekod Staf' : 'Tambah Staf Baharu'}>
        {borang && (
          <form onSubmit={simpan} className="grid gap-4 sm:grid-cols-2">
            <Medan label="Nama Penuh" jajar="sm:col-span-2">
              <input className="input" value={borang.Nama}
                onChange={(e) => setBorang({ ...borang, Nama: e.target.value })} required />
            </Medan>
            <Medan label="No. Kad Pengenalan">
              <input className="input" value={borang.NoKP} inputMode="numeric"
                onChange={(e) => setBorang({ ...borang, NoKP: e.target.value })} required />
            </Medan>
            <Medan label="Umur">
              <input type="number" className="input" value={borang.Umur}
                onChange={(e) => setBorang({ ...borang, Umur: e.target.value })} />
            </Medan>
            <Medan label="Jantina">
              <Pilihan nilai={borang.Jantina} kosong={null} senarai={['Wanita', 'Lelaki']}
                tukar={(v) => setBorang({ ...borang, Jantina: v })} />
            </Medan>
            <Medan label="Jawatan">
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
            <Medan label="Pautan Gambar (Drive)">
              <input className="input" value={borang.Gambar}
                onChange={(e) => setBorang({ ...borang, Gambar: e.target.value })} />
            </Medan>

            <div className="sm:col-span-2 border-t border-slate-200 pt-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Sijil C&amp;P HN</p>
            </div>
            <Medan label="Ada Sijil?">
              <Pilihan nilai={borang.SijilCP} senarai={['Ya', 'Tidak']} kosong="- Tiada -"
                tukar={(v) => setBorang({ ...borang, SijilCP: v })} />
            </Medan>
            <Medan label="Tarikh Mula">
              <input type="date" className="input" value={String(borang.TarikhMula || '').substring(0, 10)}
                onChange={(e) => setBorang({ ...borang, TarikhMula: e.target.value })} />
            </Medan>
            <Medan label="Tarikh Tamat Sijil">
              <input type="date" className="input" value={String(borang.TarikhTamat || '').substring(0, 10)}
                onChange={(e) => setBorang({ ...borang, TarikhTamat: e.target.value })} />
            </Medan>

            <div className="sm:col-span-2 border-t border-slate-200 pt-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Keahlian Kelab</p>
            </div>
            <Medan label="Role / Peranan Sistem">
              <Pilihan nilai={borang.Role} kosong={null} senarai={senaraiRole}
                tukar={(v) => setBorang({ ...borang, Role: v })} />
            </Medan>
            <Medan label="Kategori Yuran">
              <Pilihan nilai={borang.Kategori} kosong={null}
                senarai={kadar.length ? kadar.map((k) => k.Kategori) : ['Ahli Biasa', 'AJK']}
                tukar={(v) => setBorang({ ...borang, Kategori: v })} />
            </Medan>
            <div className="sm:col-span-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
              <b>{borang.Role}:</b> {HURAIAN_ROLE[borang.Role]}
              {borang.Role !== 'Ahli' && (
                <p className="mt-1 text-amber-700">
                  Role sahaja tidak memberi akses log masuk — akaun perlu dicipta di halaman Pengguna.
                </p>
              )}
            </div>
            <Medan label="Status Ahli">
              <Pilihan nilai={borang.StatusAhli} kosong={null} senarai={['Aktif', 'Tidak Aktif']}
                tukar={(v) => setBorang({ ...borang, StatusAhli: v })} />
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
