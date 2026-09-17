import React, { useEffect, useState, Suspense, lazy } from 'react'
import { Link } from 'react-router-dom'
import { panggil, ambilSesi } from '../lib/api'
import { rm, tarikhMY, warnaStatus } from '../lib/utils'
import { KadStat, Spinner, useToast } from '../components/ui'

const CartaBulanan = lazy(() => import('../components/CartaBulanan'))

export default function Dashboard() {
  const [data, setData] = useState(null)
  const toast = useToast()

  useEffect(() => {
    panggil('dashboard')
      .then((r) => (r.ok ? setData(r) : toast(r.mesej, 'ralat')))
      .catch((e) => toast(e.message, 'ralat'))
  }, [])

  if (!data) return <Spinner />
  const r = data.ringkasan

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Papan Pemuka</h1>
        <p className="text-sm text-slate-500">Ringkasan kewangan kelab</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KadStat tajuk="Jumlah Duit Masuk" nilai={rm(r.jumlahMasuk)} warna="text-emerald-600" ikon="💰" sub="Disahkan sahaja" />
        <KadStat tajuk="Jumlah Duit Keluar" nilai={rm(r.jumlahKeluar)} warna="text-red-600" ikon="💸" />
        <KadStat tajuk="Baki Semasa" nilai={rm(r.baki)} warna={r.baki >= 0 ? 'text-brand-700' : 'text-red-600'} ikon="🏦" />
        <KadStat tajuk="Menunggu Pengesahan" nilai={r.bilanganPending} sub={rm(r.amaunPending)} warna="text-amber-600" ikon="⏳" />
      </div>

      {data.ralatStaf && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <b>Staff database tidak dapat dibaca:</b> {data.ralatStaf}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <KadStat tajuk="Ahli Aktif" nilai={r.bilanganAhli} sub={`${r.bilanganStaf} rekod staf`} ikon="👥" />
        <KadStat tajuk="Yuran Terkumpul (tahun ini)" nilai={rm(r.yuranTerkumpul)} warna="text-emerald-600" />
        <KadStat tajuk="Yuran Tertunggak" nilai={rm(r.yuranTertunggak)} warna="text-red-600" />
      </div>

      {r.bilanganPending > 0 && ['Superadmin', 'Bendahari'].includes(ambilSesi().role) && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-800">
            <b>{r.bilanganPending} bayaran</b> menunggu pengesahan anda ({rm(r.amaunPending)}).{' '}
            <Link to="/duit-masuk" className="font-medium underline">Semak sekarang →</Link>
          </p>
        </div>
      )}

      {data.sijilHampirTamat?.length > 0 && (
        <div className="card p-4">
          <h2 className="mb-3 font-medium text-slate-800">
            Sijil C&amp;P HN akan tamat / sudah tamat
          </h2>
          <div className="divide-y divide-slate-100">
            {data.sijilHampirTamat.map((s, i) => (
              <div key={i} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <p className="font-medium text-slate-700">{s.nama}</p>
                  <p className="text-xs text-slate-500">{s.jawatan}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">{tarikhMY(s.tarikhTamat)}</p>
                  <span className={`badge ${s.hari < 0 ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                    {s.hari < 0 ? `Tamat ${Math.abs(s.hari)} hari lalu` : `${s.hari} hari lagi`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card p-4">
        <h2 className="mb-4 font-medium text-slate-800">Aliran Tunai Bulanan {new Date().getFullYear()}</h2>
        <Suspense fallback={<Spinner teks="Memuat carta..." />}>
          <CartaBulanan data={data.bulanan} />
        </Suspense>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-4">
          <h2 className="mb-3 font-medium text-slate-800">Duit Masuk Ikut Kategori</h2>
          {data.kategori.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">Tiada data</p>
          ) : (
            <div className="space-y-2">
              {data.kategori.map((k) => {
                const maks = Math.max(...data.kategori.map((x) => x.amaun)) || 1
                return (
                  <div key={k.nama}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="text-slate-600">{k.nama}</span>
                      <span className="font-medium text-slate-800">{rm(k.amaun)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div className="h-2 rounded-full bg-brand-600" style={{ width: `${(k.amaun / maks) * 100}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="card p-4">
          <h2 className="mb-3 font-medium text-slate-800">Transaksi Terkini</h2>
          <div className="divide-y divide-slate-100">
            {data.terkini.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">Tiada transaksi</p>
            ) : data.terkini.map((t) => (
              <div key={t.ID} className="flex items-center justify-between py-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-700">{t.Nama || t.Kategori}</p>
                  <p className="text-xs text-slate-500">{tarikhMY(t.Tarikh)} · {t.Kategori}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-slate-800">{rm(t.Amaun)}</p>
                  <span className={`badge ${warnaStatus(t.Status)}`}>{t.Status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
