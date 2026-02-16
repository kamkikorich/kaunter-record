// Sistem Rekod Kehadiran & Bantuan Kaunter
// Jenis TypeScript

import type { SesiType, JenisRekodType, StatusRekodType } from './constants';

// Data anggota dari sheet ANGGOTA
export interface Anggota {
  anggota_id: string;
  nama: string;
  gred: string;
  pin_hash: string;
  status: 'AKTIF' | 'TIDAK_AKTIF';
}

// Rekod LOG
export interface LogRecord {
  record_id: string;
  server_ts: string;
  jenis: JenisRekodType;
  tarikh: string;
  sesi?: SesiType;
  anggota_id: string;
  nama: string;
  gred: string;
  remark?: string;
  bantuan_start?: string;
  bantuan_end?: string;
  durasi_min?: number;
  prev_hash: string;
  hash: string;
  status: StatusRekodType;
  ref_record_id?: string;
}

// Request untuk kehadiran
export interface KehadiranRequest {
  anggota_id: string;
  sesi: SesiType;
}

// Request untuk bantuan
export interface BantuanRequest {
  anggota_id: string;
  remark: string;
  action: 'START' | 'END';
}

// Response API standard
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

// Response PIN validation
export interface PinValidationResponse {
  valid: boolean;
  nama?: string;
  gred?: string;
  anggota_id?: string;
}

// Bantuan aktif
export interface BantuanAktif {
  record_id: string;
  anggota_id: string;
  nama: string;
  bantuan_start: string;
  remark: string;
}

// Statistik individu
export interface StatistikIndividu {
  anggota_id: string;
  nama: string;
  gred: string;
  jumlah_kehadiran: number;
  jumlah_bantuan: number;
  jumlah_durasi_min: number;
}

// Keputusan integriti hash
export interface IntegritiResult {
  valid: boolean;
  total_records: number;
  invalid_records: Array<{
    record_id: string;
    expected_hash: string;
    actual_hash: string;
  }>;
}

// Session admin
export interface AdminSession {
  isAuthenticated: boolean;
}