# 23 — PPh 21 Planning

Status: **DISETUJUI owner 2026-11-06** — ringkasan aturan di `02_BUSINESS_RULES.md` PAY-037; dokumen ini menyimpan detail rumus, contoh uji, dan tabel TER. Tidak ada karyawan dibayar harian di luar payroll (TER harian tidak dipakai).

Keputusan owner 2026-11-04: PPh 21 dihitung penuh di aplikasi (bukan di Accurate). Accurate tetap hanya menerima Jurnal Penggajian (PAY-025). Tahap pertama: Rekap Penghasilan (PAY-036) — **selesai**.

---

## 1. Kondisi Sekarang

| Bagian | Kondisi |
|---|---|
| Payroll | Gaji pokok, tunjangan, transport, uang makan, komisi, lembur, kerja hari libur, bonus omset, payout cuti, potongan alpha/terlambat, BPJS JHT/JP/Kesehatan karyawan, kasbon. **Tanpa PPh 21.** |
| BPJS perusahaan | Setting gaji punya JHT, JP, Kesehatan bagian perusahaan. **JKK dan JKM belum ada.** |
| Data karyawan | Ada `nikKtp`. **Belum ada** status PTKP dan jenis pegawai. |
| Jurnal Accurate | Tidak ada baris Utang PPh 21. |
| Rekap Penghasilan | Ada (PAY-036). |

---

## 2. Keputusan Owner (2026-11-06)

| # | Pertanyaan | Keputusan |
|---|---|---|
| 1 | Siapa menanggung PPh 21 | **Gross** — dipotong dari gaji karyawan |
| 2 | Mulai berlaku | **Slip yang dibayar Januari 2027** dan sesudahnya |
| 3 | Komponen bruto | **Semua penghasilan karyawan masuk bruto; potongan alpha/terlambat mengurangi bruto** |
| 4 | Bulan pajak slip | **Bulan tanggal gajian (tanggal bayar)** |
| 5 | JKK & JKM | **Dibayar perusahaan** — ditambahkan di Setting Gaji, persen diisi sendiri |
| 6 | Perubahan database | **Disetujui** |
| 7 | Iuran BPJS Kesehatan karyawan | **Ikut aturan resmi** — tidak dikurangkan di hitungan tahunan |
| 8 | Akun Utang PPh 21 | Dipilih di pengaturan akun payroll |
| 9 | KLU / insentif 2026 | Tidak masuk sistem |
| 10 | PTKP 2027 baru | Diabaikan sampai terbit; nilai PTKP disimpan sebagai pengaturan yang bisa diubah |
| 11 | Insentif DTP 2027 | Menunggu PMK terbit; ditangani setelah ada aturannya |

---

## 3. Draft Aturan PPh 21 (calon PAY-037)

Dasar: PP 58/2023, PMK 168/2023, UU HPP (tarif Pasal 17). Poin bertanda **[konfirmasi konsultan]** mengikuti pemahaman ketentuan resmi; mohon dicek.

### 3.1 Ruang lingkup
- Berlaku untuk slip dengan **tanggal gajian ≥ 1 Januari 2027**. Slip sebelum itu tidak dihitung PPh 21.
- Skema **gross**: PPh 21 menjadi potongan di slip (item `pph21`).

### 3.2 Data karyawan (baru)
- **Status PTKP**: TK/0, TK/1, TK/2, TK/3, K/0, K/1, K/2, K/3 — keadaan per 1 Januari; Finance memperbarui setiap Januari.
- **Jenis pegawai**: Tetap / Tidak Tetap.
- **NIK** (sudah ada).
- Payroll karyawan dengan status PTKP kosong **tidak bisa disetujui** (pesan: lengkapi status PTKP).

### 3.3 Masa pajak
- Masa pajak = **bulan tanggal gajian** slip (= sehari setelah akhir periode).
  - Contoh payDay 1: Gaji Desember 2026 (kerja 1–31 Des) dibayar 1 Jan 2027 → masa **Januari 2027** → slip pertama yang kena PPh 21.
  - Gaji November 2027 dibayar 1 Des 2027 → masa **Desember 2027** → masa terakhir (hitung ulang setahun).
