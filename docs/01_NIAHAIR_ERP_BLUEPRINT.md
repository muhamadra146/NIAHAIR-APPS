01_NIAHAIR_ERP_BLUEPRINT.md (sampai selesai)
02_BUSINESS_RULES.md
03_ARCHITECTURE_DECISIONS.md
04_UI_UX_GUIDELINES.md
05_DATA_DICTIONARY.md
06_API_STANDARDS.md
07_DEVELOPMENT_ROADMAP.md

Tahap 1 (Engineering Core)
08_CODING_STANDARDS.md
09_TESTING_GUIDE.md
20_AI_DEVELOPMENT_GUIDE.md
21_PROJECT_CONVENTIONS.md
22_MODULE_IMPLEMENTATION_GUIDE.md

Tahap 2 (Production & Operations)
10_DEPLOYMENT_RUNBOOK.md
11_SECURITY_GUIDE.md
12_OPERATIONS_MANUAL.md
13_SUPPORT_MANUAL.md
14_DISASTER_RECOVERY_PLAN.md
15_MONITORING_GUIDE.md

Tahap 3 (Living Documentation)
16_RELEASE_NOTES.md
17_CHANGELOG.md
18_FEATURE_SPECIFICATIONS.md
19_KNOWLEDGE_BASE.md

# NIAHAIR ERP BLUEPRINT

Version : 1.0

Status : Living Document

Project Name : NIAHAIR ERP

Document Owner : Dani

Lead Software Architect : ChatGPT

Implementation Engineer : Claude Code

Last Updated : June 2026

---

# 1. Executive Summary

NIAHAIR ERP adalah Enterprise Resource Planning (ERP) yang dibangun khusus untuk industri salon profesional dan manufaktur hair extension.

Berbeda dengan software salon konvensional yang hanya berfokus pada kasir dan booking, NIAHAIR ERP dirancang sebagai sistem terintegrasi yang menghubungkan seluruh proses bisnis perusahaan dalam satu platform.

Platform ini mencakup:

* Customer Relationship Management (CRM)
* Booking Management
* Daily Operation
* Treatment Workflow
* Inventory Management
* Manufacturing
* Warehouse
* Purchasing
* Finance
* Payroll
* Accurate Integration
* Reporting
* Analytics

Seluruh modul saling terhubung sehingga data hanya dimasukkan satu kali namun dapat digunakan oleh seluruh departemen.

---

# 2. Vision

Menjadi ERP salon dan hair extension paling lengkap di Indonesia yang mampu mengelola seluruh operasional perusahaan dari customer datang hingga laporan keuangan selesai diproses.

---

# 3. Mission

Membangun platform yang:

* Cepat digunakan oleh operasional.
* Mudah dipelajari oleh karyawan baru.
* Mendukung multi branch.
* Mendukung manufacturing.
* Mendukung Accurate sebagai accounting system.
* Memiliki audit trail lengkap.
* Memiliki arsitektur yang mudah dikembangkan selama bertahun-tahun.

---

# 4. Core Principles

Seluruh pengembangan NIAHAIR ERP harus mengikuti prinsip berikut.

## 4.1 Single Source of Truth

Setiap data hanya memiliki satu sumber utama.

Contoh:

Customer hanya berasal dari Customer Module.

Inventory hanya berasal dari Inventory Module.

Employee hanya berasal dari Employee Module.

Tidak boleh ada duplikasi data antar modul.

---

## 4.2 Modular Architecture

Setiap domain bisnis dipisahkan menjadi module independen.

Contoh:

Customer

Appointment

Treatment

Inventory

Finance

Payroll

Production

Module tidak boleh saling mengetahui implementasi internal masing-masing.

Interaksi dilakukan melalui service layer.

---

## 4.3 Event Driven Workflow

Perubahan status bisnis menghasilkan event.

Contoh:

Treatment Completed

↓

Generate Material Usage

↓

Generate Inventory Movement

↓

Generate Commission

↓

Generate Payroll

↓

Update Customer History

Semua proses mengikuti workflow.

Tidak boleh dilakukan secara manual oleh user.

---

## 4.4 Immutable History

History tidak boleh diubah.

InventoryMovement

Payment

Invoice

Commission

Audit Log

bersifat immutable.

Jika terjadi kesalahan maka dibuat transaksi koreksi.

Bukan mengubah history.

---

## 4.5 Mobile First

Semua halaman wajib dapat digunakan pada:

Desktop

Tablet

Mobile

List berubah menjadi Card pada layar kecil.

---

## 4.6 Responsive Operational UI

Halaman operasional tidak boleh berupa CRUD biasa.

Contoh:

Treatment

Schedule

Daily Board

Inventory

harus menjadi workspace yang nyaman digunakan sepanjang hari oleh operasional.

---

## 4.7 ERP First

Setiap keputusan desain harus mempertimbangkan dampaknya terhadap:

Inventory

Finance

Payroll

Reporting

Manufacturing

Bukan hanya tampilan halaman.

---

# 5. ERP Scope

NIAHAIR ERP terdiri dari enam domain utama.

CRM

Booking & Front Office

Treatment

Inventory & Warehouse

Finance

Human Resource

Manufacturing

Administration

Setiap domain dapat berkembang tanpa mengubah domain lain.

---

# 6. Target Users

Owner

Manager

Finance

Cashier

Receptionist

Stylist

Assistant

Colorist

Warehouse Staff

Production Staff

HR

Administrator

Setiap role memiliki permission yang berbeda.

Permission tidak boleh ditentukan di frontend.

Frontend hanya menyembunyikan menu.

Backend tetap menjadi authority utama.

---

# 7. Success Criteria

ERP dianggap berhasil apabila:

Customer datang.

↓

Booking.

↓

Check In.

↓

Treatment.

↓

Inventory otomatis berkurang.

↓

Invoice otomatis terbentuk.

↓

Payment tercatat.

↓

Commission dihitung.

↓

Payroll siap diproses.

↓

Customer History bertambah.

↓

Accurate berhasil sinkron.

Tanpa input data berulang.

---

# 8. Non Goals

NIAHAIR ERP bukan:

Marketplace

E-commerce

Accounting System

General ERP

Accounting tetap menggunakan Accurate.

ERP hanya mengelola operasional bisnis dan sinkronisasi transaksi.

---

# 9. Living Document

Blueprint ini merupakan dokumen hidup.

Setiap perubahan besar pada arsitektur, workflow, atau modul wajib memperbarui blueprint terlebih dahulu sebelum implementasi dilakukan.

Blueprint menjadi referensi utama seluruh pengembangan sistem.

Jika implementasi berbeda dengan blueprint, maka blueprint harus direvisi atau implementasi diperbaiki.

# PART 2 — BUSINESS ARCHITECTURE & COMPLETE BUSINESS FLOW

---

# 10. Business Architecture

NIAHAIR ERP dibangun berdasarkan konsep **Business Domain**.

Setiap domain memiliki tanggung jawab yang jelas dan tidak boleh mengambil alih tanggung jawab domain lain.

```
CRM
│
├── Customer
├── Membership
├── Customer Notes
└── Customer 360

↓

Front Office
│
├── Appointment
├── Daily Board
├── Check In
└── Reception

↓

Treatment
│
├── Treatment Session
├── Staff Assignment
├── Photos
├── Material Usage
└── Timeline

↓

Inventory
│
├── Item
├── Warehouse
├── Inventory
├── Inventory Movement
├── Stock Transfer
└── Stock Adjustment

↓

Finance
│
├── Invoice
├── Deposit
├── Payment
├── Cash Account
└── Accurate Sync

↓

Human Resource
│
├── Employee
├── Attendance
├── Leave
├── Commission
└── Payroll

↓

Manufacturing
│
├── Production Order
├── Raw Material
├── Finished Goods
└── Quality Control
```

Setiap domain hanya bertanggung jawab terhadap data miliknya sendiri.

---

# 11. Master Business Flow

Seluruh operasional salon mengikuti workflow berikut.

```
Customer

↓

Appointment

↓

Schedule

↓

Reception

↓

Check In

↓

Treatment Session

↓

Material Usage

↓

Inventory Movement

↓

Invoice

↓

Payment

↓

Commission

↓

Payroll

↓

Customer History

↓

Reports

↓

Accurate Sync
```

Workflow ini adalah **alur utama ERP**.

Semua modul lain merupakan pendukung workflow tersebut.

---

# 12. Customer Lifecycle

```
Lead

↓

Customer Baru

↓

Member

↓

Repeat Customer

↓

VIP Customer
```

Setiap customer memiliki histori seumur hidup.

Data customer **tidak pernah dihapus**.

Semua transaksi akan selalu terhubung dengan Customer.

---

# 13. Appointment Lifecycle

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

Cabang lain

```
BOOKED

↓

RESCHEDULED
```

atau

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

Semua perubahan status dicatat pada AppointmentStatusHistory.

---

# 14. Daily Operation Flow

Pagi hari.

Reception membuka Daily Board.

```
Today's Appointment

↓

Customer Datang

↓

Check In

↓

Assign Staff

↓

Treatment
```

Stylist tidak membuka menu Appointment.

Stylist bekerja melalui Treatment Workspace.

---

# 15. Treatment Workflow

Treatment merupakan pusat operasional ERP.

```
Appointment

↓

Treatment Session

↓

Assign Stylist

↓

Assign Assistant

↓

Assign Colorist

↓

Upload Reference Photo

↓

Upload Before Photo

↓

Treatment Progress

↓

Material Usage

↓

Upload After Photo

↓

Complete Treatment
```

Treatment Session merupakan sumber utama untuk:

Commission

Payroll

Inventory

Customer History

Reporting

---

# 16. Material Usage Workflow

Setiap Treatment memiliki Material Usage.

```
Treatment

↓

Load Service BOM

↓

Stylist Review

↓

Adjust Quantity

↓

Save Material Usage
```

Material Usage belum mengurangi stok.

Material Usage hanya mencatat konsumsi aktual.

---

# 17. Inventory Workflow

Saat Treatment selesai.

```
Treatment Completed

↓

Generate Inventory Movement

↓

Update Inventory

↓

Sync Queue

↓

Accurate
```

Inventory tidak boleh dikurangi secara manual oleh stylist.

Inventory hanya berubah melalui Inventory Movement.

---

# 18. Sales Workflow

Produk Retail.

```
Customer

↓

POS

↓

Invoice

↓

Payment

↓

Inventory Movement

↓

Sync Accurate
```

Berbeda dengan Treatment.

---

# 19. Deposit Workflow

```
Top Up Deposit

↓

Deposit Balance

↓

Invoice

↓

Apply Deposit

↓

Remaining Balance
```

Deposit tidak boleh langsung menjadi Payment.

Deposit hanya menjadi sumber pembayaran.

---

# 20. Payment Workflow

```
Invoice

↓

Payment

↓

Paid

↓

Accurate
```

Invoice dapat memiliki banyak Payment.

Payment tidak boleh melebihi Outstanding Invoice.

---

# 21. Commission Workflow

Commission hanya dihitung dari Treatment yang telah selesai.

```
Treatment Completed

↓

Read Commission Rules

↓

Generate Commission

↓

Pending Approval

↓

Approved

↓

Paid
```

Commission tidak boleh dihitung dari Appointment.

---

# 22. Payroll Workflow

Payroll membaca:

Attendance

Commission

Leave

Adjustment

Allowance

Deduction

```
Payroll Period

↓

Calculate

↓

Review

↓

Approve

↓

Paid
```

Payroll tidak boleh mengambil data langsung dari Appointment.

---

# 23. Inventory Source of Truth

Inventory hanya boleh berubah melalui Inventory Movement.

