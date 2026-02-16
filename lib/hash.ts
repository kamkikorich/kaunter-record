// Sistem Rekod Kehadiran & Bantuan Kaunter
// Utiliti Hash SHA256

import { createHash } from 'crypto';

/**
 * Jana hash SHA256
 */
export function sha256(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Jana hash untuk rekod LOG
 * Formula: SHA256(prev_hash + record_id + server_ts + payload_json + HASH_SALT)
 */
export function generateRecordHash(
  prevHash: string,
  recordId: string,
  serverTs: string,
  payload: Record<string, unknown>
): string {
  const salt = process.env.HASH_SALT || 'default-salt-change-in-production';
  const payloadJson = JSON.stringify(payload);
  const dataToHash = prevHash + recordId + serverTs + payloadJson + salt;
  return sha256(dataToHash);
}

/**
 * Jana UUID untuk record_id
 */
export function generateRecordId(): string {
  return crypto.randomUUID();
}

/**
 * Jana timestamp server dalam format ISO
 */
export function getServerTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Ambil tarikh semasa dalam format YYYY-MM-DD
 */
export function getCurrentDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Pengesahan rantaian hash
 * Memastikan setiap rekod mempunyai hash yang betul dan prev_hash yang sepadan
 */
export function verifyHashChain(records: Array<{
  record_id: string;
  server_ts: string;
  hash: string;
  prev_hash: string;
  [key: string]: unknown;
}>): { valid: boolean; brokenAtIndex: number | null } {
  if (records.length === 0) {
    return { valid: true, brokenAtIndex: null };
  }

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const expectedPrevHash = i === 0 ? '0000000000000000000000000000000000000000000000000000000000000000' : records[i - 1].hash;

    if (record.prev_hash !== expectedPrevHash) {
      return { valid: false, brokenAtIndex: i };
    }

    // Verify hash integrity
    const { hash, prev_hash, record_id, server_ts, ...payload } = record;
    const computedHash = generateRecordHash(prev_hash, record_id, server_ts, payload);

    if (record.hash !== computedHash) {
      return { valid: false, brokenAtIndex: i };
    }
  }

  return { valid: true, brokenAtIndex: null };
}