- Bila dua slip karyawan jatuh di masa yang sama (mode rentang tanggal), bruto keduanya dijumlahkan; PPh slip kedua = PPh atas total − PPh slip pertama.

### 3.4 Penghasilan bruto per slip
```
Semua item penghasilan slip
  (gaji, tunjangan, transport, uang makan, komisi, lembur, kerja hari libur,
   bonus omset, payout cuti, item manual penghasilan)
− Potongan alpha − Potongan terlambat
+ BPJS Kesehatan bagian perusahaan
+ JKK + JKM (dibayar perusahaan)
= Bruto
```
- **Tidak** menambah bruto: JHT & JP bagian perusahaan.
- **Tidak** mengurangi bruto: iuran JHT/JP/Kesehatan karyawan, kasbon.
- Dasar BPJS perusahaan (termasuk JKK/JKM) = gaji pokok penuh, sama dengan Laporan BPJS & jurnal (PAY-001).

### 3.5 Pegawai tetap — masa selain masa terakhir
```
PPh 21 = Bruto masa × TER bulanan
```
Kategori TER: **A** = TK/0, TK/1, K/0 · **B** = TK/2, TK/3, K/1, K/2 · **C** = K/3. Tabel di Bagian 6.

### 3.6 Pegawai tetap — masa terakhir
Masa terakhir = **Desember**, atau **slip terakhir karyawan yang resign**.
```
Bruto setahun (semua masa dalam tahun itu)
− Biaya jabatan: 5% × bruto, maks Rp500.000 × jumlah bulan bekerja (maks Rp6.000.000)
− Iuran JHT + JP yang dibayar karyawan
= Neto setahun
− PTKP
= PKP (dibulatkan ke bawah ribuan; minus → 0)
× Tarif Pasal 17
= PPh 21 setahun
− PPh 21 yang sudah dipotong di masa sebelumnya tahun itu
= PPh 21 masa terakhir
```
- Karyawan masuk di tengah tahun: penghasilan **tidak disetahunkan** **[konfirmasi konsultan]**.
- Hasil minus (lebih potong) → dikembalikan ke karyawan di slip masa terakhir sebagai item penghasilan "Pengembalian PPh 21" (tidak masuk bruto) **[konfirmasi konsultan]**.

**PTKP setahun:** diri sendiri Rp54.000.000 · kawin +Rp4.500.000 · tanggungan +Rp4.500.000/orang (maks 3).

**Tarif Pasal 17:** s.d. Rp60 jt 5% · >60–250 jt 15% · >250–500 jt 25% · >500 jt–5 M 30% · >5 M 35%.

### 3.7 Pegawai tidak tetap
- Dibayar bulanan: `PPh 21 = Bruto × TER bulanan` sesuai PTKP, **tanpa** hitung ulang masa terakhir **[konfirmasi konsultan]**.
- (Upah harian tidak dipakai di payroll NIAHAIR — semua slip bulanan/rentang.)

### 3.8 Pembulatan
- PPh 21 per slip dibulatkan ke bawah ke rupiah penuh **[konfirmasi konsultan]**.

### 3.9 Slip, jurnal, laporan
- Slip & Slip Saya: baris "PPh 21" di potongan + keterangan kategori TER/tarif (atau "Hitung ulang tahunan" di masa terakhir).
- Jurnal Penggajian (PAY-025): **Kredit Utang PPh 21** sebesar PPh; Kas tetap = gaji bersih. Akun dipilih di pengaturan akun payroll; bila belum diisi, jurnal ditolak dengan pesan jelas.
- Rekap Penghasilan: tambah kolom JKK, JKM, Bruto Pajak, PPh 21.
- Laporan PPh 21 bulanan (per masa) dan tahunan (bahan bukti potong A1), export CSV. Lapor tetap manual di Coretax.

