// Sistem Rekod Kehadiran & Bantuan Kaunter
// Pemalar Sistem

export const SESI = ['PAGI', 'PETANG'] as const;
export type SesiType = (typeof SESI)[number];

export const JENIS_REKOD = ['KEHADIRAN', 'BANTUAN_START', 'BANTUAN_END', 'CORRECTION'] as const;
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