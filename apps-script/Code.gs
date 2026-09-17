/**
 * ============================================================
 * SISTEM KEWANGAN KESSENI  (v2 - integrasi Staff Database)
 * Kelab Seni dan Budaya Islam Institut Kanser Negara
 * PPM-005-16-03052020
 * ------------------------------------------------------------
 * Backend  : Google Apps Script (Web App)
 * Database : Google Sheets + Google Drive (simpanan resit)
 * Staf     : Baca dari Staff Database sedia ada (master),
 *            sama ada dalam fail ini atau fail Google Sheet lain.
 *
 * LANGKAH SELEPAS PASTE FAIL INI:
 *   1. Pilih fungsi "setupSystem" > Run > Authorize
 *   2. (Jika staff DB dalam fail lain) isi STAF_SPREADSHEET_ID
 *      dalam tab Tetapan, kemudian Run "setupStafDatabase"
 *   3. Deploy > New deployment > Web app
 *        Execute as     : Me
 *        Who has access : Anyone
 *   4. Copy URL /exec untuk frontend (.env VITE_API_URL)
 * ============================================================
 */

// ====================== KONFIGURASI ==========================

var VERSI_SISTEM = '3.0.0';   // tukar nilai ini untuk cetuskan auto-migrate

var TETAPAN_LALAI = {
  // --- Identiti organisasi (boleh tukar sepenuhnya untuk client lain) ---
  NAMA_KELAB: 'Kelab Seni dan Budaya Islam Institut Kanser Negara (KESSENI)',
  NAMA_SINGKAT: 'KESSENI',
  NO_PENDAFTARAN: 'PPM-005-16-03052020',
  ALAMAT_KELAB: 'Institut Kanser Negara, Putrajaya',
  TELEFON_KELAB: '',
  EMAIL_ADMIN: '',
  LOGO_URL: '',              // diisi automatik bila logo dimuat naik
  LOGO_FILE_ID: '',
  TEMA_WARNA: '#0f766e',     // warna utama sistem & dokumen

  // --- Bank & dokumen ---
  NAMA_BANK: 'Bank Muamalat Malaysia Berhad',
  NO_AKAUN: '16010001196711',
  PREFIX_INVOIS: 'INV',
  PREFIX_RESIT: 'RSN',
  NOTA_KAKI_RESIT: 'Resit ini dijana secara automatik dan sah tanpa tandatangan.',
  NAMA_PENANDATANGAN: 'Bendahari',

  // --- Operasi ---
  KADAR_YURAN_LALAI: '10',
  HANTAR_EMAIL: 'YA',
  STAF_SPREADSHEET_ID: '',   // kosong = guna tab "Staf" dalam fail ini
  STAF_NAMA_TAB: 'Staf',     // nama tab dalam fail staff database
  AMARAN_SIJIL_HARI: '90',   // amaran sijil akan tamat dalam N hari
  PORTAL_TUNJUK_YURAN: 'YA', // papar grid yuran 12 bulan di portal ahli
  PORTAL_MESEJ: ''           // mesej pengumuman di portal ahli (kosong = tiada)
};

var KATA_LALUAN_LALAI = 'keseni2026';   // WAJIB tukar selepas login pertama
var MAX_SAIZ_FAIL_MB = 5;
var TEMPOH_TOKEN_JAM = 6;
var NAMA_FOLDER_DRIVE = 'KESSENI - Resit & Dokumen';

var BULAN = ['Januari','Februari','Mac','April','Mei','Jun',
             'Julai','Ogos','September','Oktober','November','Disember'];

var SENARAI_ROLE = ['Superadmin', 'Bendahari', 'Setiausaha', 'Ahli'];

/**
 * PEMETAAN LAJUR STAFF DATABASE
 * Kunci = nama medan dalam sistem. Nilai = senarai kemungkinan nama header
 * dalam staff database sedia ada (tidak case-sensitive, tanda baca diabaikan).
 * Sistem cari header ikut NAMA, bukan kedudukan — jadi susunan lajur boleh
 * berubah tanpa merosakkan sistem.
 */
var PETA_STAF = {
  Nama:        ['NAMA PENUH', 'NAMA', 'NAMA STAF'],
  NoKP:        ['NO KP', 'NO K P', 'NOKP', 'NO KAD PENGENALAN', 'IC'],
  Umur:        ['UMUR'],
  Jantina:     ['JANTINA'],
  Jawatan:     ['JAWATAN'],
  Jabatan:     ['JABATAN UNIT', 'JABATAN', 'UNIT', 'JABATAN/UNIT'],
  Emel:        ['EMEL', 'EMAIL', 'E-MEL'],
  Telefon:     ['NO TELEFON', 'TELEFON', 'NO TEL', 'PHONE'],
  SijilCP:     ['SIJIL C P HN', 'SIJIL C&P HN', 'SIJIL C P', 'SIJIL C&P'],
  TarikhMula:  ['TARIKH MULA'],
  TarikhTamat: ['TARIKH TAMAT SIJIL', 'TARIKH TAMAT'],
  Gambar:      ['GAMBAR', 'FOTO'],
  // Lajur tambahan yang sistem ini perlukan
  Role:        ['ROLE', 'PERANAN'],
  Kategori:    ['KATEGORI YURAN', 'KATEGORI'],
  StatusAhli:  ['STATUS AHLI', 'STATUS KEAHLIAN', 'STATUS'],
  Alamat:      ['ALAMAT KEDIAMAN', 'ALAMAT'],
  Catatan:     ['CATATAN', 'NOTA']
};

// Lajur baharu yang akan ditambah pada staff database (jika belum ada)
var LAJUR_TAMBAHAN = [
  { header: 'ROLE', lalai: 'Ahli' },
  { header: 'KATEGORI YURAN', lalai: 'Ahli Biasa' },
  { header: 'STATUS AHLI', lalai: 'Aktif' },
  { header: 'ALAMAT KEDIAMAN', lalai: '' },
  { header: 'CATATAN', lalai: '' }
];

// Header lalai jika staff database perlu dicipta dari kosong
var STAF_HEADER_LALAI = [
  'NAMA PENUH', 'NO. K/P', 'UMUR', 'JANTINA', 'JAWATAN', 'JABATAN/UNIT',
  'EMEL', 'NO. TELEFON', 'SIJIL C&P HN', 'TARIKH MULA', 'TARIKH TAMAT SIJIL',
  'GAMBAR', 'ROLE', 'KATEGORI YURAN', 'STATUS AHLI', 'ALAMAT KEDIAMAN', 'CATATAN'
];

// Tab yang diurus sepenuhnya oleh sistem ini
var SKEMA = {
  'RekodYuran': ['ID','NoKP','Nama','Tahun','Bulan','Amaun','Status',
                 'RujukanMasukID','TarikhKemaskini'],

  'DuitMasuk': ['ID','Tarikh','Kategori','NoKP','Nama','Keterangan','Amaun',
                'KaedahBayaran','ResitFileId','ResitNamaFail','Status',
                'TahunYuran','BulanYuran','TarikhSubmit','TarikhVerify',
                'VerifyOleh','NoResit','Catatan'],

  'DuitKeluar': ['ID','Tarikh','Kategori','Perkara','PenerimaNama','Amaun',
                 'KaedahBayaran','ResitFileId','ResitNamaFail','DirekodOleh',
                 'TarikhRekod','Catatan'],

  'Invois': ['NoInvois','Tarikh','KepadaNama','KepadaAlamat','KepadaEmel',
             'Perkara','Amaun','Status','TarikhBayar','DikeluarkanOleh','Catatan'],

  'Resit': ['NoResit','Tarikh','DaripadaNama','Perkara','Amaun','KaedahBayaran',
            'RujukanMasukID','DikeluarkanOleh','Catatan'],

  'KadarYuran': ['Kategori','KadarBulanan','Aktif'],

  'JenisBayaran': ['Kod','Nama','Kategori','AmaunTetap','PilihBulan','WajibKeterangan',
                   'Aktif','Susunan','Keterangan'],

  'Akaun': ['Emel','HashKataLaluan','Role','Aktif','TarikhCipta','LoginTerakhir'],

  'Tetapan': ['Kunci','Nilai','Keterangan'],

  'Kaunter': ['Jenis','Tahun','NomborTerakhir'],

  'LogAudit': ['Masa','Pengguna','Role','Tindakan','Butiran']
};

// Tindakan yang boleh dipanggil TANPA login (portal ahli)
var TINDAKAN_AWAM = ['ping', 'infoKelab', 'semakAhli', 'hantarBayaran', 'semakStatusBayaran', 'dapatResit'];

/**
 * KEBENARAN IKUT ROLE — dikuatkuasakan di SERVER.
 * Superadmin = semua. Yang lain hanya tindakan yang disenaraikan.
 */
var KEBENARAN_ROLE = {
  Superadmin: '*',
  Bendahari: [
    'dashboard', 'senarai', 'muatFail', 'laporan',
    'simpanBaris', 'verifyBayaran', 'janaInvois', 'janaResit',
    'tukarKataLaluan', 'sayaSiapa'
  ],
  Setiausaha: [
    'dashboard', 'senarai', 'muatFail', 'laporan',
    'simpanStaf', 'janaYuranTahunan', 'tukarKataLaluan', 'sayaSiapa'
  ],
  Ahli: ['sayaSiapa', 'tukarKataLaluan']
};

// Tab yang Bendahari dibenarkan tulis melalui simpanBaris
var TAB_BENDAHARI = ['DuitMasuk', 'DuitKeluar', 'Invois', 'Resit'];

// ====================== SETUP SISTEM =========================

/**
 * Jalankan SEKALI semasa pemasangan pertama.
 * Selamat dijalankan berulang kali — data sedia ada tidak dipadam.
 */
