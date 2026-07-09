# CHAPTER 1 — GENERAL BUSINESS RULES

---

# 1.1 Purpose

Chapter ini mendefinisikan aturan bisnis global yang berlaku untuk seluruh modul NIAHAIR ERP.

Seluruh module wajib mengikuti aturan pada chapter ini tanpa pengecualian kecuali disebutkan secara eksplisit.

Apabila terdapat konflik antara aturan modul dengan General Rules, maka General Rules memiliki prioritas lebih tinggi.

---

# GEN-001
## Business First

### Purpose

Seluruh keputusan sistem harus mengutamakan kebutuhan operasional bisnis.

### Rule

Business Process selalu lebih penting daripada implementasi teknis.

### Applies To

Semua Module

---

# GEN-002
## Single Source of Truth

### Purpose

Menghindari inkonsistensi data.

### Rule

Setiap jenis data hanya memiliki satu sumber utama.

### Examples

Customer → Customer Module

Employee → Employee Module

Inventory → Inventory Module

Invoice → Finance Module

Treatment → Treatment Module

### Validation

Tidak boleh ada tabel lain yang menjadi sumber utama data yang sama.

---

# GEN-003
## Immutable Transaction

### Purpose

Menjamin audit trail.

### Rule

Transaction berikut tidak boleh diedit.

- Inventory Movement
- Payment
- Commission
- Payroll
- Audit Log
- Sync Log

Jika terjadi kesalahan.

Harus dibuat transaksi koreksi.

Tidak boleh UPDATE data historis.

---

# GEN-004
## Audit Required

### Rule

Seluruh transaksi penting wajib memiliki audit.

Minimal.

- Created By
- Created At

Jika data dapat diubah.

Tambahkan.

- Updated By
- Updated At

Jika transaksi kritikal.

Tambahkan.

- Reason

---

# GEN-005
## Branch Ownership

### Rule

Seluruh transaksi operasional wajib memiliki Branch.

Contoh.

Appointment

Treatment

Invoice

Payment

Attendance

Inventory

Exception.

Master Data Global.

---

# GEN-006
## UUID Standard

### Rule

Seluruh Primary Key menggunakan UUID.

Tidak menggunakan Auto Increment.

---

# GEN-007
## Soft Delete Policy

### Rule

Master Data tidak boleh Hard Delete.

Gunakan.

isActive

atau

deletedAt

Hard Delete hanya diperbolehkan untuk.

- Temporary File
- Cache
- Failed Queue
- Testing Data

---

# GEN-008
## Status Workflow

### Rule

Status tidak boleh melompati workflow.

Contoh.

BOOKED

↓

CHECK_IN

↓

IN_PROGRESS

↓

COMPLETED

Tidak boleh.

BOOKED

↓

COMPLETED

langsung.

---

# GEN-009
## Business Validation

### Rule

Semua Business Validation dilakukan di Backend.

Frontend hanya membantu UX.

Backend tetap menjadi sumber validasi.

---

# GEN-010
## Transaction Safety

### Rule

Semua operasi multi tabel wajib menggunakan Database Transaction.

Jika satu proses gagal.

Seluruh transaksi dibatalkan.

---

# GEN-011
## Multi Branch Ready

### Rule

Seluruh fitur baru harus mempertimbangkan Multi Branch.

Developer tidak boleh membuat fitur yang hanya bekerja pada satu branch.

---

# GEN-012
## Multi Warehouse Ready

### Rule

Seluruh fitur Inventory harus mendukung Multi Warehouse.

Warehouse tidak sama dengan Branch.

---

# GEN-013
## Permission Required

### Rule

Seluruh endpoint harus memiliki validasi Permission.

Frontend tidak boleh menjadi satu-satunya validasi.

---

# GEN-014
## Authentication Required

### Rule

Seluruh endpoint bisnis memerlukan Authentication.

Exception.

Login.

Health Check.

Public API tertentu.

---

# GEN-015
## Branch Access Validation

### Rule

User hanya dapat mengakses Branch yang dimiliki.

SUPER_ADMIN dapat mengakses seluruh Branch.

---

# GEN-016
## ERP Workflow

### Rule

Seluruh transaksi mengikuti workflow ERP.

Customer

↓

Appointment

↓

Treatment

↓

Inventory

↓

Invoice

↓

Payment

↓

Commission

↓

Payroll

Tidak boleh dibalik.

---

# GEN-017
## Event Driven

### Rule

Perubahan besar menghasilkan Business Event.

Contoh.

Treatment Completed.

↓

Inventory Movement.

↓

Commission.

↓

Customer Timeline.

---

# GEN-018
## Inventory Integrity

### Rule

Inventory tidak boleh berubah secara langsung.

Seluruh perubahan Inventory berasal dari Inventory Movement.

---

# GEN-019
## Financial Integrity

### Rule

Invoice.

Payment.

Deposit.

Commission.

Payroll.

Harus selalu dapat ditelusuri asal transaksinya.

---

# GEN-020
## No Duplicate Transaction

### Rule

Seluruh transaksi harus bersifat Idempotent jika memungkinkan.

Contoh.

Inventory Generation.

Commission Generation.

Sync Accurate.

Payment Callback.

---

# GEN-021
## Time Standard

### Rule

Semua waktu menggunakan UTC di database.

Frontend melakukan konversi ke timezone pengguna.

---

# GEN-022
## Currency Standard

### Rule

Seluruh transaksi menggunakan mata uang dasar perusahaan.

Future.

Multi Currency.

---

# GEN-023
## Decimal Precision

### Rule

Seluruh Quantity.

Weight.

Price.

Cost.

Menggunakan Decimal.

Tidak menggunakan Float.

---

# GEN-024
## Read vs Write

### Rule

Data Reporting tidak boleh mengubah transaksi.

Reporting hanya membaca.

---

# GEN-025
## Configuration Driven

### Rule

Nilai yang sering berubah harus berasal dari Configuration.

Bukan Hardcoded.

---

# GEN-026
## Responsive Required

### Rule

Seluruh halaman wajib dapat digunakan pada.

Desktop.

Tablet.

Mobile.

---

# GEN-027
## Accessibility

### Rule

Seluruh halaman minimal memenuhi.

Keyboard Navigation.

Focus Ring.

Contrast.

---

# GEN-028
## Performance Target

### Rule

Operasional harian.

Search.

Save.

Update.

Harus terasa instan.

Target.

<500ms.

---

# GEN-029
## Documentation Required

### Rule

Perubahan Business Rule wajib memperbarui.

Business Rules.

Blueprint.

Architecture Decision.

Jika diperlukan.

---

# GEN-030
## Blueprint Compliance

### Rule

Seluruh implementasi harus mengikuti.

ERP Blueprint.

Business Rules.

Architecture Decisions.

Jika implementasi berbeda.

Blueprint harus diperbarui terlebih dahulu.

---

# CHAPTER 1 SUMMARY

Chapter ini berlaku untuk seluruh domain:

- CRM
- Customer
- Employee
- Appointment
- Schedule
- Treatment
- Inventory
- Finance
- HR
- Production
- Administration
- Platform Services

Tidak ada modul yang boleh melanggar General Business Rules kecuali disebutkan secara eksplisit dalam dokumentasi.

# CHAPTER 2 — CUSTOMER BUSINESS RULES

---

# 2.1 Purpose

Customer merupakan pusat seluruh aktivitas bisnis NIAHAIR ERP.

Seluruh transaksi bisnis harus selalu berhubungan dengan Customer.

Customer bukan hanya identitas, tetapi merupakan sumber riwayat layanan, transaksi, pembayaran, dan hubungan bisnis jangka panjang.

---

# CRM-001
## Customer Identity

### Purpose

Menjamin setiap customer memiliki identitas tunggal.

### Business Rule

Satu customer hanya boleh memiliki satu identitas dalam sistem.

Tidak boleh membuat customer baru apabila customer yang sama sudah ada.

### Validation

Backend wajib melakukan pencarian berdasarkan:

- Mobile Phone
- WhatsApp
- Email (jika tersedia)

### Exception

SUPER_ADMIN tetap tidak diperbolehkan membuat customer duplikat.

### Related

Appointment

Invoice

Deposit

Treatment

---

# CRM-002
## Customer Number

### Purpose

Seluruh customer memiliki nomor unik.

### Rule

Customer Number dibuat otomatis oleh sistem.

Format mengikuti konfigurasi perusahaan.

Contoh.

```
CUS-000001
```

Nomor customer tidak boleh berubah setelah dibuat.

---

# CRM-003
## Customer Status

Customer memiliki status.

ACTIVE

INACTIVE

BLACKLIST (Future)

DELETED (Soft Delete)

Customer INACTIVE tidak dapat membuat Appointment baru.

History tetap dapat dilihat.

---

# CRM-004
## Customer Cannot Be Hard Deleted

Customer tidak boleh dihapus secara permanen.

Gunakan:

isActive = false

atau

deletedAt

Karena Customer memiliki relasi dengan transaksi bisnis.

---

# CRM-005
## Customer Phone Number

Nomor telepon merupakan identitas utama customer.

Nomor telepon harus unik.

Format mengikuti standar Indonesia.

Contoh.

```
08xxxxxxxxxx

atau

628xxxxxxxxxx
```

---

# CRM-006
## Customer Timeline

Setiap aktivitas customer harus masuk Timeline.

Minimal.

- Customer Created
- Appointment Created
- Appointment Cancelled
- Check In
- Treatment Started
- Treatment Completed
- Invoice Created
- Deposit Applied
- Payment Received

Timeline tidak boleh diedit.

---

# CRM-007
## Customer 360

Customer Detail harus menampilkan.

Overview

Appointment

Treatment

Invoice

Payment

Deposit

Photos

Timeline

Notes

Semua berasal dari data transaksi.

Tidak boleh disimpan secara duplikat.

---

# CRM-008
## Customer Notes

Customer dapat memiliki banyak Notes.

Setiap Note memiliki.

- Author
- Created At
- Content

Note tidak boleh diubah tanpa audit.

---

# CRM-009
## Customer Photos

Customer dapat memiliki banyak foto.

Jenis.

Profile

Reference Hair

Hair Condition

Before

After

Semua media disimpan di Cloudinary.

---

# CRM-010
## Customer Appointment History

Seluruh Appointment menjadi bagian dari riwayat Customer.

Appointment tidak boleh dipindahkan ke Customer lain.

---

# CRM-011
## Customer Treatment History

Seluruh Treatment menjadi bagian permanen Customer History.

Treatment tidak boleh dihapus.

---

# CRM-012
## Customer Financial History

Customer memiliki histori.

Invoice

Deposit

Payment

Refund (Future)

Semua histori bersifat immutable.

---

# CRM-013
## Customer Merge (Future)

Jika terdapat Customer duplikat.

Gunakan Merge.

Bukan Delete.

Seluruh transaksi dipindahkan.

Customer lama menjadi.

MERGED

---

# CRM-014
## Customer Membership

Future.

Satu Customer hanya memiliki satu Membership aktif.

Membership mempengaruhi.

Harga

Benefit

Promo

---

# CRM-015
## Customer Loyalty

Future.

Point hanya bertambah melalui transaksi valid.

Point tidak boleh diinput manual.

---

# CRM-016
## Customer Blacklist

Future.

Customer dapat diblokir.

Customer BLACKLIST tidak dapat.

Booking

Treatment

Invoice

Sebelum status dicabut.

---

# CRM-017
## Customer Search

Customer dapat dicari berdasarkan.

Customer Number

Nama

Nomor HP

WhatsApp

Email

Search harus cepat.

Target.

<300ms

---

# CRM-018
## Customer Ownership

Customer bersifat Global.

Tidak dimiliki oleh satu Branch.

Seluruh Branch dapat melayani Customer yang sama.

History tetap menunjukkan Branch asal transaksi.

---

# CRM-019
## Customer Branch History

Customer tidak memiliki Home Branch.

Customer dapat bertransaksi di banyak Branch.

Seluruh transaksi tetap menyimpan Branch masing-masing.

---

# CRM-020
## Customer Birth Date

Tanggal lahir bersifat opsional.

Jika tersedia.

Digunakan untuk.

Birthday Reminder

Birthday Promotion

Customer Analytics

---

# CRM-021
## Customer Gender

Gender digunakan untuk.

Reporting

Marketing

Analytics

Tidak mempengaruhi workflow bisnis.

---

# CRM-022
## Customer Contact Information

Customer dapat memiliki.

Phone

WhatsApp

Email

Address

City

Province

Semua bersifat editable.

Perubahan harus memiliki Updated At.

---

# CRM-023
## Customer Active Validation

Appointment baru hanya dapat dibuat untuk Customer ACTIVE.

Jika Customer INACTIVE.

Return.

422 Validation Error.

---

# CRM-024
## Customer Transaction Integrity

Customer tidak boleh diganti setelah transaksi selesai.

Contoh.

Invoice.

Treatment.

Payment.

Mengubah Customer harus melalui proses koreksi bisnis.

---

# CRM-025
## Customer Analytics

Customer Analytics dihitung dari transaksi.

Contoh.

Last Visit

Visit Count

Total Spending

Average Spending

Favorite Service

Favorite Stylist

