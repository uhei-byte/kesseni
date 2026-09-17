import React, { createContext, useContext, useState, useCallback } from 'react'

/* ---------------- Toast ---------------- */
const ToastCtx = createContext(() => {})
export const useToast = () => useContext(ToastCtx)

export function ToastProvider({ children }) {
  const [senarai, setSenarai] = useState([])
  const tambah = useCallback((mesej, jenis = 'info') => {
    const id = Date.now() + Math.random()
    setSenarai((s) => [...s, { id, mesej, jenis }])
    setTimeout(() => setSenarai((s) => s.filter((t) => t.id !== id)), 4500)
  }, [])
  return (
    <ToastCtx.Provider value={tambah}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 no-print">
        {senarai.map((t) => (
          <div
            key={t.id}
            className={`max-w-sm rounded-lg px-4 py-3 text-sm shadow-lg ${
              t.jenis === 'ok' ? 'bg-emerald-600 text-white'
                : t.jenis === 'ralat' ? 'bg-red-600 text-white'
                : 'bg-slate-800 text-white'
            }`}
          >
            {t.mesej}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

/* ---------------- Modal ---------------- */
export function Modal({ buka, tutup, tajuk, children, saiz = 'max-w-2xl' }) {
  if (!buka) return null
  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 no-print">
      <div className={`mt-8 w-full ${saiz} rounded-xl bg-white shadow-xl`}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h3 className="font-semibold text-slate-800">{tajuk}</h3>
          <button onClick={tutup} className="text-2xl leading-none text-slate-400 hover:text-slate-700">&times;</button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  )
}

/* ---------------- Medan borang ---------------- */
export function Medan({ label, children, jajar = '' }) {
  return (
    <div className={jajar}>
      <label className="label">{label}</label>
      {children}
    </div>
  )
}

export function Pilihan({ nilai, tukar, senarai, kosong = '- Pilih -', ...rest }) {
  return (
    <select className="input" value={nilai} onChange={(e) => tukar(e.target.value)} {...rest}>
      {kosong !== null && <option value="">{kosong}</option>}
      {senarai.map((s) => (
        <option key={s.nilai ?? s} value={s.nilai ?? s}>{s.label ?? s}</option>
      ))}
    </select>
  )
}

/* ---------------- Kad statistik ---------------- */
export function KadStat({ tajuk, nilai, sub, warna = 'text-slate-800', ikon }) {
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{tajuk}</p>
          <p className={`mt-1 text-2xl font-semibold ${warna}`}>{nilai}</p>
          {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
        </div>
        {ikon && <span className="text-2xl opacity-70">{ikon}</span>}
      </div>
    </div>
  )
}

/* ---------------- Jadual ---------------- */
export function Jadual({ kepala, children, kosong = 'Tiada rekod' }) {
  const adaBaris = React.Children.count(children) > 0
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>{kepala.map((h) => <th key={h} className="whitespace-nowrap px-4 py-3 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {adaBaris ? children : (
              <tr><td colSpan={kepala.length} className="px-4 py-10 text-center text-slate-400">{kosong}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function Spinner({ teks = 'Memuatkan...' }) {
  return (
    <div className="flex items-center justify-center gap-3 py-12 text-sm text-slate-500">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-brand-700" />
      {teks}
    </div>
  )
}
