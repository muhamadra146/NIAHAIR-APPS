# Tugas: Implementasi Sistem Komisi NIAHAIR

## ATURAN KERJA — BACA DULU, JANGAN LANGSUNG CODING

1. Baca `backend/prisma/schema.prisma` (atau lokasi schema Prisma di repo ini). Model commission yang relevan: `Commission`, `CommissionRule`, `CommissionCategory`, `TreatmentAssignment`, `TreatmentItem`, `TreatmentSession`, `InvoiceItem`, `Item`, `Employee`.
2. JANGAN tulis kode implementasi atau jalankan migrasi di langkah pertama. Sebagai output pertama, berikan: (a) rencana perubahan schema, (b) rencana logika kalkulasi, (c) daftar pertanyaan/ambiguitas yang kamu temukan, lalu BERHENTI dan tunggu approval.
3. Setelah aku approve, kerjakan bertahap: schema dulu → migrasi → fungsi kalkulasi → test. Tunjukkan diff sebelum apply.
4. Tulis unit test dengan contoh nota nyata (ada di bawah) SEBELUM dianggap selesai. Math harus terbukti lewat test, bukan asumsi.

## KONTEKS BISNIS

Salon. Setiap nota (Invoice) bisa berisi beberapa treatment. Setiap treatment dikerjakan oleh satu atau lebih employee dengan peran tertentu. Komisi dihitung per peran per treatment.

### Prinsip kalkulasi (SUDAH FINAL — jangan diubah/ditebak)

- Base komisi = harga treatment **setelah diskon, sebelum PPN**. JANGAN pakai grandTotal nota. Ambil harga item pre-tax dari `InvoiceItem` (price/discount, abaikan taxRate untuk base komisi).
- Komisi per peran = persentase fixed dari base tersebut. "Helaian" hanya cara ukur, bukan rate rupiah-per-helai.
- Jika SATU peran diisi LEBIH DARI SATU orang: jatah persentase peran itu dibagi proporsional berdasarkan jumlah helai yang dikerjakan tiap orang. Simpan jumlah helai di `TreatmentAssignment.workQty`, simpan rasio di `Commission.workRatio`.
- SATU orang boleh memegang LEBIH DARI SATU peran di satu nota dan mendapat komisi untuk tiap peran (boleh dobel).

### Tabel komisi per service × peran (persen dari base)

PASANG BARU:
- Pemasang 2%, Asisten 1%

SERVICE (rambut NH / rambut luar):
- Pemasang jika kerja sendiri: 5%
- Pemasang jika di-handle >1 orang: 5% (dibagi per helai antar pemasang)
- Asisten (sendiri / >1 orang / colorist senior jadi asisten / colorist junior jadi asisten): 2,5%

REMOVE, SERVICE LEM, HAIRSPA/CREAMBATH:
- Pemasang 1%, Asisten 1%, Colorist senior perbantuan 1%, Colorist junior perbantuan 1%

CUCI & STYLING (termasuk cuci blow, styling tanpa cuci):
- 10% total. Jika dikerjakan sendiri → 1 orang dapat 10%. Jika diperbantukan → 10% dibagi antar tim yang mengerjakan (proporsional helai).

CUTTING:
- Senior 20%, Junior 15%

COLOR:
- Colorist senior 15%, Colorist junior 7,5%
- "Komisi Indah" jika handle color: 7,5%

### Aturan Surya & Ulvi (pengganti colorist) — FINAL

Penentuan "ada colorist atau tidak" dibaca dari jadwal kerja hari itu (StaffSchedule). 
CATATAN PENTING (sampaikan ke user di rencanamu): membaca dari jadwal berarti "colorist dijadwalkan masuk", BUKAN "colorist mengerjakan nota ini". Ini bisa salah jika colorist hadir tapi tidak menangani treatment color tertentu. Alternatif yang lebih akurat: cek apakah ada employee ber-peran colorist di TreatmentAssignment nota tsb. Tawarkan kedua opsi ini ke user di output rencana dan minta konfirmasi sebelum implementasi.

Aturan:
- COLOR: jika ADA colorist → Surya/Ulvi tidak dapat komisi color. Jika TIDAK ada colorist → Surya/Ulvi dapat 7,5%.
- KERATIN: jika ADA colorist → Surya/Ulvi 5%. Jika TIDAK ada colorist → Surya/Ulvi 7,5%.

### Service lain yang juga dapat komisi (pakai pola di atas; jika tidak ada di tabel, tanyakan)