Semua dihitung.

Tidak disimpan manual.

---

# CRM-026
## Customer Privacy

Data customer hanya dapat diakses oleh Role yang memiliki permission.

Contoh.

Reception.

Manager.

Owner.

Salary dan Payroll tidak boleh terlihat dari Customer Module.

---

# CRM-027
## Customer Import

Future.

Import Customer hanya diperbolehkan melalui template resmi.

Sistem wajib mendeteksi.

Duplicate Phone

Duplicate Email

Duplicate Customer Number

---

# CRM-028
## Customer Sync

Jika Accurate digunakan sebagai sinkronisasi Customer.

ERP tetap menjadi sumber operasional.

Sinkronisasi tidak boleh menghapus Customer lokal.

---

# CRM-029
## Customer Audit

Perubahan Customer wajib mencatat.

Created By

Updated By

Created At

Updated At

---

# CRM-030
## Customer Completion Checklist

Customer dianggap valid apabila memiliki minimal.

✓ Nama

✓ Nomor HP

Opsional.

Alamat

Email

Tanggal Lahir

Gender

Catatan

Foto

---

# CHAPTER 2 SUMMARY

Customer merupakan Aggregate Root bagi seluruh modul CRM.

Seluruh aktivitas bisnis berikut harus selalu terhubung dengan Customer:

- Appointment
- Treatment
- Deposit
- Invoice
- Payment
- Customer Timeline
- Customer Photos
- Customer Notes
- Membership (Future)
- Loyalty (Future)

Customer tidak boleh diperlakukan sebagai data master biasa, tetapi sebagai pusat hubungan bisnis jangka panjang antara perusahaan dan pelanggan.

# CHAPTER 3 — APPOINTMENT BUSINESS RULES

---

# 3.1 Purpose

Appointment merupakan titik awal seluruh operasional salon.

Semua layanan yang dilakukan kepada customer harus diawali dengan Appointment.

Appointment menjadi penghubung antara Customer, Schedule, Treatment, Invoice, Payment, Commission, dan Payroll.

Appointment bukan sekadar booking, tetapi merupakan awal lifecycle layanan customer.

---

# APT-001
## Appointment Ownership

### Purpose

Menjamin seluruh layanan memiliki customer yang jelas.

### Business Rule

Satu Appointment hanya dimiliki oleh satu Customer.

Satu Customer dapat memiliki banyak Appointment.

Appointment tidak boleh dipindahkan ke Customer lain setelah Treatment dimulai.

---

# APT-002
## Appointment Number

Setiap Appointment memiliki nomor unik.

Contoh.

```
APT-20260628-0001
```

Nomor dibuat otomatis.

Tidak boleh berubah.

---

# APT-003
## Appointment Status

Appointment memiliki lifecycle berikut.

```
BOOKED

↓

CONFIRMED

↓

CHECK_IN

↓

IN_PROGRESS

↓

COMPLETED
```

Workflow alternatif.

```
BOOKED

↓

CANCELLED
```

atau

```
BOOKED

↓

NO_SHOW
```

Status tidak boleh melompati workflow.

---

# APT-004
## Booking Validation

Appointment hanya dapat dibuat apabila.

✓ Customer aktif

✓ Branch aktif

✓ Minimal satu Service dipilih

✓ Tanggal valid

✓ Jam valid

---

# APT-005
## Appointment Date

Appointment hanya boleh dibuat pada tanggal yang valid.

Appointment tidak boleh dibuat pada tanggal lampau.

Exception.

SUPER_ADMIN.

---

# APT-006
## Branch Required

Appointment wajib memiliki Branch.

Appointment tidak boleh berpindah Branch setelah CHECK_IN.

---

# APT-007
## Service Required

Appointment minimal memiliki satu Service.

Appointment tanpa Service tidak boleh disimpan.

---

# APT-008
## Staff Assignment

Staff bersifat opsional saat BOOKED.

Namun wajib sebelum Treatment dimulai.

---

# APT-009
## Staff Availability

Staff hanya dapat dipilih apabila.

- Shift tersedia
- Tidak sedang memiliki Appointment lain
- Memiliki akses ke Branch tersebut
- Status aktif

Backend menjadi validator utama.

---

# APT-010
## Appointment Duration

Durasi Appointment dihitung dari total Service.

Durasi digunakan untuk.

- Schedule
- Staff Availability
- Daily Board

---

# APT-011
## Double Booking Prevention

Seorang Staff tidak boleh memiliki dua Appointment yang waktunya bertabrakan.

Overlap sekecil apa pun dianggap konflik.

Backend wajib melakukan pengecekan.

---

# APT-012
## Multi Staff

Satu Appointment dapat memiliki lebih dari satu Staff.

Contoh.

Stylist

Assistant

Colorist

Semua Assignment disimpan pada AppointmentStaff.

---

# APT-013
## Appointment Services

Satu Appointment dapat memiliki banyak Service.

Contoh.

Hair Spa

Hair Cut

Keratin

Hair Coloring

Urutan Service harus disimpan.

---

# APT-014
## Check In

CHECK_IN hanya dapat dilakukan apabila.

Customer hadir.

Appointment belum Cancel.

Appointment belum No Show.

---

# APT-015
## Treatment Creation

Treatment hanya dapat dibuat dari Appointment.

Tidak boleh membuat Treatment tanpa Appointment.

---

# APT-016
## Appointment Completion

Appointment hanya dapat COMPLETED apabila.

Treatment telah selesai.

Semua Service selesai.

---

# APT-017
## Cancellation

Appointment dapat dibatalkan sebelum CHECK_IN.

Setelah CHECK_IN.

Gunakan workflow bisnis.

Bukan Cancel.

---

# APT-018
## No Show

Appointment dapat menjadi NO_SHOW apabila.

Customer tidak hadir.

Staff tidak memulai Treatment.

NO_SHOW tidak dapat diubah menjadi COMPLETED.

---

# APT-019
## Reschedule

Reschedule tidak membuat Appointment baru.

Appointment yang sama dipindahkan ke tanggal dan jam baru.

History wajib disimpan.

---

# APT-020
## Deposit

Appointment dapat memiliki Deposit.

Deposit bersifat opsional.

Deposit belum menjadi pendapatan.

Deposit baru dianggap digunakan saat Invoice dibuat.

---

# APT-021
## Appointment Notes

Appointment dapat memiliki Notes.

Notes digunakan untuk.

- Permintaan Customer

- Alergi

- Kondisi Rambut

- Catatan Staff

---

# APT-022
## Appointment Photos

Appointment dapat memiliki foto.

Jenis.

REFERENCE

HAIR_CURRENT

Foto disimpan di Cloudinary.

---

# APT-023
## Reminder

Future.

Appointment menghasilkan Reminder.

- H-1

- H-0

Melalui.

WhatsApp.

Telegram.

Email.

---

# APT-024
## Daily Board

Semua Appointment aktif muncul pada Daily Board.

Status.

BOOKED

CONFIRMED

CHECK_IN

IN_PROGRESS

COMPLETED

CANCELLED dan NO_SHOW tidak ditampilkan pada board utama.

Tetapi tetap dapat dicari melalui filter.

---

# APT-025
## Timeline

Seluruh perubahan status menghasilkan Timeline.

Contoh.

Appointment Created

↓

Confirmed

↓

Check In

↓

Treatment Started

↓

Completed

Timeline bersifat immutable.

---

# APT-026
## Branch Security

User hanya dapat melihat Appointment pada Branch yang dimiliki.

SUPER_ADMIN dapat melihat seluruh Branch.

---

# APT-027
## Conflict Detection

Backend wajib mendeteksi.

- Staff bentrok

- Shift tidak sesuai

- Appointment overlap

- Branch tidak sesuai

Frontend hanya membantu menampilkan informasi.

---

# APT-028
## Financial Relation

Appointment dapat menghasilkan.

Treatment

↓

Invoice

↓

Payment

↓

Commission

↓

Payroll

Appointment tidak boleh langsung menghasilkan Payment.

---

# APT-029
## Audit

Appointment wajib memiliki.

Created By

Updated By

Created At

Updated At

Semua perubahan status dicatat pada Timeline.

---

# APT-030
## Appointment Completion Checklist

Appointment dianggap valid apabila.

✓ Customer

✓ Branch

✓ Minimal satu Service

✓ Tanggal

✓ Jam

✓ Status valid

Opsional.

Staff

Deposit

Notes

Photos

---

# CHAPTER 3 SUMMARY

Appointment merupakan pusat operasional harian salon.

Appointment menghubungkan:

Customer

↓

Schedule

↓

Treatment

↓

Inventory

↓

Invoice

↓

Payment

↓

Commission

↓

Payroll

Appointment menjadi titik awal seluruh proses layanan dan harus selalu menjadi sumber utama aktivitas operasional salon.

# CHAPTER 4 — STAFF SCHEDULE BUSINESS RULES

---

# 4.1 Purpose

Staff Schedule mengatur ketersediaan tenaga kerja pada setiap Branch.

Schedule bukan hanya kalender kerja, tetapi menjadi dasar bagi:

- Appointment Booking
- Staff Availability
- Daily Board
- Attendance
- Payroll
- Commission
- Reporting

Seluruh modul operasional harus menggunakan Staff Schedule sebagai sumber kebenaran (Source of Truth) untuk ketersediaan karyawan.

---

# SCH-001
## Schedule Ownership

### Purpose

Menjamin setiap jadwal dimiliki oleh satu karyawan.

### Business Rule

Satu Schedule hanya dimiliki oleh satu Employee.

Satu Employee dapat memiliki banyak Schedule.

Schedule disimpan per tanggal.

---

# SCH-002
## Shift Required

Setiap Schedule wajib memiliki Shift.

Shift menentukan:

- Jam Masuk
- Jam Pulang
- Working / Off
- Warna pada Roster

Shift tidak boleh kosong apabila status adalah WORKING.

---

# SCH-003
## One Schedule Per Day

Satu Employee hanya boleh memiliki satu Schedule pada tanggal yang sama.

Validation.

```
employeeId + workDate

UNIQUE
```

---

# SCH-004
## Home Branch

Employee memiliki satu Home Branch.

Home Branch digunakan untuk:

- Payroll
- Attendance
- Reporting

Schedule tidak wajib berada di Home Branch.

---

# SCH-005
## Branch Access

Employee hanya dapat dijadwalkan pada Branch yang terdapat pada Employee Branch Access.

Jika Branch tidak termasuk access.

Return.

```
422 Validation Error
```

---

# SCH-006
## Working Branch

Working Branch adalah Branch tempat Employee bekerja pada tanggal tertentu.

Working Branch dapat berbeda dengan Home Branch.

Contoh.

```
Home Branch

↓

Cipete

Hari Senin

↓

Kemang

Hari Selasa

↓

Kelapa Gading
```

---

# SCH-007
## Shift Working Hours

Shift menentukan jam kerja resmi.

Contoh.

```
S1

09:00

↓

18:00

S2

10:00

↓

19:00

OFF

Tidak bekerja
```

Jam kerja berasal dari Shift.

Bukan dari Schedule.

---

# SCH-008
## OFF Shift

Shift OFF berarti.

Employee tidak tersedia.

Employee tidak dapat menerima Appointment.

---

# SCH-009
## Leave Schedule

Status LEAVE berarti.

Employee tidak bekerja.

Tidak dapat menerima Appointment.

Payroll mengikuti aturan Leave.

---

# SCH-010
## Available Staff

Employee dianggap Available apabila memenuhi seluruh syarat berikut.

✓ Employee Active

✓ Branch Access

✓ Memiliki Schedule

✓ Shift Working

✓ Jam Appointment berada di dalam Shift

✓ Tidak memiliki Appointment overlap

---

# SCH-011
## Shift Coverage

Appointment harus berada di dalam jam Shift.

Contoh.

Shift.

```
09:00

↓

18:00
```

Appointment.

```
10:00

↓

12:00

✓
```

Appointment.

```
17:30

↓

19:00

✗
```

Karena melewati Shift.

---

# SCH-012
## Appointment Conflict

Employee tidak boleh memiliki Appointment yang bertabrakan.

Overlap sekecil apa pun dianggap konflik.

Backend menjadi validator utama.

---

# SCH-013
## Multi Staff

Satu Appointment dapat menggunakan banyak Employee.

Namun setiap Employee tetap diperiksa Availability secara individual.

---

# SCH-014
## Roster

Roster menampilkan Schedule seluruh Employee.

Grid.

```
Employee

↓

Date

↓

Shift
```

Roster bukan Attendance.

---

# SCH-015
## Shift Master

Shift merupakan Master Data.

Shift dapat diubah.

Namun apabila sudah digunakan.

Field berikut terkunci.

- Code
- Start Time
- End Time
- Working Flag

Yang masih boleh diubah.

- Name
- Color
- Active Status

---

# SCH-016
## Shift History

Perubahan Shift tidak mengubah Schedule lama.

Schedule selalu menyimpan referensi ke Shift yang berlaku saat itu.

---

# SCH-017
## Shift Deactivation

Shift yang sudah digunakan.

Tidak boleh dihapus.

Hanya boleh.

```
isActive = false
```

---

# SCH-018
## Schedule Generation

