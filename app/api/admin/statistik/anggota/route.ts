// API: Rekod Penuh Anggota (Drill-down untuk Admin)
// GET /api/admin/statistik/anggota?anggota_id=xxx
// Admin-only
// Pulangkan senarai rekod penuh anggota (kehadiran, bantuan, tugasan)
// supaya admin boleh semak dari mana setiap nombor statistik datang

import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import { getAllLogRecords } from '@/lib/google-sheets';
import { validateAnggotaId, sanitizeString } from '@/lib/validators';

export async function GET(request: NextRequest) {
  try {
    // Semak admin auth
    const isAuthenticated = await isAdminAuthenticated();
    if (!isAuthenticated) {
      return NextResponse.json(
        { success: false, message: 'Tidak dibenarkan' },
        { status: 401 }
      );
    }

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

    // Dapatkan semua rekod
    const records = await getAllLogRecords();

    // Rekod anggota ini (AKTIF sahaja)
    const rekodAnggota = records
      .filter((r) => r.anggota_id === anggota_id && r.status === 'AKTIF')
      .sort((a, b) => new Date(a.server_ts).getTime() - new Date(b.server_ts).getTime())
      .map((r) => ({
        record_id: r.record_id,
        server_ts: r.server_ts,
        jenis: r.jenis,
        tarikh: r.tarikh,
        sesi: r.sesi || '',
        nama: r.nama,
        remark: r.remark || '',
        bantuan_start: r.bantuan_start || '',
        bantuan_end: r.bantuan_end || '',
        durasi_min: r.durasi_min || 0,
        lokasi: r.lokasi || '',
        kategori: r.kategori || '',
        sub_kategori: r.sub_kategori || '',
      }));

    // Ringkasan
    const kehadiran = rekodAnggota.filter((r) => r.jenis === 'KEHADIRAN');
    const bantuan = rekodAnggota.filter((r) => r.jenis === 'BANTUAN_END');
    const tugasan = rekodAnggota.filter((r) => r.jenis === 'TUGASAN_END');

    return NextResponse.json({
      success: true,
      data: {
        anggota_id,
        ringkasan: {
          jumlah_kehadiran: kehadiran.length,
          hadir_pagi: kehadiran.filter((r) => r.sesi === 'PAGI').length,
          hadir_petang: kehadiran.filter((r) => r.sesi === 'PETANG').length,
          jumlah_bantuan: bantuan.length,
          total_durasi_min: Math.round(bantuan.reduce((s, r) => s + r.durasi_min, 0) * 100) / 100,
          jumlah_tugasan: tugasan.length,
          total_durasi_tugasan_min: Math.round(tugasan.reduce((s, r) => s + r.durasi_min, 0) * 100) / 100,
        },
        rekod: rekodAnggota,
      },
    });
  } catch (error) {
    console.error('Rekod anggota error:', error);
    return NextResponse.json(
      { success: false, message: 'Ralat sistem' },
      { status: 500 }
    );
  }
}
