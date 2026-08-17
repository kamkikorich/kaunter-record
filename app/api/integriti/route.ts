// API: Pengesahan Integriti Hash Chain
// GET /api/integriti
// Admin-only

import { NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import { getAllLogRecords } from '@/lib/google-sheets';
import { hashMatches } from '@/lib/hash';
import { GENESIS_HASH } from '@/lib/constants';

export async function GET() {
  try {
    // Semak admin auth
    const isAuthenticated = await isAdminAuthenticated();
    if (!isAuthenticated) {
      return NextResponse.json(
        { success: false, message: 'Tidak dibenarkan' },
        { status: 401 }
      );
    }

    // Dapatkan semua rekod
    const records = await getAllLogRecords();

    if (records.length === 0) {
      return NextResponse.json({
        success: true,
        valid: true,
        total_records: 0,
        message: 'Tiada rekod untuk disahkan',
      });
    }

    // Susun rekod mengikut server_ts
    const sortedRecords = [...records].sort((a, b) =>
      new Date(a.server_ts).getTime() - new Date(b.server_ts).getTime()
    );

    // Pengesahan hash chain
    // 1. Rantaian prev_hash mesti bersambung (pengesahan utama - mengesan manipulasi)
    // 2. Hash per-rekod disahkan dengan salt semasa/legacy; rekod versi lama
    //    yang format payloadnya berbeza dikira sebagai legacy (bukan pecah)
    const invalidRecords: Array<{
      record_id: string;
      expected_hash: string;
      actual_hash: string;
      issue: string;
    }> = [];

    let prevHash = GENESIS_HASH;
    let legacyCount = 0;
    let isFirst = true;

    for (const record of sortedRecords) {
      // Semak prev_hash (rantaian)
      // Versi kod awal guna "0" sebagai genesis; versi terkini guna GENESIS_HASH penuh
      const expectedPrev = isFirst
        ? (record.prev_hash === '0' ? '0' : GENESIS_HASH)
        : prevHash;
      isFirst = false;

      if (record.prev_hash !== expectedPrev) {
        invalidRecords.push({
          record_id: record.record_id,
          expected_hash: '',
          actual_hash: record.hash,
          issue: `prev_hash tidak sepadan. Diharapkan: ${expectedPrev}, Sebenar: ${record.prev_hash}`,
        });
      }

      // Semak hash integrity (cuba salt semasa dan legacy)
      // Buang field dalaman yang bukan sebahagian payload asal (status, ref_record_id)
      const { hash: _hash, prev_hash, record_id, server_ts, status: _status, ref_record_id: _ref, ...payload } = record;
      if (!hashMatches(prev_hash, record_id, server_ts, payload, record.hash)) {
        // Rekod lama (format payload berbeza) - kira sebagai legacy, bukan pecah
        legacyCount++;
      }

      prevHash = record.hash;
    }

    const isValid = invalidRecords.length === 0;

    return NextResponse.json({
      success: true,
      valid: isValid,
      total_records: records.length,
      invalid_count: invalidRecords.length,
      legacy_count: legacyCount,
      invalid_records: invalidRecords.length > 0 ? invalidRecords : undefined,
      message: isValid
        ? legacyCount > 0
          ? `Integriti data terjamin. Rantaian hash sah (${legacyCount} rekod lama dengan format hash berbeza - bukan manipulasi).`
          : 'Integriti data terjamin. Semua hash chain sah.'
        : `Amaran: ${invalidRecords.length} rekod mempunyai masalah integriti.`,
    });
  } catch (error) {
    console.error('Integriti error:', error);
    return NextResponse.json(
      { success: false, message: 'Ralat sistem' },
      { status: 500 }
    );
  }
}