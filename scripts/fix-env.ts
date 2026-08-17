import * as fs from 'fs';

const jsonContent = JSON.parse(fs.readFileSync('gen-lang-client-0978854262-e8f0fb76330b.json', 'utf8'));

const envContent = `# Rekod Kaunter - Environment Variables
ADMIN_PASSWORD=admin123
HASH_SALT=kaunter-record-hash-salt-2026-secret-key-perkeso
PIN_SALT=kaunter-record-pin-salt-2026-secret-key-perkeso

# Google Sheets Configuration
GOOGLE_SPREADSHEET_ID=1HEXrd6bydGYCcEwUqu-ftQVf5mhrVkwy7cDzwal03no
GOOGLE_SERVICE_ACCOUNT_EMAIL="${jsonContent.client_email}"
GOOGLE_PRIVATE_KEY=${JSON.stringify(jsonContent.private_key)}
`;

fs.writeFileSync('.env.local', envContent, 'utf8');
console.log('✅ .env.local successfully created from JSON file without any escaping corruptions!');
