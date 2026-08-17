// API: Rekod Tugasan Luar
// POST /api/tugasan
// Action: START atau END
// Tugasan luar: ops kesan, pameran, taklimat PERKESO, program luar, dll.
// Had masa: potong automatik pada 8 malam (20:00) atau had maksimum 12 jam

import { NextRequest, NextResponse } from 'next/server';
import {
  findAnggotaById,
  appendTugasanStartRecord,
  appendTugasanEndRecord,
  getTugasanAktif,
} from '@/lib/google-sheets';
import { validateAnggotaId, validateRemark, validateBantuanAction, sanitizeString } from '@/lib/validators';
import { KATEGORI_TUGASAN_PILIHAN } from '@/lib/constants';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { anggota_id, remark, action, kategori } = body;

    // Sanitasi input
    anggota_id = sanitizeString(anggota_id || '');
    remark = sanitizeString(remark || '');
    kategori = sanitizeString(kategori || '');
    action = (action || '').toUpperCase().trim();

    // Validasi input
    const anggotaValidation = validateAnggotaId(anggota_id);
    if (!anggotaValidation.valid) {
      return NextResponse.json(
        { success: false, message: anggotaValidation.error },
        { status: 400 }
      );
    }

    const actionValidation = validateBantuanAction(action);
    if (!actionValidation.valid) {
      return NextResponse.json(
        { success: false, message: actionValidation.error },
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

    if (action === 'START') {
      // Validasi remark
      const remarkValidation = validateRemark(remark);
      if (!remarkValidation.valid) {
        return NextResponse.json(
          { success: false, message: remarkValidation.error },
          { status: 400 }
        );
      }

      // Validasi kategori wajib
      if (!kategori) {
        return NextResponse.json(
          { success: false, message: 'Kategori tugasan mesti dipilih' },
          { status: 400 }
        );
      }
      if (!KATEGORI_TUGASAN_PILIHAN.includes(kategori as (typeof KATEGORI_TUGASAN_PILIHAN)[number])) {
        return NextResponse.json(
          { success: false, message: 'Kategori tugasan tidak sah' },
          { status: 400 }
        );
      }

      // Semak jika sudah ada tugasan aktif
      const existingActive = await getTugasanAktif(anggota_id);
      if (existingActive) {
        return NextResponse.json(
          { success: false, message: '⚠️ Anda sudah mempunyai satu tugasan luar sedang berjalan. Sila tamatkan tugasan tersebut dahulu sebelum memulakan yang baru.' },
          { status: 409 }
        );
      }

      // Mula tugasan
      const result = await appendTugasanStartRecord(anggota, remark, kategori);

      return NextResponse.json({
        success: true,
        message: '✅ Tugasan luar berjaya dimulakan! Masa mula direkodkan.',
        data: {
          record_id: result.recordId,
        },
      });
    } else {
      // END action
      const activeTugasan = await getTugasanAktif(anggota_id);
      if (!activeTugasan) {
        return NextResponse.json(
          { success: false, message: 'Tiada tugasan aktif untuk ditamatkan' },
          { status: 404 }
        );
      }

      // Tamat tugasan
      const result = await appendTugasanEndRecord(anggota, activeTugasan);

      if (result.warning) {
        return NextResponse.json({
          success: true,
          message: '✅ Tugasan luar berjaya ditamatkan dengan nota penting',
          data: {
            record_id: result.recordId,
            duration_min: result.durationMin,
            warning_msg: result.warning,
          },
        });
      }

      return NextResponse.json({
        success: true,
        message: '✅ Tugasan luar berjaya ditamatkan dan direkodkan!',
        data: {
          record_id: result.recordId,
          duration_min: result.durationMin,
        },
      });
    }
  } catch (error) {
    console.error('Tugasan error:', error);
    return NextResponse.json(
      { success: false, message: 'Ralat sistem' },
      { status: 500 }
    );
  }
}