Future.

Schedule dapat dibuat otomatis.

Contoh.

```
Senin

↓

Jumat

↓

Shift Pagi

Sabtu

↓

Shift Siang
```

---

# SCH-019
## Schedule Copy

Future.

Schedule dapat disalin.

Hari ini.

↓

Minggu depan.

---

# SCH-020
## Holiday

Future.

Hari Libur Nasional.

Employee tidak otomatis OFF.

Manager tetap menentukan Schedule.

---

# SCH-021
## Attendance Relation

Attendance berasal dari Schedule.

Schedule.

↓

Clock In

↓

Clock Out

↓

Attendance

Attendance tidak boleh dibuat tanpa Schedule.

---

# SCH-022
## Payroll Relation

Payroll menggunakan Schedule sebagai dasar.

Bukan Appointment.

Komponen.

Hari Kerja.

Jam Kerja.

Lembur.

Leave.

---

# SCH-023
## Commission Relation

Schedule tidak menentukan Commission.

Namun Employee harus memiliki Schedule valid agar dapat menerima Assignment Treatment.

---

# SCH-024
## Schedule Audit

Semua perubahan Schedule mencatat.

- Created By
- Updated By
- Created At
- Updated At

---

# SCH-025
## Schedule Completion Checklist

Schedule dianggap valid apabila memiliki.

✓ Employee

✓ Work Date

✓ Branch

✓ Shift

✓ Status

Opsional.

Notes

---

# CHAPTER 4 SUMMARY

Staff Schedule merupakan sumber utama ketersediaan tenaga kerja.

Schedule digunakan oleh:

- Appointment
- Daily Board
- Available Staff
- Attendance
- Payroll
- Reporting

Schedule bukan Attendance.

Schedule bukan Payroll.

Schedule merupakan fondasi Workforce Planning pada NIAHAIR ERP.

# CHAPTER 5 — TREATMENT BUSINESS RULES

---

# 5.1 Purpose

Treatment merupakan proses utama layanan kepada Customer.

Treatment dimulai setelah Appointment melakukan Check In dan berakhir ketika seluruh layanan selesai dilakukan.

Treatment menjadi dasar bagi:

- Customer History
- Material Usage
- Inventory Movement
- Commission
- Payroll
- Analytics

Treatment bukan hanya aktivitas pelayanan, tetapi merupakan proses operasional yang harus dapat diaudit secara penuh.

---

# TRT-001
## Treatment Source

### Purpose

Menjamin seluruh Treatment memiliki asal yang jelas.

### Business Rule

Treatment hanya dapat dibuat dari Appointment.

Tidak boleh membuat Treatment secara manual tanpa Appointment.

---

# TRT-002
## One Treatment Session

Satu Appointment hanya memiliki satu Treatment Session aktif.

Treatment Session menjadi induk seluruh aktivitas treatment.

---

# TRT-003
## Treatment Lifecycle

Treatment memiliki workflow berikut.

```
PENDING

↓

READY

↓

IN_PROGRESS

↓

COMPLETED
```

Workflow alternatif.

```
PENDING

↓

CANCELLED
```

Status tidak boleh melompati tahapan.

---

# TRT-004
## Treatment Start

Treatment hanya dapat dimulai apabila.

✓ Appointment CHECK_IN

✓ Customer hadir

✓ Branch valid

---

# TRT-005
## Staff Assignment Required

Treatment wajib memiliki minimal satu Staff sebelum dapat dimulai.

Jenis Staff dapat berupa.

- Stylist
- Assistant
- Colorist

Jika tidak ada Staff.

Return.

```
422 Validation Error
```

---

# TRT-006
## Staff Availability

Staff yang ditugaskan harus.

✓ Active

✓ Memiliki Schedule

✓ Memiliki Branch Access

✓ Tidak bentrok Appointment

---

# TRT-007
## Multiple Staff

Satu Treatment dapat memiliki banyak Staff.

Contoh.

```
Stylist

Assistant

Colorist
```

Semua Assignment dicatat.

---

# TRT-008
## Assignment History

Perubahan Assignment tidak menghapus histori.

Tambah.

Ganti.

Hapus.

Semua dicatat pada Timeline.

---

# TRT-009
## Treatment Services

Treatment memiliki satu atau lebih Service.

Contoh.

Hair Spa

Hair Cut

Keratin

Hair Coloring

Hair Extension

---

# TRT-010
## Service Sequence

Urutan Service harus dipertahankan.

Contoh.

```
Clarifying Shampoo

↓

Keratin

↓

Blow Dry

↓

Flat Iron
```

Sequence digunakan untuk SOP.

---

# TRT-011
## Material Usage

Setiap Service dapat menggunakan Material.

Material berasal dari Service BOM.

Contoh.

Keratin.

↓

Keratin Liquid

↓

Hair Serum

↓

Mask

↓

Shampoo

---

# TRT-012
## Manual Material

Staff dapat menambah Material tambahan.

Contoh.

Extra Serum.

Extra Color.

Semua tambahan dicatat.

---

# TRT-013
## Material Validation

Material tidak boleh melebihi stok tersedia.

Jika stok tidak cukup.

Treatment tetap dapat berlangsung.

Namun Inventory Movement gagal dan menghasilkan Warning (configurable).

---

# TRT-014
## Material Usage Audit

Setiap Material Usage mencatat.

- Item

- Qty

- Unit

- Employee

- Timestamp

Material tidak boleh dihapus setelah Treatment selesai.

---

# TRT-015
## Treatment Notes

Treatment dapat memiliki Notes.

Contoh.

Hair Condition.

Allergy.

Special Request.

Recommendation.

---

# TRT-016
## Treatment Photos

Treatment dapat memiliki banyak Photo.

Kategori.

BEFORE

PROCESS

AFTER

REFERENCE

DETAIL

Semua foto disimpan di Cloudinary.

---

# TRT-017
## Timeline

Seluruh aktivitas menghasilkan Timeline.

Contoh.

Treatment Created

↓

Started

↓

Staff Assigned

↓

Material Added

↓

Photo Uploaded

↓

Completed

Timeline bersifat immutable.

---

# TRT-018
## Elapsed Time

Treatment menyimpan.

Started At

Completed At

Duration dihitung otomatis.

---

# TRT-019
## Pause (Future)

Treatment dapat di Pause.

Status.

```
IN_PROGRESS

↓

PAUSED

↓

IN_PROGRESS
```

Seluruh Pause dicatat.

---

# TRT-020
## Treatment Completion Validation

Treatment hanya dapat COMPLETED apabila.

✓ Minimal satu Staff

✓ Semua Service selesai

✓ Tidak ada Material Pending

✓ Appointment IN_PROGRESS

---

# TRT-021
## Inventory Generation

Treatment COMPLETED menghasilkan.

Material Usage

↓

Inventory Movement

Inventory tidak dikurangi sebelum Treatment selesai.

---

# TRT-022
## Commission Generation

Commission baru dibuat setelah Treatment COMPLETED.

Bukan saat Appointment dibuat.

---

# TRT-023
## Payroll Relation

Payroll menggunakan Assignment Treatment sebagai salah satu dasar perhitungan.

---

# TRT-024
## Customer History

Treatment otomatis masuk Customer History.

History tidak boleh dihapus.

---

# TRT-025
## Treatment Reopen

Treatment COMPLETED tidak boleh diedit.

Jika terjadi kesalahan.

Gunakan proses Reopen (future, permission khusus).

---

# TRT-026
## Cancellation

Treatment hanya dapat dibatalkan sebelum IN_PROGRESS.

Setelah dimulai.

Gunakan workflow bisnis.

---

# TRT-027
## Branch Integrity

Treatment tidak boleh berpindah Branch.

Branch mengikuti Appointment.

---

# TRT-028
## Photo Security

Photo hanya boleh.

JPG

PNG

WEBP

Ukuran maksimum mengikuti konfigurasi sistem.

---

# TRT-029
## Treatment Audit

Treatment mencatat.

Created By

Updated By

Started By

Completed By

Created At

Started At

Completed At

---

# TRT-030
## Treatment Analytics

Analytics dihitung dari Treatment.

Contoh.

- Total Treatment

- Average Duration

- Favorite Service

- Favorite Stylist

- Material Consumption

- Revenue per Treatment

Analytics tidak menjadi sumber transaksi.

---

# TRT-031
## Inventory Consistency

Material Usage tidak boleh langsung mengurangi Inventory.

Seluruh perubahan stok harus melalui Inventory Movement.

---

# TRT-032
## Financial Relation

Treatment tidak menghasilkan Payment.

Treatment menghasilkan Invoice.

Invoice menghasilkan Payment.

---

# TRT-033
## Service Cost

Biaya Material dihitung berdasarkan Inventory Cost.

Tidak berdasarkan harga jual.

---

# TRT-034
## Quality Control (Future)

Treatment dapat memiliki hasil QC.

Status.

PASS

REWORK

FAILED

---

# TRT-035
## Treatment Completion Checklist

Treatment dianggap valid apabila memiliki.

✓ Appointment

✓ Customer

✓ Branch

✓ Minimal satu Staff

✓ Minimal satu Service

✓ Status valid

Opsional.

Notes

Photos

Material tambahan

---

# CHAPTER 5 SUMMARY

Treatment merupakan inti operasional NIAHAIR ERP.

Treatment menghubungkan:

Customer

↓

Appointment

↓

Staff

↓

Material Usage

↓

Inventory Movement

↓

Commission

↓

Payroll

↓

Customer History

Seluruh aktivitas layanan harus melalui Treatment agar data operasional, inventori, dan keuangan tetap konsisten.

# CHAPTER 6 — INVENTORY BUSINESS RULES

---

# 6.1 Purpose

Inventory merupakan sistem yang mengelola seluruh persediaan barang pada NIAHAIR ERP.

Inventory menjadi sumber utama informasi stok untuk:

- Retail
- Treatment
- Production
- Warehouse
- Transfer
- Purchasing
- Reporting

Inventory harus selalu dapat diaudit.

Tidak boleh ada perubahan stok tanpa jejak transaksi.

---

# INV-001
## Inventory Ownership

### Purpose

Menjamin setiap stok memiliki lokasi yang jelas.

### Business Rule

Inventory dimiliki oleh Warehouse.

Bukan oleh Branch.

Relasi.

```

Warehouse

↓

Inventory

↓

Item

```

Satu Item dapat memiliki banyak Inventory.

---

# INV-002
## Inventory Quantity

Inventory memiliki tiga quantity.

```

Qty On Hand

Qty Reserved

Qty Available

```

Formula.

```

Qty Available

=

Qty On Hand

-

Qty Reserved

```

Frontend tidak boleh menghitung sendiri.

Backend menjadi sumber kebenaran.

---

# INV-003
## Inventory Movement

Seluruh perubahan stok harus berasal dari Inventory Movement.

Tidak boleh mengubah Qty secara langsung.

Contoh salah.

```

inventory.qtyOnHand -= 10

```

Contoh benar.

```

InventoryMovement

↓

Inventory Updated

```

---

# INV-004
## Immutable Movement

Inventory Movement bersifat immutable.

Tidak boleh.

UPDATE.

DELETE.

Jika terjadi kesalahan.

Buat Movement baru.

Jenis.

ADJUSTMENT.

---

# INV-005
## Movement Types

Movement Type resmi.

```

OPENING_BALANCE

PURCHASE

SALE

SERVICE_USAGE

PRODUCTION

TRANSFER_IN

TRANSFER_OUT

RETURN

ADJUSTMENT

SYNC

```

Tidak boleh membuat tipe bebas.

---

# INV-006
## Reference Type

Setiap Movement wajib memiliki Reference Type.

Contoh.

```

INVOICE

PURCHASE_RECEIPT

TRANSFER

TREATMENT

OPENING_BALANCE

MANUAL

SYNC

```

---

# INV-007
## Source Module

Movement juga menyimpan Source Module.

Contoh.

SALE

SERVICE

PURCHASE

TRANSFER

SYNC

PRODUCTION

OPNAME

---

# INV-008
## Inventory Integrity

Qty On Hand tidak boleh negatif.

Jika Movement menyebabkan stok negatif.

Return.

422 Validation Error.

Exception.

Konfigurasi perusahaan mengizinkan Negative Inventory.

---

# INV-009
## Reservation

Qty Reserved digunakan untuk.

Booking.

Production.

Future Reservation.

Qty Reserved tidak mengurangi Qty On Hand.

---

# INV-010
## Available Quantity

Qty Available digunakan.

Sales.

Treatment.

Production.

Validasi selalu menggunakan Qty Available.

---

# INV-011
## Warehouse Transfer

Transfer selalu menghasilkan dua Movement.

```

TRANSFER_OUT

↓

TRANSFER_IN

```

Harus berada pada Transaction yang sama.

---

# INV-012
## Opening Balance

Opening Balance hanya boleh dilakukan.

Saat implementasi.

Atau.

Stock Opname.

Dengan Permission khusus.

---

# INV-013
## Stock Adjustment

Adjustment digunakan untuk.

Selisih stok.

Barang rusak.

Barang hilang.

Correction.

Adjustment wajib memiliki Reason.

---

# INV-014
## Stock Opname

