Sistem Rekod Kehadiran & Bantuan Kaunter

Pejabat: PERKESO Keningau
Versi: 1.0
Tarikh: 2026

1️⃣ Tujuan Sistem

Sistem ini dibangunkan untuk:

Merekod kehadiran anggota bertugas di kaunter (sesi pagi & petang)

Merekod aktiviti / bantuan kaunter oleh anggota lain ketika waktu sibuk

Menyediakan dashboard analitik bagi tujuan penilaian rasmi prestasi tahunan

Menyediakan laporan PDF rasmi yang boleh digunakan dalam mesyuarat dan audit dalaman

Sistem ini bertujuan memastikan rekod yang adil, telus, dan boleh diaudit.

2️⃣ Skop Sistem
Termasuk:

Rekod kehadiran sesi pagi

Rekod kehadiran sesi petang

Rekod aktiviti / bantuan kaunter dengan remark wajib

Pengiraan durasi aktiviti / bantuan

Dashboard statistik

Export PDF rasmi

Mekanisme integriti data (hash chain)

Append-only audit log

Tidak termasuk:

Ranking terbuka antara anggota

Auto laporan bulanan

Integrasi Slack / Jira / sistem luar

Penilaian automatik oleh AI

3️⃣ Pengguna Sistem
3.1 Pengguna Biasa (Anggota)

Merekod kehadiran

Merekod aktiviti / bantuan

Tiada akses kepada dashboard keseluruhan

3.2 Admin

Akses dashboard penuh

Export PDF rasmi

Melihat status integriti data

4️⃣ Senarai Anggota

Jumlah anggota aktif: 17 orang
Gred: 10 – 22

(Senarai penuh disimpan dalam Google Sheet – Sheet: ANGGOTA)

5️⃣ Keperluan Fungsional
5.1 Kehadiran

Anggota memilih nama dari senarai

Masukkan PIN

Pilih sesi (PAGI / PETANG)

Sistem merekod:

server timestamp

tarikh

sesi

anggota_id

Maksimum satu rekod per sesi per hari

5.2 Aktiviti / Bantuan Kaunter

Anggota memilih nama

Masukkan PIN

Isi remark (minimum 20 aksara)

Tekan “Mula”

Tekan “Tamat”

Sistem mengira durasi

Minimum durasi: 3 minit

Tidak dibenarkan aktiviti / bantuan bertindih

5.3 Dashboard

Dashboard mesti memaparkan:

Ringkasan

Jumlah kehadiran pagi

Jumlah kehadiran petang

Jumlah aktiviti / bantuan

Jumlah durasi aktiviti / bantuan

Purata durasi

Statistik Individu

Kehadiran per sesi

Bilangan aktiviti / bantuan

Total durasi

Purata durasi

Audit

Rekod durasi kurang dari 3 minit

Remark pendek

Status hash chain

5.4 Export PDF

PDF mesti mengandungi:

Ringkasan statistik

Jadual individu

Tempoh laporan

Status integriti data

Tarikh laporan dijana

PDF dijana server-side.

6️⃣ Keperluan Bukan Fungsional
6.1 Integriti Data

Semua log adalah append-only

Tiada edit atau delete

Pembetulan melalui rekod baharu (CORRECTION)

Hash chain untuk mengesan manipulasi

6.2 Keselamatan

PIN disimpan sebagai hash

Google API key tidak didedahkan di frontend

Timestamp dijana server-side sahaja

Dashboard dilindungi password admin

Session menggunakan HTTP-only cookie

6.3 Prestasi

Sistem mesti berfungsi dengan 17–50 pengguna

Respons API < 2 saat dalam rangkaian pejabat biasa

7️⃣ Struktur Data
Sheet: ANGGOTA

| anggota_id | nama | gred | pin_hash | status |

Sheet: LOG (Append-only)

| record_id | server_ts | jenis | tarikh | sesi | anggota_id | nama | gred | remark | bantuan_start | bantuan_end | durasi_min | prev_hash | hash | status | ref_record_id |

8️⃣ Mekanisme Integriti (Hash Chain)

Setiap rekod baharu:

hash = SHA256(prev_hash + record_id + server_ts + payload_json + HASH_SALT)

Tujuan:

Mengelakkan manipulasi data

Mengesan perubahan manual dalam Google Sheet

Menyediakan bukti audit

9️⃣ Risiko & Mitigasi
Risiko	Mitigasi
Anggota guna nama orang lain	PIN wajib
Remark tidak bermakna	Minimum 20 aksara
Aktiviti / Bantuan palsu	Minimum 3 minit
Manipulasi Google Sheet	Hash chain
Akses dashboard tanpa kebenaran	Password + HTTP-only cookie
🔟 Batasan Sistem

Bergantung kepada Google Sheets API quota

Tidak sesuai untuk skala ratusan pengguna tanpa migrasi database

Bukan sistem HR penuh

1️⃣1️⃣ Status Rasmi

Sistem ini digunakan sebagai bahan sokongan penilaian prestasi tahunan dan tertakluk kepada audit