Contoh movement:

PURCHASE

SALE

SERVICE_USAGE

PRODUCTION

TRANSFER

ADJUSTMENT

OPENING_BALANCE

RETURN

SYNC

Tidak boleh ada proses yang langsung mengubah qtyOnHand.

---

# 24. Accurate Integration Flow

Accurate adalah accounting system.

NIAHAIR ERP adalah operational system.

```
ERP

↓

Sync Queue

↓

Accurate
```

Master Data

Customer

Item

Warehouse

Payment Method

disinkronkan.

Operasional tetap berjalan walaupun Accurate sedang offline.

---

# 25. Multi Branch Architecture

Setiap transaksi selalu memiliki Branch.

Employee dapat memiliki:

Home Branch

Working Branch

Appointment selalu berada pada satu Branch.

Treatment selalu berada pada satu Branch.

Inventory selalu dimiliki Warehouse.

Warehouse dapat dimiliki Branch.

---

# 26. Error Handling Philosophy

Operasional tidak boleh berhenti hanya karena sinkronisasi gagal.

Jika Accurate gagal:

```
Transaction

↓

Sync Queue

↓

Retry

↓

Success
```

Kasir tetap dapat melanjutkan pekerjaan.

---

# 27. Future Business Flow

Blueprint ini telah dipersiapkan untuk mendukung:

• Production Hair Extension
• Purchase Order
• Receiving
• Supplier Management
• Stock Opname
• Manufacturing Cost
• Quality Control
• Multi Warehouse
• Multi Company
• BI Dashboard
• Mobile Application

Tanpa mengubah workflow utama yang telah ditetapkan.

# PART 3 — MODULE ARCHITECTURE

---

# 28. Module Architecture Philosophy

NIAHAIR ERP menggunakan **Domain Driven Modular Architecture**.

Setiap module merupakan satu business domain yang memiliki:

* Data sendiri
* Service sendiri
* API sendiri
* UI sendiri
* Business Rules sendiri

Module tidak boleh saling mengakses database secara langsung.

Interaksi antar module dilakukan melalui Service Layer.

```
Customer

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
```

Setiap panah merupakan komunikasi melalui business service, bukan akses tabel secara langsung.

---

# 29. Domain Map

```
CRM
│
├── Customer
├── Membership
├── Customer Notes
├── Customer Timeline
└── Customer 360

Booking
│
├── Appointment
├── Daily Board
├── Schedule
└── Reception

Treatment
│
├── Treatment Session
├── Treatment Assignment
├── Material Usage
├── Treatment Media
└── Timeline

Inventory
│
├── Item
├── Warehouse
├── Inventory
├── Inventory Movement
├── Transfer
├── Adjustment
└── Stock Opname

Finance
│
├── Deposit
├── Invoice
├── Payment
├── Cash Account
└── Accurate Sync

Human Resource
│
├── Employee
├── Attendance
├── Leave
├── Commission
└── Payroll

Production
│
├── BOM
├── Production Order
├── Production Result
└── QC

Administration
│
├── User
├── Role
├── Branch
├── Settings
├── Background Job
└── Sync Queue
```

---

# 30. CRM Domain

## Responsibility

Mengelola seluruh informasi customer.

## Owns

Customer

Membership

CustomerNote

CustomerTimeline

CustomerMedia

## Provides

Customer Search

Customer Detail

Customer History

Customer Statistics

Customer 360

## Consumed By

Appointment

Treatment

Invoice

Payment

Dashboard

Reporting

CRM tidak boleh mengetahui Inventory.

CRM tidak boleh mengetahui Payroll.

---

# 31. Booking Domain

## Responsibility

Mengelola seluruh aktivitas sebelum treatment dimulai.

## Owns

Appointment

Appointment Service

Appointment Staff

Appointment Status

Appointment Reschedule

Appointment Photo

Daily Board

Schedule

## Provides

Booking

Check In

Reschedule

Cancel

No Show

Booking Calendar

## Consumed By

Treatment

Customer 360

Reporting

Booking tidak boleh menghitung commission.

Booking tidak boleh mengurangi inventory.

---

# 32. Treatment Domain

## Responsibility

Mengelola seluruh proses operasional salon.

Ini adalah pusat ERP.

## Owns

Treatment Session

Treatment Assignment

Treatment Photo

Material Usage

Treatment Timeline

Treatment Notes

Treatment Status

## Provides

Treatment Workspace

Material Usage

Treatment Duration

Treatment History

Staff Assignment

Photo Gallery

## Consumed By

Inventory

Commission

Payroll

Customer History

Reporting

Treatment adalah satu-satunya module yang boleh memulai Material Usage.

---

# 33. Inventory Domain

## Responsibility

Mengelola stok perusahaan.

## Owns

Inventory

Inventory Movement

Warehouse

Transfer

Adjustment

Opening Balance

Closing Period

Inventory Period

## Provides

Stock Balance

Movement History

Transfer

Adjustment

Warehouse Balance

## Consumed By

Treatment

Invoice

Production

Purchase

Reporting

Inventory tidak boleh mengetahui Appointment.

Inventory hanya menerima event.

---

# 34. Finance Domain

## Responsibility

Mengelola transaksi keuangan.

## Owns

Invoice

Payment

Deposit

Cash Account

Payment Method

Accurate Queue

## Provides

Invoice

Payment

Deposit

Outstanding

Cash Flow

## Consumed By

Dashboard

Customer

Reporting

Accurate

Finance tidak boleh mengurangi stok secara langsung.

---

# 35. Human Resource Domain

## Responsibility

Mengelola seluruh data karyawan.

## Owns

Employee

Attendance

Leave

Commission

Payroll

Schedule

Shift

## Provides

Employee

Commission

Attendance

Payroll

## Consumed By

Treatment

Finance

Dashboard

Reporting

---

# 36. Production Domain

## Responsibility

Mengelola proses manufaktur hair extension.

## Owns

Production Order

Production Material

Production Result

Production QC

Production Cost

## Provides

Production

Finished Goods

Material Consumption

Costing

## Consumed By

Inventory

Finance

Reporting

Production tidak boleh langsung mengubah Inventory.

Seluruh perubahan harus melalui Inventory Movement.

---

# 37. Administration Domain

## Responsibility

Konfigurasi sistem.

## Owns

Branch

Warehouse

Role

Permission

User

Settings

Background Job

Sync Queue

Audit

## Provides

Authentication

Authorization

Configuration

Monitoring

Administration tidak memiliki transaksi bisnis.

---

# 38. Dependency Rules

Dependency hanya boleh satu arah.

```
CRM

↓

Booking

↓

Treatment

↓

Inventory

↓

Finance

↓

Reporting
```

Human Resource berdiri sendiri.

Production berkomunikasi melalui Inventory.

Administration tidak boleh dipanggil oleh Business Module.

---

# 39. Forbidden Dependencies

Tidak diperbolehkan:

Inventory → Appointment

Payroll → Inventory

Customer → Warehouse

Branch → Commission

Treatment → Payment

Invoice → Schedule

Jika membutuhkan data, gunakan service layer.

---

# 40. Module Ownership

| Module        | Owner        |
| ------------- | ------------ |
| Customer      | CRM          |
| Appointment   | Front Office |
| Schedule      | HR           |
| Treatment     | Operation    |
| Inventory     | Warehouse    |
| Invoice       | Finance      |
| Payment       | Finance      |
| Commission    | HR           |
| Payroll       | HR           |
| Production    | Factory      |
| Accurate Sync | System       |

Ownership digunakan untuk menentukan business responsibility.

---

# 41. Event Communication

Module saling berkomunikasi menggunakan business event.

Contoh:

```
Appointment Checked In

↓

Treatment Session Created

↓

Treatment Completed

↓

Inventory Movement Created

↓

Commission Generated

↓

Payroll Updated

↓

Customer Timeline Updated

↓

Dashboard Refreshed
```

Tidak ada module yang memanggil seluruh module lain secara langsung.

---

# 42. Single Responsibility Rule

Setiap module hanya memiliki satu tujuan utama.

Contoh:

Customer

Mengelola customer.

Bukan menghitung invoice.

Inventory

Mengelola stok.

Bukan menghitung payroll.

Treatment

Mengelola treatment.

Bukan melakukan sinkronisasi Accurate.

Jika satu module mulai memiliki banyak tanggung jawab di luar domainnya, maka perlu dibuat domain baru.

---

# 43. Scalability Strategy

Seluruh architecture dirancang agar dapat berkembang menjadi:

* Multi Branch
* Multi Warehouse
* Multi Company
* Mobile App
* Public API
* AI Assistant
* Manufacturing ERP
* Franchise Management

Tanpa mengubah struktur domain utama.

---

# 44. Module Completion Criteria

Sebuah module dianggap selesai apabila memenuhi seluruh syarat berikut:

* Backend API lengkap
* Frontend UI lengkap
* Responsive
* Validation lengkap
* Permission diterapkan
* Audit trail tersedia
* Business rules sesuai blueprint
* Integration selesai
* Unit workflow berhasil
* Documentation diperbarui

Module tidak boleh dianggap selesai hanya karena CRUD telah dibuat.

# PART 4 — DATABASE DOMAIN ARCHITECTURE

---

# 45. Database Philosophy

Database NIAHAIR ERP dibangun berdasarkan prinsip **Business Domain Ownership**.

Setiap domain memiliki data miliknya sendiri.

Contoh:

```text
CRM
    owns Customer

Booking
    owns Appointment

Treatment
    owns TreatmentSession

Inventory
    owns Inventory

Finance
    owns Invoice

HR
    owns Employee
```

Module lain boleh membaca data tersebut, tetapi **tidak boleh menjadi pemiliknya**.

---

# 46. Database Layers

Database dibagi menjadi 4 layer utama.

```
MASTER DATA

↓

TRANSACTION DATA

↓

SYSTEM DATA

↓

REPORTING DATA
```

---

## 46.1 Master Data

Master Data adalah data yang jarang berubah.

Contoh:

```
Customer

Employee

Branch

Warehouse

Item

Service

Unit

Payment Method

Cash Account

Role

Permission

Shift

Membership
```

Karakteristik:

* digunakan banyak module
* perubahan jarang
* menjadi referensi transaksi

---

## 46.2 Transaction Data

Data operasional harian.

Contoh:

```
Appointment

Treatment

Invoice

Payment

Deposit

InventoryMovement

Attendance

Commission
```

Karakteristik:

* terus bertambah
* tidak boleh dihapus
* memiliki audit trail

---

## 46.3 System Data

Digunakan oleh sistem.

```
SyncQueue

WebhookLog

BackgroundJob

AuditLog

Setting

NotificationQueue

ApiToken
```

Tidak digunakan langsung oleh user.

---

## 46.4 Reporting Data

Tidak menjadi source of truth.

Berisi:

```
Dashboard Cache

Analytics

Materialized View

Future BI
```

Semua berasal dari data transaksi.

---

# 47. Source of Truth

Setiap entity hanya memiliki satu sumber utama.

| Data        | Source of Truth  |
| ----------- | ---------------- |
| Customer    | Customer         |
| Employee    | Employee         |
| Appointment | Appointment      |
| Treatment   | TreatmentSession |
| Inventory   | Inventory        |
| Invoice     | Invoice          |
| Payment     | Payment          |
| Deposit     | Deposit          |
| Commission  | Commission       |
| Payroll     | Payroll          |

Tidak boleh ada tabel lain yang menyimpan data sama.

---

# 48. Aggregate Root

NIAHAIR menggunakan konsep Aggregate Root.

Contoh:

Customer

