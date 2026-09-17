import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { panggil, simpanSesi } from '../lib/api'
import { useToast } from '../components/ui'
import { Logo, useKonfig } from '../lib/konfig.jsx'

export default function Login() {
  const [emel, setEmel] = useState('')
  const [kataLaluan, setKataLaluan] = useState('')
  const [memuat, setMemuat] = useState(false)
  const navigate = useNavigate()
  const toast = useToast()
  const { kelab } = useKonfig()

  const masuk = async (e) => {
    e.preventDefault()
    setMemuat(true)
    try {
      const r = await panggil('login', { emel, kataLaluan }, { awam: true })
      if (r.ok) {
        simpanSesi(r.token, r.tamat, r.role, r.emel)
        if (r.lalai) toast('Anda masih guna kata laluan lalai. Sila tukar di Tetapan.', 'ralat')
        navigate('/')
      } else toast(r.mesej, 'ralat')
    } catch (err) { toast(err.message, 'ralat') }
    setMemuat(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-brand-50 to-slate-100 p-4">
      <div className="card w-full max-w-sm p-6">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center"><Logo saiz={56} /></div>
          <h1 className="font-semibold text-slate-800">Log Masuk Sistem</h1>
          <p className="text-xs text-slate-500">{kelab?.namaSingkat || 'Sistem Kewangan'}</p>
        </div>
        <form onSubmit={masuk} className="space-y-4">
          <div>
            <label className="label">Emel</label>
            <input type="email" className="input" value={emel} autoFocus autoComplete="username"
              onChange={(e) => setEmel(e.target.value)} required />
          </div>
          <div>
            <label className="label">Kata Laluan</label>
            <input type="password" className="input" value={kataLaluan} autoComplete="current-password"
              onChange={(e) => setKataLaluan(e.target.value)} required />
          </div>
          <button className="btn-primary w-full" disabled={memuat}>
            {memuat ? 'Menyemak...' : 'Log Masuk'}
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-slate-400">
          Akaun diberi oleh Superadmin. Lupa kata laluan? Hubungi Superadmin untuk reset.
        </p>
        <a href="/" className="mt-3 block text-center text-xs text-slate-500 hover:text-brand-700">
          ← Kembali ke Portal Ahli
        </a>
      </div>
    </div>
  )
}