function setupSystem() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Skrip ini mesti dilampirkan pada Google Sheet (Extensions > Apps Script).');

  var laporan = [];
  var props = PropertiesService.getScriptProperties();
  props.setProperty('SPREADSHEET_ID', ss.getId());

  // 1. Tab sistem
  Object.keys(SKEMA).forEach(function (nama) {
    var sh = ss.getSheetByName(nama);
    if (!sh) { sh = ss.insertSheet(nama); laporan.push('Tab dicipta: ' + nama); }
    var header = SKEMA[nama];
    var semasa = sh.getLastColumn() > 0
      ? sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0] : [];
    var sama = semasa.length === header.length &&
               header.every(function (h, i) { return semasa[i] === h; });
    if (!sama) sh.getRange(1, 1, 1, header.length).setValues([header]);
    sh.getRange(1, 1, 1, header.length)
      .setFontWeight('bold').setBackground('#0f766e').setFontColor('#ffffff');
    sh.setFrozenRows(1);
    if (sh.getMaxColumns() > header.length) {
      sh.deleteColumns(header.length + 1, sh.getMaxColumns() - header.length);
    }
    sh.autoResizeColumns(1, header.length);
  });

  // 2. Buang sheet lalai kosong
  ['Sheet1', 'Helaian1'].forEach(function (n) {
    var s = ss.getSheetByName(n);
    if (s && s.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(s);
  });

  // 3. Tetapan lalai
  var shTetapan = ss.getSheetByName('Tetapan');
  var sediaAda = {};
  if (shTetapan.getLastRow() > 1) {
    shTetapan.getRange(2, 1, shTetapan.getLastRow() - 1, 2).getValues()
      .forEach(function (r) { sediaAda[r[0]] = true; });
  }
  Object.keys(TETAPAN_LALAI).forEach(function (k) {
    if (!sediaAda[k]) shTetapan.appendRow([k, TETAPAN_LALAI[k], '']);
  });

  // 4. Kadar yuran lalai
  var shKadar = ss.getSheetByName('KadarYuran');
  if (shKadar.getLastRow() < 2) {
    shKadar.appendRow(['Ahli Biasa', 10, 'YA']);
    shKadar.appendRow(['AJK', 10, 'YA']);
  }

  // 4b. Jenis bayaran lalai (boleh tambah/ubah dari panel admin)
  var shJenis = ss.getSheetByName('JenisBayaran');
  if (shJenis.getLastRow() < 2) {
    [
      ['YURAN', 'Yuran Ahli', 'Yuran Ahli', '', 'YA', 'TIDAK', 'YA', 1, 'Yuran bulanan ahli'],
      ['SUMBANG', 'Sumbangan', 'Sumbangan', '', 'TIDAK', 'TIDAK', 'YA', 2, 'Sumbangan ikhlas'],
      ['TUMPANG', 'Tumpang', 'Tumpang', '', 'TIDAK', 'YA', 'YA', 3, 'Bayaran tumpang aktiviti'],
      ['JUALAN', 'Jualan', 'Jualan', '', 'TIDAK', 'YA', 'YA', 4, 'Hasil jualan barangan kelab'],
      ['LAIN', 'Lain-lain', 'Lain-lain', '', 'TIDAK', 'YA', 'YA', 9, 'Bayaran lain']
    ].forEach(function (r) { shJenis.appendRow(r); });
    laporan.push('Jenis bayaran lalai ditambah (5 jenis)');
  }

  // 5. Kaunter
  var shKaunter = ss.getSheetByName('Kaunter');
  if (shKaunter.getLastRow() < 2) {
    var thn = new Date().getFullYear();
    shKaunter.appendRow(['INVOIS', thn, 0]);
    shKaunter.appendRow(['RESIT', thn, 0]);
  }

  // 6. Validation
  pasangValidation_(ss);

  // 7. Folder Drive
  var folderId = props.getProperty('DRIVE_FOLDER_ID');
  var folder = null;
  if (folderId) { try { folder = DriveApp.getFolderById(folderId); } catch (e) { folder = null; } }
  if (!folder) {
    var cari = DriveApp.getFoldersByName(NAMA_FOLDER_DRIVE);
    folder = cari.hasNext() ? cari.next() : DriveApp.createFolder(NAMA_FOLDER_DRIVE);
    props.setProperty('DRIVE_FOLDER_ID', folder.getId());
    laporan.push('Folder Drive: ' + folder.getName());
  }

  // 8. Akaun Superadmin pertama
  var shAkaun = ss.getSheetByName('Akaun');
  if (shAkaun.getLastRow() < 2) {
    var emelPemilik = '';
    try { emelPemilik = Session.getEffectiveUser().getEmail(); } catch (e) {}
    if (!emelPemilik) emelPemilik = 'admin@keseni.local';
    shAkaun.appendRow([emelPemilik, hash_(KATA_LALUAN_LALAI), 'Superadmin', 'YA', tarikhKini_(), '']);
    laporan.push('Akaun Superadmin: ' + emelPemilik + '  /  kata laluan: ' + KATA_LALUAN_LALAI);
    var barisEmel = null;
    bacaSemua_('Tetapan').forEach(function (r) { if (r.Kunci === 'EMAIL_ADMIN') barisEmel = r._baris; });
    if (barisEmel) shTetapan.getRange(barisEmel, 2).setValue(emelPemilik);
  }

  // 9. Staff database
  laporan.push(setupStafDatabase());

  // 10. Rekod versi (untuk auto-migrate)
  props.setProperty('VERSI_SISTEM', VERSI_SISTEM);
  laporan.push('Versi sistem: ' + VERSI_SISTEM);

  var mesej = 'SETUP SELESAI\n\n' + laporan.join('\n') +
    '\n\nLangkah seterusnya:\n' +
    '1. Jika staff database dalam FAIL LAIN: isi STAF_SPREADSHEET_ID dalam tab Tetapan,\n' +
    '   kemudian Run semula fungsi setupStafDatabase\n' +
    '2. Deploy > New deployment > Web app (Execute as: Me, Access: Anyone)';
  Logger.log(mesej);
  try { SpreadsheetApp.getUi().alert(mesej); } catch (e) {}
  return mesej;
}

/**
 * Sambung & sediakan staff database sedia ada.
 * - Tidak mengubah nama atau susunan lajur sedia ada
 * - Hanya TAMBAH lajur yang sistem perlukan (ROLE, KATEGORI YURAN,
 *   STATUS AHLI, ALAMAT KEDIAMAN, CATATAN) di hujung, jika belum wujud
 * - Isi nilai lalai untuk baris yang kosong
 */
function setupStafDatabase() {
  var t = tetapan_();
  var sh = sheetStaf_(true);
  var namaFail = sh.getParent().getName();

  var lastCol = Math.max(sh.getLastColumn(), 1);
  var header = sh.getRange(1, 1, 1, lastCol).getValues()[0];

  // Jika tab kosong sepenuhnya, cipta header lalai
  if (header.filter(String).length === 0) {
    sh.getRange(1, 1, 1, STAF_HEADER_LALAI.length).setValues([STAF_HEADER_LALAI]);
    header = STAF_HEADER_LALAI.slice();
  }

  var dinormal = header.map(normalHeader_);
  var ditambah = [];

  LAJUR_TAMBAHAN.forEach(function (lajur) {
    var kunciSistem = null;
    Object.keys(PETA_STAF).forEach(function (k) {
      if (PETA_STAF[k].map(normalHeader_).indexOf(normalHeader_(lajur.header)) !== -1) kunciSistem = k;
    });
    var wujud = PETA_STAF[kunciSistem] &&
      PETA_STAF[kunciSistem].map(normalHeader_).some(function (a) { return dinormal.indexOf(a) !== -1; });
    if (wujud) return;

    var kol = sh.getLastColumn() + 1;
    if (sh.getMaxColumns() < kol) sh.insertColumnsAfter(sh.getMaxColumns(), 1);
    sh.getRange(1, kol).setValue(lajur.header)
      .setFontWeight('bold').setBackground('#0f766e').setFontColor('#ffffff');
    var bilBaris = sh.getLastRow() - 1;
    if (bilBaris > 0 && lajur.lalai !== '') {
      var isi = [];
      for (var i = 0; i < bilBaris; i++) isi.push([lajur.lalai]);
      sh.getRange(2, kol, bilBaris, 1).setValues(isi);
    }
    dinormal.push(normalHeader_(lajur.header));
    ditambah.push(lajur.header);
  });

  // Dropdown untuk ROLE & STATUS AHLI
  try {
    var peta = petaLajurStaf_(sh);
    if (peta.Role) {
      sh.getRange(2, peta.Role, Math.max(sh.getMaxRows() - 1, 1), 1).setDataValidation(
        SpreadsheetApp.newDataValidation().requireValueInList(SENARAI_ROLE, true).build());
    }
    if (peta.StatusAhli) {
      sh.getRange(2, peta.StatusAhli, Math.max(sh.getMaxRows() - 1, 1), 1).setDataValidation(
        SpreadsheetApp.newDataValidation().requireValueInList(['Aktif', 'Tidak Aktif'], true).build());
    }
  } catch (e) {}

  sh.setFrozenRows(1);

  return 'Staff DB: "' + namaFail + '" > tab "' + sh.getName() + '" · ' +
         (ditambah.length ? 'lajur ditambah: ' + ditambah.join(', ') : 'semua lajur sudah lengkap') +
         ' · ' + Math.max(sh.getLastRow() - 1, 0) + ' rekod staf';
}

function pasangValidation_(ss) {
  var senarai = [
    ['DuitMasuk', 'Status', ['Pending', 'Confirmed', 'Ditolak']],
    ['DuitMasuk', 'Kategori', ['Yuran Ahli', 'Sumbangan', 'Tumpang', 'Jualan', 'Lain-lain']],
    ['DuitKeluar', 'Kategori', ['Bayaran', 'Sumbangan', 'Program', 'Pentadbiran', 'Lain-lain']],
    ['RekodYuran', 'Status', ['Belum Bayar', 'Pending', 'Sudah Bayar']],
    ['Invois', 'Status', ['Belum Bayar', 'Sudah Bayar', 'Batal']],
    ['Akaun', 'Role', SENARAI_ROLE],
    ['Akaun', 'Aktif', ['YA', 'TIDAK']],
    ['JenisBayaran', 'Aktif', ['YA', 'TIDAK']],
    ['JenisBayaran', 'PilihBulan', ['YA', 'TIDAK']],
    ['JenisBayaran', 'WajibKeterangan', ['YA', 'TIDAK']]
  ];
  senarai.forEach(function (v) {
    var sh = ss.getSheetByName(v[0]);
    if (!sh) return;
    var idx = SKEMA[v[0]].indexOf(v[1]) + 1;
    if (idx < 1) return;
    sh.getRange(2, idx, Math.max(sh.getMaxRows() - 1, 1), 1).setDataValidation(
      SpreadsheetApp.newDataValidation().requireValueInList(v[2], true).setAllowInvalid(false).build());
  });
}

function onOpen() {
  try {
    SpreadsheetApp.getUi().createMenu('KESSENI')
      .addItem('Setup / Baiki Struktur Sistem', 'setupSystem')
      .addItem('Sambung Staff Database', 'setupStafDatabase')
      .addItem('Reset Kata Laluan Superadmin', 'resetKataLaluanAdmin')
      .addToUi();
  } catch (e) {}
}

function resetKataLaluanAdmin() {
  var sh = sheet_('Akaun');
  var data = bacaSemua_('Akaun').filter(function (a) { return a.Role === 'Superadmin'; });
  if (!data.length) throw new Error('Tiada akaun Superadmin. Run setupSystem dahulu.');
  sh.getRange(data[0]._baris, 2).setValue(hash_(KATA_LALUAN_LALAI));
  SpreadsheetApp.getUi().alert('Kata laluan untuk ' + data[0].Emel + ' di-reset kepada: ' + KATA_LALUAN_LALAI);
}

// ====================== ROUTING WEB APP ======================

function doGet(e) {
  autoMigrate_();
  return balas_({ ok: true, mesej: 'API aktif', versi: VERSI_SISTEM });
}

/**
 * AUTO-UPDATE STRUKTUR.
 * Bila kod Apps Script dikemaskini (VERSI_SISTEM berubah), permintaan pertama
 * selepas deploy akan menjalankan setupSystem sekali secara automatik —
 * tab/lajur/tetapan baharu terus wujud tanpa perlu Run manual.
 * Data sedia ada tidak disentuh.
 */
function autoMigrate_() {
  var props = PropertiesService.getScriptProperties();
  if (props.getProperty('VERSI_SISTEM') === VERSI_SISTEM) return false;
  if (!props.getProperty('SPREADSHEET_ID')) return false;  // belum setup kali pertama

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return false;
  try {
    if (props.getProperty('VERSI_SISTEM') === VERSI_SISTEM) return false;
    migrasiStruktur_();
    props.setProperty('VERSI_SISTEM', VERSI_SISTEM);
    log_('sistem', 'Sistem', 'AUTO MIGRATE', 'Versi → ' + VERSI_SISTEM);
    return true;
  } catch (err) {
    try { log_('sistem', 'Sistem', 'AUTO MIGRATE GAGAL', String(err.message || err)); } catch (e2) {}
    return false;
  } finally {
    lock.releaseLock();
  }
}

/** Cipta tab/lajur/tetapan yang belum wujud — versi tanpa UI, selamat dari web app */
function migrasiStruktur_() {
  var ss = ss_();

  Object.keys(SKEMA).forEach(function (nama) {
    var sh = ss.getSheetByName(nama);
    var header = SKEMA[nama];
    if (!sh) {
      sh = ss.insertSheet(nama);
      sh.getRange(1, 1, 1, header.length).setValues([header]);
    } else {
      var semasa = sh.getLastColumn() > 0
        ? sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0] : [];
      // Tambah lajur baharu di hujung sahaja — tidak menyusun semula data sedia ada
      for (var i = semasa.length; i < header.length; i++) {
        sh.getRange(1, i + 1).setValue(header[i]);
      }
    }
    sh.getRange(1, 1, 1, header.length)
      .setFontWeight('bold').setBackground('#0f766e').setFontColor('#ffffff');
    sh.setFrozenRows(1);
  });

  // Tetapan baharu
  var shTetapan = ss.getSheetByName('Tetapan');
  var ada = {};
  if (shTetapan.getLastRow() > 1) {
    shTetapan.getRange(2, 1, shTetapan.getLastRow() - 1, 2).getValues()
      .forEach(function (r) { ada[r[0]] = true; });
  }
  Object.keys(TETAPAN_LALAI).forEach(function (k) {
    if (!ada[k]) shTetapan.appendRow([k, TETAPAN_LALAI[k], '']);
  });

  // Jenis bayaran lalai jika kosong
  var shJenis = ss.getSheetByName('JenisBayaran');
  if (shJenis && shJenis.getLastRow() < 2) {
    [
      ['YURAN', 'Yuran Ahli', 'Yuran Ahli', '', 'YA', 'TIDAK', 'YA', 1, 'Yuran bulanan ahli'],
      ['SUMBANG', 'Sumbangan', 'Sumbangan', '', 'TIDAK', 'TIDAK', 'YA', 2, 'Sumbangan ikhlas'],
      ['TUMPANG', 'Tumpang', 'Tumpang', '', 'TIDAK', 'YA', 'YA', 3, 'Bayaran tumpang aktiviti'],
      ['JUALAN', 'Jualan', 'Jualan', '', 'TIDAK', 'YA', 'YA', 4, 'Hasil jualan barangan kelab'],
      ['LAIN', 'Lain-lain', 'Lain-lain', '', 'TIDAK', 'YA', 'YA', 9, 'Bayaran lain']
    ].forEach(function (r) { shJenis.appendRow(r); });
  }

  pasangValidation_(ss);
}

function doPost(e) {
  autoMigrate_();

  var data;
  try { data = JSON.parse(e.postData.contents); }
  catch (err) { return balas_({ ok: false, mesej: 'Payload tidak sah' }); }

  var tindakan = data.action;
  var payload = data.payload || {};
  var token = data.token || '';

  try {
    if (!tindakan) return balas_({ ok: false, mesej: 'Tiada action' });

    if (TINDAKAN_AWAM.indexOf(tindakan) !== -1) {
      return balas_(laksana_(tindakan, payload, { emel: 'awam', role: 'Awam' }));
    }
    if (tindakan === 'login') return balas_(apiLogin_(payload));

    var sesi = sahkanToken_(token);
    if (!sesi) return balas_({ ok: false, kod: 'AUTH', mesej: 'Sesi tamat. Sila log masuk semula.' });

    // ---- Semakan kebenaran ikut role (di server) ----
    var benar = KEBENARAN_ROLE[sesi.role];
    if (!benar) return balas_({ ok: false, kod: 'ROLE', mesej: 'Role tidak dikenali' });
    if (benar !== '*' && benar.indexOf(tindakan) === -1) {
      return balas_({ ok: false, kod: 'ROLE', mesej: 'Anda tiada kebenaran untuk tindakan ini' });
    }
    // Bendahari: hadkan tab yang boleh ditulis / dipadam
    if (sesi.role === 'Bendahari' &&
        (tindakan === 'simpanBaris' || tindakan === 'padamBaris') &&
        TAB_BENDAHARI.indexOf(payload.tab) === -1) {
      return balas_({ ok: false, kod: 'ROLE', mesej: 'Anda tiada kebenaran untuk tab ' + payload.tab });
    }

    return balas_(laksana_(tindakan, payload, sesi));

  } catch (err) {
    return balas_({ ok: false, mesej: 'Ralat pelayan: ' + (err.message || err) });
  }
}

function laksana_(tindakan, p, sesi) {
  switch (tindakan) {
    // --- awam ---
    case 'ping':               return { ok: true, mesej: 'pong' };
    case 'infoKelab':          return apiInfoKelab_();
    case 'semakAhli':          return apiSemakAhli_(p);
    case 'hantarBayaran':      return apiHantarBayaran_(p);
    case 'semakStatusBayaran': return apiSemakStatusBayaran_(p);
    case 'dapatResit':         return apiDapatResit_(p);

    // --- sesi ---
    case 'sayaSiapa':          return { ok: true, emel: sesi.emel, role: sesi.role };
    case 'tukarKataLaluan':    return apiTukarKataLaluan_(p, sesi);

    // --- umum admin ---
    case 'dashboard':          return apiDashboard_();
    case 'senarai':            return apiSenarai_(p, sesi);
    case 'muatFail':           return apiMuatFail_(p);
    case 'laporan':            return apiLaporan_(p);

    // --- data ---
    case 'simpanBaris':        return apiSimpanBaris_(p, sesi);
    case 'padamBaris':         return apiPadamBaris_(p, sesi);
    case 'simpanStaf':         return apiSimpanStaf_(p, sesi);
    case 'padamStaf':          return apiPadamStaf_(p, sesi);
    case 'verifyBayaran':      return apiVerifyBayaran_(p, sesi);
    case 'janaInvois':         return apiJanaInvois_(p, sesi);
    case 'janaResit':          return apiJanaResit_(p, sesi);
    case 'janaYuranTahunan':   return apiJanaYuranTahunan_(p, sesi);

    // --- superadmin ---
    case 'simpanTetapan':      return apiSimpanTetapan_(p, sesi);
    case 'simpanKadar':        return apiSimpanKadar_(p, sesi);
    case 'simpanLogo':         return apiSimpanLogo_(p, sesi);
    case 'simpanJenisBayaran': return apiSimpanJenisBayaran_(p, sesi);
    case 'infoVersi':          return { ok: true, versi: VERSI_SISTEM,
                                        versiData: PropertiesService.getScriptProperties()
                                          .getProperty('VERSI_SISTEM') || '-' };
    case 'senaraiAkaun':       return apiSenaraiAkaun_();
    case 'simpanAkaun':        return apiSimpanAkaun_(p, sesi);
    case 'padamAkaun':         return apiPadamAkaun_(p, sesi);
    case 'setupStaf':          return { ok: true, mesej: setupStafDatabase() };

    default: return { ok: false, mesej: 'Action tidak dikenali: ' + tindakan };
  }
}

// ====================== AUTENTIKASI ==========================

function hash_(teks) {
  var raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,
    'KESSENI$' + teks, Utilities.Charset.UTF_8);
  return raw.map(function (b) { return ('0' + (b & 0xFF).toString(16)).slice(-2); }).join('');
}