Future.

Stock Opname menghasilkan.

Adjustment Movement.

Tidak mengubah Inventory langsung.

---

# INV-015
## Closing Period

Inventory Period memiliki status.

OPEN.

CLOSED.

Movement baru tidak boleh dibuat pada Period CLOSED.

Exception.

SUPER_ADMIN.

---

# INV-016
## Locked Movement

Movement yang sudah Locked.

Tidak boleh diubah.

Tidak boleh dihapus.

---

# INV-017
## Warehouse Snapshot

Movement menyimpan Warehouse Snapshot.

Walaupun Inventory berpindah.

History tetap valid.

---

# INV-018
## Costing

Movement menyimpan.

Unit Cost.

Total Cost dihitung.

Tidak disimpan.

Future.

Average Cost.

FIFO.

---

# INV-019
## Service Usage

Treatment menghasilkan.

SERVICE_USAGE Movement.

Movement dibuat setelah Treatment COMPLETED.

---

# INV-020
## Sales Movement

Invoice Paid.

↓

SALE Movement.

Movement tidak dibuat saat Draft Invoice.

---

# INV-021
## Purchase Movement

Future.

Receiving PO.

↓

PURCHASE Movement.

---

# INV-022
## Production Movement

Future.

Production.

↓

Raw Material OUT.

↓

Finished Goods IN.

---

# INV-023
## Return Movement

Return menghasilkan Movement.

RETURN.

Reference tetap mengarah ke transaksi asal.

---

# INV-024
## Sync Movement

Sync Accurate.

↓

SYNC Movement.

SYNC tidak boleh menghapus histori sebelumnya.

---

# INV-025
## Inventory Sync

ERP tetap menjadi Operational Inventory.

Accurate hanya Accounting Inventory.

Jika terjadi selisih.

Gunakan Adjustment.

Bukan overwrite.

---

# INV-026
## Inventory Audit

Movement wajib mencatat.

Created By Employee.

Created Source.

Timestamp.

Warehouse.

Reference.

Reason.

---

# INV-027
## Inventory Search

Inventory dapat dicari berdasarkan.

Item.

SKU.

Barcode.

Warehouse.

Category.

---

# INV-028
## Inventory Reporting

Report dihitung dari Movement.

Saldo berasal dari Inventory.

History berasal dari Inventory Movement.

---

# INV-029
## Inventory Analytics

Analytics.

Fast Moving.

Slow Moving.

Dead Stock.

Consumption.

Stock Turnover.

Tidak menjadi sumber transaksi.

---

# INV-030
## Inventory Security

Warehouse hanya dapat diakses.

User yang memiliki Branch Access.

Warehouse Permission.

---

# INV-031
## Inventory Reservation Future

Booking.

↓

Reserve Inventory.

↓

Treatment.

↓

Release Reservation.

↓

Generate Service Usage.

---

# INV-032
## Inventory Cost Future

Future Costing.

Average Cost.

FIFO.

LIFO tidak digunakan.

---

# INV-033
## Inventory Expiry Future

Item tertentu dapat memiliki.

Batch Number.

Expiry Date.

Digunakan untuk Chemical.

---

# INV-034
## Inventory Batch Future

Inventory dapat dipisahkan.

Per Batch.

Per Lot.

Per Supplier.

---

# INV-035
## Inventory Completion Checklist

Inventory dianggap valid apabila memiliki.

✓ Warehouse

✓ Item

✓ Qty On Hand

✓ Qty Reserved

✓ Qty Available

✓ Audit

✓ Movement History

---

# CHAPTER 6 SUMMARY

Inventory merupakan sumber utama data stok pada NIAHAIR ERP.

Seluruh perubahan stok harus melalui Inventory Movement.

Inventory mendukung:

- Retail
- Treatment
- Production
- Purchasing
- Warehouse
- Transfer
- Reporting
- Accurate Sync

Tidak ada proses bisnis yang boleh mengubah stok secara langsung tanpa menghasilkan Inventory Movement.

# CHAPTER 7 — FINANCE BUSINESS RULES

---

# 7.1 Purpose

Finance Module mengelola seluruh transaksi keuangan operasional pada NIAHAIR ERP.

ERP bertanggung jawab terhadap:

- Deposit
- Invoice
- Payment
- Refund (Future)
- Cash Flow (Operational)
- Accurate Synchronization

ERP bukan Accounting System.

Accounting tetap dikelola oleh Accurate.

---

# FIN-001
## Financial Source of Truth

### Purpose

Menentukan sumber utama transaksi keuangan.

### Business Rule

ERP menjadi sumber utama transaksi operasional.

Accurate menjadi sumber utama akuntansi.

ERP tidak membuat jurnal akuntansi.

---

# FIN-002
## Invoice Source

Invoice hanya dapat dibuat dari Appointment atau Treatment.

Tidak boleh membuat Invoice tanpa transaksi bisnis.

Future.

Retail Sales.

Production.

Purchase.

---

# FIN-003
## One Invoice Rule

Satu Appointment hanya memiliki satu Invoice utama.

Invoice menjadi pusat transaksi pembayaran.

---

# FIN-004
## Invoice Number

Invoice Number dibuat otomatis.

Contoh.

```
INV-20260628-0001
```

Nomor tidak boleh berubah.

---

# FIN-005
## Invoice Status

Invoice memiliki status.

```
DRAFT

↓

ISSUED

↓

PARTIALLY_PAID

↓

PAID
```

Workflow alternatif.

```
DRAFT

↓

VOID
```

Status tidak boleh melompati tahapan.

---

# FIN-006
## Invoice Integrity

Invoice tidak boleh dihapus setelah diterbitkan.

Jika salah.

Gunakan.

VOID.

Credit Note (Future).

---

# FIN-007
## Deposit

Deposit merupakan uang muka.

Deposit bukan pendapatan.

Deposit hanya menjadi saldo customer.

---

# FIN-008
## Deposit Creation

Deposit dapat dibuat.

Sebelum Appointment.

Saat Booking.

Saat Check In.

Deposit tidak wajib.

---

# FIN-009
## Deposit Application

Deposit hanya dapat digunakan pada Invoice Customer yang sama.

Tidak boleh dipindahkan ke Customer lain.

---

# FIN-010
## Deposit Validation

Nilai Deposit Applied.

Tidak boleh melebihi.

Outstanding Invoice.

---

# FIN-011
## Deposit Remaining

Jika Deposit lebih besar dari Invoice.

Sisa Deposit tetap menjadi saldo Customer.

---

# FIN-012
## Payment

Payment merupakan penerimaan uang.

Payment selalu mengacu pada Invoice.

Tidak boleh ada Payment tanpa Invoice.

---

# FIN-013
## Payment Number

Payment Number dibuat otomatis.

Contoh.

```
PAY-20260628-0001
```

---

# FIN-014
## Payment Method

Payment wajib memiliki Payment Method.

Contoh.

Cash.

Debit.

Credit Card.

Transfer.

QRIS.

E-Wallet.

---

# FIN-015
## Partial Payment

Invoice dapat dibayar beberapa kali.

Contoh.

```
Invoice

1.500.000

↓

Payment

500.000

↓

Outstanding

1.000.000
```

---

# FIN-016
## Full Payment

Invoice menjadi PAID apabila.

Outstanding = 0.

---

# FIN-017
## Over Payment

Total Payment.

Tidak boleh melebihi.

Invoice Total.

---

# FIN-018
## Payment Void

Payment tidak boleh dihapus.

Jika salah.

Gunakan.

Void.

Refund (Future).

---

# FIN-019
## Refund

Future.

Refund menghasilkan transaksi baru.

Refund tidak menghapus Payment.

---

# FIN-020
## Invoice Items

Invoice terdiri dari.

Service.

Retail Product.

Discount.

Deposit Applied.

Tax (Future).

---

# FIN-021
## Discount

Discount memiliki.

Reason.

Approved By (Future).

Audit.

---

# FIN-022
## Tax

Future.

PPN.

Service Tax.

Tax dihitung pada Invoice.

---

# FIN-023
## Invoice Total

Formula.

```
Subtotal

-

Discount

+

Tax

-

Deposit Applied

=

Grand Total
```

---

# FIN-024
## Outstanding

Formula.

```
Grand Total

-

Payment

=

Outstanding
```

Backend menjadi sumber perhitungan.

---

# FIN-025
## Accurate Sync

Invoice PAID.

↓

Sync ke Accurate.

Jika Sync gagal.

Invoice tetap PAID.

Sync masuk Queue.

---

# FIN-026
## Payment Sync

Payment berhasil.

↓

Queue.

↓

Accurate.

Operasional tidak boleh menunggu Accurate.

---

# FIN-027
## Branch Ownership

Invoice dimiliki Branch.

Payment dimiliki Branch.

Deposit mengikuti Branch transaksi.

Customer tetap Global.

---

# FIN-028
## Cash Register (Future)

Payment dapat memiliki.

Cash Register.

Shift Kasir.

Closing Kasir.

---

# FIN-029
## Daily Closing (Future)

Kasir melakukan.

Open Cash.

↓

Transaction.

↓

Closing.

↓

Reconciliation.

---

# FIN-030
## Financial Audit

Invoice.

Payment.

Deposit.

Mencatat.

Created By.

Updated By.

Timestamp.

Reason.

---

# FIN-031
## Invoice Relation

Invoice dapat menghasilkan.

Inventory Movement.

Commission.

Customer History.

Reporting.

---

# FIN-032
## Payment Relation

Payment tidak menghasilkan Inventory.

Payment hanya mengurangi Outstanding Invoice.

---

# FIN-033
## Customer Relation

Seluruh Invoice.

Deposit.

Payment.

Harus mengacu ke Customer.

---

# FIN-034
## Financial Reporting

ERP menyediakan.

Operational Sales.

Daily Sales.

Outstanding.

Deposit Balance.

Accounting berasal dari Accurate.

---

# FIN-035
## Financial Security

Role berikut dapat mengakses Finance.

Reception.

Finance.

Manager.

Owner.

Permission lebih rinci diatur pada Role.

---

# FIN-036
## Financial Analytics

Analytics.

Revenue.

Average Transaction.

Deposit Usage.

Payment Method.

Sales by Branch.

Top Customer.

---

# FIN-037
## Financial Completion Checklist

Finance dianggap valid apabila.

✓ Customer

✓ Invoice

✓ Payment

✓ Branch

✓ Audit

✓ Accurate Sync

✓ Outstanding benar

✓ Deposit benar

---

# CHAPTER 7 SUMMARY

Finance Module merupakan pusat transaksi operasional.

Finance menghubungkan.

Customer

↓

Appointment

↓

Treatment

↓

Invoice

↓

Deposit

↓

Payment

↓

Accurate

ERP mengelola transaksi operasional.

Accurate mengelola akuntansi.

Kedua sistem harus selalu sinkron tanpa mengganggu operasional salon.

# CHAPTER 8 — EMPLOYEE & HUMAN RESOURCE BUSINESS RULES

---

# 8.1 Purpose

Employee merupakan sumber utama seluruh aktivitas tenaga kerja pada NIAHAIR ERP.

Employee menjadi dasar bagi:

- Authentication
- Branch Access
- Schedule
- Attendance
- Treatment Assignment
- Commission
- Payroll
- Approval
- Audit

Employee bukan hanya data karyawan, tetapi representasi seluruh sumber daya manusia dalam perusahaan.

---

# EMP-001
## Employee Identity

### Purpose

Menjamin setiap karyawan memiliki identitas tunggal.

### Business Rule

Satu Employee hanya boleh memiliki satu Employee Code.

Employee Code bersifat unik.

Tidak boleh berubah setelah dibuat.

---

# EMP-002
## Employee Status

Employee memiliki status.

ACTIVE

INACTIVE

SUSPENDED (Future)

RESIGNED (Future)

TERMINATED (Future)

Employee selain ACTIVE tidak dapat menerima Assignment.

---

# EMP-003
## Employee Role

Employee wajib memiliki satu Role.

Role menentukan.

- Permission
- Menu
- API Access

Role bukan Position.

---

# EMP-004
## Position

Position merupakan jabatan operasional.

Contoh.

Stylist

Senior Stylist

Assistant

Colorist

Receptionist

Warehouse

Manager

Owner

Position tidak menentukan Permission.

---

# EMP-005
## Home Branch

Employee memiliki satu Home Branch.

Home Branch digunakan untuk.

Payroll.

Attendance.

Reporting.

Home Branch tidak membatasi lokasi kerja.

---

# EMP-006
## Branch Access

Employee dapat memiliki banyak Branch Access.

Branch Access menentukan.

Employee boleh bekerja di Branch mana.

---

# EMP-007
## Working Branch

Working Branch ditentukan oleh Schedule.

Working Branch dapat berbeda dengan Home Branch.

---

# EMP-008
## Employee Assignment

Employee dapat ditugaskan pada.

Appointment.

Treatment.

Inventory.

Approval.

Semua Assignment harus tercatat.

---

# EMP-009
## Employee Availability

Employee dianggap Available apabila.

✓ ACTIVE

✓ Memiliki Schedule

✓ Shift Working

✓ Branch Access

✓ Tidak bentrok Appointment

---

