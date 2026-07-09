# CHAPTER 1 — INTRODUCTION

---

# 1.1 Purpose

Module Implementation Guide mendefinisikan langkah-langkah standar untuk membangun sebuah module pada NIAHAIR ERP.

Dokumen ini menjadi template resmi yang digunakan oleh seluruh Developer dan AI Coding Assistant agar setiap module memiliki struktur, kualitas, dan pola implementasi yang konsisten.

---

# 1.2 Objectives

Dokumen ini bertujuan untuk.

- Menstandarkan implementasi seluruh module.
- Mengurangi perbedaan gaya implementasi antar developer.
- Mempercepat pengembangan module baru.
- Mempermudah Code Review.
- Mempermudah maintenance.
- Memastikan seluruh module mengikuti Business Rules dan Architecture.

---

# 1.3 Scope

Panduan ini berlaku untuk seluruh module pada NIAHAIR ERP.

Contoh.

- Customer
- Appointment
- Treatment
- Employee
- Membership
- Inventory
- Warehouse
- Production
- Purchase
- Sales
- Payment
- Commission
- CRM
- Reporting
- Notification

Setiap module wajib mengikuti panduan ini.

---

# 1.4 Module Lifecycle

Seluruh module mengikuti siklus berikut.

```text
Requirement

↓

Business Analysis

↓

Database Design

↓

Repository

↓

Service

↓

DTO & Validation

↓

Controller

↓

Routes

↓

API Documentation

↓

Frontend

↓

Testing

↓

Documentation

↓

Review

↓

Release
```

Tidak ada tahapan yang boleh dilewati.

---

# 1.5 Source of Truth

Sebelum mengimplementasikan module.

Gunakan referensi berikut.

```text
Business Rules

↓

ERP Blueprint

↓

Data Dictionary

↓

Architecture Decisions

↓

Project Conventions

↓

Coding Standards

↓

API Standards

↓

Testing Guide
```

Implementasi harus mengacu pada dokumentasi resmi proyek.

---

# 1.6 Module Principles

Seluruh module mengikuti prinsip.

✅ Business Driven

✅ Consistent

✅ Reusable

✅ Testable

✅ Maintainable

Setiap module harus mudah dipahami dan dikembangkan.

---

# 1.7 Standard Architecture

Setiap module mengikuti Layered Architecture.

```text
Route

↓

Controller

↓

Service

↓

Repository

↓

Prisma

↓

Database
```

Business Logic hanya berada pada Service Layer.

---

# 1.8 Required Deliverables

Setiap module minimal memiliki.

☑ Database Schema (bila diperlukan)

☑ Migration (bila diperlukan)

☑ Repository

☑ Service

☑ DTO

☑ Validation

☑ Controller

☑ Routes

☑ API Documentation

☑ Frontend (jika diperlukan)

☑ Testing

☑ Documentation

---

# 1.9 Definition of Done

Module dianggap selesai apabila.

☑ Requirement terpenuhi.

☑ Business Rule dipatuhi.

☑ Database selesai.

☑ API selesai.

☑ Frontend selesai (jika ada).

☑ Testing berhasil.

☑ Dokumentasi diperbarui.

☑ Code Review selesai.

☑ Siap untuk Release.

---

# 1.10 Chapter Summary

Module Implementation Guide menjadi template resmi untuk seluruh module NIAHAIR ERP.

Prinsip utama.

✓ Seluruh module mengikuti pola yang sama.

✓ Implementasi selalu mengacu pada dokumentasi proyek.

✓ Layered Architecture digunakan secara konsisten.

✓ Testing dan Dokumentasi merupakan bagian dari implementasi.

✓ Setiap module harus memenuhi Definition of Done sebelum dirilis.

Dengan panduan ini, seluruh module NIAHAIR ERP akan memiliki struktur yang seragam, mudah dipelihara, dan siap dikembangkan oleh developer maupun AI secara konsisten.

# CHAPTER 2 — MODULE STRUCTURE

---

# 2.1 Purpose

Chapter ini mendefinisikan struktur standar yang wajib digunakan oleh seluruh module pada NIAHAIR ERP.

Setiap module harus memiliki organisasi folder, file, dan layer yang konsisten agar mudah dipahami, diuji, dipelihara, dan dikembangkan.

Tidak diperbolehkan membuat struktur module yang berbeda tanpa persetujuan Technical Lead.

---

# 2.2 Module Principles

Seluruh module mengikuti prinsip.

✅ Feature First

✅ Layered Architecture

✅ Low Coupling

✅ High Cohesion

✅ Reusable

Setiap module merupakan satu domain bisnis yang berdiri sendiri.

---

# 2.3 Standard Module Structure

Seluruh module mengikuti struktur berikut.

```text
module-name/

├── controllers/
├── services/
├── repositories/
├── dto/
├── validations/
├── routes/
├── types/
├── constants/
├── utils/
├── tests/
└── index.ts
```

Seluruh module menggunakan struktur yang sama.

---

# 2.4 Complete Module Example

Contoh module Customer.

```text
customer/

├── controllers/
│   └── customer.controller.ts
│
├── services/
│   └── customer.service.ts
│
├── repositories/
│   └── customer.repository.ts
│
├── dto/
│   ├── create-customer.dto.ts
│   ├── update-customer.dto.ts
│   └── customer-response.dto.ts
│
├── validations/
│   └── customer.validation.ts
│
├── routes/
│   └── customer.routes.ts
│
├── types/
│   └── customer.types.ts
│
├── constants/
│   └── customer.constants.ts
│
├── utils/
│   └── customer.helper.ts
│
├── tests/
│   ├── customer.service.test.ts
│   ├── customer.api.test.ts
│   └── customer.integration.test.ts
│
└── index.ts
```

---

# 2.5 Layer Responsibilities

| Layer | Responsibility |
|---------|----------------|
| Controller | HTTP Request & Response |
| Service | Business Logic |
| Repository | Database Access |
| DTO | Request & Response Object |
| Validation | Input Validation |
| Routes | API Endpoint |
| Types | Type Definition |
| Constants | Module Constants |
| Utils | Helper Function |
| Tests | Module Testing |

Setiap layer hanya memiliki satu tanggung jawab.

---

# 2.6 Controller Rules

Controller hanya bertugas.

☑ Menerima Request.

☑ Memanggil Service.

☑ Mengembalikan Response.

Controller tidak boleh berisi.

❌ Business Logic.

❌ Database Query.

❌ Perhitungan bisnis.

---

# 2.7 Service Rules

Service merupakan pusat Business Logic.

Service bertanggung jawab.

☑ Validasi Business Rule.

☑ Orkestrasi proses.

☑ Memanggil Repository.

☑ Mengelola Transaction.

Service tidak boleh mengetahui HTTP maupun UI.

---

# 2.8 Repository Rules

Repository hanya menangani akses database.

Repository bertugas.

☑ Query Database.

☑ Mapping Database.

☑ Prisma Query.

Repository tidak boleh memiliki Business Logic.

---

# 2.9 DTO Rules

Setiap Request dan Response menggunakan DTO.

Minimal.

```text
Create DTO

Update DTO

Response DTO

Filter DTO
```

DTO menjaga konsistensi komunikasi antar layer.

---

# 2.10 Validation Rules

Validation dipisahkan dari Business Logic.

Validation digunakan untuk.

☑ Required Field.

☑ Data Type.

☑ Format.

☑ Enum.

☑ UUID.

Business Rule tidak ditempatkan pada Validation.

---

# 2.11 Routes Rules

Routes hanya mendefinisikan.

☑ URL.

☑ HTTP Method.

☑ Middleware.

☑ Controller.

Routes tidak boleh memiliki Business Logic.

---

# 2.12 Types & Constants

Types digunakan untuk.

- Interface.
- Type Alias.
- Generic Type.

Constants digunakan untuk.

- Enum Mapping.
- Configuration.
- Fixed Value.

Jangan melakukan Hardcode berulang.

---

# 2.13 Utility Rules

Utility hanya digunakan untuk fungsi umum.

Contoh.

- Formatter.
- Parser.
- Converter.
- Calculator sederhana.

Business Logic tidak boleh dipindahkan ke Utility.

---

# 2.14 Module Independence

Setiap module harus independen.

Komunikasi antar module dilakukan melalui Service.

Jangan mengakses Repository module lain secara langsung.

Contoh.

```text
Customer Service

↓

Appointment Service

↓

Inventory Service
```

Bukan.

```text
Customer Repository

↓

Appointment Repository
```

---

# 2.15 Module Registration

Setiap module wajib memiliki file.

```text
index.ts
```

Digunakan untuk mengekspor seluruh resource module.

Contoh.

```ts
export * from "./controllers";
export * from "./services";
export * from "./routes";
```

---

# 2.16 Common Mistakes

❌ Business Logic di Controller.

❌ Query Database di Controller.

❌ Validation di Repository.

❌ Utility berisi Business Logic.

❌ Repository saling memanggil.

❌ Module saling bergantung secara langsung.

---

# 2.17 Best Practices

✅ Gunakan struktur standar.

✅ Pisahkan setiap layer.

✅ Gunakan DTO.

✅ Gunakan Validation.

✅ Gunakan Service sebagai pusat Business Logic.

✅ Gunakan Repository hanya untuk Database.

---

# 2.18 Module Structure Checklist

Sebelum membuat module.

☐ Folder sesuai standar.

☐ Controller dibuat.

☐ Service dibuat.

☐ Repository dibuat.

☐ DTO dibuat.

☐ Validation dibuat.

☐ Routes dibuat.

☐ Types dibuat.

☐ Tests dibuat.

☐ index.ts dibuat.

---

# 2.19 Module Dependency Diagram

```text
Client

↓

Routes

↓

Controller

↓

Service

↓

Repository

↓

Prisma

↓

Database
```

Seluruh request mengikuti alur tersebut.

---

# 2.20 Chapter Summary

Seluruh module pada NIAHAIR ERP harus menggunakan struktur yang sama agar mudah dipahami, diuji, dan dikembangkan.

Prinsip utama.

✓ Gunakan Layered Architecture.

✓ Pisahkan tanggung jawab setiap layer.

✓ Business Logic hanya berada pada Service.

✓ Database hanya diakses melalui Repository.

✓ Validation dipisahkan dari Business Logic.

✓ Seluruh module memiliki struktur folder yang identik.

Dengan struktur ini, seluruh module NIAHAIR ERP akan konsisten, scalable, mudah direview, dan dapat dikembangkan secara paralel oleh developer maupun AI tanpa menimbulkan inkonsistensi.

# CHAPTER 3 — PLANNING PHASE

---

# 3.1 Purpose

Chapter ini mendefinisikan tahapan perencanaan yang wajib dilakukan sebelum mengimplementasikan sebuah module pada NIAHAIR ERP.

Tujuan utama Planning Phase adalah memastikan kebutuhan bisnis, desain teknis, dan dampak perubahan telah dipahami sebelum penulisan kode dimulai.

Tidak diperbolehkan langsung membuat source code tanpa melalui tahap perencanaan.

---

# 3.2 Planning Principles

Seluruh module mengikuti prinsip.

✅ Business First

✅ Documentation Driven

✅ Impact Analysis

✅ Design Before Code

✅ Clear Scope

Implementasi dimulai setelah perencanaan selesai.

---

# 3.3 Planning Workflow

Seluruh module mengikuti alur berikut.

```text
Business Requirement

↓

Business Analysis

↓

Impact Analysis

↓

Module Design

↓

Database Design

↓

API Design

↓

Frontend Design

↓

Implementation Plan

↓

Development
```

---

# 3.4 Requirement Analysis

Sebelum membuat module.

Jawab pertanyaan berikut.

☐ Apa tujuan module?

☐ Masalah bisnis apa yang diselesaikan?

☐ Siapa pengguna module?

☐ Data apa yang dikelola?

☐ Proses bisnis apa yang berubah?

---

# 3.5 Business Rule Review

Pelajari seluruh Business Rule.

Periksa.

☑ Workflow.

☑ Status.

☑ Validation.

☑ Formula.

☑ Restriction.

☑ Permission.

Business Rule menjadi dasar implementasi.

---

# 3.6 Existing System Review

Sebelum membuat module baru.

Periksa apakah sudah ada.

☑ Existing Module.

☑ Existing Service.

☑ Existing Component.

☑ Existing API.

☑ Existing Database Table.

Gunakan kembali implementasi yang tersedia bila sesuai.

---

# 3.7 Impact Analysis

Identifikasi dampak terhadap sistem.

Periksa.

☑ Database.

☑ API.

☑ Frontend.

☑ Reporting.

☑ Notification.

☑ Accurate Integration.

☑ Inventory.

☑ Finance.

☑ Security.

☑ Testing.

---

# 3.8 Module Scope

Definisikan batas module.

Tuliskan.

- Fitur yang termasuk.
- Fitur yang tidak termasuk.
- Integrasi.
- Dependency.

Scope harus jelas agar implementasi tetap fokus.

---

# 3.9 Database Planning

Sebelum implementasi.

Tentukan.

☑ Table.

☑ Relation.

☑ Foreign Key.

☑ Enum.

☑ Index.

☑ Migration.

Database harus sesuai Data Dictionary.

---

# 3.10 API Planning

Rancang endpoint.

Minimal.

☑ Endpoint.

☑ HTTP Method.

☑ Request DTO.

☑ Response DTO.

☑ Authentication.

☑ Authorization.

☑ Error Response.

---

# 3.11 Frontend Planning

Definisikan.

☑ Page.

☑ Component.

☑ Form.

☑ Table.

☑ Dialog.

☑ Loading State.

☑ Error State.

☑ Empty State.

---

# 3.12 Permission Planning

Identifikasi Role yang dapat menggunakan module.

Contoh.

☑ Owner.

☑ Manager.

☑ Admin.

☑ Cashier.

☑ Stylist.

☑ Warehouse.

Permission ditentukan sebelum implementasi.

---

# 3.13 Testing Planning

Tentukan skenario pengujian.

Minimal.

☑ Unit Test.

☑ Integration Test.

☑ API Test.

☑ Frontend Test.

☑ Regression Test.

Testing dirancang sejak awal.

---

# 3.14 Documentation Planning

Periksa dokumen yang perlu diperbarui.

☑ Business Rules.

☑ ERP Blueprint.

☑ Data Dictionary.

☑ API Standards.

☑ User Manual.

☑ Changelog.

---

# 3.15 Implementation Checklist

Sebelum mulai coding.

☐ Requirement dipahami.

☐ Business Rule diperiksa.

☐ Scope jelas.

☐ Database dirancang.

☐ API dirancang.

☐ Frontend dirancang.

☐ Permission ditentukan.

☐ Testing direncanakan.

