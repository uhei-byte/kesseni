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
  const baucar = jenis === 'baucar'
  const logo = kelab.logo || '/icons/logo.png'

  const TAJUK = { invois: 'Invois', resit: 'Resit Rasmi', baucar: 'Baucar Bayaran' }
  const noDok = baucar ? dok.NoBaucar : (invois ? dok.NoInvois : dok.NoResit)

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
            {baucar ? 'Dibayar Kepada' : (invois ? 'Kepada' : 'Diterima Daripada')}
          </p>
          <p className="font-semibold">
            {baucar ? dok.DibayarKepada : (invois ? dok.KepadaNama : dok.DaripadaNama)}
          </p>
          {invois && dok.KepadaAlamat && (
            <p className="max-w-xs whitespace-pre-line text-xs text-slate-600">{dok.KepadaAlamat}</p>
          )}
        </div>
        <div className="text-right">
          <h2 className="text-xl font-bold uppercase tracking-wide text-slate-800">
            {TAJUK[jenis] || 'Resit Rasmi'}
          </h2>
          <p className="text-sm font-medium text-brand-700">{noDok}</p>
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
                <p className="mt-1 text-xs text-slate-500">
                  Kaedah bayaran: {dok.KaedahBayaran}
                  {baucar && dok.NoRujukanBank ? ` · Ruj: ${dok.NoRujukanBank}` : ''}
                </p>
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
        <div className="mb-8 flex flex-wrap items-start gap-4 rounded-lg bg-slate-50 p-4 text-xs">
          <div className="min-w-[220px] flex-1">
            <p className="mb-1 font-semibold text-slate-700">Maklumat Pembayaran</p>
            <p>{kelab.nama}</p>
            <p>{kelab.bank}</p>
            <p>No. Akaun: <b className="text-sm">{kelab.akaun}</b></p>
            <p className="mt-2 text-slate-500">
              Sila nyatakan no. invois {dok.NoInvois} sebagai rujukan pembayaran.
            </p>
          </div>
          {kelab.qr && (
            <div className="text-center">
              <img src={kelab.qr} alt={kelab.qrNama || 'Kod QR pembayaran'}
                className="h-32 w-32 object-contain"
                onError={(e) => { e.currentTarget.style.display = 'none' }} />
              <p className="mt-1 font-medium text-slate-600">{kelab.qrNama || 'DuitNow QR'}</p>
              <p className="text-[10px] text-slate-400">Imbas untuk bayar</p>
            </div>
          )}
        </div>
      ) : baucar ? (
        <div className="mb-8 rounded-lg border border-slate-300 p-3 text-xs">
          <span className="text-slate-500">Amaun dalam perkataan: </span>
          <b className="uppercase">{dok.AmaunPerkataan || '-'}</b>
        </div>
      ) : (
        <p className="mb-8 text-xs text-slate-500">
          Resit ini adalah pengesahan penerimaan bayaran seperti dinyatakan di atas.
        </p>
      )}

      {dok.Catatan && <p className="mb-6 text-xs text-slate-600">Catatan: {dok.Catatan}</p>}

      {baucar ? (
        <>
          <div className="mt-12 grid grid-cols-3 gap-6 text-xs">
            <div>
              <div className="mb-1 border-t border-slate-400" />
              <p className="font-medium">Disediakan Oleh</p>
              <p className="break-all text-slate-500">{dok.Disediakan || ''}</p>
            </div>
            <div>
              <div className="mb-1 border-t border-slate-400" />
              <p className="font-medium">Diluluskan Oleh</p>
              <p className="text-slate-500">{dok.Diluluskan || ''}</p>
            </div>
            <div>
              <div className="mb-1 border-t border-slate-400" />
              <p className="font-medium">Diterima Oleh</p>
              <p className="text-slate-500">Nama &amp; No. K/P penerima</p>
            </div>
          </div>
          <p className="mt-6 text-[10px] text-slate-400">
            Tandatangan penerima pada baucar ini adalah pengakuan terimaan bayaran.
            Simpan salinan untuk tujuan audit.
          </p>
        </>
      ) : (
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
      )}
    </div>
  )
}