# EMP-010
## Employee Schedule

Schedule merupakan sumber utama ketersediaan Employee.

Attendance.

Appointment.

Payroll.

Menggunakan Schedule.

---

# EMP-011
## Employee Attendance

Attendance hanya dapat dibuat apabila.

Employee memiliki Schedule.

Attendance tidak boleh dibuat manual tanpa alasan.

---

# EMP-012
## Leave

Employee dapat memiliki Leave.

Jenis.

Annual Leave.

Sick Leave.

Special Leave.

Leave membuat Employee tidak Available.

---

# EMP-013
## Employee Documents (Future)

Employee dapat memiliki.

KTP.

NPWP.

BPJS.

Kontrak.

Sertifikat.

Semua dokumen disimpan pada Document Module.

---

# EMP-014
## Employee Skills

Future.

Employee memiliki Skill.

Contoh.

Keratin.

Hair Coloring.

Hair Extension.

Hair Spa.

Skill digunakan untuk.

Appointment Recommendation.

---

# EMP-015
## Employee Assignment History

Seluruh Assignment disimpan.

Appointment.

Treatment.

Commission.

Payroll.

Tidak boleh hilang.

---

# EMP-016
## Employee Photo

Employee memiliki satu Photo Profile.

Disimpan pada Cloudinary.

---

# EMP-017
## Employee Contact

Employee memiliki.

Phone.

Email.

Address.

Emergency Contact.

Semua dapat diperbarui.

---

# EMP-018
## Employee Resignation

Employee RESIGNED.

Tidak boleh menerima Assignment baru.

History tetap disimpan.

---

# EMP-019
## Employee Reactivation

Employee dapat diaktifkan kembali.

History tidak boleh hilang.

---

# EMP-020
## Employee Soft Delete

Employee tidak boleh Hard Delete.

Gunakan.

isActive = false

---

# EMP-021
## User Account

Employee dapat memiliki User Account.

Tidak semua Employee wajib memiliki Login.

Contoh.

Cleaning Service.

Driver.

---

# EMP-022
## Login Permission

Login hanya diberikan kepada Employee yang membutuhkan akses sistem.

---

# EMP-023
## Authentication

Employee Login menggunakan User.

Bukan Employee langsung.

Relasi.

Employee

↓

User

↓

JWT

---

# EMP-024
## Employee Timeline (Future)

Employee memiliki Timeline.

Created.

Role Changed.

Branch Changed.

Leave.

Promotion.

Resignation.

---

# EMP-025
## Branch Transfer

Employee dapat dipindahkan Home Branch.

Transfer harus dicatat.

History tidak boleh hilang.

---

# EMP-026
## Employee Performance (Future)

Performance dihitung dari.

Treatment.

Revenue.

Attendance.

Customer Rating.

Commission.

---

# EMP-027
## Employee Commission

Employee dapat menerima Commission.

Commission dihitung berdasarkan.

Treatment Assignment.

Rule.

Branch.

---

# EMP-028
## Employee Payroll

Payroll dihitung berdasarkan.

Attendance.

Schedule.

Commission.

Adjustment.

Allowance.

Deduction.

---

# EMP-029
## Employee Security

Employee hanya dapat melihat data sesuai Permission.

Stylist tidak dapat melihat Payroll.

Reception tidak dapat melihat Salary.

Warehouse tidak dapat melihat Commission.

---

# EMP-030
## Employee Audit

Semua perubahan Employee mencatat.

Created By.

Updated By.

Timestamp.

Reason (jika diperlukan).

---

# EMP-031
## Employee Analytics

Analytics.

Treatment Count.

Revenue.

Attendance.

Working Hours.

Commission.

Performance.

---

# EMP-032
## Employee Completion Checklist

Employee dianggap valid apabila memiliki.

✓ Employee Code

✓ Name

✓ Role

✓ Home Branch

✓ Branch Access

✓ Status

Opsional.

Photo.

Emergency Contact.

Address.

---

# CHAPTER 8 SUMMARY

Employee merupakan pusat seluruh Human Resource pada NIAHAIR ERP.

Employee berhubungan dengan:

Authentication

↓

Branch Access

↓

Schedule

↓

Attendance

↓

Treatment Assignment

↓

Commission

↓

Payroll

↓

Performance

Employee bukan hanya data master, tetapi fondasi seluruh operasional SDM pada perusahaan.

# CHAPTER 9 — PAYROLL & COMMISSION BUSINESS RULES

---

# 9.1 Purpose

Payroll & Commission mengelola seluruh kompensasi yang diterima Employee.

Kompensasi terdiri dari.

- Salary
- Commission
- Bonus
- Allowance
- Deduction
- Overtime (Future)

Payroll merupakan hasil akhir dari seluruh aktivitas operasional Employee.

---

# PAY-001
## Payroll Period

### Purpose

Menentukan periode perhitungan payroll.

### Business Rule

Payroll dihitung berdasarkan Payroll Period.

Contoh.

```
June 2026
```

Payroll Period memiliki status.

OPEN

PROCESSING

CLOSED

---

# PAY-002
## Payroll Source

Payroll tidak boleh diinput manual.

Payroll dihasilkan dari.

Attendance.

↓

Treatment.

↓

Commission.

↓

Adjustment.

↓

Payroll.

---

# PAY-003
## Payroll Employee

Satu Payroll hanya dimiliki satu Employee.

Satu Employee memiliki banyak Payroll.

---

# PAY-004
## Payroll Status

Payroll memiliki lifecycle.

```
DRAFT

↓

CALCULATED

↓

APPROVED

↓

PAID
```

Workflow alternatif.

```
DRAFT

↓

VOID
```

---

# PAY-005
## Payroll Lock

Payroll dengan status.

APPROVED.

PAID.

Tidak boleh diubah.

Jika terjadi kesalahan.

Gunakan Payroll Adjustment.

---

# PAY-006
## Salary

Salary merupakan Fixed Income.

Salary berasal dari kontrak kerja.

Tidak dihitung dari Treatment.

---

# PAY-007
## Commission Source

Commission hanya berasal dari Treatment COMPLETED.

Appointment tidak menghasilkan Commission.

---

# PAY-008
## Commission Rule

Commission dihitung menggunakan Commission Rule.

Rule dapat berbeda berdasarkan.

Service.

Employee.

Branch.

Effective Date.

---

# PAY-009
## Commission Calculation

Commission dihitung berdasarkan.

Treatment Assignment.

Bukan Appointment.

---

# PAY-010
## Multiple Staff Commission

Satu Treatment dapat menghasilkan Commission untuk banyak Employee.

Contoh.

Stylist.

Assistant.

Colorist.

Semua dihitung terpisah.

---

# PAY-011
## Branch Commission Rule

Branch dapat memiliki Rule Commission berbeda.

Rule Branch memiliki prioritas lebih tinggi.

---

# PAY-012
## Commission Effective Date

Commission Rule menggunakan Effective Date.

Rule lama tidak boleh berubah.

History tetap digunakan.

---

# PAY-013
## Commission Snapshot

Commission menyimpan Snapshot.

- Service
- Employee
- Percentage
- Fixed Amount

Perubahan Rule tidak mengubah Commission lama.

---

# PAY-014
## Commission Status

Commission memiliki status.

PENDING

APPROVED

PAID

VOID

---

# PAY-015
## Commission Approval

Future.

Commission dapat memerlukan Approval.

Manager.

↓

Finance.

↓

Payroll.

---

# PAY-016
## Commission Adjustment

Kesalahan Commission.

Tidak boleh UPDATE.

Gunakan Adjustment.

---

# PAY-017
## Payroll Components

Payroll terdiri dari.

Salary.

Commission.

Allowance.

Bonus.

Deduction.

Tax (Future).

---

# PAY-018
## Allowance

Allowance dapat berupa.

Transport.

Meal.

Phone.

Housing.

Allowance bersifat configurable.

---

# PAY-019
## Deduction

Deduction dapat berupa.

Late.

Leave.

Loan.

Penalty.

Manual Adjustment.

Semua Deduction wajib memiliki Reason.

---

# PAY-020
## Bonus

Bonus bersifat opsional.

Bonus tidak mempengaruhi Commission Rule.

---

# PAY-021
## Attendance Relation

Attendance mempengaruhi Payroll.

Contoh.

Working Day.

Late.

Leave.

Overtime.

---

# PAY-022
## Schedule Relation

Schedule digunakan untuk menghitung.

Working Day.

Expected Hours.

---

# PAY-023
## Treatment Relation

Treatment menjadi dasar Commission.

Treatment tidak langsung membuat Payroll.

---

# PAY-024
## Invoice Relation

Invoice tidak mempengaruhi Commission.

Commission hanya bergantung pada Treatment.

Future.

Dapat dikonfigurasi.

---

# PAY-025
## Payment Relation

Payroll menghasilkan Payroll Payment.

Terpisah dari Customer Payment.

---

# PAY-026
## Payroll Closing

Payroll Period CLOSED.

↓

Tidak boleh.

Tambah Commission.

Tambah Bonus.

Tambah Adjustment.

---

# PAY-027
## Payroll Reopen

Future.

Payroll Period dapat dibuka kembali.

Permission.

SUPER_ADMIN.

---

# PAY-028
## Employee Transfer

Home Branch berubah.

Tidak mengubah Payroll periode sebelumnya.

---

# PAY-029
## Branch Payroll

Payroll mengikuti Home Branch Employee.

Bukan Working Branch.

---

# PAY-030
## Multi Branch Commission

Treatment di Branch lain.

Commission tetap milik Employee.

Payroll tetap mengikuti Home Branch.

---

# PAY-031
## Payroll Audit

Payroll mencatat.

Created By.

Approved By.

Paid By.

Created At.

Approved At.

Paid At.

---

# PAY-032
## Payroll Security

Payroll hanya dapat diakses.

Owner.

Finance.

HR.

Manager (sesuai permission).

Stylist tidak dapat melihat Salary Employee lain.

---

# PAY-033
## Payroll Analytics

Analytics.

Salary Cost.

Commission Cost.

Average Commission.

Revenue per Employee.

Payroll per Branch.

---

# PAY-034
## Payroll Export

Payroll dapat diexport.

Excel.

PDF.

Future.

Accounting Export.

---

# PAY-035
## Payroll Completion Checklist

Payroll dianggap valid apabila.

✓ Employee.

✓ Payroll Period.

✓ Salary.

✓ Commission.

✓ Audit.

✓ Status.

Opsional.

Bonus.

Allowance.

Deduction.

---

# COM-001
## Commission Integrity

Commission tidak boleh dibuat dua kali untuk Treatment yang sama.

Gunakan.

Treatment Assignment.

Sebagai Reference.

---

# COM-002
## Commission Idempotency

Generate Commission.

Harus bersifat Idempotent.

Request berulang.

Tidak boleh menghasilkan Commission ganda.

---

# COM-003
## Commission Traceability

Setiap Commission dapat ditelusuri hingga.

Treatment.

↓

Appointment.

↓

Customer.

↓

Employee.

↓

Payroll.

---

# COM-004
## Commission Reporting

Report.

Commission by Employee.

Commission by Branch.

Commission by Service.

Commission by Month.

---

# COM-005
## Compensation Philosophy

Seluruh kompensasi Employee harus dapat dijelaskan.

Tidak boleh ada Salary.

Commission.

Bonus.

Yang tidak memiliki sumber transaksi.

---

# CHAPTER 9 SUMMARY

Payroll & Commission merupakan modul Compensation Management.

Workflow.

Attendance

↓

Treatment

↓

Commission

↓

Payroll

↓

Payroll Payment

Payroll tidak menghitung transaksi bisnis.

Payroll hanya mengompilasi hasil aktivitas Employee selama satu Payroll Period.

Seluruh komponen Payroll harus dapat diaudit, ditelusuri, dan direproduksi kembali kapan pun diperlukan.

# CHAPTER 10 — PRODUCTION BUSINESS RULES

---

# 10.1 Purpose

Production Module mengelola seluruh proses manufaktur pada NIAHAIR ERP.

Production mengubah Raw Material menjadi Finished Goods melalui proses yang terdokumentasi, dapat diaudit, dan terintegrasi dengan Inventory.

Production menjadi dasar bagi:

- Inventory
- Material Consumption
- Cost Calculation
- Quality Control
- Finished Goods
- Reporting

Production tidak boleh mengubah Inventory secara langsung.

Seluruh perubahan stok harus melalui Inventory Movement.

---

# PRD-001
## Production Order

### Purpose

Production hanya dapat dilakukan melalui Production Order.

### Business Rule

Seluruh proses produksi wajib memiliki Production Order.

Tidak boleh melakukan produksi tanpa dokumen.

---

# PRD-002
## Production Number

Production Order memiliki nomor unik.

Contoh.

```
PROD-20260628-0001
```

Nomor dibuat otomatis.

Tidak boleh berubah.

---

# PRD-003
## Production Status

Production memiliki workflow.

```
DRAFT

↓

RELEASED

↓

IN_PROGRESS

↓

QC

↓

COMPLETED
```

Workflow alternatif.

```
DRAFT

↓

CANCELLED
```

Status tidak boleh melompati tahapan.

---

# PRD-004
## Finished Goods

