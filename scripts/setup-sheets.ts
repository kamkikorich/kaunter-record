/**
 * Script untuk setup Google Sheets dengan struktur ANGGOTA dan LOG
 * Run: npx tsx scripts/setup-sheets.ts
 */

import { google } from 'googleapis';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// Load credentials from JSON file (more reliable than env vars for private key)
const KEY_FILE_PATH = path.resolve(__dirname, '../../perkeso-keningau-qr-fb9465d9879f.json');
const SHEETS_ID_FILE = path.resolve(__dirname, '../.sheets-id');

// Get spreadsheet ID from environment or file
const GOOGLE_SHEETS_ID = process.env.GOOGLE_SHEETS_ID || '1HEXrd6bydGYCcEwUqu-ftQVf5mhrVkwy7cDzwal03no';
const HASH_SALT = process.env.HASH_SALT || 'PerkesoSecureSalt2026';
const PIN_SALT = process.env.PIN_SALT || 'PerkesoPinSalt2026';

// Data anggota
const ANGGOTA_DATA = [
  { nama: 'NANCY GOLIONG', gred: '22' },
  { nama: 'WALTER BIN JUSTIN', gred: '20' },
  { nama: 'KASMAN BIN DURAMAN', gred: '20' },
  { nama: 'DONNY MAIJAR', gred: '20' },
  { nama: 'MOHAMMAD RAIS BIN GANI', gred: '19' },
  { nama: 'RIOHELVIA JENSON', gred: '19' },
  { nama: 'SHERRYLYN AMIR', gred: '19' },
  { nama: 'SITI NORHIDAYU BINTI KASSIM', gred: '19' },
  { nama: 'JENYLENN JUPILIS', gred: '19' },
  { nama: 'AISYAH BINTI MUHAMMAD SAYUTI', gred: '19' },
  { nama: 'AHMAD ZAIRUN BIN SULAIMAN', gred: '19' },
  { nama: 'SALINDAWATI BINTI DAYAH', gred: '16' },
  { nama: 'CYROLINE BINTI MADIN', gred: '16' },
  { nama: 'WAHIDAH BINTI PIDDIN', gred: '16' },
  { nama: 'JAIMI @ MD FAZUAN BIN JUDI', gred: '14' },
  { nama: 'RADDIN BIN UBIN', gred: '14' },
  { nama: 'RAMLAN BIN MAKSUD', gred: '10' },
];

// Headers for ANGGOTA sheet
const ANGGOTA_HEADERS = [
  'anggota_id',
  'nama',
  'gred',
  'pin',
  'pin_hash',
  'status'
];

// Headers for LOG sheet
const LOG_HEADERS = [
  'record_id',
  'server_ts',
  'jenis',
  'tarikh',
  'sesi',
  'anggota_id',
  'nama',
  'gred',
  'remark',
  'bantuan_start',
  'bantuan_end',
  'durasi_min',
  'prev_hash',
  'hash',
  'status',
  'ref_record_id'
];

/**
 * Hash PIN using SHA256 with PIN_SALT
 */
function hashPin(pin: string): string {
  return crypto.createHash('sha256').update(pin + PIN_SALT).digest('hex');
}

/**
 * Generate anggota_id
 */
function generateAnggotaId(index: number): string {
  return `ANG-${String(index + 1).padStart(4, '0')}`;
}

/**
 * Generate default PIN from anggota_id
 * Default PIN: 6 digits with leading zeros (e.g., ANG-0001 -> PIN: 000001)
 */
function generateDefaultPin(anggotaId: string): string {
  const num = anggotaId.split('-')[1]; // Returns "0001", "0002", etc.
  return '00' + num; // Make it 6 digits: "000001", "000002", etc.
}