### 3.10 Setting yang bisa diubah tanpa ubah kode
- Tabel TER A/B/C, tarif Pasal 17, nilai PTKP, batas biaya jabatan.
- Persen JKK & JKM per Setting Gaji karyawan (diisi Finance).

---

## 4. Contoh Uji (dari owner, dikoreksi ke aturan resmi)

Dani — pegawai tetap, TK/0 (kategori A), gaji Rp15.000.000/bulan, iuran karyawan: BPJS Kesehatan Rp35.000, JHT Rp65.000, JP Rp65.000. Tanpa THR. (BPJS perusahaan dianggap 0 agar sama dengan contoh.)

| Masa | Perhitungan | PPh 21 |
|---|---|---|
| Jan–Nov | 15.000.000 × 6% (TER A baris 16) | **900.000** / bulan → 9.900.000 |
| Desember | lihat bawah | **1.866.000** |

```
Bruto setahun                 180.000.000
Biaya jabatan (maks)           (6.000.000)
Iuran JHT 65.000 × 12            (780.000)
Iuran JP  65.000 × 12            (780.000)
Neto setahun                  172.440.000
PTKP TK/0                     (54.000.000)
PKP                           118.440.000
PPh setahun: 5% × 60.000.000 = 3.000.000
             15% × 58.440.000 = 8.766.000
                              11.766.000
Sudah dipotong Jan–Nov         (9.900.000)
PPh Desember                   1.866.000
```
Catatan: contoh video mengurangkan BPJS Kesehatan karyawan (hasil 11.703.000 / Desember 1.803.000); sesuai keputusan #7 tidak dikurangkan.

---

## 5. Rencana Tahapan

| Tahap | Isi | Status |
|---|---|---|
| 0 | Rekap Penghasilan | ✅ selesai |
| 1 | Migration `20261106_pph21_setup`: Employee `ptkpStatus`, `taxEmploymentType`; SalarySetting `bpjsJkkEmployerPercent`, `bpjsJkmEmployerPercent`; Payroll `taxPeriod`, `taxPtkpStatus`, `taxGross`, `taxMethod`, `taxTerRate`, `pph21`; tabel `tax_settings` (seed 2024); akun `hutang_pph21`. Form karyawan & Setting Gaji. | ✅ selesai 2026-11-06 |
| 2 | `payroll.tax.js` (fungsi murni) + item `pph21` / `pph21_refund` saat generate/hitung ulang; masa terakhir; blokir approve tanpa PTKP | ✅ selesai 2026-11-06 |
| 3 | Detail payroll (info pajak + peringatan PTKP), slip & Slip Saya (baris PPh 21), Rekap Penghasilan (JKK, JKM, Bruto Pajak, PPh 21), Laporan BPJS (JKK, JKM) | ✅ selesai 2026-11-06 |
| 4 | Jurnal Accurate: kredit Utang PPh 21; lebih potong mendebit Utang PPh 21; JKK/JKM masuk BPJS perusahaan | ✅ selesai 2026-11-06 |
| 5 | Laporan PPh 21: bulanan BPMP/BP21 & tahunan A1, export CSV (kolom mengikuti template impor Coretax) | ✅ selesai 2026-11-06 |
| 6 | Unit test ✅ (contoh Dani, TER A/B/C, resign, lebih potong, masa sama, tidak tetap). Uji paralel: Laporan PPh 21 masa Nov/Des 2026 = mode uji coba + Lembar Uji Coba untuk hitungan manual | alat siap; menunggu data PTKP & hitungan konsultan |
| 7 | Insentif DTP 2027 — diabaikan dulu (keputusan owner 2026-11-06) | ditunda |
| 8 | Pengaturan → Tarif PPh 21: ubah PTKP, biaya jabatan, Pasal 17, TER A/B/C; tambah tahun pajak baru | ✅ selesai 2026-11-06 |

