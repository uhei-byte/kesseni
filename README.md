# Sistem Kewangan Kelab / Persatuan — Template White-Label

Sistem rekod kewangan lengkap untuk kelab, persatuan atau kelab staf:
duit masuk, duit keluar, yuran ahli bulanan, invois dan resit rasmi berlogo.

Dibina untuk **Kelab Seni dan Budaya Islam Institut Kanser Negara (KESSENI)**,
tetapi seluruh identiti sistem — nama, logo, warna, jenis bayaran, kadar yuran,
maklumat bank — dikonfigurasi dari dalam sistem. Untuk client baharu,
guna kod yang sama, run Apps Script, tukar satu baris URL. Tiada lagi.

```
Frontend : React + Tailwind + Vite (PWA)  →  GitHub → Netlify
Backend  : Google Apps Script (Web App)
Database : Google Sheets + Google Drive
Kos      : RM0
```

---

## STRUKTUR DUA APLIKASI

Portal ahli dan panel admin adalah **dua aplikasi berasingan** yang berkongsi
satu Apps Script yang sama:

```
/              → Portal Ahli   (staf semak yuran & hantar bayaran)
/admin/        → Panel Admin   (AJK urus kewangan)
```

Sebab dipisahkan: staf yang hanya nak bayar yuran tidak perlu muat turun
keseluruhan kod panel admin.

| Aplikasi | Muat awal | Kandungan |
|---|---|---|
| Portal Ahli | ~266 KB (~85 KB gzip) | Tiada carta, tiada routing, tiada modul admin |
| Panel Admin | ~340 KB | Penuh; pustaka carta dimuat hanya bila papan pemuka dibuka |

Dalam repo:

```
index.html              → entry portal ahli
admin/index.html        → entry panel admin
src/config.js           → SATU-SATUNYA baris yang perlu diubah untuk client baharu
src/portal/             → kod portal ahli sahaja
src/admin/              → kod panel admin sahaja
src/components/         → dikongsi (UI, dokumen cetak, layout)
src/lib/                → dikongsi (API, konfigurasi, tema, PWA)
apps-script/Code.gs     → backend (sama untuk kedua-dua aplikasi)
```

---

## APA YANG BOLEH DIKONFIGURASI (tanpa sentuh kod)

Semua di bawah diurus dari **Panel Admin → Tetapan**:

| Seksyen | Yang boleh diubah |
|---|---|
| Identiti & Logo | Muat naik logo, nama penuh, nama singkat, no. pendaftaran, alamat, telefon, warna tema sistem, mesej pengumuman portal |
| Jenis Bayaran | Tambah/buang jenis bayaran (derma khas, tabung kematian, yuran aktiviti…), amaun tetap atau bebas, perlu pilih bulan atau tidak, keterangan wajib atau tidak, susunan paparan |
| Kadar Yuran | Kadar bulanan ikut kategori ahli |
| Dokumen & Bank | Nama bank, no. akaun, prefix no. invois/resit, nama penandatangan, nota kaki resit |
| Staff Database | Sambungan ke Google Sheet senarai staf sedia ada |
| Keselamatan | Tukar kata laluan |

**Logo pada resit mengikut konfigurasi.** Client A muat naik logo mereka →
resit, invois, portal dan panel admin mereka keluar dengan logo itu.
Client B pada pemasangan berasingan dapat logo mereka sendiri. Tiada kod berubah.

**Warna tema juga dinamik.** Satu warna dipilih, sistem jana skala penuh 50–900
dan pasang sebagai CSS variable — seluruh UI ikut warna client.

---

## PERANAN (ROLE)

| Role | Boleh buat |
|---|---|
| **Superadmin** | Semua — konfigurasi, logo, akaun pengguna, padam rekod |
| **Bendahari** | Duit masuk & keluar, sahkan bayaran, invois, resit, laporan |
| **Setiausaha** | Staf & rekod yuran, laporan |
| **Ahli** | Portal ahli sahaja |

