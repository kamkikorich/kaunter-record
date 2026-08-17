import { config } from 'dotenv';
config({ path: '.env.local' });

import * as fs from 'fs';

const jsonContent = JSON.parse(fs.readFileSync('gen-lang-client-0978854262-e8f0fb76330b.json', 'utf8'));
const keyFromJson = jsonContent.private_key;
const envKey = process.env.GOOGLE_PRIVATE_KEY || '';

console.log('JSON Key repr:', JSON.stringify(keyFromJson));
console.log('---');
console.log('ENV Key repr:', JSON.stringify(envKey));

console.log('\nLength JSON:', keyFromJson.length);
console.log('Length ENV:', envKey.length);

for (let i = 0; i < Math.max(keyFromJson.length, envKey.length); i++) {
  if (keyFromJson[i] !== envKey[i]) {
    console.log(`Mismatch at index ${i}: JSON charCode=${keyFromJson.charCodeAt(i)} (${JSON.stringify(keyFromJson[i])}), ENV charCode=${envKey.charCodeAt(i)} (${JSON.stringify(envKey[i])})`);
    break;
  }
}
