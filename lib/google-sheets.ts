// Sistem Rekod Kehadiran & Bantuan Kaunter
// Operasi Google Sheets

import { google } from 'googleapis';
import type { Anggota, LogRecord } from './types';
import { SHEET_NAMES, GENESIS_HASH, WAKTU_OPERASI, NOTA_POTONG_WAKTU, MAX_BANTUAN_DURASI_MIN, NOTA_POTONG_MAKS, WAKTU_TUGASAN, MAX_TUGASAN_DURASI_MIN, NOTA_POTONG_TUGASAN_WAKTU, NOTA_POTONG_TUGASAN_MAKS } from './constants';
import { generateRecordHash, generateRecordId, getServerTimestamp, getCurrentDate } from './hash';

/**
 * Dapatkan klien Google Sheets
 */
async function getGoogleSheetsClient() {
  let privateKey = process.env.GOOGLE_PRIVATE_KEY || '';
  privateKey = privateKey.replace(/\\n/g, '\n');
  if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
    privateKey = privateKey.slice(1, -1);
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  return sheets;
}

/**
 * Dapatkan ID Spreadsheet dari environment
 */
function getSpreadsheetId(): string {
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
  if (!spreadsheetId) {
    throw new Error('GOOGLE_SPREADSHEET_ID tidak dikonfigurasi');
  }
  return spreadsheetId;
}

// --- IN-MEMORY CACHE UNTUK ANGGOTA ---
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minit
let anggotaCache: {
  data: Anggota[] | null;
  lastFetch: number;
} = {
  data: null,
  lastFetch: 0,
};

/**
 * Dapatkan semua anggota dari sheet ANGGOTA (dengan Cache 5 Minit)
 */
export async function getAllAnggota(forceRefresh = false): Promise<Anggota[]> {
  const now = Date.now();

  // Kembalikan dari cache jika masih sah dan tidak dipaksa refresh
  if (!forceRefresh && anggotaCache.data && now - anggotaCache.lastFetch < CACHE_TTL_MS) {
    return anggotaCache.data;
  }

  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_NAMES.ANGGOTA}!A2:F`,
  });

  const rows = response.data.values || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = rows.map((row: any[]) => ({
    anggota_id: row[0] || '',
    nama: row[1] || '',
    gred: row[2] || '',
    pin: row[3] || '',         // Column D - plain PIN for reference
    pin_hash: row[4] || '',   // Column E - hashed PIN for verification
    status: (row[5] || 'AKTIF') as 'AKTIF' | 'TIDAK_AKTIF',
  })).filter((a: Anggota) => a.anggota_id && a.status === 'AKTIF');

  // Simpan dalam cache
  anggotaCache = {
    data: result,
    lastFetch: now,
  };

  return result;
}

/**
 * Cari anggota berdasarkan ID
 */
export async function findAnggotaById(anggotaId: string): Promise<Anggota | null> {
  const allAnggota = await getAllAnggota();
  return allAnggota.find((a) => a.anggota_id === anggotaId) || null;
}

/**
 * Sahkan PIN anggota
 * Mengembalikan data anggota jika PIN sah
 */
export async function verifyAnggotaPin(anggotaId: string, pinHash: string): Promise<Anggota | null> {
  const anggota = await findAnggotaById(anggotaId);
  if (!anggota) {
    return null;
  }

  if (anggota.pin_hash !== pinHash) {
    return null;
  }

  return anggota;
}

/**
 * Dapatkan rekod terakhir dari LOG untuk prev_hash
 */
export async function getLastLogRecord(): Promise<{ hash: string } | null> {
  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_NAMES.LOG}!N:N`, // Column N is hash
  });

  const rows = response.data.values || [];
  if (rows.length <= 1) {
    // Header row only or empty
    return null;
  }

  // Get the last non-empty row
  for (let i = rows.length - 1; i >= 1; i--) {
    if (rows[i] && rows[i][0]) {
      return { hash: rows[i][0] };
    }
  }

  return null;
}

/**
 * Tambah rekod kehadiran baru
 */