```
Customer

├── Notes

├── Membership

├── Timeline

├── Photos

├── Appointments

├── Invoices

└── Deposits
```

Customer adalah Aggregate Root.

---

Treatment

```
TreatmentSession

├── Assignment

├── MaterialUsage

├── Photos

├── Notes

└── Timeline
```

---

Inventory

```
Inventory

├── InventoryMovement

└── InventoryPeriod
```

---

# 49. Relationship Rules

Gunakan Foreign Key.

Tidak boleh menyimpan nama.

Contoh benar

```
employeeId

customerId

branchId
```

Contoh salah

```
employeeName

branchName
```

Nama diperoleh melalui JOIN.

---

# 50. Immutable Tables

Tabel berikut tidak boleh diedit.

```
InventoryMovement

Payment

Commission

Payroll

AuditLog

SyncLog
```

Jika terjadi kesalahan.

Buat transaksi baru.

Bukan UPDATE.

---

# 51. Mutable Tables

Tabel yang boleh diubah.

```
Customer

Employee

Branch

Warehouse

Item

Membership

Settings
```

Semua perubahan harus memiliki updatedAt.

---

# 52. Soft Delete Strategy

Data bisnis tidak boleh dihapus.

Gunakan:

```
isActive

deletedAt
```

Hard delete hanya diperbolehkan untuk:

```
Temporary Upload

Failed Sync Cache

Background Queue

Testing Data
```

---

# 53. Audit Strategy

Semua transaksi penting harus dapat diaudit.

Minimal mencatat:

```
createdBy

updatedBy

createdAt

updatedAt
```

Untuk transaksi kritikal:

```
oldValue

newValue

reason
```

---

# 54. History Strategy

History dipisahkan dari master.

Contoh.

Appointment

↓

AppointmentStatusHistory

Treatment

↓

TreatmentTimeline

Inventory

↓

InventoryMovement

Employee

↓

EmployeeBranchHistory

Tidak menyimpan history di tabel utama.

---

# 55. Multi Branch Strategy

Semua transaksi operasional harus mengetahui Branch.

```
Appointment

Treatment

Invoice

Payment

Deposit

Attendance

Inventory
```

Branch menjadi dimensi utama reporting.

---

# 56. Warehouse Strategy

Warehouse terpisah dari Branch.

Satu Branch dapat memiliki banyak Warehouse.

Contoh.

```
Cipete

↓

Gudang Retail

Gudang Treatment

Gudang Produksi
```

Inventory dimiliki Warehouse.

Bukan Branch.

---

# 57. Inventory Strategy

Inventory bukan Item.

```
Item

↓

Warehouse

↓

Inventory
```

Inventory menyimpan saldo.

InventoryMovement menyimpan history.

Saldo tidak boleh dihitung dari movement setiap request.

Saldo selalu tersimpan.

Movement menjadi audit trail.

---

# 58. Inventory Reservation

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

---

# 59. Closing Period

Movement hanya boleh dibuat pada period OPEN.

Jika period CLOSED.

```
422

Inventory Period Closed
```

Tidak boleh bypass.

Kecuali SUPER_ADMIN.

---

# 60. Accurate Integration Strategy

ERP tetap menjadi operational database.

Accurate menjadi accounting database.

Sinkronisasi dilakukan asynchronous.

```
ERP

↓

SyncQueue

↓

Accurate

↓

Success

atau

Retry
```

Tidak ada transaksi yang menunggu Accurate.

---

# 61. Platform Services Domain

Platform Services merupakan domain lintas modul.

Berisi:

```
Authentication

Authorization

Cloudinary

Notification

Background Job

Scheduler

Webhook

Audit

Sync Queue

AI Services
```

Domain ini boleh digunakan oleh seluruh module.

Tetapi tidak memiliki transaksi bisnis.

---

# 62. Event Driven Database

Semua transaksi besar menghasilkan event.

Contoh.

```
Treatment Completed

↓

InventoryMovement Created

↓

Commission Generated

↓

Customer Timeline Updated

↓

Dashboard Updated
```

Database mengikuti event.

Bukan polling.

---

# 63. Scalability

Database dirancang untuk mendukung:

```
100+

Branch

1000+

Employee

100.000+

Customer

10 juta+

Inventory Movement

50 juta+

Payment History
```

Tanpa perubahan struktur besar.

---

# 64. Performance Principles

Selalu gunakan:

* Foreign Key
* Composite Index
* Pagination
* Cursor untuk history panjang
* Summary table jika diperlukan

Hindari:

* SELECT *
* N+1 Query
* Deep include tanpa kebutuhan
* Query tanpa index

---

# 65. Database Completion Checklist

Sebuah domain dianggap selesai apabila:

✓ Ownership jelas

✓ Foreign Key lengkap

✓ Index lengkap

✓ Audit tersedia

✓ History tersedia

✓ Soft delete sesuai aturan

✓ Validation diterapkan

✓ Reporting dapat dilakukan

✓ Multi branch siap

✓ Sinkronisasi tidak mengganggu transaksi



# 66. Backend Philosophy

Backend merupakan **Business Engine** dari seluruh NIAHAIR ERP.

Frontend hanya bertugas sebagai Presentation Layer.

Seluruh business rules, validation, workflow, transaction, authorization, audit trail, dan integration berada di Backend.

Backend bertanggung jawab terhadap:

- Business Rules
- Validation
- Authorization
- Transaction Management
- Inventory Engine
- Commission Engine
- Payroll Engine
- Accurate Integration
- Background Jobs
- Audit Trail
- Event Processing

Frontend **tidak boleh** menghitung business logic.

---

# 67. Backend Design Principles

Seluruh backend wajib mengikuti prinsip berikut.

## 67.1 Thin Controller

Controller hanya bertanggung jawab untuk:

- menerima request
- memanggil validation
- memanggil service
- mengembalikan response

Controller **tidak boleh**:

- menghitung stok
- menghitung komisi
- menghitung payroll
- mengurangi inventory
- membuat workflow

Flow:

```
HTTP Request
        │
        ▼
Controller
        │
        ▼
Service
        │
        ▼
Response
```

---

## 67.2 Fat Service

Semua business logic berada pada Service Layer.

Service bertanggung jawab terhadap:

- workflow
- business validation
- transaction
- event
- integration
- authorization (business ownership)

Contoh:

```
Complete Treatment

↓

Validate

↓

Save Treatment

↓

Generate Material Usage

↓

Generate Inventory Movement

↓

Generate Commission

↓

Update Timeline

↓

Commit Transaction
```

---

## 67.3 Repository Pattern

Repository hanya mengakses database.

Repository bertanggung jawab terhadap:

- create
- update
- delete
- find
- aggregate
- count

Repository **tidak boleh**:

- upload file
- mengirim WhatsApp
- menghitung commission
- memanggil Accurate
- membuat workflow

---

# 68. Backend Folder Structure

Seluruh module wajib memiliki struktur yang sama.

```
src/modules/

customer/
│
├── customer.controller.js
├── customer.service.js
├── customer.repository.js
├── customer.route.js
├── customer.validation.js
├── customer.mapper.js
├── customer.constants.js
├── customer.types.js
└── index.js
```

Module kecil boleh menghilangkan:

- mapper
- constants
- types

Jika memang tidak diperlukan.

---

# 69. Request Lifecycle

Semua request mengikuti lifecycle berikut.

```
Client

↓

Express Route

↓

Authentication

↓

Branch Middleware

↓

Validation

↓

Controller

↓

Service

↓

Repository

↓

Prisma

↓

PostgreSQL
```

Response mengikuti arah sebaliknya.

Tidak boleh ada shortcut.

---

# 70. Validation Strategy

Validation dibagi menjadi dua.

## Input Validation

Menggunakan Valibot.

Semua schema berada di folder:

```
validation/
```

Contoh:

```
CreateCustomerSchema

UpdateCustomerSchema

CreateAppointmentSchema

CompleteTreatmentSchema
```

---

## Business Validation

Dilakukan di Service.

Contoh:

- Appointment harus CHECK_IN sebelum Treatment.
- Invoice tidak boleh dibayar lebih.
- Inventory tidak boleh minus.
- Treatment tidak boleh selesai jika belum ada staff.

---

# 71. Service Layer Responsibilities

Service merupakan pusat business logic.

Service bertanggung jawab terhadap:

- Business Rules
- Validation
- Workflow
- Transaction
- Integration
- Event
- Logging
- Permission (business level)

Service boleh memanggil:

- Repository miliknya sendiri
- Service module lain

Service **tidak boleh** memanggil Repository module lain.

Contoh yang benar:

```
TreatmentService

↓

InventoryService
```

Contoh yang salah:

```
TreatmentService

↓

InventoryRepository
```

---

# 72. Repository Layer Responsibilities

Repository hanya melakukan operasi database.

Contoh:

```
findById()

findMany()

create()

update()

count()

aggregate()

exists()
```

Repository **tidak boleh**:

- menghitung total invoice
- mengurangi inventory
- upload Cloudinary
- memanggil API eksternal

---

# 73. Controller Layer Responsibilities

Controller hanya:

- membaca req
- membaca params
- membaca query
- memanggil Service
- mengembalikan response

Controller tidak boleh:

- validasi manual
- transaction
- business calculation

---

# 74. Response Standard

Semua endpoint menggunakan format yang sama.

## Success

```json
{
  "success": true,
  "message": "Success",
  "data": {}
}
```

---

## Validation Error

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": []
}
```

---

## Server Error

```json
{
  "success": false,
  "message": "Internal server error"
}
```

---

# 75. Pagination Standard

Semua endpoint list wajib mendukung:

```
page

limit

search

sort

order
```

Response:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 120,
    "pageCount": 6
  }
}
```

Limit maksimum:

```
100
```

---

# 76. Error Handling Standard

Backend menggunakan HTTP Status Code yang konsisten.

| Status | Meaning |
|---------|---------|
| 200 | Success |
| 201 | Created |
| 204 | No Content |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 422 | Business Validation Failed |
| 500 | Internal Server Error |

Jangan pernah mengembalikan Prisma Error secara langsung ke frontend.

---

# 77. Transaction Strategy

Semua operasi yang melibatkan lebih dari satu tabel wajib menggunakan Prisma Transaction.

Contoh:

```
Complete Treatment

↓

TreatmentSession

↓

MaterialUsage

↓

InventoryMovement

↓

Commission

↓

Timeline

↓

Commit
```

Jika satu proses gagal:

```
Rollback
```

Tidak boleh ada data setengah tersimpan.

---

# 78. Authorization Strategy

Authentication dilakukan menggunakan JWT.

Authorization dilakukan melalui:

- Role
- Permission
- Branch Access

Frontend hanya menyembunyikan menu.

Backend tetap menjadi sumber kebenaran.

---

# 79. Branch Context

Seluruh transaksi operasional harus memiliki Branch Context.

Branch dibaca melalui:

```
x-branch-id
```

Backend memvalidasi:

- branch ada
- user memiliki akses
- branch aktif

SUPER_ADMIN dapat mengakses seluruh branch.

---

# 80. Business Event Strategy

Workflow backend mengikuti Event.

Contoh:

```
Treatment Completed

↓

Inventory Updated

↓

Commission Generated

↓

Customer Timeline Updated

↓

Dashboard Updated
```

Jangan membuat Controller yang memanggil banyak module secara langsung.

---

# 81. Domain Communication

Komunikasi antar domain dilakukan melalui Service.

Diagram:

```
Customer Service

↓

Appointment Service

↓

Treatment Service

↓

Inventory Service

↓

Finance Service

↓

Payroll Service
```

Repository hanya digunakan oleh domain miliknya sendiri.

---

# 82. Audit Strategy