function apiLogin_(p) {
  var emel = String(p.emel || '').trim().toLowerCase();
  var cache = CacheService.getScriptCache();
  var kunciCuba = 'cuba_' + emel;
  var cuba = parseInt(cache.get(kunciCuba) || '0', 10);
  if (cuba >= 10) return { ok: false, mesej: 'Terlalu banyak percubaan. Cuba lagi 15 minit.' };

  var akaun = null;
  bacaSemua_('Akaun').forEach(function (a) {
    if (String(a.Emel).trim().toLowerCase() === emel) akaun = a;
  });

  if (!akaun || String(akaun.Aktif).toUpperCase() !== 'YA' ||
      hash_(p.kataLaluan || '') !== akaun.HashKataLaluan) {
    cache.put(kunciCuba, String(cuba + 1), 900);
    log_(emel || '-', '-', 'LOGIN GAGAL', '');
    return { ok: false, mesej: 'Emel atau kata laluan salah' };
  }
  cache.remove(kunciCuba);

  var token = Utilities.getUuid() + Utilities.getUuid();
  cache.put('tok_' + token, JSON.stringify({
    emel: akaun.Emel, role: akaun.Role, masa: Date.now()
  }), TEMPOH_TOKEN_JAM * 3600);

  try { sheet_('Akaun').getRange(akaun._baris, 6).setValue(tarikhKini_()); } catch (e) {}
  log_(akaun.Emel, akaun.Role, 'LOGIN BERJAYA', '');

  return {
    ok: true, token: token, emel: akaun.Emel, role: akaun.Role,
    tamat: Date.now() + TEMPOH_TOKEN_JAM * 3600 * 1000,
    lalai: akaun.HashKataLaluan === hash_(KATA_LALUAN_LALAI)
  };
}

function sahkanToken_(token) {
  if (!token) return null;
  var raw = CacheService.getScriptCache().get('tok_' + token);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (e) { return null; }
}

function apiTukarKataLaluan_(p, sesi) {
  var akaun = null;
  bacaSemua_('Akaun').forEach(function (a) {
    if (String(a.Emel).trim().toLowerCase() === String(sesi.emel).trim().toLowerCase()) akaun = a;
  });
  if (!akaun) return { ok: false, mesej: 'Akaun tidak dijumpai' };
  if (hash_(p.lama || '') !== akaun.HashKataLaluan) return { ok: false, mesej: 'Kata laluan lama salah' };
  if (!p.baru || p.baru.length < 8) return { ok: false, mesej: 'Kata laluan baharu mesti sekurang-kurangnya 8 aksara' };

  sheet_('Akaun').getRange(akaun._baris, 2).setValue(hash_(p.baru));
  log_(sesi.emel, sesi.role, 'TUKAR KATA LALUAN', '');
  return { ok: true, mesej: 'Kata laluan berjaya ditukar' };
}

// ---- Pengurusan akaun (Superadmin sahaja) ----

function apiSenaraiAkaun_() {
  var senarai = bacaSemua_('Akaun').map(function (a) {
    return {
      _baris: a._baris, Emel: a.Emel, Role: a.Role, Aktif: a.Aktif,
      TarikhCipta: a.TarikhCipta, LoginTerakhir: a.LoginTerakhir
    };
  });
  return { ok: true, data: senarai, role: SENARAI_ROLE };
}

function apiSimpanAkaun_(p, sesi) {
  var emel = String(p.emel || '').trim();
  if (!emel || emel.indexOf('@') === -1) return { ok: false, mesej: 'Emel tidak sah' };
  if (SENARAI_ROLE.indexOf(p.role) === -1) return { ok: false, mesej: 'Role tidak sah' };

  var sh = sheet_('Akaun');
  var akaun = null;
  bacaSemua_('Akaun').forEach(function (a) {
    if (String(a.Emel).trim().toLowerCase() === emel.toLowerCase()) akaun = a;
  });

  if (akaun) {
    sh.getRange(akaun._baris, 3).setValue(p.role);
    sh.getRange(akaun._baris, 4).setValue(p.aktif || 'YA');
    if (p.kataLaluan) {
      if (p.kataLaluan.length < 8) return { ok: false, mesej: 'Kata laluan mesti 8 aksara ke atas' };
      sh.getRange(akaun._baris, 2).setValue(hash_(p.kataLaluan));
    }
    log_(sesi.emel, sesi.role, 'KEMASKINI AKAUN', emel + ' → ' + p.role);
    return { ok: true, mesej: 'Akaun dikemaskini' };
  }

  var kataLaluan = p.kataLaluan || KATA_LALUAN_LALAI;
  if (kataLaluan.length < 8) return { ok: false, mesej: 'Kata laluan mesti 8 aksara ke atas' };
  sh.appendRow([emel, hash_(kataLaluan), p.role, p.aktif || 'YA', tarikhKini_(), '']);
  log_(sesi.emel, sesi.role, 'CIPTA AKAUN', emel + ' (' + p.role + ')');

  var t = tetapan_();
  if (String(t.HANTAR_EMAIL).toUpperCase() === 'YA') {
    try {
      MailApp.sendEmail({
        to: emel,
        subject: '[KESSENI] Akaun sistem kewangan anda',
        htmlBody: '<p>Akaun anda telah dicipta untuk Sistem Kewangan ' + t.NAMA_KELAB + '.</p>' +
          '<p>Emel: <b>' + emel + '</b><br>Kata laluan sementara: <b>' + kataLaluan + '</b><br>' +
          'Peranan: <b>' + p.role + '</b></p>' +
          '<p>Sila log masuk dan tukar kata laluan anda dengan segera.</p>'
      });
    } catch (e) {}
  }
  return { ok: true, mesej: 'Akaun dicipta', kataLaluanSementara: p.kataLaluan ? '' : KATA_LALUAN_LALAI };
}

function apiPadamAkaun_(p, sesi) {
  var senarai = bacaSemua_('Akaun');
  var akaun = senarai.filter(function (a) { return a._baris === p.baris; })[0];
  if (!akaun) return { ok: false, mesej: 'Akaun tidak dijumpai' };
  if (String(akaun.Emel).toLowerCase() === String(sesi.emel).toLowerCase()) {
    return { ok: false, mesej: 'Tidak boleh padam akaun sendiri' };
  }
  var bilSuper = senarai.filter(function (a) {
    return a.Role === 'Superadmin' && String(a.Aktif).toUpperCase() === 'YA';
  }).length;
  if (akaun.Role === 'Superadmin' && bilSuper <= 1) {
    return { ok: false, mesej: 'Mesti ada sekurang-kurangnya satu Superadmin aktif' };
  }
  sheet_('Akaun').deleteRow(p.baris);
  log_(sesi.emel, sesi.role, 'PADAM AKAUN', akaun.Emel);
  return { ok: true, mesej: 'Akaun dipadam' };
}

// ====================== UTILITI SHEET ========================

function ss_() {
  return SpreadsheetApp.openById(
    PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID'));
}

function sheet_(nama) {
  var sh = ss_().getSheetByName(nama);
  if (!sh) throw new Error('Tab "' + nama + '" tiada. Sila run setupSystem().');
  return sh;
}

/** Buka sheet staff database (fail luar jika STAF_SPREADSHEET_ID diisi) */
function sheetStaf_(ciptaJikaTiada) {
  var t = tetapan_();
  var idLuar = String(t.STAF_SPREADSHEET_ID || '').trim();
  var namaTab = String(t.STAF_NAMA_TAB || 'Staf').trim() || 'Staf';
  var fail;
  if (idLuar) {
    // Terima ID penuh atau URL Google Sheet
    var padan = idLuar.match(/[-\w]{25,}/);
    try { fail = SpreadsheetApp.openById(padan ? padan[0] : idLuar); }
    catch (e) { throw new Error('Tidak dapat buka staff database. Semak STAF_SPREADSHEET_ID dalam tab Tetapan.'); }
  } else {
    fail = ss_();
  }
  var sh = fail.getSheetByName(namaTab);
  if (!sh) {
    // Jika hanya ada satu tab dalam fail luar, guna tab pertama
    var semua = fail.getSheets();
    if (idLuar && semua.length === 1) return semua[0];
    if (!ciptaJikaTiada) {
      throw new Error('Tab "' + namaTab + '" tiada dalam staff database. Semak STAF_NAMA_TAB dalam tab Tetapan.');
    }
    sh = fail.insertSheet(namaTab);
    sh.getRange(1, 1, 1, STAF_HEADER_LALAI.length).setValues([STAF_HEADER_LALAI]);
  }
  return sh;
}

function normalHeader_(teks) {
  return String(teks || '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
}

/** Peta nama medan sistem → nombor lajur dalam staff database */
function petaLajurStaf_(sh) {
  var lastCol = Math.max(sh.getLastColumn(), 1);
  var header = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(normalHeader_);
  var peta = {};
  Object.keys(PETA_STAF).forEach(function (medan) {
    var alias = PETA_STAF[medan].map(normalHeader_);
    for (var i = 0; i < header.length; i++) {
      if (alias.indexOf(header[i]) !== -1) { peta[medan] = i + 1; break; }
    }
  });
  return peta;
}

function nilaiSel_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, 'Asia/Kuala_Lumpur', 'yyyy-MM-dd');
  return v;
}

/** Baca semua staf daripada staff database (dinormalkan) */
function bacaStaf_() {
  var sh = sheetStaf_(false);
  var peta = petaLajurStaf_(sh);
  if (!peta.Nama || !peta.NoKP) {
    throw new Error('Staff database mesti ada lajur NAMA dan NO. K/P. Run setupStafDatabase untuk semak.');
  }
  var lastRow = sh.getLastRow();
  if (lastRow < 2) return [];
  var nilai = sh.getRange(2, 1, lastRow - 1, sh.getLastColumn()).getValues();

  return nilai.map(function (baris, i) {
    var o = { _baris: i + 2 };
    Object.keys(peta).forEach(function (medan) { o[medan] = nilaiSel_(baris[peta[medan] - 1]); });
    if (!o.Role) o.Role = 'Ahli';
    if (!o.StatusAhli) o.StatusAhli = 'Aktif';
    if (!o.Kategori) o.Kategori = 'Ahli Biasa';
    return o;
  }).filter(function (o) { return String(o.Nama).trim() || String(o.NoKP).trim(); });
}

/** Tulis kembali ke staff database — hanya lajur yang wujud dalam peta */
function tulisStaf_(nomborBaris, objek) {
  var sh = sheetStaf_(false);
  var peta = petaLajurStaf_(sh);
  var baris = nomborBaris;
  if (!baris) {
    baris = sh.getLastRow() + 1;
    if (baris < 2) baris = 2;
  }
  Object.keys(objek).forEach(function (medan) {
    if (medan.charAt(0) === '_') return;
    if (!peta[medan]) return;               // lajur tiada dalam staff DB — abaikan
    if (objek[medan] === undefined) return;
    sh.getRange(baris, peta[medan]).setValue(objek[medan]);
  });
  return baris;
}