keratin, bleaching, highlight, perming, smoothing — persentasenya BELUM didefinisikan eksplisit selain keratin (Surya/Ulvi). MASUKKAN INI KE DAFTAR PERTANYAANMU. Jangan tebak.

### Charge lembur

Jika client kena charge lembur, 50% untuk perusahaan dan 50% dibagi antar tim yang ikut lembur (proporsional / rata — TANYAKAN mana yang benar). Contoh: charge Rp 350.000 → Rp 175.000 perusahaan, Rp 175.000 dibagi tim. Belum ada model untuk ini di schema — rancang tabel baru `OvertimeCharge` + relasi ke nota dan ke employee.

### Pemotongan komisi (bukan pemotongan gaji)

- Jika tim tidak report di hari yang sama → komisi HANGUS (NON KOMISI) untuk nota itu.
- Jika client komplen dan diperbaiki oleh stylist/asisten berbeda → komisi di-update manual oleh CS. Sediakan mekanisme override manual + audit.

## PERUBAHAN SCHEMA YANG SUDAH DIKETAHUI (verifikasi & masukkan ke rencana)

1. Model `Commission` saat ini punya `@@unique([treatmentAssignmentId])`. Ini HARUS dihapus/diubah — satu assignment masih unik, tapi pastikan satu orang dengan banyak peran = banyak assignment = banyak commission tidak terblok. Periksa apakah constraint ini menghalangi multi-peran dan multi-orang-per-peran.
2. `CommissionType` saat ini hanya PERCENTAGE / FIXED_AMOUNT. Karena semua model sekarang persen-dari-base, kemungkinan cukup. Tapi POOL (cuci & styling 10% dibagi) butuh penanda model perhitungan. Tambahkan enum `calcModel` di `CommissionRule` (mis. FIXED_PERCENT, POOL_SHARE) ATAU usulkan pendekatan lain dan jelaskan trade-off.
3. `TreatmentAssignment.workQty` akan menyimpan jumlah helai untuk split proporsional. Konfirmasi tipe (Decimal sudah ada) dan tambah dokumentasi/komentar.
4. Tambah field flag "sudah report di hari yang sama" untuk aturan komisi hangus — atau tentukan dari timestamp. Usulkan.
5. Tabel baru `OvertimeCharge`.
6. Peran (pemasang / asisten / colorist senior / colorist junior) harus terstandar. Sekarang ada `slotKey` String yang artinya tidak terdokumentasi. Usulkan enum peran yang jelas atau dokumentasikan slotKey.

## CONTOH NOTA UNTUK TEST (math harus cocok)

Test 1 — split per helai dalam satu peran:
Service rambut NH, base Rp 1.000.000. Peran asisten = 2,5% = Rp 25.000. Diisi 2 asisten: A kerja 300 helai, B kerja 200 helai.
Ekspektasi: A = 25.000 × 300/500 = Rp 15.000; B = Rp 10.000.

Test 2 — satu orang dua peran:
Color, base Rp 2.000.000, dikerjakan oleh Budi yang sekaligus colorist senior (15%) DAN pemasang... (sesuaikan dgn peran yg relevan di service color). Pastikan Budi dapat dua baris komisi.

Test 3 — Surya pengganti:
Treatment color base Rp 1.000.000, tidak ada colorist di jadwal hari itu, Surya mengerjakan. Ekspektasi Surya = 7,5% = Rp 75.000.

Test 4 — keratin dengan colorist:
Keratin base Rp 2.000.000, ada colorist di jadwal, Surya membantu. Ekspektasi Surya = 5% = Rp 100.000.

Test 5 — base after discount before PPN:
Item harga Rp 1.000.000, diskon Rp 100.000, PPN 11%. Base komisi = Rp 900.000 (BUKAN 900.000 × 1,11). Komisi pemasang pasang baru 2% = Rp 18.000.

## OUTPUT YANG AKU HARAPKAN DI LANGKAH PERTAMA

1. Ringkasan model data yang akan kamu ubah/tambah (diff schema usulan).
2. Pseudocode fungsi kalkulasi komisi per nota.
3. Daftar SEMUA ambiguitas yang masih kamu temukan (minimal: persentase bleaching/highlight/perming/smoothing, overtime split rata vs proporsional, model "colorist ready" jadwal vs assignment).
4. JANGAN apply apa pun sampai aku jawab. Tunggu approval.