**Catatan template Coretax:** nama kolom export mengikuti field template impor bukti potong Coretax (TaxPeriodMonth, CounterpartTin, StatusTaxExemption, TaxObjectCode, Gross, Rate, IDPlaceOfBusinessActivity, WithholdingDate, …). Template Coretax bisa berubah — cocokkan dengan template terbaru sebelum unggah.

---

## 6. Tabel TER Bulanan (PP 58/2023)

Batas = "lebih dari batas bawah s.d. batas atas". Dua salah ketik di materi video sudah dikoreksi: kategori C baris 31 mulai 95.000.000 (bukan 95.600.000); baris 36 tarif 29% (bukan 39%).

**Kategori A** (TK/0, TK/1, K/0)

| Bruto bulanan (Rp) | TER | Bruto bulanan (Rp) | TER |
|---|---|---|---|
| s.d. 5.400.000 | 0% | 28.000.000 – 30.050.000 | 12% |
| 5.400.000 – 5.650.000 | 0,25% | 30.050.000 – 32.400.000 | 13% |
| 5.650.000 – 5.950.000 | 0,5% | 32.400.000 – 35.400.000 | 14% |
| 5.950.000 – 6.300.000 | 0,75% | 35.400.000 – 39.100.000 | 15% |
| 6.300.000 – 6.750.000 | 1% | 39.100.000 – 43.850.000 | 16% |
| 6.750.000 – 7.500.000 | 1,25% | 43.850.000 – 47.800.000 | 17% |
| 7.500.000 – 8.550.000 | 1,5% | 47.800.000 – 51.400.000 | 18% |
| 8.550.000 – 9.650.000 | 1,75% | 51.400.000 – 56.300.000 | 19% |
| 9.650.000 – 10.050.000 | 2% | 56.300.000 – 62.200.000 | 20% |
| 10.050.000 – 10.350.000 | 2,25% | 62.200.000 – 68.600.000 | 21% |
| 10.350.000 – 10.700.000 | 2,5% | 68.600.000 – 77.500.000 | 22% |
| 10.700.000 – 11.050.000 | 3% | 77.500.000 – 89.000.000 | 23% |
| 11.050.000 – 11.600.000 | 3,5% | 89.000.000 – 103.000.000 | 24% |
| 11.600.000 – 12.500.000 | 4% | 103.000.000 – 125.000.000 | 25% |
| 12.500.000 – 13.750.000 | 5% | 125.000.000 – 157.000.000 | 26% |
| 13.750.000 – 15.100.000 | 6% | 157.000.000 – 206.000.000 | 27% |
| 15.100.000 – 16.950.000 | 7% | 206.000.000 – 337.000.000 | 28% |
| 16.950.000 – 19.750.000 | 8% | 337.000.000 – 454.000.000 | 29% |
| 19.750.000 – 24.150.000 | 9% | 454.000.000 – 550.000.000 | 30% |
| 24.150.000 – 26.450.000 | 10% | 550.000.000 – 695.000.000 | 31% |
| 26.450.000 – 28.000.000 | 11% | 695.000.000 – 910.000.000 | 32% |
| | | 910.000.000 – 1.400.000.000 | 33% |
| | | di atas 1.400.000.000 | 34% |

**Kategori B** (TK/2, TK/3, K/1, K/2)