Satu Production Order menghasilkan satu atau lebih Finished Goods.

Contoh.

Hair Extension 18"

Hair Extension 20"

Tape Hair

Weft

---

# PRD-005
## Bill of Material (BOM)

Setiap Finished Goods memiliki BOM.

BOM terdiri dari.

Raw Material.

Quantity.

Unit.

Waste Allowance.

BOM menjadi standar konsumsi material.

---

# PRD-006
## Material Validation

Sebelum Production dimulai.

Seluruh material harus tersedia.

Validasi menggunakan.

Qty Available.

Jika stok tidak mencukupi.

Production tidak dapat dimulai.

---

# PRD-007
## Material Consumption

Raw Material tidak langsung mengurangi Inventory.

Material Consumption menghasilkan.

SERVICE_USAGE atau PRODUCTION Movement sesuai jenis proses.

---

# PRD-008
## Production Output

Finished Goods masuk Inventory melalui.

PRODUCTION Movement.

Tidak boleh menambah Inventory secara manual.

---

# PRD-009
## Waste Recording

Material yang terbuang wajib dicatat.

Waste tidak boleh menghilang tanpa jejak.

Waste digunakan untuk analisis efisiensi produksi.

---

# PRD-010
## Scrap

Barang gagal produksi dicatat sebagai Scrap.

Scrap tidak menjadi Finished Goods.

Jika masih dapat digunakan.

Harus melalui proses Rework.

---

# PRD-011
## Rework

Barang gagal dapat diproses ulang.

Rework menghasilkan histori baru.

Tidak mengubah histori Production sebelumnya.

---

# PRD-012
## Production Employee

Production memiliki Employee yang bertanggung jawab.

Future.

Dapat memiliki banyak Employee.

Operator.

Supervisor.

QC.

---

# PRD-013
## Production Time

Production menyimpan.

Started At.

Completed At.

Duration dihitung otomatis.

---

# PRD-014
## Quality Control

Seluruh Finished Goods wajib melewati QC.

Status.

PASS.

REWORK.

REJECT.

Finished Goods tidak boleh masuk Inventory sebelum QC PASS.

---

# PRD-015
## QC Checklist

Future.

QC memiliki Checklist.

Contoh.

Hair Length.

Hair Weight.

Hair Direction.

Hair Color.

Keratin Bond.

Packaging.

---

# PRD-016
## Batch Number

Finished Goods memiliki Batch Number.

Batch digunakan untuk.

Traceability.

Recall.

Quality Investigation.

---

# PRD-017
## Lot Number

Future.

Production mendukung Lot Number.

Lot tidak boleh berubah.

---

# PRD-018
## Production Cost

Production Cost dihitung dari.

Raw Material.

Labor.

Overhead (Future).

Total Cost dihitung oleh backend.

---

# PRD-019
## Average Cost

Future.

Finished Goods menggunakan Average Cost.

FIFO dapat digunakan sebagai alternatif.

---

# PRD-020
## Inventory Relation

Production menghasilkan dua kelompok Movement.

Material OUT.

Finished Goods IN.

Keduanya berada pada Transaction yang sama.

---

# PRD-021
## Warehouse Relation

Raw Material dan Finished Goods dapat berada pada Warehouse berbeda.

Transfer mengikuti Inventory Movement.

---

# PRD-022
## Production Notes

Production dapat memiliki Notes.

Notes digunakan untuk.

Kendala Produksi.

Perbaikan.

Instruksi.

---

# PRD-023
## Production Photos

Future.

Production dapat memiliki dokumentasi foto.

Before.

Process.

After.

QC.

---

# PRD-024
## Production Audit

Production mencatat.

Created By.

Started By.

Completed By.

Approved By.

Timestamp.

---

# PRD-025
## Production Analytics

Analytics.

Production Quantity.

Material Consumption.

Waste Percentage.

Average Duration.

Production Cost.

QC Pass Rate.

---

# PRD-026
## Production Planning (Future)

Production dapat direncanakan.

Daily.

Weekly.

Monthly.

---

# PRD-027
## Production Reservation

Material dapat di-reserve sebelum Production dimulai.

Reservation mengurangi Qty Available.

Tidak mengurangi Qty On Hand.

---

# PRD-028
## Production Closing

Production yang COMPLETED tidak boleh diubah.

Jika terjadi kesalahan.

Gunakan Adjustment Production.

---

# PRD-029
## Production Security

Production hanya dapat diakses oleh.

Production Staff.

Warehouse.

Manager.

Owner.

Permission diatur melalui Role.

---

# PRD-030
## Production Completion Checklist

Production dianggap valid apabila memiliki.

✓ Production Order.

✓ BOM.

✓ Raw Material.

✓ Finished Goods.

✓ QC.

✓ Inventory Movement.

✓ Audit.

---

# CHAPTER 10 SUMMARY

Production merupakan inti proses manufaktur NIAHAIR.

Workflow.

Production Order

↓

Material Validation

↓

Material Consumption

↓

Production Process

↓

Quality Control

↓

Finished Goods

↓

Inventory

Seluruh aktivitas produksi harus dapat ditelusuri dari Finished Goods kembali ke Raw Material yang digunakan.

Production menjadi penghubung antara Inventory, Quality Control, Costing, dan Reporting.

# CHAPTER 11 — PURCHASING & SUPPLIER BUSINESS RULES

---

# 11.1 Purpose

Purchasing Module mengelola seluruh proses pengadaan barang dari Supplier.

Purchasing memastikan seluruh material yang digunakan oleh Production, Treatment, dan Retail berasal dari proses pembelian yang terdokumentasi, dapat diaudit, dan terintegrasi dengan Inventory.

Purchasing bukan Inventory.

Purchasing menghasilkan Inventory.

---

# PUR-001
## Supplier Master

### Purpose

Supplier merupakan sumber resmi pembelian barang.

### Business Rule

Seluruh Purchase Order wajib memiliki Supplier.

Supplier harus berstatus ACTIVE.

---

# PUR-002
## Supplier Identity

Supplier memiliki.

- Supplier Code
- Supplier Name
- Contact Person
- Phone
- Email
- Address
- Payment Term
- Status

Supplier Code bersifat unik.

---

# PUR-003
## Supplier Status

Supplier memiliki status.

ACTIVE

INACTIVE

BLACKLIST (Future)

Supplier INACTIVE tidak dapat digunakan pada Purchase Order baru.

---

# PUR-004
## Purchase Order

Seluruh pembelian dilakukan melalui Purchase Order.

Tidak boleh menerima barang tanpa Purchase Order.

Exception.

Opening Stock.

Emergency Purchase (Future).

---

# PUR-005
## Purchase Order Number

Purchase Order memiliki nomor unik.

Contoh.

```
PO-20260628-0001
```

Nomor dibuat otomatis.

Tidak boleh berubah.

---

# PUR-006
## Purchase Order Status

Purchase Order memiliki workflow.

```
DRAFT

↓

APPROVED

↓

ORDERED

↓

PARTIALLY_RECEIVED

↓

RECEIVED

↓

CLOSED
```

Workflow alternatif.

```
DRAFT

↓

CANCELLED
```

---

# PUR-007
## Purchase Items

Purchase Order memiliki satu atau lebih Item.

Item harus merupakan Inventory Item.

Service tidak dapat dibeli melalui Purchase Order.

---

# PUR-008
## Receiving

Barang hanya boleh masuk Inventory melalui Receiving.

Receiving menghasilkan.

PURCHASE Inventory Movement.

---

# PUR-009
## Partial Receiving

Purchase Order dapat diterima sebagian.

Contoh.

PO.

100 pcs.

↓

Receiving.

40 pcs.

↓

Remaining.

60 pcs.

---

# PUR-010
## Full Receiving

Purchase Order menjadi RECEIVED apabila seluruh Item telah diterima.

---

# PUR-011
## Inventory Relation

Receiving menghasilkan.

Inventory Movement.

Movement Type.

PURCHASE.

Inventory tidak boleh bertambah tanpa Receiving.

---

# PUR-012
## Purchase Return

Barang dapat dikembalikan kepada Supplier.

Purchase Return menghasilkan.

RETURN Movement.

Tidak menghapus Receiving sebelumnya.

---

# PUR-013
## Purchase Price

Harga beli berasal dari Purchase Order.

Harga tidak boleh berubah setelah Receiving selesai.

---

# PUR-014
## Supplier Price History

Future.

Sistem menyimpan histori harga beli.

Digunakan untuk.

Cost Analysis.

Forecast.

Negotiation.

---

# PUR-015
## Payment Term

Supplier memiliki Payment Term.

Contoh.

Cash.

7 Hari.

30 Hari.

60 Hari.

Digunakan untuk Hutang (Future).

---

# PUR-016
## Purchase Approval

Future.

Purchase Order dapat memerlukan Approval.

Contoh.

```
Draft

↓

Manager

↓

Owner

↓

Approved
```

---

# PUR-017
## Warehouse Receiving

Receiving wajib menentukan Warehouse tujuan.

Barang tidak boleh diterima tanpa Warehouse.

---

# PUR-018
## Batch Receiving

Future.

Receiving dapat menyimpan.

Batch Number.

Lot Number.

Expiry Date.

---

# PUR-019
## Purchase Audit

Purchase Order mencatat.

Created By.

Approved By.

Received By.

Created At.

Approved At.

Received At.

---

# PUR-020
## Purchase Analytics

Analytics.

Top Supplier.

Purchase Value.

Average Purchase Cost.

Lead Time.

Supplier Performance.

Purchase Frequency.

---

# PUR-021
## Supplier Performance

Future.

Supplier memiliki KPI.

On Time Delivery.

Quality.

Price Stability.

Return Rate.

---

# PUR-022
## Purchase Security

Purchasing hanya dapat diakses oleh.

Purchasing.

Warehouse.

Manager.

Owner.

Permission ditentukan melalui Role.

---

# PUR-023
## Purchase Completion Checklist

Purchase dianggap valid apabila memiliki.

✓ Supplier

✓ Purchase Order

✓ Item

✓ Warehouse

✓ Receiving

✓ Inventory Movement

✓ Audit

---

# PUR-024
## Purchasing Integration

Purchasing terhubung dengan.

Inventory.

↓

Production.

↓

Finance.

↓

Reporting.

Purchasing tidak boleh mengubah Inventory secara langsung.

---

# PUR-025
## Supplier History

Supplier memiliki histori.

Purchase Order.

Receiving.

Purchase Return.

Total Purchase.

Last Purchase.

Seluruh histori dihitung dari transaksi.

---

# CHAPTER 11 SUMMARY

Purchasing merupakan proses resmi pengadaan barang pada NIAHAIR ERP.

Workflow.

Supplier

↓

Purchase Order

↓

Approval

↓

Receiving

↓

Inventory Movement

↓

Inventory

↓

Production

Purchasing menjadi penghubung antara Supplier, Inventory, Production, dan Finance.

Seluruh barang yang masuk ke perusahaan harus memiliki jejak transaksi Purchasing yang dapat diaudit.

# CHAPTER 12 — SYSTEM ADMINISTRATION & GOVERNANCE BUSINESS RULES

---

# 12.1 Purpose

Administration Module mengelola seluruh konfigurasi dan master data yang digunakan oleh NIAHAIR ERP.

Administration tidak menghasilkan transaksi bisnis.

Administration menyediakan konfigurasi yang digunakan oleh seluruh modul operasional.

Master Data harus stabil, konsisten, dan dapat diaudit.

---

# ADM-001
## Master Data Philosophy

### Purpose

Menjamin seluruh transaksi menggunakan referensi yang sama.

### Business Rule

Seluruh transaksi harus menggunakan Master Data.

Tidak diperbolehkan membuat nilai bebas pada transaksi apabila Master Data sudah tersedia.

---

# ADM-002
## Branch Master

Branch merupakan unit operasional perusahaan.

Branch memiliki.

- Code
- Name
- Address
- Phone
- Status

Branch tidak boleh Hard Delete.

---

# ADM-003
## Warehouse Master

Warehouse merupakan lokasi penyimpanan Inventory.

Warehouse tidak sama dengan Branch.

Satu Branch dapat memiliki banyak Warehouse.

---

# ADM-004
## Item Category

Seluruh Item memiliki Category.

Category digunakan untuk.

Reporting.

Searching.

Filtering.

Analytics.

---

# ADM-005
## Unit Master

Seluruh Inventory Item wajib memiliki Unit.

Contoh.

PCS

Bottle

Pack

Box

Gram

Kilogram

Liter

Milliliter

Unit tidak boleh dihapus apabila sudah digunakan.

---

# ADM-006
## Payment Method

Payment Method merupakan Master Data.

Contoh.

Cash

Transfer

QRIS

Debit Card

Credit Card

E-Wallet

Payment Method tidak boleh dihapus apabila memiliki transaksi.

---

# ADM-007
## Shift Master

Shift merupakan Master Data.

Shift menentukan.

Jam Masuk.

Jam Pulang.

Working Flag.

Color.

Shift yang telah digunakan.

Tidak boleh dihapus.

---

# ADM-008
## Role Master

Role menentukan hak akses sistem.

Role digunakan oleh User.

