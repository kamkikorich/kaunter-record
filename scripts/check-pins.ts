import { config } from 'dotenv';
config({ path: '.env.local' });

import { getAllAnggota } from '../lib/google-sheets';
import { hashPin } from '../lib/pin';

async function checkSheetData() {
  const anggota = await getAllAnggota(true);
  console.log('Fetched anggota count:', anggota.length);
  for (const a of anggota.slice(0, 3)) {
    const expectedPin = '00' + a.anggota_id.replace('ANG-', '');
    const expectedHash = hashPin(expectedPin);
    console.log(`ID: ${a.anggota_id}, Nama: ${a.nama}`);
    console.log(`  Sheet PIN: ${a.pin}`);
    console.log(`  Sheet Hash: ${a.pin_hash}`);
    console.log(`  Computed Hash for PIN (${expectedPin}): ${expectedHash}`);
    console.log(`  Match? ${a.pin_hash === expectedHash}`);
  }
}

checkSheetData().catch(console.error);