export async function appendKehadiranRecord(
  anggota: Anggota,
  sesi: string
): Promise<{ recordId: string; success: boolean }> {
  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  const recordId = generateRecordId();
  const serverTs = getServerTimestamp();
  const tarikh = getCurrentDate();

  // Dapatkan prev_hash dari rekod terakhir
  const lastRecord = await getLastLogRecord();
  const prevHash = lastRecord?.hash || GENESIS_HASH;

  // Payload untuk hash
  const payload = {
    jenis: 'KEHADIRAN',
    tarikh,
    sesi,
    anggota_id: anggota.anggota_id,
    nama: anggota.nama,
    gred: anggota.gred,
  };

  const hash = generateRecordHash(prevHash, recordId, serverTs, payload);

  // Row: record_id | server_ts | jenis | tarikh | sesi | anggota_id | nama | gred | remark | bantuan_start | bantuan_end | durasi_min | prev_hash | hash | status | ref_record_id
  const row = [
    recordId,
    serverTs,
    'KEHADIRAN',
    tarikh,
    sesi,
    anggota.anggota_id,
    anggota.nama,
    anggota.gred,
    '', // remark
    '', // bantuan_start
    '', // bantuan_end
    '', // durasi_min
    prevHash,
    hash,
    'AKTIF',
    '', // ref_record_id
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${SHEET_NAMES.LOG}!A:P`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [row],
    },
  });

  return { recordId, success: true };
}

/**
 * Semak jika kehadiran sudah wujud untuk sesi ini
 */
export async function checkKehadiranExists(
  anggotaId: string,
  tarikh: string,
  sesi: string
): Promise<boolean> {
  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_NAMES.LOG}!A:P`,
  });

  const rows = response.data.values || [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const jenis = row[2];
    const rowTarikh = row[3];
    const rowSesi = row[4];
    const rowAnggotaId = row[5];
    const rowStatus = row[14];

    if (
      jenis === 'KEHADIRAN' &&
      rowTarikh === tarikh &&
      rowSesi === sesi &&
      rowAnggotaId === anggotaId &&
      rowStatus === 'AKTIF'
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Tambah rekod bantuan (START)
 */
export async function appendBantuanStartRecord(
  anggota: Anggota,
  remark: string,
  lokasi: string = '',
  kategori: string = '',
  sub_kategori: string = ''
): Promise<{ recordId: string; success: boolean }> {
  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  const recordId = generateRecordId();
  const serverTs = getServerTimestamp();
  const tarikh = getCurrentDate();

  const lastRecord = await getLastLogRecord();
  const prevHash = lastRecord?.hash || GENESIS_HASH;

  const payload = {
    jenis: 'BANTUAN_START',
    tarikh,
    anggota_id: anggota.anggota_id,
    nama: anggota.nama,
    gred: anggota.gred,
    remark,
    lokasi,
    kategori,
    sub_kategori,
    bantuan_start: serverTs,
  };

  const hash = generateRecordHash(prevHash, recordId, serverTs, payload);

  // Row A-P: sedia ada | Q: lokasi | R: kategori | S: sub_kategori
  const row = [
    recordId,       // A: record_id
    serverTs,       // B: server_ts
    'BANTUAN_START',// C: jenis
    tarikh,         // D: tarikh
    '',             // E: sesi
    anggota.anggota_id, // F: anggota_id
    anggota.nama,   // G: nama
    anggota.gred,   // H: gred
    remark,         // I: remark
    serverTs,       // J: bantuan_start
    '',             // K: bantuan_end
    '',             // L: durasi_min
    prevHash,       // M: prev_hash
    hash,           // N: hash
    'AKTIF',        // O: status
    '',             // P: ref_record_id
    lokasi,         // Q: lokasi
    kategori,       // R: kategori
    sub_kategori,   // S: sub_kategori
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${SHEET_NAMES.LOG}!A:S`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [row],
    },
  });

  return { recordId, success: true };
}

/**
 * Semak bantuan aktif untuk anggota
 * Jika bantuan aktif melepasi waktu operasi (17:30) atau tengah malam,
 * ia auto-ditamatkan dengan potongan masa sebelum dipulangkan.
 */
export async function getBantuanAktif(anggotaId: string): Promise<LogRecord | null> {
  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_NAMES.LOG}!A:S`,
  });

  const rows = response.data.values || [];
  for (let i = rows.length - 1; i >= 1; i--) {
    const row = rows[i];
    const jenis = row[2];
    const rowAnggotaId = row[5];
    const rowStatus = row[14];

    if (jenis === 'BANTUAN_START' && rowAnggotaId === anggotaId && rowStatus === 'AKTIF') {
      const startRecordId = row[0];
      let hasEndRecord = false;

      for (let j = 1; j < rows.length; j++) {
        const checkRow = rows[j];
        if (checkRow[2] === 'BANTUAN_END' && checkRow[15] === startRecordId) {
          hasEndRecord = true;
          break;
        }
      }

      if (!hasEndRecord) {
        const aktifRecord: LogRecord = {
          record_id: row[0],
          server_ts: row[1],
          jenis: 'BANTUAN_START',
          tarikh: row[3],
          anggota_id: row[5],
          nama: row[6],
          gred: row[7],
          remark: row[8],
          bantuan_start: row[9],
          prev_hash: row[12],
          hash: row[13],
          status: 'AKTIF',
          lokasi: row[16] || '',
          kategori: row[17] || '',
          sub_kategori: row[18] || '',
        };

        // Auto-close jika melepasi waktu operasi (17:30), tengah malam, atau had 2 jam
        const startDate = new Date(aktifRecord.bantuan_start || '');
        const now = new Date();

        const closingTime = new Date(startDate);
        closingTime.setHours(WAKTU_OPERASI.END_HOUR, WAKTU_OPERASI.END_MINUTE, 0, 0);

        const crossedMidnight =
          startDate.getDate() !== now.getDate() ||
          startDate.getMonth() !== now.getMonth() ||
          startDate.getFullYear() !== now.getFullYear();

        const pastClosing =
          now.getTime() > closingTime.getTime() && startDate.getTime() < closingTime.getTime();

        const pastMax =
          now.getTime() > startDate.getTime() + MAX_BANTUAN_DURASI_MIN * 60 * 1000;

        if (crossedMidnight || pastClosing || pastMax) {
          // Tamatkan automatik dengan potongan masa
          const anggotaMini: Anggota = {
            anggota_id: aktifRecord.anggota_id,
            nama: aktifRecord.nama,
            gred: aktifRecord.gred,
            pin: '',
            pin_hash: '',
            status: 'AKTIF',
          };
          await appendBantuanEndRecord(anggotaMini, aktifRecord);
          return null; // Bantuan telah ditamatkan automatik - tiada lagi aktif
        }

        return aktifRecord;
      }
    }
  }

  return null;
}

/**
 * Tambah rekod bantuan (END)
 */
export async function appendBantuanEndRecord(
  anggota: Anggota,
  startRecord: LogRecord
): Promise<{ recordId: string; success: boolean; durationMin: number; warning?: string }> {
  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  const recordId = generateRecordId();
  const serverTs = getServerTimestamp();
  const tarikh = getCurrentDate();

  const lastRecord = await getLastLogRecord();
  const prevHash = lastRecord?.hash || GENESIS_HASH;

  // Kira durasi
  const startDate = new Date(startRecord.bantuan_start || '');
  const endDate = new Date(serverTs);

  let finalEndTime = endDate.getTime();
  let finalRemark = startRecord.remark;
  let isCrossedMidnight = false;
  let isPastClosing = false;
  let isOverMax = false;

  // Had maksimum durasi: 2 jam (bantuan biasa 3 minit - 1 jam)
  const maxEndTime = startDate.getTime() + MAX_BANTUAN_DURASI_MIN * 60 * 1000;
  if (endDate.getTime() > maxEndTime) {
    finalEndTime = maxEndTime;
    finalRemark = (startRecord.remark ? startRecord.remark + ' ' : '') + NOTA_POTONG_MAKS;
    isOverMax = true;
  }

  // Had waktu operasi: potong pada 17:30 hari yang sama (bukan hanya tengah malam)
  // Hanya potong jika aktiviti benar-benar bermula dalam waktu operasi
  const closingTime = new Date(startDate);
  closingTime.setHours(WAKTU_OPERASI.END_HOUR, WAKTU_OPERASI.END_MINUTE, 0, 0);

  if (endDate.getTime() > closingTime.getTime() && startDate.getTime() < closingTime.getTime()) {
    finalEndTime = Math.min(finalEndTime, closingTime.getTime());
    finalRemark = (startRecord.remark ? startRecord.remark + ' ' : '') + NOTA_POTONG_WAKTU;
    isPastClosing = true;
  }

  if (
    startDate.getDate() !== endDate.getDate() ||
    startDate.getMonth() !== endDate.getMonth() ||
    startDate.getFullYear() !== endDate.getFullYear()
  ) {
    // Crossed midnight. Limit calculation to 23:59:59 of start day.
    const midnight = new Date(startDate);
    midnight.setHours(23, 59, 59, 999);
    finalEndTime = Math.min(finalEndTime, midnight.getTime());
    finalRemark = (startRecord.remark ? startRecord.remark + ' ' : '') + '[SISTEM: Aktiviti melepasi 12 tengah malam - masa dipotong automatik]';
    isCrossedMidnight = true;
  }

  // Kira durasi dalam minit dengan 2 tempat perpuluhan untuk ketepatan
  // Sistem kini merekod masa dengan tepat termasuk aktiviti bawah 1 minit
  // Contoh: 30 saat = 0.5 minit, 45 saat = 0.75 minit, 90 saat = 1.5 minit
  const durationSeconds = (finalEndTime - startDate.getTime()) / 1000;
  const durationMin = Math.round(durationSeconds / 60 * 100) / 100; // 2 decimal places

  const payload = {
    jenis: 'BANTUAN_END',
    tarikh,
    anggota_id: anggota.anggota_id,
    nama: anggota.nama,
    gred: anggota.gred,
    remark: finalRemark,
    lokasi: startRecord.lokasi || '',
    kategori: startRecord.kategori || '',
    sub_kategori: startRecord.sub_kategori || '',
    bantuan_start: startRecord.bantuan_start,
    bantuan_end: serverTs,
    durasi_min: durationMin,
  };

  const hash = generateRecordHash(prevHash, recordId, serverTs, payload);

  // Row A-P: sedia ada | Q: lokasi | R: kategori | S: sub_kategori
  const row = [
    recordId,                       // A
    serverTs,                       // B
    'BANTUAN_END',                  // C
    tarikh,                         // D
    '',                             // E: sesi
    anggota.anggota_id,             // F
    anggota.nama,                   // G
    anggota.gred,                   // H
    finalRemark || '',              // I: remark
    startRecord.bantuan_start || '',// J: bantuan_start
    serverTs,                       // K: bantuan_end
    durationMin,                    // L: durasi_min
    prevHash,                       // M
    hash,                           // N
    'AKTIF',                        // O
    startRecord.record_id,          // P: ref_record_id
    startRecord.lokasi || '',       // Q: lokasi
    startRecord.kategori || '',     // R: kategori
    startRecord.sub_kategori || '',  // S: sub_kategori
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${SHEET_NAMES.LOG}!A:S`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [row],
    },
  });

  return {
    recordId,
    success: true,
    durationMin,
    warning: isCrossedMidnight
      ? "⚠️ Aktiviti melepasi 12 tengah malam. Sistem telah memotong masa kepada 23:59:59 pada hari yang sama untuk ketepatan rekod."
      : isPastClosing
        ? "⚠️ Aktiviti melepasi waktu operasi kaunter (5:30 petang). Sistem telah memotong masa secara automatik pada 17:30 untuk rekod yang adil."
        : isOverMax
          ? "⚠️ Aktiviti melebihi had maksimum 2 jam. Sistem telah memotong masa secara automatik pada 2 jam untuk rekod yang adil."
          : undefined
  };
}

/**
 * Tambah rekod tugasan luar (START)
 */
export async function appendTugasanStartRecord(
  anggota: Anggota,
  remark: string,
  kategori: string = ''
): Promise<{ recordId: string; success: boolean }> {
  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  const recordId = generateRecordId();
  const serverTs = getServerTimestamp();
  const tarikh = getCurrentDate();

  const lastRecord = await getLastLogRecord();
  const prevHash = lastRecord?.hash || GENESIS_HASH;

  const payload = {
    jenis: 'TUGASAN_START',
    tarikh,
    anggota_id: anggota.anggota_id,
    nama: anggota.nama,
    gred: anggota.gred,
    remark,
    kategori,
    bantuan_start: serverTs,
  };

  const hash = generateRecordHash(prevHash, recordId, serverTs, payload);

  const row = [
    recordId,          // A
    serverTs,          // B
    'TUGASAN_START',   // C
    tarikh,            // D
    '',                // E: sesi
    anggota.anggota_id,// F
    anggota.nama,      // G
    anggota.gred,      // H
    remark,            // I
    serverTs,          // J: bantuan_start (masa mula tugasan)
    '',                // K
    '',                // L
    prevHash,          // M
    hash,              // N
    'AKTIF',           // O
    '',                // P
    '',                // Q: lokasi (kosong - tugasan luar)
    kategori,          // R: kategori
    '',                // S
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${SHEET_NAMES.LOG}!A:S`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [row],
    },
  });

  return { recordId, success: true };
}

