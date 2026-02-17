// Script untuk generate PIN baru untuk semua anggota
// Run: npx tsx scripts/generate-pins.ts

import { hashPin } from '../lib/pin';

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

async function main() {
  console.log('=== SENARAI PIN ANGGOTA ===\n');
  console.log('ID\t\tPIN\t\tNAMA');
  console.log('-'.repeat(60));
  
  const results: { id: string; nama: string; pin: string; pinHash: string }[] = [];
  
  for (const anggota of ANGGOTA_LIST) {
    const pin = generatePinFromId(anggota.id);
    const pinHash = hashPin(pin);
    
    results.push({
      id: anggota.id,
      nama: anggota.nama,
      pin,
      pinHash,
    });
    
    console.log(`${anggota.id}\t${pin}\t${anggota.nama}`);
  }
  
  console.log('\n=== HASH UNTUK GOOGLE SHEETS ===\n');
  console.log('anggota_id\tnama\tgred\tpin_hash');
  console.log('-'.repeat(80));
  
  for (const r of results) {
    const anggota = ANGGOTA_LIST.find(a => a.id === r.id);
    console.log(`${r.id}\t${r.nama}\t${anggota?.gred}\t${r.pinHash}`);
  }
  
  console.log('\n=== COPY KE GOOGLE SHEETS (CSV FORMAT) ===\n');
  console.log('anggota_id\tnama\tgred\tpin\tpin_hash\tstatus');
  console.log('-'.repeat(100));
  for (const r of results) {
    const anggota = ANGGOTA_LIST.find(a => a.id === r.id);
    console.log(`${r.id}\t${r.nama}\t${anggota?.gred}\t${r.pin}\t${r.pinHash}\tAKTIF`);
  }
}

main().catch(console.error);