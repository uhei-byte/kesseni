import React, { useEffect, useState } from 'react'
import { panggil } from '../lib/api'
import { Modal, Spinner } from './ui'

/** Papar fail resit yang disimpan dalam Drive (fail kekal private, dimuat melalui token admin) */
export default function LihatResit({ fileId, tutup }) {
  const [fail, setFail] = useState(null)
  const [ralat, setRalat] = useState('')

  useEffect(() => {
    if (!fileId) return
    setFail(null); setRalat('')
    panggil('muatFail', { fileId })
      .then((r) => (r.ok ? setFail(r) : setRalat(r.mesej)))
      .catch((e) => setRalat(e.message))
  }, [fileId])

  return (
    <Modal buka={!!fileId} tutup={tutup} tajuk="Bukti Pembayaran" saiz="max-w-3xl">
      {ralat && <p className="py-6 text-center text-sm text-red-600">{ralat}</p>}
      {!fail && !ralat && <Spinner teks="Memuat fail..." />}
      {fail && (
        <div className="space-y-3">
          {fail.mime === 'application/pdf' ? (
            <iframe title="resit" className="h-[70vh] w-full rounded-lg border border-slate-200"
              src={`data:application/pdf;base64,${fail.data}`} />
          ) : (
            <img alt="Bukti pembayaran" className="mx-auto max-h-[70vh] rounded-lg border border-slate-200"
              src={`data:${fail.mime};base64,${fail.data}`} />
          )}
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{fail.nama}</span>
            <a href={fail.pautan} target="_blank" rel="noreferrer" className="text-brand-700 hover:underline">
              Buka dalam Google Drive ↗
            </a>
          </div>
        </div>
      )}
    </Modal>
  )
}
