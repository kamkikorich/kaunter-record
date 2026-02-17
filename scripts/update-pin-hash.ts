// Script untuk kemaskini PIN hash di Google Sheets
// Run: npx tsx scripts/update-pin-hash.ts

import { config } from 'dotenv';
config({ path: '.env.local' });

import { google } from 'googleapis';
import { hashPin } from '../lib/pin';
import { SHEET_NAMES } from '../lib/constants';

const ANGGOTA_LIST = [
  { id: 'ANG-0001', nama: 'NANCY GOLIONG', gred: '22' },
  { id: 'ANG-0002', nama: 'WALTER BIN JUSTIN', gred: '20' },
  { id: 'ANG-0003', nama: 'KASMAN BIN DURAMAN', gred: '20' },
  { id: 'ANG-0004', nama: 'DONNY MAIJAR', gred: '20' },
  { id: 'ANG-0005', nama: 'MOHAMMAD RAIS BIN GANI', gred: '19' },
  { id: 'ANG-0006', nama: 'RIOHELVIA JENSON', gred: '19' },
  { id: 'ANG-0007', nama: 'SHERRYLYN AMIR', gred: '19' },
  { id: 'ANG-0008', nama: 'SITI NORHIDAYU BINTI KASSIM', gred: '19' },
  { id: 'ANG-0009', nama: 'JENYLENN JUPILIS', gred: '19' },
  { id: 'ANG-0010', nama: 'AISYAH BINTI MUHAMMAD SAYUTI', gred: '19' },
  { id: 'ANG-0011', nama: 'AHMAD ZAIRUN BIN SULAIMAN', gred: '19' },
  { id: 'ANG-0012', nama: 'SALINDAWATI BINTI DAYAH', gred: '16' },
  { id: 'ANG-0013', nama: 'CYROLINE BINTI MADIN', gred: '16' },
  { id: 'ANG-0014', nama: 'WAHIDAH BINTI PIDDIN', gred: '16' },
  { id: 'ANG-0015', nama: 'JAIMI @ MD FAZUAN BIN JUDI', gred: '14' },
  { id: 'ANG-0016', nama: 'RADDIN BIN UBIN', gred: '14' },
  { id: 'ANG-0017', nama: 'RAMLAN BIN MAKSUD', gred: '10' },
];

function generatePinFromId(id: string): string {
  const num = id.replace('ANG-', '');
  return '00' + num;
}

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

function getSpreadsheetId(): string {
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID || process.env.GOOGLE_SHEETS_ID;
  if (!spreadsheetId) {
    throw new Error('GOOGLE_SPREADSHEET_ID tidak dikonfigurasi');
  }
  return spreadsheetId;
}

async function main() {
  console.log('=== KEMASKINI PIN HASH DI GOOGLE SHEETS ===\n');
  
  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  // First, get existing data to find row numbers
  console.log('Mengambil data semasa dari Google Sheets...');
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_NAMES.ANGGOTA}!A:E`,
  });

  const rows = response.data.values || [];
  console.log(`Jumlah baris: ${rows.length}\n`);

  // Generate PIN hashes
  const pinData: { id: string; pin: string; pinHash: string }[] = [];
  for (const anggota of ANGGOTA_LIST) {
    const pin = generatePinFromId(anggota.id);
    const pinHash = hashPin(pin);
    pinData.push({ id: anggota.id, pin, pinHash });
  }

  // Find row index for each anggota
  const updates: { row: number; pinHash: string; id: string; nama: string }[] = [];
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const anggotaId = row[0];
    const pinDataItem = pinData.find(p => p.id === anggotaId);
    
    if (pinDataItem) {
      updates.push({
        row: i + 1, // 1-indexed for Google Sheets
        pinHash: pinDataItem.pinHash,
        id: anggotaId,
        nama: row[1] || '',
      });
    }
  }

  console.log('Anggota yang akan dikemaskini:');
  console.log('-'.repeat(60));
  updates.forEach(u => {
    const pin = pinData.find(p => p.id === u.id)?.pin;
    console.log(`${u.id}\t${u.nama}\tPIN: ${pin}`);
  });
  console.log('-'.repeat(60));
  console.log(`Jumlah: ${updates.length} anggota\n`);

  // Update each row's pin_hash (column D = index 4)
  for (const update of updates) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${SHEET_NAMES.ANGGOTA}!D${update.row}`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [[update.pinHash]],
      },
    });
    console.log(`✓ Kemaskini ${update.id} - ${update.nama}`);
  }

  console.log('\n=== KEMASKINI BERJAYA ===');
  console.log('\nSenarai PIN untuk diedarkan kepada anggota:');
  console.log('-'.repeat(60));
  console.log('ID\t\tPIN\t\tNAMA');
  console.log('-'.repeat(60));
  ANGGOTA_LIST.forEach(anggota => {
    const pin = generatePinFromId(anggota.id);
    console.log(`${anggota.id}\t${pin}\t${anggota.nama}`);
  });
}

main().catch(console.error);