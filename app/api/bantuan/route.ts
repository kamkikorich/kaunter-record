// API: Rekod Bantuan
// POST /api/bantuan
// Action: START atau END

import { NextRequest, NextResponse } from 'next/server';
import {
  findAnggotaById,
  appendBantuanStartRecord,
  appendBantuanEndRecord,
  getBantuanAktif,
} from '@/lib/google-sheets';
import { validateBantuanDuration } from '@/lib/validators';
import { validateAnggotaId, validateRemark, validateBantuanAction, sanitizeString } from '@/lib/validators';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { anggota_id, remark, action, lokasi, kategori, sub_kategori } = body;

    // Sanitasi input
    anggota_id = sanitizeString(anggota_id || '');
    remark = sanitizeString(remark || '');
    lokasi = sanitizeString(lokasi || '');
    kategori = sanitizeString(kategori || '');
    sub_kategori = sanitizeString(sub_kategori || '');
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

      // Validasi lokasi dan kategori wajib
      if (!lokasi) {
        return NextResponse.json(
          { success: false, message: 'Lokasi mesti dipilih' },
          { status: 400 }
        );
      }
      if (!kategori) {
        return NextResponse.json(
          { success: false, message: 'Kategori aktiviti mesti dipilih' },
          { status: 400 }
        );
      }
      if (kategori === 'Pendaftaran' && !sub_kategori) {
        return NextResponse.json(
          { success: false, message: 'Jenis pendaftaran mesti dipilih' },
          { status: 400 }
        );
      }

      // Semak jika sudah ada bantuan aktif
      const existingActive = await getBantuanAktif(anggota_id);
      if (existingActive) {
        return NextResponse.json(
          { success: false, message: '⚠️ Anda sudah mempunyai satu aktiviti sedang berjalan. Sila tamatkan aktiviti tersebut dahulu sebelum memulakan yang baru.' },
          { status: 409 }
        );
      }

      // Mula bantuan dengan lokasi, kategori, sub_kategori
      const result = await appendBantuanStartRecord(anggota, remark, lokasi, kategori, sub_kategori);

      return NextResponse.json({
        success: true,
        message: '✅ Aktiviti/bantuan berjaya dimulakan! Masa mula direkodkan.',
        data: {
          record_id: result.recordId,
        },
      });
    } else {
      // END action
      // Semak bantuan aktif
      const activeBantuan = await getBantuanAktif(anggota_id);
      if (!activeBantuan) {
        return NextResponse.json(
          { success: false, message: 'Tiada aktiviti aktif untuk ditamatkan' },
          { status: 404 }
        );
      }

      // Tamat bantuan
      const result = await appendBantuanEndRecord(anggota, activeBantuan);

      // Semak jika terdapat amaran dari backend (contohnya potong masa 12 malam)
      if (result.warning) {
        return NextResponse.json({
          success: true,
          message: '✅ Aktiviti/bantuan berjaya ditamatkan dengan nota penting',
          data: {
            record_id: result.recordId,
            duration_min: result.durationMin,
            warning_msg: result.warning,
          },
        });
      }

      // Validasi durasi minimum
      const durationValidation = validateBantuanDuration(result.durationMin);
      if (!durationValidation.valid) {
        // Masih rekodkan, tapi beri amaran yang lebih mesra
        return NextResponse.json({
          success: true,
          message: `✅ Aktiviti/bantuan berjaya ditamatkan. ${durationValidation.error}`,
          data: {
            record_id: result.recordId,
            duration_min: result.durationMin,
            warning_msg: durationValidation.error,
          },
        });
      }

      return NextResponse.json({
        success: true,
        message: '✅ Aktiviti/bantuan berjaya ditamatkan dan direkodkan!',
        data: {
          record_id: result.recordId,
          duration_min: result.durationMin,
        },
      });
    }
  } catch (error) {
    console.error('Bantuan error:', error);
    return NextResponse.json(
      { success: false, message: 'Ralat sistem' },
      { status: 500 }
    );
  }
}