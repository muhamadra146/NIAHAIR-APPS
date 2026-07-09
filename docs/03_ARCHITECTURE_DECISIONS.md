# ARCHITECTURE DECISION RECORDS (ADR)

Version : 1.0

Status : Living Document

Owner : Dani

Lead Architect : ChatGPT

Implementation : Claude Code

---

# 1. Purpose

Architecture Decision Records (ADR) mendokumentasikan seluruh keputusan arsitektur utama pada NIAHAIR ERP.

Dokumen ini menjelaskan:

- Mengapa suatu keputusan dibuat.
- Alternatif yang dipertimbangkan.
- Dampak keputusan tersebut.
- Konsekuensi jangka panjang.

ADR bukan dokumentasi implementasi.

ADR adalah dokumentasi keputusan.

---

# 2. Goals

ADR bertujuan agar.

- Developer baru memahami alasan arsitektur.
- Refactor tidak merusak fondasi sistem.
- Seluruh keputusan besar terdokumentasi.
- Tidak terjadi perdebatan yang sama berulang kali.

---

# 3. Decision Categories

ADR dikelompokkan menjadi beberapa kategori.

Business

Database

Backend

Frontend

Infrastructure

Security

Integration

Performance

Future

---

# 4. ADR Status

Setiap ADR memiliki Status.

PROPOSED

ACCEPTED

SUPERSEDED

DEPRECATED

REJECTED

Saat ini seluruh ADR menggunakan status.

ACCEPTED.

---

# 5. ADR Format

Seluruh ADR menggunakan format berikut.

ADR Number

Title

Status

Context

Decision

Alternatives

Consequences

Trade-offs

Implementation

Future

---

# 6. Architecture Principles

Seluruh ADR wajib mengikuti Blueprint.

Business Rules.

Design System.

Tidak boleh bertentangan dengan ketiga dokumen tersebut.

---

# ADR-001

## ERP sebagai Operational System

### Status

ACCEPTED

### Context

Perusahaan menggunakan Accurate.

Namun operasional salon jauh lebih kompleks daripada Accounting.

ERP harus mengelola.

Customer.

Appointment.

Treatment.

Inventory.

Production.

Payroll.

Accurate tidak mendukung kebutuhan tersebut.

### Decision

ERP menjadi Operational System.

Accurate menjadi Accounting System.

### Alternatives

1.

Menggunakan Accurate sebagai pusat.

Ditolak.

Karena workflow salon tidak dapat dimodelkan dengan baik.

2.

Menggunakan ERP sebagai pusat.

Dipilih.

### Consequences

Operasional tetap berjalan walaupun Accurate offline.

Accounting dilakukan melalui sinkronisasi.

### Trade-Off

Harus membangun mekanisme Sync.

Namun fleksibilitas jauh lebih tinggi.

### Implementation

Queue.

Worker.

Retry.

Sync Status.

### Future

Jika Accurate diganti.

Business Module tidak berubah.

---

# ADR-002

## ERP sebagai Source of Truth

### Status

ACCEPTED

### Context

Terdapat banyak sistem eksternal.

Cloudinary.

Accurate.

AI.

WhatsApp.

Jika tidak ada Source of Truth.

Data akan saling bertentangan.

### Decision

ERP menjadi Source of Truth.

Kecuali.

Media.

↓

Cloudinary.

Accounting.

↓

Accurate.

### Consequences

Seluruh transaksi operasional berasal dari ERP.

### Trade-Off

Harus memiliki mekanisme sinkronisasi yang baik.

### Implementation

Operational Database.

Queue.

Sync Worker.

### Future

Tetap berlaku walaupun vendor berubah.

---

# ADR-003

## Modular Monolith

### Status

ACCEPTED

### Context

Saat ini ukuran tim kecil.

Microservices akan menambah kompleksitas.

### Decision

Menggunakan Modular Monolith.

Module.

Customer.

Appointment.

Treatment.

Inventory.

Finance.

HR.

Production.

Terpisah secara domain.

Namun berjalan dalam satu Backend.

### Alternatives

Microservices.

Ditolak.

### Consequences

Deployment lebih sederhana.

Debugging lebih mudah.

### Trade-Off

Harus menjaga boundary antar module.

### Future

Jika diperlukan.

Module dapat dipisahkan menjadi Service.

---

# ADR-004

## Domain Driven Module

### Status

ACCEPTED

### Context

ERP memiliki banyak domain bisnis.

### Decision

Module dibangun berdasarkan Domain.

Bukan berdasarkan Layer.

Contoh.

Customer Module.

Inventory Module.

Treatment Module.

### Consequences

Business Logic tetap berada pada Domain masing-masing.

### Trade-Off

Sedikit lebih kompleks.

Namun jauh lebih mudah dikembangkan.

---

# ADR-005

## UUID sebagai Primary Key

### Status

ACCEPTED

### Context

ERP mendukung Multi Branch.

Future.

Multi Company.

Replication.

Offline Sync.

### Decision

Seluruh Primary Key menggunakan UUID.

### Alternatives

Auto Increment.

Ditolak.

### Consequences

Tidak ada konflik ID.

### Trade-Off

Index sedikit lebih besar.

Namun skalabilitas lebih baik.

### Future

Tetap digunakan.

---

# ADR-006

## Soft Delete sebagai Standar Master Data

### Status

ACCEPTED

### Context

Sebagian besar Master Data memiliki relasi dengan transaksi bisnis.

Contoh.

Customer.

Employee.

Branch.

Warehouse.

Payment Method.

Shift.

Role.

Jika Master Data dihapus secara permanen.

History transaksi akan kehilangan referensi.

### Decision

Seluruh Master Data menggunakan Soft Delete.

Gunakan.

