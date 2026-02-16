// API: Pengesahan Integriti Hash Chain
// GET /api/integriti
// Admin-only

import { NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import { getAllLogRecords } from '@/lib/google-sheets';
import { generateRecordHash } from '@/lib/hash';
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
    const invalidRecords: Array<{
      record_id: string;
      expected_hash: string;
      actual_hash: string;
      issue: string;
    }> = [];

    let prevHash = GENESIS_HASH;

    for (const record of sortedRecords) {
      // Semak prev_hash
      if (record.prev_hash !== prevHash) {
        invalidRecords.push({
          record_id: record.record_id,
          expected_hash: '',
          actual_hash: record.hash,
          issue: `prev_hash tidak sepadan. Diharapkan: ${prevHash}, Sebenar: ${record.prev_hash}`,
        });
      }

      // Semak hash integrity
      const { hash, prev_hash, record_id, server_ts, ...payload } = record;
      const computedHash = generateRecordHash(prev_hash, record_id, server_ts, payload);

      if (record.hash !== computedHash) {
        invalidRecords.push({
          record_id: record.record_id,
          expected_hash: computedHash,
          actual_hash: record.hash,
          issue: 'Hash tidak sepadan dengan kandungan rekod',
        });
      }

      prevHash = record.hash;
    }

    const isValid = invalidRecords.length === 0;

    return NextResponse.json({
      success: true,
      valid: isValid,
      total_records: records.length,
      invalid_count: invalidRecords.length,
      invalid_records: invalidRecords.length > 0 ? invalidRecords : undefined,
      message: isValid
        ? 'Integriti data terjamin. Semua hash chain sah.'
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