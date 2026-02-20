// Sistem Rekod Kehadiran & Bantuan Kaunter
// Operasi Google Sheets

import { google } from 'googleapis';
import type { Anggota, LogRecord } from './types';
import { SHEET_NAMES, ANGGOTA_COLUMNS, LOG_COLUMNS, GENESIS_HASH } from './constants';
import { generateRecordHash, generateRecordId, getServerTimestamp, getCurrentDate } from './hash';

/**
 * Dapatkan klien Google Sheets
 */
async function getGoogleSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
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

/**
 * Dapatkan semua anggota dari sheet ANGGOTA
 */
export async function getAllAnggota(): Promise<Anggota[]> {
  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_NAMES.ANGGOTA}!A2:F`,
  });

  const rows = response.data.values || [];
  return rows.map((row) => ({
    anggota_id: row[0] || '',
    nama: row[1] || '',
    gred: row[2] || '',
    pin: row[3] || '',         // Column D - plain PIN for reference
    pin_hash: row[4] || '',   // Column E - hashed PIN for verification
    status: (row[5] || 'AKTIF') as 'AKTIF' | 'TIDAK_AKTIF',
  })).filter((a) => a.anggota_id && a.status === 'AKTIF');
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
        return {
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
): Promise<{ recordId: string; success: boolean; durationMin: number }> {
  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  const recordId = generateRecordId();
  const serverTs = getServerTimestamp();
  const tarikh = getCurrentDate();

  const lastRecord = await getLastLogRecord();
  const prevHash = lastRecord?.hash || GENESIS_HASH;

  // Kira durasi
  const startTime = new Date(startRecord.bantuan_start || '').getTime();
  const endTime = new Date(serverTs).getTime();
  const durationMin = Math.round((endTime - startTime) / (1000 * 60));

  const payload = {
    jenis: 'BANTUAN_END',
    tarikh,
    anggota_id: anggota.anggota_id,
    nama: anggota.nama,
    gred: anggota.gred,
    remark: startRecord.remark,
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
    startRecord.remark || '',       // I: remark
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

  return { recordId, success: true, durationMin };
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
  return rows.slice(1).map((row) => ({
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
    durasi_min: row[11] ? parseInt(row[11], 10) : undefined,
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