```
isActive

atau

deletedAt
```

Hard Delete hanya diperbolehkan untuk data yang tidak memiliki nilai historis.

Contoh.

Temporary File.

Cache.

Failed Upload.

Testing Data.

### Alternatives

1.

Hard Delete.

Ditolak.

Karena merusak referential integrity.

2.

Soft Delete.

Dipilih.

### Consequences

History transaksi tetap utuh.

Reporting tetap konsisten.

### Trade-Off

Query harus selalu memperhatikan status aktif.

### Implementation

Customer.

Employee.

Branch.

Warehouse.

Shift.

Role.

Payment Method.

### Future

Archive Policy dapat ditambahkan apabila jumlah data semakin besar.

---

# ADR-007

## Immutable Transaction

### Status

ACCEPTED

### Context

Beberapa transaksi merupakan bukti historis.

Contoh.

Inventory Movement.

Payment.

Commission.

Payroll.

Audit.

Jika transaksi tersebut dapat diubah.

Audit menjadi tidak dapat dipercaya.

### Decision

Transaksi historis bersifat Immutable.

Tidak boleh.

UPDATE.

DELETE.

Kesalahan diperbaiki menggunakan transaksi koreksi.

Contoh.

Adjustment.

Refund.

Reversal.

### Alternatives

1.

Mengizinkan Edit.

Ditolak.

2.

Immutable Transaction.

Dipilih.

### Consequences

Audit menjadi valid.

History tetap utuh.

### Trade-Off

Jumlah transaksi bertambah.

Namun seluruh histori dapat ditelusuri.

### Implementation

InventoryMovement.

Payment.

Commission.

Payroll.

AuditLog.

### Future

Digital Signature dapat ditambahkan untuk transaksi kritikal.

---

# ADR-008

## Audit First Architecture

### Status

ACCEPTED

### Context

ERP harus dapat menjelaskan.

Siapa.

Melakukan apa.

Kapan.

Di Branch mana.

Tanpa Audit.

Investigasi hampir tidak mungkin dilakukan.

### Decision

Seluruh transaksi penting wajib menghasilkan Audit.

Minimal.

Created By.

Created At.

Jika dapat berubah.

Updated By.

Updated At.

Jika transaksi kritikal.

Reason.

### Alternatives

Audit hanya pada beberapa module.

Ditolak.

### Consequences

Seluruh aktivitas dapat ditelusuri.

### Trade-Off

Storage sedikit bertambah.

Namun nilai audit jauh lebih besar.

### Implementation

Customer.

Employee.

Appointment.

Treatment.

Inventory.

Invoice.

Payment.

Payroll.

Production.

### Future

Centralized Audit Service.

---

# ADR-009

## Queue First Integration

### Status

ACCEPTED

### Context

ERP terintegrasi dengan.

Accurate.

Cloudinary.

Notification.

Future.

Payment Gateway.

AI.

Jika Backend menunggu seluruh layanan eksternal selesai.

Operasional salon akan terganggu.

### Decision

Seluruh integrasi menggunakan Queue.

```
Business Transaction

↓

Commit Database

↓

Queue

↓

Worker

↓

External System
```

Operasional selesai lebih dahulu.

Sinkronisasi dilakukan di Background.

### Alternatives

Synchronous API.

Ditolak.

### Consequences

Operasional tetap cepat.

Retry menjadi mudah.

### Trade-Off

Harus membangun Queue dan Worker.

Namun sistem jauh lebih stabil.

### Implementation

Accurate Sync.

Notification.

Email.

WhatsApp.

Telegram.

Cloudinary Cleanup.

### Future

BullMQ.

RabbitMQ.

Kafka.

---

# ADR-010

## API First Architecture

### Status

ACCEPTED

### Context

Saat ini ERP memiliki Web Frontend.

Di masa depan.

Mobile.

Public API.

AI.

Partner.

Semuanya membutuhkan Business Logic yang sama.

### Decision

Seluruh Business Logic berada di Backend.

Frontend hanya mengonsumsi API.

Tidak ada Business Logic penting di Frontend.

### Alternatives

Business Logic di Frontend.

Ditolak.

### Consequences

Web.

Mobile.

Desktop.

Menggunakan API yang sama.

### Trade-Off

Backend menjadi lebih besar.

Namun konsistensi jauh lebih tinggi.

### Implementation

REST API.

JWT Authentication.

Role Permission.

Branch Validation.

Business Validation.

### Future

GraphQL.

gRPC.

Public API.

Tanpa mengubah Business Logic.

# CHAPTER 2 — DATABASE ARCHITECTURE DECISIONS

---

# ADR-011

## Inventory menggunakan Balance + Movement

### Status

ACCEPTED

### Context

Inventory merupakan salah satu modul paling kritikal pada ERP.

Terdapat dua pendekatan umum.

1.

Menyimpan saldo saja.

2.

Menghitung saldo dari seluruh transaksi.

Keduanya memiliki kekurangan.

Saldo saja tidak memiliki histori.

Movement saja lambat ketika jumlah transaksi sangat besar.

### Decision

Menggunakan kombinasi.

Inventory

↓

Current Balance

+

InventoryMovement

↓

Transaction History

Inventory menyimpan.

- qtyOnHand
- qtyReserved
- qtyAvailable

InventoryMovement menyimpan seluruh histori perubahan.

### Alternatives

Movement Only.

Ditolak.

Balance Only.

Ditolak.

### Consequences

Saldo dapat dibaca dengan sangat cepat.

History tetap lengkap.

### Trade-Off

Harus menjaga sinkronisasi Balance dan Movement.

### Implementation

Inventory

InventoryMovement

InventoryPeriod

### Future

Event Sourcing dapat ditambahkan tanpa mengubah model bisnis.