Semua transaksi penting wajib menyimpan:

- createdBy
- updatedBy
- createdAt
- updatedAt

Untuk transaksi kritikal:

- oldValue
- newValue
- reason

Audit tidak boleh dihapus.

---

# 83. Soft Delete Strategy

Data transaksi bisnis tidak boleh dihapus.

Gunakan:

- isActive
- deletedAt

Hard Delete hanya diperbolehkan untuk:

- temporary upload
- cache
- failed queue
- testing data

---

# 84. Logging Strategy

Gunakan logging terstruktur.

Minimal mencatat:

- timestamp
- requestId
- module
- userId
- branchId
- duration
- level

Level:

- INFO
- WARN
- ERROR

Production tidak boleh menggunakan `console.log()`.

---

# 85. Security Principles

Backend wajib menerapkan:

- JWT Authentication
- Password Hashing (bcrypt)
- Helmet
- CORS
- Rate Limiting
- Input Validation
- SQL Injection Protection (Prisma)
- XSS Protection
- Environment Variables

Tidak boleh menyimpan password atau secret dalam source code.

---

# 86. File Upload Architecture

Flow upload file:

```
Client

↓

Multer

↓

Validation

↓

Cloudinary

↓

Database
```

Database hanya menyimpan:

- url
- publicId
- mimeType
- fileSize

Binary file tidak disimpan di PostgreSQL.

---

# 87. External Integration

Seluruh integrasi eksternal berada pada layer khusus.

Contoh:

```
src/integrations/

accurate/

cloudinary/

whatsapp/

telegram/

ai/
```

Business module tidak boleh memanggil SDK pihak ketiga secara langsung.

---

# 88. Configuration Layer

Seluruh konfigurasi berada di:

```
src/config/
```

Contoh:

```
database.js

jwt.js

cloudinary.js

accurate.js

env.js
```

Module tidak boleh membaca `process.env` secara langsung.

---

# 89. Performance Principles

Gunakan:

- Select
- Pagination
- Composite Index
- Aggregate Query
- Transaction

Hindari:

- SELECT *
- Deep Include
- N+1 Query
- Query tanpa Index

---

# 90. Definition of Done (Backend Module)

Sebuah module backend dianggap selesai apabila memenuhi seluruh syarat berikut:

- Repository lengkap
- Service lengkap
- Controller tipis
- Validation lengkap
- Authorization diterapkan
- Branch validation diterapkan
- Transaction aman
- Audit tersedia
- Pagination tersedia
- Error handling konsisten
- Logging tersedia
- Multi Branch siap
- Dokumentasi diperbarui


# 91. Database Access Strategy

Semua akses database dilakukan melalui Prisma Repository.

Prinsip utama:

- Repository hanya mengakses database.
- Service tidak boleh mengakses Prisma secara langsung.
- Controller tidak boleh mengakses Prisma.

Flow:

```

Controller

↓

Service

↓

Repository

↓

Prisma

↓

PostgreSQL

```

Dengan cara ini seluruh query database dapat dikontrol pada satu tempat.

---

# 92. Query Design Standards

Gunakan query sekecil mungkin.

Selalu gunakan:

```

select

```

daripada

```

include

```

Gunakan include hanya jika benar-benar diperlukan.

Contoh:

Baik

```ts
select: {
id: true,
name: true
}
```

Kurang baik

```ts
include: {
appointments: true,
payments: true,
invoices: true
}
```

---

# 93. Data Mapping Strategy

Repository tidak boleh mengembalikan Prisma Model mentah.

Gunakan Mapper.

```

Prisma Model

↓

Repository

↓

Mapper

↓

DTO

↓

Frontend

```

Tujuan:

- menyembunyikan field internal
- menjaga backward compatibility
- mempermudah versioning

---

# 94. Domain Event Architecture

Setiap perubahan besar menghasilkan Domain Event.

Contoh:

```

Appointment Checked In

↓

Treatment Started

↓

Treatment Completed

↓

Inventory Movement Created

↓

Commission Generated

↓

Payroll Updated

↓

Customer Timeline Updated

```

Event harus bersifat deterministic.

Satu event hanya memiliki satu arti.

---

# 95. Event Naming Standard

Gunakan Past Tense.

Contoh:

```

AppointmentCreated

AppointmentCancelled

TreatmentStarted

TreatmentCompleted

InventoryAdjusted

PaymentReceived

CommissionGenerated

PayrollApproved

```

Jangan gunakan:

```

DoTreatment

CreateInvoice

RunInventory

```

---

# 96. Background Job Architecture

Semua proses berat dipindahkan ke Background Worker.

Contoh:

- Accurate Sync
- WhatsApp
- Telegram
- Email
- Daily Summary
- Monthly Payroll
- Report Generation

HTTP Request tidak boleh menunggu proses tersebut selesai.

---

# 97. Queue Architecture

Semua integrasi eksternal menggunakan Queue.

Flow:

```

Transaction

↓

Queue

↓

Worker

↓

External Service

```

Jika External Service gagal,

transaksi utama tetap berhasil.

---

# 98. Retry Policy

Retry dilakukan secara bertahap.

```

Attempt 1

↓

1 Minute

↓

5 Minutes

↓

15 Minutes

↓

30 Minutes

↓

1 Hour

↓

6 Hours

↓

FAILED

```

Retry maksimal:

10 kali.

---

# 99. Idempotency

Endpoint tertentu wajib bersifat idempotent.

Contoh:

- Accurate Sync
- Inventory Movement Generator
- Commission Generator
- Payroll Generator
- Payment Callback

Request yang sama tidak boleh menghasilkan transaksi ganda.

---

# 100. Scheduler

Scheduler digunakan untuk pekerjaan berkala.

Contoh:

- Retry Queue
- Payroll
- Reminder
- Attendance Check
- Daily Summary
- Dashboard Cache
- Cleanup Temporary File

Scheduler tidak boleh menjalankan business logic manual.

---

# 101. Cache Strategy

Cache hanya digunakan untuk data yang sering dibaca.

Contoh:

- Dashboard
- Settings
- Payment Methods
- Branch
- User Profile

Jangan cache:

- Inventory Balance
- Payment
- Commission
- Treatment

---

# 102. Logging Standard

Semua log harus memiliki:

- timestamp
- requestId
- module
- action
- userId
- employeeId
- branchId
- duration
- level

Level:

```

INFO

WARN

ERROR

FATAL

```

---

# 103. Monitoring

Future monitoring stack:

- Sentry
- Prometheus
- Grafana
- OpenTelemetry

Monitoring minimal:

- Error Rate
- API Duration
- Queue Length
- Worker Status
- Memory Usage
- CPU Usage
- Database Connections

---

# 104. Health Check Endpoint

Backend menyediakan endpoint:

```

/health

```

Menampilkan:

- Database
- Queue
- Worker
- Cloudinary
- Accurate
- Storage

Endpoint:

```

/ready

```

digunakan untuk orchestration.

---

# 105. Deployment Strategy

Environment:

```

Development

Testing

Staging

Production

```

Rule:

- Tidak boleh develop langsung Production.
- Migration harus dijalankan sebelum deploy.
- Backup wajib sebelum migration besar.

---

# 106. Environment Variable Policy

Semua credential hanya boleh berasal dari:

```

.env

```

Tidak boleh hardcode.

Contoh:

```

DATABASE_URL

JWT_SECRET

ACCURATE_KEY

CLOUDINARY_SECRET

```

---

# 107. Security Standards

Backend wajib menggunakan:

- HTTPS
- JWT Authentication
- bcrypt Password Hash
- Helmet
- Rate Limiter
- Input Validation
- CORS
- SQL Injection Protection (Prisma)

Future:

- Refresh Token
- MFA
- IP Whitelist

---

# 108. API Versioning

Saat ini:

```

/api/

```

Future:

```

/api/v1/

/api/v2/

```

Breaking changes tidak boleh mengubah versi lama.

---

# 109. File Storage Policy

Semua file disimpan di Cloudinary.

Database hanya menyimpan:

- URL
- Public ID
- MIME Type
- File Size

Binary file tidak boleh masuk PostgreSQL.

---

# 110. Notification Service

Notification adalah Platform Service.

Channel:

- WhatsApp
- Telegram
- Email
- Push Notification

Notification bersifat asynchronous.

---

# 111. AI Service Layer

Future AI Module.

AI hanya memberikan rekomendasi.

AI tidak boleh:

- mengubah Inventory
- membuat Invoice
- melakukan Payment

AI bersifat advisory.

---

# 112. Multi Branch Strategy

Seluruh transaksi memiliki Branch Context.

Branch Context digunakan untuk:

- Permission
- Reporting
- Dashboard
- Payroll
- Inventory

SUPER_ADMIN dapat berpindah branch kapan saja.

---

# 113. Multi Warehouse Strategy

Warehouse tidak sama dengan Branch.

Contoh:

```

Branch

↓

Warehouse Retail

Warehouse Treatment

Warehouse Produksi

```

Inventory dimiliki Warehouse.

---

# 114. Performance Targets

Target API:

Customer Search

< 300 ms

Treatment Detail

< 500 ms

Daily Board

< 500 ms

Dashboard

< 1 Second

Inventory

< 500 ms

---

# 115. Scalability Targets

Backend harus mampu mendukung:

- 100 Branch
- 1.000 Employee
- 100.000 Customer
- 1.000.000 Invoice
- 50.000.000 Inventory Movement

Tanpa perubahan arsitektur.

---

# 116. Testing Strategy

Setiap Service minimal memiliki test:

- Happy Path
- Validation
- Authorization
- Rollback
- Edge Case
- Concurrency

---

# 117. Code Review Checklist

Sebelum merge:

- Tidak ada business logic di Controller.
- Repository hanya CRUD.
- Validation lengkap.
- Transaction aman.
- Permission benar.
- Audit tersedia.
- Logging tersedia.
- Pagination tersedia.
- Error konsisten.
- Multi Branch aman.

---

# 118. Technical Debt Policy

Technical Debt harus dicatat.

Kategori:

- Critical
- High
- Medium
- Low

Tidak boleh disimpan hanya di ingatan developer.

---

# 119. Documentation Policy

Setiap perubahan besar wajib memperbarui:

- ERP Blueprint
- Business Rules
- Architecture Decisions
- API Standard

Kode dan dokumentasi harus selalu sinkron.

---

# 120. Definition of Done

Sebuah Backend Feature dianggap selesai apabila:

- API selesai.
- Validation selesai.
- Permission selesai.
- Multi Branch selesai.
- Transaction aman.
- Queue (jika diperlukan).
- Logging tersedia.
- Audit tersedia.
- Dokumentasi diperbarui.
- Code Review selesai.

CRUD saja **bukan** berarti fitur selesai.

---

# 121. Engineering Principles

Seluruh backend mengikuti prinsip:

- SOLID
- DRY
- KISS
- YAGNI
- Clean Architecture
- Domain Driven Design

Prinsip tersebut menjadi dasar seluruh pengembangan.

---

# 122. Future Architecture

Backend dipersiapkan untuk:

- Public API
- Mobile Application
- Multi Company
- Franchise
- AI Integration
- BI Dashboard
- Event Bus
- Microservice (bila diperlukan)

Arsitektur saat ini harus tetap kompatibel dengan pengembangan tersebut.

---

# 123. Technology Stack

Current Stack

- Node.js
- Express.js
- Prisma ORM
- PostgreSQL
- Valibot
- JWT
- Cloudinary

Future

- Redis
- BullMQ
- OpenTelemetry
- Prometheus
- Grafana
- Sentry

---

# 124. Backend Engineering Culture

Seluruh developer wajib memahami:

