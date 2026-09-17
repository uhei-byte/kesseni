import React, { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { padamSesi, ambilSesi } from '../lib/api'
import { useKonfig, Logo } from '../lib/konfig.jsx'

const MENU = [
  { ke: '/', label: 'Papan Pemuka', ikon: '📊', hujung: true, role: '*' },
  { ke: '/duit-masuk', label: 'Duit Masuk', ikon: '💰', role: ['Superadmin', 'Bendahari'] },
  { ke: '/duit-keluar', label: 'Duit Keluar', ikon: '💸', role: ['Superadmin', 'Bendahari'] },
  { ke: '/staf', label: 'Staf & Ahli', ikon: '👥', role: ['Superadmin', 'Setiausaha'] },
  { ke: '/yuran', label: 'Rekod Yuran', ikon: '📅', role: ['Superadmin', 'Setiausaha', 'Bendahari'] },
  { ke: '/invois', label: 'Invois', ikon: '🧾', role: ['Superadmin', 'Bendahari'] },
  { ke: '/resit', label: 'Resit', ikon: '🧿', role: ['Superadmin', 'Bendahari'] },
  { ke: '/laporan', label: 'Laporan', ikon: '📈', role: '*' },
  { ke: '/pengguna', label: 'Pengguna', ikon: '🔑', role: ['Superadmin'] },
  { ke: '/tetapan', label: 'Tetapan', ikon: '⚙️', role: ['Superadmin'] }
]

const WARNA_ROLE = {
  Superadmin: 'bg-purple-100 text-purple-800',
  Bendahari: 'bg-blue-100 text-blue-800',
  Setiausaha: 'bg-cyan-100 text-cyan-800'
}

export default function AdminLayout() {
  const [bukaMenu, setBukaMenu] = useState(false)
  const navigate = useNavigate()
  const { role, emel } = ambilSesi()
  const { kelab } = useKonfig()

  const menu = MENU.filter((m) => m.role === '*' || m.role.includes(role))

  const logKeluar = () => {
    padamSesi()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white no-print">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <button className="rounded p-1 text-slate-500 lg:hidden" onClick={() => setBukaMenu(!bukaMenu)}>☰</button>
            <Logo saiz={34} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-tight text-brand-800">
                {kelab?.namaSingkat || 'Sistem'}
              </p>
              <p className="text-xs text-slate-500">Panel Admin</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-xs font-medium text-slate-700">{emel}</p>
              <span className={`badge ${WARNA_ROLE[role] || 'bg-slate-100 text-slate-700'}`}>{role}</span>
            </div>
            <button onClick={logKeluar} className="btn-ghost btn-sm">Log Keluar</button>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className={`${bukaMenu ? 'block' : 'hidden'} fixed inset-y-0 left-0 z-20 mt-14 w-60 border-r border-slate-200 bg-white p-3 lg:static lg:mt-0 lg:block no-print`}>
          <nav className="flex flex-col gap-1">
            {menu.map((m) => (
              <NavLink key={m.ke} to={m.ke} end={m.hujung} onClick={() => setBukaMenu(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                    isActive ? 'bg-brand-50 font-medium text-brand-800' : 'text-slate-600 hover:bg-slate-50'
                  }`
                }>
                <span>{m.ikon}</span>{m.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
