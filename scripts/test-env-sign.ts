import { config } from 'dotenv';
config({ path: '.env.local' });

import * as crypto from 'crypto';

const envKey = process.env.GOOGLE_PRIVATE_KEY;

console.log('envKey type:', typeof envKey);
console.log('envKey length:', envKey?.length);
console.log('envKey line count raw:', envKey?.split('\n').length);

const formattedKey = (envKey || '').replace(/\\n/g, '\n');
console.log('formattedKey line count:', formattedKey.split('\n').length);

try {
  const signer = crypto.createSign('RSA-SHA256');
  signer.update('test payload');
  const signature = signer.sign(formattedKey, 'base64');
  console.log('✅ env.local key signing success! Signature length:', signature.length);
} catch (err) {
  console.error('❌ env.local key signing failed:', err);
}
