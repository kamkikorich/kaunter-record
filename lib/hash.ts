// Sistem Rekod Kehadiran & Bantuan Kaunter
// Utiliti Hash SHA256

import { createHash } from 'crypto';

// Salt lama yang digunakan sebelum HASH_SALT diperkenalkan dalam .env
// Rekod lama (Feb-Jun 2026) di-hash dengan salt ini - dikekalkan untuk
// backward compatibility supaya rantaian hash kekal sah
const LEGACY_HASH_SALT = 'PerkesoSecureSalt2026';

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
 * Bina payload untuk pengesahan hash dengan ORDER KEY yang sama seperti
 * fungsi append asal (JSON.stringify sensitif pada order key).
 * Order berbeza = hash berbeza walaupun kandungan sama.
 */
export function buildHashPayload(record: Record<string, unknown>): Record<string, unknown> {
  const jenis = record.jenis as string;
  const tarikh = record.tarikh as string | undefined;
  const sesi = record.sesi as string | undefined;
  const anggota_id = record.anggota_id as string | undefined;
  const nama = record.nama as string | undefined;
  const gred = record.gred as string | undefined;
  const remark = record.remark as string | undefined;
  const lokasi = record.lokasi as string | undefined;
  const kategori = record.kategori as string | undefined;
  const sub_kategori = record.sub_kategori as string | undefined;
  const bantuan_start = record.bantuan_start as string | undefined;
  const bantuan_end = record.bantuan_end as string | undefined;
  const durasi_min = record.durasi_min as number | undefined;

  if (jenis === 'KEHADIRAN') {
    return { jenis, tarikh, sesi, anggota_id, nama, gred };
  }

  if (jenis === 'BANTUAN_START') {
    return { jenis, tarikh, anggota_id, nama, gred, remark, lokasi, kategori, sub_kategori, bantuan_start };
  }

  if (jenis === 'TUGASAN_START') {
    return { jenis, tarikh, anggota_id, nama, gred, remark, kategori, bantuan_start };
  }

  if (jenis === 'TUGASAN_END') {
    return { jenis, tarikh, anggota_id, nama, gred, remark, kategori, bantuan_start, bantuan_end, durasi_min };
  }

  // BANTUAN_END (dan lain-lain)
  return { jenis, tarikh, anggota_id, nama, gred, remark, lokasi, kategori, sub_kategori, bantuan_start, bantuan_end, durasi_min };
}

/**
 * Semak sama ada hash rekod sepadan dengan mana-mana salt yang diketahui
 * (salt semasa atau legacy) - untuk backward compatibility
 */
export function hashMatches(
  prevHash: string,
  recordId: string,
  serverTs: string,
  record: Record<string, unknown>,
  storedHash: string
): boolean {
  const payloadJson = JSON.stringify(buildHashPayload(record));
  const dataToHash = prevHash + recordId + serverTs + payloadJson;

  const currentSalt = process.env.HASH_SALT || 'default-salt-change-in-production';
  if (sha256(dataToHash + currentSalt) === storedHash) {
    return true;
  }

  // Cuba salt legacy untuk rekod lama
  if (sha256(dataToHash + LEGACY_HASH_SALT) === storedHash) {
    return true;
  }

  return false;
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
 * Ambil tarikh semasa dalam format YYYY-MM-DD mengikut zon waktu Malaysia (GMT+8)
 */
export function getCurrentDate(): string {
  // Menggunakan locale 'sv-SE' (Swedish) yang mengembalikan format ISO YYYY-MM-DD dengan zon waktu Malaysia
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Kuala_Lumpur' });
}

/**
 * Pengesahan rantaian hash
 * 1. Rantaian prev_hash mesti bersambung (pengesahan utama - mengesan manipulasi)
 * 2. Hash per-rekod disahkan dengan salt semasa/legacy; rekod versi lama yang
 *    format payloadnya berbeza dilaporkan sebagai legacy (bukan pecah)
 */
export function verifyHashChain(records: Array<{
  record_id: string;
  server_ts: string;
  hash: string;
  prev_hash: string;
  [key: string]: unknown;
}>): { valid: boolean; brokenAtIndex: number | null; legacyCount: number } {
  if (records.length === 0) {
    return { valid: true, brokenAtIndex: null, legacyCount: 0 };
  }

  // Rantaian hash mengikut urutan server_ts (bukan urutan sheet)
  const sorted = [...records].sort(
    (a, b) => new Date(a.server_ts).getTime() - new Date(b.server_ts).getTime()
  );

  let legacyCount = 0;

  for (let i = 0; i < sorted.length; i++) {
    const record = sorted[i];
    // Versi kod awal guna "0" sebagai genesis; versi terkini guna GENESIS_HASH penuh
    const expectedPrevHash = i === 0
      ? (record.prev_hash === '0' ? '0' : '0000000000000000000000000000000000000000000000000000000000000000')
      : sorted[i - 1].hash;

    if (record.prev_hash !== expectedPrevHash) {
      return { valid: false, brokenAtIndex: i, legacyCount };
    }

    // Verify hash integrity (cuba salt semasa dan legacy)
    // Buang field dalaman yang bukan sebahagian payload asal (status, ref_record_id)
    const { hash: _hash, prev_hash, record_id, server_ts, status: _status, ref_record_id: _ref, ...payload } = record;
    if (!hashMatches(prev_hash, record_id, server_ts, payload, record.hash)) {
      // Rekod lama (format payload berbeza) - kira sebagai legacy, bukan pecah
      legacyCount++;
    }
  }

  return { valid: true, brokenAtIndex: null, legacyCount };
}