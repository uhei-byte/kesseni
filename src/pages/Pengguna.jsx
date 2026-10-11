import React, { useEffect, useMemo, useState } from 'react'
import { panggil, ambilSesi } from '../lib/api'
import { tarikhMY } from '../lib/utils'
import { Jadual, Modal, Medan, Pilihan, Spinner, useToast } from '../components/ui'

const KOSONG = { emel: '', role: 'Kewangan', aktif: 'YA', kataLaluan: '' }

const HURAIAN = {
  'Penuh': 'Semua akses — konfigurasi, logo, akaun pengguna, padam rekod',
  'Kewangan': 'Duit masuk & keluar, sahkan bayaran, invois, resit, laporan',
  'Pentadbiran': 'Staf & rekod yuran, jana no. keahlian, laporan',
  'Lihat Sahaja': 'Boleh lihat semua data dan laporan, tidak boleh ubah apa-apa (sesuai Juru Audit)',
  'Tiada': 'Tiada akses panel admin — portal ahli sahaja'
}

const WARNA = {
  'Penuh': 'bg-purple-100 text-purple-800',
  'Kewangan': 'bg-blue-100 text-blue-800',
  'Pentadbiran': 'bg-cyan-100 text-cyan-800',
  'Lihat Sahaja': 'bg-slate-100 text-slate-700'
}

