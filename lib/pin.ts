// Sistem Rekod Kehadiran & Bantuan Kaunter
// Utiliti PIN

import { sha256 } from './hash';

/**
 * Hash PIN menggunakan SHA256 dengan salt
 * PIN tidak boleh disimpan dalam plain text
 */
export function hashPin(pin: string): string {
  const salt = process.env.PIN_SALT || 'pin-salt-change-in-production';
  return sha256(pin + salt);
}

/**
 * Sahkan PIN dengan hash yang disimpan
 */
export function verifyPin(plainPin: string, storedHash: string): boolean {
  const computedHash = hashPin(plainPin);
  return computedHash === storedHash;
}

/**
 * Validasi format PIN
 * - Mesti 6 digit nombor
 */
export function validatePinFormat(pin: string): { valid: boolean; error?: string } {
  if (!pin) {
    return { valid: false, error: 'PIN diperlukan' };
  }

  if (pin.length !== 6) {
    return { valid: false, error: 'PIN mesti 6 digit' };
  }

  if (!/^\d{6}$/.test(pin)) {
    return { valid: false, error: 'PIN mesti mengandungi nombor sahaja' };
  }

  return { valid: true };
}