Lajur `ROLE` dalam Staff Database = rujukan pentadbiran.
Akaun di halaman **Pengguna** = akses log masuk sebenar.

---

## RESIT AUTOMATIK

Setiap bayaran yang disahkan **mesti** ada resit. Sistem jana No. Resit bersiri
(guna `LockService` supaya tiada perlanggaran) dan resit berlogo dalam tiga keadaan:

1. Ahli hantar bayaran → Bendahari klik Sahkan → resit dijana + emel dihantar
2. Admin rekod bayaran manual sebagai Confirmed → resit dijana automatik
3. Resit manual dari halaman Resit → untuk bayaran luar sistem

Ahli boleh cetak resit sendiri dari portal (tab Sejarah & Resit) — sistem
hanya pulangkan resit yang benar-benar milik No. KP tersebut.

---

# PANDUAN PEMASANGAN

Tiga bahagian. Kira-kira 30 minit.

## BAHAGIAN A — Google Sheet & Apps Script

### A1. Buat Google Sheet baharu
1. Buka https://sheets.google.com → **Blank spreadsheet**
2. Namakan: `[Nama Kelab] - Database Kewangan`

### A2. Paste kod backend
1. Menu **Extensions** → **Apps Script**
2. Padam kod contoh (Ctrl+A → Delete)
3. Copy semua isi `apps-script/Code.gs` → paste → **Save** (Ctrl+S)

### A3. Run setup
1. Dropdown fungsi di atas → pilih **setupSystem** → klik **Run** (▶)
2. Kebenaran kali pertama:
   - **Review permissions** → pilih akaun Google anda
   - "Google hasn't verified this app" → **Advanced** → **Go to (nama projek) (unsafe)** → **Allow**
   > Normal. "Unsafe" cuma bermaksud skrip ini tulisan sendiri, bukan dari kedai Google.
3. Tunggu mesej **SETUP SELESAI**

Setup akan jana semua tab, header, dropdown validation, folder Drive,
jenis bayaran lalai, kadar yuran lalai, kaunter nombor siri, dan akaun
Superadmin pertama (emel Google anda + kata laluan `keseni2026`).

### A4. Sambung Staff Database (jika ada senarai staf sedia ada)

**Staff DB dalam fail Google Sheet lain:**
1. Copy ID dari URL fail tersebut:
   `https://docs.google.com/spreadsheets/d/`**`1a2B3cD...`**`/edit`
2. Google Sheet sistem → tab **Tetapan**:
   - `STAF_SPREADSHEET_ID` → tampal ID atau URL penuh
   - `STAF_NAMA_TAB` → nama tab (cth `Sheet1`)
3. Apps Script → fungsi **setupStafDatabase** → **Run**

**Tiada staff DB sedia ada:** biar `STAF_SPREADSHEET_ID` kosong — sistem guna
tab `Staf` dalam fail yang sama.

Sistem cari lajur ikut **nama header**, bukan kedudukan. Header yang dikenali:
`NAMA PENUH`/`NAMA`, `NO. K/P`/`NOKP`/`IC`, `UMUR`, `JANTINA`, `JAWATAN`,
`JABATAN/UNIT`, `EMEL`/`EMAIL`, `NO. TELEFON`, `SIJIL C&P HN`, `TARIKH MULA`,
`TARIKH TAMAT SIJIL`, `GAMBAR`. Lajur `ROLE`, `KATEGORI YURAN`, `STATUS AHLI`,
`ALAMAT KEDIAMAN`, `CATATAN` akan ditambah di hujung jika belum ada — lajur
sedia ada tidak disentuh.

### A5. Deploy jadi Web App
1. **Deploy** → **New deployment** → gear ⚙️ → **Web app**
2. Execute as: **Me** · Who has access: **Anyone**
3. **Deploy** → copy URL yang berakhir `/exec`

> Kemas kini kod kemudian: **Deploy → Manage deployments → ✏️ → Version: New version → Deploy**.
> URL kekal sama. Jangan buat "New deployment" — itu tukar URL.

---

## BAHAGIAN B — Isi URL dalam kod