/**
 * Semak tugasan luar aktif untuk anggota
 * Auto-close jika melepasi had 8 malam (20:00) atau had maksimum 12 jam
 */
export async function getTugasanAktif(anggotaId: string): Promise<LogRecord | null> {
  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_NAMES.LOG}!A:S`,
  });

  const rows = response.data.values || [];
  for (let i = rows.length - 1; i >= 1; i--) {
    const row = rows[i];
    const jenis = row[2];
    const rowAnggotaId = row[5];
    const rowStatus = row[14];

    if (jenis === 'TUGASAN_START' && rowAnggotaId === anggotaId && rowStatus === 'AKTIF') {
      const startRecordId = row[0];
      let hasEndRecord = false;

      for (let j = 1; j < rows.length; j++) {
        const checkRow = rows[j];
        if (checkRow[2] === 'TUGASAN_END' && checkRow[15] === startRecordId) {
          hasEndRecord = true;
          break;
        }
      }

      if (!hasEndRecord) {
        const aktifRecord: LogRecord = {
          record_id: row[0],
          server_ts: row[1],
          jenis: 'TUGASAN_START',
          tarikh: row[3],
          anggota_id: row[5],
          nama: row[6],
          gred: row[7],
          remark: row[8],
          bantuan_start: row[9],
          prev_hash: row[12],
          hash: row[13],
          status: 'AKTIF',
          lokasi: row[16] || '',
          kategori: row[17] || '',
          sub_kategori: row[18] || '',
        };

        // Auto-close jika melepasi had 8 malam atau had 12 jam
        const startDate = new Date(aktifRecord.bantuan_start || '');
        const now = new Date();

        const hadMalam = new Date(startDate);
        hadMalam.setHours(WAKTU_TUGASAN.END_HOUR, WAKTU_TUGASAN.END_MINUTE, 0, 0);

        const crossedMidnight =
          startDate.getDate() !== now.getDate() ||
          startDate.getMonth() !== now.getMonth() ||
          startDate.getFullYear() !== now.getFullYear();

        const pastMalam =
          now.getTime() > hadMalam.getTime() && startDate.getTime() < hadMalam.getTime();

        const pastMax =
          now.getTime() > startDate.getTime() + MAX_TUGASAN_DURASI_MIN * 60 * 1000;

        if (crossedMidnight || pastMalam || pastMax) {
          const anggotaMini: Anggota = {
            anggota_id: aktifRecord.anggota_id,
            nama: aktifRecord.nama,
            gred: aktifRecord.gred,
            pin: '',
            pin_hash: '',
            status: 'AKTIF',
          };
          await appendTugasanEndRecord(anggotaMini, aktifRecord);
          return null;
        }

        return aktifRecord;
      }
    }
  }

  return null;
}

/**
 * Tambah rekod tugasan luar (END)
 * Potong automatik pada 8 malam (20:00) atau had maksimum 12 jam
 */
export async function appendTugasanEndRecord(
  anggota: Anggota,
  startRecord: LogRecord
): Promise<{ recordId: string; success: boolean; durationMin: number; warning?: string }> {
  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  const recordId = generateRecordId();
  const serverTs = getServerTimestamp();
  const tarikh = getCurrentDate();

  const lastRecord = await getLastLogRecord();
  const prevHash = lastRecord?.hash || GENESIS_HASH;

  // Kira durasi
  const startDate = new Date(startRecord.bantuan_start || '');
  const endDate = new Date(serverTs);

  let finalEndTime = endDate.getTime();
  let finalRemark = startRecord.remark;
  let isPastMalam = false;
  let isOverMax = false;

  // Had maksimum: 12 jam
  const maxEndTime = startDate.getTime() + MAX_TUGASAN_DURASI_MIN * 60 * 1000;
  if (endDate.getTime() > maxEndTime) {
    finalEndTime = maxEndTime;
    finalRemark = (startRecord.remark ? startRecord.remark + ' ' : '') + NOTA_POTONG_TUGASAN_MAKS;
    isOverMax = true;
  }

  // Had 8 malam (20:00) hari yang sama
  const hadMalam = new Date(startDate);
  hadMalam.setHours(WAKTU_TUGASAN.END_HOUR, WAKTU_TUGASAN.END_MINUTE, 0, 0);

  if (endDate.getTime() > hadMalam.getTime() && startDate.getTime() < hadMalam.getTime()) {
    finalEndTime = Math.min(finalEndTime, hadMalam.getTime());
    finalRemark = (startRecord.remark ? startRecord.remark + ' ' : '') + NOTA_POTONG_TUGASAN_WAKTU;
    isPastMalam = true;
  }

  // Crossed midnight - potong pada 23:59:59 hari mula
  if (
    startDate.getDate() !== endDate.getDate() ||
    startDate.getMonth() !== endDate.getMonth() ||
    startDate.getFullYear() !== endDate.getFullYear()
  ) {
    const midnight = new Date(startDate);
    midnight.setHours(23, 59, 59, 999);
    finalEndTime = Math.min(finalEndTime, midnight.getTime());
    finalRemark = (startRecord.remark ? startRecord.remark + ' ' : '') + '[SISTEM: Tugasan melepasi 12 tengah malam - masa dipotong automatik]';
  }

  const durationSeconds = (finalEndTime - startDate.getTime()) / 1000;
  const durationMin = Math.round(durationSeconds / 60 * 100) / 100;

  const payload = {
    jenis: 'TUGASAN_END',
    tarikh,
    anggota_id: anggota.anggota_id,
    nama: anggota.nama,
    gred: anggota.gred,
    remark: finalRemark,
    kategori: startRecord.kategori || '',
    bantuan_start: startRecord.bantuan_start,
    bantuan_end: serverTs,
    durasi_min: durationMin,
  };

  const hash = generateRecordHash(prevHash, recordId, serverTs, payload);

  const row = [
    recordId,          // A
    serverTs,          // B
    'TUGASAN_END',     // C
    tarikh,            // D
    '',                // E
    anggota.anggota_id,// F
    anggota.nama,      // G
    anggota.gred,      // H
    finalRemark || '', // I
    startRecord.bantuan_start || '', // J
    serverTs,          // K
    durationMin,       // L
    prevHash,          // M
    hash,              // N
    'AKTIF',           // O
    startRecord.record_id, // P: ref_record_id
    '',                // Q
    startRecord.kategori || '', // R
    '',                // S
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${SHEET_NAMES.LOG}!A:S`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [row],
    },
  });

  return {
    recordId,
    success: true,
    durationMin,
    warning: isPastMalam
      ? "⚠️ Tugasan melepasi had 8 malam. Sistem telah memotong masa secara automatik pada 20:00 untuk rekod yang adil."
      : isOverMax
        ? "⚠️ Tugasan melebihi had maksimum 12 jam. Sistem telah memotong masa secara automatik untuk rekod yang adil."
        : undefined,
  };
}

