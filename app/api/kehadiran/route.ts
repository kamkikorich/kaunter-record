// API: Rekod Kehadiran
// POST /api/kehadiran
// Satu rekod per sesi per hari per anggota

import { NextRequest, NextResponse } from 'next/server';
import { findAnggotaById, appendKehadiranRecord, checkKehadiranExists } from '@/lib/google-sheets';
import { getCurrentDate } from '@/lib/hash';
import { validateAnggotaId, validateSesi, sanitizeString } from '@/lib/validators';
import type { SesiType } from '@/lib/constants';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { anggota_id, sesi } = body;

    // Sanitasi input
    anggota_id = sanitizeString(anggota_id || '');
    sesi = (sesi || '').toUpperCase().trim();

    // Validasi input
    const anggotaValidation = validateAnggotaId(anggota_id);
    if (!anggotaValidation.valid) {
      return NextResponse.json(
        { success: false, message: anggotaValidation.error },
        { status: 400 }
      );
    }

    const sesiValidation = validateSesi(sesi);
    if (!sesiValidation.valid) {
      return NextResponse.json(
        { success: false, message: sesiValidation.error },
        { status: 400 }
      );
    }

    // Cari anggota
    const anggota = await findAnggotaById(anggota_id);
    if (!anggota) {
      return NextResponse.json(
        { success: false, message: 'ID anggota tidak dijumpai' },
        { status: 404 }
      );
    }

    // Semak tarikh semasa (server-side)
    const tarikh = getCurrentDate();

    // Semak jika kehadiran sudah wujud
    const exists = await checkKehadiranExists(anggota_id, tarikh, sesi);
    if (exists) {
      return NextResponse.json(
        { success: false, message: `ℹ️ Kehadiran untuk sesi ${sesi} telah pun direkodkan pada hari ini. Setiap sesi hanya boleh direkod sekali sahaja.` },
        { status: 409 }
      );
    }

    // Rekod kehadiran
    const result = await appendKehadiranRecord(anggota, sesi as SesiType);

    return NextResponse.json({
      success: true,
      message: '✅ Kehadiran berjaya direkodkan! Terima kasih kerana hadir bertugas.',
      data: {
        record_id: result.recordId,
        tarikh,
        sesi,
        nama: anggota.nama,
      },
    });
  } catch (error) {
    console.error('Kehadiran error:', error);
    return NextResponse.json(
      { success: false, message: 'Ralat sistem' },
      { status: 500 }
    );
  }
}