---

# ADR-012

## InventoryMovement Bersifat Immutable

### Status

ACCEPTED

### Context

Movement merupakan bukti perubahan stok.

Jika Movement dapat diubah.

Audit menjadi tidak valid.

Perhitungan Cost menjadi tidak dapat dipercaya.

### Decision

InventoryMovement tidak boleh.

UPDATE.

DELETE.

Kesalahan diperbaiki menggunakan.

ADJUSTMENT Movement.

### Alternatives

Edit Movement.

Ditolak.

### Consequences

Audit tetap valid.

Inventory dapat direkonstruksi kapan saja.

### Trade-Off

Jumlah Movement bertambah.

Namun histori menjadi sangat kuat.

### Implementation

InventoryMovement

InventoryPeriod

InventoryService

### Future

Digital Signature dapat ditambahkan pada Movement.

---

# ADR-013

## Snapshot pada Transaction

### Status

ACCEPTED

### Context

Beberapa transaksi membutuhkan data yang tidak boleh berubah.

Contoh.

Commission.

Invoice.

Payroll.

Inventory Movement.

Jika hanya menyimpan Foreign Key.

Perubahan Master Data akan mengubah histori.

### Decision

Transaction menyimpan Snapshot.

Contoh.

Reference Number.

Employee Name.

Warehouse ID.

Unit Cost.

Commission Percentage.

Shift Name.

### Alternatives

Join ke Master Data setiap saat.

Ditolak.

### Consequences

History tetap konsisten.

Walaupun Master berubah.

### Trade-Off

Storage sedikit lebih besar.

### Implementation

InventoryMovement

Commission

Payroll

Invoice

### Future

Snapshot Versioning.

---

# ADR-014

## Soft Delete pada Master Data

### Status

ACCEPTED

### Context

Customer.

Employee.

Branch.

Warehouse.

Shift.

Payment Method.

Seluruhnya memiliki relasi transaksi.

Hard Delete akan merusak histori.

### Decision

Master Data menggunakan.

isActive

atau

deletedAt.

Hard Delete tidak diperbolehkan.

### Alternatives

Hard Delete.

Ditolak.

### Consequences

Referential Integrity tetap terjaga.

### Trade-Off

Query harus memperhatikan status aktif.

### Implementation

Customer

Employee

Branch

Warehouse

Shift

Role

PaymentMethod

### Future

Archive Table.

---

# ADR-015

## UUID sebagai Primary Key

### Status

ACCEPTED

### Context

ERP dirancang untuk.

Multi Branch.

Future Multi Company.

Offline Sync.

Replication.

Auto Increment tidak cocok untuk skenario tersebut.

### Decision

Seluruh Primary Key menggunakan UUID.

Nomor dokumen tetap menggunakan Business Number.

Contoh.

Customer ID

↓

UUID

Invoice Number

↓

INV-202606-00001

### Alternatives

Auto Increment.

Ditolak.

### Consequences

Tidak terjadi benturan ID.

Lebih aman untuk sinkronisasi.

### Trade-Off

Index sedikit lebih besar.

Namun skalabilitas jauh lebih baik.

### Implementation

Seluruh Model Prisma.

### Future

UUID v7 dapat dipertimbangkan apabila sudah stabil dan didukung penuh.

# CHAPTER 3 — BACKEND ARCHITECTURE DECISIONS

---

# ADR-026

## Service Layer sebagai Pusat Business Logic

### Status

ACCEPTED

### Context

Business Logic merupakan bagian terpenting dari ERP.

Jika Business Logic ditempatkan pada Controller.

Business Rule akan tersebar.

Sulit diuji.

Sulit digunakan ulang.

### Decision

Seluruh Business Logic berada pada Service Layer.

Controller hanya bertugas.

- Validasi Request
- Memanggil Service
- Mengembalikan Response

Repository hanya bertugas mengakses Database.

### Alternatives

Business Logic di Controller.

Ditolak.

Fat Repository.

Ditolak.

### Consequences

Business Rule terpusat.

Testing menjadi lebih mudah.

Reuse lebih tinggi.

### Trade-Off

Jumlah file bertambah.

Namun struktur jauh lebih jelas.

### Implementation

customer.service.js

appointment.service.js

inventory.service.js

invoice.service.js

### Future

Domain Service dapat dipisahkan apabila sistem berkembang.

---

# ADR-027

## Repository Pattern

### Status

ACCEPTED

### Context

Business Logic tidak boleh bergantung langsung pada Prisma.

Jika Prisma berubah.

Business Logic tidak boleh ikut berubah.

### Decision

Semua akses database dilakukan melalui Repository.

Service tidak boleh memanggil Prisma secara langsung.

Struktur.

```
Controller

↓

Service

↓

Repository

↓

Prisma
```

### Alternatives

Service → Prisma langsung.

Ditolak.

### Consequences

Database mudah diganti.

Testing lebih mudah.

### Trade-Off

Layer bertambah.

Namun maintainability meningkat.

### Implementation

customer.repository.js

inventory.repository.js

payment.repository.js

### Future

Repository dapat diganti dengan Query Builder lain tanpa mengubah Service.

---

# ADR-028

## Business Validation berada di Backend

### Status

ACCEPTED

### Context

Frontend tidak dapat dipercaya.

Request dapat berasal dari.

Web.

Mobile.

API.

Automation.

AI.

### Decision

Seluruh Business Rule divalidasi di Backend.

Frontend hanya membantu User Experience.

Validation penting.

Appointment Conflict.

Inventory.

Payroll.

Commission.

Permission.

Harus selalu berada di Backend.

### Alternatives

Validation di Frontend.

Ditolak.

### Consequences

Business Rule konsisten.

Tidak tergantung Client.

### Trade-Off