- Business Flow
- ERP Blueprint
- Business Rules
- Architecture Decisions

Sebelum membuat fitur baru.

---

# 125. Backend Success Metrics

Backend dianggap berhasil apabila:

- Response konsisten
- Business Rule terjaga
- Tidak ada duplicate transaction
- Multi Branch stabil
- Queue berjalan
- Audit lengkap
- Performance sesuai target

---

# 126. Long-Term Maintainability

Target umur sistem:

10+ tahun.

Seluruh keputusan backend harus mempertimbangkan:

- kemudahan maintenance
- scalability
- backward compatibility
- auditability
- developer onboarding

---

# 127. Backend Architecture Conclusion

Backend NIAHAIR ERP dibangun sebagai Business Engine.

Prinsip utama:

- Business Logic berada di Service Layer.
- Repository hanya mengakses database.
- Controller tetap tipis.
- Semua transaksi penting menggunakan Transaction.
- Inventory bersifat immutable.
- Semua integrasi eksternal asynchronous.
- Multi Branch menjadi bagian dari seluruh transaksi.
- Audit Trail tersedia pada seluruh transaksi kritikal.

Blueprint ini menjadi standar seluruh pengembangan backend NIAHAIR ERP.


# PART 6 — FRONTEND ARCHITECTURE

---

# 128. Frontend Philosophy

Frontend NIAHAIR ERP adalah **Operational Workspace**, bukan sekadar CRUD Application.

Tujuan utama frontend adalah membantu operasional bekerja lebih cepat, lebih sedikit klik, dan lebih sedikit berpindah halaman.

Setiap halaman harus menjawab pertanyaan:

> "Apakah halaman ini nyaman digunakan selama 8 jam setiap hari?"

Jika jawabannya tidak, maka desain harus diperbaiki.

---

# 129. Frontend Principles

Seluruh frontend mengikuti prinsip berikut.

## 129.1 Mobile First

Semua halaman harus dapat digunakan pada:

- Desktop
- Tablet
- Mobile

Desktop menggunakan Table.

Mobile menggunakan Card.

Tidak boleh memaksa tabel pada layar kecil.

---

## 129.2 Workspace First

Halaman operasional bukan CRUD.

Contoh:

❌ Customer List

✔ Customer Workspace

❌ Treatment List

✔ Treatment Workspace

❌ Inventory List

✔ Inventory Workspace

---

## 129.3 Single Responsibility

Satu halaman hanya memiliki satu tujuan.

Contoh.

Customer Detail

↓

Melihat Customer

Bukan:

Edit Customer

Create Appointment

Create Invoice

Semua aksi dilakukan melalui Dialog atau Sheet.

---

## 129.4 Component Driven

Semua UI dibangun dari reusable component.

Contoh.

StatusBadge

AmountDisplay

FilterBar

Pagination

ConfirmDialog

SearchInput

DateRangePicker

EmployeeSelect

CustomerSelect

ItemSelect

---

# 130. Frontend Folder Structure

Seluruh module mengikuti struktur berikut.

```

features/

customer/

api/

hooks/

types/

schemas/

components/

pages/

utils/

constants/

```

Tidak boleh mencampur module.

---

# 131. Feature Module

Satu feature memiliki:

```

Customer

↓

API

↓

Hooks

↓

Schema

↓

Components

↓

Pages

```

Module tidak boleh mengambil component dari module lain.

Shared component berada di:

```

components/

```

---

# 132. Shared Components

Component global.

```

Button

Input

Table

Card

Dialog

Sheet

Tabs

Badge

Avatar

Pagination

FilterBar

SearchInput

```

Tidak boleh membuat Button baru di setiap module.

---

# 133. API Layer

Frontend tidak boleh memanggil Axios langsung dari Component.

Semua request melalui

```

api/

```

Contoh.

```

customer.api.ts

appointment.api.ts

inventory.api.ts

```

---

# 134. Hook Layer

Business interaction berada pada Hook.

Component tidak boleh memanggil TanStack Query secara langsung.

Gunakan.

```

useCustomer()

useCustomers()

useCreateCustomer()

```

---

# 135. Form Strategy

Seluruh form menggunakan:

- React Hook Form
- Zod

Tidak ada validation manual.

---

# 136. State Management

Global State

Menggunakan:

Zustand

Contoh.

```

Auth

Branch

Theme

Sidebar

```

Feature State

Menggunakan:

React Hook Form

atau

React State

---

# 137. Server State

Seluruh data server menggunakan

TanStack Query.

Tidak menggunakan Zustand.

Contoh.

```

Customer

Appointment

Invoice

Inventory

```

---

# 138. Cache Strategy

TanStack Query menjadi cache utama.

Setiap mutation wajib melakukan invalidate.

Contoh.

```

Create Customer

↓

invalidate

customers

customer-detail

```

---

# 139. Routing Strategy

Routing berdasarkan module.

```

/customers

/customers/:id

/appointments

/treatments

/inventory

/settings

```

Tidak membuat route acak.

---

# 140. Layout Strategy

Seluruh halaman menggunakan layout yang sama.

```

Header

↓

Statistic Cards

↓

Filter

↓

Content

↓

Pagination

```

---

# 141. Detail Page Standard

Semua Detail Page mengikuti struktur berikut.

```

Header

↓

Summary Card

↓

Tabs

↓

Detail Content

```

Contoh.

Customer Detail

Treatment Detail

Invoice Detail

Employee Detail

---

# 142. List Page Standard

List Page selalu memiliki.

```

Title

↓

Description

↓

Statistics

↓

Filter

↓

Table

↓

Pagination

```

Mobile.

```

Title

↓

Statistics

↓

Filter

↓

Cards

↓

Pagination

```

---

# 143. Create / Edit Standard

Create

↓

Sheet

Edit

↓

Sheet

Delete

↓

Dialog

Tidak membuat halaman khusus Create.

---

# 144. Dialog Standard

Dialog digunakan untuk.

- Delete
- Confirm
- Complete Treatment
- Reset Password
- Apply Deposit

Dialog tidak boleh terlalu besar.

---

# 145. Sheet Standard

Sheet digunakan untuk.

- Create Customer

- Edit Customer

- Create Employee

- Edit Item

- Create Payment Method

Sheet membuka dari kanan.

---

# 146. Dashboard Philosophy

Dashboard bukan halaman penuh grafik.

Dashboard adalah ringkasan operasional.

Menjawab.

"Apa yang harus saya kerjakan hari ini?"

---

# 147. Daily Board

Daily Board merupakan Home Page operasional.

Bukan Dashboard.

Reception membuka Daily Board.

Owner membuka Dashboard.

---

# 148. Treatment Workspace

Treatment bukan CRUD.

Treatment adalah Workspace.

Workspace memiliki.

- Header

- Timer

- Staff

- Photos

- Material

- Timeline

- Notes

- Complete Button

---

# 149. Customer 360

Customer bukan Profile.

Customer adalah CRM.

Harus memiliki.

Overview

Timeline

Appointment

Treatment

Invoice

Deposit

Photos

Notes

---

# 150. Inventory Workspace

Inventory bukan tabel.

Harus memiliki.

Stock

Movement

Warehouse

Transfer

Adjustment

Reports

---

# 151. Status Badge Standard

Seluruh status menggunakan Badge.

Warna wajib konsisten.

Hijau

Success

Merah

Error

Amber

Warning

Biru

Information

Abu

Inactive

Tidak boleh berbeda antar module.

---

# 152. Color System

Primary

Blue

Success

Green

Danger

Red

Warning

Amber

Neutral

Slate

Tidak boleh membuat warna random.

---

# 153. Icon Strategy

Menggunakan satu library.

Lucide.

Tidak mencampur Heroicons.

Tidak mencampur Font Awesome.

---

# 154. Typography

Heading

Bold

Body

Normal

Caption

Muted

Gunakan ukuran konsisten.

---

# 155. Spacing

Gunakan skala.

4

8

12

16

24

32

48

Tidak menggunakan angka acak.

---

# 156. Loading State

Setiap halaman memiliki.

Skeleton

Loading Spinner

Empty State

Error State

Tidak boleh blank putih.

---

# 157. Empty State

Contoh.

Tidak ada Appointment.

```

📅

Belum ada Appointment

[ Buat Appointment ]

```

Harus informatif.

---

# 158. Error State

Semua Error memiliki.

Icon

Judul

Penjelasan

Retry Button

---

# 159. Permission UI

Frontend menyembunyikan.

Menu

Button

Action

Tetapi backend tetap validasi.

---

# 160. Responsive Rules

Desktop

≥1280

Tablet

768-1279

Mobile

<768

Semua halaman harus lolos.

---

# 161. Accessibility

Minimal.

Keyboard Navigation

Focus Ring

ARIA Label

Color Contrast

---

# 162. Performance

Gunakan.

Lazy Route

Memo

Virtual Table

Debounce Search

Infinite Scroll (jika perlu)

---

# 163. Code Style

Gunakan.

Function Component

Named Export

Hook di atas.

Tidak membuat component >500 baris.

Pecah menjadi component kecil.

---

# 164. Definition of Done (Frontend)

Frontend dianggap selesai jika.

✓ Responsive

✓ Mobile Card

✓ Desktop Table

✓ Loading

✓ Empty State

✓ Error State

✓ Permission

✓ Validation

✓ Accessibility

✓ Consistent UI

✓ No TypeScript Error

✓ TanStack Query

✓ Documentation Updated

---

# 165. Frontend Architecture Conclusion

Frontend NIAHAIR ERP dibangun sebagai **Operational Workspace**.

Tujuannya bukan sekadar menampilkan data, tetapi membantu seluruh operasional salon bekerja lebih cepat, lebih nyaman, dan lebih sedikit melakukan klik.

Seluruh halaman harus konsisten, reusable, responsive, dan mengikuti Design System yang telah ditetapkan.

Blueprint ini menjadi standar seluruh pengembangan frontend NIAHAIR ERP.

# PART 6.5 — NIAHAIR DESIGN SYSTEM

---

# 166. Design Philosophy

NIAHAIR ERP bukan website.

NIAHAIR ERP adalah aplikasi operasional yang digunakan oleh karyawan selama 8–10 jam setiap hari.

Karena itu seluruh desain harus mengikuti prinsip berikut.

- Fast
- Consistent
- Minimal Click
- Information First
- Responsive
- Comfortable

User tidak boleh berpikir bagaimana menggunakan aplikasi.

User hanya fokus pada pekerjaan.

---

# 167. Design Principles

Seluruh UI mengikuti 7 prinsip.

## 1. Consistency

Semua halaman mempunyai pola yang sama.

Customer.

Employee.

Inventory.

Invoice.

Treatment.

Harus terasa berasal dari aplikasi yang sama.

---

## 2. Recognition Over Memory

User tidak boleh mengingat.

Semua informasi harus terlihat.

Contoh.

Status menggunakan warna.

Badge.

Icon.

Avatar.

---

## 3. One Primary Action

Satu halaman hanya memiliki satu tombol utama.

Contoh.

Appointment

↓

New Appointment

Treatment

↓

Complete Treatment

Inventory

↓

Adjust Stock

---

## 4. Progressive Disclosure

Informasi kompleks disembunyikan.

Gunakan.

Accordion.

Tabs.

Dialog.

Sheet.

---

## 5. Mobile First

Desktop

↓

Table

Mobile

↓

Card

---

## 6. Information Density

Dashboard.

Padat.

Tetapi tidak membingungkan.

Workspace.

Lebih banyak informasi.

Master Data.

Lebih sederhana.

---

## 7. ERP Workspace

Semua halaman operasional menjadi Workspace.

Bukan CRUD.

---