Buka `src/config.js`, tampal URL `/exec` tadi:

```js
export const API_URL = 'https://script.google.com/macros/s/AKfycb...../exec'
```

Ini satu-satunya baris yang perlu diubah untuk setiap client baharu.

---

## BAHAGIAN C — GitHub & Netlify

### C1. GitHub
1. https://github.com → **New repository** → nama repo → pilih **Private**
2. Jangan tick "Add a README"
3. Upload semua fail projek (kecuali `node_modules` dan `dist`), atau:

```bash
git init
git add .
git commit -m "Sistem kewangan v3"
git branch -M main
git remote add origin https://github.com/USERNAME/NAMA-REPO.git
git push -u origin main
```

### C2. Netlify
1. https://app.netlify.com → **Add new site** → **Import an existing project** → GitHub → pilih repo
2. Setting auto-detect dari `netlify.toml` (build: `npm run build`, publish: `dist`)
3. **Deploy site** → tunggu status **Published**
4. Tukar nama: **Site configuration → Change site name**

Selesai. Portal ahli di `https://nama-site.netlify.app`,
panel admin di `https://nama-site.netlify.app/admin/`

---

## LANGKAH PERTAMA SELEPAS SIAP

1. Buka `/admin/` → log masuk dengan emel Google anda + `keseni2026`
2. **Tetapan → Keselamatan → tukar kata laluan.** Jangan tangguh.
3. **Tetapan → Identiti & Logo** → muat naik logo, isi nama, pilih warna tema
4. **Tetapan → Jenis Bayaran** → laraskan jenis bayaran ikut keperluan kelab
5. **Tetapan → Kadar Yuran** → set kadar ikut kategori
6. **Tetapan → Dokumen & Bank** → isi maklumat akaun bank
7. **Staf & Ahli** → set ROLE dan kategori yuran untuk setiap orang
8. **Pengguna** → cipta akaun log masuk untuk Bendahari/Setiausaha
9. **Rekod Yuran** → pilih tahun → **Jana Yuran**
10. Share link portal kepada semua staf

---

## PWA — PASANG SEBAGAI APP

Kedua-dua portal boleh dipasang sebagai aplikasi:

- **Android/Chrome:** butang "Pasang App" muncul sendiri di portal, atau menu ⋮ → "Add to Home screen"
- **iPhone/Safari:** Share → "Add to Home Screen"
- **Desktop (Chrome/Edge):** ikon pasang di hujung address bar

Ikon PWA berada dalam `public/icons/`. Untuk client baharu, ganti fail-fail
tersebut dengan logo client (192×192, 512×512, maskable 512×512, apple-touch 180×180).
Logo dalam sistem (resit, header) tidak perlu diganti manual — cukup muat naik
melalui Tetapan.

Service worker cache shell aplikasi supaya pembukaan kedua lebih pantas dan
boleh dibuka walaupun talian perlahan. Panggilan API tidak pernah di-cache.

---

## AUTO-UPDATE STRUKTUR

`Code.gs` ada nombor versi (`VERSI_SISTEM`). Bila anda tampal kod versi baharu
dan deploy semula, permintaan pertama selepas itu akan:

1. Kesan versi kod ≠ versi data
2. Jalankan migrasi automatik — tab baharu, lajur baharu, tetapan baharu dicipta
3. Rekod versi baharu supaya migrasi tidak berulang

Data sedia ada tidak disentuh — migrasi hanya **menambah**, tidak memadam atau
menyusun semula. Jadi untuk kemas kini sistem: paste kod baharu → Deploy new
version → siap. Tak perlu Run apa-apa manual.

---

## GUNA SEMULA UNTUK CLIENT BAHARU

1. Copy repo ini
2. Buat Google Sheet baharu → paste `Code.gs` → Run `setupSystem`
3. Deploy Web App → copy URL
4. Tampal URL dalam `src/config.js`
5. Push ke GitHub → sambung Netlify
6. Log masuk → Tetapan → muat naik logo client, tukar nama, warna, jenis bayaran