function bacaSemua_(nama) {
  var sh = sheet_(nama);
  var lastRow = sh.getLastRow();
  var header = SKEMA[nama];
  if (lastRow < 2) return [];
  var nilai = sh.getRange(2, 1, lastRow - 1, header.length).getValues();
  return nilai.map(function (baris, i) {
    var o = { _baris: i + 2 };
    header.forEach(function (h, j) { o[h] = nilaiSel_(baris[j]); });
    return o;
  });
}

function tulisBaris_(nama, objek) {
  var sh = sheet_(nama);
  var baris = SKEMA[nama].map(function (h) {
    return objek[h] !== undefined && objek[h] !== null ? objek[h] : '';
  });
  sh.appendRow(baris);
  return sh.getLastRow();
}

function kemaskiniBaris_(nama, nomborBaris, objek) {
  var sh = sheet_(nama);
  var header = SKEMA[nama];
  var semasa = sh.getRange(nomborBaris, 1, 1, header.length).getValues()[0];
  var baru = header.map(function (h, i) { return objek[h] !== undefined ? objek[h] : semasa[i]; });
  sh.getRange(nomborBaris, 1, 1, header.length).setValues([baru]);
}

function tetapan_() {
  var out = {};
  bacaSemua_('Tetapan').forEach(function (r) { out[r.Kunci] = r.Nilai; });
  return out;
}

function idBaru_(prefix) {
  return prefix + '-' + Date.now().toString(36).toUpperCase() +
         Math.floor(Math.random() * 1000).toString(36).toUpperCase();
}

function tarikhKini_() {
  return Utilities.formatDate(new Date(), 'Asia/Kuala_Lumpur', 'yyyy-MM-dd HH:mm:ss');
}

function tarikhHariIni_() {
  return Utilities.formatDate(new Date(), 'Asia/Kuala_Lumpur', 'yyyy-MM-dd');
}

function log_(emel, role, tindakan, butiran) {
  try { sheet_('LogAudit').appendRow([tarikhKini_(), emel, role, tindakan, butiran]); } catch (e) {}
}

function balas_(objek) {
  return ContentService.createTextOutput(JSON.stringify(objek))
    .setMimeType(ContentService.MimeType.JSON);
}

function nombor_(v) { var n = parseFloat(v); return isNaN(n) ? 0 : n; }

function bersihIC_(ic) { return String(ic || '').replace(/[^0-9]/g, ''); }

function nomborSiriBaru_(jenis, prefix) {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var sh = sheet_('Kaunter');
    var data = sh.getDataRange().getValues();
    var tahun = new Date().getFullYear();
    var barisIdx = -1;
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === jenis && Number(data[i][1]) === tahun) { barisIdx = i + 1; break; }
    }
    var nombor;
    if (barisIdx === -1) { nombor = 1; sh.appendRow([jenis, tahun, nombor]); }
    else { nombor = Number(data[barisIdx - 1][2]) + 1; sh.getRange(barisIdx, 3).setValue(nombor); }
    return prefix + '/' + tahun + '/' + ('0000' + nombor).slice(-4);
  } finally { lock.releaseLock(); }
}

// ====================== FAIL / DRIVE =========================

function folderResit_() {
  return DriveApp.getFolderById(
    PropertiesService.getScriptProperties().getProperty('DRIVE_FOLDER_ID'));
}

function subFolder_(induk, nama) {
  var it = induk.getFoldersByName(nama);
  return it.hasNext() ? it.next() : induk.createFolder(nama);
}

function simpanFail_(fail, namaAwalan) {
  if (!fail || !fail.data) return { id: '', nama: '' };
  var bait = Utilities.base64Decode(fail.data);
  if (bait.length > MAX_SAIZ_FAIL_MB * 1024 * 1024) {
    throw new Error('Saiz fail melebihi ' + MAX_SAIZ_FAIL_MB + 'MB');
  }
  var dibenarkan = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  var mime = fail.mime || 'application/octet-stream';
  if (dibenarkan.indexOf(mime) === -1) {
    throw new Error('Jenis fail tidak dibenarkan. Guna JPG, PNG, WEBP atau PDF sahaja.');
  }
  var kini = new Date();
  var f = subFolder_(subFolder_(folderResit_(), String(kini.getFullYear())),
                     ('0' + (kini.getMonth() + 1)).slice(-2));
  var ext = mime === 'application/pdf' ? '.pdf' : ('.' + mime.split('/')[1]);
  var namaFail = namaAwalan + '_' + Utilities.formatDate(kini, 'Asia/Kuala_Lumpur', 'yyyyMMdd_HHmmss') + ext;
  var dibuat = f.createFile(Utilities.newBlob(bait, mime, namaFail));
  return { id: dibuat.getId(), nama: namaFail };
}

function apiMuatFail_(p) {
  if (!p.fileId) return { ok: false, mesej: 'Tiada fileId' };
  try {
    var fail = DriveApp.getFileById(p.fileId);
    var blob = fail.getBlob();
    return {
      ok: true, nama: fail.getName(), mime: blob.getContentType(),
      data: Utilities.base64Encode(blob.getBytes()), pautan: fail.getUrl()
    };
  } catch (e) { return { ok: false, mesej: 'Fail tidak dijumpai' }; }
}

// ====================== API AWAM =============================

/**
 * Payload konfigurasi untuk frontend (awam).
 * Semua branding, jenis bayaran dan kadar datang dari sini — tiada apa-apa
 * yang di-hardcode di frontend kecuali URL Apps Script.
 */
function apiInfoKelab_() {
  var t = tetapan_();
  var jenis = [];
  try {
    jenis = bacaSemua_('JenisBayaran')
      .filter(function (j) { return String(j.Aktif).toUpperCase() === 'YA' && j.Nama; })
      .sort(function (a, b) { return nombor_(a.Susunan) - nombor_(b.Susunan); })
      .map(function (j) {
        return {
          kod: j.Kod, nama: j.Nama, kategori: j.Kategori || j.Nama,
          amaunTetap: j.AmaunTetap === '' ? null : nombor_(j.AmaunTetap),
          pilihBulan: String(j.PilihBulan).toUpperCase() === 'YA',
          wajibKeterangan: String(j.WajibKeterangan).toUpperCase() === 'YA',
          keterangan: j.Keterangan || ''
        };
      });
  } catch (e) {}

  var kadar = [];
  try {
    kadar = bacaSemua_('KadarYuran')
      .filter(function (k) { return String(k.Aktif).toUpperCase() === 'YA'; })
      .map(function (k) { return { kategori: k.Kategori, kadar: nombor_(k.KadarBulanan) }; });
  } catch (e) {}

  return {
    ok: true,
    versi: VERSI_SISTEM,
    kelab: {
      nama: t.NAMA_KELAB, namaSingkat: t.NAMA_SINGKAT || t.NAMA_KELAB,
      pendaftaran: t.NO_PENDAFTARAN,
      bank: t.NAMA_BANK, akaun: t.NO_AKAUN,
      alamat: t.ALAMAT_KELAB, telefon: t.TELEFON_KELAB,
      logo: t.LOGO_URL || '', tema: t.TEMA_WARNA || '#0f766e',
      notaKakiResit: t.NOTA_KAKI_RESIT || '', penandatangan: t.NAMA_PENANDATANGAN || 'Bendahari',
      tunjukYuran: String(t.PORTAL_TUNJUK_YURAN || 'YA').toUpperCase() === 'YA',
      mesejPortal: t.PORTAL_MESEJ || ''
    },
    jenisBayaran: jenis,
    kadarYuran: kadar
  };
}

/**
 * Muat naik logo organisasi.
 * Logo disimpan dalam Drive dan dikongsi "sesiapa dengan pautan" kerana ia
 * memang perlu dipaparkan pada resit, invois dan portal awam.
 */
function apiSimpanLogo_(p, sesi) {
  if (sesi.role !== 'Superadmin') return { ok: false, mesej: 'Hanya Superadmin boleh tukar logo' };
  if (!p.fail || !p.fail.data) return { ok: false, mesej: 'Tiada fail logo' };

  var dibenarkan = ['image/png', 'image/jpeg', 'image/webp'];
  if (dibenarkan.indexOf(p.fail.mime) === -1) {
    return { ok: false, mesej: 'Logo mesti PNG, JPG atau WEBP' };
  }
  var bait = Utilities.base64Decode(p.fail.data);
  if (bait.length > 2 * 1024 * 1024) return { ok: false, mesej: 'Saiz logo melebihi 2MB' };

  var t = tetapan_();
  var folder = subFolder_(folderResit_(), 'Branding');

  // Buang logo lama supaya Drive tidak bersepah
  if (t.LOGO_FILE_ID) {
    try { DriveApp.getFileById(t.LOGO_FILE_ID).setTrashed(true); } catch (e) {}
  }

  var ext = p.fail.mime === 'image/png' ? '.png' : (p.fail.mime === 'image/webp' ? '.webp' : '.jpg');
  var fail = folder.createFile(Utilities.newBlob(bait, p.fail.mime, 'logo_' +
    Utilities.formatDate(new Date(), 'Asia/Kuala_Lumpur', 'yyyyMMdd_HHmmss') + ext));
  fail.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  var url = 'https://drive.google.com/thumbnail?id=' + fail.getId() + '&sz=w512';
  apiSimpanTetapan_({ tetapan: { LOGO_URL: url, LOGO_FILE_ID: fail.getId() } }, sesi);
  log_(sesi.emel, sesi.role, 'TUKAR LOGO', fail.getId());

  return { ok: true, mesej: 'Logo dikemaskini', logo: url, fileId: fail.getId() };
}

/** Simpan senarai jenis bayaran (ganti keseluruhan) */
function apiSimpanJenisBayaran_(p, sesi) {
  if (sesi.role !== 'Superadmin') return { ok: false, mesej: 'Hanya Superadmin boleh ubah jenis bayaran' };
  var senarai = (p.jenis || []).filter(function (j) { return String(j.Nama || '').trim(); });
  if (!senarai.length) return { ok: false, mesej: 'Mesti ada sekurang-kurangnya satu jenis bayaran' };

  var sh = sheet_('JenisBayaran');
  if (sh.getLastRow() > 1) sh.deleteRows(2, sh.getLastRow() - 1);
  senarai.forEach(function (j, i) {
    sh.appendRow([
      j.Kod || ('JB' + (i + 1)), j.Nama, j.Kategori || j.Nama,
      j.AmaunTetap === '' || j.AmaunTetap === null || j.AmaunTetap === undefined ? '' : nombor_(j.AmaunTetap),
      j.PilihBulan || 'TIDAK', j.WajibKeterangan || 'TIDAK',
      j.Aktif || 'YA', nombor_(j.Susunan) || (i + 1), j.Keterangan || ''
    ]);
  });
  log_(sesi.emel, sesi.role, 'KEMASKINI JENIS BAYARAN', senarai.length + ' jenis');
  return { ok: true, mesej: 'Jenis bayaran dikemaskini' };
}