# 168. Layout Grid

Desktop

```
Sidebar

Header

Content
```

Content.

```
Title

↓

Statistics

↓

Toolbar

↓

Content

↓

Pagination
```

---

# 169. Page Types

ERP hanya memiliki 6 jenis halaman.

## Dashboard

Statistik.

Ringkasan.

Chart.

---

## Workspace

Daily Board.

Treatment.

Schedule.

Inventory.

---

## List

Customer.

Employee.

Invoice.

Payment.

---

## Detail

Customer 360.

Treatment Detail.

Invoice Detail.

---

## Settings

Master Data.

Configuration.

---

## Reports

Filter.

Table.

Export.

---

# 170. Header Standard

Semua halaman.

```
Title

Description

Action
```

Contoh.

```
Customer

Kelola seluruh customer.

[ New Customer ]
```

---

# 171. Statistics Card

Selalu di atas.

Contoh.

```
Total

Hari Ini

Aktif

Pending
```

Minimal.

4 Card.

Maksimal.

8 Card.

---

# 172. Toolbar

Selalu berisi.

Search.

Filter.

Refresh.

Export.

Primary Button.

Urutan selalu sama.

---

# 173. Table Standard

Desktop.

Gunakan Table.

Header sticky.

Pagination bawah.

Action kolom terakhir.

---

# 174. Card Standard

Mobile.

Gunakan Card.

Action di bawah.

Status selalu terlihat.

---

# 175. Sheet Standard

Semua Create.

Semua Edit.

Menggunakan Sheet.

Lebar.

Desktop

640 px.

Mobile

100%.

---

# 176. Dialog Standard

Dialog hanya untuk.

Delete.

Confirmation.

Approval.

Reset Password.

Tidak untuk Form besar.

---

# 177. Tabs Standard

Gunakan maksimal.

7 Tabs.

Jika lebih.

Pisahkan halaman.

---

# 178. Form Standard

Field.

```
Label

↓

Input

↓

Helper

↓

Error
```

Tidak boleh Error di atas.

---

# 179. Button Standard

Primary

Blue.

Secondary

Outline.

Danger

Red.

Ghost

Icon.

Tidak lebih dari satu Primary dalam satu section.

---

# 180. Badge Standard

Success

Green.

Warning

Amber.

Error

Red.

Info

Blue.

Inactive

Slate.

Seluruh module menggunakan warna yang sama.

---

# 181. Icon Standard

Gunakan Lucide.

Ukuran.

16

20

24

32

Tidak mencampur library icon.

---

# 182. Color Palette

Primary

Blue.

Secondary

Slate.

Success

Green.

Warning

Amber.

Danger

Red.

Information

Sky.

Background

Gray-50.

---

# 183. Typography

Heading 1

30

Heading 2

24

Heading 3

20

Body

14–16

Caption

12

Font Weight konsisten.

---

# 184. Spacing System

Gunakan skala.

4

8

12

16

24

32

48

64

Tidak menggunakan angka acak.

---

# 185. Border Radius

Button

10px

Card

12px

Dialog

16px

Sheet

16px

Input

10px

Konsisten.

---

# 186. Shadow

Gunakan.

Soft Shadow.

Tidak menggunakan shadow berlebihan.

---

# 187. Empty State

Selalu memiliki.

Icon.

Title.

Description.

Primary Button.

---

# 188. Loading State

Gunakan Skeleton.

Spinner hanya untuk proses singkat.

---

# 189. Error State

Selalu memiliki.

Icon.

Title.

Description.

Retry Button.

---

# 190. Responsive Rules

Desktop

Table.

Tablet

Hybrid.

Mobile

Card.

Tidak boleh scroll horizontal.

---

# 191. Workspace Standard

Workspace terdiri dari.

Header.

↓

Summary.

↓

Main Area.

↓

Side Panel.

Contoh.

Treatment.

Schedule.

Daily Board.

---

# 192. Customer 360 Standard

Customer 360 selalu memiliki.

Overview.

Timeline.

Appointment.

Treatment.

Invoice.

Deposit.

Payment.

Photos.

Notes.

---

# 193. Dashboard Standard

Dashboard bukan laporan.

Dashboard menjawab.

Apa yang harus saya kerjakan hari ini?

---

# 194. Animation

Gunakan.

Fade.

Slide.

Scale.

Durasi.

150–250ms.

Tidak menggunakan animasi berlebihan.

---

# 195. Accessibility

Keyboard.

Focus Ring.

ARIA.

Contrast.

Screen Reader.

Minimal WCAG AA.

---

# 196. Definition of Done

UI dianggap selesai apabila.

✓ Responsive

✓ Mobile

✓ Tablet

✓ Desktop

✓ Empty State

✓ Loading

✓ Error

✓ Permission

✓ Accessibility

✓ Design System

✓ No Layout Shift

✓ Reusable Component

---

# 197. Golden Rule

Sebelum membuat halaman baru.

Developer harus bertanya.

Apakah halaman ini mengikuti Design System?

Jika tidak.

Maka halaman harus didesain ulang.

Design System adalah standar tertinggi seluruh UI NIAHAIR ERP.

# PART 7 — INTEGRATION & PLATFORM SERVICES ARCHITECTURE

---

# 198. Platform Philosophy

Platform Services adalah sekumpulan layanan lintas domain (cross-cutting services) yang digunakan oleh hampir seluruh module ERP.

Platform Services **bukan Business Module**.

Platform Services menyediakan kemampuan teknis yang dibutuhkan seluruh sistem.

Contoh:

- Authentication
- Cloudinary
- Accurate
- Notification
- Background Job
- Scheduler
- AI
- Audit
- Sync Queue

Business Module tidak boleh memiliki implementasi platform sendiri.

---

# 199. Platform Architecture

```

Business Modules

│

├── Customer

├── Appointment

├── Treatment

├── Inventory

├── Finance

├── HR

└── Production

↓

Platform Services

↓

External Services

```

---

# 200. Platform Services

Platform terdiri dari:

```

Authentication

Authorization

Cloudinary

Accurate

Notification

Scheduler

Queue

Background Worker

Audit

Webhook

AI

Logging

Monitoring

Configuration

```

---

# 201. Accurate Integration

Accurate merupakan Accounting System.

ERP merupakan Operational System.

Accurate bukan source of truth untuk transaksi operasional.

ERP tetap menjadi sumber utama.

Sinkronisasi dilakukan asynchronous.

```

ERP

↓

Sync Queue

↓

Worker

↓

Accurate

```

Jika Accurate gagal.

Operasional tetap berjalan.

---

# 202. Accurate Sync Strategy

Master Data

- Customer
- Item
- Unit
- Warehouse
- Payment Method

Transaction

- Invoice
- Payment

Future

- Purchase
- Stock Adjustment

Semua sinkronisasi dicatat pada Sync Queue.

---

# 203. Sync Queue

Sync Queue memiliki lifecycle.

```

PENDING

↓

PROCESSING

↓

SUCCESS

```

atau

```

PENDING

↓

FAILED

↓

RETRY

```

Setiap queue memiliki:

- retryCount
- errorMessage
- startedAt
- finishedAt

---

# 204. Background Worker

Worker menjalankan:

- Accurate Sync
- Notification
- Cleanup
- Reminder
- Retry Queue
- Payroll Scheduler

Worker tidak menerima request dari frontend.

---

# 205. Cloudinary Integration

Semua media disimpan di Cloudinary.

Database hanya menyimpan:

- URL
- Public ID
- MIME Type
- Width
- Height
- File Size

Jenis media:

- Customer Photo
- Treatment Photo
- Appointment Photo
- Employee Photo
- Product Image

---

# 206. Notification Service

Notification adalah Platform Service.

Channel:

- WhatsApp
- Telegram
- Email
- Push Notification

Semua notification dikirim secara asynchronous melalui Queue.

---

# 207. Scheduler

Scheduler menjalankan pekerjaan berkala.

Contoh:

- Daily Attendance Check
- Daily Reminder
- Retry Queue
- Payroll Closing
- Dashboard Cache Refresh
- Cleanup Temporary File

---

# 208. Webhook Service

Webhook digunakan untuk menerima event dari sistem eksternal.

Contoh:

- Payment Gateway
- Accurate Callback
- WhatsApp
- Future Mobile App

Semua webhook harus:

- divalidasi
- dicatat
- idempotent

---

# 209. AI Service

AI digunakan sebagai layanan pendukung.

Contoh:

- Customer Summary
- Treatment Recommendation
- Sales Insight
- Inventory Forecast
- AI Assistant

AI tidak boleh mengubah transaksi bisnis secara langsung.

AI hanya memberikan rekomendasi.

---

# 210. Logging Platform

Semua log menggunakan format yang sama.

Minimal:

- Timestamp
- Module
- User
- Branch
- Request ID
- Duration
- Log Level

---

# 211. Monitoring Platform

Future Monitoring Stack:

- Sentry
- Grafana
- Prometheus
- OpenTelemetry

Metric utama:

- API Response Time
- Error Rate
- Queue Length
- Worker Status
- Memory Usage
- CPU Usage
- Database Connection

---

# 212. Configuration Service

Semua konfigurasi sistem berada pada Configuration Layer.

Contoh:

- JWT
- Cloudinary
- Accurate
- AI
- SMTP
- WhatsApp
- Telegram

Tidak boleh membaca process.env secara langsung di Business Module.

---

# 213. File Storage Policy

File tidak disimpan di PostgreSQL.

Media disimpan di Cloudinary.

Database hanya menyimpan metadata.

---

# 214. Platform Security

Platform wajib menerapkan:

- HTTPS
- Secret Management
- Rate Limiting
- Signature Validation
- Webhook Verification

---

# 215. Platform Scalability

Platform Services harus mampu berkembang secara independen.

Future:

- Redis
- BullMQ
- Kafka
- RabbitMQ
- CDN
- Object Storage

Tanpa mengubah Business Module.

---

# 216. Integration Principles

Seluruh integrasi mengikuti prinsip:

- Loose Coupling
- Retry
- Idempotency
- Audit Trail
- Queue First
- Fail Safe

Tidak ada Business Module yang bergantung langsung pada layanan eksternal.

---

# 217. Platform Architecture Conclusion

Platform Services merupakan fondasi teknis seluruh NIAHAIR ERP.

Semua layanan eksternal harus diakses melalui Platform Layer.

Business Module tidak boleh mengetahui implementasi teknis dari layanan eksternal.

Dengan arsitektur ini, perubahan vendor (misalnya Cloudinary ke S3, atau Accurate ke sistem lain) tidak akan memengaruhi Business Module.

# PART 8 — SECURITY, PERMISSION & AUDIT ARCHITECTURE

---

# 218. Security Philosophy

Security pada NIAHAIR ERP bukan hanya Authentication.

Security mencakup:

- Authentication
- Authorization
- Branch Isolation
- Data Ownership
- Approval Workflow
- Audit Trail
- Activity Log
- Secure Integration

Semua transaksi harus dapat dipertanggungjawabkan.

---

# 219. Security Layers

NIAHAIR ERP memiliki 7 lapisan keamanan.

```
Internet

↓

HTTPS

↓

JWT Authentication

↓

Role Permission

↓

Branch Access

↓

Business Validation

↓

Audit Trail
```

Semua request harus melewati seluruh layer tersebut.

---

# 220. Authentication

Authentication menggunakan JWT.

Flow.

```
Login

↓

JWT

↓

Authorization Header

↓

Backend

↓

Current User
```

JWT hanya digunakan untuk identitas.

JWT tidak boleh menyimpan business data.

---

# 221. Session Strategy

Session bersifat Stateless.

Backend tidak menyimpan session user.

