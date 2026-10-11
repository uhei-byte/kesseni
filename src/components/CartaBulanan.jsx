import React from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { rm } from '../lib/utils'

/** Dimuat secara lazy — pustaka carta tidak dimuat turun sehingga papan pemuka dibuka */
export default function CartaBulanan({ data }) {
  const warna = getComputedStyle(document.documentElement).getPropertyValue('--brand-600').trim() || '#0d9488'
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="bulan" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
          <Tooltip formatter={(v) => rm(v)} contentStyle={{ borderRadius: 8, fontSize: 13 }} />
          <Legend wrapperStyle={{ fontSize: 13 }} />
          <Bar dataKey="masuk" name="Duit Masuk" fill={warna} radius={[4, 4, 0, 0]} />
          <Bar dataKey="keluar" name="Duit Keluar" fill="#f97316" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