Backend lebih kompleks.

Namun jauh lebih aman.

### Implementation

Service Layer.

### Future

Validation Engine dapat dipisahkan menjadi Domain Validator.

---

# ADR-029

## Transaction Boundary

### Status

ACCEPTED

### Context

Beberapa proses mengubah banyak tabel.

Contoh.

Invoice.

↓

Inventory.

↓

Commission.

↓

Payment.

↓

Timeline.

Jika salah satu gagal.

Data menjadi tidak konsisten.

### Decision

Seluruh operasi multi tabel menggunakan Database Transaction.

Semua berhasil.

Atau.

Semua dibatalkan.

### Alternatives

Manual Rollback.

Ditolak.

### Consequences

Integritas data terjaga.

### Trade-Off

Transaction sedikit lebih berat.

Namun jauh lebih aman.

### Implementation

Prisma Transaction.

### Future

Saga Pattern dapat digunakan apabila menjadi Distributed System.

---

# ADR-030

## Authentication menggunakan JWT

### Status

ACCEPTED

### Context

ERP memiliki.

Web.

Future Mobile.

Future Public API.

Authentication harus Stateless.

### Decision

Menggunakan JWT.

Flow.

```
Login

↓

JWT

↓

Authorization Header

↓

Backend Validation
```

JWT hanya berisi informasi identitas.

Business Data tetap diambil dari Database.

### Alternatives

Session Based Authentication.

Ditolak.

### Consequences

Backend menjadi Stateless.

Scaling lebih mudah.

### Trade-Off

Token Expiration harus dikelola.

### Implementation

JWT Access Token.

Refresh Token (Future).

### Future

OAuth2.

SSO.

Azure AD.

Google Workspace.

---

# ADR-031

## Role-Based Access Control (RBAC)

### Status

ACCEPTED

### Context

NIAHAIR ERP memiliki banyak jenis pengguna.

Contoh.

Owner.

Manager.

Reception.

Stylist.

Warehouse.

Finance.

HR.

Setiap Role memiliki akses yang berbeda.

Permission tidak boleh ditentukan berdasarkan Position.

### Decision

Menggunakan Role-Based Access Control (RBAC).

Relasi.

```
User

↓

Role

↓

Permission

↓

API
```

Employee Position bersifat operasional.

Role menentukan Authorization.

### Alternatives

Permission langsung pada User.

Ditolak.

Position sebagai Permission.

Ditolak.

### Consequences

Permission mudah dikelola.

Role dapat digunakan ulang.

### Trade-Off

Jumlah tabel bertambah.

Namun fleksibilitas jauh lebih tinggi.

### Implementation

Role.

Permission.

RolePermission.

UserRole.

### Future

Attribute-Based Access Control (ABAC).

---

# ADR-032

## Module Boundary

### Status

ACCEPTED

### Context

ERP memiliki banyak Domain.

Customer.

Appointment.

Inventory.

Finance.

Treatment.

Payroll.

Jika Module saling mengakses secara bebas.

Coupling akan sangat tinggi.

### Decision

Setiap Module hanya boleh berkomunikasi melalui Service.

Module tidak boleh mengakses Repository Module lain.

Contoh.

```
Appointment

↓

TreatmentService

✓

Appointment

↓

TreatmentRepository

✗
```

### Alternatives

Cross Repository.

Ditolak.

### Consequences

Module menjadi Independent.

Refactor lebih mudah.

### Trade-Off

Kadang memerlukan Service tambahan.

### Implementation

Module Service.

Module Repository.

### Future

Siap dipisahkan menjadi Microservice.

---

# ADR-033

## Standard Error Handling

### Status

ACCEPTED

### Context

ERP memiliki banyak Business Error.

Contoh.

Appointment Conflict.

Negative Inventory.

Payroll Closed.

Permission Denied.

Jika Error tidak konsisten.

Frontend sulit menangani.

### Decision

Menggunakan Standard Error Response.

Minimal.

Error Code.

Message.

Details.

Request ID.

### Alternatives

String Error biasa.

Ditolak.

### Consequences

Frontend mudah menampilkan Error.

Monitoring lebih mudah.

### Trade-Off

Sedikit lebih banyak Boilerplate.

### Implementation

BusinessError.

ValidationError.

ApiError.

### Future

Internationalized Error Message.

---

# ADR-034

## Idempotency Strategy

### Status

ACCEPTED

### Context

User dapat.

Double Click.

Refresh.

Retry.

Network Timeout.

Webhook Duplicate.

Semua dapat menghasilkan transaksi ganda.

### Decision

Semua transaksi penting bersifat Idempotent.

Reference unik digunakan untuk mendeteksi Duplicate.

Contoh.

Invoice.

Payment.

Inventory Movement.

Commission.

### Alternatives

Tidak menggunakan Idempotency.

Ditolak.

### Consequences

Duplicate Transaction dapat dicegah.

### Trade-Off

Perlu pengecekan tambahan.

### Implementation

Reference ID.

Unique Constraint.

Business Validation.

### Future

Idempotency Key Header.

---

# ADR-035

## Background Worker Pattern

### Status

ACCEPTED

### Context

Beberapa proses tidak boleh dijalankan pada HTTP Request.

Contoh.

Accurate Sync.

Notification.

Reminder.

Cleanup.

Export.

### Decision

Menggunakan Background Worker.

```
Request

↓

Database

↓

Queue

↓

Worker

↓

External System
```

### Alternatives

Semua dilakukan saat HTTP Request.

Ditolak.

### Consequences

Response jauh lebih cepat.

Retry menjadi mudah.

### Trade-Off

Harus memonitor Worker.

### Implementation

Queue.

Worker.

Retry.

### Future

BullMQ.

Redis.

---