Session hanya berasal dari JWT.

Future:

Refresh Token dapat ditambahkan.

---

# 222. Password Policy

Password minimal:

- 8 karakter

Harus mengandung:

- Huruf besar
- Huruf kecil
- Angka

Future:

- Special Character

Password menggunakan bcrypt.

Tidak boleh reversible.

---

# 223. Password Reset

Password tidak boleh diedit langsung.

Flow.

```
User

↓

Reset Password

↓

Temporary Token

↓

New Password

↓

Audit
```

Reset password harus tercatat.

---

# 224. User Status

User memiliki status.

ACTIVE

LOCKED

DISABLED

PENDING

User LOCKED tidak dapat login.

---

# 225. Role Architecture

Role menentukan hak akses.

Contoh.

SUPER_ADMIN

OWNER

MANAGER

RECEPTIONIST

STYLIST

ASSISTANT

WAREHOUSE

FINANCE

HR

Setiap Role memiliki Permission.

Role bukan Employee Position.

---

# 226. Employee Role

Employee Role digunakan untuk operasional.

Contoh.

Stylist

Assistant

Colorist

Manager

Reception

Tidak digunakan untuk login.

---

# 227. Permission Model

Permission bersifat granular.

Contoh.

Customer

```
customer.read

customer.create

customer.update

customer.delete
```

Inventory

```
inventory.read

inventory.adjust

inventory.transfer
```

Payment

```
payment.read

payment.create

payment.refund
```

Permission tidak boleh menggunakan string bebas.

---

# 228. Branch Access

Setiap User memiliki Branch Access.

Flow.

```
User

↓

Allowed Branches

↓

Current Branch

↓

Transaction
```

Jika Branch tidak diizinkan.

Return.

```
403 Forbidden
```

---

# 229. Home Branch

Employee memiliki:

- Home Branch
- Working Branches

Home Branch digunakan untuk:

- Payroll
- Attendance
- Reporting

Working Branch digunakan untuk:

- Schedule
- Appointment
- Treatment

---

# 230. Data Ownership

Setiap transaksi memiliki pemilik.

Contoh.

Appointment

↓

Created By

Treatment

↓

Handled By

Invoice

↓

Created By

Payment

↓

Received By

Movement

↓

Created By

Semua ownership harus dapat ditelusuri.

---

# 231. Approval Workflow

Beberapa transaksi membutuhkan approval.

Contoh.

Inventory Adjustment

Payroll

Commission

Manual Discount

Refund

Approval Flow.

```
Draft

↓

Pending Approval

↓

Approved

↓

Executed
```

---

# 232. Audit Philosophy

Semua transaksi penting harus memiliki audit.

Audit tidak boleh dihapus.

Audit tidak boleh diedit.

Audit hanya bertambah.

---

# 233. Audit Information

Minimal menyimpan.

- User
- Employee
- Branch
- Module
- Action
- Before
- After
- Timestamp
- IP Address (Future)
- Device (Future)

---

# 234. Activity Log

Activity Log mencatat aktivitas user.

Contoh.

Login

Logout

Create Customer

Update Employee

Delete Photo

Complete Treatment

Generate Invoice

---

# 235. Immutable Transactions

Transaksi berikut tidak boleh diubah.

Inventory Movement

Payment

Commission

Payroll

Audit

Sync Log

Jika salah.

Buat transaksi koreksi.

---

# 236. Sensitive Data

Data berikut dianggap sensitif.

Salary

Commission

Password

API Key

JWT Secret

Cloudinary Secret

Accurate Secret

Tidak boleh muncul di API Response.

---

# 237. Secure API

Semua API harus:

- JWT
- Permission
- Branch Validation
- Input Validation
- Business Validation

Tidak boleh hanya mengandalkan frontend.

---

# 238. File Security

Upload hanya menerima.

- JPG
- PNG
- WEBP
- PDF (future)

Maksimum.

10 MB.

Semua file divalidasi.

---

# 239. Cloudinary Security

Database hanya menyimpan.

- URL
- Public ID

Delete harus menghapus:

Cloudinary

Database

Audit

---

# 240. SQL Injection

Menggunakan Prisma.

Raw SQL hanya diperbolehkan jika:

- benar-benar diperlukan
- menggunakan parameter binding

---

# 241. XSS Protection

Semua input text harus disanitasi.

Frontend tidak boleh melakukan render HTML bebas.

---

# 242. CSRF Strategy

Future.

Jika menggunakan Cookie Authentication.

Aktifkan CSRF Protection.

JWT Bearer saat ini tidak memerlukan CSRF.

---

# 243. Rate Limiting

Endpoint berikut harus memiliki limit.

Login

Password Reset

Webhook

Upload

AI Endpoint

---

# 244. Webhook Security

Semua webhook harus.

- Signature Validation
- Timestamp Validation
- Idempotency
- Logging

---

# 245. Background Worker Security

Worker memiliki credential sendiri.

Worker tidak menggunakan JWT User.

Worker menggunakan System Credential.

---

# 246. System User

Beberapa transaksi dibuat oleh sistem.

Contoh.

Sync Accurate

Scheduler

Reminder

Inventory Generator

Gunakan.

createdSource = SYSTEM

atau

createdByEmployeeId = null

---

# 247. Security Monitoring

Pantau.

- Failed Login
- Permission Denied
- API Error
- Queue Failure
- Sync Failure

Future:

Integrasi dengan Sentry.

---

# 248. Backup Policy

Backup Database.

Daily.

Retention.

30 Hari.

Cloudinary.

Tidak termasuk backup database.

---

# 249. Disaster Recovery

Jika server gagal.

Langkah.

Restore Database

↓

Restore Files

↓

Restart Worker

↓

Resume Queue

Target Recovery.

< 2 Jam.

---

# 250. Compliance

Seluruh transaksi harus memenuhi.

- Auditability
- Traceability
- Data Integrity
- Non Repudiation

Tidak boleh ada transaksi tanpa jejak.

---

# 251. Security Checklist

Setiap module wajib memenuhi.

✓ Authentication

✓ Authorization

✓ Permission

✓ Branch Validation

✓ Business Validation

✓ Audit

✓ Logging

✓ Secure Upload

✓ Secure Response

✓ Error Handling

✓ Rate Limit

✓ Multi Branch Safe

---

# 252. Security Architecture Conclusion

Security merupakan bagian dari Business Architecture.

Seluruh transaksi bisnis harus dapat:

- diketahui siapa yang membuat
- diketahui kapan dibuat
- diketahui dari branch mana
- diketahui alasan perubahan
- dapat diaudit kapan saja

Keamanan bukan fitur tambahan.

Keamanan adalah fondasi seluruh NIAHAIR ERP.

# PART 9 — INFRASTRUCTURE, DEPLOYMENT & SCALABILITY

---

# 253. Infrastructure Philosophy

Infrastructure merupakan fondasi operasional NIAHAIR ERP.

Tujuan utama infrastruktur adalah:

- High Availability
- Reliability
- Scalability
- Maintainability
- Security
- Disaster Recovery

Infrastruktur harus mampu berkembang tanpa mengubah Business Module.

---

# 254. Infrastructure Layers

```

Internet

↓

CDN

↓

Frontend

↓

Backend API

↓

Background Worker

↓

PostgreSQL

↓

Cloudinary

↓

Accurate

```

Setiap layer dapat di-scale secara independen.

---

# 255. Environment Strategy

NIAHAIR ERP memiliki empat environment.

```

Development

↓

Testing

↓

Staging

↓

Production

```

Development tidak boleh menggunakan database Production.

---

# 256. Development Environment

Digunakan oleh developer.

Berisi:

- Local PostgreSQL
- Local Backend
- Local Frontend
- Local Worker

Menggunakan data dummy.

---

# 257. Testing Environment

Digunakan untuk QA.

Semua fitur baru harus diuji di Testing sebelum Staging.

---

# 258. Staging Environment

Mirror Production.

Konfigurasi sama dengan Production.

Digunakan untuk:

- UAT
- Final Testing
- Demo

---

# 259. Production Environment

Production hanya digunakan oleh operasional.

Tidak boleh:

- Testing
- Debugging
- Manual SQL

---

# 260. Deployment Strategy

Deployment dilakukan bertahap.

```

Build

↓

Test

↓

Migration

↓

Deploy Backend

↓

Deploy Worker

↓

Deploy Frontend

↓

Health Check

↓

Production

```

Jika gagal.

Rollback.

---

# 261. Zero Downtime Deployment

Target deployment.

Tidak mengganggu operasional salon.

Gunakan:

- Rolling Deployment
- Health Check
- Graceful Restart

---

# 262. CI/CD Pipeline

Pipeline.

```

Git Push

↓

Lint

↓

Type Check

↓

Test

↓

Build

↓

Deploy

```

Jika salah satu gagal.

Deployment dibatalkan.

---

# 263. Branching Strategy

Gunakan Git Flow sederhana.

```

main

develop

feature/*

hotfix/*
```

Production hanya berasal dari:

main

---

# 264. Database Migration

Migration menggunakan Prisma.

Aturan.

- Tidak mengubah Production langsung.
- Selalu backup.
- Migration harus reversible jika memungkinkan.

---

# 265. Backup Strategy

Database.

Daily Backup.

Retention.

30 Hari.

Backup disimpan di lokasi berbeda.

---

# 266. Restore Procedure

Jika database rusak.

```

Restore Backup

↓

Run Migration Check

↓

Verify Data

↓

Resume Worker

↓

Production

```

Target.

Recovery < 2 Jam.

---

# 267. File Storage

Semua media berada di Cloudinary.

Tidak menyimpan file pada server lokal.

Cloudinary menjadi source untuk seluruh media.

---

# 268. CDN Strategy

Static Assets.

Menggunakan CDN.

Contoh.

- Images
- Fonts
- Icons
- JS Bundle

---

# 269. Queue Infrastructure

Worker dipisahkan dari Backend API.

```

HTTP API

↓

Queue

↓

Worker

↓

External Service

```

Jika Worker mati.

Frontend tetap berjalan.

---

# 270. Scheduler

Scheduler dipisahkan.

Menjalankan.

- Payroll
- Reminder
- Retry
- Cleanup
- Dashboard Cache

---

# 271. Monitoring

Monitoring wajib mencatat.

- API Response Time
- Error Rate
- Worker Status
- Queue Length
- Database Connection
- CPU
- Memory
- Disk

---

# 272. Logging

Semua log dikirim ke centralized logging.

Minimal.

- INFO
- WARN
- ERROR
- FATAL

---

# 273. Alerting

Alert otomatis ketika.

- Database Down
- Queue Stuck
- API Error Rate Tinggi
- Worker Mati
- Disk Hampir Penuh
- Memory Tinggi

---

# 274. Performance Targets

API.

95% request.

<500ms

Dashboard.

<1 detik.

Customer Search.

<300ms.

---

# 275. Database Scaling

Gunakan.

- Index
- Composite Index
- Connection Pool
- Read Replica (Future)

---

# 276. Backend Scaling

Backend harus bersifat Stateless.

Dapat dijalankan lebih dari satu instance.

```

Load Balancer

↓

Backend 1

Backend 2

Backend 3

```

---

# 277. Frontend Scaling

Frontend menggunakan static hosting.

Future.

- Vercel
- Cloudflare
- Netlify

---

# 278. Queue Scaling

Worker dapat ditambah.

```

Queue

↓

Worker 1

Worker 2

Worker 3

```

Tidak mengubah Business Module.

---

# 279. Storage Scaling

Media.

Cloudinary.

Future.

AWS S3.

Google Cloud Storage.

Azure Blob.