Role tidak boleh digunakan langsung oleh Employee Position.

---

# ADM-009
## Permission Master

Permission menggunakan format.

```
module.action
```

Contoh.

```
customer.read

customer.create

inventory.adjust

invoice.void
```

Permission tidak boleh Hardcoded di Frontend.

---

# ADM-010
## Employee Position

Position merupakan Master Data.

Contoh.

Stylist.

Assistant.

Receptionist.

Manager.

Warehouse.

Position tidak menentukan Permission.

---

# ADM-011
## Commission Rule

Commission Rule merupakan Master Data.

Commission Rule menggunakan.

Effective Date.

Rule lama tidak boleh berubah.

---

# ADM-012
## Branch Commission Rule

Branch dapat memiliki Commission Rule sendiri.

Rule Branch lebih tinggi prioritasnya dibanding Rule Global.

---

# ADM-013
## Settings

System Settings disimpan sebagai Configuration.

Tidak boleh Hardcode.

Contoh.

Business Name.

Timezone.

Currency.

Upload Size.

Default Tax.

---

# ADM-014
## Currency

Saat ini sistem menggunakan satu Currency.

Future.

Multi Currency.

---

# ADM-015
## Timezone

Seluruh perusahaan menggunakan satu Timezone.

Database tetap menggunakan UTC.

Frontend melakukan konversi.

---

# ADM-016
## Numbering Format

Nomor transaksi menggunakan format yang dapat dikonfigurasi.

Contoh.

```
INV-{YYYY}-{000001}
```

---

# ADM-017
## Business Calendar

Future.

Business Calendar menyimpan.

Holiday.

Special Working Day.

Maintenance Day.

---

# ADM-018
## Business Hours

Branch memiliki Jam Operasional.

Booking hanya dapat dibuat pada Jam Operasional.

Exception.

SUPER_ADMIN.

---

# ADM-019
## Upload Configuration

Jenis file yang diperbolehkan.

JPG.

PNG.

WEBP.

PDF (Future).

Ukuran maksimum berasal dari Configuration.

---

# ADM-020
## Notification Settings

Future.

Pengguna dapat mengatur.

WhatsApp.

Telegram.

Email.

Push Notification.

---

# ADM-021
## Feature Flags

Future.

Fitur baru dapat diaktifkan melalui Feature Flag.

Tanpa deploy ulang aplikasi.

---

# ADM-022
## Audit Configuration

Perubahan Configuration wajib dicatat.

Created By.

Updated By.

Reason.

Timestamp.

---

# ADM-023
## Master Data Deactivation

Master Data yang telah digunakan.

Tidak boleh Hard Delete.

Gunakan.

```
isActive = false
```

---

# ADM-024
## Master Data Versioning

Future.

Perubahan Master Data penting.

Contoh.

Commission Rule.

Tax.

Configuration.

Menggunakan Versioning.

---

# ADM-025
## Administration Security

Administration hanya dapat diakses oleh.

SUPER_ADMIN.

OWNER.

Manager (sesuai Permission).

---

# ADM-026
## Backup Configuration

Configuration menjadi bagian dari Backup.

Restore Configuration harus dapat dilakukan tanpa mengubah transaksi.

---

# ADM-027
## Import Master Data

Master Data dapat diimport.

Sistem wajib melakukan validasi.

Duplicate.

Required Field.

Reference.

---

# ADM-028
## Export Master Data

Master Data dapat diexport.

Excel.

CSV.

JSON (Future).

---

# ADM-029
## System Health

Future.

Administration memiliki Dashboard.

API Status.

Worker.

Queue.

Database.

Cloudinary.

Accurate.

---

# ADM-030
## Governance Principle

Seluruh perubahan Master Data harus memenuhi.

✓ Audit.

✓ Permission.

✓ Validation.

✓ Backward Compatibility.

Master Data menjadi fondasi seluruh transaksi ERP.

---

# CHAPTER 12 SUMMARY

Administration Module merupakan pusat konfigurasi NIAHAIR ERP.

Administration mengelola.

Branch.

Warehouse.

Role.

Permission.

Shift.

Payment Method.

Settings.

Commission Rule.

Configuration.

Administration tidak menghasilkan transaksi bisnis.

Administration menyediakan fondasi yang digunakan oleh seluruh modul operasional.

# CHAPTER 13 — INTEGRATION & SYNCHRONIZATION BUSINESS RULES

---

# 13.1 Purpose

Integration Module mengatur seluruh komunikasi antara NIAHAIR ERP dengan sistem eksternal.

Tujuan utama Integration adalah.

- Data Consistency
- Reliability
- Auditability
- Idempotency
- Asynchronous Processing

Operasional salon tidak boleh bergantung pada ketersediaan sistem eksternal.

---

# INT-001
## ERP Source of Truth

### Purpose

Menentukan sumber utama data.

### Business Rule

ERP merupakan Source of Truth untuk seluruh transaksi operasional.

Accurate merupakan Source of Truth untuk Accounting.

Cloudinary merupakan Source of Truth untuk media.

Tidak boleh ada dua sistem yang menjadi sumber utama data yang sama.

---

# INT-002
## Integration Philosophy

Semua integrasi menggunakan.

```
ERP

↓

Queue

↓

Worker

↓

External System
```

Frontend tidak boleh berkomunikasi langsung dengan sistem eksternal.

---

# INT-003
## Queue First

Seluruh integrasi menggunakan Queue.

Contoh.

Invoice.

↓

Queue.

↓

Worker.

↓

Accurate.

Operasional tidak boleh menunggu proses sinkronisasi selesai.

---

# INT-004
## Idempotency

Seluruh proses Sync harus bersifat Idempotent.

Request yang sama.

Tidak boleh menghasilkan transaksi ganda.

---

# INT-005
## Retry Policy

Jika Sync gagal.

Status.

```
FAILED

↓

RETRY

↓

SUCCESS
```

Retry mengikuti konfigurasi sistem.

---

# INT-006
## Sync Status

Setiap transaksi memiliki Sync Status.

PENDING

PROCESSING

SUCCESS

FAILED

SKIPPED

---

# INT-007
## Sync Audit

Seluruh Sync mencatat.

Started At.

Finished At.

Retry Count.

Error Message.

External Reference.

---

# INT-008
## Customer Sync

Customer dibuat di ERP.

↓

Queue.

↓

Accurate.

Jika gagal.

Customer tetap dapat digunakan.

---

# INT-009
## Item Sync

Master Item berasal dari ERP.

Sinkronisasi ke Accurate mengikuti konfigurasi.

Jika Accurate menjadi Master.

ERP hanya melakukan Read Sync.

---

# INT-010
## Inventory Sync

Inventory merupakan data operasional ERP.

Sync ke Accurate hanya dilakukan sesuai kebutuhan akuntansi.

ERP tidak melakukan overwrite Inventory karena hasil Sync.

---

# INT-011
## Invoice Sync

Invoice yang memenuhi syarat.

↓

Queue.

↓

Accurate.

Invoice tetap valid walaupun Sync gagal.

---

# INT-012
## Payment Sync

Payment berhasil.

↓

Queue.

↓

Accurate.

Payment Customer tidak boleh menunggu Accurate.

---

# INT-013
## Cloudinary

Semua media disimpan pada Cloudinary.

Database hanya menyimpan.

Public ID.

URL.

Metadata.

---

# INT-014
## Media Delete

Menghapus media harus.

Delete Cloudinary.

↓

Delete Database.

↓

Create Audit.

Jika Cloudinary gagal.

Database tidak boleh dihapus.

---

# INT-015
## Worker

Background Worker menjalankan.

Queue.

Reminder.

Retry.

Scheduler.

Notification.

Worker tidak menerima request dari Frontend.

---

# INT-016
## Scheduler

Scheduler menjalankan.

Daily Reminder.

Retry Queue.

Closing Period.

Cleanup.

Dashboard Refresh.

Scheduler menggunakan System Account.

---

# INT-017
## Notification

Notification dikirim melalui Queue.

Jenis.

WhatsApp.

Telegram.

Email.

Push Notification.

Future.

SMS.

---

# INT-018
## Webhook

Webhook hanya diterima dari sistem terpercaya.

Semua Webhook wajib.

Signature Validation.

Timestamp Validation.

Audit.

Idempotency.

---

# INT-019
## AI Integration

AI hanya digunakan sebagai Advisor.

AI tidak boleh.

Create Invoice.

Delete Inventory.

Approve Payroll.

Mengubah transaksi bisnis.

---

# INT-020
## External Failure

Jika sistem eksternal gagal.

ERP tetap berjalan.

Sync akan diproses ulang oleh Worker.

---

# INT-021
## Accurate Availability

Accurate Down.

↓

ERP tetap Online.

↓

Queue bertambah.

↓

Retry otomatis.

---

# INT-022
## Cloudinary Availability

Cloudinary gagal.

↓

Upload gagal.

↓

Transaksi tetap berjalan.

↓

User dapat upload ulang.

---

# INT-023
## Sync Conflict

Jika terjadi konflik.

ERP menjadi sumber operasional.

Perbaikan dilakukan melalui Adjustment.

Bukan overwrite.

---

# INT-024
## Reference Integrity

Seluruh Sync menyimpan.

External ID.

Internal ID.

Reference Number.

Sync Timestamp.

---

# INT-025
## API Version

Future.

Semua API menggunakan Version.

Contoh.

```
/api/v1

/api/v2
```

---

# INT-026
## Queue Monitoring

Queue memiliki Dashboard.

Pending.

Processing.

Failed.

Retry.

Success.

---

# INT-027
## Worker Monitoring

Worker mencatat.

Started.

Stopped.

Heartbeat.

Memory.

CPU.

Last Job.

---

# INT-028
## Integration Security

API Key.

Secret.

Token.

JWT.

Disimpan pada Environment.

Tidak boleh Hardcode.

---

# INT-029
## Integration Logging

Semua integrasi mencatat.

Request.

Response.

Duration.

Status.

Reference.

Error.

---

# INT-030
## Sync Completion Checklist

Sync dianggap berhasil apabila.

✓ Queue Success.

✓ External Reference tersedia.

✓ Audit dibuat.

✓ Retry = 0 (atau selesai).

✓ Data konsisten.

---

# CHAPTER 13 SUMMARY

Integration Module menghubungkan ERP dengan seluruh sistem eksternal.

ERP

↓

Queue

↓

Worker

↓

External System

Seluruh integrasi harus bersifat.

- Asynchronous
- Idempotent
- Auditable
- Retryable
- Fault Tolerant

Operasional salon tidak boleh berhenti hanya karena sistem eksternal mengalami gangguan.

# CHAPTER 14 — EXCEPTION & ERROR HANDLING BUSINESS RULES

---

# 14.1 Purpose

Exception Rules mendefinisikan bagaimana NIAHAIR ERP menangani kondisi yang tidak normal.

Tujuan utama.

- Data Integrity
- Business Continuity
- Auditability
- Recoverability

Sistem tidak boleh kehilangan data walaupun terjadi kegagalan.

---

# EXP-001
## Fail Safe Principle

### Purpose

Operasional salon harus tetap berjalan.

### Business Rule

Jika sistem eksternal gagal.

Operasional ERP tetap berjalan.

Contoh.

Accurate Down.

↓

Invoice tetap dibuat.

↓

Queue Pending.

↓

Retry.

---

# EXP-002
## Fail Fast

Jika Business Rule dilanggar.

Sistem harus langsung menghentikan proses.

Tidak boleh melanjutkan transaksi.

---

# EXP-003
## Database Transaction

Seluruh transaksi multi tabel wajib menggunakan Database Transaction.

Jika satu proses gagal.

Seluruh transaksi dibatalkan.

---

# EXP-004
## Partial Failure

Jika proses terdiri dari beberapa langkah.

Contoh.

Create Invoice.

↓

Generate Inventory.

↓

Generate Commission.

↓

Sync Accurate.

Maka.

Invoice tetap berhasil.

Sync Accurate dapat gagal.

Queue melakukan Retry.

---

# EXP-005
## External System Failure

Jika.

Accurate.

Cloudinary.

WhatsApp.

Telegram.

Email.

Mengalami kegagalan.

↓

ERP tetap Online.

↓

Retry Queue.

---

# EXP-006
## Duplicate Request

Request yang sama.

Tidak boleh menghasilkan transaksi ganda.

Gunakan.

Idempotency.

Reference ID.

---

# EXP-007
## Browser Refresh

User Refresh.

↓

Request dikirim ulang.

↓

Backend wajib mendeteksi.

↓

Tidak boleh membuat transaksi baru.

---

# EXP-008
## Double Click

Klik tombol dua kali.

↓

Backend tetap hanya membuat satu transaksi.

---

# EXP-009
## Network Timeout

Jika timeout terjadi.

Status transaksi harus dapat diketahui.

Tidak boleh membuat User menebak.

---

# EXP-010
## Retry

Retry hanya boleh dilakukan pada proses yang aman.

Contoh.

Sync.

Notification.

Webhook.

Tidak pada.

Payment.

Payroll.

Inventory Adjustment.

---

# EXP-011
## Inventory Negative

Inventory tidak boleh negatif.

Jika.

Qty Available.

< 0

↓

