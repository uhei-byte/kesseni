import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import AdminLayout from '../components/AdminLayout'
import { ambilToken, ambilSesi } from '../lib/api'

import Login from '../pages/Login'
import Dashboard from '../pages/Dashboard'
import DuitMasuk from '../pages/DuitMasuk'
import DuitKeluar from '../pages/DuitKeluar'
import Staf from '../pages/Staf'
import RekodYuran from '../pages/RekodYuran'
import Invois from '../pages/Invois'
import Resit from '../pages/Resit'
import Laporan from '../pages/Laporan'
import Pengguna from '../pages/Pengguna'
import Tetapan from '../pages/Tetapan'

function Lindung({ children }) {
  return ambilToken() ? children : <Navigate to="/login" replace />
}

/** Sekatan paparan ikut role. Kuat kuasa sebenar tetap di server. */
function Role({ benarkan, children }) {
  const { role } = ambilSesi()
  if (!benarkan.includes(role)) {
    return (
      <div className="card p-8 text-center">
        <p className="text-3xl">🚫</p>
        <p className="mt-2 font-medium text-slate-800">Tiada kebenaran</p>
        <p className="text-sm text-slate-500">
          Halaman ini hanya untuk {benarkan.join(', ')}. Role anda: {role || '-'}
        </p>
      </div>
    )
  }
  return children
}

const KEWANGAN = ['Superadmin', 'Bendahari']
const STAF = ['Superadmin', 'Setiausaha']
const YURAN = ['Superadmin', 'Setiausaha', 'Bendahari']
const SUPER = ['Superadmin']

export default function AdminApp() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Lindung><AdminLayout /></Lindung>}>
        <Route index element={<Dashboard />} />
        <Route path="duit-masuk" element={<Role benarkan={KEWANGAN}><DuitMasuk /></Role>} />
        <Route path="duit-keluar" element={<Role benarkan={KEWANGAN}><DuitKeluar /></Role>} />
        <Route path="staf" element={<Role benarkan={STAF}><Staf /></Role>} />
        <Route path="yuran" element={<Role benarkan={YURAN}><RekodYuran /></Role>} />
        <Route path="invois" element={<Role benarkan={KEWANGAN}><Invois /></Role>} />
        <Route path="resit" element={<Role benarkan={KEWANGAN}><Resit /></Role>} />
        <Route path="laporan" element={<Laporan />} />
        <Route path="pengguna" element={<Role benarkan={SUPER}><Pengguna /></Role>} />
        <Route path="tetapan" element={<Role benarkan={SUPER}><Tetapan /></Role>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