/**
 * Ahli dapatkan resit sendiri untuk dicetak (awam, tetapi terikat pada No. KP).
 * Hanya memulangkan resit yang benar-benar milik IC tersebut.
 */
function apiDapatResit_(p) {
  var ic = bersihIC_(p.noKP);
  if (ic.length < 6) return { ok: false, mesej: 'No. Kad Pengenalan tidak sah' };

  var rekod = null;
  bacaSemua_('DuitMasuk').forEach(function (r) {
    if (r.ID === p.id && bersihIC_(r.NoKP) === ic) rekod = r;
  });
  if (!rekod) return { ok: false, mesej: 'Rekod tidak dijumpai' };
  if (rekod.Status !== 'Confirmed' || !rekod.NoResit) {
    return { ok: false, mesej: 'Resit hanya tersedia selepas bayaran disahkan' };
  }

  var resit = null;
  bacaSemua_('Resit').forEach(function (r) { if (r.NoResit === rekod.NoResit) resit = r; });
  if (!resit) return { ok: false, mesej: 'Resit tidak dijumpai' };

  return {
    ok: true,
    resit: {
      NoResit: resit.NoResit, Tarikh: resit.Tarikh, DaripadaNama: resit.DaripadaNama,
      Perkara: resit.Perkara, Amaun: nombor_(resit.Amaun),
      KaedahBayaran: resit.KaedahBayaran, Catatan: resit.Catatan
    }
  };
}

function cariStaf_(noKP) {
  var ic = bersihIC_(noKP);
  var jumpa = null;
  bacaStaf_().forEach(function (a) { if (bersihIC_(a.NoKP) === ic) jumpa = a; });
  return jumpa;
}

/**
 * Portal ahli: semak identiti guna No. KP.
 * KESELAMATAN: endpoint awam — hanya pulangkan nama, jawatan, jabatan
 * dan status yuran. Emel, telefon, alamat, gambar TIDAK dipulangkan.
 */
function apiSemakAhli_(p) {
  var ic = bersihIC_(p.noKP);
  if (ic.length < 6) return { ok: false, mesej: 'No. Kad Pengenalan tidak sah' };

  var staf = cariStaf_(ic);
  if (!staf) return { ok: false, kod: 'TIADA', mesej: 'Rekod tidak dijumpai. Sila hubungi Bendahari.' };
  if (String(staf.StatusAhli).toLowerCase() === 'tidak aktif') {
    return { ok: false, mesej: 'Keahlian tidak aktif. Sila hubungi Bendahari.' };
  }

  var tahun = p.tahun || new Date().getFullYear();
  var kadar = kadarUntuk_(staf.Kategori);
  var peta = {};
  bacaSemua_('RekodYuran').forEach(function (r) {
    if (bersihIC_(r.NoKP) === ic && Number(r.Tahun) === Number(tahun)) peta[Number(r.Bulan)] = r;
  });

  var bulan = [];
  for (var b = 1; b <= 12; b++) {
    var r = peta[b];
    bulan.push({
      bulan: b, nama: BULAN[b - 1],
      amaun: r ? nombor_(r.Amaun) : kadar,
      status: r ? r.Status : 'Belum Bayar'
    });
  }
  var tertunggak = bulan.filter(function (x) { return x.status === 'Belum Bayar'; });

  return {
    ok: true,
    ahli: {
      nama: staf.Nama, jawatan: staf.Jawatan, jabatan: staf.Jabatan,
      kategori: staf.Kategori, noKP: staf.NoKP
    },
    tahun: Number(tahun), kadar: kadar, bulan: bulan,
    jumlahTertunggak: tertunggak.reduce(function (s, x) { return s + x.amaun; }, 0),
    bilanganTertunggak: tertunggak.length
  };
}

function kadarUntuk_(kategori) {
  var t = tetapan_();
  var jumpa = nombor_(t.KADAR_YURAN_LALAI) || 10;
  bacaSemua_('KadarYuran').forEach(function (k) {
    if (String(k.Kategori).toLowerCase() === String(kategori || '').toLowerCase() &&
        String(k.Aktif).toUpperCase() === 'YA') {
      jumpa = nombor_(k.KadarBulanan);
    }
  });
  return jumpa;
}

function apiHantarBayaran_(p) {
  var ic = bersihIC_(p.noKP);
  if (ic.length < 6) return { ok: false, mesej: 'No. Kad Pengenalan tidak sah' };

  var cache = CacheService.getScriptCache();
  var kunci = 'hantar_' + ic;
  var kira = parseInt(cache.get(kunci) || '0', 10);
  if (kira >= 5) return { ok: false, mesej: 'Terlalu banyak penghantaran. Cuba lagi kemudian.' };

  var staf = cariStaf_(ic);
  if (!staf) return { ok: false, mesej: 'Rekod tidak dijumpai' };

  var amaun = nombor_(p.amaun);
  if (amaun <= 0) return { ok: false, mesej: 'Amaun tidak sah' };
  if (!p.fail || !p.fail.data) return { ok: false, mesej: 'Sila muat naik bukti pembayaran' };

  var fail = simpanFail_(p.fail, ic);
  var id = idBaru_('DM');
  var bulanSenarai = p.bulanYuran || [];

  tulisBaris_('DuitMasuk', {
    ID: id, Tarikh: p.tarikh || tarikhHariIni_(),
    Kategori: p.kategori || 'Sumbangan',
    NoKP: staf.NoKP, Nama: staf.Nama,
    Keterangan: p.keterangan || '', Amaun: amaun,
    KaedahBayaran: p.kaedah || 'Pindahan Bank',
    ResitFileId: fail.id, ResitNamaFail: fail.nama,
    Status: 'Pending',
    TahunYuran: p.tahunYuran || '', BulanYuran: bulanSenarai.join(','),
    TarikhSubmit: tarikhKini_(), TarikhVerify: '', VerifyOleh: '', NoResit: '', Catatan: ''
  });

  if (p.kategori === 'Yuran Ahli' && bulanSenarai.length) {
    tandaYuran_(staf, p.tahunYuran, bulanSenarai, 'Pending', id, amaun / bulanSenarai.length);
  }

  cache.put(kunci, String(kira + 1), 3600);
  log_('ahli:' + ic, 'Ahli', 'HANTAR BAYARAN', id + ' RM' + amaun);

  var t = tetapan_();
  if (t.EMAIL_ADMIN && String(t.HANTAR_EMAIL).toUpperCase() === 'YA') {
    try {
      MailApp.sendEmail({
        to: t.EMAIL_ADMIN,
        subject: '[KESSENI] Bayaran baharu menunggu pengesahan - ' + staf.Nama,
        htmlBody: '<p>Bayaran baharu telah dihantar dan menunggu pengesahan.</p><ul>' +
          '<li><b>Nama:</b> ' + staf.Nama + '</li>' +
          '<li><b>Jabatan:</b> ' + (staf.Jabatan || '-') + '</li>' +
          '<li><b>Kategori:</b> ' + (p.kategori || '-') + '</li>' +
          '<li><b>Amaun:</b> RM ' + amaun.toFixed(2) + '</li>' +
          '<li><b>Rujukan:</b> ' + id + '</li></ul>' +
          '<p>Sila log masuk ke panel admin untuk mengesahkan.</p>'
      });
    } catch (e) {}
  }

  return { ok: true, id: id, mesej: 'Bayaran anda telah dihantar dan sedang menunggu pengesahan Bendahari.' };
}

function tandaYuran_(staf, tahun, bulanSenarai, status, rujukanId, amaunSebulan) {
  var sedia = bacaSemua_('RekodYuran');
  var ic = bersihIC_(staf.NoKP);
  bulanSenarai.forEach(function (b) {
    var jumpa = null;
    sedia.forEach(function (r) {
      if (bersihIC_(r.NoKP) === ic && Number(r.Tahun) === Number(tahun) && Number(r.Bulan) === Number(b)) jumpa = r;
    });
    if (jumpa) {
      kemaskiniBaris_('RekodYuran', jumpa._baris, {
        Status: status, RujukanMasukID: rujukanId,
        Amaun: amaunSebulan, TarikhKemaskini: tarikhKini_()
      });
    } else {
      tulisBaris_('RekodYuran', {
        ID: idBaru_('YR'), NoKP: staf.NoKP, Nama: staf.Nama,
        Tahun: tahun, Bulan: b, Amaun: amaunSebulan,
        Status: status, RujukanMasukID: rujukanId, TarikhKemaskini: tarikhKini_()
      });
    }
  });
}

function apiSemakStatusBayaran_(p) {
  var ic = bersihIC_(p.noKP);
  if (ic.length < 6) return { ok: false, mesej: 'No. Kad Pengenalan tidak sah' };
  var senarai = bacaSemua_('DuitMasuk')
    .filter(function (r) { return bersihIC_(r.NoKP) === ic; })
    .map(function (r) {
      return {
        id: r.ID, tarikh: r.Tarikh, kategori: r.Kategori, amaun: nombor_(r.Amaun),
        status: r.Status, noResit: r.NoResit, catatan: r.Catatan
      };
    })
    .sort(function (a, b) { return String(b.tarikh).localeCompare(String(a.tarikh)); });
  return { ok: true, senarai: senarai };
}

// ====================== API ADMIN ============================

