// API: Rekod Kehadiran
// POST /api/kehadiran
// Satu rekod per sesi per hari per anggota

import { NextRequest, NextResponse } from 'next/server';
import { findAnggotaById, appendKehadiranRecord, checkKehadiranExists } from '@/lib/google-sheets';
import { getCurrentDate } from '@/lib/hash';
import { validateAnggotaId, validateSesi, sanitizeString } from '@/lib/validators';
import type { SesiType } from '@/lib/constants';
import { WAKTU_SESI } from '@/lib/constants';

// Dapatkan waktu semasa dalam zon waktu Malaysia (GMT+8)
function getTimeInKL(): { hour: number; minute: number } {
  const now = new Date();
  const kl = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kuala_Lumpur' }));
  return { hour: kl.getHours(), minute: kl.getMinutes() };
}

// Semak sama ada sesi masih dibuka (auto-close)
function isSesiOpen(sesi: string): { open: boolean; message?: string } {
  const { hour, minute } = getTimeInKL();
  const waktu = WAKTU_SESI[sesi as keyof typeof WAKTU_SESI];
  if (!waktu) return { open: true };

  const nowMinutes = hour * 60 + minute;
  const endMinutes = waktu.END_HOUR * 60 + waktu.END_MINUTE;

  if (nowMinutes > endMinutes) {
    const endLabel = sesi === 'PAGI' ? '1:00 petang' : '5:00 petang';
    return {
      open: false,
      message: `⏰ Sesi ${sesi} telah ditutup pada ${endLabel}. Sila rekod pada sesi yang betul.`,
    };
  }

  return { open: true };
}

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

    // Auto-close sesi: tolak punch selepas waktu tutup sesi
    const sesiStatus = isSesiOpen(sesi);
    if (!sesiStatus.open) {
      return NextResponse.json(
        { success: false, message: sesiStatus.message },
        { status: 400 }
      );
    }

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