import { config } from 'dotenv';
config({ path: '.env.local' });

import { google } from 'googleapis';

async function testKey() {
  const rawKey = process.env.GOOGLE_PRIVATE_KEY || '';
  console.log('Raw key length:', rawKey.length);
  console.log('Raw key starts with:', JSON.stringify(rawKey.substring(0, 30)));
  console.log('Raw key ends with:', JSON.stringify(rawKey.substring(rawKey.length - 30)));

  // Try parsing key
  let formattedKey = rawKey.replace(/\\n/g, '\n');
  if (formattedKey.startsWith('"') && formattedKey.endsWith('"')) {
    formattedKey = formattedKey.slice(1, -1);
  }

  console.log('Formatted key starts with:', JSON.stringify(formattedKey.substring(0, 30)));
  console.log('Formatted key ends with:', JSON.stringify(formattedKey.substring(formattedKey.length - 30)));
  console.log('Includes real newlines count:', formattedKey.split('\n').length);

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: formattedKey,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  await auth.getClient();
  console.log('Client successfully authenticated!');
}

testKey().catch((err) => {
  console.error('Test key failed:', err);
});