function apiDashboard_() {
  var masuk = bacaSemua_('DuitMasuk');
  var keluar = bacaSemua_('DuitKeluar');
  var staf = [];
  var ralatStaf = '';
  try { staf = bacaStaf_(); } catch (e) { ralatStaf = e.message; }
  var tahun = new Date().getFullYear();
  var t = tetapan_();

  var sah = masuk.filter(function (r) { return r.Status === 'Confirmed'; });
  var pending = masuk.filter(function (r) { return r.Status === 'Pending'; });
  var jumMasuk = sah.reduce(function (s, r) { return s + nombor_(r.Amaun); }, 0);
  var jumKeluar = keluar.reduce(function (s, r) { return s + nombor_(r.Amaun); }, 0);

  var bulanan = [];
  for (var b = 1; b <= 12; b++) {
    var pre = tahun + '-' + ('0' + b).slice(-2);
    bulanan.push({
      bulan: BULAN[b - 1].substring(0, 3),
      masuk: sah.filter(function (r) { return String(r.Tarikh).indexOf(pre) === 0; })
                .reduce(function (s, r) { return s + nombor_(r.Amaun); }, 0),
      keluar: keluar.filter(function (r) { return String(r.Tarikh).indexOf(pre) === 0; })
                .reduce(function (s, r) { return s + nombor_(r.Amaun); }, 0)
    });
  }

  var ikutKategori = {};
  sah.forEach(function (r) { ikutKategori[r.Kategori] = (ikutKategori[r.Kategori] || 0) + nombor_(r.Amaun); });

  var yuran = bacaSemua_('RekodYuran').filter(function (r) { return Number(r.Tahun) === tahun; });

  // Amaran sijil C&P hampir tamat
  var hadHari = nombor_(t.AMARAN_SIJIL_HARI) || 90;
  var kini = new Date();
  var sijil = staf.filter(function (s) { return s.TarikhTamat; }).map(function (s) {
    var tamat = new Date(String(s.TarikhTamat).substring(0, 10));
    var hari = Math.round((tamat - kini) / 86400000);
    return { nama: s.Nama, jawatan: s.Jawatan, tarikhTamat: String(s.TarikhTamat).substring(0, 10), hari: hari };
  }).filter(function (s) { return !isNaN(s.hari) && s.hari <= hadHari; })
    .sort(function (a, b) { return a.hari - b.hari; });

  return {
    ok: true,
    ralatStaf: ralatStaf,
    ringkasan: {
      jumlahMasuk: jumMasuk, jumlahKeluar: jumKeluar, baki: jumMasuk - jumKeluar,
      bilanganPending: pending.length,
      amaunPending: pending.reduce(function (s, r) { return s + nombor_(r.Amaun); }, 0),
      bilanganAhli: staf.filter(function (a) { return String(a.StatusAhli).toLowerCase() !== 'tidak aktif'; }).length,
      bilanganStaf: staf.length,
      yuranTerkumpul: yuran.filter(function (r) { return r.Status === 'Sudah Bayar'; })
                           .reduce(function (s, r) { return s + nombor_(r.Amaun); }, 0),
      yuranTertunggak: yuran.filter(function (r) { return r.Status === 'Belum Bayar'; })
                           .reduce(function (s, r) { return s + nombor_(r.Amaun); }, 0)
    },
    bulanan: bulanan,
    kategori: Object.keys(ikutKategori).map(function (k) { return { nama: k, amaun: ikutKategori[k] }; }),
    terkini: masuk.slice(-8).reverse(),
    sijilHampirTamat: sijil.slice(0, 10)
  };
}

/** Senarai data. tab "Staf" dibaca dari staff database (master). */
function apiSenarai_(p, sesi) {
  if (p.tab === 'Staf') {
    var staf = bacaStaf_();
    // Setiausaha & Superadmin nampak semua; Bendahari nampak versi ringkas
    if (sesi.role === 'Bendahari') {
      staf = staf.map(function (s) {
        return { _baris: s._baris, Nama: s.Nama, NoKP: s.NoKP, Jawatan: s.Jawatan,
                 Jabatan: s.Jabatan, Kategori: s.Kategori, StatusAhli: s.StatusAhli, Role: s.Role };
      });
    }
    return { ok: true, tab: 'Staf', data: staf, senaraiRole: SENARAI_ROLE };
  }
  if (!SKEMA[p.tab]) return { ok: false, mesej: 'Tab tidak sah' };
  if (p.tab === 'Akaun') return { ok: false, mesej: 'Guna action senaraiAkaun' };

  var data = bacaSemua_(p.tab);
  if (p.tapis) {
    Object.keys(p.tapis).forEach(function (k) {
      var nilai = String(p.tapis[k]).toLowerCase();
      if (!nilai) return;
      data = data.filter(function (r) { return String(r[k]).toLowerCase() === nilai; });
    });
  }
  return { ok: true, tab: p.tab, header: SKEMA[p.tab], data: data };
}

/** Simpan / kemaskini rekod staf dalam staff database (master) */
function apiSimpanStaf_(p, sesi) {
  var d = p.data || {};
  if (!String(d.Nama || '').trim()) return { ok: false, mesej: 'Nama wajib diisi' };
  if (bersihIC_(d.NoKP).length < 6) return { ok: false, mesej: 'No. Kad Pengenalan tidak sah' };
  if (d.Role && SENARAI_ROLE.indexOf(d.Role) === -1) return { ok: false, mesej: 'Role tidak sah' };

  // Elak IC berganda
  var ic = bersihIC_(d.NoKP);
  var bertindih = bacaStaf_().filter(function (s) {
    return bersihIC_(s.NoKP) === ic && s._baris !== p.baris;
  });
  if (bertindih.length) return { ok: false, mesej: 'No. Kad Pengenalan ini sudah wujud dalam database' };

  var baris = tulisStaf_(p.baris, d);
  log_(sesi.emel, sesi.role, p.baris ? 'KEMASKINI STAF' : 'TAMBAH STAF', d.Nama + ' (' + d.NoKP + ')');
  return { ok: true, mesej: 'Rekod staf disimpan', baris: baris };
}

function apiPadamStaf_(p, sesi) {
  if (sesi.role !== 'Superadmin') return { ok: false, mesej: 'Hanya Superadmin boleh padam rekod staf' };
  if (!p.baris || p.baris < 2) return { ok: false, mesej: 'Baris tidak sah' };
  var sh = sheetStaf_(false);
  var peta = petaLajurStaf_(sh);
  var nama = sh.getRange(p.baris, peta.Nama || 1).getValue();
  sh.deleteRow(p.baris);
  log_(sesi.emel, sesi.role, 'PADAM STAF', String(nama));
  return { ok: true, mesej: 'Rekod staf dipadam' };
}

function apiSimpanBaris_(p, sesi) {
  var nama = p.tab;
  if (nama === 'Staf') return apiSimpanStaf_(p, sesi);
  if (!SKEMA[nama] || nama === 'Akaun') return { ok: false, mesej: 'Tab tidak sah' };
  var objek = p.data || {};

  if (p.fail && p.fail.data) {
    var fail = simpanFail_(p.fail, nama);
    objek.ResitFileId = fail.id;
    objek.ResitNamaFail = fail.nama;
  }

  if (p.baris) {
    kemaskiniBaris_(nama, p.baris, objek);
    log_(sesi.emel, sesi.role, 'KEMASKINI ' + nama, JSON.stringify(objek).substring(0, 250));
    return { ok: true, mesej: 'Rekod dikemaskini', baris: p.baris };
  }

  if (SKEMA[nama].indexOf('ID') === 0 && !objek.ID) {
    objek.ID = idBaru_(nama.substring(0, 2).toUpperCase());
  }
  if (nama === 'DuitKeluar') {
    objek.DirekodOleh = sesi.emel;
    objek.TarikhRekod = tarikhKini_();
  }
  if (nama === 'DuitMasuk') {
    objek.TarikhSubmit = tarikhKini_();
    if (!objek.Status) objek.Status = 'Confirmed';
    if (objek.Status === 'Confirmed') {
      objek.TarikhVerify = tarikhKini_();
      objek.VerifyOleh = sesi.emel;
      // Setiap bayaran yang disahkan MESTI ada resit — termasuk rekod manual admin
      if (!objek.NoResit) {
        var tSet = tetapan_();
        objek.NoResit = nomborSiriBaru_('RESIT', tSet.PREFIX_RESIT || 'RSN');
        tulisBaris_('Resit', {
          NoResit: objek.NoResit, Tarikh: objek.Tarikh || tarikhHariIni_(),
          DaripadaNama: objek.Nama, Perkara: objek.Kategori + ' - ' + (objek.Keterangan || ''),
          Amaun: nombor_(objek.Amaun), KaedahBayaran: objek.KaedahBayaran,
          RujukanMasukID: objek.ID, DikeluarkanOleh: sesi.emel, Catatan: ''
        });
      }
    }
  }
  var baris = tulisBaris_(nama, objek);

  if (nama === 'DuitMasuk' && objek.Status === 'Confirmed' &&
      objek.Kategori === 'Yuran Ahli' && objek.BulanYuran) {
    var senaraiB = String(objek.BulanYuran).split(',').filter(String);
    var staf = cariStaf_(objek.NoKP);
    if (staf && senaraiB.length) {
      tandaYuran_(staf, objek.TahunYuran, senaraiB, 'Sudah Bayar', objek.ID,
                  nombor_(objek.Amaun) / senaraiB.length);
    }
  }

  log_(sesi.emel, sesi.role, 'TAMBAH ' + nama, objek.ID || '');
  return { ok: true, mesej: 'Rekod disimpan', baris: baris, id: objek.ID };
}

function apiPadamBaris_(p, sesi) {
  var nama = p.tab;
  if (nama === 'Staf') return apiPadamStaf_(p, sesi);
  if (!SKEMA[nama] || nama === 'Akaun') return { ok: false, mesej: 'Tab tidak sah' };
  if (!p.baris || p.baris < 2) return { ok: false, mesej: 'Baris tidak sah' };
  var sh = sheet_(nama);
  var rekod = sh.getRange(p.baris, 1, 1, SKEMA[nama].length).getValues()[0];
  sh.deleteRow(p.baris);
  log_(sesi.emel, sesi.role, 'PADAM ' + nama, rekod.join(' | ').substring(0, 250));
  return { ok: true, mesej: 'Rekod dipadam' };
}