Langkah 6 semuanya dari dalam sistem. Tiada kod yang perlu diedit untuk
membezakan satu client dengan client lain.

---

## NOTA KESELAMATAN

| Perkara | Cara sistem kendalikan |
|---|---|
| No. KP bukan kata laluan | Portal awam hanya boleh tambah rekod Pending dan lihat status sendiri. Semua bayaran wajib disahkan sebelum dikira. |
| Endpoint Apps Script terdedah | Kebenaran disemak di server (`TINDAKAN_AWAM` + `KEBENARAN_ROLE`). Menu tersembunyi di UI bukan kawalan. |
| Role escalation | Bendahari terhad kepada tab kewangan; hanya Superadmin boleh urus akaun, konfigurasi dan padam staf. |
| Data peribadi (PDPA) | Portal awam tidak pulangkan emel, telefon, alamat atau gambar — hanya nama, jawatan, jabatan dan status yuran. |
| Fail resit ahli | Kekal private dalam Drive, dibuka melalui endpoint bertoken. |
| Logo | Sengaja dikongsi awam — ia memang perlu dipaparkan pada resit dan portal. |
| Kata laluan | SHA-256 hash dalam tab Akaun, bukan dalam kod. |
| Spam / brute force | 5 penghantaran/jam per IC; 10 percubaan login gagal → kunci 15 minit. |
| Jejak audit | Semua tindakan admin direkod dalam tab `LogAudit`. |

Yang anda kena buat sendiri: tukar kata laluan lalai, pastikan repo GitHub
**Private**, dan backup Google Sheet sebulan sekali (File → Make a copy).

---

## STRUKTUR DATABASE

| Tab | Fungsi |
|---|---|
| *(Staff Database)* | Fail luar atau tab `Staf` — master senarai staf |
| `Akaun` | Akaun log masuk — emel, hash kata laluan, role |
| `RekodYuran` | Satu baris = satu ahli × satu bulan × satu tahun |
| `DuitMasuk` | Semua penerimaan + status pengesahan + rujukan resit |
| `DuitKeluar` | Semua pembayaran keluar |
| `Invois` / `Resit` | Dokumen rasmi bersiri |
| `JenisBayaran` | Jenis bayaran yang dipapar di portal ahli |
| `KadarYuran` | Kadar ikut kategori |
| `Tetapan` | Semua konfigurasi sistem (termasuk logo & tema) |
| `Kaunter` | Nombor siri terakhir — jangan edit manual |
| `LogAudit` | Rekod semua tindakan admin |

---

## MASALAH BIASA

**"URL Apps Script belum ditetapkan"**
→ `src/config.js` masih ada `XXXX`. Isi URL `/exec` sebenar, commit, deploy semula.

**"Balasan pelayan tidak sah"**
→ Deployment bukan "Anyone". Deploy → Manage deployments → ✏️ → Who has access: Anyone.

**Logo tak keluar pada resit**
→ Muat naik semula melalui Tetapan → Identiti & Logo. Logo disimpan dalam Drive
dan perlu perkongsian "sesiapa dengan pautan" (sistem set automatik).

**Halaman /admin/ blank atau 404**
→ Pastikan `netlify.toml` ada dalam repo (mengandungi redirect `/admin/*`).

**Perubahan kod Apps Script tak nampak**
→ Deploy → Manage deployments → ✏️ → Version: **New version** → Deploy.

**Emel tak sampai**
→ Semak `EMAIL_ADMIN` dan emel ahli dalam staff DB. Kuota Gmail biasa 100 emel/hari.

**PWA tak boleh dipasang**
→ Mesti HTTPS (Netlify sudah HTTPS). Cuba buang cache, atau semak fail
`manifest.json` dan `sw.js` boleh diakses.

---

## PEMBANGUNAN TEMPATAN

```bash
npm install
npm run dev       # portal: http://localhost:5173  ·  admin: http://localhost:5173/admin/
npm run build     # hasil dalam dist/
npm run preview
```