Business Module tidak mengetahui vendor.

---

# 280. High Availability

Target.

Backend.

99.9%

Tidak boleh Single Point of Failure.

---

# 281. Disaster Recovery

Jika server gagal.

```

Restore Database

↓

Restart Backend

↓

Restart Worker

↓

Resume Queue

↓

Production

```

Target.

RTO

<2 Jam.

RPO

<24 Jam.

---

# 282. Security Infrastructure

Gunakan.

HTTPS.

Firewall.

Secret Manager.

Environment Variable.

Backup Encryption.

---

# 283. Infrastructure Cost Strategy

Awal.

- VPS
- PostgreSQL
- Cloudinary

Growth.

- Managed PostgreSQL
- Redis
- Queue Server

Enterprise.

- Kubernetes
- Multi Region
- Auto Scaling

---

# 284. Scalability Roadmap

Target.

```

1 Branch

↓

5 Branch

↓

20 Branch

↓

50 Branch

↓

100 Branch
```

Blueprint tidak berubah.

---

# 285. Technology Roadmap

Current.

- React
- Express
- Prisma
- PostgreSQL
- Cloudinary

Future.

- Redis
- BullMQ
- Sentry
- Grafana
- Prometheus
- OpenTelemetry
- Elasticsearch

---

# 286. Operational Monitoring Dashboard

Owner dapat melihat.

- Online User
- Today's Appointment
- Queue Status
- Sync Status
- API Status
- Worker Status
- Server Health

Dalam satu dashboard.

---

# 287. Maintenance Strategy

Maintenance dilakukan di luar jam operasional.

Sebelum maintenance.

- Backup
- Notification
- Health Check

Setelah maintenance.

- Smoke Test
- Queue Check
- Sync Check

---

# 288. Infrastructure Documentation

Seluruh infrastruktur wajib memiliki dokumentasi.

Meliputi.

- Server
- Database
- Domain
- SSL
- Queue
- Cloudinary
- Accurate
- Deployment

---

# 289. Future Infrastructure

Blueprint dipersiapkan untuk.

- Mobile App
- Public API
- Franchise
- Multi Company
- AI Services
- BI Dashboard

Tanpa perubahan arsitektur utama.

---

# 290. Infrastructure Success Criteria

Infrastructure dianggap berhasil apabila.

✓ Zero Data Loss

✓ Backup Berjalan

✓ Queue Stabil

✓ Monitoring Aktif

✓ Alert Berfungsi

✓ Deployment Aman

✓ Multi Branch Stabil

✓ Recovery Cepat

✓ Dokumentasi Lengkap

---

# 291. Infrastructure Architecture Conclusion

Infrastructure bukan sekadar server.

Infrastructure adalah fondasi agar seluruh operasional salon dapat berjalan tanpa gangguan.

Semua keputusan infrastruktur harus mendukung:

- Reliability
- Scalability
- Maintainability
- Security
- Long-Term Growth

Blueprint ini menjadi standar pengelolaan infrastruktur NIAHAIR ERP.

# PART 10 — LONG-TERM ERP ROADMAP & FUTURE VISION

---

# 292. Vision 2030

NIAHAIR ERP dibangun bukan hanya sebagai aplikasi salon.

Target jangka panjang adalah menjadi platform ERP khusus industri:

- Salon
- Hair Extension
- Hair Manufacturing
- Beauty Clinic
- Franchise Beauty Business

Seluruh arsitektur dirancang agar dapat berkembang tanpa perlu melakukan redesign besar.

---

# 293. Product Vision

NIAHAIR ERP akan menjadi platform terpadu yang menghubungkan seluruh aktivitas bisnis.

```
Customer

↓

Booking

↓

Treatment

↓

Inventory

↓

Production

↓

Finance

↓

Payroll

↓

Business Intelligence
```

Setiap aktivitas bisnis hanya diinput satu kali dan dimanfaatkan oleh seluruh modul.

---

# 294. Development Philosophy

Setiap fitur baru harus memenuhi tiga pertanyaan.

1.

Apakah menyelesaikan masalah bisnis?

2.

Apakah sesuai Blueprint?

3.

Apakah dapat digunakan 5 tahun ke depan?

Jika salah satu jawabannya "Tidak",

fitur harus didesain ulang.

---

# 295. Product Maturity Levels

Level 1

Operational

- Customer
- Appointment
- Invoice
- Payment

Level 2

Integrated ERP

- Treatment
- Inventory
- Warehouse
- Commission
- Payroll

Level 3

Manufacturing ERP

- Production
- BOM
- QC
- Purchase
- Supplier

Level 4

Enterprise Platform

- BI Dashboard
- AI
- Mobile
- API
- Franchise

---

# 296. Phase 1 — Foundation

Target.

Operasional salon berjalan penuh.

Module.

✓ Authentication

✓ Customer

✓ Employee

✓ Branch

✓ Appointment

✓ Schedule

✓ Daily Board

✓ Deposit

✓ Invoice

✓ Payment

✓ Customer 360

Target.

Salon dapat beroperasi penuh.

---

# 297. Phase 2 — Treatment ERP

Module.

Treatment Workspace

Material Usage

Treatment Photos

Treatment Timeline

Treatment Assignment

Treatment Analytics

Target.

Stylist bekerja sepenuhnya melalui ERP.

Tidak menggunakan catatan manual.

---

# 298. Phase 3 — Inventory ERP

Module.

Inventory

Warehouse

Transfer

Adjustment

Opening Balance

Closing Period

Movement

Stock Card

Reservation

Target.

Seluruh stok perusahaan tercatat secara real-time.

---

# 299. Phase 4 — HR ERP

Module.

Attendance

Leave

Commission

Payroll

Employee Performance

Shift Planning

Target.

Seluruh HR berjalan dari ERP.

---

# 300. Phase 5 — Manufacturing ERP

Module.

Production Order

Raw Material

BOM

Production Cost

Quality Control

Finished Goods

Target.

Hair Extension diproduksi melalui ERP.

---

# 301. Phase 6 — Purchasing ERP

Module.

Supplier

Purchase Order

Receiving

Purchase Return

Vendor Payment

Target.

Seluruh pembelian masuk ke Inventory secara otomatis.

---

# 302. Phase 7 — Finance ERP

Module.

Cash Flow

Profit Loss

Balance Sheet

Financial Dashboard

Bank Reconciliation

Target.

ERP menjadi pusat operasional keuangan.

Accounting tetap menggunakan Accurate.

---

# 303. Phase 8 — Business Intelligence

Module.

Executive Dashboard

Sales Dashboard

Inventory Dashboard

Employee Dashboard

Production Dashboard

Target.

Owner dapat melihat kondisi perusahaan secara real-time.

---

# 304. Phase 9 — Artificial Intelligence

Future AI.

Customer Summary

Treatment Recommendation

Sales Forecast

Demand Forecast

Inventory Forecast

Payroll Insight

Management Assistant

Target.

AI membantu pengambilan keputusan.

AI tidak menggantikan keputusan manusia.

---

# 305. Phase 10 — Mobile Platform

Platform.

Android

iOS

Features.

Appointment

Treatment

Attendance

Dashboard

Approval

Notification

Target.

Operasional dapat dilakukan dari perangkat mobile.

---

# 306. Phase 11 — Franchise Platform

Module.

Multi Company

Franchise

Royalty

Regional Dashboard

Cross Company Reporting

Target.

Satu ERP mendukung banyak perusahaan.

---

# 307. Phase 12 — Public API

ERP menyediakan API publik.

Partner.

Marketplace

Website

Mobile

AI

Third Party

Semua menggunakan API yang sama.

---

# 308. Long-Term Technical Roadmap

Future Technology.

Redis

BullMQ

Event Bus

OpenTelemetry

Grafana

Prometheus

ElasticSearch

Data Warehouse

CQRS (jika diperlukan)

Event Sourcing (untuk domain tertentu)

Tidak diimplementasikan sebelum benar-benar dibutuhkan.

---

# 309. Scalability Roadmap

Target.

```
Today

↓

1 Branch

↓

5 Branch

↓

20 Branch

↓

50 Branch

↓

100 Branch

↓

500 Branch
```

Blueprint tetap sama.

Hanya infrastruktur yang berkembang.

---

# 310. Data Growth Projection

Target.

```
Customer

500.000+

Appointment

5.000.000+

Treatment

5.000.000+

Invoice

5.000.000+

Inventory Movement

100.000.000+
```

Arsitektur harus tetap stabil.

---

# 311. Engineering Roadmap

Target engineering.

Unit Test

Integration Test

E2E Test

CI/CD

Code Coverage

Monitoring

Performance Profiling

Automated Deployment

Developer Documentation

---

# 312. UX Roadmap

Future.

Dark Mode

Offline Mode

Keyboard Shortcut

Drag & Drop Workspace

Voice Command

Smart Search

Global Command Palette

---

# 313. Reporting Roadmap

Report.

Sales

Treatment

Commission

Payroll

Inventory

Production

Supplier

Customer

Financial

Semua dapat diexport.

PDF

Excel

CSV

---

# 314. Integration Roadmap

Current.

Accurate

Cloudinary

Future.

WhatsApp

Telegram

Google Calendar

Email

Payment Gateway

Marketplace

OCR

Barcode

QR Code

---

# 315. AI Roadmap

Future AI Modules.

AI Customer Service

AI Sales Assistant

AI Inventory Planner

AI Production Planner

AI Business Analyst

AI Executive Dashboard

AI Chat Assistant

AI Knowledge Base

Semua AI bersifat advisory.

---

# 316. Product Principles

NIAHAIR ERP akan selalu mempertahankan prinsip berikut.

- Business First
- ERP First
- Mobile First
- Audit First
- Multi Branch Ready
- Modular
- Scalable
- Secure
- Maintainable

Prinsip ini tidak boleh berubah.

---

# 317. Success Indicators

ERP dianggap berhasil apabila.

✓ Seluruh operasional salon menggunakan ERP.

✓ Tidak ada pencatatan manual.

✓ Inventory selalu akurat.

✓ Payroll otomatis.

✓ Commission otomatis.

✓ Accurate sinkron.

✓ Dashboard real-time.

✓ Multi Branch stabil.

✓ Semua transaksi dapat diaudit.

---

# 318. Architecture Evolution Policy

Blueprint adalah dokumen hidup.

Setiap perubahan besar harus mengikuti proses.

```
Business Need

↓

Architecture Review

↓

Blueprint Update

↓

Implementation

↓

Testing

↓

Documentation Update
```

Implementasi tidak boleh mendahului Blueprint.

---

# 319. Engineering Culture

Seluruh developer NIAHAIR ERP wajib memahami.

- ERP Blueprint
- Business Rules
- Architecture Decisions
- UI Design System
- API Standards

Sebelum mengembangkan fitur baru.

---

# 320. Final Vision

NIAHAIR ERP bukan hanya software.

NIAHAIR ERP adalah platform operasional yang menyatukan seluruh proses bisnis perusahaan.

Seluruh keputusan teknis harus selalu mengutamakan:

- Kemudahan operasional
- Integritas data
- Skalabilitas
- Keamanan
- Maintainability
- Pengalaman pengguna

Blueprint ini menjadi acuan resmi seluruh pengembangan NIAHAIR ERP.

Seluruh implementasi harus mengikuti Blueprint ini.

Jika implementasi bertentangan dengan Blueprint, maka Blueprint harus direvisi terlebih dahulu atau implementasi harus diperbaiki.

---

# END OF DOCUMENT

Version : 1.0

Status : Living Document

Document Owner : Dani

Lead Architect : ChatGPT

Implementation : Claude Code

Copyright © NIAHAIR ERP