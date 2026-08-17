// API: Semak Tugasan Luar Aktif
// GET /api/tugasan/aktif?anggota_id=xxx

import { NextRequest, NextResponse } from 'next/server';
import { getTugasanAktif } from '@/lib/google-sheets';
import { validateAnggotaId, sanitizeString } from '@/lib/validators';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let anggota_id = searchParams.get('anggota_id') || '';

    // Sanitasi input
    anggota_id = sanitizeString(anggota_id);

    // Validasi input
    const validation = validateAnggotaId(anggota_id);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, message: validation.error },
        { status: 400 }
      );
    }

    // Semak tugasan aktif
    const activeTugasan = await getTugasanAktif(anggota_id);

    if (!activeTugasan) {
      return NextResponse.json({
        success: true,
        active: false,
        message: 'Tiada tugasan aktif',
      });
    }

    return NextResponse.json({
      success: true,
      active: true,
      data: {
        record_id: activeTugasan.record_id,
        anggota_id: activeTugasan.anggota_id,
        nama: activeTugasan.nama,
        bantuan_start: activeTugasan.bantuan_start,
        remark: activeTugasan.remark,
        kategori: activeTugasan.kategori,
      },
    });
  } catch (error) {
    console.error('Tugasan aktif error:', error);
    return NextResponse.json(
      { success: false, message: 'Ralat sistem' },
      { status: 500 }
    );
  }
}