function apiVerifyBayaran_(p, sesi) {
  var rekod = null;
  bacaSemua_('DuitMasuk').forEach(function (r) { if (r.ID === p.id) rekod = r; });
  if (!rekod) return { ok: false, mesej: 'Rekod tidak dijumpai' };
  if (rekod.Status === 'Confirmed' && p.keputusan === 'Confirmed') {
    return { ok: false, mesej: 'Rekod ini sudah disahkan' };
  }

  var t = tetapan_();
  var kemas = {
    Status: p.keputusan, TarikhVerify: tarikhKini_(),
    VerifyOleh: sesi.emel, Catatan: p.catatan || rekod.Catatan
  };
  var noResit = rekod.NoResit;
  var staf = cariStaf_(rekod.NoKP);

  if (p.keputusan === 'Confirmed') {
    if (!noResit) {
      noResit = nomborSiriBaru_('RESIT', t.PREFIX_RESIT || 'RSN');
      kemas.NoResit = noResit;
      tulisBaris_('Resit', {
        NoResit: noResit, Tarikh: tarikhHariIni_(),
        DaripadaNama: rekod.Nama, Perkara: rekod.Kategori + ' - ' + (rekod.Keterangan || ''),
        Amaun: nombor_(rekod.Amaun), KaedahBayaran: rekod.KaedahBayaran,
        RujukanMasukID: rekod.ID, DikeluarkanOleh: sesi.emel, Catatan: ''
      });
    }
    if (rekod.Kategori === 'Yuran Ahli' && rekod.BulanYuran && staf) {
      var bl = String(rekod.BulanYuran).split(',').filter(String);
      if (bl.length) tandaYuran_(staf, rekod.TahunYuran, bl, 'Sudah Bayar', rekod.ID, nombor_(rekod.Amaun) / bl.length);
    }
  } else if (p.keputusan === 'Ditolak' && rekod.Kategori === 'Yuran Ahli' && rekod.BulanYuran && staf) {
    var bl2 = String(rekod.BulanYuran).split(',').filter(String);
    if (bl2.length) tandaYuran_(staf, rekod.TahunYuran, bl2, 'Belum Bayar', '', kadarUntuk_(staf.Kategori));
  }

  kemaskiniBaris_('DuitMasuk', rekod._baris, kemas);
  log_(sesi.emel, sesi.role, 'VERIFY BAYARAN', rekod.ID + ' → ' + p.keputusan);

  var emel = staf ? staf.Emel : '';
  if (emel && String(t.HANTAR_EMAIL).toUpperCase() === 'YA') {
    try {
      var disahkan = p.keputusan === 'Confirmed';
      MailApp.sendEmail({
        to: emel,
        subject: '[KESSENI] Bayaran anda ' + (disahkan ? 'telah disahkan' : 'tidak dapat disahkan'),
        htmlBody:
          '<div style="font-family:Arial,sans-serif;font-size:14px;color:#111">' +
          '<h3 style="color:#0f766e;margin:0 0 12px">' + t.NAMA_KELAB + '</h3>' +
          '<p>Assalamualaikum ' + rekod.Nama + ',</p>' +
          (disahkan ? '<p>Bayaran anda telah <b>disahkan</b> oleh Bendahari. Terima kasih.</p>'
                    : '<p>Bayaran anda <b>tidak dapat disahkan</b> buat masa ini.</p>') +
          '<table cellpadding="6" style="border-collapse:collapse;margin:12px 0">' +
          '<tr><td style="background:#f1f5f9"><b>Kategori</b></td><td>' + rekod.Kategori + '</td></tr>' +
          '<tr><td style="background:#f1f5f9"><b>Amaun</b></td><td>RM ' + nombor_(rekod.Amaun).toFixed(2) + '</td></tr>' +
          '<tr><td style="background:#f1f5f9"><b>Tarikh</b></td><td>' + rekod.Tarikh + '</td></tr>' +
          (disahkan && noResit ? '<tr><td style="background:#f1f5f9"><b>No. Resit</b></td><td>' + noResit + '</td></tr>' : '') +
          (p.catatan ? '<tr><td style="background:#f1f5f9"><b>Catatan</b></td><td>' + p.catatan + '</td></tr>' : '') +
          '</table>' +
          '<p style="color:#64748b;font-size:12px">Emel automatik daripada Sistem Kewangan KESSENI.</p></div>'
      });
    } catch (e) {}
  }

  return { ok: true, mesej: 'Bayaran ' + (p.keputusan === 'Confirmed' ? 'disahkan' : 'ditolak'), noResit: noResit };
}

function apiJanaInvois_(p, sesi) {
  var t = tetapan_();
  var no = nomborSiriBaru_('INVOIS', t.PREFIX_INVOIS || 'INV');
  tulisBaris_('Invois', {
    NoInvois: no, Tarikh: p.tarikh || tarikhHariIni_(),
    KepadaNama: p.kepadaNama || '', KepadaAlamat: p.kepadaAlamat || '',
    KepadaEmel: p.kepadaEmel || '', Perkara: p.perkara || '',
    Amaun: nombor_(p.amaun), Status: 'Belum Bayar', TarikhBayar: '',
    DikeluarkanOleh: sesi.emel, Catatan: p.catatan || ''
  });
  log_(sesi.emel, sesi.role, 'JANA INVOIS', no);

  if (p.hantarEmel && p.kepadaEmel && String(t.HANTAR_EMAIL).toUpperCase() === 'YA') {
    try {
      MailApp.sendEmail({
        to: p.kepadaEmel, subject: '[KESSENI] Invois ' + no,
        htmlBody: '<div style="font-family:Arial,sans-serif;font-size:14px">' +
          '<h3 style="color:#0f766e">' + t.NAMA_KELAB + '</h3>' +
          '<p>Invois <b>' + no + '</b> bernilai <b>RM ' + nombor_(p.amaun).toFixed(2) + '</b> bagi ' +
          (p.perkara || '-') + '.</p><p>Pembayaran ke akaun:<br>' + t.NAMA_BANK +
          '<br>No. Akaun: <b>' + t.NO_AKAUN + '</b></p></div>'
      });
    } catch (e) {}
  }
  return { ok: true, noInvois: no };
}

function apiJanaResit_(p, sesi) {
  var t = tetapan_();
  var no = nomborSiriBaru_('RESIT', t.PREFIX_RESIT || 'RSN');
  tulisBaris_('Resit', {
    NoResit: no, Tarikh: p.tarikh || tarikhHariIni_(),
    DaripadaNama: p.daripadaNama || '', Perkara: p.perkara || '',
    Amaun: nombor_(p.amaun), KaedahBayaran: p.kaedah || 'Tunai',
    RujukanMasukID: p.rujukanMasukID || '', DikeluarkanOleh: sesi.emel, Catatan: p.catatan || ''
  });
  log_(sesi.emel, sesi.role, 'JANA RESIT', no);
  return { ok: true, noResit: no };
}

function apiSimpanTetapan_(p, sesi) {
  var sh = sheet_('Tetapan');
  var peta = {};
  bacaSemua_('Tetapan').forEach(function (r) { peta[r.Kunci] = r._baris; });
  Object.keys(p.tetapan || {}).forEach(function (k) {
    if (peta[k]) sh.getRange(peta[k], 2).setValue(p.tetapan[k]);
    else sh.appendRow([k, p.tetapan[k], '']);
  });
  log_(sesi.emel, sesi.role, 'KEMASKINI TETAPAN', Object.keys(p.tetapan || {}).join(','));
  return { ok: true, mesej: 'Tetapan disimpan' };
}

function apiSimpanKadar_(p, sesi) {
  var sh = sheet_('KadarYuran');
  if (sh.getLastRow() > 1) sh.deleteRows(2, sh.getLastRow() - 1);
  (p.kadar || []).forEach(function (k) {
    sh.appendRow([k.Kategori, nombor_(k.KadarBulanan), k.Aktif || 'YA']);
  });
  log_(sesi.emel, sesi.role, 'KEMASKINI KADAR YURAN', JSON.stringify(p.kadar || []).substring(0, 250));
  return { ok: true, mesej: 'Kadar yuran dikemaskini' };
}

/** Jana baris "Belum Bayar" untuk semua ahli aktif bagi satu tahun */
function apiJanaYuranTahunan_(p, sesi) {
  var tahun = Number(p.tahun) || new Date().getFullYear();
  var staf = bacaStaf_().filter(function (a) {
    return String(a.StatusAhli).toLowerCase() !== 'tidak aktif';
  });
  var sedia = {};
  bacaSemua_('RekodYuran').forEach(function (r) {
    if (Number(r.Tahun) === tahun) sedia[bersihIC_(r.NoKP) + '_' + r.Bulan] = true;
  });

  var barisBaru = [];
  staf.forEach(function (a) {
    var kadar = kadarUntuk_(a.Kategori);
    for (var b = 1; b <= 12; b++) {
      if (sedia[bersihIC_(a.NoKP) + '_' + b]) continue;
      barisBaru.push([idBaru_('YR'), a.NoKP, a.Nama, tahun, b, kadar, 'Belum Bayar', '', tarikhKini_()]);
    }
  });
  if (barisBaru.length) {
    var sh = sheet_('RekodYuran');
    sh.getRange(sh.getLastRow() + 1, 1, barisBaru.length, 9).setValues(barisBaru);
  }
  log_(sesi.emel, sesi.role, 'JANA YURAN TAHUNAN', tahun + ' (' + barisBaru.length + ' baris)');
  return { ok: true, mesej: barisBaru.length + ' rekod yuran dijana untuk tahun ' + tahun };
}

function apiLaporan_(p) {
  var dari = p.dari || '0000-00-00';
  var hingga = p.hingga || '9999-12-31';
  var dalam = function (t) { var s = String(t).substring(0, 10); return s >= dari && s <= hingga; };

  var masuk = bacaSemua_('DuitMasuk').filter(function (r) { return r.Status === 'Confirmed' && dalam(r.Tarikh); });
  var keluar = bacaSemua_('DuitKeluar').filter(function (r) { return dalam(r.Tarikh); });

  var kump = function (senarai) {
    var o = {};
    senarai.forEach(function (r) { o[r.Kategori] = (o[r.Kategori] || 0) + nombor_(r.Amaun); });
    return Object.keys(o).map(function (k) { return { kategori: k, amaun: o[k] }; });
  };

  var jm = masuk.reduce(function (s, r) { return s + nombor_(r.Amaun); }, 0);
  var jk = keluar.reduce(function (s, r) { return s + nombor_(r.Amaun); }, 0);

  return {
    ok: true, dari: dari, hingga: hingga,
    jumlahMasuk: jm, jumlahKeluar: jk, baki: jm - jk,
    masukIkutKategori: kump(masuk), keluarIkutKategori: kump(keluar),
    masuk: masuk, keluar: keluar
  };
}