# ADR-036

## Dependency Injection Ready

### Status

ACCEPTED

### Context

Saat ini ukuran aplikasi masih memungkinkan menggunakan import langsung.

Namun seiring pertumbuhan sistem, dependency antar service akan semakin kompleks.

### Decision

Service dirancang agar mudah dipindahkan ke Dependency Injection Container.

Walaupun saat ini belum menggunakan framework DI.

### Alternatives

Global Singleton.

Ditolak.

### Consequences

Testing menjadi lebih mudah.

Mock Service lebih sederhana.

### Trade-Off

Sedikit disiplin tambahan saat membuat Service.

### Implementation

Service Constructor Pattern (Future).

### Future

Awilix.

NestJS DI.

TSyringe.

---

# ADR-037

## Configuration Management

### Status

ACCEPTED

### Context

Nilai konfigurasi tidak boleh Hardcoded.

Contoh.

Cloudinary.

JWT.

Accurate.

Upload Limit.

Timezone.

### Decision

Seluruh Configuration berasal dari Environment atau System Settings.

Business Logic tidak boleh membaca nilai Hardcoded.

### Alternatives

Hardcoded Constant.

Ditolak.

### Consequences

Deployment lebih fleksibel.

### Trade-Off

Configuration Management lebih kompleks.

### Implementation

.env

System Settings.

### Future

Vault.

AWS Parameter Store.

Azure Key Vault.

---

# ADR-038

## Structured Logging

### Status

ACCEPTED

### Context

Console.log tidak cukup untuk ERP.

Harus dapat menelusuri transaksi.

### Decision

Semua Log menggunakan Structured Logging.

Minimal.

Timestamp.

Level.

Module.

Request ID.

Employee ID.

Branch ID.

Message.

### Alternatives

Plain Text Logging.

Ditolak.

### Consequences

Monitoring lebih mudah.

Search lebih cepat.

### Trade-Off

Log sedikit lebih besar.

### Implementation

Logger Service.

### Future

OpenTelemetry.

Grafana Loki.

Elastic Stack.

---

# ADR-039

## Domain Event Publishing

### Status

ACCEPTED

### Context

Banyak Module membutuhkan Event yang sama.

Contoh.

Treatment Completed.

↓

Inventory.

Commission.

Customer Timeline.

Analytics.

Notification.

Jika Service saling memanggil.

Coupling menjadi tinggi.

### Decision

Setiap Business Event dapat dipublikasikan sebagai Domain Event.

Contoh.

TreatmentCompleted.

InvoicePaid.

InventoryAdjusted.

CustomerCreated.

### Alternatives

Direct Service Call.

Ditolak.

### Consequences

Module menjadi lebih longgar.

Mudah menambah fitur baru.

### Trade-Off

Event Flow lebih kompleks.

### Implementation

Internal Event Bus (Future).

### Future

RabbitMQ.

Kafka.

NATS.

---

# ADR-040

## API Versioning

### Status

ACCEPTED

### Context

API akan digunakan oleh.

Web.

Mobile.

Partner.

AI.

Perubahan besar tidak boleh merusak Client lama.

### Decision

Semua Public API menggunakan Version.

Contoh.

```
/api/v1

/api/v2
```

Breaking Change hanya dilakukan pada Major Version.

### Alternatives

Tanpa Versioning.

Ditolak.

### Consequences

Backward Compatibility terjaga.

### Trade-Off

Harus memelihara beberapa versi API.

### Implementation

REST Version Prefix.

### Future

GraphQL Gateway.

gRPC Gateway.

# CHAPTER 4 — FRONTEND ARCHITECTURE DECISIONS

---

# ADR-041

## Feature-Based Folder Structure

### Status

ACCEPTED

### Context

Jumlah module pada ERP akan terus bertambah.

Contoh.

Customer.

Appointment.

Treatment.

Inventory.

Payroll.

Production.

Jika seluruh file dipisahkan berdasarkan jenis.

```
components/

pages/

hooks/

services/
```

Maka project akan sulit dipelihara.

### Decision

Frontend menggunakan Feature-Based Architecture.

Contoh.

```
modules/

customer/

appointment/

inventory/

treatment/

settings/
```

Setiap Feature memiliki.

- pages
- components
- hooks
- schemas
- services
- types

### Alternatives

Layer Based Folder.

Ditolak.

### Consequences

Module menjadi Independent.

Refactor lebih mudah.

### Trade-Off

Sedikit lebih banyak folder.

Namun jauh lebih scalable.

### Future

Feature dapat dipisahkan menjadi Package.

---

# ADR-042

## Smart Component dan Presentational Component

### Status

ACCEPTED

### Context

Component yang terlalu besar sulit diuji.

Sulit digunakan ulang.

### Decision

Pisahkan.

Container Component.

↓

Business Logic.

Presentational Component.

↓

Rendering UI.

### Alternatives

Semua Logic di Component.

Ditolak.

### Consequences

Component menjadi kecil.

Reuse meningkat.

### Trade-Off

Jumlah Component bertambah.

### Implementation

Page

↓

Hook

↓

UI Component

---

# ADR-043

## TanStack Query sebagai Server State

### Status

ACCEPTED

### Context

Data ERP sebagian besar berasal dari Backend.

Customer.

Inventory.

Appointment.

Treatment.

Tidak cocok disimpan pada Global State.

### Decision

Server State menggunakan TanStack Query.

Caching.

Refetch.

Invalidation.

Pagination.

Menggunakan TanStack Query.

### Alternatives

Redux.

Ditolak.

Context API.

Ditolak.

### Consequences

Request lebih efisien.

Cache otomatis.

### Trade-Off

Harus memahami Query Key.

### Future

Persist Query Cache.

---

# ADR-044

