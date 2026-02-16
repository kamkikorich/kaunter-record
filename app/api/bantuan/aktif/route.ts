// API: Semak Bantuan Aktif
// GET /api/bantuan/aktif?anggota_id=xxx

import { NextRequest, NextResponse } from 'next/server';
import { getBantuanAktif } from '@/lib/google-sheets';
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

    // Semak bantuan aktif
    const activeBantuan = await getBantuanAktif(anggota_id);

    if (!activeBantuan) {
      return NextResponse.json({
        success: true,
        active: false,
        message: 'Tiada bantuan aktif',
      });
    }

    return NextResponse.json({
      success: true,
      active: true,
      data: {
        record_id: activeBantuan.record_id,
        anggota_id: activeBantuan.anggota_id,
        nama: activeBantuan.nama,
        bantuan_start: activeBantuan.bantuan_start,
        remark: activeBantuan.remark,
      },
    });
  } catch (error) {
    console.error('Bantuan aktif error:', error);
    return NextResponse.json(
      { success: false, message: 'Ralat sistem' },
      { status: 500 }
    );
  }
}