// API: Statistik Peribadi Anggota untuk Dashboard Anggota
// POST /api/anggota/statistik
// Auth: PIN anggota (server-side, sama pola /api/sahih-pin)
// Pulangkan statistik peribadi + ringkasan unit (tanpa ranking individu)

import { NextRequest, NextResponse } from 'next/server';
import { findAnggotaById, getAllAnggota, getAllLogRecords } from '@/lib/google-sheets';
import { verifyPin } from '@/lib/pin';
import { validateAnggotaId, sanitizeString } from '@/lib/validators';
import { validatePinFormat } from '@/lib/pin';

// Tarikh dalam zon waktu Malaysia (GMT+8)
function getDateInKL(d: Date): string {
  return d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Kuala_Lumpur' });
}

// Format YYYY-MM-DD pertama dalam bulan semasa (KL)
function getFirstOfMonthKL(): string {
  const now = new Date();
  const kl = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kuala_Lumpur' }));
  return `${kl.getFullYear()}-${String(kl.getMonth() + 1).padStart(2, '0')}-01`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { anggota_id, pin } = body;

    // Sanitasi input
    anggota_id = sanitizeString(anggota_id || '');
    pin = (pin || '').trim();

    // Validasi input
    const anggotaValidation = validateAnggotaId(anggota_id);
    if (!anggotaValidation.valid) {
      return NextResponse.json(
        { success: false, message: anggotaValidation.error },
        { status: 400 }
      );
    }

    const pinValidation = validatePinFormat(pin);
    if (!pinValidation.valid) {
      return NextResponse.json(
        { success: false, message: pinValidation.error },
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

    // Verify PIN (server-side sahaja)
    const isPinValid = verifyPin(pin, anggota.pin_hash);
    if (!isPinValid) {
      return NextResponse.json(
        { success: false, message: 'PIN tidak sah' },
        { status: 401 }
      );
    }

    // --- Kira statistik peribadi ---
    const records = await getAllLogRecords();
    const allAnggota = await getAllAnggota();

    const todayKL = getDateInKL(new Date());
    const firstOfMonth = getFirstOfMonthKL();

    const myActive = records.filter(
      (r) => r.anggota_id === anggota.anggota_id && r.status === 'AKTIF'
    );

    // Kehadiran bulan ini
    const hadirPagiBulan = myActive.filter(
      (r) => r.jenis === 'KEHADIRAN' && r.sesi === 'PAGI' && r.tarikh >= firstOfMonth
    ).length;
    const hadirPetangBulan = myActive.filter(
      (r) => r.jenis === 'KEHADIRAN' && r.sesi === 'PETANG' && r.tarikh >= firstOfMonth
    ).length;
    const jumlahKehadiranBulan = hadirPagiBulan + hadirPetangBulan;

    // Bantuan bulan ini
    const bantuanBulan = myActive.filter(
      (r) => r.jenis === 'BANTUAN_END' && r.tarikh >= firstOfMonth
    );
    const jumlahBantuanBulan = bantuanBulan.length;
    const totalDurasiBulanMin = bantuanBulan.reduce((sum, r) => sum + (r.durasi_min || 0), 0);

    // Tugasan luar bulan ini
    const tugasanBulan = myActive.filter(
      (r) => r.jenis === 'TUGASAN_END' && r.tarikh >= firstOfMonth
    );
    const jumlahTugasanBulan = tugasanBulan.length;
    const totalDurasiTugasanBulanMin = tugasanBulan.reduce((sum, r) => sum + (r.durasi_min || 0), 0);

    // Semua masa (sepanjang masa)
    const semuaBantuan = myActive.filter((r) => r.jenis === 'BANTUAN_END');
    const totalDurasiSemuaMin = semuaBantuan.reduce((sum, r) => sum + (r.durasi_min || 0), 0);
    const semuaTugasan = myActive.filter((r) => r.jenis === 'TUGASAN_END');
    const totalDurasiSemuaTugasanMin = semuaTugasan.reduce((sum, r) => sum + (r.durasi_min || 0), 0);

    // Kehadiran hari ini
    const hadirHariIni = {
      pagi: myActive.some(
        (r) => r.jenis === 'KEHADIRAN' && r.sesi === 'PAGI' && r.tarikh === todayKL
      ),
      petang: myActive.some(
        (r) => r.jenis === 'KEHADIRAN' && r.sesi === 'PETANG' && r.tarikh === todayKL
      ),
    };

    // Streak kehadiran (hari berturut-turut dengan sekurang-kurangnya 1 kehadiran)
    const hariHadir = new Set(
      myActive
        .filter((r) => r.jenis === 'KEHADIRAN')
        .map((r) => r.tarikh)
    );
    let streak = 0;
    const cursor = new Date(todayKL + 'T00:00:00Z');
    // Mulakan dari hari ini; jika belum hadir hari ini, mula dari semalam
    if (!hariHadir.has(todayKL)) {
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }
    for (;;) {
      const d = cursor.toISOString().slice(0, 10);
      if (hariHadir.has(d)) {
        streak++;
        cursor.setUTCDate(cursor.getUTCDate() - 1);
      } else {
        break;
      }
    }

    // Mingguan: kehadiran 4 minggu lepas (Sen-Ahad)
    const mingguan: { minggu: string; hadir: number }[] = [];
    const now = new Date(todayKL + 'T00:00:00Z');
    // Hari Isnin minggu ini
    const dayOfWeek = now.getUTCDay(); // 0=Ahad ... 6=Sabtu
    const diffToMonday = (dayOfWeek + 6) % 7;
    const mondayThisWeek = new Date(now);
    mondayThisWeek.setUTCDate(now.getUTCDate() - diffToMonday);

    for (let w = 3; w >= 0; w--) {
      const monday = new Date(mondayThisWeek);
      monday.setUTCDate(mondayThisWeek.getUTCDate() - w * 7);
      const sunday = new Date(monday);
      sunday.setUTCDate(monday.getUTCDate() + 6);
      const start = monday.toISOString().slice(0, 10);
      const end = sunday.toISOString().slice(0, 10);

      let count = 0;
      for (const d of hariHadir) {
        if (d >= start && d <= end) count++;
      }
      mingguan.push({
        minggu: `${start.slice(8, 10)}/${start.slice(5, 7)}`,
        hadir: count,
      });
    }

    // --- Statistik unit (tanpa ranking individu) ---
    const ahliAktif = allAnggota.filter((a) => a.status === 'AKTIF').length;

    // Kehadiran unit hari ini (rekod unik per anggota per sesi)
    const unitHadirHariIni = new Set<string>();
    for (const r of records) {
      if (r.jenis === 'KEHADIRAN' && r.status === 'AKTIF' && r.tarikh === todayKL) {
        unitHadirHariIni.add(`${r.anggota_id}:${r.sesi}`);
      }
    }
    const unitPagi = new Set(
      [...unitHadirHariIni].filter((x) => x.endsWith(':PAGI')).map((x) => x.split(':')[0])
    ).size;
    const unitPetang = new Set(
      [...unitHadirHariIni].filter((x) => x.endsWith(':PETANG')).map((x) => x.split(':')[0])
    ).size;

    // Jumlah bantuan unit bulan ini (untuk semangat pasukan)
    const unitBantuanBulan = records.filter(
      (r) => r.jenis === 'BANTUAN_END' && r.status === 'AKTIF' && r.tarikh >= firstOfMonth
    ).length;

    // --- Statistik keseluruhan unit (bulan ini) - susun ikut nama, bukan ranking ---
    const senaraiUnit = allAnggota
      .filter((a) => a.status === 'AKTIF')
      .map((a) => {
        const recs = records.filter(
          (r) => r.anggota_id === a.anggota_id && r.status === 'AKTIF'
        );
        const hadir = recs.filter(
          (r) => r.jenis === 'KEHADIRAN' && r.tarikh >= firstOfMonth
        ).length;
        const bantuan = recs.filter(
          (r) => r.jenis === 'BANTUAN_END' && r.tarikh >= firstOfMonth
        );
        const durasi = bantuan.reduce((s, r) => s + (r.durasi_min || 0), 0);
        return {
          nama: a.nama,
          gred: a.gred,
          kehadiran: hadir,
          bantuan: bantuan.length,
          durasi_min: Math.round(durasi * 100) / 100,
        };
      })
      .sort((a, b) => a.nama.localeCompare(b.nama));

    // Ringkasan keseluruhan unit (bulan ini)
    const unitKehadiranBulan = senaraiUnit.reduce((s, a) => s + a.kehadiran, 0);
    const unitDurasiBulanMin = senaraiUnit.reduce((s, a) => s + a.durasi_min, 0);

    return NextResponse.json({
      success: true,
      data: {
        anggota: {
          nama: anggota.nama,
          gred: anggota.gred,
          anggota_id: anggota.anggota_id,
        },
        peribadi: {
          bulan: {
            hadir_pagi: hadirPagiBulan,
            hadir_petang: hadirPetangBulan,
            jumlah_kehadiran: jumlahKehadiranBulan,
            jumlah_bantuan: jumlahBantuanBulan,
            total_durasi_min: Math.round(totalDurasiBulanMin * 100) / 100,
            jumlah_tugasan: jumlahTugasanBulan,
            total_durasi_tugasan_min: Math.round(totalDurasiTugasanBulanMin * 100) / 100,
          },
          semua: {
            jumlah_bantuan: semuaBantuan.length,
            total_durasi_min: Math.round(totalDurasiSemuaMin * 100) / 100,
            jumlah_tugasan: semuaTugasan.length,
            total_durasi_tugasan_min: Math.round(totalDurasiSemuaTugasanMin * 100) / 100,
          },
          hari_ini: hadirHariIni,
          streak_hari: streak,
          mingguan,
        },
        unit: {
          jumlah_ahli_aktif: ahliAktif,
          hadir_pagi: unitPagi,
          hadir_petang: unitPetang,
          bantuan_bulan: unitBantuanBulan,
          kehadiran_bulan: unitKehadiranBulan,
          durasi_bulan_min: Math.round(unitDurasiBulanMin * 100) / 100,
          senarai: senaraiUnit,
        },
      },
    });
  } catch (error) {
    console.error('Statistik anggota error:', error);
    return NextResponse.json(
      { success: false, message: 'Ralat sistem' },
      { status: 500 }
    );
  }
}