## React Hook Form

### Status

ACCEPTED

### Context

ERP memiliki Form yang kompleks.

Appointment.

Invoice.

Treatment.

Inventory.

### Decision

Seluruh Form menggunakan React Hook Form.

### Alternatives

Controlled Input Manual.

Ditolak.

Formik.

Ditolak.

### Consequences

Performa lebih baik.

Validasi lebih sederhana.

### Future

Form Builder.

---

# ADR-045

## Zod sebagai Validation Schema

### Status

ACCEPTED

### Context

Frontend membutuhkan validasi sebelum Request dikirim.

### Decision

Semua Form menggunakan Zod.

Schema menjadi sumber validasi Frontend.

Business Validation tetap dilakukan Backend.

### Alternatives

Validation Manual.

Ditolak.

Yup.

Ditolak.

### Consequences

Schema mudah digunakan ulang.

### Trade-Off

Perlu menjaga sinkronisasi dengan Backend.

### Future

Shared Validation Package.

---

# ADR-046

## Reusable UI Component

### Status

ACCEPTED

### Context

ERP memiliki ratusan halaman.

Tanpa komponen reusable.

UI akan tidak konsisten.

### Decision

Semua UI dibangun menggunakan Component.

Contoh.

Button.

Input.

Table.

Dialog.

Badge.

Card.

DataTable.

### Alternatives

Copy Paste UI.

Ditolak.

### Consequences

UI konsisten.

Maintenance lebih mudah.

---

# ADR-047

## Design System First

### Status

ACCEPTED

### Context

ERP akan berkembang selama bertahun-tahun.

### Decision

Seluruh UI mengikuti Design System.

Spacing.

Typography.

Color.

Radius.

Icon.

Shadow.

Animation.

Tidak boleh membuat Style bebas.

### Alternatives

Style per halaman.

Ditolak.

### Future

Design Token.

---

# ADR-048

## Local State First

### Status

ACCEPTED

### Context

Tidak semua State harus Global.

### Decision

Prioritas State.

Local State

↓

TanStack Query

↓

Context

↓

Global Store (jika benar-benar diperlukan)

### Alternatives

Redux untuk semua.

Ditolak.

### Consequences

Frontend lebih sederhana.

---

# ADR-049

## Route-Based Navigation

### Status

ACCEPTED

### Context

ERP memiliki banyak Module.

### Decision

Setiap Module memiliki Route sendiri.

Nested Route digunakan bila sesuai.

### Alternatives

Dynamic Router tanpa struktur.

Ditolak.

### Future

Code Splitting.

---

# ADR-050

## Standard Loading Strategy

### Status

ACCEPTED

### Context

User harus selalu mengetahui status aplikasi.

### Decision

Loading dibedakan menjadi.

Page Loading.

Table Loading.

Button Loading.

Skeleton.

Background Refresh.

### Alternatives

Spinner untuk semua.

Ditolak.

### Future

Optimistic Loading.

---

# ADR-051

## Error Boundary

### Status

ACCEPTED

### Context

Kesalahan pada satu Component tidak boleh membuat seluruh aplikasi crash.

### Decision

Menggunakan React Error Boundary.

Error dicatat.

User melihat halaman Error yang ramah.

### Future

Sentry Integration.

---

# ADR-052

## Optimistic Update

### Status

ACCEPTED

### Context

Beberapa aksi membutuhkan respon cepat.

### Decision

Optimistic Update hanya digunakan untuk operasi yang aman.

Contoh.

Toggle Active.

Notes.

Tag.

Tidak digunakan untuk.

Inventory.

Payment.

Payroll.

### Future

Rollback otomatis.

---

# ADR-053

## Responsive First

### Status

ACCEPTED

### Context

ERP digunakan pada Desktop.

Namun Manager juga menggunakan Tablet dan Mobile.

### Decision

Seluruh halaman harus Responsive.

Desktop menjadi prioritas.

Mobile tetap didukung.

### Future

PWA.

---

# ADR-054

## Accessibility

### Status

ACCEPTED

### Context

ERP digunakan sepanjang hari.

### Decision

Seluruh UI memperhatikan.

Keyboard Navigation.

Focus.

Contrast.

ARIA.

### Future

WCAG AA Compliance.

---

# ADR-055

## Frontend Performance

### Status

ACCEPTED

### Context

ERP memiliki banyak Data Table.

### Decision

Gunakan.

Pagination.

Lazy Loading.

Memoization.

Virtualization bila diperlukan.

Tidak melakukan rendering data berlebihan.

### Future

React Compiler.

Server Components (jika migrasi memungkinkan).

# CHAPTER 5 — INFRASTRUCTURE ARCHITECTURE DECISIONS

---

# ADR-056

## PostgreSQL sebagai Primary Database

### Status

ACCEPTED

### Context

ERP membutuhkan database yang.

- ACID
- Reliable
- Mature
- Mendukung Transaction
- Mendukung Index kompleks

### Decision

Menggunakan PostgreSQL sebagai Primary Database.

### Alternatives

MySQL.

Ditolak.

SQLite.

Ditolak.

MongoDB.

Ditolak.

### Consequences

Integritas data sangat baik.

Mendukung Transaction.

Mendukung JSON.

### Trade-Off

Administrasi sedikit lebih kompleks.

Namun jauh lebih cocok untuk ERP.

### Implementation

PostgreSQL.

Prisma.

### Future

Read Replica.

Partitioning.

---

# ADR-057

## Prisma sebagai ORM

### Status

ACCEPTED

### Context

ERP memiliki lebih dari seratus relasi.

Migration harus mudah.

Type Safety sangat penting.

### Decision

Menggunakan Prisma ORM.

### Alternatives

Sequelize.

Ditolak.

TypeORM.