☐ Dokumentasi diidentifikasi.

---

# 3.16 Common Mistakes

❌ Langsung membuat database.

❌ Langsung membuat API.

❌ Tidak membaca Business Rule.

❌ Tidak melakukan Impact Analysis.

❌ Scope terlalu besar.

❌ Tidak merencanakan testing.

---

# 3.17 Best Practices

✅ Mulai dari kebutuhan bisnis.

✅ Buat desain sebelum coding.

✅ Lakukan Impact Analysis.

✅ Gunakan Existing Pattern.

✅ Pisahkan perencanaan dan implementasi.

---

# 3.18 Planning Deliverables

Sebelum Development dimulai.

Module minimal memiliki.

☑ Requirement.

☑ Business Flow.

☑ Database Design.

☑ API Design.

☑ Frontend Design.

☑ Permission Matrix.

☑ Testing Plan.

☑ Impact Analysis.

---

# 3.19 Planning Lifecycle

```text
Requirement

↓

Analysis

↓

Design

↓

Planning

↓

Approval

↓

Development
```

Development dimulai setelah Planning selesai.

---

# 3.20 Chapter Summary

Planning Phase merupakan langkah awal yang wajib dilakukan sebelum implementasi module pada NIAHAIR ERP.

Prinsip utama.

✓ Mulai dari Business Requirement.

✓ Pahami Business Rule.

✓ Lakukan Impact Analysis.

✓ Rancang Database, API, dan Frontend.

✓ Tentukan Permission dan Testing sejak awal.

✓ Mulai Development hanya setelah perencanaan selesai.

Dengan Planning Phase yang baik, implementasi menjadi lebih terarah, risiko perubahan berkurang, dan kualitas module tetap konsisten di seluruh proyek.

# CHAPTER 4 — DATABASE IMPLEMENTATION

---

# 4.1 Purpose

Chapter ini mendefinisikan standar implementasi database untuk seluruh module pada NIAHAIR ERP.

Seluruh perubahan database harus mengikuti Data Dictionary, Business Rules, dan Database Conventions.

Implementasi database harus mendukung integritas data, performa, serta kemudahan maintenance.

---

# 4.2 Database Workflow

Seluruh implementasi database mengikuti alur berikut.

```text
Business Requirement

↓

Business Rules

↓

Data Dictionary

↓

Prisma Schema

↓

Migration

↓

Repository

↓

Testing

↓

Documentation
```

Tidak diperbolehkan melewati tahapan di atas.

---

# 4.3 Database Preparation

Sebelum membuat schema.

Pastikan.

☑ Business Rule dipahami.

☑ Data Dictionary tersedia.

☑ Relationship telah dirancang.

☑ Existing Table diperiksa.

☑ Naming Convention dipatuhi.

---

# 4.4 Prisma Model

Setiap entity dibuat sebagai Prisma Model.

Contoh.

```prisma
model Customer {
  id          String   @id @default(uuid())
  name        String
  phoneNumber String?
  email       String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  appointments Appointment[]
}
```

Model harus sesuai dengan Data Dictionary.

---

# 4.5 Field Convention

Seluruh field mengikuti standar.

| Field | Standard |
|--------|----------|
| id | UUID |
| createdAt | DateTime |
| updatedAt | DateTime |
| deletedAt | Nullable DateTime |
| createdBy | UUID (Optional) |
| updatedBy | UUID (Optional) |

Gunakan tipe data yang sesuai dengan kebutuhan bisnis.

---

# 4.6 Relationship Implementation

Relationship harus mencerminkan Business Rule.

Contoh.

```text
Customer

↓

Appointment

↓

Treatment Session

↓

Invoice

↓

Payment
```

Gunakan Foreign Key yang jelas.

---

# 4.7 Enum Implementation

Status dan nilai tetap menggunakan Enum.

Contoh.

```prisma
enum AppointmentStatus {
  BOOKED
  CONFIRMED
  CHECK_IN
  IN_PROGRESS
  COMPLETED
  CANCELLED
  NO_SHOW
}
```

Hindari penggunaan String bebas.

---

# 4.8 Migration

Setiap perubahan schema wajib memiliki Migration.

Langkah.

```text
Update Prisma Schema

↓

Generate Migration

↓

Review Migration

↓

Run Migration

↓

Verify Database
```

Migration harus disimpan dalam Version Control.

---

# 4.9 Index Implementation

Tambahkan Index pada field yang sering digunakan.

Contoh.

☑ Foreign Key.

☑ Search Field.

☑ Filter Field.

☑ Sorting Field.

☑ Unique Field.

Index harus memiliki alasan yang jelas.

---

# 4.10 Constraint Implementation

Gunakan Constraint sesuai kebutuhan.

Contoh.

☑ Primary Key.

☑ Foreign Key.

☑ Unique.

☑ Not Null.

☑ Check Constraint (jika didukung).

Constraint membantu menjaga integritas data.

---

# 4.11 Soft Delete

Gunakan Soft Delete untuk data bisnis penting.

Contoh.

```text
deletedAt
```

Data tidak dihapus secara permanen kecuali diatur oleh Business Rule.

---

# 4.12 Seed Data

Gunakan Seed hanya untuk data referensi.

Contoh.

- Role
- Permission
- Membership
- Payment Method
- Branch
- Warehouse

Seed harus bersifat idempotent.

---

# 4.13 Transaction

Gunakan Transaction untuk proses yang melibatkan banyak perubahan data.

Contoh.

- Invoice
- Payment
- Stock Movement
- Production
- Transfer Stock

Seluruh proses harus berhasil atau dibatalkan seluruhnya.

---

# 4.14 Database Validation

Setelah implementasi.

Periksa.

☑ Relation benar.

☑ Constraint benar.

☑ Migration berhasil.

☑ Seed berhasil.

☑ Query berjalan.

☑ Tidak ada data yang rusak.

---

# 4.15 Common Mistakes

❌ Tidak membuat Migration.

❌ Mengubah database secara manual.

❌ Tidak menggunakan Foreign Key.

❌ Menggunakan Float untuk uang.

❌ Tidak membuat Index.

❌ Tidak menggunakan Transaction.

---

# 4.16 Best Practices

✅ Ikuti Data Dictionary.

✅ Gunakan UUID.

✅ Gunakan Decimal untuk uang.

✅ Gunakan Enum.

✅ Gunakan Migration.

✅ Gunakan Transaction.

✅ Tambahkan Index seperlunya.

---

# 4.17 Database Deliverables

Implementasi database dianggap selesai apabila tersedia.

☑ Prisma Model.

☑ Migration.

☑ Enum.

☑ Relation.

☑ Index.

☑ Constraint.

☑ Seed (jika diperlukan).

☑ Testing.

---

# 4.18 Database Checklist

Sebelum melanjutkan ke Repository Layer.

☐ Schema selesai.

☐ Migration berhasil.

☐ Relation diperiksa.

☐ Constraint diperiksa.

☐ Index diperiksa.

☐ Seed diperiksa.

☐ Testing berhasil.

☐ Dokumentasi diperbarui.

---

# 4.19 Database Lifecycle

```text
Business Rule

↓

Schema Design

↓

Prisma Model

↓

Migration

↓

Seed

↓

Testing

↓

Documentation
```

Seluruh perubahan database mengikuti lifecycle ini.

---

# 4.20 Chapter Summary

Implementasi database merupakan fondasi setiap module pada NIAHAIR ERP.

Prinsip utama.

✓ Ikuti Business Rules dan Data Dictionary.

✓ Gunakan Prisma sebagai ORM resmi.

✓ Selalu gunakan Migration.

✓ Terapkan Relation, Constraint, dan Index yang sesuai.

✓ Gunakan Transaction untuk operasi kritis.

✓ Validasi database sebelum melanjutkan ke Repository Layer.

Dengan standar ini, seluruh module NIAHAIR ERP akan memiliki implementasi database yang konsisten, aman, dan siap mendukung perkembangan sistem dalam jangka panjang.

# CHAPTER 5 — REPOSITORY LAYER

---

# 5.1 Purpose

Chapter ini mendefinisikan standar implementasi Repository Layer pada seluruh module NIAHAIR ERP.

Repository bertanggung jawab untuk mengakses database dan mengisolasi detail implementasi penyimpanan data dari Business Logic.

Repository tidak boleh berisi aturan bisnis.

---

# 5.2 Repository Principles

Seluruh Repository mengikuti prinsip.

✅ Single Responsibility

✅ Database Only

✅ Reusable

✅ Testable

✅ Consistent

Repository hanya menjadi jembatan antara Service dan Database.

---

# 5.3 Repository Workflow

Seluruh akses database mengikuti alur.

```text
Service

↓

Repository

↓

Prisma

↓

Database
```

Controller tidak boleh mengakses Repository secara langsung.

---

# 5.4 Repository Structure

Setiap module memiliki satu Repository utama.

Contoh.

```text
customer/

repositories/

└── customer.repository.ts
```

Repository tambahan hanya dibuat apabila memang diperlukan.

---

# 5.5 Repository Responsibilities

Repository bertugas.

☑ CRUD Database.

☑ Query.

☑ Pagination.

☑ Sorting.

☑ Filtering.

☑ Transaction Support.

☑ Mapping Database Result.

Repository tidak menentukan aturan bisnis.

---

# 5.6 Repository Must Not Do

Repository dilarang.

❌ Menghitung komisi.

❌ Mengubah status bisnis.

❌ Mengirim notifikasi.

❌ Memvalidasi Business Rule.

❌ Memanggil API eksternal.

Semua proses tersebut berada pada Service Layer.

---

# 5.7 CRUD Standard

Minimal Repository memiliki operasi.

```text
Create

Find By ID

Find Many

Update

Delete (Soft Delete bila diperlukan)
```

Gunakan nama method yang konsisten.

Contoh.

```ts
create()

findById()

findMany()

update()

delete()
```

---

# 5.8 Query Convention

Query harus.

☑ Menggunakan Prisma.

☑ Mendukung Pagination.

☑ Mendukung Filter.

☑ Mendukung Sorting.

☑ Menggunakan Include/Select seperlunya.

Query tidak boleh mengambil data yang tidak diperlukan.

---

# 5.9 Transaction Support

Repository harus mendukung Transaction apabila digunakan oleh Service.

Contoh.

```text
Invoice

↓

Payment

↓

Inventory Movement
```

Seluruh perubahan harus berhasil atau dibatalkan seluruhnya.

---

# 5.10 Error Handling

Repository hanya menangani error terkait database.

Contoh.

- Record Not Found.
- Unique Constraint.
- Foreign Key Constraint.
- Database Connection.

Business Error ditangani oleh Service.

---

# 5.11 Return Value

Repository mengembalikan data yang dibutuhkan Service.

Gunakan.

☑ Entity.

☑ Array.

☑ Null.

☑ Pagination Result.

Hindari mengembalikan struktur yang tidak konsisten.

---

# 5.12 Performance Guidelines

Repository harus.

☑ Menggunakan Select.

☑ Menggunakan Include seperlunya.

☑ Menggunakan Index.

☑ Menghindari N+1 Query.

☑ Menggunakan Batch Query bila sesuai.

Optimalkan query tanpa mengorbankan keterbacaan.

---

# 5.13 Reusability

Method Repository harus dapat digunakan oleh lebih dari satu Service apabila memiliki tujuan yang sama.

Hindari membuat method yang terlalu spesifik untuk satu kasus jika dapat digeneralisasi.

---

# 5.14 Common Repository Methods

Contoh method yang umum.

```ts
create()

findById()

findByCode()

findByEmail()

findMany()

count()

exists()

update()

softDelete()

restore()
```

Gunakan pola penamaan yang konsisten.

---

# 5.15 Common Mistakes

❌ Business Logic di Repository.

❌ Memanggil Service dari Repository.

❌ Query tanpa Pagination.

❌ Query mengambil seluruh kolom.

❌ Hardcode SQL.

❌ Duplicate Query.

---

# 5.16 Best Practices

✅ Gunakan Prisma ORM.

✅ Gunakan method yang reusable.

✅ Pisahkan Query dan Business Logic.

✅ Gunakan Transaction bila diperlukan.

✅ Optimalkan query sesuai kebutuhan.

---

# 5.17 Repository Deliverables

Repository dianggap selesai apabila memiliki.

☑ CRUD.

☑ Pagination.

☑ Filtering.

☑ Sorting.

☑ Error Handling.

☑ Transaction Support.

☑ Unit Test.

---

# 5.18 Repository Checklist

Sebelum melanjutkan ke Service Layer.

☐ CRUD selesai.

☐ Query efisien.

☐ Pagination tersedia.

☐ Transaction didukung.

☐ Tidak ada Business Logic.

☐ Unit Test berhasil.

☐ Dokumentasi diperbarui.

---

# 5.19 Repository Lifecycle

```text
Database Schema

↓

Repository Design

↓

CRUD Implementation

↓

Query Optimization

↓

Testing

↓

Service Integration
```

Repository harus selesai sebelum Service Layer dibuat.

---

# 5.20 Chapter Summary

Repository Layer menjadi satu-satunya lapisan yang berinteraksi langsung dengan database pada NIAHAIR ERP.

Prinsip utama.

✓ Repository hanya menangani akses database.

✓ Business Logic tetap berada pada Service.

✓ Gunakan Prisma sebagai ORM resmi.

✓ Dukung Pagination, Filtering, dan Sorting.

✓ Optimalkan query untuk performa.

✓ Gunakan Transaction pada operasi yang memerlukan konsistensi data.

Dengan standar ini, seluruh Repository pada NIAHAIR ERP akan konsisten, mudah diuji, mudah dipelihara, dan siap mendukung perkembangan sistem dalam jangka panjang.

# CHAPTER 6 — SERVICE LAYER

---

# 6.1 Purpose

Chapter ini mendefinisikan standar implementasi Service Layer pada seluruh module NIAHAIR ERP.

Service Layer merupakan pusat Business Logic yang mengoordinasikan seluruh proses bisnis, validasi aturan, transaksi, serta komunikasi dengan Repository maupun layanan eksternal.

---

# 6.2 Service Principles

Seluruh Service mengikuti prinsip.

✅ Business Driven

✅ Single Responsibility

✅ Reusable

✅ Testable

✅ Transaction Aware

Service bertanggung jawab terhadap aturan bisnis, bukan akses database.

---

# 6.3 Service Workflow

Seluruh request mengikuti alur.

```text
Controller

↓

Service

↓

Repository

↓

Database
```

Apabila diperlukan.

```text
Service

↓

External Integration

↓

Notification

↓

Queue
```

Service menjadi pusat orkestrasi seluruh proses.

---

# 6.4 Service Responsibilities

Service bertanggung jawab.

☑ Business Rule.

