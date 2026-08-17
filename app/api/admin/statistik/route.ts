// API: Statistik Individu untuk Admin Dashboard
// GET /api/admin/statistik
// Admin-only

import { NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import { getAllAnggota, getAllLogRecords } from '@/lib/google-sheets';

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

    // Dapatkan semua anggota
    const anggotaList = await getAllAnggota();

    // Dapatkan semua rekod LOG
    const records = await getAllLogRecords();

    // Kira statistik untuk setiap anggota
    const statistik = anggotaList.map((anggota) => {
      let jumlahKehadiran = 0;
      let hadirPagi = 0;
      let hadirPetang = 0;
      let jumlahBantuan = 0;
      let totalDurasiMin = 0;
      let jumlahTugasan = 0;
      let totalDurasiTugasanMin = 0;

      for (const record of records) {
        if (record.anggota_id !== anggota.anggota_id || record.status !== 'AKTIF') {
          continue;
        }

        if (record.jenis === 'KEHADIRAN') {
          jumlahKehadiran++;
          if (record.sesi === 'PAGI') hadirPagi++;
          else if (record.sesi === 'PETANG') hadirPetang++;
        } else if (record.jenis === 'BANTUAN_END') {
          jumlahBantuan++;
          totalDurasiMin += record.durasi_min || 0;
        } else if (record.jenis === 'TUGASAN_END') {
          jumlahTugasan++;
          totalDurasiTugasanMin += record.durasi_min || 0;
        }
      }

      return {
        anggota_id: anggota.anggota_id,
        nama: anggota.nama,
        gred: anggota.gred,
        jumlah_kehadiran: jumlahKehadiran,
        hadir_pagi: hadirPagi,
        hadir_petang: hadirPetang,
        jumlah_bantuan: jumlahBantuan,
        total_durasi_min: totalDurasiMin,
        jumlah_tugasan: jumlahTugasan,
        total_durasi_tugasan_min: totalDurasiTugasanMin,
      };
    });

    // Susun mengikut nama
    statistik.sort((a, b) => a.nama.localeCompare(b.nama));

    return NextResponse.json({
      success: true,
      data: statistik,
    });
  } catch (error) {
    console.error('Statistik error:', error);
    return NextResponse.json(
      { success: false, message: 'Ralat sistem' },
      { status: 500 }
    );
  }
}