Ditolak.

Knex.

Ditolak.

### Consequences

Schema lebih mudah dipahami.

Migration lebih aman.

TypeScript Support sangat baik.

### Trade-Off

Query kompleks kadang perlu Raw SQL.

### Future

Prisma Accelerate bila diperlukan.

---

# ADR-058

## Cloudinary sebagai Media Storage

### Status

ACCEPTED

### Context

ERP menyimpan.

Customer Photo.

Treatment Photo.

Appointment Photo.

Employee Photo.

Production Photo.

Media tidak cocok disimpan di database.

### Decision

Semua media disimpan pada Cloudinary.

Database hanya menyimpan.

Public ID.

URL.

Metadata.

### Alternatives

Local Storage.

Ditolak.

Database Blob.

Ditolak.

### Consequences

Storage lebih ringan.

CDN otomatis.

Image Optimization tersedia.

### Trade-Off

Bergantung pada layanan eksternal.

### Future

Amazon S3.

Cloudflare R2.

---

# ADR-059

## Queue-Based Processing

### Status

ACCEPTED

### Context

Beberapa pekerjaan membutuhkan waktu lama.

Contoh.

Sync Accurate.

Export.

Notification.

Cleanup.

### Decision

Semua pekerjaan berat dijalankan melalui Queue.

### Alternatives

Semua dijalankan pada HTTP Request.

Ditolak.

### Consequences

Response API lebih cepat.

Retry lebih mudah.

### Trade-Off

Harus memonitor Queue.

### Future

BullMQ.

RabbitMQ.

Kafka.

---

# ADR-060

## Background Worker

### Status

ACCEPTED

### Context

Queue membutuhkan Worker.

Worker menjalankan.

Sync.

Reminder.

Retry.

Notification.

Cleanup.

### Decision

Worker dipisahkan dari HTTP Server.

### Alternatives

Worker di dalam Web Server.

Ditolak.

### Consequences

Operasional tetap stabil.

Worker dapat di-scale sendiri.

### Future

Dedicated Worker Cluster.

---

# ADR-061

## Redis sebagai Shared Cache (Future)

### Status

ACCEPTED

### Context

ERP akan memiliki.

Session.

Queue.

Cache.

Rate Limit.

### Decision

Redis digunakan sebagai Shared Cache.

Bukan Database utama.

### Alternatives

Memory Cache.

Ditolak.

### Consequences

Scalability meningkat.

### Future

Redis Cluster.

---

# ADR-062

## File Storage Strategy

### Status

ACCEPTED

### Context

Seluruh file memiliki lifecycle berbeda.

### Decision

Database hanya menyimpan Metadata.

File berada pada Object Storage.

### Consequences

Backup Database lebih kecil.

Media lebih mudah dipindahkan.

---

# ADR-063

## Monitoring Strategy

### Status

ACCEPTED

### Context

ERP harus dapat dipantau.

### Decision

Monitoring meliputi.

API.

Database.

Queue.

Worker.

Memory.

CPU.

Disk.

### Future

Grafana.

Prometheus.

OpenTelemetry.

---

# ADR-064

## Backup Strategy

### Status

ACCEPTED

### Context

Data ERP merupakan aset perusahaan.

### Decision

Backup dilakukan berkala.

Database.

Media Metadata.

Configuration.

Backup harus dapat di-restore.

### Alternatives

Manual Backup.

Ditolak.

### Future

Point In Time Recovery.

---

# ADR-065

## Deployment Strategy

### Status

ACCEPTED

### Context

ERP harus mudah di-deploy.

### Decision

Backend.

Frontend.

Worker.

Dipisahkan.

Database berada pada service sendiri.

### Future

Docker.

Kubernetes.

CI/CD Pipeline.

---

# ADR-066

## Environment Configuration

### Status

ACCEPTED

### Context

Development.

Testing.

Production.

Memiliki konfigurasi berbeda.

### Decision

Configuration dipisahkan berdasarkan Environment.

Tidak ada nilai sensitif di source code.

### Future

Configuration Service.

---

# ADR-067

## Secrets Management

### Status

ACCEPTED

### Context

API Key.

JWT Secret.

Cloudinary.

Accurate.

Merupakan data sensitif.

### Decision

Secrets hanya disimpan pada Environment atau Secret Manager.

Tidak boleh di-commit ke Git.

### Future

AWS Secrets Manager.

HashiCorp Vault.

---

# ADR-068

## Horizontal Scalability

### Status

ACCEPTED

### Context

ERP dirancang untuk bertambah.

Branch.

Employee.

Transaction.

### Decision

Backend dibuat Stateless.

Worker dapat ditambah.

Queue dapat diperbesar.

### Future

Auto Scaling.

Load Balancer.

---

# ADR-069

## Disaster Recovery

### Status

ACCEPTED

### Context

Kegagalan server tidak boleh menyebabkan kehilangan data.

### Decision

Recovery Plan mencakup.

Database.

Media.

Configuration.

Queue.

Audit.

### Future

Multi Region Deployment.

---

# ADR-070

## Infrastructure Evolution

### Status

ACCEPTED

### Context

Infrastruktur akan berkembang.

### Decision

Pemilihan teknologi harus mempertimbangkan.

Maintainability.

Reliability.

Scalability.

Business Value.

Bukan sekadar mengikuti tren teknologi.

### Future

Cloud Native Architecture.

Observability Platform.

Service Mesh (jika diperlukan).

# CHAPTER 6 — SECURITY ARCHITECTURE DECISIONS

---

# ADR-071

## Security by Default

### Status

ACCEPTED

### Context

ERP mengelola.

Customer.

Payroll.

Inventory.

Finance.

Employee.

Kesalahan keamanan dapat menyebabkan kerugian besar.