☑ Workflow.

☑ Validation Business.

☑ Transaction.

☑ Orchestration.

☑ Integration.

☑ Event Trigger.

Service menjadi "otak" dari module.

---

# 6.5 Service Must Not Do

Service dilarang.

❌ Mengakses Prisma langsung.

❌ Menghasilkan HTTP Response.

❌ Mengakses Request atau Response Express.

❌ Mengatur Routing.

❌ Menampilkan UI.

Semua itu merupakan tanggung jawab layer lain.

---

# 6.6 Business Rule Implementation

Seluruh Business Rule diimplementasikan pada Service.

Contoh.

- Customer tidak boleh memiliki dua Membership aktif.
- Appointment tidak boleh bentrok.
- Invoice tidak boleh dibayar dua kali.
- Stock tidak boleh minus.
- DP hanya dapat digunakan sesuai aturan.

Business Rule tidak boleh berada di Controller maupun Repository.

---

# 6.7 Workflow Implementation

Service bertanggung jawab mengatur alur proses.

Contoh.

```text
Create Appointment

↓

Check Customer

↓

Check Stylist

↓

Check Schedule

↓

Save Appointment

↓

Create Activity Log

↓

Send Notification
```

Workflow harus mengikuti Business Rules.

---

# 6.8 Transaction Management

Gunakan Transaction untuk proses yang melibatkan beberapa perubahan data.

Contoh.

```text
Create Invoice

↓

Create Invoice Item

↓

Reduce Inventory

↓

Create Stock Movement

↓

Create Payment
```

Seluruh proses harus berhasil atau dibatalkan seluruhnya.

---

# 6.9 Service Communication

Service dapat memanggil Service lain apabila diperlukan.

Contoh.

```text
Appointment Service

↓

Customer Service

↓

Inventory Service

↓

Notification Service
```

Hindari Circular Dependency antar Service.

---

# 6.10 External Integration

Seluruh integrasi eksternal dilakukan melalui Service.

Contoh.

- Accurate
- WhatsApp
- Email
- Cloudinary
- AI Service

Repository tidak boleh melakukan integrasi eksternal.

---

# 6.11 Event Handling

Apabila menggunakan Event.

Service bertanggung jawab memicu event.

Contoh.

```text
Invoice Paid

↓

Stock Deduction

↓

Commission Calculation

↓

Notification
```

Event harus tetap mengikuti Business Rules.

---

# 6.12 Error Handling

Service menangani Business Error.

Contoh.

- Customer tidak ditemukan.
- Membership sudah aktif.
- Stock tidak mencukupi.
- Appointment bentrok.
- Invoice sudah lunas.

Database Error tetap ditangani Repository.

---

# 6.13 Return Value

Service mengembalikan hasil yang siap digunakan Controller.

Contoh.

☑ Entity.

☑ DTO.

☑ Pagination Result.

☑ Business Result.

Gunakan format yang konsisten.

---

# 6.14 Performance Guidelines

Service harus.

☑ Meminimalkan query.

☑ Menggunakan Transaction secara efisien.

☑ Menghindari proses sinkron yang lama.

☑ Menggunakan Queue untuk pekerjaan berat.

Business Logic tetap sederhana dan mudah dipahami.

---

# 6.15 Common Service Methods

Contoh.

```text
createCustomer()

updateCustomer()

createAppointment()

calculateCommission()

processPayment()

syncAccurate()

generateInvoice()
```

Gunakan nama yang mencerminkan proses bisnis.

---

# 6.16 Common Mistakes

❌ Prisma di Service.

❌ HTTP Response di Service.

❌ Business Rule di Controller.

❌ Business Logic di Repository.

❌ Circular Dependency antar Service.

❌ Function terlalu besar.

---

# 6.17 Best Practices

✅ Business Rule berada di Service.

✅ Gunakan Repository untuk database.

✅ Gunakan Transaction.

✅ Pisahkan proses kompleks menjadi method kecil.

✅ Gunakan Event atau Queue untuk proses asynchronous.

---

# 6.18 Service Deliverables

Service dianggap selesai apabila memiliki.

☑ Business Logic.

☑ Workflow.

☑ Transaction.

☑ Integration.

☑ Error Handling.

☑ Unit Test.

☑ Documentation.

---

# 6.19 Service Checklist

Sebelum melanjutkan ke DTO & Validation.

☐ Business Rule selesai.

☐ Workflow sesuai.

☐ Transaction diperiksa.

☐ Tidak ada Prisma langsung.

☐ Tidak ada HTTP Logic.

☐ Integration selesai.

☐ Unit Test berhasil.

☐ Dokumentasi diperbarui.

---

# 6.20 Service Lifecycle

```text
Business Rules

↓

Workflow Design

↓

Service Implementation

↓

Repository Integration

↓

Transaction Review

↓

Testing

↓

Documentation
```

Service merupakan pusat implementasi Business Logic.

---

# 6.21 Chapter Summary

Service Layer merupakan inti dari setiap module pada NIAHAIR ERP.

Prinsip utama.

✓ Business Logic hanya berada pada Service.

✓ Gunakan Repository untuk akses database.

✓ Gunakan Transaction untuk proses kritis.

✓ Orkestrasi seluruh workflow pada Service.

✓ Integrasi eksternal dilakukan melalui Service.

✓ Pastikan Service mudah diuji, dipelihara, dan dikembangkan.

Dengan standar ini, seluruh Business Logic pada NIAHAIR ERP akan terpusat, konsisten, mudah dipahami, dan tetap fleksibel ketika sistem berkembang menjadi ERP berskala enterprise.

# CHAPTER 7 — DTO & VALIDATION

---

# 7.1 Purpose

Chapter ini mendefinisikan standar implementasi Data Transfer Object (DTO) dan Validation pada seluruh module NIAHAIR ERP.

DTO digunakan sebagai kontrak pertukaran data antar layer, sedangkan Validation digunakan untuk memastikan data yang diterima sesuai dengan format yang diharapkan sebelum diproses oleh Business Logic.

---

# 7.2 DTO & Validation Principles

Seluruh DTO dan Validation mengikuti prinsip.

✅ Explicit

✅ Consistent

✅ Reusable

✅ Predictable

✅ Business Independent

DTO dan Validation hanya memvalidasi struktur data, bukan aturan bisnis.

---

# 7.3 Request Flow

Seluruh Request mengikuti alur.

```text
Client

↓

Request

↓

Validation

↓

DTO

↓

Controller

↓

Service
```

Data yang tidak valid tidak boleh diteruskan ke Service.

---

# 7.4 DTO Responsibilities

DTO bertanggung jawab untuk.

☑ Mendefinisikan struktur Request.

☑ Mendefinisikan struktur Response.

☑ Mendefinisikan Filter.

☑ Mendefinisikan Pagination.

DTO bukan Entity Database.

---

# 7.5 DTO Structure

Setiap module minimal memiliki DTO berikut.

```text
dto/

├── create-*.dto.ts
├── update-*.dto.ts
├── response.dto.ts
├── filter.dto.ts
└── pagination.dto.ts
```

DTO disusun berdasarkan kebutuhan module.

---

# 7.6 Create DTO

Create DTO digunakan untuk proses pembuatan data.

Contoh.

```text
CreateCustomerDto

CreateAppointmentDto

CreateInvoiceDto
```

Field hanya berisi data yang boleh diinput pengguna.

---

# 7.7 Update DTO

Update DTO digunakan untuk perubahan data.

Field bersifat parsial sesuai kebutuhan.

Contoh.

```text
UpdateCustomerDto

UpdateEmployeeDto
```

Jangan menggunakan Create DTO untuk proses Update.

---

# 7.8 Response DTO

Response DTO digunakan untuk mengembalikan data ke Client.

Response tidak boleh langsung menggunakan Entity Database.

Response hanya berisi field yang memang boleh ditampilkan.

---

# 7.9 Filter DTO

Filter DTO digunakan pada endpoint list.

Contoh field.

```text
search

status

branchId

dateFrom

dateTo

sort

order

page

limit
```

Filter harus konsisten pada seluruh module.

---

# 7.10 Validation Responsibilities

Validation bertugas memastikan.

☑ Required Field.

☑ Data Type.

☑ UUID Format.

☑ Enum Value.

☑ Email Format.

☑ Phone Format.

☑ Minimum & Maximum Length.

Validation tidak memeriksa Business Rule.

---

# 7.11 Business Rule vs Validation

Validation.

✔ Email valid.

✔ UUID valid.

✔ Field wajib diisi.

✔ Nilai sesuai Enum.

Business Rule.

✔ Appointment tidak bentrok.

✔ Stock tidak minus.

✔ Membership masih aktif.

✔ Invoice belum lunas.

Business Rule selalu berada pada Service Layer.

---

# 7.12 Common Validation

Minimal gunakan validasi berikut.

☑ Required.

☑ Optional.

☑ String.

☑ Number.

☑ Boolean.

☑ Date.

☑ UUID.

☑ Enum.

☑ Email.

☑ Array.

---

# 7.13 Response Mapping

Gunakan Mapper untuk mengubah Entity menjadi Response DTO.

Contoh.

```text
Database Entity

↓

Mapper

↓

Response DTO

↓

API Response
```

Jangan mengembalikan Entity Database secara langsung.

---

# 7.14 Error Message

Gunakan pesan validasi yang konsisten.

Contoh.

```text
Customer name is required.

Phone number is invalid.

Appointment date is required.
```

Pesan harus mudah dipahami.

---

# 7.15 Common Mistakes

❌ Business Rule di Validation.

❌ Menggunakan Entity sebagai Response.

❌ DTO langsung menggunakan Prisma Model.

❌ Tidak memiliki Filter DTO.

❌ Tidak melakukan validasi input.

---

# 7.16 Best Practices

✅ Pisahkan DTO dan Entity.

✅ Pisahkan Validation dan Business Rule.

✅ Gunakan Response DTO.

✅ Gunakan Mapper.

✅ Gunakan pesan error yang konsisten.

---

# 7.17 DTO Deliverables

Implementasi DTO dianggap selesai apabila memiliki.

☑ Create DTO.

☑ Update DTO.

☑ Response DTO.

☑ Filter DTO.

☑ Pagination DTO.

☑ Validation.

☑ Mapper.

---

# 7.18 DTO Checklist

Sebelum melanjutkan ke Controller Layer.

☐ DTO lengkap.

☐ Validation selesai.

☐ Response DTO dibuat.

☐ Mapper dibuat.

☐ Error Message konsisten.

☐ Tidak ada Business Rule di Validation.

☐ Testing berhasil.

---

# 7.19 DTO Lifecycle

```text
Request

↓

Validation

↓

DTO

↓

Controller

↓

Service

↓

Mapper

↓

Response DTO

↓

Client
```

DTO menjadi kontrak resmi pertukaran data antar layer.

---

# 7.20 Chapter Summary

DTO dan Validation memastikan seluruh data yang masuk dan keluar dari module memiliki struktur yang konsisten.

Prinsip utama.

✓ Gunakan DTO sebagai kontrak data.

✓ Validation hanya memeriksa format dan struktur data.

✓ Business Rule tetap berada pada Service Layer.

✓ Gunakan Response DTO untuk seluruh API.

✓ Gunakan Mapper untuk memisahkan Entity dan Response.

Dengan standar ini, seluruh module NIAHAIR ERP akan memiliki kontrak data yang jelas, aman, mudah dipelihara, dan konsisten di seluruh sistem.

# CHAPTER 8 — CONTROLLER LAYER

---

# 8.1 Purpose

Chapter ini mendefinisikan standar implementasi Controller Layer pada seluruh module NIAHAIR ERP.

Controller merupakan entry point HTTP yang bertanggung jawab menerima Request, memanggil Service, dan mengembalikan Response kepada Client.

Controller tidak boleh berisi Business Logic.

---

# 8.2 Controller Principles

Seluruh Controller mengikuti prinsip.

✅ Thin Controller

✅ Single Responsibility

✅ Stateless

✅ Predictable

✅ Consistent

Controller hanya menghubungkan HTTP dengan Business Logic.

---

# 8.3 Controller Workflow

Seluruh Request mengikuti alur.

```text
Client

↓

Route

↓

Middleware

↓

Validation

↓

Controller

↓

Service

↓

Response
```

Controller tidak boleh melewati Service Layer.

---

# 8.4 Controller Responsibilities

Controller bertugas.

☑ Menerima HTTP Request.

☑ Mengambil Parameter.

☑ Mengambil Query.

☑ Mengambil Body.

☑ Memanggil Service.

☑ Mengembalikan Response.

Controller hanya mengoordinasikan alur Request dan Response.

---

# 8.5 Controller Must Not Do

Controller dilarang.

❌ Mengakses Prisma.

❌ Menulis Query Database.

❌ Mengimplementasikan Business Rule.

❌ Menghitung Formula.

❌ Mengirim Email.

❌ Mengirim WhatsApp.

❌ Memproses Integrasi Accurate.

Semua proses tersebut dilakukan pada Service Layer.

---

# 8.6 Standard CRUD Controller

Minimal Controller memiliki endpoint berikut.

```text
create()

findAll()

findById()

update()

delete()
```

Gunakan nama method yang konsisten.

---

# 8.7 Request Handling

Controller bertugas mengambil.

☑ Path Parameter.

☑ Query Parameter.

☑ Request Body.

☑ Authenticated User.

☑ Uploaded File.

Controller tidak melakukan manipulasi data yang kompleks.

---

# 8.8 Response Handling

Controller mengembalikan Response Standard.

Contoh.

```json
{
  "success": true,
  "message": "Customer created successfully.",
  "data": {}
}
```

Seluruh module menggunakan format Response yang sama.

---

# 8.9 Error Handling

Controller hanya meneruskan Error.

Contoh.

```text
Validation Error

↓

Business Error

↓

Global Error Handler

↓

Client
```

Controller tidak membuat Error Handling khusus.

---

# 8.10 Authentication & Authorization

Controller menggunakan Middleware untuk.

☑ Authentication.

☑ Authorization.

☑ Permission.

Controller tidak memvalidasi hak akses secara manual.

---

# 8.11 File Upload

Apabila menerima File Upload.

Controller hanya.

☑ Menerima File.

☑ Memvalidasi keberadaan File.

☑ Meneruskan File ke Service.

Pemrosesan file dilakukan pada Service.

---

# 8.12 Logging

Controller hanya melakukan Logging bila diperlukan.

Contoh.

- Request ID.
- Endpoint.
- Execution Time.

Jangan mencatat Password, Token, atau Secret.

---

# 8.13 Controller Naming

Gunakan nama yang konsisten.

```text
CustomerController

AppointmentController

InventoryController

InvoiceController
```