export default function Pengguna() {
  const toast = useToast()
  const saya = ambilSesi()
  const [data, setData] = useState(null)
  const [senaraiRole, setSenaraiRole] = useState(['Penuh', 'Kewangan', 'Pentadbiran', 'Lihat Sahaja', 'Tiada'])
  const [staf, setStaf] = useState([])
  const [borang, setBorang] = useState(null)
  const [sedang, setSedang] = useState(false)

  const muat = () => {
    setData(null)
    Promise.all([panggil('senaraiAkaun'), panggil('senarai', { tab: 'Staf' })])
      .then(([a, s]) => {
        if (a.ok) { setData(a.data); if (a.role) setSenaraiRole(a.role) }
        else toast(a.mesej, 'ralat')
        if (s.ok) setStaf(s.data)
      })
      .catch((e) => toast(e.message, 'ralat'))
  }
  useEffect(muat, [])

  // Staf yang ada role bukan "Ahli" tapi belum ada akaun log masuk
  const belumAdaAkaun = useMemo(() => {
    if (!data) return []
    const emelAkaun = new Set(data.map((a) => String(a.Emel).toLowerCase()))
    return staf.filter((s) => s.TahapAkses && s.TahapAkses !== 'Tiada' && s.Emel &&
      !emelAkaun.has(String(s.Emel).toLowerCase()))
  }, [data, staf])

  const simpan = async (e) => {
    e.preventDefault()
    setSedang(true)
    try {
      const r = await panggil('simpanAkaun', borang)
      if (r.ok) {
        toast(r.mesej + (r.kataLaluanSementara ? ` · Kata laluan sementara: ${r.kataLaluanSementara}` : ''), 'ok')
        setBorang(null); muat()
      } else toast(r.mesej, 'ralat')
    } catch (err) { toast(err.message, 'ralat') }
    setSedang(false)
  }

  const padam = async (baris) => {
    if (!confirm('Padam akaun ini? Pengguna tidak akan boleh log masuk lagi.')) return
    const r = await panggil('padamAkaun', { baris })
    r.ok ? (toast('Akaun dipadam', 'ok'), muat()) : toast(r.mesej, 'ralat')
  }

  if (!data) return <Spinner />

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Pengguna Sistem</h1>
          <p className="text-sm text-slate-500">
            Akaun log masuk panel admin · {data.length} akaun
          </p>
        </div>
        <button className="btn-primary btn-sm" onClick={() => setBorang({ ...KOSONG })}>+ Tambah Akaun</button>
      </div>

      {belumAdaAkaun.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-900">
            {belumAdaAkaun.length} ahli ada jawatan yang layak akses tapi belum ada akaun log masuk
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {belumAdaAkaun.map((s) => (
              <button key={s._baris} className="btn-ghost btn-sm"
                onClick={() => setBorang({ ...KOSONG, emel: s.Emel, role: s.TahapAkses })}>
                + {s.Nama} · {s.JawatanKelab} → {s.TahapAkses}
              </button>
            ))}
          </div>
        </div>
      )}

      <Jadual kepala={['Emel', 'Tahap Akses', 'Status', 'Dicipta', 'Login Terakhir', 'Tindakan']}>
        {data.map((a) => (
          <tr key={a._baris} className="hover:bg-slate-50">
            <td className="px-4 py-3">
              <p className="font-medium text-slate-800">{a.Emel}</p>
              {String(a.Emel).toLowerCase() === String(saya.emel).toLowerCase() && (
                <p className="text-xs text-brand-700">Akaun anda</p>
              )}
            </td>
            <td className="px-4 py-3">
              <span className={`badge ${WARNA[a.Role] || 'bg-slate-100 text-slate-700'}`}>
                Akses {a.Role}
              </span>
              <p className="mt-1 max-w-xs text-xs text-slate-500">{HURAIAN[a.Role]}</p>
            </td>
            <td className="px-4 py-3">
              <span className={`badge ${String(a.Aktif).toUpperCase() === 'YA'
                ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>
                {String(a.Aktif).toUpperCase() === 'YA' ? 'Aktif' : 'Nyahaktif'}
              </span>
            </td>
            <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{tarikhMY(a.TarikhCipta)}</td>
            <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
              {a.LoginTerakhir ? String(a.LoginTerakhir).substring(0, 16) : 'Belum pernah'}
            </td>
            <td className="whitespace-nowrap px-4 py-3">
              <div className="flex gap-1">
                <button className="btn-ghost btn-sm"
                  onClick={() => setBorang({ emel: a.Emel, role: a.Role, aktif: a.Aktif, kataLaluan: '', _edit: true })}>
                  Edit
                </button>
                <button className="btn-ghost btn-sm text-red-600" onClick={() => padam(a._baris)}>Padam</button>
              </div>
            </td>
          </tr>
        ))}
      </Jadual>

      <div className="card p-4 text-sm">
        <p className="mb-2 font-medium text-slate-800">Beza antara Jawatan, Peta Akses dan Akaun</p>
        <ul className="list-inside list-disc space-y-1 text-slate-600">
          <li><b>Jawatan dalam Staff Database</b> — struktur organisasi (Pengerusi, Bendahari, AJK…).</li>
          <li><b>Peta di Tetapan → Akses Jawatan</b> — menukar jawatan kepada tahap akses yang sepatutnya.</li>
          <li><b>Akaun di halaman ini</b> — yang benar-benar membolehkan log masuk. Tahap di sini yang dikuatkuasakan.</li>
        </ul>
      </div>

      <Modal buka={!!borang} tutup={() => setBorang(null)}
        tajuk={borang?._edit ? 'Kemaskini Akaun' : 'Tambah Akaun Baharu'} saiz="max-w-lg">
        {borang && (
          <form onSubmit={simpan} className="space-y-4">
            <Medan label="Emel">
              <input type="email" className="input" value={borang.emel} readOnly={borang._edit}
                onChange={(e) => setBorang({ ...borang, emel: e.target.value })} required />
            </Medan>
            <Medan label="Tahap Akses">
              <Pilihan nilai={borang.role} kosong={null} senarai={senaraiRole.filter((r) => r !== 'Tiada')}
                tukar={(v) => setBorang({ ...borang, role: v })} />
            </Medan>
            <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">{HURAIAN[borang.role]}</p>
            <Medan label="Status Akaun">
              <Pilihan nilai={borang.aktif} kosong={null} senarai={['YA', 'TIDAK']}
                tukar={(v) => setBorang({ ...borang, aktif: v })} />
            </Medan>
            <Medan label={borang._edit ? 'Kata Laluan Baharu (kosongkan jika tak tukar)' : 'Kata Laluan (min 8 aksara)'}>
              <input type="password" className="input" value={borang.kataLaluan} minLength={borang._edit ? 0 : 8}
                onChange={(e) => setBorang({ ...borang, kataLaluan: e.target.value })} />
            </Medan>
            {!borang._edit && (
              <p className="text-xs text-slate-500">
                Kosongkan untuk guna kata laluan lalai. Butiran akaun akan diemel kepada pengguna.
              </p>
            )}
            <div className="flex gap-2">
              <button className="btn-primary flex-1" disabled={sedang}>{sedang ? 'Menyimpan...' : 'Simpan'}</button>
              <button type="button" className="btn-ghost" onClick={() => setBorang(null)}>Batal</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