/**
 * Dapatkan semua rekod LOG
 */
export async function getAllLogRecords(): Promise<LogRecord[]> {
  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_NAMES.LOG}!A:S`,
  });

  const rows = response.data.values || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return rows.slice(1).map((row: any[]) => ({
    record_id: row[0] || '',
    server_ts: row[1] || '',
    jenis: row[2] as LogRecord['jenis'],
    tarikh: row[3] || '',
    sesi: row[4] || undefined,
    anggota_id: row[5] || '',
    nama: row[6] || '',
    gred: row[7] || '',
    remark: row[8] || undefined,
    bantuan_start: row[9] || undefined,
    bantuan_end: row[10] || undefined,
    durasi_min: row[11] ? parseFloat(row[11]) : undefined,
    prev_hash: row[12] || '',
    hash: row[13] || '',
    status: row[14] as LogRecord['status'],
    ref_record_id: row[15] || undefined,
    lokasi: row[16] || undefined,
    kategori: row[17] || undefined,
    sub_kategori: row[18] || undefined,
  }));
}

/**
 * Dapatkan statistik individu
 */
export async function getStatistikIndividu(anggotaId: string): Promise<{
  jumlahKehadiran: number;
  jumlahBantuan: number;
  totalDurasiMin: number;
}> {
  const records = await getAllLogRecords();

  let jumlahKehadiran = 0;
  let jumlahBantuan = 0;
  let totalDurasiMin = 0;

  for (const record of records) {
    if (record.anggota_id !== anggotaId || record.status !== 'AKTIF') {
      continue;
    }

    if (record.jenis === 'KEHADIRAN') {
      jumlahKehadiran++;
    } else if (record.jenis === 'BANTUAN_END') {
      jumlahBantuan++;
      totalDurasiMin += record.durasi_min || 0;
    }
  }

  return { jumlahKehadiran, jumlahBantuan, totalDurasiMin };
}