Method menggunakan camelCase.

```text
create()

findAll()

findById()

update()

delete()
```

---

# 8.14 Common Mistakes

❌ Business Logic di Controller.

❌ Query Database di Controller.

❌ Perhitungan bisnis.

❌ Response tidak konsisten.

❌ Validasi Business Rule.

❌ Controller terlalu panjang.

---

# 8.15 Best Practices

✅ Gunakan Thin Controller.

✅ Gunakan DTO.

✅ Gunakan Validation.

✅ Gunakan Service.

✅ Gunakan Global Error Handler.

✅ Gunakan Response Standard.

---

# 8.16 Controller Deliverables

Controller dianggap selesai apabila memiliki.

☑ CRUD Endpoint.

☑ DTO Integration.

☑ Validation.

☑ Authentication.

☑ Authorization.

☑ Response Standard.

☑ Testing.

---

# 8.17 Controller Checklist

Sebelum melanjutkan ke Routes.

☐ Tidak ada Business Logic.

☐ Tidak ada Query Database.

☐ Menggunakan DTO.

☐ Menggunakan Validation.

☐ Menggunakan Response Standard.

☐ Menggunakan Service.

☐ Testing berhasil.

---

# 8.18 Controller Lifecycle

```text
HTTP Request

↓

Validation

↓

Controller

↓

Service

↓

Business Result

↓

Response

↓

Client
```

Controller menjadi penghubung antara HTTP dan Business Logic.

---

# 8.19 Controller Example Flow

Contoh endpoint `POST /customers`.

```text
POST /customers

↓

Validate Request

↓

CustomerController.create()

↓

CustomerService.createCustomer()

↓

CustomerRepository.create()

↓

Database

↓

Response DTO

↓

JSON Response
```

Controller hanya mengatur alur komunikasi.

---

# 8.20 Chapter Summary

Controller Layer merupakan pintu masuk seluruh Request HTTP pada NIAHAIR ERP.

Prinsip utama.

✓ Controller harus tetap tipis.

✓ Gunakan DTO dan Validation.

✓ Seluruh Business Logic berada pada Service.

✓ Seluruh akses Database melalui Repository.

✓ Gunakan Response Standard.

✓ Gunakan Global Error Handler.

Dengan standar ini, seluruh Controller pada NIAHAIR ERP akan tetap sederhana, konsisten, mudah diuji, dan mudah dipelihara meskipun jumlah endpoint terus bertambah.

# CHAPTER 9 — ROUTES

---

# 9.1 Purpose

Chapter ini mendefinisikan standar implementasi Routes pada seluruh module NIAHAIR ERP.

Routes bertanggung jawab mendefinisikan endpoint API, menghubungkan Request dengan Controller, serta menerapkan Middleware yang diperlukan.

Routes tidak boleh mengandung Business Logic maupun akses database.

---

# 9.2 Route Principles

Seluruh Routes mengikuti prinsip.

✅ RESTful

✅ Consistent

✅ Versioned

✅ Secure

✅ Predictable

Setiap endpoint harus mudah dipahami dan mengikuti standar proyek.

---

# 9.3 Route Workflow

Seluruh Request mengikuti alur.

```text
Client

↓

Route

↓

Authentication

↓

Authorization

↓

Validation

↓

Controller

↓

Service

↓

Response
```

Route menjadi pintu masuk seluruh HTTP Request.

---

# 9.4 Route Responsibilities

Routes bertugas.

☑ Mendefinisikan URL.

☑ Menentukan HTTP Method.

☑ Menentukan Middleware.

☑ Menghubungkan ke Controller.

☑ Mengatur Versioning.

Routes tidak boleh memproses data.

---

# 9.5 Route Must Not Do

Routes dilarang.

❌ Menjalankan Query Database.

❌ Memvalidasi Business Rule.

❌ Menghitung Formula.

❌ Mengakses Prisma.

❌ Mengirim Response langsung.

Semua proses dilakukan oleh layer yang sesuai.

---

# 9.6 Route Structure

Setiap module memiliki file Route.

Contoh.

```text
customer/

routes/

└── customer.routes.ts
```

Seluruh endpoint module berada pada file tersebut.

---

# 9.7 RESTful Convention

Gunakan Resource-Based Endpoint.

Contoh.

```text
GET     /customers

GET     /customers/:id

POST    /customers

PATCH   /customers/:id

DELETE  /customers/:id
```

Hindari.

```text
/getCustomer

/updateCustomer

/deleteCustomer
```

---

# 9.8 Route Versioning

Seluruh API menggunakan Version.

Contoh.

```text
/api/v1/customers

/api/v1/appointments

/api/v1/invoices
```

Perubahan yang tidak kompatibel dilakukan melalui versi baru.

---

# 9.9 Middleware Convention

Gunakan Middleware sesuai kebutuhan.

Contoh.

☑ Authentication.

☑ Authorization.

☑ Validation.

☑ Upload.

☑ Rate Limit.

☑ Logging.

Middleware diterapkan sebelum Controller dijalankan.

---

# 9.10 Authentication

Endpoint yang memerlukan Login harus menggunakan Middleware Authentication.

Contoh.

```text
POST /customers

↓

JWT Middleware

↓

Controller
```

Endpoint publik harus ditentukan secara eksplisit.

---

# 9.11 Authorization

Role dan Permission diperiksa melalui Middleware.

Contoh.

```text
Owner

Manager

Admin

Cashier

Stylist

Warehouse
```

Controller tidak melakukan pengecekan Role secara manual.

---

# 9.12 Route Grouping

Kelompokkan Route berdasarkan module.

Contoh.

```text
customers/

appointments/

employees/

inventory/

payments/
```

Hindari mencampur endpoint dari domain yang berbeda.

---

# 9.13 Nested Resources

Gunakan Nested Route hanya bila benar-benar mencerminkan hubungan bisnis.

Contoh.

```text
GET /customers/:customerId/appointments
```

Jangan membuat nested route yang terlalu dalam.

---

# 9.14 Route Naming

Gunakan Resource, bukan Action.

Benar.

```text
/customers

/invoices

/payments
```

Salah.

```text
/createCustomer

/updateInvoice

/deletePayment
```

---

# 9.15 Common Mistakes

❌ Business Logic di Route.

❌ Endpoint tidak RESTful.

❌ Tidak menggunakan Version.

❌ Tidak menggunakan Middleware.

❌ URL tidak konsisten.

❌ Mencampur banyak module dalam satu file Route.

---

# 9.16 Best Practices

✅ Gunakan RESTful Endpoint.

✅ Gunakan Versioning.

✅ Kelompokkan berdasarkan module.

✅ Gunakan Middleware.

✅ Gunakan struktur Route yang konsisten.

---

# 9.17 Route Deliverables

Routes dianggap selesai apabila memiliki.

☑ CRUD Endpoint.

☑ Authentication.

☑ Authorization.

☑ Validation Middleware.

☑ Versioning.

☑ API Test.

---

# 9.18 Route Checklist

Sebelum melanjutkan ke API Documentation.

☐ Endpoint sesuai REST.

☐ Version tersedia.

☐ Authentication diperiksa.

☐ Authorization diperiksa.

☐ Middleware diperiksa.

☐ Route dikelompokkan dengan benar.

☐ Testing berhasil.

---

# 9.19 Route Lifecycle

```text
Endpoint Design

↓

Route Registration

↓

Middleware

↓

Controller

↓

Testing

↓

Documentation
```

Route menjadi pintu masuk resmi seluruh API.

---

# 9.20 Chapter Summary

Routes merupakan gerbang utama komunikasi antara Client dan Backend pada NIAHAIR ERP.

Prinsip utama.

✓ Gunakan RESTful Endpoint.

✓ Gunakan Versioning.

✓ Terapkan Authentication dan Authorization melalui Middleware.

✓ Kelompokkan Route berdasarkan module.

✓ Hindari Business Logic pada Route.

✓ Dokumentasikan seluruh endpoint.

Dengan standar ini, seluruh Routes pada NIAHAIR ERP akan konsisten, aman, mudah dipelihara, dan siap mendukung pertumbuhan jumlah endpoint di masa depan.

# CHAPTER 10 — API DOCUMENTATION

---

# 10.1 Purpose

Chapter ini mendefinisikan standar dokumentasi API untuk seluruh module pada NIAHAIR ERP.

Seluruh endpoint yang dibuat harus memiliki dokumentasi yang lengkap, konsisten, dan selalu sesuai dengan implementasi.

API Documentation merupakan bagian dari Definition of Done.

---

# 10.2 Documentation Principles

Seluruh dokumentasi API mengikuti prinsip.

✅ Accurate

✅ Up-to-date

✅ Easy to Understand

✅ Consistent

✅ Machine Readable

Dokumentasi harus menjadi referensi resmi seluruh integrasi sistem.

---

# 10.3 Documentation Workflow

Seluruh endpoint mengikuti alur berikut.

```text
Business Rule

↓

API Design

↓

DTO

↓

Controller

↓

Swagger Documentation

↓

API Testing

↓

Release
```

Dokumentasi dibuat bersamaan dengan implementasi.

---

# 10.4 Documentation Tool

Seluruh API menggunakan.

☑ OpenAPI 3.x

☑ Swagger

☑ JSON Specification

Swagger menjadi dokumentasi resmi seluruh endpoint.

---

# 10.5 Required Documentation

Setiap endpoint wajib memiliki.

☑ Endpoint URL

☑ HTTP Method

☑ Summary

☑ Description

☑ Authentication

☑ Permission

☑ Request DTO

☑ Response DTO

☑ Error Response

☑ Example

---

# 10.6 Endpoint Description

Setiap endpoint harus memiliki penjelasan.

Contoh.

```text
Create Customer

Membuat data customer baru.
Customer akan otomatis memiliki Membership Default apabila memenuhi syarat.
```

Deskripsi harus menjelaskan tujuan endpoint.

---

# 10.7 Request Documentation

Request harus menjelaskan.

☑ Header

☑ Path Parameter

☑ Query Parameter

☑ Request Body

☑ Validation

☑ Required Field

Seluruh field harus dijelaskan.

---

# 10.8 Response Documentation

Response minimal menjelaskan.

☑ Success Response

☑ Error Response

☑ Pagination

☑ Metadata

Gunakan Response Standard proyek.

---

# 10.9 Authentication Documentation

Seluruh endpoint harus menjelaskan.

☑ Public

atau

☑ JWT Required

atau

☑ Admin Only

Developer harus mengetahui kebutuhan autentikasi sebelum menggunakan endpoint.

---

# 10.10 Permission Documentation

Tuliskan Role yang dapat mengakses endpoint.

Contoh.

```text
Owner

Manager

Admin
```

Permission harus sesuai Business Rules.

---

# 10.11 Error Documentation

Minimal dokumentasikan.

```text
400 Validation Error

401 Unauthorized

403 Forbidden

404 Not Found

409 Conflict

422 Business Rule

500 Internal Error
```

Berikan contoh Error Response.

---

# 10.12 Example Request

Seluruh endpoint wajib memiliki contoh.

Contoh.

```json
POST /customers

{
  "name": "John Doe",
  "phoneNumber": "08123456789",
  "email": "john@example.com"
}
```

Example membantu integrasi.

---

# 10.13 Example Response

Berikan contoh Response.

```json
{
  "success": true,
  "message": "Customer created successfully.",
  "data": {
    "id": "...",
    "name": "John Doe"
  }
}
```

Gunakan Response Standard.

---

# 10.14 API Versioning

Swagger harus menampilkan.

```text
v1

v2

v3
```

Setiap perubahan besar dibuat pada versi baru.

---

# 10.15 Documentation Maintenance

Dokumentasi wajib diperbarui apabila.

☑ Endpoint berubah.

☑ DTO berubah.

☑ Response berubah.

☑ Permission berubah.

☑ Business Rule berubah.

Tidak boleh ada perbedaan antara implementasi dan dokumentasi.

---

# 10.16 Common Mistakes

❌ Swagger tidak diperbarui.

❌ Request tidak sesuai DTO.

❌ Response berbeda dengan implementasi.

❌ Tidak ada contoh.

❌ Tidak menjelaskan Authentication.

❌ Tidak mendokumentasikan Error.

---

# 10.17 Best Practices

✅ Dokumentasi dibuat bersamaan dengan coding.

✅ Gunakan contoh Request & Response.

✅ Selalu sinkron dengan DTO.

✅ Jelaskan Business Purpose endpoint.

✅ Gunakan OpenAPI Standard.

---

# 10.18 API Documentation Deliverables

Dokumentasi dianggap selesai apabila memiliki.

☑ Swagger.

☑ Request Documentation.

☑ Response Documentation.

☑ Authentication.

☑ Permission.

☑ Example.

☑ Error Documentation.

---

# 10.19 Documentation Checklist

Sebelum Release.

☐ Swagger diperbarui.

☐ Endpoint terdokumentasi.

☐ DTO sesuai.

☐ Example tersedia.

☐ Error terdokumentasi.

☐ Permission diperiksa.

☐ Testing berhasil.

---

# 10.20 API Documentation Lifecycle

```text
Business Rules

↓

API Design

↓

Implementation

↓

Swagger

↓

Testing

↓

Review

↓

Release
```

Dokumentasi berkembang bersama implementasi API.

---

# 10.21 Chapter Summary

API Documentation merupakan kontrak resmi antara Backend dan seluruh Client yang menggunakan API NIAHAIR ERP.

Prinsip utama.

✓ Dokumentasikan seluruh endpoint.

✓ Gunakan OpenAPI dan Swagger.

✓ Sertakan Request, Response, Authentication, dan Error.

✓ Selalu sinkron dengan implementasi.

✓ Perbarui dokumentasi setiap kali API berubah.

Dengan standar ini, seluruh API NIAHAIR ERP akan terdokumentasi secara lengkap, mudah dipahami, dan siap digunakan oleh Frontend, Mobile, AI, maupun sistem eksternal.

# CHAPTER 11 — FRONTEND MODULE

---

# 11.1 Purpose

Chapter ini mendefinisikan standar implementasi Frontend untuk setiap module pada NIAHAIR ERP.

Seluruh halaman, component, form, table, dialog, hook, dan integrasi API harus mengikuti pola yang konsisten agar mudah dipelihara, diuji, dan dikembangkan.

---

# 11.2 Frontend Principles

Seluruh Frontend Module mengikuti prinsip.

✅ Feature Based

✅ Component Reusable

✅ API Driven

✅ Responsive

✅ Accessible

Frontend hanya menangani Presentation Layer dan User Interaction.

---

# 11.3 Frontend Workflow

Seluruh implementasi Frontend mengikuti alur.

```text
Requirement

↓

UI Design

↓

Page

↓

Component

↓

Hook

↓

API Service

↓

Testing

↓

Documentation
```