### Decision

Seluruh fitur baru harus aman secara default.

Permission harus ditolak sampai diberikan.

(Default Deny)

### Alternatives

Default Allow.

Ditolak.

### Consequences

Lebih aman.

### Future

Zero Trust Architecture.

---

# ADR-072

## Principle of Least Privilege

### Status

ACCEPTED

### Context

Sebagian besar User hanya membutuhkan sebagian kecil fitur.

### Decision

User hanya diberikan Permission minimum.

Contoh.

Stylist.

Tidak dapat melihat Payroll.

Warehouse.

Tidak dapat melihat Salary.

Reception.

Tidak dapat mengubah Inventory.

### Consequences

Risiko penyalahgunaan berkurang.

---

# ADR-073

## Branch Isolation

### Status

ACCEPTED

### Context

ERP mendukung Multi Branch.

### Decision

User hanya dapat melihat data Branch yang dimiliki.

SUPER_ADMIN menjadi pengecualian.

### Future

Multi Company Isolation.

---

# ADR-074

## Permission Validation di Backend

### Status

ACCEPTED

### Context

Frontend tidak dapat dipercaya.

### Decision

Backend selalu memvalidasi Permission.

Frontend hanya menyembunyikan menu.

### Alternatives

Permission di Frontend.

Ditolak.

---

# ADR-075

## JWT Security

### Status

ACCEPTED

### Context

JWT menjadi Authentication utama.

### Decision

JWT memiliki Expiration.

Signature Validation.

HTTPS Only.

Future Refresh Token.

### Future

Token Rotation.

---

# ADR-076

## Password Policy

### Status

ACCEPTED

### Context

Password merupakan garis pertahanan pertama.

### Decision

Password di-hash menggunakan Argon2 atau BCrypt.

Tidak pernah disimpan dalam Plain Text.

### Future

Passwordless Login.

---

# ADR-077

## Secrets Protection

### Status

ACCEPTED

### Context

Cloudinary.

Accurate.

JWT.

Database.

### Decision

Secrets hanya disimpan pada Environment atau Secret Manager.

Tidak boleh berada di Repository.

---

# ADR-078

## Audit Security

### Status

ACCEPTED

### Context

Seluruh aktivitas sensitif harus dapat ditelusuri.

### Decision

Audit wajib mencatat.

Employee.

Role.

IP (Future).

Timestamp.

Request ID.

---

# ADR-079

## Rate Limiting

### Status

ACCEPTED

### Context

API rentan terhadap Abuse.

### Decision

Endpoint Login.

Webhook.

Public API.

Menggunakan Rate Limit.

### Future

Redis Rate Limit.

---

# ADR-080

## Secure File Upload

### Status

ACCEPTED

### Context

ERP menerima Upload.

### Decision

Hanya tipe file tertentu.

Ukuran dibatasi.

File diverifikasi sebelum diproses.

### Future

Virus Scanning.

---

# ADR-081

## HTTPS Only

### Status

ACCEPTED

### Decision

Production hanya berjalan melalui HTTPS.

HTTP otomatis Redirect.

---

# ADR-082

## Security Logging

### Status

ACCEPTED

### Decision

Login.

Logout.

Permission Denied.

Token Invalid.

Semua dicatat.

---

# ADR-083

## Data Encryption

### Status

ACCEPTED

### Decision

Data sensitif dienkripsi saat transit.

Future.

Encryption at Rest.

---

# ADR-084

## Account Lockout

### Status

ACCEPTED

### Decision

Future.

Login gagal berulang.

↓

Temporary Lock.

---

# ADR-085

## Security Evolution

### Status

ACCEPTED

### Decision

Security selalu berkembang.

Review keamanan dilakukan secara berkala.

Business Rule lebih penting daripada kemudahan implementasi.

# CHAPTER 7 — PERFORMANCE ARCHITECTURE DECISIONS

---

# ADR-086

## Database Index Strategy

Semua Query utama harus menggunakan Index.

---

# ADR-087

## Pagination by Default

Endpoint List wajib menggunakan Pagination.

Tidak boleh mengembalikan seluruh data.

---

# ADR-088

## Lazy Loading

Halaman hanya memuat data yang dibutuhkan.

---

# ADR-089

## Cache Strategy

Cache hanya digunakan pada data yang aman.

Tidak untuk Payroll.

Inventory.

Payment.

---

# ADR-090

## Query Optimization

Menghindari N+1 Query.

Gunakan Include secara bijak.

---

# ADR-091

## Virtualized Table

Data besar menggunakan Virtual Scroll.

---

# ADR-092

## Background Processing

Export.

Import.

Sync.

Report.

Selalu melalui Worker.

---

# ADR-093

## Connection Pooling

Database menggunakan Connection Pool.

---

# ADR-094

## Performance Monitoring

Response Time.

Slow Query.

CPU.

Memory.

Queue.

Dipantau.

---

# ADR-095

## Performance Budget

Halaman utama.

Target.

<2 detik.

API.

Target.

<300ms.

Query.

Target.

<100ms.

# CHAPTER 8 — FUTURE ARCHITECTURE DECISIONS

---

# ADR-096

## Event Driven Ready

Business Event menjadi fondasi Integrasi.

---

# ADR-097

## Multi Company Ready

Arsitektur mendukung banyak perusahaan.

---

# ADR-098

## AI Ready

AI hanya sebagai Advisor.

Tidak boleh menjadi Decision Maker.

---

# ADR-099

## Plugin Architecture

Future.

ERP mendukung Module Plugin.

---

# ADR-100

## Long Term Evolution

Seluruh perubahan besar harus mengikuti.

Blueprint.

Business Rules.

ADR.

Tidak boleh langsung mengubah Implementasi.

