// Sistem Rekod Kehadiran & Bantuan Kaunter
// Pemalar Sistem

export const SESI = ['PAGI', 'PETANG'] as const;
export type SesiType = (typeof SESI)[number];

export const JENIS_REKOD = ['KEHADIRAN', 'BANTUAN_START', 'BANTUAN_END', 'TUGASAN_START', 'TUGASAN_END', 'CORRECTION'] as const;
export type JenisRekodType = (typeof JENIS_REKOD)[number];

export const STATUS_REKOD = ['AKTIF', 'DIBATALKAN'] as const;
export type StatusRekodType = (typeof STATUS_REKOD)[number];

// Nama sheet dalam Google Sheets
export const SHEET_NAMES = {
  ANGGOTA: 'ANGGOTA',
  LOG: 'LOG',
} as const;

// Kolum untuk sheet ANGGOTA
export const ANGGOTA_COLUMNS = {
  ANGGOTA_ID: 'anggota_id',
  NAMA: 'nama',
  GRED: 'gred',
  PIN: 'pin',
  PIN_HASH: 'pin_hash',
  STATUS: 'status',
} as const;

// Kolum untuk sheet LOG
export const LOG_COLUMNS = {
  RECORD_ID: 'record_id',
  SERVER_TS: 'server_ts',
  JENIS: 'jenis',
  TARIKH: 'tarikh',
  SESI: 'sesi',
  ANGGOTA_ID: 'anggota_id',
  NAMA: 'nama',
  GRED: 'gred',
  REMARK: 'remark',
  BANTUAN_START: 'bantuan_start',
  BANTUAN_END: 'bantuan_end',
  DURASI_MIN: 'durasi_min',
  PREV_HASH: 'prev_hash',
  HASH: 'hash',
  STATUS: 'status',
  REF_RECORD_ID: 'ref_record_id',
  // Kolum baru Q, R, S — Tambah header ini dalam Google Sheets secara manual
  LOKASI: 'lokasi',         // Kolum Q
  KATEGORI: 'kategori',     // Kolum R
  SUB_KATEGORI: 'sub_kategori', // Kolum S
} as const;

// Pilihan untuk dropdown Lokasi
export const LOKASI_PILIHAN = ['Kaunter', 'Program Pejabat', 'Program Luar', 'Lain-lain'] as const;
export type LokasiType = (typeof LOKASI_PILIHAN)[number];

// Pilihan untuk dropdown Kategori
export const KATEGORI_PILIHAN = ['Pendaftaran', 'Bantuan Pertanyaan', 'Lain-lain'] as const;
export type KategoriType = (typeof KATEGORI_PILIHAN)[number];

// Sub-pilihan untuk Kategori Pendaftaran
export const SUB_KATEGORI_PENDAFTARAN = ['Kendiri', 'Kasih', 'MyFuturejobs', 'Portal Lindung', 'EI-SIP', 'Lain-lain'] as const;
export type SubKategoriPendaftaranType = (typeof SUB_KATEGORI_PENDAFTARAN)[number];

// Pengesahan
export const VALIDATION_RULES = {
  MIN_REMARK_LENGTH: 20,
  MIN_BANTUAN_DURATION_MIN: 3,
  PIN_LENGTH: 6,
} as const;

// Cookie admin
export const ADMIN_COOKIE_NAME = 'admin_session';
export const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 8; // 8 jam

// Hash chain genesis
export const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

// Waktu operasi kaunter: 8:00 AM - 5:00 PM (+30 minit buffer untuk urusan penutupan)
// Aktiviti yang melepasi had ini dipotong automatik pada 17:30 untuk rekod yang adil
export const WAKTU_OPERASI = {
  START_HOUR: 8,
  START_MINUTE: 0,
  END_HOUR: 17,
  END_MINUTE: 30,
} as const;

// Waktu sesi kehadiran (auto-close)
// PAGI: 8:00 pagi - 1:00 petang | PETANG: 1:00 petang - 5:00 petang
// Punch selepas waktu tutup sesi ditolak (sesi auto-close)
export const WAKTU_SESI = {
  PAGI: { START_HOUR: 8, START_MINUTE: 0, END_HOUR: 13, END_MINUTE: 0 },
  PETANG: { START_HOUR: 13, START_MINUTE: 0, END_HOUR: 17, END_MINUTE: 0 },
} as const;

// Had maksimum durasi bantuan: 2 jam (bantuan biasa 3 minit - 1 jam;
// 2 jam cukup untuk program/aktiviti luar biasa). Lebih dari ini = terlupa tamatkan.
export const MAX_BANTUAN_DURASI_MIN = 120;

// Nota sistem untuk rekod yang dipotong automatik
export const NOTA_POTONG_WAKTU =
  '[SISTEM: Aktiviti melepasi waktu operasi kaunter - masa dipotong automatik kepada 17:30]';

// Nota sistem untuk rekod yang dipotong kerana melebihi had maksimum
export const NOTA_POTONG_MAKS =
  '[SISTEM: Aktiviti melebihi had maksimum 2 jam - masa dipotong automatik untuk rekod yang adil]';

// ===== TUGASAN LUAR (selain kaunter) =====
// Tugasan luar: ops kesan, pameran, taklimat PERKESO, program luar, dll.
// Berlaku dari pagi hingga malam (~8 malam) - had berbeza dari bantuan kaunter

// Waktu had tugasan luar: 8:00 malam (20:00)
export const WAKTU_TUGASAN = {
  END_HOUR: 20,
  END_MINUTE: 0,
} as const;

// Had maksimum tugasan luar: 12 jam (keselamatan - elak rekod mustahil)
export const MAX_TUGASAN_DURASI_MIN = 12 * 60;

// Nota sistem untuk tugasan yang dipotong automatik
export const NOTA_POTONG_TUGASAN_WAKTU =
  '[SISTEM: Tugasan melepasi had 8 malam - masa dipotong automatik kepada 20:00]';

export const NOTA_POTONG_TUGASAN_MAKS =
  '[SISTEM: Tugasan melebihi had maksimum 12 jam - masa dipotong automatik untuk rekod yang adil]';

// Kategori tugasan luar
export const KATEGORI_TUGASAN_PILIHAN = [
  'Ops Kesan / Siasatan',
  'Pameran / Program Luar',
  'Taklimat / Program PERKESO',
  'Gotong Royong / Kerja Am',
  'Kursus / Latihan',
  'Lain-lain',
] as const;
export type KategoriTugasanType = (typeof KATEGORI_TUGASAN_PILIHAN)[number];