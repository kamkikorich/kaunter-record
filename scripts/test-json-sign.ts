import * as crypto from 'crypto';
import * as fs from 'fs';

const jsonContent = JSON.parse(fs.readFileSync('gen-lang-client-0978854262-e8f0fb76330b.json', 'utf8'));
const keyFromJson = jsonContent.private_key;

console.log('Key from JSON type:', typeof keyFromJson);
console.log('Key from JSON line count:', keyFromJson.split('\n').length);

try {
  const signer = crypto.createSign('RSA-SHA256');
  signer.update('test payload');
  const signature = signer.sign(keyFromJson, 'base64');
  console.log('✅ Direct JSON key signing success! Signature length:', signature.length);
} catch (err) {
  console.error('❌ Direct JSON key signing failed:', err);
}