---

# 11.4 Module Structure

Setiap module memiliki struktur berikut.

```text
customer/

├── pages/
├── components/
├── hooks/
├── services/
├── types/
├── validation/
├── constants/
├── utils/
├── tests/
└── index.ts
```

Gunakan struktur yang sama pada seluruh module.

---

# 11.5 Pages

Page bertanggung jawab.

☑ Menyusun Layout.

☑ Mengatur Navigation.

☑ Memanggil Hook.

☑ Menggabungkan Component.

Page tidak boleh berisi Business Logic.

---

# 11.6 Components

Component digunakan untuk.

☑ Form.

☑ Table.

☑ Card.

☑ Dialog.

☑ Badge.

☑ Modal.

☑ Filter.

Component harus reusable.

---

# 11.7 Hooks

Gunakan Custom Hook untuk.

☑ API Request.

☑ Form Logic.

☑ Pagination.

☑ Search.

☑ State.

Contoh.

```text
useCustomer()

useAppointment()

useInventory()
```

---

# 11.8 API Service

Seluruh komunikasi Backend dilakukan melalui Service.

Contoh.

```text
Customer Page

↓

useCustomer()

↓

customer.service.ts

↓

REST API
```

Component tidak boleh memanggil API secara langsung.

---

# 11.9 Form Implementation

Seluruh Form harus memiliki.

☑ Validation.

☑ Loading State.

☑ Error State.

☑ Success State.

☑ Reset State.

Gunakan komponen Form yang konsisten.

---

# 11.10 Table Implementation

Seluruh tabel mendukung.

☑ Pagination.

☑ Search.

☑ Filter.

☑ Sorting.

☑ Row Action.

☑ Empty State.

Gunakan komponen tabel yang sama di seluruh aplikasi.

---

# 11.11 Dialog & Modal

Gunakan Dialog untuk.

- Create.
- Edit.
- Delete Confirmation.
- Detail View.

Dialog harus memiliki.

☑ Cancel.

☑ Confirm.

☑ Loading.

☑ Error Message.

---

# 11.12 UI States

Setiap halaman minimal memiliki.

☑ Loading.

☑ Empty.

☑ Error.

☑ Success.

Tidak boleh hanya memiliki Success State.

---

# 11.13 Responsive Design

Seluruh halaman wajib mendukung.

☑ Desktop.

☑ Tablet.

☑ Mobile.

Layout tidak boleh rusak pada ukuran layar yang didukung.

---

# 11.14 Permission Handling

Frontend menyesuaikan tampilan berdasarkan Permission.

Contoh.

- Hide Button.
- Disable Action.
- Read Only View.

Validasi hak akses tetap dilakukan oleh Backend.

---

# 11.15 Common Mistakes

❌ Business Logic di Component.

❌ API langsung dari Component.

❌ Component duplikat.

❌ Tidak memiliki Loading State.

❌ Tidak Responsive.

❌ Tidak memiliki Empty State.

---

# 11.16 Best Practices

✅ Gunakan Existing Component.

✅ Gunakan Custom Hook.

✅ Gunakan API Service.

✅ Pisahkan UI dan Logic.

✅ Gunakan Design System.

---

# 11.17 Frontend Deliverables

Frontend dianggap selesai apabila memiliki.

☑ Page.

☑ Component.

☑ Hook.

☑ API Service.

☑ Validation.

☑ Responsive Layout.

☑ Testing.

☑ Documentation.

---

# 11.18 Frontend Checklist

Sebelum melanjutkan.

☐ Layout selesai.

☐ Component reusable.

☐ Hook selesai.

☐ API Service selesai.

☐ Responsive diperiksa.

☐ Loading/Error/Empty tersedia.

☐ Testing berhasil.

☐ Dokumentasi diperbarui.

---

# 11.19 Frontend Lifecycle

```text
Requirement

↓

UI Design

↓

Component

↓

Hook

↓

API Integration

↓

Testing

↓

Review

↓

Release
```

---

# 11.20 Chapter Summary

Frontend Module merupakan representasi visual dari Business Rules pada NIAHAIR ERP.

Prinsip utama.

✓ Gunakan Feature-Based Structure.

✓ Pisahkan Page, Component, Hook,

# CHAPTER 12 — STATE MANAGEMENT

---

# 12.1 Purpose

Chapter ini mendefinisikan standar pengelolaan state pada seluruh Frontend NIAHAIR ERP.

State harus dikelola secara konsisten agar mudah dipahami, dipelihara, dan tidak menyebabkan inkonsistensi data pada aplikasi.

---

# 12.2 State Management Principles

Seluruh State mengikuti prinsip.

✅ Single Source of Truth

✅ Predictable

✅ Minimal State

✅ Reactive

✅ Reusable

State hanya disimpan apabila benar-benar diperlukan.

---

# 12.3 State Categories

State dibagi menjadi beberapa kategori.

| State | Contoh |
|--------|---------|
| Local State | Dialog, Modal, Form |
| Global State | Login User, Branch Aktif |
| Server State | Customer, Invoice, Inventory |
| URL State | Search, Filter, Pagination |
| Session State | Access Token, User Session |

Setiap jenis state memiliki tempat penyimpanan yang berbeda.

---

# 12.4 State Workflow

Seluruh perubahan state mengikuti alur.

```text
User Action

↓

Hook

↓

State Update

↓

Component Re-render

↓

UI Updated
```

State tidak boleh diubah secara langsung dari luar mekanisme yang telah ditentukan.

---

# 12.5 Local State

Gunakan Local State untuk.

☑ Dialog.

☑ Modal.

☑ Selected Row.

☑ Active Tab.

☑ Form sementara.

Local State tidak digunakan untuk data yang dipakai banyak halaman.

---

# 12.6 Global State

Gunakan Global State untuk.

☑ Authenticated User.

☑ Branch Aktif.

☑ Theme.

☑ Sidebar.

☑ Permission.

☑ Notification.

Global State harus seminimal mungkin.

---

# 12.7 Server State

Data yang berasal dari Backend dianggap sebagai Server State.

Contoh.

- Customer.
- Appointment.
- Invoice.
- Inventory.
- Employee.

Server State dikelola menggunakan data hasil API, bukan disalin ke Global State tanpa alasan.

---

# 12.8 URL State

Gunakan URL untuk state yang dapat dibagikan.

Contoh.

```text
?page=2

?search=dani

?status=ACTIVE

?branch=jakarta
```

URL harus mencerminkan kondisi halaman.

---

# 12.9 Form State

Form memiliki state sendiri.

Minimal.

☑ Value.

☑ Validation Error.

☑ Dirty State.

☑ Submit State.

☑ Loading.

Form tidak boleh bergantung pada Global State.

---

# 12.10 State Naming

Gunakan nama yang jelas.

Contoh.

```text
currentUser

activeBranch

selectedCustomer

currentPage

searchKeyword
```

Hindari nama yang ambigu seperti.

```text
data

temp

value

state
```

---

# 12.11 Derived State

Derived State dihitung dari state lain.

Contoh.

```text
Total Invoice

↓

Invoice Items
```

Jangan menyimpan Derived State apabila dapat dihitung secara langsung.

---

# 12.12 State Persistence

State berikut dapat dipertahankan.

☑ Theme.

☑ Branch Aktif.

☑ Language.

☑ Login Session.

State sementara tidak perlu disimpan.

---

# 12.13 State Synchronization

Pastikan sinkronisasi antara.

☑ Frontend.

☑ Backend.

☑ URL.

☑ Cache.

☑ Global State.

Hindari duplikasi data.

---

# 12.14 Common Mistakes

❌ Menyimpan seluruh data di Global State.

❌ Duplicate State.

❌ Tidak membersihkan state.

❌ Menyimpan Server State sebagai Local State.

❌ Menyimpan Derived State.

---

# 12.15 Best Practices

✅ Gunakan Local State bila memungkinkan.

✅ Simpan Global State seminimal mungkin.

✅ Gunakan URL untuk Filter dan Pagination.

✅ Hindari duplikasi state.

✅ Gunakan Hook untuk mengelola state.

---

# 12.16 State Deliverables

State Management dianggap selesai apabila memiliki.

☑ Local State.

☑ Global State.

☑ Server State.

☑ URL State.

☑ Form State.

☑ Testing.

---

# 12.17 State Checklist

Sebelum melanjutkan.

☐ State dipilih dengan benar.

☐ Tidak ada Duplicate State.

☐ URL sinkron.

☐ Server State benar.

☐ Global State minimal.

☐ Testing berhasil.

---

# 12.18 State Lifecycle

```text
User Action

↓

State Update

↓

API (Jika Perlu)

↓

UI Update

↓

Re-render
```

State harus selalu konsisten dengan kondisi aplikasi.

---

# 12.19 State Decision Matrix

| Data | Jenis State |
|------|-------------|
| Login User | Global State |
| Branch Aktif | Global State |
| Customer List | Server State |
| Invoice Detail | Server State |
| Search Keyword | URL State |
| Current Page | URL State |
| Dialog Open | Local State |
| Form Input | Local State |
| Theme | Global State |
| Selected Row | Local State |

---

# 12.20 Chapter Summary

State Management memastikan seluruh data pada Frontend NIAHAIR ERP dikelola secara konsisten dan efisien.

Prinsip utama.

✓ Gunakan jenis state yang sesuai dengan kebutuhan.

✓ Simpan Global State seminimal mungkin.

✓ Perlakukan data API sebagai Server State.

✓ Gunakan URL untuk Search, Filter, dan Pagination.

✓ Hindari duplikasi state dan Derived State yang tidak diperlukan.

Dengan standar ini, seluruh module Frontend NIAHAIR ERP akan memiliki pengelolaan state yang konsisten, mudah dipelihara, dan siap berkembang seiring bertambahnya kompleksitas aplikasi.

# CHAPTER 13 — PERMISSIONS

---

# 13.1 Purpose

Chapter ini mendefinisikan standar implementasi Authorization dan Permission untuk seluruh module pada NIAHAIR ERP.

Permission menentukan siapa yang dapat mengakses suatu fitur, data, maupun aksi dalam sistem.

Authorization harus diterapkan secara konsisten pada Backend dan Frontend.

---

# 13.2 Permission Principles

Seluruh Permission mengikuti prinsip.

✅ Least Privilege

✅ Role Based

✅ Permission Driven

✅ Secure by Default

✅ Consistent

User hanya mendapatkan akses yang memang diperlukan.

---

# 13.3 Authorization Workflow

Seluruh Request mengikuti alur.

```text
User Login

↓

JWT Authentication

↓

Role Validation

↓

Permission Validation

↓

Controller

↓

Service

↓

Response
```

Authentication selalu dilakukan sebelum Authorization.

---

# 13.4 Role Structure

Role utama pada NIAHAIR ERP.

```text
Owner

Manager

Admin

Cashier

Stylist

Warehouse

Production

Customer
```

Role baru harus didokumentasikan.

---

# 13.5 Permission Structure

Permission menggunakan format.

```text
module.action
```

Contoh.

```text
customer.create

customer.read

customer.update

customer.delete

appointment.create

appointment.update

inventory.adjust

invoice.approve

payment.refund
```

Gunakan format yang konsisten.

---

# 13.6 CRUD Permission

Minimal setiap module memiliki.

☑ Create

☑ Read

☑ Update

☑ Delete

Contoh.

```text
customer.create

customer.read

customer.update

customer.delete
```

Permission tambahan dibuat sesuai kebutuhan bisnis.

---

# 13.7 Special Permission

Selain CRUD.

Gunakan Permission khusus.

Contoh.

```text
invoice.approve

payment.refund

inventory.adjust

commission.calculate

report.export

production.approve
```

Permission harus mencerminkan proses bisnis.

---

# 13.8 Backend Authorization

Backend merupakan sumber kebenaran utama.

Backend wajib memeriksa.

☑ Authentication.

☑ Role.

☑ Permission.

Frontend tidak boleh menjadi satu-satunya mekanisme pembatasan akses.

---

# 13.9 Frontend Authorization

Frontend digunakan untuk meningkatkan pengalaman pengguna.

Contoh.

☑ Hide Button.

☑ Disable Action.

☑ Hide Menu.

☑ Read Only Mode.

Validasi tetap dilakukan oleh Backend.

---

# 13.10 Data Ownership

Beberapa module memerlukan Ownership.

Contoh.

```text
Stylist

↓

Hanya melihat Appointment miliknya.
```

Owner dapat melihat seluruh data.

Ownership merupakan bagian dari Authorization.

---

# 13.11 Permission Matrix

Setiap module wajib memiliki Permission Matrix.

Contoh.

| Permission | Owner | Manager | Admin | Cashier |
|------------|:-----:|:-------:|:-----:|:-------:|
| Customer Read | ✓ | ✓ | ✓ | ✓ |
| Customer Create | ✓ | ✓ | ✓ | ✓ |
| Customer Delete | ✓ | ✓ | ✗ | ✗ |
| Report Export | ✓ | ✓ | ✗ | ✗ |

Permission Matrix harus diperbarui ketika Business Rule berubah.

---

# 13.12 Route Protection

Seluruh Route dilindungi menggunakan Middleware.

Contoh.

```text
POST /customers

↓

JWT

↓

Permission(customer.create)

↓

Controller
```

Route publik harus didefinisikan secara eksplisit.

---

# 13.13 UI Protection

Seluruh halaman harus memeriksa Permission.

Contoh.

```text
Delete Button

↓

Permission(customer.delete)

↓

Visible / Hidden
```

UI hanya menyesuaikan tampilan.

---

# 13.14 Common Mistakes

❌ Permission hanya diperiksa di Frontend.

❌ Hardcode Role.

❌ Tidak memiliki Permission Matrix.

❌ Semua user memiliki akses penuh.

❌ Authorization dilakukan di Controller.

---

# 13.15 Best Practices

✅ Gunakan Role dan Permission.

✅ Backend sebagai sumber kebenaran.

✅ Gunakan Middleware.

✅ Dokumentasikan Permission.

✅ Terapkan Least Privilege.

---

# 13.16 Permission Deliverables

Implementasi Permission dianggap selesai apabila memiliki.

☑ Role.

☑ Permission.

☑ Permission Matrix.

☑ Middleware.

☑ Backend Authorization.

☑ Frontend Authorization.

☑ Testing.

---

# 13.17 Permission Checklist

Sebelum melanjutkan.

☑ Permission dibuat.

☑ Middleware selesai.

☑ Backend diperiksa.

☑ Frontend diperiksa.

☑ Permission Matrix diperbarui.

☑ Testing berhasil.

☑ Dokumentasi diperbarui.

---

# 13.18 Permission Lifecycle