422 Validation Error.

Exception.

Configuration mengizinkan Negative Inventory.

---

# EXP-012
## Closed Period

Jika Inventory Period.

CLOSED.

↓

Semua Movement ditolak.

Return.

422 Validation Error.

---

# EXP-013
## Payroll Closed

Payroll CLOSED.

↓

Tidak boleh.

Tambah Commission.

Tambah Bonus.

Tambah Adjustment.

---

# EXP-014
## Invalid Workflow

Workflow tidak boleh melompati status.

Contoh.

BOOKED.

↓

COMPLETED.

↓

Ditolak.

---

# EXP-015
## Missing Reference

Transaksi wajib memiliki Reference.

Jika Reference hilang.

Transaksi dibatalkan.

---

# EXP-016
## Orphan Data

Tidak boleh ada.

Invoice tanpa Customer.

Treatment tanpa Appointment.

Inventory tanpa Warehouse.

Payment tanpa Invoice.

---

# EXP-017
## Upload Failure

Jika Upload Cloudinary gagal.

↓

Database tidak boleh menyimpan Photo.

---

# EXP-018
## Delete Failure

Delete Media.

↓

Cloudinary gagal.

↓

Database tetap dipertahankan.

↓

Retry.

---

# EXP-019
## Sync Conflict

Jika ERP dan Accurate berbeda.

↓

ERP menjadi sumber operasional.

↓

Perbaikan menggunakan Adjustment.

---

# EXP-020
## Invalid Permission

Permission tidak cukup.

↓

403 Forbidden.

Tidak menggunakan 500.

---

# EXP-021
## Authentication Failure

JWT tidak valid.

↓

401 Unauthorized.

---

# EXP-022
## Validation Failure

Business Rule gagal.

↓

422 Validation Error.

---

# EXP-023
## Resource Not Found

Data tidak ditemukan.

↓

404 Not Found.

---

# EXP-024
## Unexpected Error

Kesalahan sistem.

↓

500 Internal Server Error.

Error dicatat.

User tidak melihat Stack Trace.

---

# EXP-025
## Audit Failure

Jika Audit gagal.

↓

Transaksi dianggap gagal.

Audit wajib dibuat.

---

# EXP-026
## Queue Failure

Queue gagal.

↓

FAILED.

↓

Retry.

↓

Alert jika melebihi batas.

---

# EXP-027
## Worker Failure

Worker mati.

↓

Queue berhenti.

↓

Backend tetap Online.

↓

Monitoring memberi Alert.

---

# EXP-028
## Duplicate Customer

Customer dengan Phone yang sama.

↓

Ditolak.

↓

Gunakan Merge (Future).

---

# EXP-029
## Duplicate Employee

Employee Code sama.

↓

Ditolak.

---

# EXP-030
## Duplicate Invoice

Invoice Number sama.

↓

Ditolak.

---

# EXP-031
## Duplicate Payment

Payment dengan Reference sama.

↓

Ditolak.

---

# EXP-032
## Duplicate Inventory Movement

Movement dengan Reference sama.

↓

Tidak boleh dibuat dua kali.

---

# EXP-033
## Duplicate Commission

Commission Treatment.

↓

Sudah ada.

↓

Skip.

---

# EXP-034
## Duplicate Payroll

Payroll Employee.

↓

Payroll Period.

↓

Harus unik.

---

# EXP-035
## Schedule Conflict

Employee memiliki dua Shift.

↓

Ditolak.

---

# EXP-036
## Appointment Conflict

Appointment overlap.

↓

Ditolak.

---

# EXP-037
## Treatment Conflict

Treatment sudah COMPLETED.

↓

Tidak boleh diedit.

---

# EXP-038
## Invoice Conflict

Invoice PAID.

↓

Tidak boleh VOID tanpa Approval.

---

# EXP-039
## Payment Conflict

Payment berhasil.

↓

Tidak boleh DELETE.

Gunakan Refund.

---

# EXP-040
## Inventory Conflict

Movement Locked.

↓

Tidak boleh UPDATE.

Tidak boleh DELETE.

---

# EXP-041
## Production Conflict

Production COMPLETED.

↓

Tidak boleh diubah.

---

# EXP-042
## Purchase Conflict

Receiving selesai.

↓

Tidak boleh dihapus.

---

# EXP-043
## Branch Conflict

User tidak memiliki Branch Access.

↓

403 Forbidden.

---

# EXP-044
## Data Recovery

Jika transaksi gagal di tengah proses.

↓

Rollback.

↓

Audit.

↓

Log.

---

# EXP-045
## Logging

Semua Exception mencatat.

Timestamp.

User.

Employee.

Branch.

Module.

Request ID.

Stack.

---

# EXP-046
## Alert

Exception kritikal.

↓

Kirim Alert.

Future.

Telegram.

Email.

Dashboard.

---

# EXP-047
## User Friendly Error

User tidak boleh melihat.

SQL Error.

Prisma Error.

Stack Trace.

Gunakan pesan bisnis.

---

# EXP-048
## Retry Limit

Retry memiliki batas.

Jika melebihi.

↓

FAILED PERMANENTLY.

↓

Manual Review.

---

# EXP-049
## Business Continuity

Kegagalan satu module.

Tidak boleh menghentikan module lain.

---

# EXP-050
## Exception Completion Checklist

Seluruh Exception harus.

✓ Logged.

✓ Audited.

✓ Recoverable.

✓ User Friendly.

✓ Tidak merusak data.

---

# CHAPTER 14 SUMMARY

Exception Management memastikan seluruh NIAHAIR ERP tetap berjalan walaupun terjadi kegagalan.

Seluruh Exception harus memenuhi prinsip.

- Fail Safe
- Fail Fast
- Atomic Transaction
- Audit Trail
- Retry
- Idempotency
- Recoverability

Tidak ada Exception yang boleh menyebabkan data menjadi tidak konsisten.

# CHAPTER 15 — ERP EVOLUTION & FUTURE BUSINESS RULES

---

# 15.1 Purpose

Chapter ini mendefinisikan prinsip pengembangan jangka panjang NIAHAIR ERP.

Seluruh fitur baru harus mengikuti aturan pada chapter ini agar arsitektur tetap konsisten.

Business Rule pada chapter ini memiliki prioritas setelah General Business Rules.

---

# FUT-001
## Business First

### Purpose

ERP harus berkembang mengikuti kebutuhan bisnis.

### Business Rule

Seluruh fitur baru harus memiliki kebutuhan bisnis yang jelas.

Teknologi bukan alasan utama menambah fitur.

---

# FUT-002
## Modular Architecture

Semua fitur baru harus berada pada Module yang sesuai.

Tidak boleh mencampur Business Logic antar Module.

Contoh.

Inventory tidak boleh menghitung Payroll.

Payroll tidak boleh mengubah Inventory.

---

# FUT-003
## Single Source of Truth

Tidak boleh membuat sumber data baru untuk informasi yang sudah dimiliki Module lain.

Contoh.

Customer hanya berasal dari Customer Module.

Inventory hanya berasal dari Inventory Module.

---

# FUT-004
## Backward Compatibility

Perubahan tidak boleh merusak data lama.

Migration harus bersifat aman.

Semua perubahan schema harus mempertimbangkan data historis.

---

# FUT-005
## Auditability

Semua fitur baru harus dapat diaudit.

Minimal.

Created By.

Created At.

Updated By.

Updated At.

---

# FUT-006
## Permission First

Semua Module baru wajib memiliki Permission.

Tidak boleh ada endpoint tanpa Authorization.

---

# FUT-007
## Branch Ready

Semua fitur baru harus mendukung Multi Branch.

Tidak boleh membuat fitur yang hanya bekerja pada satu Branch.

---

# FUT-008
## Warehouse Ready

Semua fitur Inventory baru harus mendukung Multi Warehouse.

---

# FUT-009
## Multi Company Ready

Future.

ERP harus dapat berkembang menjadi Multi Company.

Branch bukan Company.

Company dapat memiliki banyak Branch.

---

# FUT-010
## Multi Currency Ready

Future.

Seluruh transaksi harus dapat dikembangkan menjadi Multi Currency.

Saat ini tetap menggunakan satu Currency.

---

# FUT-011
## Localization

ERP harus mendukung.

Bahasa.

Timezone.

Format Tanggal.

Format Mata Uang.

Tanpa mengubah Business Logic.

---

# FUT-012
## API First

Seluruh Business Logic harus dapat diakses melalui API.

Frontend.

Mobile.

Partner.

Menggunakan API yang sama.

---

# FUT-013
## Mobile Ready

Seluruh fitur baru harus mempertimbangkan penggunaan Mobile.

Business Logic tidak boleh bergantung pada Web.

---

# FUT-014
## AI Ready

AI hanya bertindak sebagai Advisor.

AI tidak boleh.

Approve Payroll.

Delete Inventory.

Create Payment.

Mengubah transaksi bisnis.

---

# FUT-015
## Event Ready

Future.

Seluruh transaksi penting menghasilkan Business Event.

Contoh.

InvoiceCreated.

TreatmentCompleted.

PaymentReceived.

InventoryAdjusted.

---

# FUT-016
## Queue Ready

Proses berat harus dipindahkan ke Queue.

Contoh.

Notification.

Sync.

Report Generation.

Export.

---

# FUT-017
## Notification Ready

Future.

Semua Module dapat menghasilkan Notification.

Notification menggunakan Platform Service.

---

# FUT-018
## Reporting Ready

Seluruh transaksi harus dapat digunakan untuk Reporting.

Tidak boleh membuat data khusus hanya untuk laporan.

---

# FUT-019
## Analytics Ready

Analytics dihitung dari transaksi.

Analytics tidak boleh menjadi sumber transaksi.

---

# FUT-020
## Integration Ready

Semua integrasi baru harus menggunakan Platform Layer.

Business Module tidak boleh berkomunikasi langsung dengan sistem eksternal.

---

# FUT-021
## Performance Ready

Seluruh fitur baru harus mempertimbangkan.

Database Index.

Pagination.

Filtering.

Caching.

Scalability.

---

# FUT-022
## Security Ready

Seluruh fitur baru wajib memenuhi.

Authentication.

Authorization.

Audit.

Permission.

Validation.

---

# FUT-023
## Testing Ready

Seluruh fitur baru harus memiliki.

Unit Test.

Integration Test.

Business Validation.

---

# FUT-024
## Documentation Ready

Setiap perubahan besar wajib memperbarui.

Blueprint.

Business Rules.

Architecture Decision.

API Documentation.

---

# FUT-025
## ERP Evolution Roadmap

Prioritas pengembangan ERP.

```
CRM

↓

Appointment

↓

Treatment

↓

Inventory

↓

Finance

↓

Payroll

↓

Production

↓

Purchasing

↓

Business Intelligence

↓

Artificial Intelligence

↓

Multi Company

↓

Public API

↓

Mobile Platform

↓

Internationalization
```

---

# FUT-026
## Technical Evolution

Future Technology.

Redis.

BullMQ.

OpenTelemetry.

Grafana.

Prometheus.

ElasticSearch.

Data Warehouse.

CQRS (Jika diperlukan).

Event Sourcing (Jika diperlukan).

Teknologi baru hanya digunakan jika memberikan nilai bisnis.

---

# FUT-027
## Business Rule Evolution

Business Rules merupakan Living Document.

Perubahan Rule harus melalui.

Business Review.

↓

Architecture Review.

↓

Documentation.

↓

Implementation.

↓

Testing.

---

# FUT-028
## Architecture Protection

Tidak boleh membuat fitur yang melanggar.

ERP Blueprint.

Business Rules.

Architecture Decision.

Jika diperlukan perubahan.

Blueprint harus diperbarui terlebih dahulu.

---

# FUT-029
## Long-Term Maintainability

Kode harus mudah dipahami oleh developer baru.

Business Rule harus lebih penting daripada implementasi teknis.

Refactor diperbolehkan.

Perubahan perilaku bisnis harus terdokumentasi.

---

# FUT-030
## ERP Vision

NIAHAIR ERP dikembangkan sebagai platform operasional jangka panjang.

Target sistem.

- Multi Branch.
- Multi Warehouse.
- Manufacturing.
- Business Intelligence.
- AI Assisted.
- Franchise Ready.
- Multi Company Ready.

Seluruh pengembangan harus menjaga.

- Konsistensi.
- Integritas Data.
- Auditability.
- Scalability.
- Maintainability.

---

# CHAPTER 15 SUMMARY

Chapter ini menjadi pedoman evolusi NIAHAIR ERP.

Seluruh fitur baru harus:

✓ Mengikuti Blueprint.

✓ Mengikuti Business Rules.

✓ Mendukung Multi Branch.

✓ Mendukung Audit.

✓ Mendukung Scalability.

✓ Mendukung Integrasi.

✓ Mendukung Pengembangan Jangka Panjang.

Business Rules bukan dokumen statis.

Business Rules merupakan Living Document yang berkembang bersama bisnis NIAHAIR.

---

# END OF BUSINESS RULES

Version : 1.0

Status : Living Document

Document Owner : Dani

Lead Architect : ChatGPT

Implementation : Claude Code

Last Review : June 2026

Copyright © NIAHAIR ERP