async function setupGoogleSheets() {
  console.log('🚀 Starting Google Sheets setup...\n');

  // Check if key file exists
  if (!fs.existsSync(KEY_FILE_PATH)) {
    throw new Error(`Key file not found at: ${KEY_FILE_PATH}`);
  }

  console.log(`🔑 Using key file: ${KEY_FILE_PATH}`);
  console.log(`📋 Spreadsheet ID: ${GOOGLE_SHEETS_ID}`);

  // Authenticate using key file
  const auth = new google.auth.GoogleAuth({
    keyFile: KEY_FILE_PATH,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = GOOGLE_SHEETS_ID;

  try {
    // Get existing sheets info
    const spreadsheetInfo = await sheets.spreadsheets.get({ spreadsheetId });
    const existingSheets = spreadsheetInfo.data.sheets?.map(s => s.properties?.title) || [];
    console.log('📋 Existing sheets:', existingSheets);

    // 1. Setup ANGGOTA sheet
    console.log('\n📝 Setting up ANGGOTA sheet...');

    if (!existingSheets.includes('ANGGOTA')) {
      // Create ANGGOTA sheet if not exists
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{
            addSheet: {
              properties: { title: 'ANGGOTA' }
            }
          }]
        }
      });
      console.log('   ✅ Created ANGGOTA sheet');
    } else {
      // Delete and recreate to ensure correct column count
      console.log('   🔄 Deleting existing ANGGOTA sheet to recreate with correct columns...');
      const anggotaSheetId = spreadsheetInfo.data.sheets?.find(
        s => s.properties?.title === 'ANGGOTA'
      )?.properties?.sheetId;
      
      if (anggotaSheetId !== undefined) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [{
              deleteSheet: { sheetId: anggotaSheetId }
            }]
          }
        });
        
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [{
              addSheet: {
                properties: { title: 'ANGGOTA' }
              }
            }]
          }
        });
      }
      console.log('   ✅ Recreated ANGGOTA sheet');
    }

    // Clear and write headers for ANGGOTA
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: 'ANGGOTA!A1:F1',
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'ANGGOTA!A1:F1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [ANGGOTA_HEADERS]
      }
    });
    console.log('   ✅ Written ANGGOTA headers');

    // Prepare anggota data
    const anggotaRows = ANGGOTA_DATA.map((anggota, index) => {
      const anggotaId = generateAnggotaId(index);
      const defaultPin = generateDefaultPin(anggotaId);
      const pinHash = hashPin(defaultPin);

      return [
        anggotaId,
        anggota.nama,
        anggota.gred,
        defaultPin,
        pinHash,
        'AKTIF'
      ];
    });

    // Write anggota data
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `ANGGOTA!A2:F${anggotaRows.length + 1}`,
      valueInputOption: 'RAW',
      requestBody: {
        values: anggotaRows
      }
    });
    console.log(`   ✅ Written ${anggotaRows.length} anggota records`);

    // 2. Setup LOG sheet
    console.log('\n📝 Setting up LOG sheet...');

    if (!existingSheets.includes('LOG')) {
      // Create LOG sheet if not exists
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{
            addSheet: {
              properties: { title: 'LOG' }
            }
          }]
        }
      });
      console.log('   ✅ Created LOG sheet');
    } else {
      console.log('   ℹ️  LOG sheet already exists');
    }

    // Write headers for LOG
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: 'LOG!A1:P1',
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'LOG!A1:P1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [LOG_HEADERS]
      }
    });
    console.log('   ✅ Written LOG headers');

    // 3. Delete default Sheet1 if exists
    if (existingSheets.includes('Sheet1')) {
      console.log('\n🗑️  Removing default Sheet1...');
      const sheetId = spreadsheetInfo.data.sheets?.find(
        s => s.properties?.title === 'Sheet1'
      )?.properties?.sheetId;

      if (sheetId !== undefined) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [{
              deleteSheet: { sheetId }
            }]
          }
        });
        console.log('   ✅ Deleted Sheet1');
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 SETUP COMPLETE!');
    console.log('='.repeat(50));
    console.log(`\nSpreadsheet ID: ${spreadsheetId}`);
    console.log(`URL: https://docs.google.com/spreadsheets/d/${spreadsheetId}`);
    console.log('\n📋 ANGGOTA Sheet:');
    console.log('   Columns: anggota_id | nama | gred | pin | pin_hash | status');
    console.log(`   Records: ${anggotaRows.length}`);

    console.log('\n📋 LOG Sheet:');
    console.log('   Columns: record_id | server_ts | jenis | tarikh | sesi | anggota_id | nama | gred | remark | bantuan_start | bantuan_end | durasi_min | prev_hash | hash | status | ref_record_id');
    console.log('   Records: 0 (ready for entries)');

    console.log('\n🔑 DEFAULT PIN FORMAT:');
    console.log('   Each anggota has 6-digit PIN (with leading zeros)');
    console.log('   Example: ANG-0001 → PIN: 000001, ANG-0002 → PIN: 000002');
    console.log('\n   ⚠️  PIN column is for reference, system only stores hash!');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

// Run the script
setupGoogleSheets()
  .then(() => {
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });