// Sistem Rekod Kehadiran & Bantuan Kaunter
// Pengesahan Input

import { VALIDATION_RULES, SESI, type SesiType } from './constants';

/**
 * Validasi sesi
 */
export function validateSesi(sesi: string): { valid: boolean; error?: string } {
  if (!sesi) {
    return { valid: false, error: 'Sesi diperlukan' };
  }

  if (!SESI.includes(sesi as SesiType)) {
    return { valid: false, error: 'Sesi mesti PAGI atau PETANG' };
  }

  return { valid: true };
}

/**
 * Validasi remark bantuan
 * Mesti sekurang-kurangnya 20 aksara
 */
export function validateRemark(remark: string): { valid: boolean; error?: string } {
  if (!remark || remark.trim().length === 0) {
    return { valid: false, error: '📝 Keterangan aktiviti diperlukan untuk dokumentasi yang lengkap' };
  }

  if (remark.trim().length < VALIDATION_RULES.MIN_REMARK_LENGTH) {
    return { 
      valid: false, 
      error: `📝 Keterangan terlalu pendek. Sila berikan butiran yang lebih terperinci (sekurang-kurangnya ${VALIDATION_RULES.MIN_REMARK_LENGTH} aksara)` 
    };
  }

  return { valid: true };
}

/**
 * Validasi durasi bantuan
 * Mesti sekurang-kurangnya 3 minit
 */
export function validateBantuanDuration(durationMin: number): { valid: boolean; error?: string } {
  if (durationMin < VALIDATION_RULES.MIN_BANTUAN_DURATION_MIN) {
    return { 
      valid: false, 
      error: `⏱️ Aktiviti terlalu singkat! Durasi minimum yang disyorkan adalah ${VALIDATION_RULES.MIN_BANTUAN_DURATION_MIN} minit untuk memastikan sumbangan bermakna direkodkan.` 
    };
  }

  return { valid: true };
}

/**
 * Validasi anggota_id
 */
export function validateAnggotaId(anggotaId: string): { valid: boolean; error?: string } {
  if (!anggotaId || anggotaId.trim().length === 0) {
    return { valid: false, error: 'ID anggota diperlukan' };
  }

  return { valid: true };
}

/**
 * Validasi action untuk bantuan
 */
export function validateBantuanAction(action: string): { valid: boolean; error?: string } {
  if (!action) {
    return { valid: false, error: 'Action diperlukan' };
  }

  if (action !== 'START' && action !== 'END') {
    return { valid: false, error: 'Action mesti START atau END' };
  }

  return { valid: true };
}

/**
 * Sanitasi input string
 * Buang whitespace berlebihan dan aksara bahaya
 */
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Buang < dan >
    .replace(/\s+/g, ' '); // Ganti multiple spaces dengan single space
}

/**
 * Validasi tarikh format YYYY-MM-DD
 */
export function validateDateFormat(dateStr: string): { valid: boolean; error?: string } {
  const regex = /^\d{4}-\d{2}-\d{2}$/;

  if (!regex.test(dateStr)) {
    return { valid: false, error: 'Format tarikh tidak sah (YYYY-MM-DD)' };
  }

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return { valid: false, error: 'Tarikh tidak sah' };
  }

  return { valid: true };
}

/**
 * Validasi password admin
 */
export function validateAdminPassword(password: string): { valid: boolean; error?: string } {
  if (!password) {
    return { valid: false, error: 'Kata laluan diperlukan' };
  }

  if (password.length < 8) {
    return { valid: false, error: 'Kata laluan mesti sekurang-kurangnya 8 aksara' };
  }

  return { valid: true };
}