import React from 'react'
import { rm, tarikhMY } from '../lib/utils'
import { useKonfig } from '../lib/konfig.jsx'

/**
 * Templat cetakan A4 untuk Invois & Resit.
 * Logo, nama organisasi, maklumat bank dan nota kaki semuanya datang dari
 * konfigurasi sistem — client lain yang muat naik logo berbeza akan dapat
 * dokumen berlogo mereka sendiri tanpa sebarang perubahan kod.
 */
export default function DokumenCetak({ jenis, dok, kelab: kelabProp }) {
  const konfig = useKonfig()
  const kelab = kelabProp || konfig.kelab || {}
  const invois = jenis === 'invois'
  const logo = kelab.logo || '/icons/logo.png'

  return (
    <div className="print-area mx-auto max-w-3xl bg-white p-8 text-sm text-slate-800 shadow-sm">
      <div className="mb-6 flex items-start gap-4 border-b-2 border-brand-700 pb-4">
        <img src={logo} alt="" className="h-20 w-20 shrink-0 object-contain"
          onError={(e) => { e.currentTarget.style.visibility = 'hidden' }} />
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-bold leading-tight text-brand-800">{kelab.nama}</h1>
          {kelab.pendaftaran && (
            <p className="text-xs text-slate-500">No. Pendaftaran: {kelab.pendaftaran}</p>
          )}
          {kelab.alamat && <p className="text-xs text-slate-500">{kelab.alamat}</p>}
          {kelab.telefon && <p className="text-xs text-slate-500">Tel: {kelab.telefon}</p>}
        </div>
      </div>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            {invois ? 'Kepada' : 'Diterima Daripada'}
          </p>
          <p className="font-semibold">{invois ? dok.KepadaNama : dok.DaripadaNama}</p>
          {invois && dok.KepadaAlamat && (
            <p className="max-w-xs whitespace-pre-line text-xs text-slate-600">{dok.KepadaAlamat}</p>
          )}
        </div>
        <div className="text-right">
          <h2 className="text-xl font-bold uppercase tracking-wide text-slate-800">
            {invois ? 'Invois' : 'Resit Rasmi'}
          </h2>
          <p className="text-sm font-medium text-brand-700">{invois ? dok.NoInvois : dok.NoResit}</p>
          <p className="text-xs text-slate-500">Tarikh: {tarikhMY(dok.Tarikh)}</p>
        </div>
      </div>

      <table className="mb-6 w-full border-collapse text-sm">
        <thead>
          <tr className="bg-slate-100 text-left">
            <th className="border border-slate-300 px-3 py-2">Perkara</th>
            <th className="w-40 border border-slate-300 px-3 py-2 text-right">Amaun</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-slate-300 px-3 py-3 align-top">
              {dok.Perkara}
              {!invois && dok.KaedahBayaran && (
                <p className="mt-1 text-xs text-slate-500">Kaedah bayaran: {dok.KaedahBayaran}</p>
              )}
            </td>
            <td className="border border-slate-300 px-3 py-3 text-right">{rm(dok.Amaun)}</td>
          </tr>
          <tr className="font-semibold">
            <td className="border border-slate-300 px-3 py-2 text-right">JUMLAH</td>
            <td className="border border-slate-300 px-3 py-2 text-right">{rm(dok.Amaun)}</td>
          </tr>
        </tbody>
      </table>

      {invois ? (
        <div className="mb-8 rounded-lg bg-slate-50 p-4 text-xs">
          <p className="mb-1 font-semibold text-slate-700">Maklumat Pembayaran</p>
          <p>{kelab.bank}</p>
          <p>No. Akaun: <b>{kelab.akaun}</b></p>
          <p>Nama Akaun: {kelab.nama}</p>
          <p className="mt-2 text-slate-500">
            Sila nyatakan no. invois {dok.NoInvois} sebagai rujukan pembayaran.
          </p>
        </div>
      ) : (
        <p className="mb-8 text-xs text-slate-500">
          Resit ini adalah pengesahan penerimaan bayaran seperti dinyatakan di atas.
        </p>
      )}

      {dok.Catatan && <p className="mb-6 text-xs text-slate-600">Catatan: {dok.Catatan}</p>}

      <div className="mt-12 flex items-end justify-between gap-4 text-xs">
        <div>
          <div className="mb-1 w-48 border-t border-slate-400" />
          <p className="font-medium">{kelab.penandatangan || 'Bendahari'}</p>
          <p className="text-slate-500">{kelab.nama}</p>
        </div>
        <p className="max-w-[45%] text-right text-slate-400">
          {kelab.notaKakiResit || ''}
        </p>
      </div>
    </div>
  )
}