| Bruto bulanan (Rp) | TER | Bruto bulanan (Rp) | TER |
|---|---|---|---|
| s.d. 6.200.000 | 0% | 41.100.000 – 45.800.000 | 16% |
| 6.200.000 – 6.500.000 | 0,25% | 45.800.000 – 49.500.000 | 17% |
| 6.500.000 – 6.850.000 | 0,5% | 49.500.000 – 53.800.000 | 18% |
| 6.850.000 – 7.300.000 | 0,75% | 53.800.000 – 58.500.000 | 19% |
| 7.300.000 – 9.200.000 | 1% | 58.500.000 – 64.000.000 | 20% |
| 9.200.000 – 10.750.000 | 1,5% | 64.000.000 – 71.000.000 | 21% |
| 10.750.000 – 11.250.000 | 2% | 71.000.000 – 80.000.000 | 22% |
| 11.250.000 – 11.600.000 | 2,5% | 80.000.000 – 93.000.000 | 23% |
| 11.600.000 – 12.600.000 | 3% | 93.000.000 – 109.000.000 | 24% |
| 12.600.000 – 13.600.000 | 4% | 109.000.000 – 129.000.000 | 25% |
| 13.600.000 – 14.950.000 | 5% | 129.000.000 – 163.000.000 | 26% |
| 14.950.000 – 16.400.000 | 6% | 163.000.000 – 211.000.000 | 27% |
| 16.400.000 – 18.450.000 | 7% | 211.000.000 – 374.000.000 | 28% |
| 18.450.000 – 21.850.000 | 8% | 374.000.000 – 459.000.000 | 29% |
| 21.850.000 – 26.000.000 | 9% | 459.000.000 – 555.000.000 | 30% |
| 26.000.000 – 27.700.000 | 10% | 555.000.000 – 704.000.000 | 31% |
| 27.700.000 – 29.350.000 | 11% | 704.000.000 – 957.000.000 | 32% |
| 29.350.000 – 31.450.000 | 12% | 957.000.000 – 1.405.000.000 | 33% |
| 31.450.000 – 33.950.000 | 13% | di atas 1.405.000.000 | 34% |
| 33.950.000 – 37.100.000 | 14% | | |
| 37.100.000 – 41.100.000 | 15% | | |

**Kategori C** (K/3)

| Bruto bulanan (Rp) | TER | Bruto bulanan (Rp) | TER |
|---|---|---|---|
| s.d. 6.600.000 | 0% | 38.900.000 – 43.000.000 | 15% |
| 6.600.000 – 6.950.000 | 0,25% | 43.000.000 – 47.400.000 | 16% |
| 6.950.000 – 7.350.000 | 0,5% | 47.400.000 – 51.200.000 | 17% |
| 7.350.000 – 7.800.000 | 0,75% | 51.200.000 – 55.800.000 | 18% |
| 7.800.000 – 8.850.000 | 1% | 55.800.000 – 60.400.000 | 19% |
| 8.850.000 – 9.800.000 | 1,25% | 60.400.000 – 66.700.000 | 20% |
| 9.800.000 – 10.950.000 | 1,5% | 66.700.000 – 74.500.000 | 21% |
| 10.950.000 – 11.200.000 | 1,75% | 74.500.000 – 83.200.000 | 22% |
| 11.200.000 – 12.050.000 | 2% | 83.200.000 – 95.000.000 | 23% |
| 12.050.000 – 12.950.000 | 3% | 95.000.000 – 110.000.000 | 24% |
| 12.950.000 – 14.150.000 | 4% | 110.000.000 – 134.000.000 | 25% |
| 14.150.000 – 15.550.000 | 5% | 134.000.000 – 169.000.000 | 26% |
| 15.550.000 – 17.050.000 | 6% | 169.000.000 – 221.000.000 | 27% |
| 17.050.000 – 19.500.000 | 7% | 221.000.000 – 390.000.000 | 28% |
| 19.500.000 – 22.700.000 | 8% | 390.000.000 – 463.000.000 | 29% |
| 22.700.000 – 26.600.000 | 9% | 463.000.000 – 561.000.000 | 30% |
| 26.600.000 – 28.100.000 | 10% | 561.000.000 – 709.000.000 | 31% |
| 28.100.000 – 30.100.000 | 11% | 709.000.000 – 965.000.000 | 32% |
| 30.100.000 – 32.600.000 | 12% | 965.000.000 – 1.419.000.000 | 33% |
| 32.600.000 – 35.400.000 | 13% | di atas 1.419.000.000 | 34% |
| 35.400.000 – 38.900.000 | 14% | | |