```text
Business Rule

↓

Role Definition

↓

Permission Definition

↓

Middleware

↓

Backend Validation

↓

Frontend Integration

↓

Testing

↓

Release
```

Permission berkembang bersama Business Rules.

---

# 13.19 Permission Template

Setiap module minimal memiliki.

```text
Role

↓

Permission

↓

Middleware

↓

Permission Matrix

↓

Testing
```

Seluruh module menggunakan pola yang sama.

---

# 13.20 Chapter Summary

Permission merupakan mekanisme utama untuk melindungi fitur dan data pada NIAHAIR ERP.

Prinsip utama.

✓ Gunakan Role dan Permission yang konsisten.

✓ Backend menjadi sumber kebenaran untuk Authorization.

✓ Frontend hanya menyesuaikan tampilan.

✓ Terapkan Least Privilege.

✓ Dokumentasikan Permission Matrix untuk setiap module.

Dengan standar ini, seluruh module NIAHAIR ERP akan memiliki sistem otorisasi yang konsisten, aman, dan mudah dikembangkan seiring bertambahnya fitur serta jumlah pengguna.

# CHAPTER 14 — TESTING

---

# 14.1 Purpose

Chapter ini mendefinisikan standar pengujian yang wajib dilakukan pada setiap module NIAHAIR ERP.

Setiap module harus melalui proses testing untuk memastikan Business Rule, API, Database, Frontend, dan integrasi berjalan sesuai dengan kebutuhan bisnis.

Testing merupakan bagian dari Definition of Done.

---

# 14.2 Testing Principles

Seluruh Module Testing mengikuti prinsip.

✅ Business Rule Driven

✅ Automated First

✅ Repeatable

✅ Independent

✅ Reliable

Testing harus memverifikasi perilaku sistem, bukan implementasi internal.

---

# 14.3 Testing Workflow

Seluruh module mengikuti alur berikut.

```text
Implementation

↓

Unit Test

↓

Integration Test

↓

API Test

↓

Frontend Test

↓

Regression Test

↓

Code Review

↓

Release
```

Module tidak boleh dirilis sebelum seluruh testing selesai.

---

# 14.4 Unit Testing

Unit Test digunakan untuk menguji Business Logic.

Minimal mencakup.

☑ Service.

☑ Utility.

☑ Helper.

☑ Mapper.

Repository tidak diuji menggunakan Unit Test apabila memerlukan database nyata.

---

# 14.5 Integration Testing

Integration Test digunakan untuk memastikan komunikasi antar layer berjalan dengan benar.

Contoh.

☑ Service ↔ Repository.

☑ Repository ↔ Database.

☑ Transaction.

☑ External Service (Mock).

---

# 14.6 API Testing

Seluruh endpoint wajib diuji.

Minimal.

☑ Success.

☑ Validation Error.

☑ Unauthorized.

☑ Forbidden.

☑ Not Found.

☑ Business Rule Error.

☑ Internal Error.

---

# 14.7 Frontend Testing

Frontend minimal menguji.

☑ Page Rendering.

☑ Form Validation.

☑ User Interaction.

☑ Loading State.

☑ Empty State.

☑ Error State.

☑ Permission Rendering.

---

# 14.8 Business Rule Testing

Seluruh Business Rule wajib memiliki skenario testing.

Contoh.

- Appointment tidak boleh bentrok.
- Stock tidak boleh minus.
- Membership hanya satu yang aktif.
- Invoice tidak boleh dibayar dua kali.
- Commission dihitung sesuai aturan.

Business Rule adalah prioritas utama dalam pengujian.

---

# 14.9 Regression Testing

Setiap bug yang diperbaiki wajib memiliki Regression Test.

Tujuannya.

☑ Mencegah bug muncul kembali.

☑ Menjaga stabilitas sistem.

Bug dianggap selesai setelah Regression Test ditambahkan.

---

# 14.10 Test Data

Gunakan.

☑ Factory.

☑ Fixture.

☑ Seeder.

☑ Mock Data.

Hindari penggunaan data Production.

---

# 14.11 External Integration Testing

Seluruh integrasi eksternal diuji menggunakan Mock.

Contoh.

☑ Accurate.

☑ Cloudinary.

☑ WhatsApp.

☑ Email.

☑ AI Service.

Testing tidak bergantung pada layanan eksternal yang sebenarnya.

---

# 14.12 Performance Testing

Periksa.

☑ Query.

☑ Pagination.

☑ API Response Time.

☑ Memory Usage.

☑ Background Job.

Pastikan module tetap bekerja dengan baik pada volume data yang besar.

---

# 14.13 Security Testing

Minimal periksa.

☑ Authentication.

☑ Authorization.

☑ Input Validation.

☑ File Upload.

☑ Permission.

☑ SQL Injection Protection.

☑ XSS Protection.

---

# 14.14 Module Acceptance Testing

Sebelum module dinyatakan selesai.

Pastikan.

☑ Seluruh Requirement terpenuhi.

☑ Business Rule sesuai.

☑ API berjalan.

☑ Frontend berjalan.

☑ Permission benar.

☑ Dokumentasi diperbarui.

☑ Tidak ada Critical Bug.

---

# 14.15 Common Mistakes

❌ Tidak menguji Business Rule.

❌ Hanya menguji Success Case.

❌ Tidak membuat Regression Test.

❌ Menggunakan Data Production.

❌ Tidak menguji Permission.

❌ Tidak menguji Error Response.

---

# 14.16 Best Practices

✅ Uji seluruh Business Rule.

✅ Tambahkan Regression Test.

✅ Gunakan Factory dan Fixture.

✅ Mock External Service.

✅ Jalankan seluruh testing sebelum Merge.

---

# 14.17 Module Testing Deliverables

Module dianggap selesai apabila memiliki.

☑ Unit Test.

☑ Integration Test.

☑ API Test.

☑ Frontend Test.

☑ Business Rule Test.

☑ Regression Test.

☑ Documentation.

---

# 14.18 Module Testing Checklist

Sebelum Release.

☑ Unit Test lulus.

☑ Integration Test lulus.

☑ API Test lulus.

☑ Frontend Test lulus.

☑ Business Rule Test lulus.

☑ Regression Test ditambahkan.

☑ Performance diperiksa.

☑ Security diperiksa.

☑ Dokumentasi diperbarui.

---

# 14.19 Testing Matrix

| Area | Required |
|-------|----------|
| Service | Unit Test |
| Repository | Integration Test |
| API | API Test |
| Frontend | Component Test |
| Business Rule | Scenario Test |
| Permission | Authorization Test |
| External API | Mock Test |
| Bug Fix | Regression Test |

---

# 14.20 Chapter Summary

Testing merupakan tahapan wajib sebelum sebuah module pada NIAHAIR ERP dinyatakan selesai.

Prinsip utama.

✓ Uji Business Rule terlebih dahulu.

✓ Lakukan Unit, Integration, API, dan Frontend Test.

✓ Tambahkan Regression Test untuk setiap bug.

✓ Mock seluruh layanan eksternal.

✓ Pastikan Performance dan Security telah diperiksa.

Dengan standar ini, setiap module yang dikembangkan akan memiliki kualitas yang konsisten, risiko regresi yang rendah, dan siap digunakan pada lingkungan production.

# CHAPTER 15 — DOCUMENTATION

---

# 15.1 Purpose

Chapter ini mendefinisikan standar dokumentasi yang wajib dipenuhi oleh setiap module pada NIAHAIR ERP.

Setiap perubahan pada module harus diikuti dengan pembaruan dokumentasi yang relevan agar implementasi, Business Rules, dan dokumentasi selalu selaras.

Dokumentasi merupakan bagian dari Definition of Done.

---

# 15.2 Documentation Principles

Seluruh dokumentasi mengikuti prinsip.

✅ Accurate

✅ Up-to-date

✅ Consistent

✅ Easy to Understand

✅ Single Source of Truth

Dokumentasi harus selalu mencerminkan implementasi terbaru.

---

# 15.3 Documentation Workflow

Seluruh module mengikuti alur berikut.

```text
Requirement

↓

Implementation

↓

Testing

↓

Documentation Update

↓

Review

↓

Release
```

Dokumentasi diperbarui sebelum module dirilis.

---

# 15.4 Required Documentation

Setiap module minimal harus memiliki pembaruan pada dokumen berikut (jika terdampak).

☑ Business Rules

☑ ERP Blueprint

☑ Data Dictionary

☑ API Standards

☑ Swagger / OpenAPI

☑ Module Guide

☑ User Manual

☑ Knowledge Base

☑ Changelog

☑ Release Notes

---

# 15.5 Business Documentation

Perbarui Business Rules apabila terjadi.

☑ Perubahan Workflow.

☑ Penambahan Status.

☑ Perubahan Formula.

☑ Perubahan Permission.

☑ Perubahan Proses Bisnis.

Business Rules menjadi acuan utama implementasi.

---

# 15.6 Technical Documentation

Perbarui dokumentasi teknis apabila terjadi perubahan pada.

☑ Database.

☑ API.

☑ DTO.

☑ Validation.

☑ Integration.

☑ Architecture.

---

# 15.7 API Documentation

Swagger/OpenAPI wajib diperbarui apabila.

☑ Endpoint baru dibuat.

☑ Request berubah.

☑ Response berubah.

☑ Authentication berubah.

☑ Permission berubah.

Dokumentasi API harus selalu sinkron dengan implementasi.

---

# 15.8 Database Documentation

Apabila schema berubah.

Perbarui.

☑ Data Dictionary.

☑ ERD.

☑ Migration.

☑ Relasi.

☑ Constraint.

---

# 15.9 Frontend Documentation

Apabila UI berubah.

Perbarui.

☑ Screenshot (jika diperlukan).

☑ User Guide.

☑ Form Documentation.

☑ Navigation.

☑ Feature Description.

---

# 15.10 Integration Documentation

Apabila terdapat integrasi baru.

Dokumentasikan.

☑ Provider.

☑ Authentication.

☑ Endpoint.

☑ Retry Policy.

☑ Timeout.

☑ Error Handling.

---

# 15.11 User Documentation

Pastikan pengguna memahami fitur baru.

Perbarui.

☑ Operations Manual.

☑ FAQ.

☑ Knowledge Base.

☑ Tutorial.

---

# 15.12 Changelog

Seluruh perubahan module harus dicatat.

Minimal.

☑ Feature Baru.

☑ Bug Fix.

☑ Improvement.

☑ Breaking Change.

Gunakan format yang konsisten.

---

# 15.13 Release Notes

Apabila perubahan memengaruhi pengguna.

Tambahkan.

☑ Ringkasan.

☑ Fitur Baru.

☑ Perbaikan.

☑ Catatan Upgrade.

Release Notes ditujukan untuk pengguna dan stakeholder.

---

# 15.14 Documentation Review

Sebelum Release.

Pastikan.

☑ Tidak ada informasi usang.

☑ Contoh masih valid.

☑ Diagram sesuai.

☑ API sesuai implementasi.

☑ Business Rule sesuai.

---

# 15.15 Common Mistakes

❌ Tidak memperbarui dokumentasi.

❌ Swagger tidak sinkron.

❌ Business Rules berbeda dengan implementasi.

❌ Changelog tidak diperbarui.

❌ Diagram tidak sesuai.

---

# 15.16 Best Practices

✅ Dokumentasi diperbarui bersamaan dengan coding.

✅ Gunakan istilah yang konsisten.

✅ Sertakan contoh.

✅ Gunakan diagram bila diperlukan.

✅ Review dokumentasi sebelum Merge.

---

# 15.17 Documentation Deliverables

Module dianggap terdokumentasi apabila memiliki.

☑ Business Documentation.

☑ Technical Documentation.

☑ API Documentation.

☑ User Documentation.

☑ Changelog.

☑ Release Notes.

---

# 15.18 Documentation Checklist

Sebelum Release.

☑ Business Rules diperbarui.

☑ API Documentation diperbarui.

☑ Data Dictionary diperbarui.

☑ User Guide diperbarui.

☑ Changelog diperbarui.

☑ Release Notes diperbarui.

☑ Review selesai.

---

# 15.19 Documentation Matrix

| Area | Document |
|------|----------|
| Business | Business Rules |
| Database | Data Dictionary |
| API | Swagger / OpenAPI |
| Frontend | User Guide |
| Integration | Integration Documentation |
| Changes | Changelog |
| Release | Release Notes |

---

# 15.20 Chapter Summary

Dokumentasi merupakan bagian yang tidak terpisahkan dari implementasi module pada NIAHAIR ERP.

Prinsip utama.

✓ Dokumentasi selalu mengikuti implementasi.

✓ Perbarui seluruh dokumen yang terdampak.

✓ Gunakan Swagger sebagai dokumentasi resmi API.

✓ Catat seluruh perubahan pada Changelog.

✓ Siapkan Release Notes untuk setiap perubahan yang memengaruhi pengguna.

Dengan standar ini, setiap module NIAHAIR ERP akan memiliki dokumentasi yang lengkap, konsisten, dan selalu selaras dengan implementasi sehingga memudahkan pengembangan, pemeliharaan, dan onboarding anggota tim baru.

# CHAPTER 16 — INTEGRATION

---

# 16.1 Purpose

Chapter ini mendefinisikan standar implementasi integrasi antar module maupun dengan layanan eksternal pada NIAHAIR ERP.

Seluruh integrasi harus konsisten, aman, terdokumentasi, dan mudah dipelihara.

Integrasi tidak boleh mengubah Business Rule yang telah ditetapkan.

---

# 16.2 Integration Principles

Seluruh integrasi mengikuti prinsip.

✅ Decoupled

✅ Reliable

✅ Secure

✅ Observable

✅ Retryable

Integrasi harus dirancang agar kegagalan satu layanan tidak menyebabkan seluruh sistem berhenti.

---

# 16.3 Integration Workflow

Seluruh integrasi mengikuti alur.

```text
Business Rule

↓

Service

↓

Integration Layer

↓

External Service

↓

Response

↓

Business Result
```

Seluruh komunikasi eksternal dilakukan melalui Service Layer.

---

# 16.4 Supported Integrations

Module dapat berintegrasi dengan.

☑ Accurate Online

☑ Cloudinary

☑ Email

☑ WhatsApp

☑ AI Service

☑ Payment Gateway

☑ Telegram

☑ n8n

☑ Internal Module

Seluruh integrasi harus menggunakan pola yang sama.

---

# 16.5 Integration Layer

Seluruh komunikasi eksternal ditempatkan pada Integration Layer.

Contoh.

```text
integrations/

├── accurate/
├── cloudinary/
├── whatsapp/
├── email/
├── ai/
└── payment/
```

Business Logic tidak boleh berada pada Integration Layer.

