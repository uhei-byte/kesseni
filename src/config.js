/**
 * ============================================================
 *  SATU-SATUNYA TEMPAT YANG PERLU DIUBAH UNTUK CLIENT BAHARU
 * ============================================================
 * Tampal URL Web App Apps Script di bawah (URL yang berakhir /exec).
 *
 * Semua yang lain — nama organisasi, logo, warna tema, jenis bayaran,
 * kadar yuran, maklumat bank — dikonfigurasi dari dalam sistem
 * (Panel Admin > Tetapan), bukan dari kod.
 */

export const API_URL =
  import.meta.env.VITE_API_URL ||
  'https://script.google.com/macros/s/AKfycbzEAZ9cqhJjvH51BP0QgUU_p7DLwsj_DkvJeNL1ciVjOrTH3YesdDpp2TdxtG_lSckZ/exec'

/** Nilai paparan sementara sebelum konfigurasi dimuat dari pelayan */
export const LALAI = {
  nama: 'Sistem Kewangan',
  namaSingkat: 'Sistem',
  tema: '#0f766e',
  logo: '/icons/logo.png'
}