---

# 16.6 Internal Integration

Komunikasi antar module dilakukan melalui Service.

Contoh.

```text
Appointment Service

↓

Customer Service

↓

Inventory Service

↓

Commission Service
```

Repository tidak boleh dipanggil langsung oleh module lain.

---

# 16.7 External Integration

Integrasi eksternal dilakukan melalui Adapter atau Client.

Contoh.

```text
Accurate Client

Cloudinary Client

WhatsApp Client

Email Client
```

Seluruh konfigurasi dipusatkan pada Integration Layer.

---

# 16.8 Timeout

Setiap integrasi wajib memiliki Timeout.

Contoh.

```text
API Request

↓

Timeout

↓

Retry / Fail
```

Request tidak boleh berjalan tanpa batas waktu.

---

# 16.9 Retry Policy

Retry hanya digunakan untuk kegagalan sementara.

Contoh.

☑ Network Timeout.

☑ Temporary Service Unavailable.

Retry tidak dilakukan untuk Validation Error atau Business Error.

---

# 16.10 Error Handling

Seluruh Error integrasi harus ditangani.

Contoh.

☑ Timeout.

☑ Authentication Failed.

☑ Rate Limit.

☑ Server Error.

☑ Connection Error.

Error eksternal tidak boleh langsung diteruskan ke pengguna.

---

# 16.11 Logging

Setiap integrasi wajib mencatat.

☑ Request ID.

☑ Service.

☑ Execution Time.

☑ Status.

Jangan mencatat.

❌ Password.

❌ Token.

❌ Secret.

❌ API Key.

---

# 16.12 Configuration

Seluruh konfigurasi disimpan pada Environment Variable.

Contoh.

```text
ACCURATE_API_URL

ACCURATE_TOKEN

CLOUDINARY_URL

SMTP_HOST

WHATSAPP_API_KEY
```

Konfigurasi tidak boleh di-hardcode.

---

# 16.13 Integration Testing

Seluruh integrasi wajib diuji.

Minimal.

☑ Success.

☑ Timeout.

☑ Authentication.

☑ Error Response.

☑ Retry.

☑ Mock Integration.

Testing tidak bergantung pada Production Service.

---

# 16.14 Common Mistakes

❌ Memanggil API eksternal dari Controller.

❌ Hardcode API Key.

❌ Tidak menggunakan Timeout.

❌ Tidak memiliki Retry.

❌ Tidak mencatat Error.

❌ Tidak menggunakan Mock saat Testing.

---

# 16.15 Best Practices

✅ Gunakan Integration Layer.

✅ Gunakan Adapter atau Client.

✅ Gunakan Timeout.

✅ Gunakan Retry bila diperlukan.

✅ Gunakan Environment Variable.

✅ Mock seluruh layanan eksternal saat Testing.

---

# 16.16 Integration Deliverables

Integrasi dianggap selesai apabila memiliki.

☑ Client / Adapter.

☑ Configuration.

☑ Timeout.

☑ Retry.

☑ Error Handling.

☑ Logging.

☑ Testing.

☑ Documentation.

---

# 16.17 Integration Checklist

Sebelum Release.

☑ Client dibuat.

☑ Configuration selesai.

☑ Timeout diterapkan.

☑ Retry diperiksa.

☑ Error Handling selesai.

☑ Logging diperiksa.

☑ Testing berhasil.

☑ Dokumentasi diperbarui.

---

# 16.18 Integration Lifecycle

```text
Requirement

↓

Integration Design

↓

Client Development

↓

Testing

↓

Documentation

↓

Release

↓

Monitoring
```

Seluruh integrasi mengikuti lifecycle ini.

---

# 16.19 Integration Matrix

| Integration | Required |
|------------|----------|
| Accurate | ✓ |
| Cloudinary | ✓ |
| Email | ✓ |
| WhatsApp | ✓ |
| AI Service | ✓ |
| Payment Gateway | Optional |
| Telegram | Optional |
| Internal Service | ✓ |

---

# 16.20 Chapter Summary

Integrasi memungkinkan NIAHAIR ERP berkomunikasi dengan module lain maupun layanan eksternal secara aman dan konsisten.

Prinsip utama.

✓ Gunakan Integration Layer.

✓ Gunakan Adapter atau Client.

✓ Terapkan Timeout dan Retry.

✓ Simpan konfigurasi pada Environment Variable.

✓ Gunakan Mock saat Testing.

✓ Dokumentasikan seluruh integrasi.

Dengan standar ini, seluruh integrasi pada NIAHAIR ERP akan lebih mudah dipelihara, aman, dan tahan terhadap kegagalan layanan eksternal.

# CHAPTER 17 — PERFORMANCE

---

# 17.1 Purpose

Chapter ini mendefinisikan standar optimasi performa yang wajib diterapkan pada setiap module NIAHAIR ERP.

Setiap module harus dirancang agar tetap responsif, efisien, dan mampu menangani pertumbuhan data tanpa memerlukan perubahan arsitektur yang besar.

Performance merupakan bagian dari kualitas implementasi.

---

# 17.2 Performance Principles

Seluruh module mengikuti prinsip.

✅ Efficient

✅ Scalable

✅ Measurable

✅ Resource Aware

✅ Performance by Design

Optimasi dilakukan berdasarkan hasil pengukuran, bukan asumsi.

---

# 17.3 Performance Workflow

Seluruh module mengikuti alur.

```text
Implementation

↓

Performance Review

↓

Optimization

↓

Testing

↓

Monitoring

↓

Release
```

Performa dievaluasi sebelum module dirilis.

---

# 17.4 Database Performance

Pastikan.

☑ Query menggunakan Index.

☑ Tidak ada Full Table Scan.

☑ Tidak ada N+1 Query.

☑ Pagination diterapkan.

☑ Select hanya field yang diperlukan.

Repository bertanggung jawab terhadap efisiensi query.

---

# 17.5 API Performance

Setiap endpoint harus.

☑ Mendukung Pagination.

☑ Mendukung Filter.

☑ Mendukung Sorting.

☑ Mengembalikan Response sekecil mungkin.

☑ Menghindari Query berulang.

API harus tetap cepat meskipun data bertambah.

---

# 17.6 Frontend Performance

Frontend harus.

☑ Lazy Loading.

☑ Code Splitting.

☑ Dynamic Import.

☑ Memoization bila diperlukan.

☑ Virtual List untuk data besar.

Render yang tidak diperlukan harus dihindari.

---

# 17.7 State Performance

Pastikan.

☑ Tidak ada Duplicate State.

☑ Tidak ada Re-render berlebihan.

☑ State tetap minimal.

☑ Derived State tidak disimpan.

State harus efisien.

---

# 17.8 Background Processing

Proses berat dijalankan di Background.

Contoh.

☑ Sinkronisasi Accurate.

☑ Generate Report.

☑ Import Data.

☑ Export Data.

☑ Kirim Email.

☑ Kirim WhatsApp.

Request pengguna tidak boleh menunggu proses yang lama.

---

# 17.9 Cache Strategy

Gunakan Cache untuk.

☑ Master Data.

☑ Configuration.

☑ Lookup Data.

☑ Frequently Accessed Data.

Cache harus memiliki mekanisme invalidasi yang jelas.

---

# 17.10 File Processing

File besar diproses menggunakan.

☑ Streaming.

☑ Batch Processing.

☑ Background Job.

Jangan memuat seluruh file ke dalam memori sekaligus.

---

# 17.11 External Integration Performance

Seluruh integrasi harus memiliki.

☑ Timeout.

☑ Retry.

☑ Circuit Breaker (jika diterapkan).

☑ Error Recovery.

Layanan eksternal tidak boleh menjadi bottleneck sistem.

---

# 17.12 Performance Metrics

Minimal ukur.

☑ API Response Time.

☑ Database Query Time.

☑ Memory Usage.

☑ CPU Usage.

☑ Queue Length.

☑ Error Rate.

Seluruh metrik harus dapat dimonitor.

---

# 17.13 Performance Budget

Target awal proyek.

| Metric | Target |
|---------|---------|
| API Response | < 300 ms |
| Complex API | < 1 s |
| Database Query | < 100 ms |
| Initial Page Load | < 2 s |
| Pagination | 20–50 item |
| Error Rate | < 1% |

Target dapat disesuaikan berdasarkan kebutuhan bisnis.

---

# 17.14 Common Mistakes

❌ Mengambil seluruh data.

❌ Tidak menggunakan Pagination.

❌ Query berulang.

❌ Tidak menggunakan Index.

❌ Render ulang berlebihan.

❌ Tidak menggunakan Background Job.

---

# 17.15 Best Practices

✅ Gunakan Pagination.

✅ Optimalkan Query.

✅ Gunakan Lazy Loading.

✅ Gunakan Cache.

✅ Gunakan Queue untuk pekerjaan berat.

✅ Monitor performa secara berkala.

---

# 17.16 Performance Deliverables

Module dianggap memenuhi standar performa apabila memiliki.

☑ Optimized Query.

☑ Pagination.

☑ Cache Strategy.

☑ Background Processing.

☑ Performance Test.

☑ Monitoring.

---

# 17.17 Performance Checklist

Sebelum Release.

☑ Query diperiksa.

☑ Index diperiksa.

☑ Pagination tersedia.

☑ Cache diperiksa.

☑ Timeout diperiksa.

☑ Monitoring aktif.

☑ Performance Test berhasil.

---

# 17.18 Performance Lifecycle

```text
Design

↓

Implementation

↓

Performance Review

↓

Optimization

↓

Testing

↓

Monitoring

↓

Continuous Improvement
```

Optimasi dilakukan secara berkelanjutan.

---

# 17.19 Performance Matrix

| Area | Standard |
|------|----------|
| Database | Indexed Query |
| API | Pagination |
| Frontend | Lazy Loading |
| State | Minimal |
| Background Job | Queue |
| Cache | Master Data |
| Monitoring | Required |

---

# 17.20 Chapter Summary

Performance merupakan bagian penting dari implementasi setiap module pada NIAHAIR ERP.

Prinsip utama.

✓ Optimalkan Database dan API.

✓ Gunakan Pagination dan Index.

✓ Gunakan Lazy Loading pada Frontend.

✓ Jalankan proses berat secara asynchronous.

✓ Pantau performa menggunakan metrik yang jelas.

Dengan standar ini, setiap module akan tetap responsif, efisien, dan mampu berkembang seiring meningkatnya jumlah pengguna serta volume data tanpa mengorbankan kualitas sistem.

# CHAPTER 18 — SECURITY

---

# 18.1 Purpose

Chapter ini mendefinisikan standar keamanan yang wajib diterapkan pada setiap module NIAHAIR ERP.

Setiap module harus dirancang dan diimplementasikan dengan mempertimbangkan Authentication, Authorization, Data Protection, Input Validation, serta keamanan integrasi.

Security merupakan bagian dari Definition of Done.

---

# 18.2 Security Principles

Seluruh module mengikuti prinsip.

✅ Security by Design

✅ Least Privilege

✅ Defense in Depth

✅ Zero Trust

✅ Secure by Default

Keamanan harus dipertimbangkan sejak tahap desain.

---

# 18.3 Security Workflow

Seluruh module mengikuti alur.

```text
Requirement

↓

Security Review

↓

Implementation

↓

Security Testing

↓

Code Review

↓

Release
```

Security diperiksa sebelum module dirilis.

---

# 18.4 Authentication

Pastikan.

☑ Endpoint Private menggunakan JWT.

☑ Token divalidasi.

☑ Session dikelola dengan benar.

☑ Endpoint Public ditentukan secara eksplisit.

Authentication dilakukan melalui Middleware.

---

# 18.5 Authorization

Pastikan.

☑ Role diperiksa.

☑ Permission diperiksa.

☑ Ownership diperiksa (bila diperlukan).

☑ Backend melakukan validasi.

Frontend hanya membantu menyembunyikan fitur.

---

# 18.6 Input Validation

Seluruh input wajib divalidasi.

Minimal.

☑ Required.

☑ Type.

☑ UUID.

☑ Enum.

☑ Email.

☑ Phone.

☑ Length.

☑ Range.

Validation dilakukan sebelum Business Logic.

---

# 18.7 Data Protection

Data sensitif harus dilindungi.

Contoh.

☑ Password.

☑ Access Token.

☑ Refresh Token.

☑ API Key.

☑ Secret.

☑ Session.

Data sensitif tidak boleh dikirim ke Client tanpa alasan.

---

# 18.8 File Upload Security

Seluruh File Upload harus.

☑ Memvalidasi MIME Type.

☑ Memvalidasi ukuran file.

☑ Menggunakan nama file yang aman.

☑ Menolak file yang tidak diizinkan.

☑ Memeriksa hak akses pengguna.

---

# 18.9 Database Security

Pastikan.

☑ Menggunakan Prisma ORM.

☑ Tidak menggunakan Raw SQL tanpa alasan.

☑ Menggunakan Transaction.

☑ Menggunakan Foreign Key.

☑ Menggunakan Constraint.

Seluruh Query harus aman dari SQL Injection.

---

# 18.10 API Security

Seluruh endpoint harus.

☑ HTTPS.

☑ Authentication.

☑ Authorization.

☑ Validation.

☑ Rate Limiting.

☑ Response Standard.

API tidak boleh mengekspos informasi internal.

---

# 18.11 External Integration Security

Seluruh integrasi harus.

☑ Menggunakan HTTPS.

☑ Menyimpan Secret pada Environment Variable.

☑ Memiliki Timeout.

☑ Memiliki Retry.

☑ Memiliki Error Handling.

Secret tidak boleh ditulis di source code.

---

# 18.12 Logging Security

Log hanya mencatat informasi yang diperlukan.

Jangan mencatat.

❌ Password.

❌ Token.

❌ Secret.

❌ API Key.

❌ Informasi sensitif pelanggan.

Gunakan Log untuk audit dan troubleshooting.

---

# 18.13 Security Testing

Minimal lakukan pengujian.

☑ Authentication.

☑ Authorization.

☑ Input Validation.

☑ Permission.

☑ File Upload.

☑ SQL Injection.

☑ XSS.

☑ CSRF (jika menggunakan cookie/session).

---

# 18.14 Common Vulnerabilities

Periksa terhadap.

☑ SQL Injection.

☑ Cross Site Scripting (XSS).

☑ Broken Access Control.

☑ Sensitive Data Exposure.

☑ Insecure Direct Object Reference (IDOR).

☑ Security Misconfiguration.

Gunakan OWASP Top 10 sebagai acuan.

---

# 18.15 Common Mistakes

❌ Hardcode Secret.

❌ Tidak melakukan Authorization.

❌ Tidak memvalidasi input.

❌ Mengembalikan Error Internal.

❌ Logging Password.

❌ File Upload tanpa validasi.

---

# 18.16 Best Practices

✅ Gunakan JWT.

✅ Gunakan Middleware.

✅ Validasi seluruh input.

✅ Gunakan Environment Variable.

✅ Gunakan HTTPS.

✅ Gunakan Role & Permission.

---

# 18.17 Security Deliverables

Module dianggap aman apabila memiliki.

☑ Authentication.

☑ Authorization.

☑ Validation.

☑ Secure Upload.

☑ Secure Integration.

☑ Security Testing.

☑ Documentation.

---

# 18.18 Security Checklist

Sebelum Release.

☑ JWT diperiksa.

☑ Permission diperiksa.

☑ Validation selesai.

☑ Secret aman.

☑ Upload aman.

☑ HTTPS digunakan.

☑ Security Test berhasil.

☑ Dokumentasi diperbarui.

---

# 18.19 Security Matrix

| Area | Standard |
|------|----------|
| Authentication | JWT |
| Authorization | Role + Permission |
| Validation | Required |
| Upload | Secure Validation |
| Database | Prisma ORM |
| API | HTTPS |
| Secret | Environment Variable |
| Testing | Security Test |

---

# 18.20 Chapter Summary

Security merupakan tanggung jawab setiap module pada NIAHAIR ERP.

Prinsip utama.

✓ Terapkan Authentication dan Authorization secara konsisten.

✓ Validasi seluruh input.

✓ Lindungi data sensitif.

✓ Gunakan komunikasi yang aman.

✓ Lakukan Security Testing sebelum Release.

✓ Jangan pernah mengekspos Secret atau informasi internal.

Dengan standar ini, setiap module NIAHAIR ERP akan memenuhi persyaratan keamanan dasar, lebih tahan terhadap serangan umum, dan siap digunakan pada lingkungan production.

# CHAPTER 19 — REVIEW CHECKLIST

---

# 19.1 Purpose

Chapter ini mendefinisikan proses review akhir yang wajib dilakukan sebelum sebuah module pada NIAHAIR ERP dapat di-merge ke branch utama atau dirilis ke lingkungan Production.

Review memastikan bahwa implementasi memenuhi standar proyek, Business Rules, kualitas kode, keamanan, performa, dan dokumentasi.

Module tidak boleh dirilis tanpa melalui proses review.

---

# 19.2 Review Principles

Seluruh review mengikuti prinsip.

✅ Objective

✅ Repeatable

✅ Evidence Based

✅ Business First

✅ Quality Focused

Review dilakukan berdasarkan checklist dan standar proyek, bukan preferensi pribadi.

---

# 19.3 Review Workflow

Seluruh module mengikuti alur.

```text
Implementation

↓

Self Review

↓

Automated Checks

↓

Peer Review

↓

Testing Verification

↓

Documentation Review

↓

Approval

↓

Merge

↓

Release
```

Tidak ada tahapan yang boleh dilewati.

---

# 19.4 Business Review

Pastikan.

☑ Requirement terpenuhi.

☑ Business Rule sesuai.

☑ Workflow sesuai.

☑ Status sesuai.

☑ Formula sesuai.

☑ Permission sesuai.

Business Rule menjadi prioritas utama.

---

# 19.5 Architecture Review

Periksa.

☑ Layered Architecture.

☑ Dependency.

☑ Folder Structure.

☑ Naming Convention.

☑ Module Independence.

☑ Reusability.

Implementasi harus sesuai dengan Architecture Decision.

---

# 19.6 Code Review

Pastikan.

☑ Coding Standards dipatuhi.

☑ Tidak ada Duplicate Code.

☑ Function mudah dipahami.

☑ Class memiliki tanggung jawab tunggal.

☑ Tidak ada Dead Code.

☑ Tidak ada TODO yang belum diselesaikan.

---

# 19.7 Database Review

Periksa.

☑ Schema.

☑ Migration.

☑ Relation.

☑ Index.

☑ Constraint.

☑ Transaction.

☑ Seed (jika ada).

---

# 19.8 API Review

Periksa.

☑ Endpoint.

☑ DTO.

☑ Validation.

☑ Authentication.

☑ Authorization.

☑ Response Standard.

☑ Swagger.

---

# 19.9 Frontend Review

Pastikan.

☑ Layout sesuai.

☑ Responsive.

☑ Loading State.

☑ Error State.

☑ Empty State.

☑ Permission Rendering.

☑ API Integration.

---

# 19.10 Testing Review

Pastikan.

☑ Unit Test.

☑ Integration Test.

☑ API Test.

☑ Frontend Test.

☑ Business Rule Test.

☑ Regression Test.

☑ CI Pipeline.

Seluruh pengujian harus lulus.

---

# 19.11 Performance Review

Periksa.

☑ Query.

☑ Pagination.

☑ Cache.

☑ Background Job.

☑ Response Time.

☑ Memory Usage.

---

# 19.12 Security Review

Periksa.

☑ Authentication.

☑ Authorization.

☑ Validation.

☑ Secret.

☑ HTTPS.

☑ Upload Security.

☑ Logging.

---

# 19.13 Documentation Review

Pastikan.

☑ Business Rules.

☑ Data Dictionary.

☑ Swagger.

☑ User Guide.

☑ Changelog.

☑ Release Notes.

Seluruh dokumentasi harus diperbarui.

---

# 19.14 Common Review Findings

❌ Business Rule belum lengkap.

❌ Dokumentasi belum diperbarui.

❌ Tidak ada Regression Test.

❌ Endpoint belum terdokumentasi.

❌ Query belum optimal.

❌ Permission belum diperiksa.

---

# 19.15 Best Practices

✅ Lakukan Self Review sebelum Pull Request.

✅ Gunakan checklist yang sama untuk seluruh module.

✅ Fokus pada kualitas, bukan kecepatan.

✅ Sertakan bukti hasil testing.

✅ Review perubahan, bukan penulis kode.

---

# 19.16 Review Deliverables

Module dianggap siap apabila memiliki.

☑ Review Business.

☑ Review Architecture.

☑ Review Code.

☑ Review Database.

☑ Review API.

☑ Review Frontend.

☑ Review Testing.

☑ Review Security.

☑ Review Documentation.

---

# 19.17 Module Review Checklist

Sebelum Merge.

☐ Business Rule sesuai.

☐ Architecture sesuai.

☐ Coding Standards dipatuhi.

☐ Database selesai.

☐ API selesai.

☐ Frontend selesai.

☐ Testing lulus.

☐ Performance diperiksa.

☐ Security diperiksa.

☐ Dokumentasi diperbarui.

☐ CI berhasil.

---

# 19.18 Definition of Ready for Merge

Module hanya boleh di-merge apabila.

☑ Seluruh checklist selesai.

☑ Tidak ada Critical Bug.

☑ Tidak ada CI Failure.

☑ Review disetujui.

☑ Dokumentasi lengkap.

☑ Tidak ada Breaking Change yang belum direncanakan.

---

# 19.19 Review Matrix

| Area | Status |
|--------|--------|
| Business Rules | Required |
| Architecture | Required |
| Code Quality | Required |
| Database | Required |
| API | Required |
| Frontend | Required |
| Testing | Required |
| Performance | Required |
| Security | Required |
| Documentation | Required |
| CI/CD | Required |

---

# 19.20 Chapter Summary

Review Checklist merupakan tahapan akhir sebelum sebuah module dinyatakan siap untuk di-merge atau dirilis.

Prinsip utama.

✓ Review seluruh aspek implementasi.

✓ Gunakan checklist yang konsisten.

✓ Pastikan Business Rule telah dipenuhi.

✓ Verifikasi kualitas, keamanan, performa, dan dokumentasi.

✓ Merge hanya dilakukan setelah seluruh review selesai.

Dengan standar ini, setiap module NIAHAIR ERP akan melewati proses review yang terstruktur, menghasilkan implementasi yang konsisten, berkualitas tinggi, dan siap digunakan pada lingkungan production.

# CHAPTER 20 — MODULE IMPLEMENTATION CHEAT SHEET

---

# 20.1 Purpose

Chapter ini merupakan ringkasan seluruh Module Implementation Guide.

Gunakan sebagai referensi cepat sebelum membuat module baru pada NIAHAIR ERP.

---

# 20.2 Module Development Workflow

Seluruh module mengikuti workflow berikut.

```text
Requirement

↓

Business Analysis

↓

Planning

↓

Database

↓

Repository

↓

Service

↓

DTO & Validation

↓

Controller

↓

Routes

↓

API Documentation

↓

Frontend

↓

State Management

↓

Permission

↓

Testing

↓

Documentation

↓

Integration

↓

Performance

↓

Security

↓

Review

↓

Release
```

Tidak ada tahapan yang boleh dilewati.

---

# 20.3 Layer Architecture

Seluruh module menggunakan Layered Architecture.

```text
Client

↓

Routes

↓

Middleware

↓

Controller

↓

Service

↓

Repository

↓

Prisma ORM

↓

Database
```

Business Logic hanya berada pada Service Layer.

---

# 20.4 Module Folder Structure

```text
module/

├── controllers/
├── services/
├── repositories/
├── dto/
├── validations/
├── routes/
├── types/
├── constants/
├── utils/
├── tests/
└── index.ts
```

Gunakan struktur yang konsisten untuk seluruh module.

---

# 20.5 Responsibility Matrix

| Layer | Responsibility |
|---------|----------------|
| Routes | Endpoint & Middleware |
| Controller | HTTP Request & Response |
| Service | Business Logic |
| Repository | Database Access |
| DTO | Data Contract |
| Validation | Input Validation |
| Frontend | Presentation |
| State | UI & Data State |
| Integration | External Services |
| Tests | Verification |

---

# 20.6 Database Checklist

☑ Prisma Model.

☑ Migration.

☑ Foreign Key.

☑ Enum.

☑ Index.

☑ Constraint.

☑ Transaction.

☑ Seed (jika diperlukan).

---

# 20.7 Backend Checklist

☑ Repository.

☑ Service.

☑ DTO.

☑ Validation.

☑ Controller.

☑ Routes.

☑ Swagger.

☑ Unit Test.

---

# 20.8 Frontend Checklist

☑ Page.

☑ Component.

☑ Hook.

☑ API Service.

☑ State.

☑ Validation.

☑ Responsive.

☑ Loading.

☑ Error.

☑ Empty State.

---

# 20.9 Integration Checklist

☑ Accurate.

☑ Cloudinary.

☑ WhatsApp.

☑ Email.

☑ AI.

☑ Timeout.

☑ Retry.

☑ Logging.

☑ Mock Testing.

---

# 20.10 Security Checklist

☑ JWT.

☑ Permission.

☑ Validation.

☑ HTTPS.

☑ Environment Variable.

☑ Secure Upload.

☑ Secret Protection.

☑ Security Test.

---

# 20.11 Performance Checklist

☑ Pagination.

☑ Filtering.

☑ Sorting.

☑ Index.

☑ Lazy Loading.

☑ Background Job.

☑ Cache.

☑ Monitoring.

---

# 20.12 Documentation Checklist

☑ Business Rules.

☑ Data Dictionary.

☑ Swagger.

☑ User Guide.

☑ Changelog.

☑ Release Notes.

---

# 20.13 Testing Checklist

☑ Unit Test.

☑ Integration Test.

☑ API Test.

☑ Frontend Test.

☑ Business Rule Test.

☑ Regression Test.

☑ CI Pipeline.

---

# 20.14 Module Definition of Done

Sebuah module dianggap selesai apabila.

☑ Requirement selesai.

☑ Planning selesai.

☑ Database selesai.

☑ Backend selesai.

☑ Frontend selesai.

☑ Integration selesai.

☑ Testing selesai.

☑ Documentation selesai.

☑ Performance diperiksa.

☑ Security diperiksa.

☑ Review selesai.

☑ CI/CD berhasil.

---

# 20.15 Common Mistakes

❌ Business Logic di Controller.

❌ Prisma langsung di Service.

❌ Business Rule di Validation.

❌ Tidak membuat Migration.

❌ Tidak menggunakan DTO.

❌ Tidak melakukan Testing.

❌ Tidak memperbarui Dokumentasi.

❌ Tidak melakukan Review.

---

# 20.16 Best Practices

✅ Ikuti Business Rules.

✅ Ikuti Architecture.

✅ Gunakan Existing Pattern.

✅ Gunakan Layered Architecture.

✅ Pisahkan Responsibility.

✅ Gunakan Testing.

✅ Perbarui Dokumentasi.

---

# 20.17 Module Quality Gate

Sebelum Merge.

☑ Business Rules.

☑ Architecture.

☑ Database.

☑ Backend.

☑ Frontend.

☑ Integration.

☑ Testing.

☑ Performance.

☑ Security.

☑ Documentation.

☑ Code Review.

☑ CI/CD.

Semua item wajib lolos.

---

# 20.18 Module Lifecycle

```text
Requirement

↓

Planning

↓

Implementation

↓

Testing

↓

Documentation

↓

Review

↓

Merge

↓

Release

↓

Monitoring

↓

Continuous Improvement
```

Seluruh module mengikuti lifecycle ini.

---

# 20.19 Engineering Principles

Seluruh Developer dan AI mengikuti prinsip.

1. Business Rules First.
2. Architecture Before Code.
3. Service Owns Business Logic.
4. Repository Owns Database Access.
5. DTO Defines API Contract.
6. Validation Checks Input.
7. Test Before Merge.
8. Documentation Before Release.
9. Security by Design.
10. Performance by Default.

---

# 20.20 Final Summary

Module Implementation Guide merupakan standar resmi pembangunan seluruh module pada NIAHAIR ERP.

Setiap module—baik Customer, Appointment, Inventory, Production, Finance, CRM, maupun module lain—wajib mengikuti panduan ini agar memiliki struktur, kualitas, dan pola implementasi yang konsisten.

Prinsip utama.

✓ Mulai dari Requirement dan Business Rules.

✓ Rancang sebelum menulis kode.

✓ Terapkan Layered Architecture.

✓ Tempatkan Business Logic pada Service Layer.

✓ Gunakan Repository untuk akses database.

✓ Gunakan DTO sebagai kontrak API.

✓ Terapkan Testing, Security, dan Performance sebagai bagian dari implementasi.

✓ Perbarui dokumentasi pada setiap perubahan.

✓ Lakukan Review sebelum Merge.

✓ Pastikan seluruh Quality Gate terpenuhi sebelum Release.

Dengan mengikuti panduan ini, seluruh module NIAHAIR ERP akan memiliki implementasi yang seragam, mudah dipelihara, mudah dikembangkan, dan siap mendukung pertumbuhan sistem menjadi ERP enterprise berskala besar.