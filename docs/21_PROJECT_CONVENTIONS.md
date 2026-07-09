# CHAPTER 1 — PROJECT PURPOSE

---

# 1.1 Purpose

Project Conventions mendefinisikan aturan umum yang berlaku untuk seluruh proyek NIAHAIR ERP.

Dokumen ini menjadi acuan utama bagi seluruh anggota tim, termasuk Developer, QA Engineer, DevOps, Product Owner, dan AI Coding Assistant.

Seluruh implementasi harus mengikuti konvensi yang terdapat pada dokumen ini.

---

# 1.2 Objectives

Project Conventions dibuat untuk.

- Menjaga konsistensi proyek.
- Mengurangi technical debt.
- Mempermudah maintenance.
- Mempercepat onboarding developer.
- Memastikan seluruh module memiliki standar yang sama.

---

# 1.3 Scope

Konvensi ini berlaku untuk seluruh area proyek.

- Backend
- Frontend
- Database
- API
- Testing
- Documentation
- Deployment
- AI Development

Tidak ada pengecualian kecuali disetujui oleh Technical Lead.

---

# 1.4 Priority Order

Apabila terjadi konflik antar dokumen.

Gunakan urutan berikut.

```text
Business Rules

↓

ERP Blueprint

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

↓

AI Development Guide

↓

Source Code
```

Dokumen dengan prioritas lebih tinggi selalu menjadi acuan.

---

# 1.5 Engineering Principles

Seluruh proyek mengikuti prinsip.

✅ Consistency

✅ Simplicity

✅ Maintainability

✅ Scalability

✅ Security

✅ Reusability

Konsistensi selalu lebih penting daripada preferensi individu.

---

# 1.6 Project Philosophy

Seluruh implementasi mengikuti filosofi berikut.

Business Rule

↓

Architecture

↓

Convention

↓

Implementation

↓

Testing

↓

Documentation

Source code bukan pusat proyek.

Business Rule adalah pusat proyek.

---

# 1.7 Team Responsibility

Seluruh anggota tim bertanggung jawab menjaga kualitas proyek.

| Role | Responsibility |
|------|----------------|
| Product Owner | Business Requirements |
| System Analyst | Business Analysis |
| Backend Developer | Backend Implementation |
| Frontend Developer | Frontend Implementation |
| QA Engineer | Quality Assurance |
| DevOps | Deployment & Infrastructure |
| AI Assistant | Development Assistance |

Seluruh role mengikuti Project Conventions.

---

# 1.8 Compliance

Seluruh Pull Request harus mematuhi Project Conventions.

Apabila melanggar.

- Pull Request dapat ditolak.
- Harus dilakukan perbaikan sebelum Merge.
- Dokumentasi harus diperbarui bila diperlukan.

---

# 1.9 Definition of Compliance

Implementasi dianggap compliant apabila.

☑ Mengikuti Business Rules.

☑ Mengikuti Architecture.

☑ Mengikuti Coding Standards.

☑ Mengikuti API Standards.

☑ Mengikuti Testing Guide.

☑ Mengikuti AI Development Guide.

☑ Mengikuti Project Conventions.

---

# 1.10 Chapter Summary

Project Conventions merupakan aturan umum yang mengikat seluruh proses pengembangan NIAHAIR ERP.

Prinsip utama.

✓ Seluruh tim mengikuti standar yang sama.

✓ Business Rule menjadi prioritas utama.

✓ Konsistensi lebih penting daripada preferensi individu.

✓ Semua perubahan harus mematuhi Project Conventions.

Dengan standar ini, seluruh anggota tim dan AI bekerja menggunakan aturan yang sama sehingga proyek tetap konsisten, mudah dipelihara, dan siap berkembang dalam jangka panjang.

# CHAPTER 2 — ENGINEERING PRINCIPLES

---

# 2.1 Purpose

Chapter ini mendefinisikan prinsip-prinsip engineering yang menjadi dasar seluruh proses pengembangan NIAHAIR ERP.

Seluruh keputusan teknis harus mengacu pada prinsip-prinsip ini sebelum mempertimbangkan preferensi pribadi atau solusi teknis tertentu.

---

# 2.2 Engineering Philosophy

Seluruh pengembangan mengikuti filosofi berikut.

```text
Business Value

↓

Architecture

↓

Convention

↓

Implementation

↓

Testing

↓

Documentation

↓

Deployment
```

Implementasi teknis harus selalu mendukung tujuan bisnis.

---

# 2.3 Business First

Setiap keputusan teknis harus mendukung kebutuhan bisnis.

AI maupun developer wajib memahami.

- Tujuan fitur.
- Business Flow.
- Business Rule.
- Dampak terhadap operasional.

Teknologi tidak boleh mengubah proses bisnis tanpa persetujuan.

---

# 2.4 Convention Over Preference

Standar proyek selalu lebih penting daripada preferensi individu.

Gunakan.

✅ Existing Pattern.

✅ Existing Architecture.

✅ Existing Convention.

Hindari membuat pola baru hanya karena lebih disukai secara pribadi.

---

# 2.5 Simplicity Over Complexity

Pilih solusi yang paling sederhana selama memenuhi kebutuhan.

Prioritaskan.

- Mudah dipahami.
- Mudah diuji.
- Mudah dipelihara.
- Mudah dikembangkan.

Kompleksitas hanya ditambahkan jika benar-benar diperlukan.

---

# 2.6 Reuse Before Create

Sebelum membuat sesuatu yang baru.

Periksa.

☐ Existing Module.

☐ Existing Component.

☐ Existing Service.

☐ Existing Utility.

☐ Existing Hook.

Gunakan kembali implementasi yang sudah ada jika sesuai.

---

# 2.7 Single Source of Truth

Setiap informasi hanya memiliki satu sumber resmi.

| Area | Source of Truth |
|------|-----------------|
| Business Rule | Business Rules |
| Database | Data Dictionary |
| API | API Standards |
| Architecture | Architecture Decisions |
| Coding | Coding Standards |
| Testing | Testing Guide |

Duplikasi definisi harus dihindari.

---

# 2.8 Separation of Concerns

Setiap layer memiliki tanggung jawab yang jelas.

| Layer | Responsibility |
|--------|----------------|
| Controller | HTTP Request & Response |
| Service | Business Logic |
| Repository | Database Access |
| Component | UI |
| Hook | Reusable Frontend Logic |

Jangan mencampurkan tanggung jawab antar layer.

---

# 2.9 Automation First

Pekerjaan yang dilakukan berulang sebaiknya diotomatisasi.

Contoh.

✅ Testing.

✅ Linting.

✅ Formatting.

✅ Build.

✅ Deployment.

✅ CI Pipeline.

Automation meningkatkan konsistensi dan mengurangi human error.

---

# 2.10 Security by Default

Keamanan harus menjadi bagian dari desain sejak awal.

Pastikan.

- Authentication.
- Authorization.
- Input Validation.
- Secret Management.
- Secure Configuration.

Keamanan bukan fitur tambahan yang dipasang di akhir.

---

# 2.11 Test Before Release

Seluruh perubahan harus diuji sebelum dirilis.

Minimal.

☑ Unit Test.

☑ Integration Test.

☑ API Test.

☑ Regression Test.

Tidak ada Release tanpa pengujian yang memadai.

---

# 2.12 Documentation as Code

Dokumentasi diperlakukan sebagai bagian dari proyek.

Dokumentasi harus.

✅ Akurat.

✅ Konsisten.

✅ Selalu diperbarui.

Implementasi dan dokumentasi harus selalu sinkron.

---

# 2.13 Long-Term Maintainability

Setiap keputusan harus mempertimbangkan dampak jangka panjang.

Prioritaskan.

- Maintainability.
- Readability.
- Scalability.
- Extensibility.

Hindari solusi cepat yang menciptakan technical debt.

---

# 2.14 Continuous Improvement

Proyek harus terus ditingkatkan.

Evaluasi secara berkala.

- Architecture.
- Performance.
- Security.
- Testing.
- Documentation.
- Developer Experience.

Perbaikan dilakukan secara bertahap dan terukur.

---

# 2.15 Common Anti-Patterns

Hindari.

❌ Hardcode.

❌ Duplicate Code.

❌ Circular Dependency.

❌ Business Logic di Controller.

❌ Database Access di UI.

❌ Perubahan tanpa Testing.

❌ Perubahan tanpa Dokumentasi.

---

# 2.16 Engineering Checklist

Sebelum menyelesaikan task.

☐ Mendukung Business Value.

☐ Mengikuti Convention.

☐ Menggunakan Existing Pattern.

☐ Menjaga Separation of Concerns.

☐ Testing selesai.

☐ Dokumentasi selesai.

☐ Aman untuk Production.

---

# 2.17 Engineering Principles Summary

| Principle | Description |
|-----------|-------------|
| Business First | Dahulukan kebutuhan bisnis |
| Convention Over Preference | Ikuti standar proyek |
| Simplicity Over Complexity | Pilih solusi sederhana |
| Reuse Before Create | Gunakan kembali yang sudah ada |
| Single Source of Truth | Satu sumber resmi untuk setiap informasi |
| Separation of Concerns | Pisahkan tanggung jawab |
| Automation First | Otomatiskan proses berulang |
| Security by Default | Bangun dengan keamanan sejak awal |
| Test Before Release | Uji sebelum rilis |
| Documentation as Code | Dokumentasi bagian dari proyek |
| Long-Term Maintainability | Pikirkan dampak jangka panjang |

---

# 2.18 Chapter Summary

Engineering Principles menjadi landasan seluruh keputusan teknis pada NIAHAIR ERP.

Prinsip utama.

✓ Business Value menjadi prioritas.

✓ Ikuti Convention yang telah ditetapkan.

✓ Gunakan solusi yang sederhana dan mudah dipelihara.

✓ Otomatiskan proses yang berulang.

✓ Bangun sistem yang aman sejak awal.

✓ Selalu lakukan Testing dan perbarui Dokumentasi.

Dengan prinsip-prinsip ini, seluruh anggota tim—baik developer, QA, DevOps, maupun AI—menggunakan cara berpikir yang sama dalam membangun dan mengembangkan NIAHAIR ERP.

# CHAPTER 3 — PROJECT STRUCTURE

---

# 3.1 Purpose

Chapter ini mendefinisikan struktur resmi proyek NIAHAIR ERP.

Seluruh source code, dokumentasi, konfigurasi, dan aset proyek harus mengikuti struktur yang telah ditetapkan.

Struktur proyek harus konsisten agar mudah dipahami, dikembangkan, dan dipelihara.

---

# 3.2 Project Organization

Proyek dibagi menjadi beberapa area utama.

```text
Project

├── Backend
├── Frontend
├── Database
├── Documentation
├── Infrastructure
├── Testing
├── Scripts
└── Configuration
```

Setiap area memiliki tanggung jawab yang jelas.

---

# 3.3 Backend Structure

Backend mengikuti Layered Architecture.

```text
backend/

├── src/
│   ├── modules/
│   ├── repositories/
│   ├── services/
│   ├── controllers/
│   ├── routes/
│   ├── middlewares/
│   ├── validations/
│   ├── dto/
│   ├── integrations/
│   ├── shared/
│   └── config/
│
├── prisma/
├── tests/
└── package.json
```

Jangan membuat struktur baru tanpa alasan yang jelas.

---

# 3.4 Frontend Structure

Frontend diorganisasi berdasarkan fitur.

```text
frontend/

├── src/
│   ├── pages/
│   ├── components/
│   ├── hooks/
│   ├── services/
│   ├── layouts/
│   ├── stores/
│   ├── types/
│   ├── utils/
│   ├── assets/
│   └── routes/
│
├── public/
└── package.json
```

Komponen bersama ditempatkan pada folder `components`.

---

# 3.5 Database Structure

Seluruh database dikelola melalui Prisma.

```text
prisma/

├── schema.prisma
├── migrations/
├── seed/
└── scripts/
```

Perubahan schema harus selalu melalui Migration.

---

# 3.6 Documentation Structure

Seluruh dokumentasi disimpan terpusat.

```text
docs/

├── Blueprint
├── Business Rules
├── Architecture
├── API
├── Database
├── Development
├── Operations
└── AI
```

Dokumentasi tidak boleh tersebar di berbagai lokasi.

---

# 3.7 Testing Structure

Testing dipisahkan berdasarkan jenisnya.

```text
tests/

├── unit/
├── integration/
├── api/
├── frontend/
├── e2e/
├── performance/
└── security/
```

Seluruh test harus memiliki lokasi yang konsisten.

---

# 3.8 Module Structure

Setiap module Backend mengikuti struktur yang sama.

```text
customer/

├── controller/
├── service/
├── repository/
├── dto/
├── validation/
├── routes/
├── types/
└── tests/
```

Semua module harus menggunakan struktur ini.

---

# 3.9 Shared Resources

Kode yang digunakan bersama ditempatkan pada Shared Layer.

Contoh.

```text
shared/

├── constants/
├── enums/
├── helpers/
├── utils/
├── errors/
├── logger/
└── types/
```

Jangan menduplikasi utilitas antar module.

---

# 3.10 Configuration Structure

Seluruh konfigurasi berada pada lokasi yang sama.

```text
config/

├── app
├── database
├── auth
├── storage
├── queue
└── logger
```

Konfigurasi tidak boleh tersebar di berbagai module.

---

# 3.11 File Organization Rules

Seluruh file harus.

✅ Memiliki lokasi yang jelas.

✅ Mengikuti struktur resmi.

✅ Dikelompokkan berdasarkan tanggung jawab.

Hindari folder dengan fungsi yang tidak jelas.

---

# 3.12 Module Independence

Setiap module harus berdiri sendiri.

Module tidak boleh bergantung langsung pada struktur internal module lain.

Komunikasi antar module dilakukan melalui Service Layer.

---

# 3.13 Common Mistakes

❌ Folder tanpa tujuan yang jelas.

❌ Struktur berbeda pada setiap module.

❌ Utility tersebar di banyak lokasi.

❌ Business Logic pada folder yang salah.

❌ File konfigurasi berada di dalam module.

---

# 3.14 Best Practices

✅ Gunakan struktur resmi.

✅ Kelompokkan berdasarkan tanggung jawab.

✅ Pisahkan Shared Resource.

✅ Gunakan struktur module yang konsisten.

✅ Hindari nested folder yang terlalu dalam.

---

# 3.15 Project Structure Checklist

Sebelum membuat file baru.

☐ Lokasi sesuai struktur.

☐ Tidak ada folder duplikat.

☐ Mengikuti struktur module.

☐ Shared Resource digunakan bila diperlukan.

☐ Tidak melanggar Layered Architecture.

---

# 3.16 Structure Overview

| Area | Responsibility |
|------|----------------|
| Backend | Business Logic |
| Frontend | User Interface |
| Database | Data Persistence |
| Documentation | Project Knowledge |
| Testing | Quality Assurance |
| Infrastructure | Deployment & Operations |
| Shared | Reusable Resources |
| Configuration | System Configuration |

---

# 3.17 Chapter Summary

Struktur proyek NIAHAIR ERP harus konsisten dan digunakan oleh seluruh anggota tim.

Prinsip utama.

✓ Gunakan struktur resmi proyek.

✓ Pisahkan Backend, Frontend, Database, Testing, dan Documentation.

✓ Gunakan struktur module yang seragam.

✓ Tempatkan Shared Resource pada lokasi terpusat.

✓ Hindari perubahan struktur tanpa kebutuhan yang jelas.

Dengan struktur yang konsisten, proyek akan lebih mudah dipahami, dikembangkan, dipelihara, dan didukung oleh AI maupun developer di masa depan.

# CHAPTER 4 — NAMING CONVENTION

---

# 4.1 Purpose

Chapter ini mendefinisikan standar penamaan yang digunakan pada seluruh proyek NIAHAIR ERP.

Seluruh nama file, folder, database, API, variable, function, class, interface, type, enum, dan komponen harus mengikuti konvensi yang sama.

Penamaan yang konsisten meningkatkan keterbacaan, kemudahan pencarian, dan maintainability.

---

# 4.2 Naming Principles

Seluruh penamaan mengikuti prinsip.

✅ Clear

✅ Consistent

✅ Predictable

✅ Descriptive

✅ Business Oriented

Gunakan nama yang menjelaskan tujuan, bukan implementasi.

---

# 4.3 General Rules

Gunakan Bahasa Inggris.

Gunakan istilah bisnis yang konsisten.

Nama harus.

✅ Mudah dipahami.

✅ Tidak ambigu.

✅ Tidak disingkat tanpa alasan.

Hindari nama yang terlalu pendek.

---

# 4.4 Case Convention

| Item | Convention |
|-------|------------|
| Folder | kebab-case |
| File | kebab-case |
| Variable | camelCase |
| Function | camelCase |
| Class | PascalCase |
| Interface | PascalCase |
| Type | PascalCase |
| Enum | PascalCase |
| Enum Value | UPPER_SNAKE_CASE |
| Constant | UPPER_SNAKE_CASE |
| Prisma Model | PascalCase |
| Database Table | snake_case |
| Database Column | snake_case |

---

# 4.5 Folder Naming

Gunakan.

```text
customer

appointment

inventory

payment-method
```

Jangan.

```text
Customer

CustomerModule

customerModule

cust
```

---

# 4.6 File Naming

Gunakan.

```text
customer.service.ts

customer.repository.ts

customer.controller.ts

create-customer.dto.ts

customer.routes.ts
```

Jangan.

```text
CustomerService.ts

serviceCustomer.ts

cust.ts
```

---

# 4.7 Variable Naming

Gunakan.

```ts
customerName

invoiceTotal

remainingBalance

paymentMethod
```

Jangan.

```ts
a

temp

data1

cust
```

Nama variable harus menjelaskan isi data.

---

# 4.8 Function Naming

Gunakan kata kerja.

Contoh.

```ts
createCustomer()

updateCustomer()

deleteCustomer()

calculateCommission()

syncInventory()
```

Jangan.

```ts
customer()

doTask()

process()
```

---

# 4.9 Boolean Naming

Gunakan awalan yang jelas.

```ts
isActive

isDeleted

hasPermission

canEdit

shouldSync
```

Hindari.

```ts
active

delete

flag

status
```

---

# 4.10 Class Naming

Gunakan PascalCase.

```ts
CustomerService

CustomerRepository

CreateCustomerDto

PaymentController
```

---

# 4.11 Interface Naming

Gunakan PascalCase.

```ts
Customer

InvoiceSummary

PaymentResponse
```

Jangan menggunakan prefix seperti.

```text
ICustomer

IInvoice
```

---

# 4.12 Enum Naming

Gunakan PascalCase.

```ts
AppointmentStatus

PaymentMethod

InventoryMovementType
```

Value menggunakan UPPER_SNAKE_CASE.

```ts
BOOKED

CONFIRMED

COMPLETED

CANCELLED
```

---

# 4.13 Database Naming

Gunakan snake_case.

```text
customers

customer_memberships

payment_methods

invoice_items
```

Kolom.

```text
customer_id

created_at

updated_at

deleted_at
```

---

# 4.14 API Naming

Gunakan Resource-Based REST API.

```text
GET /customers

POST /customers

PATCH /customers/{id}

DELETE /customers/{id}
```

Jangan.

```text
/getCustomer

/updateCustomer

/deleteCustomer
```

---

# 4.15 React Naming

Component.

```text
CustomerCard

CustomerTable

PaymentDialog

InventoryList
```

Hook.

```ts
useCustomer()

useInventory()

usePayment()
```

---

# 4.16 Test Naming

Gunakan pola.

```text
customer.service.test.ts

customer.api.test.ts

customer.integration.test.ts
```

Nama test harus menjelaskan skenario.

```ts
should_create_customer()

should_reject_duplicate_phone()

should_calculate_commission_correctly()
```

---

# 4.17 Common Mistakes

❌ Nama terlalu singkat.

❌ Singkatan yang tidak jelas.

❌ Bahasa campuran.

❌ Penamaan tidak konsisten.

❌ Tidak mengikuti Case Convention.

---

# 4.18 Best Practices

✅ Gunakan istilah bisnis.

✅ Gunakan nama lengkap.

✅ Konsisten di seluruh proyek.

✅ Gunakan pola yang sama pada semua module.

---

# 4.19 Naming Checklist

Sebelum membuat nama baru.

☐ Menggunakan Bahasa Inggris.

☐ Mengikuti Case Convention.

☐ Menjelaskan tujuan.

☐ Konsisten dengan module lain.

☐ Tidak menggunakan singkatan yang tidak perlu.

---

# 4.20 Naming Quick Reference

| Item | Example |
|------|---------|
| Folder | customer |
| File | customer.service.ts |
| Variable | customerName |
| Function | createCustomer() |
| Boolean | isActive |
| Class | CustomerService |
| Interface | CustomerResponse |
| Type | CustomerFilter |
| Enum | AppointmentStatus |
| Constant | DEFAULT_PAGE_SIZE |
| Table | customer_memberships |
| Column | customer_id |
| API | /customers |
| Hook | useCustomer |
| Component | CustomerCard |

---

# 4.21 Chapter Summary

Seluruh penamaan pada NIAHAIR ERP harus mengikuti standar yang konsisten.

Prinsip utama.

✓ Gunakan Bahasa Inggris.

✓ Gunakan istilah bisnis.

✓ Ikuti Case Convention.

✓ Hindari singkatan yang tidak jelas.

✓ Gunakan pola yang sama pada seluruh proyek.

Dengan standar ini, codebase akan lebih mudah dipahami, dicari, direview, dan dikembangkan oleh developer maupun AI.

# CHAPTER 5 — DATABASE CONVENTIONS

---

# 5.1 Purpose

Chapter ini mendefinisikan standar database yang digunakan pada seluruh proyek NIAHAIR ERP.

Seluruh perubahan database harus mengikuti Data Dictionary, Business Rules, dan Architecture Decisions.

Database merupakan sumber data utama (Source of Truth) dan harus dirancang untuk mendukung kebutuhan bisnis jangka panjang.

---

# 5.2 Database Principles

Seluruh database mengikuti prinsip.

✅ Business Driven

✅ Normalized

✅ Consistent

✅ Scalable

✅ Performant

✅ Maintainable

Desain database harus mengikuti kebutuhan bisnis, bukan kebutuhan implementasi sementara.

---

# 5.3 Source of Truth

Seluruh perubahan database mengacu pada.

```text
Business Rules

↓

Data Dictionary

↓

ERP Blueprint

↓

Architecture Decisions

↓

Prisma Schema

↓

Migration
```

Data Dictionary menjadi referensi utama struktur database.

---

# 5.4 Primary Key Convention

Seluruh tabel menggunakan.

```text
id UUID
```

Contoh.

```text
customers.id

appointments.id

sales_invoices.id
```

AI dan developer tidak diperbolehkan menggunakan Auto Increment Integer sebagai Primary Key kecuali ada alasan yang disetujui.

---

# 5.5 Foreign Key Convention

Seluruh Foreign Key mengikuti pola.

```text
customer_id

appointment_id

invoice_id

employee_id
```

Jangan menggunakan.

```text
custId

customerID

idCustomer
```

---

# 5.6 Table Naming Convention

Gunakan.

```text
snake_case
plural
```

Contoh.

```text
customers

appointments

sales_invoices

inventory_movements

commission_rules
```

Jangan.

```text
Customer

tbl_customer

customerData

appointmentList
```

---

# 5.7 Column Naming Convention

Gunakan.

```text
snake_case
```

Contoh.

```text
created_at

updated_at

deleted_at

phone_number

total_amount
```

---

# 5.8 Audit Fields

Seluruh tabel wajib memiliki.

```text
id

created_at

updated_at
```

Gunakan bila diperlukan.

```text
deleted_at

created_by

updated_by

deleted_by
```

Audit field harus konsisten di seluruh database.

---

# 5.9 Money Convention

Seluruh nilai uang menggunakan.

```text
Decimal
```

Contoh.

```text
price

cost

subtotal

discount

tax

total_amount
```

Dilarang menggunakan Float untuk nilai uang.

---

# 5.10 Status Convention

Status menggunakan Enum.

Contoh.

```text
AppointmentStatus

InvoiceStatus

PaymentStatus

ProductionStatus
```

Jangan menggunakan String bebas untuk status.

---

# 5.11 Soft Delete Convention

Data bisnis penting tidak dihapus secara permanen.

Gunakan.

```text
deleted_at
```

Hard Delete hanya diperbolehkan untuk data tertentu sesuai Business Rules.

---

# 5.12 Relationship Convention

Gunakan relasi yang jelas.

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

Setiap Relationship harus memiliki alasan bisnis.

---

# 5.13 Index Convention

Tambahkan Index pada.

☑ Foreign Key.

☑ Search Field.

☑ Filter Field.

☑ Frequently Sorted Field.

Jangan membuat Index tanpa kebutuhan.

---

# 5.14 Migration Convention

Seluruh perubahan schema.

Wajib.

☑ Prisma Migration.

☑ Version Control.

☑ Rollback Plan.

☑ Testing.

Perubahan langsung ke database dilarang.

---

# 5.15 Seed Convention

Seed hanya digunakan untuk data tetap.

Contoh.

```text
Role

Permission

Branch

Warehouse

Payment Method

Membership
```

Seed harus dapat dijalankan berulang tanpa menghasilkan data duplikat.

---

# 5.16 Transaction Convention

Gunakan Transaction apabila.

- Update banyak tabel.
- Stock Movement.
- Payment.
- Invoice.
- Production.

Data harus tetap konsisten apabila proses gagal.

---

# 5.17 Performance Convention

Database harus.

☑ Menggunakan Pagination.

☑ Menggunakan Index.

☑ Menghindari N+1 Query.

☑ Menggunakan Query yang efisien.

Optimasi dilakukan sebelum masalah performa muncul.

---

# 5.18 Common Mistakes

❌ Float untuk uang.

❌ Tidak menggunakan Foreign Key.

❌ Tidak menggunakan Migration.

❌ Menambahkan kolom tanpa Data Dictionary.

❌ Query tanpa Pagination.

❌ Tidak menggunakan Transaction.

---

# 5.19 Best Practices

✅ Ikuti Data Dictionary.

✅ Gunakan UUID.

✅ Gunakan Decimal untuk uang.

✅ Gunakan Enum untuk Status.

✅ Gunakan Migration.

✅ Gunakan Transaction.

✅ Gunakan Index dengan bijak.

---

# 5.20 Database Convention Checklist

Sebelum mengubah database.

☑ Business Rule diperiksa.

☑ Data Dictionary diperiksa.

☑ Migration dibuat.

☑ Foreign Key benar.

☑ Index diperiksa.

☑ Transaction diperlukan?

☑ Testing diperbarui.

☑ Dokumentasi diperbarui.

---

# 5.21 Quick Reference

| Area | Standard |
|------|----------|
| Primary Key | UUID |
| Foreign Key | snake_case_id |
| Table | snake_case plural |
| Column | snake_case |
| Money | Decimal |
| Status | Enum |
| Audit | created_at, updated_at |
| Delete | Soft Delete |
| Schema Change | Migration |
| Data Tetap | Seed |
| Multi Table Update | Transaction |
| Search | Index + Pagination |

---

# 5.22 Chapter Summary

Seluruh database NIAHAIR ERP harus mengikuti konvensi yang konsisten dan berorientasi pada kebutuhan bisnis.

Prinsip utama.

✓ Database mengikuti Business Rules.

✓ Gunakan UUID sebagai Primary Key.

✓ Gunakan Decimal untuk nilai uang.

✓ Gunakan Migration untuk setiap perubahan schema.

✓ Gunakan Transaction untuk operasi kritis.

✓ Jaga integritas data dengan Foreign Key, Constraint, dan Index.

Dengan konvensi ini, database NIAHAIR ERP akan tetap konsisten, aman, mudah dipelihara, dan mampu mendukung pertumbuhan sistem dalam jangka panjang.

# CHAPTER 6 — API CONVENTIONS

---

# 6.1 Purpose

Chapter ini mendefinisikan konvensi REST API yang berlaku untuk seluruh proyek NIAHAIR ERP.

Seluruh endpoint, request, response, authentication, dan error handling harus mengikuti aturan yang sama agar API tetap konsisten, mudah digunakan, dan mudah dipelihara.

---

# 6.2 API Principles

Seluruh API mengikuti prinsip.

✅ RESTful

✅ Consistent

✅ Predictable

✅ Secure

✅ Version Ready

Semua module harus menggunakan pola API yang sama.

---

# 6.3 API Source of Truth

Seluruh implementasi API mengacu pada.

```text
Business Rules

↓

API Standards

↓

Data Dictionary

↓

Architecture Decisions

↓

Existing API
```

API tidak boleh dibuat hanya berdasarkan kebutuhan Frontend.

---

# 6.4 Resource Naming

Endpoint menggunakan Resource.

Contoh.

```text
/customers

/appointments

/treatments

/invoices

/payments

/inventory

/productions
```

Jangan.

```text
/getCustomer

/createInvoice

/deletePayment
```

---

# 6.5 HTTP Method Convention

| Method | Purpose |
|----------|----------|
| GET | Read |
| POST | Create |
| PUT | Replace |
| PATCH | Partial Update |
| DELETE | Delete |

Gunakan Method sesuai fungsinya.

---

# 6.6 URL Convention

Gunakan.

```text
/api/v1/customers

/api/v1/customers/{id}

/api/v1/invoices
```

Hindari.

```text
/customerData

/getInvoiceList

/api/customerController
```

---

# 6.7 Request Convention

Seluruh Request menggunakan.

☑ DTO

☑ Validation

☑ UUID

☑ JSON

Tidak menerima Request tanpa validasi.

---

# 6.8 Response Convention

Gunakan Response Standard resmi proyek.

Contoh.

```json
{
  "success": true,
  "message": "Success",
  "data": {}
}
```

Seluruh module menggunakan format yang sama.

---

# 6.9 Error Convention

Gunakan HTTP Status Code sesuai standar.

| Status | Purpose |
|---------|----------|
| 200 | Success |
| 201 | Created |
| 400 | Validation |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 422 | Business Rule |
| 500 | Internal Error |

Jangan membuat format Error berbeda pada setiap module.

---

# 6.10 Pagination Convention

Endpoint List wajib mendukung.

```text
page

limit

search

sort

order

filter
```

Pagination digunakan pada seluruh endpoint yang mengembalikan daftar data.

---

# 6.11 Authentication Convention

Endpoint yang memerlukan Login wajib menggunakan Authentication.

Gunakan.

☑ JWT

☑ Access Token

☑ Refresh Token (bila diterapkan)

Endpoint publik harus didefinisikan secara eksplisit.

---

# 6.12 Authorization Convention

Hak akses ditentukan berdasarkan Role dan Permission.

Contoh.

- Owner
- Manager
- Admin
- Cashier
- Stylist
- Warehouse

Authorization dilakukan sebelum Business Logic dijalankan.

---

# 6.13 Versioning Convention

Seluruh endpoint menggunakan versioning.

Contoh.

```text
/api/v1/...
```

Perubahan besar yang tidak kompatibel harus menggunakan versi baru.

---

# 6.14 Documentation Convention

Seluruh endpoint wajib didokumentasikan.

Minimal.

☑ Endpoint

☑ Method

☑ Request

☑ Response

☑ Error

☑ Authentication

☑ Permission

Swagger/OpenAPI harus selalu sinkron dengan implementasi.

---

# 6.15 API Lifecycle

Seluruh endpoint mengikuti siklus.

```text
Requirement

↓

Business Rule

↓

DTO

↓

Validation

↓

Service

↓

Repository

↓

Testing

↓

Documentation

↓

Release
```

Tidak ada tahap yang boleh dilewati.

---

# 6.16 Common Mistakes

❌ Tidak menggunakan DTO.

❌ Tidak melakukan Validation.

❌ Response tidak konsisten.

❌ Endpoint tidak RESTful.

❌ Tidak memperbarui Swagger.

❌ Tidak membuat API Test.

---

# 6.17 Best Practices

✅ Gunakan Resource-Based Endpoint.

✅ Gunakan DTO.

✅ Validasi seluruh Request.

✅ Gunakan Response Standard.

✅ Gunakan Versioning.

✅ Perbarui Dokumentasi.

---

# 6.18 API Convention Checklist

Sebelum membuat endpoint.

☐ Business Rule diperiksa.

☐ API Standards diikuti.

☐ DTO dibuat.

☐ Validation dibuat.

☐ Authentication diperiksa.

☐ Authorization diperiksa.

☐ Pagination tersedia.

☐ Testing dibuat.

☐ Swagger diperbarui.

---

# 6.19 Quick Reference

| Area | Standard |
|------|----------|
| URL | /api/v1/resource |
| Method | RESTful |
| Request | DTO + Validation |
| Response | Response Standard |
| Error | HTTP Status Standard |
| Auth | JWT |
| Permission | Role Based |
| List API | Pagination |
| Documentation | Swagger |
| Testing | API Test |

---

# 6.20 Chapter Summary

Seluruh REST API pada NIAHAIR ERP harus mengikuti konvensi yang konsisten di seluruh module.

Prinsip utama.

✓ Gunakan Resource-Based Endpoint.

✓ Gunakan DTO dan Validation.

✓ Terapkan Authentication dan Authorization.

✓ Gunakan Response Standard.

✓ Dukung Pagination pada endpoint list.

✓ Selalu perbarui Testing dan Dokumentasi.

Dengan konvensi ini, seluruh API akan memiliki pola yang seragam, mudah dipahami, mudah diintegrasikan, dan siap mendukung pengembangan jangka panjang.

# CHAPTER 7 — FRONTEND CONVENTIONS

---

# 7.1 Purpose

Chapter ini mendefinisikan konvensi Frontend yang berlaku untuk seluruh proyek NIAHAIR ERP.

Seluruh halaman, component, hook, state management, dan integrasi API harus mengikuti standar yang sama agar aplikasi tetap konsisten, mudah dipelihara, dan mudah dikembangkan.

---

# 7.2 Frontend Principles

Seluruh Frontend mengikuti prinsip.

✅ Feature First

✅ Reusable

✅ Consistent

✅ Responsive

✅ Accessible

✅ API Driven

Frontend harus menjadi representasi dari Business Rules, bukan tempat menyimpan Business Logic.

---

# 7.3 Source of Truth

Seluruh implementasi Frontend mengacu pada.

```text
Business Rules

↓

UI/UX Guidelines

↓

API Standards

↓

Coding Standards

↓

Existing Components
```

Frontend tidak boleh mengubah Business Rule.

---

# 7.4 Project Structure

Frontend mengikuti struktur resmi proyek.

```text
src/

├── pages/
├── components/
├── layouts/
├── hooks/
├── services/
├── stores/
├── routes/
├── types/
├── utils/
└── assets/
```

Struktur harus konsisten pada seluruh module.

---

# 7.5 Component Convention

Component digunakan hanya untuk.

☑ UI

☑ Layout

☑ Presentation

Component harus.

- Reusable
- Stateless jika memungkinkan
- Mudah diuji

Business Logic tidak boleh berada di Component.

---

# 7.6 Hook Convention

Gunakan Custom Hook untuk.

- API Fetching
- Form Logic
- Reusable State
- Side Effect

Contoh.

```text
useCustomer()

useAppointment()

useInventory()
```

Hook tidak digunakan untuk rendering UI.

---

# 7.7 API Convention

Seluruh HTTP Request dilakukan melalui.

```text
Component

↓

Hook

↓

API Service

↓

Backend
```

Component tidak boleh memanggil API secara langsung.

---

# 7.8 State Management Convention

Gunakan state sesuai kebutuhan.

| State | Usage |
|--------|-------|
| Local State | UI lokal |
| Global State | Session & Shared State |
| Server State | Data dari API |

Hindari menyimpan Server State sebagai Local State.

---

# 7.9 Form Convention

Seluruh Form harus memiliki.

☑ Validation

☑ Loading State

☑ Error State

☑ Success State

☑ Disable Submit saat proses berjalan

Validation Frontend harus konsisten dengan Backend.

---

# 7.10 UI State Convention

Setiap halaman minimal memiliki.

☑ Loading

☑ Empty

☑ Error

☑ Success

Tidak boleh hanya memiliki Success State.

---

# 7.11 Responsive Convention

Seluruh halaman wajib mendukung.

- Desktop
- Tablet
- Mobile

Layout tidak boleh rusak pada ukuran layar yang didukung.

---

# 7.12 Accessibility Convention

Minimal harus mendukung.

☑ Semantic HTML

☑ Keyboard Navigation

☑ Focus Indicator

☑ Form Label

☑ ARIA bila diperlukan

Accessibility merupakan bagian dari kualitas aplikasi.

---

# 7.13 Performance Convention

Gunakan.

☑ Lazy Loading

☑ Code Splitting

☑ Memoization bila diperlukan

☑ Virtual List untuk data besar

☑ Optimized Image

Hindari render yang tidak diperlukan.

---

# 7.14 Routing Convention

Gunakan Routing yang konsisten.

Pisahkan.

- Public Route
- Protected Route
- Admin Route

Unauthorized User tidak boleh mengakses halaman yang tidak memiliki izin.

---

# 7.15 Error Handling Convention

Seluruh Error harus ditangani secara konsisten.

Contoh.

- API Error
- Validation Error
- Network Error
- Unauthorized
- Forbidden

Error tidak boleh hanya ditampilkan melalui `console.log()`.

---

# 7.16 Common Mistakes

❌ Business Logic di Component.

❌ HTTP Request langsung dari Component.

❌ Duplicate Component.

❌ Tidak ada Loading State.

❌ Tidak ada Empty State.

❌ Tidak Responsive.

❌ Tidak Accessible.

---

# 7.17 Best Practices

✅ Gunakan Existing Component.

✅ Gunakan Custom Hook.

✅ Gunakan API Service.

✅ Gunakan Design System.

✅ Fokus pada Reusability.

✅ Pisahkan UI dan Business Logic.

---

# 7.18 Frontend Convention Checklist

Sebelum membuat halaman.

☐ Menggunakan Existing Component.

☐ API melalui Service Layer.

☐ Business Logic berada di Hook.

☐ Responsive diperiksa.

☐ Accessibility diperiksa.

☐ Loading State tersedia.

☐ Error State tersedia.

☐ Empty State tersedia.

☐ Testing diperbarui.

---

# 7.19 Quick Reference

| Area | Standard |
|------|----------|
| Structure | Feature First |
| Component | UI Only |
| Hook | Business Logic |
| API | Service Layer |
| State | Local / Global / Server |
| Form | Validation |
| UI State | Loading, Empty, Error, Success |
| Responsive | Desktop, Tablet, Mobile |
| Accessibility | Required |
| Performance | Lazy Loading + Code Splitting |

---

# 7.20 Chapter Summary

Seluruh Frontend pada NIAHAIR ERP harus mengikuti konvensi yang sama agar mudah dikembangkan, diuji, dan dipelihara.

Prinsip utama.

✓ Gunakan struktur proyek resmi.

✓ Pisahkan UI, Hook, dan API Service.

✓ Gunakan Component yang reusable.

✓ Terapkan Responsive dan Accessibility.

✓ Selalu sediakan Loading, Error, Empty, dan Success State.

✓ Gunakan API sebagai satu-satunya sumber data.

Dengan konvensi ini, seluruh Frontend NIAHAIR ERP akan memiliki pola yang konsisten, mudah dipahami, dan siap berkembang menjadi aplikasi enterprise berskala besar.

# CHAPTER 8 — GIT CONVENTIONS

---

# 8.1 Purpose

Chapter ini mendefinisikan standar penggunaan Git pada proyek NIAHAIR ERP.

Seluruh anggota tim harus mengikuti konvensi yang sama dalam penggunaan Branch, Commit, Pull Request, Merge, dan Release.

Version Control harus mendukung kolaborasi yang aman, konsisten, dan mudah ditelusuri.

---

# 8.2 Git Principles

Seluruh workflow Git mengikuti prinsip.

✅ Small Changes

✅ Atomic Commit

✅ Traceable History

✅ Review Before Merge

✅ Stable Main Branch

Repository harus selalu berada dalam kondisi yang dapat di-build.

---

# 8.3 Branch Strategy

Gunakan struktur branch berikut.

```text
main

develop

feature/*

bugfix/*

hotfix/*

release/*
```

Setiap branch memiliki tujuan yang jelas.

---

# 8.4 Branch Naming Convention

Gunakan format.

```text
feature/customer-membership

feature/appointment-calendar

bugfix/payment-validation

hotfix/invoice-total

release/v1.2.0
```

Jangan.

```text
fix

new

testing

branch1

customerFix
```

---

# 8.5 Commit Convention

Gunakan format.

```text
type(scope): description
```

Contoh.

```text
feat(customer): add membership module

fix(invoice): correct total calculation

refactor(payment): simplify payment service

docs(api): update customer endpoint

test(customer): add unit tests

chore(ci): update github workflow
```

---

# 8.6 Commit Types

| Type | Purpose |
|--------|----------|
| feat | New Feature |
| fix | Bug Fix |
| refactor | Refactoring |
| docs | Documentation |
| test | Testing |
| style | Formatting |
| perf | Performance |
| chore | Maintenance |
| ci | CI/CD |
| build | Build System |

Gunakan tipe yang sesuai.

---

# 8.7 Commit Rules

Setiap commit harus.

☑ Fokus pada satu perubahan.

☑ Mudah dipahami.

☑ Dapat di-review.

☑ Dapat di-revert.

Hindari commit yang terlalu besar.

---

# 8.8 Pull Request Convention

Setiap Pull Request harus.

☑ Menjelaskan tujuan.

☑ Menjelaskan perubahan.

☑ Menjelaskan dampak.

☑ Menyertakan Testing.

☑ Menyertakan Screenshot jika Frontend berubah.

---

# 8.9 Code Review Convention

Sebelum Merge.

Pastikan.

☑ Coding Standards dipatuhi.

☑ Business Rules dipatuhi.

☑ Testing berhasil.

☑ Dokumentasi diperbarui.

☑ Tidak ada Conflict.

---

# 8.10 Merge Convention

Gunakan Merge setelah.

☑ Code Review selesai.

☑ CI berhasil.

☑ Testing berhasil.

☑ Approval diperoleh.

Main Branch harus selalu stabil.

---

# 8.11 Release Convention

Setiap Release harus.

☑ Memiliki Version.

☑ Memiliki Changelog.

☑ Memiliki Release Note.

☑ Memiliki Tag.

Contoh.

```text
v1.0.0

v1.1.0

v2.0.0
```

---

# 8.12 Hotfix Convention

Hotfix hanya digunakan untuk masalah Production.

Workflow.

```text
main

↓

hotfix/*

↓

Review

↓

Merge

↓

Release
```

Hotfix tidak digunakan untuk pengembangan fitur.

---

# 8.13 Conflict Resolution

Apabila terjadi Conflict.

☑ Update Branch.

☑ Resolve Conflict.

☑ Jalankan Testing.

☑ Lakukan Review ulang.

Jangan melakukan Merge tanpa memeriksa hasil Conflict.

---

# 8.14 Git Ignore Convention

File berikut tidak boleh masuk repository.

```text
node_modules/

.env

dist/

build/

coverage/

logs/

tmp/
```

Data sensitif tidak boleh di-commit.

---

# 8.15 Common Mistakes

❌ Commit terlalu besar.

❌ Commit tanpa Testing.

❌ Merge tanpa Review.

❌ Push langsung ke main.

❌ Menyimpan Secret di Repository.

❌ Commit file hasil build.

---

# 8.16 Best Practices

✅ Commit kecil dan fokus.

✅ Gunakan Conventional Commit.

✅ Review sebelum Merge.

✅ Jalankan Testing sebelum Push.

✅ Perbarui Branch secara berkala.

---

# 8.17 Git Convention Checklist

Sebelum Push.

☐ Branch sesuai.

☐ Commit Message sesuai.

☐ Testing berhasil.

☐ Build berhasil.

☐ Dokumentasi diperbarui.

☐ Tidak ada Secret.

☐ Tidak ada Conflict.

---

# 8.18 Quick Reference

| Area | Standard |
|------|----------|
| Main Branch | Stable |
| Develop Branch | Integration |
| Feature | feature/* |
| Bug Fix | bugfix/* |
| Hotfix | hotfix/* |
| Release | release/* |
| Commit | Conventional Commit |
| Review | Required |
| Merge | After Approval |
| Version | Semantic Versioning |

---

# 8.19 Git Workflow

```text
Create Branch

↓

Implement Feature

↓

Commit

↓

Push

↓

Pull Request

↓

Code Review

↓

Testing

↓

Merge

↓

Release
```

Seluruh perubahan mengikuti workflow ini.

---

# 8.20 Chapter Summary

Seluruh penggunaan Git pada NIAHAIR ERP harus mengikuti workflow yang konsisten.

Prinsip utama.

✓ Gunakan Branch sesuai tujuan.

✓ Gunakan Conventional Commit.

✓ Lakukan Code Review sebelum Merge.

✓ Jangan Push langsung ke Main.

✓ Jalankan Testing sebelum Merge.

✓ Gunakan Semantic Versioning untuk setiap Release.

Dengan konvensi ini, repository akan memiliki riwayat perubahan yang jelas, kolaborasi yang aman, dan proses release yang lebih terstruktur.

# CHAPTER 9 — DOCUMENTATION CONVENTIONS

---

# 9.1 Purpose

Chapter ini mendefinisikan standar dokumentasi yang berlaku untuk seluruh proyek NIAHAIR ERP.

Seluruh dokumentasi harus konsisten, mudah dipahami, mudah dicari, dan selalu sesuai dengan implementasi terbaru.

Dokumentasi merupakan bagian dari proyek dan wajib dipelihara seperti source code.

---

# 9.2 Documentation Principles

Seluruh dokumentasi mengikuti prinsip.

✅ Accurate

✅ Consistent

✅ Up-to-date

✅ Easy to Understand

✅ Version Controlled

Dokumentasi tidak boleh tertinggal dari implementasi.

---

# 9.3 Source of Truth

Setiap jenis informasi hanya memiliki satu dokumen resmi.

| Area | Source of Truth |
|------|-----------------|
| Business Flow | ERP Blueprint |
| Business Rule | Business Rules |
| Database | Data Dictionary |
| API | API Standards |
| Architecture | Architecture Decisions |
| Coding | Coding Standards |
| Testing | Testing Guide |
| Deployment | Deployment Runbook |
| AI | AI Development Guide |

Tidak boleh membuat dokumentasi dengan isi yang bertentangan.

---

# 9.4 Documentation Structure

Seluruh dokumentasi disimpan pada struktur berikut.

```text
docs/

├── blueprint/
├── business/
├── architecture/
├── database/
├── api/
├── development/
├── operations/
├── product/
├── ai/
└── assets/
```

Dokumentasi harus dikelompokkan berdasarkan kategori.

---

# 9.5 Documentation Naming

Gunakan.

```text
01_ERP_BLUEPRINT.md

02_BUSINESS_RULES.md

03_ARCHITECTURE_DECISIONS.md

...

20_AI_DEVELOPMENT_GUIDE.md
```

Gunakan penomoran agar urutan pembacaan konsisten.

---

# 9.6 Writing Convention

Dokumentasi harus.

☑ Menggunakan Bahasa Inggris untuk istilah teknis.

☑ Menggunakan istilah bisnis yang konsisten.

☑ Menggunakan Heading yang jelas.

☑ Menggunakan contoh bila diperlukan.

☑ Menggunakan tabel untuk informasi terstruktur.

Hindari paragraf yang terlalu panjang.

---

# 9.7 Documentation Update Rules

Dokumentasi wajib diperbarui apabila terjadi.

☑ Penambahan fitur.

☑ Perubahan Business Rule.

☑ Perubahan Database.

☑ Perubahan API.

☑ Perubahan Workflow.

☑ Perubahan Architecture.

☑ Perubahan Deployment.

---

# 9.8 Documentation Review

Sebelum Merge.

Pastikan.

☑ Dokumentasi masih sesuai.

☑ Tidak ada informasi usang.

☑ Contoh masih valid.

☑ Diagram masih sesuai implementasi.

---

# 9.9 Code Documentation

Source code harus diberi dokumentasi apabila.

- Business Logic kompleks.
- Algoritma tidak sederhana.
- Integrasi eksternal.
- Perhitungan bisnis.

Hindari komentar yang menjelaskan hal yang sudah jelas dari kode.

---

# 9.10 API Documentation

Seluruh endpoint harus memiliki.

☑ Endpoint.

☑ Method.

☑ Request.

☑ Response.

☑ Authentication.

☑ Authorization.

☑ Error Response.

☑ Example.

Swagger/OpenAPI harus selalu sinkron.

---

# 9.11 Database Documentation

Setiap perubahan database harus memperbarui.

☑ Data Dictionary.

☑ ERD.

☑ Migration.

☑ Relasi.

☑ Constraint.

---

# 9.12 User Documentation

Fitur baru yang digunakan pengguna harus diperbarui pada.

☑ User Manual.

☑ Operations Manual.

☑ Knowledge Base.

☑ FAQ.

---

# 9.13 Versioning Convention

Dokumentasi mengikuti versi proyek.

Perubahan besar harus dicatat pada.

☑ Release Notes.

☑ Changelog.

☑ Migration Notes.

Riwayat perubahan harus dapat ditelusuri.

---

# 9.14 Common Mistakes

❌ Dokumentasi tidak diperbarui.

❌ Informasi berbeda dengan implementasi.

❌ Contoh sudah tidak berlaku.

❌ Istilah tidak konsisten.

❌ Diagram tidak diperbarui.

---

# 9.15 Best Practices

✅ Dokumentasi diperbarui bersamaan dengan kode.

✅ Gunakan format yang konsisten.

✅ Berikan contoh implementasi.

✅ Gunakan tabel untuk data terstruktur.

✅ Lakukan review dokumentasi sebelum merge.

---

# 9.16 Documentation Convention Checklist

Sebelum menyelesaikan task.

☐ Dokumentasi relevan diperbarui.

☐ Tidak ada informasi usang.

☐ Contoh masih valid.

☐ Diagram diperiksa.

☐ Link antar dokumen masih benar.

☐ Changelog diperbarui bila diperlukan.

---

# 9.17 Documentation Lifecycle

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

Dokumentasi diperbarui sebelum Release.

---

# 9.18 Quick Reference

| Area | Standard |
|------|----------|
| Format | Markdown |
| Naming | Numbered Files |
| Source of Truth | One Document per Domain |
| API | Swagger + API Standards |
| Database | Data Dictionary |
| User Guide | Operations Manual |
| Version | Changelog + Release Notes |
| Review | Required Before Merge |

---

# 9.19 Golden Rules

✓ Dokumentasi adalah bagian dari source code.

✓ Setiap perubahan implementasi harus memicu pemeriksaan dokumentasi.

✓ Satu informasi hanya memiliki satu Source of Truth.

✓ Dokumentasi harus lebih mudah dipahami daripada implementasinya.

✓ Dokumentasi tidak boleh bertentangan dengan Business Rules.

---

# 9.20 Chapter Summary

Seluruh dokumentasi pada NIAHAIR ERP harus mengikuti standar yang sama agar tetap akurat, konsisten, dan mudah dipelihara.

Prinsip utama.

✓ Dokumentasi merupakan bagian dari proyek.

✓ Selalu perbarui dokumentasi saat implementasi berubah.

✓ Gunakan satu Source of Truth untuk setiap domain.

✓ Lakukan review dokumentasi sebelum Merge.

✓ Jaga konsistensi antara dokumentasi dan implementasi.

Dengan konvensi ini, dokumentasi NIAHAIR ERP akan tetap menjadi referensi utama bagi Developer, QA, DevOps, Product Owner, dan AI sepanjang siklus hidup proyek.

# CHAPTER 10 — TESTING CONVENTIONS

---

# 10.1 Purpose

Chapter ini mendefinisikan standar testing yang berlaku untuk seluruh proyek NIAHAIR ERP.

Seluruh perubahan source code harus disertai pengujian yang sesuai untuk menjaga kualitas, stabilitas, dan keandalan sistem.

Testing merupakan bagian dari Definition of Done.

---

# 10.2 Testing Principles

Seluruh testing mengikuti prinsip.

✅ Business Rule Driven

✅ Automated First

✅ Repeatable

✅ Reliable

✅ Independent

Testing harus memverifikasi perilaku sistem, bukan implementasi internal.

---

# 10.3 Source of Truth

Seluruh testing mengacu pada.

```text
Business Rules

↓

Testing Guide

↓

API Standards

↓

Data Dictionary

↓

Existing Test Cases
```

Business Rules menjadi dasar seluruh skenario pengujian.

---

# 10.4 Testing Pyramid

Gunakan komposisi testing berikut.

```text
        E2E
         ▲
 Integration
         ▲
    Unit Test
```

Prioritaskan Unit Test, kemudian Integration Test, dan gunakan E2E untuk alur bisnis utama.

---

# 10.5 Test Categories

Seluruh testing dikelompokkan menjadi.

| Test | Purpose |
|-------|---------|
| Unit Test | Menguji Business Logic |
| Integration Test | Menguji interaksi antar layer |
| API Test | Menguji REST API |
| Frontend Test | Menguji UI dan Component |
| E2E Test | Menguji Business Flow |
| Regression Test | Mencegah bug muncul kembali |
| Performance Test | Menguji performa |
| Security Test | Menguji aspek keamanan |

---

# 10.6 Unit Test Convention

Unit Test wajib dibuat untuk.

☑ Service.

☑ Utility.

☑ Helper.

☑ Business Calculation.

Unit Test tidak bergantung pada database atau layanan eksternal.

---

# 10.7 Integration Test Convention

Gunakan Integration Test untuk.

☑ Repository.

☑ Database Transaction.

☑ Prisma Query.

☑ External Integration yang telah di-mock.

Integration Test memastikan komunikasi antar layer berjalan dengan benar.

---

# 10.8 API Test Convention

Seluruh endpoint utama harus diuji.

Minimal mencakup.

☑ Success Response.

☑ Validation Error.

☑ Authentication.

☑ Authorization.

☑ Business Rule.

☑ Error Response.

---

# 10.9 Frontend Test Convention

Frontend minimal menguji.

☑ Component Rendering.

☑ Form Validation.

☑ User Interaction.

☑ Loading State.

☑ Error State.

☑ Empty State.

---

# 10.10 Regression Test Convention

Setiap bug yang diperbaiki wajib memiliki Regression Test.

Tujuannya.

- Mencegah bug yang sama muncul kembali.
- Menjamin stabilitas sistem.

Bug dianggap selesai setelah Regression Test ditambahkan.

---

# 10.11 Test Data Convention

Gunakan.

☑ Factory.

☑ Fixture.

☑ Seeder.

☑ Mock Data.

Hindari.

❌ Hardcode Test Data.

❌ Menggunakan Production Data.

---

# 10.12 Mock Convention

Mock hanya digunakan untuk.

- Accurate API.
- Cloudinary.
- WhatsApp.
- Email.
- Telegram.
- External Service.

Business Logic tidak boleh di-mock.

---

# 10.13 Test Coverage Convention

Target minimal.

| Area | Coverage |
|------|----------|
| Service | ≥ 90% |
| Utility | ≥ 90% |
| Repository | ≥ 80% |
| API | Endpoint utama diuji |
| Business Flow | 100% skenario kritis |

Coverage digunakan sebagai indikator kualitas, bukan tujuan utama.

---

# 10.14 Test Execution Convention

Sebelum Merge.

Pastikan.

☑ Seluruh test berhasil.

☑ Tidak ada flaky test.

☑ Tidak ada warning kritis.

☑ Build berhasil.

Perubahan tidak boleh di-merge apabila test gagal.

---

# 10.15 CI/CD Convention

CI Pipeline minimal menjalankan.

☑ Lint.

☑ Build.

☑ Unit Test.

☑ Integration Test.

☑ API Test.

Merge hanya diperbolehkan apabila seluruh pipeline berhasil.

---

# 10.16 Common Mistakes

❌ Tidak membuat test.

❌ Hanya menguji Success Case.

❌ Tidak menguji Business Rule.

❌ Hardcode Test Data.

❌ Tidak membuat Regression Test.

❌ Merge saat test gagal.

---

# 10.17 Best Practices

✅ Uji perilaku bisnis.

✅ Gunakan Factory dan Fixture.

✅ Tambahkan Regression Test untuk setiap bug.

✅ Jalankan seluruh test sebelum Merge.

✅ Perbarui test saat requirement berubah.

---

# 10.18 Testing Convention Checklist

Sebelum menyelesaikan task.

☐ Unit Test dibuat.

☐ Integration Test diperbarui.

☐ API Test diperbarui.

☐ Frontend Test diperbarui.

☐ Regression Test ditambahkan bila perlu.

☐ Seluruh test berhasil.

☐ Build berhasil.

☐ CI Pipeline lulus.

---

# 10.19 Quick Reference

| Area | Standard |
|------|----------|
| Unit Test | Business Logic |
| Integration Test | Layer Interaction |
| API Test | Endpoint |
| Frontend Test | Component & UI |
| Regression Test | Bug Fix |
| Mock | External Service Only |
| Test Data | Factory / Fixture |
| Merge | Semua Test Lulus |
| CI | Wajib |

---

# 10.20 Golden Rules

✓ Testing adalah bagian dari Definition of Done.

✓ Setiap perubahan harus dievaluasi dampaknya terhadap testing.

✓ Business Rule menjadi dasar seluruh skenario pengujian.

✓ Bug Fix wajib memiliki Regression Test.

✓ Tidak ada Merge apabila testing gagal.

---

# 10.21 Chapter Summary

Seluruh testing pada NIAHAIR ERP harus mengikuti standar yang konsisten untuk menjaga kualitas sistem.

Prinsip utama.

✓ Gunakan Testing Pyramid.

✓ Uji Business Rule, bukan implementasi.

✓ Tambahkan Regression Test untuk setiap bug.

✓ Gunakan Factory dan Mock sesuai kebutuhan.

✓ Jalankan seluruh testing sebelum Merge.

Dengan konvensi ini, setiap perubahan pada NIAHAIR ERP akan divalidasi secara konsisten sehingga risiko regresi, bug produksi, dan inkonsistensi sistem dapat diminimalkan.

# CHAPTER 11 — SECURITY CONVENTIONS

---

# 11.1 Purpose

Chapter ini mendefinisikan standar keamanan yang berlaku untuk seluruh proyek NIAHAIR ERP.

Seluruh developer, AI, QA, dan DevOps wajib mengikuti konvensi keamanan ini agar sistem tetap aman, andal, dan sesuai dengan praktik terbaik.

Security merupakan bagian dari desain sistem sejak awal, bukan fitur yang ditambahkan di akhir.

---

# 11.2 Security Principles

Seluruh sistem mengikuti prinsip.

✅ Security by Default

✅ Least Privilege

✅ Defense in Depth

✅ Zero Trust

✅ Secure by Design

Seluruh fitur harus dirancang dengan mempertimbangkan keamanan.

---

# 11.3 Source of Truth

Seluruh implementasi keamanan mengacu pada.

```text
Business Rules

↓

Security Guide

↓

Architecture Decisions

↓

API Standards

↓

Project Conventions
```

---

# 11.4 Authentication Convention

Seluruh pengguna wajib diautentikasi.

Gunakan.

☑ JWT

☑ Access Token

☑ Refresh Token (bila diterapkan)

☑ Session Expiration

Endpoint publik harus ditentukan secara eksplisit.

---

# 11.5 Authorization Convention

Seluruh akses berdasarkan.

☑ Role

☑ Permission

☑ Ownership (bila diperlukan)

Contoh Role.

```text
Owner

Manager

Admin

Cashier

Stylist

Warehouse

Production
```

Authorization diperiksa sebelum Business Logic dijalankan.

---

# 11.6 Password Convention

Password harus.

☑ Di-hash menggunakan algoritma yang aman.

☑ Tidak pernah disimpan dalam bentuk plaintext.

☑ Tidak pernah dikirim kembali melalui API.

Password tidak boleh dicatat pada log.

---

# 11.7 Secret Management

Seluruh Secret disimpan pada.

```text
Environment Variables
```

Contoh.

```text
DATABASE_URL

JWT_SECRET

ACCURATE_SECRET

CLOUDINARY_SECRET

SMTP_PASSWORD
```

Secret tidak boleh di-commit ke repository.

---

# 11.8 Input Validation

Seluruh input wajib divalidasi.

Minimal.

☑ Required Field

☑ Type

☑ Enum

☑ UUID

☑ Length

☑ Format

Backend tetap melakukan validasi meskipun Frontend sudah memvalidasi.

---

# 11.9 Data Protection

Data sensitif harus dilindungi.

Contoh.

- Password
- Access Token
- Refresh Token
- API Key
- Secret
- Session

Data sensitif tidak boleh ditampilkan pada Response maupun Log.

---

# 11.10 API Security

Seluruh endpoint harus.

☑ Authentication.

☑ Authorization.

☑ Validation.

☑ Rate Limiting.

☑ HTTPS.

Endpoint sensitif memerlukan pemeriksaan hak akses.

---

# 11.11 Database Security

Database harus.

☑ Menggunakan Foreign Key.

☑ Menggunakan Constraint.

☑ Menggunakan Transaction.

☑ Menggunakan Parameterized Query melalui ORM.

Tidak boleh membangun query SQL secara manual dari input pengguna.

---

# 11.12 Logging Convention

Log hanya menyimpan informasi yang diperlukan.

Jangan mencatat.

❌ Password.

❌ Token.

❌ Secret.

❌ API Key.

❌ Data sensitif pelanggan.

Gunakan Log untuk troubleshooting, bukan penyimpanan data.

---

# 11.13 File Upload Convention

Seluruh file upload harus.

☑ Memvalidasi tipe file.

☑ Memvalidasi ukuran file.

☑ Menggunakan nama file yang aman.

☑ Disimpan pada storage yang ditentukan.

Jangan mempercayai nama file dari pengguna.

---

# 11.14 External Integration Security

Seluruh integrasi eksternal harus.

☑ Menggunakan HTTPS.

☑ Menyimpan Secret secara aman.

☑ Memiliki Timeout.

☑ Menangani Retry dengan aman.

☑ Menangani Error tanpa membocorkan informasi internal.

---

# 11.15 Dependency Security

Dependency harus.

☑ Berasal dari sumber terpercaya.

☑ Dipantau pembaruannya.

☑ Dievaluasi sebelum ditambahkan.

Hindari dependency yang tidak diperlukan.

---

# 11.16 Common Mistakes

❌ Menyimpan Secret di Git.

❌ Password plaintext.

❌ Tidak melakukan Authorization.

❌ Tidak memvalidasi input.

❌ Menampilkan Error internal ke pengguna.

❌ Logging data sensitif.

---

# 11.17 Best Practices

✅ Validasi seluruh input.

✅ Gunakan HTTPS.

✅ Gunakan Environment Variable.

✅ Terapkan Least Privilege.

✅ Lakukan Review keamanan secara berkala.

---

# 11.18 Security Convention Checklist

Sebelum Release.

☐ Authentication diperiksa.

☐ Authorization diperiksa.

☐ Input Validation tersedia.

☐ Secret aman.

☐ HTTPS digunakan.

☐ Log aman.

☐ File Upload aman.

☐ Dependency diperiksa.

---

# 11.19 Quick Reference

| Area | Standard |
|------|----------|
| Authentication | JWT |
| Authorization | Role + Permission |
| Password | Secure Hash |
| Secret | Environment Variable |
| API | HTTPS + Validation |
| Database | Parameterized Query |
| Upload | Validate File |
| Logging | No Sensitive Data |
| Dependency | Trusted Source |

---

# 11.20 Golden Rules

✓ Jangan pernah menyimpan Secret di repository.

✓ Jangan pernah menyimpan Password dalam bentuk plaintext.

✓ Seluruh input harus divalidasi.

✓ Seluruh endpoint sensitif harus memiliki Authentication dan Authorization.

✓ Jangan pernah mengekspos informasi internal melalui API maupun Log.

✓ Security merupakan tanggung jawab seluruh anggota tim.

---

# 11.21 Chapter Summary

Keamanan merupakan bagian fundamental dari NIAHAIR ERP dan harus diterapkan pada seluruh aspek pengembangan.

Prinsip utama.

✓ Bangun sistem dengan Security by Default.

✓ Terapkan Authentication dan Authorization secara konsisten.

✓ Lindungi Secret dan data sensitif.

✓ Validasi seluruh input.

✓ Gunakan komunikasi yang aman.

✓ Lakukan review keamanan sebelum Release.

Dengan konvensi ini, seluruh anggota tim memiliki standar keamanan yang sama sehingga NIAHAIR ERP tetap aman, andal, dan siap digunakan pada lingkungan production.

# CHAPTER 12 — PERFORMANCE CONVENTIONS

---

# 12.1 Purpose

Chapter ini mendefinisikan standar performa yang berlaku untuk seluruh proyek NIAHAIR ERP.

Seluruh implementasi harus mempertimbangkan efisiensi penggunaan CPU, Memory, Database, Network, dan Storage agar sistem tetap responsif dan mampu berkembang seiring pertumbuhan data.

Performa harus dirancang sejak awal, bukan diperbaiki setelah sistem menjadi lambat.

---

# 12.2 Performance Principles

Seluruh sistem mengikuti prinsip.

✅ Performance by Design

✅ Scalability

✅ Efficiency

✅ Resource Awareness

✅ Measurable

Optimasi dilakukan berdasarkan kebutuhan nyata dan hasil pengukuran.

---

# 12.3 Source of Truth

Seluruh optimasi mengacu pada.

```text
Business Rules

↓

Architecture Decisions

↓

Database Convention

↓

API Standards

↓

Monitoring Guide
```

Optimasi tidak boleh mengubah Business Rule.

---

# 12.4 Database Performance

Database harus.

☑ Menggunakan Index.

☑ Menggunakan Pagination.

☑ Menghindari Full Table Scan.

☑ Menghindari N+1 Query.

☑ Menggunakan Transaction secara efisien.

Query harus dirancang untuk volume data yang besar.

---

# 12.5 API Performance

Endpoint harus.

☑ Mengembalikan data yang diperlukan saja.

☑ Mendukung Pagination.

☑ Mendukung Filter.

☑ Mendukung Sorting.

☑ Menghindari Query berulang.

Response harus seefisien mungkin.

---

# 12.6 Frontend Performance

Frontend harus.

☑ Lazy Loading.

☑ Code Splitting.

☑ Dynamic Import.

☑ Optimized Asset.

☑ Virtual List untuk data besar.

Render yang tidak diperlukan harus dihindari.

---

# 12.7 Memory Management

Seluruh aplikasi harus.

☑ Membersihkan Resource.

☑ Menghindari Memory Leak.

☑ Mengelola Cache dengan benar.

☑ Melepaskan Object yang tidak digunakan.

Gunakan memori secara efisien.

---

# 12.8 Background Processing

Pekerjaan berat sebaiknya diproses secara asynchronous.

Contoh.

- Sinkronisasi Accurate.
- Import Data.
- Export Data.
- Generate Report.
- Kirim Email.
- Kirim WhatsApp.

Proses yang lama tidak boleh memblokir request pengguna.

---

# 12.9 Caching Convention

Cache digunakan untuk.

☑ Data referensi.

☑ Konfigurasi.

☑ Lookup yang sering digunakan.

☑ Query yang mahal.

Cache harus memiliki strategi invalidasi yang jelas.

---

# 12.10 File Performance

File yang besar harus.

☑ Diproses secara bertahap.

☑ Menggunakan Streaming bila memungkinkan.

☑ Menghindari pembacaan seluruh file ke memori.

---

# 12.11 Network Performance

Komunikasi jaringan harus.

☑ Mengurangi jumlah request.

☑ Menggunakan kompresi bila tersedia.

☑ Menggunakan Timeout.

☑ Menggunakan Retry secara terkontrol.

Hindari request yang tidak diperlukan.

---

# 12.12 External Integration Performance

Integrasi eksternal harus.

☑ Memiliki Timeout.

☑ Memiliki Retry Policy.

☑ Memiliki Circuit Breaker (jika diterapkan).

☑ Tidak memblokir proses utama.

Kegagalan layanan eksternal tidak boleh membuat seluruh sistem berhenti.

---

# 12.13 Monitoring Performance

Performa harus dipantau.

Minimal.

☑ API Response Time.

☑ Database Query Time.

☑ Memory Usage.

☑ CPU Usage.

☑ Queue Length.

☑ Error Rate.

Optimasi dilakukan berdasarkan hasil monitoring.

---

# 12.14 Common Mistakes

❌ Mengambil seluruh data tanpa Pagination.

❌ Query berulang (N+1).

❌ Render ulang yang tidak perlu.

❌ Tidak menggunakan Index.

❌ Memproses file besar di memori sekaligus.

❌ Tidak memberikan Timeout pada integrasi eksternal.

---

# 12.15 Best Practices

✅ Optimalkan query.

✅ Gunakan Pagination.

✅ Gunakan Lazy Loading.

✅ Gunakan Cache bila sesuai.

✅ Proses pekerjaan berat di Background.

✅ Pantau performa secara berkala.

---

# 12.16 Performance Convention Checklist

Sebelum Release.

☐ Query telah diperiksa.

☐ Pagination tersedia.

☐ Index sesuai.

☐ Render diperiksa.

☐ Lazy Loading diterapkan bila perlu.

☐ Timeout tersedia.

☐ Monitoring dikonfigurasi.

☐ Tidak ada bottleneck yang diketahui.

---

# 12.17 Quick Reference

| Area | Standard |
|------|----------|
| Database | Index + Pagination |
| API | Filter + Sort + Pagination |
| Frontend | Lazy Loading |
| Background Job | Queue / Async |
| Cache | Reference Data |
| File | Streaming |
| External API | Timeout + Retry |
| Monitoring | Required |

---

# 12.18 Performance Lifecycle

```text
Requirement

↓

Design

↓

Implementation

↓

Performance Review

↓

Testing

↓

Monitoring

↓

Optimization
```

Performa dievaluasi sepanjang siklus pengembangan.

---

# 12.19 Golden Rules

✓ Optimasi berdasarkan data, bukan asumsi.

✓ Hindari optimasi prematur.

✓ Pagination wajib untuk data besar.

✓ Query harus efisien.

✓ Gunakan Background Job untuk proses yang berat.

✓ Monitoring merupakan bagian dari performa.

---

# 12.20 Chapter Summary

Seluruh implementasi pada NIAHAIR ERP harus mempertimbangkan performa sejak tahap perancangan.

Prinsip utama.

✓ Bangun sistem yang scalable.

✓ Optimalkan Database dan API.

✓ Gunakan Lazy Loading pada Frontend.

✓ Jalankan proses berat secara asynchronous.

✓ Pantau performa secara berkelanjutan.

Dengan konvensi ini, NIAHAIR ERP akan tetap responsif, efisien, dan mampu menangani pertumbuhan pengguna serta volume data tanpa memerlukan perubahan arsitektur yang besar.

# CHAPTER 13 — AI CONVENTIONS

---

# 13.1 Purpose

Chapter ini mendefinisikan standar penggunaan Artificial Intelligence (AI) dalam pengembangan NIAHAIR ERP.

Seluruh AI Coding Assistant harus mengikuti aturan proyek agar menghasilkan implementasi yang konsisten, aman, dan sesuai dengan standar engineering yang telah ditetapkan.

AI merupakan alat bantu pengembangan, bukan pengambil keputusan bisnis.

---

# 13.2 AI Principles

Seluruh penggunaan AI mengikuti prinsip.

✅ Human Supervised

✅ Documentation Driven

✅ Business First

✅ Consistency

✅ Transparency

Keputusan akhir tetap berada pada tim pengembang.

---

# 13.3 AI Source of Truth

Sebelum menghasilkan solusi.

AI wajib mengacu pada.

```text
Business Rules

↓

ERP Blueprint

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

↓

Existing Source Code
```

Prompt pengguna tidak boleh mengabaikan dokumentasi proyek.

---

# 13.4 AI Responsibilities

AI digunakan untuk.

☑ Membantu implementasi.

☑ Membantu refactoring.

☑ Membantu dokumentasi.

☑ Membantu testing.

☑ Membantu analisis.

☑ Membantu review.

AI tidak menentukan aturan bisnis.

---

# 13.5 Human Responsibilities

Developer bertanggung jawab untuk.

☑ Review hasil AI.

☑ Validasi Business Rule.

☑ Validasi Security.

☑ Validasi Performance.

☑ Approval sebelum Merge.

AI tidak menggantikan proses Code Review.

---

# 13.6 AI Development Workflow

Setiap task mengikuti alur.

```text
Requirement

↓

Context Loading

↓

Analysis

↓

Implementation

↓

Testing

↓

Documentation

↓

Self Review

↓

Human Review

↓

Merge
```

AI tidak boleh melewati tahapan tersebut.

---

# 13.7 AI Scope

AI diperbolehkan membantu.

- Backend.
- Frontend.
- Database.
- API.
- Testing.
- Documentation.
- Refactoring.

AI tidak boleh melakukan perubahan langsung pada Production.

---

# 13.8 AI Restrictions

AI dilarang.

❌ Mengubah Business Rule.

❌ Mengubah Architecture tanpa persetujuan.

❌ Menghapus fitur tanpa instruksi.

❌ Mengubah Database tanpa Migration.

❌ Mengubah API Contract tanpa kebutuhan bisnis.

❌ Menyimpan Secret.

---

# 13.9 AI Review Convention

Seluruh hasil AI wajib diperiksa.

Minimal.

☑ Business Rule.

☑ Security.

☑ Performance.

☑ Testing.

☑ Documentation.

☑ Code Quality.

---

# 13.10 AI Prompt Convention

Prompt yang diberikan kepada AI harus.

☑ Memiliki tujuan yang jelas.

☑ Menyebutkan module.

☑ Menyebutkan requirement.

☑ Menyebutkan constraint.

☑ Menyebutkan output yang diharapkan.

Prompt yang jelas menghasilkan implementasi yang lebih konsisten.

---

# 13.11 AI Documentation Convention

Apabila AI membuat perubahan.

Periksa apakah perlu memperbarui.

☑ Business Rules.

☑ Data Dictionary.

☑ API Standards.

☑ Testing Guide.

☑ User Manual.

☑ Changelog.

---

# 13.12 AI Security Convention

AI tidak boleh.

❌ Menampilkan Secret.

❌ Menyimpan Password.

❌ Menulis API Key.

❌ Menghasilkan kode yang mengabaikan validasi.

Keamanan tetap menjadi prioritas.

---

# 13.13 AI Quality Convention

Hasil AI harus memenuhi.

☑ Coding Standards.

☑ Architecture Decisions.

☑ API Standards.

☑ Testing Convention.

☑ Documentation Convention.

Seluruh output AI harus dapat direview dan dipelihara.

---

# 13.14 AI Usage Log

Penggunaan AI sebaiknya dapat ditelusuri.

Contoh.

- AI yang digunakan.
- Tanggal penggunaan.
- Tujuan penggunaan.
- Ringkasan perubahan.

Hal ini membantu proses audit dan knowledge sharing.

---

# 13.15 Common Mistakes

❌ Langsung menerima hasil AI.

❌ Tidak melakukan Code Review.

❌ Tidak menjalankan Testing.

❌ Tidak memperbarui Dokumentasi.

❌ Menggunakan AI tanpa konteks proyek.

---

# 13.16 Best Practices

✅ Berikan konteks yang lengkap.

✅ Gunakan dokumentasi proyek.

✅ Review seluruh hasil AI.

✅ Jalankan Testing.

✅ Perbarui Dokumentasi.

---

# 13.17 AI Convention Checklist

Sebelum Merge.

☑ AI mengikuti dokumentasi proyek.

☑ Business Rule diperiksa.

☑ Testing berhasil.

☑ Dokumentasi diperbarui.

☑ Code Review selesai.

☑ Security diperiksa.

☑ Performance diperiksa.

---

# 13.18 Quick Reference

| Area | Standard |
|------|----------|
| Source of Truth | Project Documentation |
| Decision Maker | Human |
| AI Role | Assistant |
| Review | Required |
| Testing | Required |
| Documentation | Required |
| Security | Required |
| Merge | Human Approval |

---

# 13.19 Golden Rules

✓ AI membantu implementasi, bukan menggantikan developer.

✓ Dokumentasi proyek selalu menjadi acuan utama.

✓ Seluruh hasil AI wajib melalui Human Review.

✓ AI tidak boleh mengubah Business Rule tanpa instruksi.

✓ AI tidak boleh melewati Testing dan Documentation.

✓ Keputusan akhir selalu berada pada manusia.

---

# 13.20 Chapter Summary

AI merupakan bagian dari workflow pengembangan NIAHAIR ERP dan harus digunakan secara terstruktur.

Prinsip utama.

✓ Gunakan AI sebagai alat bantu engineering.

✓ Selalu berikan konteks proyek.

✓ Selalu lakukan Human Review.

✓ Selalu lakukan Testing.

✓ Selalu perbarui Dokumentasi.

✓ AI mengikuti standar proyek, bukan sebaliknya.

Dengan konvensi ini, seluruh AI yang digunakan pada proyek akan menghasilkan implementasi yang konsisten, aman, dapat diaudit, dan tetap berada di bawah kendali tim engineering.

# CHAPTER 14 — GOLDEN RULES

---

# 14.1 Purpose

Chapter ini mendefinisikan aturan utama (Golden Rules) yang berlaku untuk seluruh proyek NIAHAIR ERP.

Golden Rules merupakan prinsip yang harus dipatuhi oleh seluruh anggota tim, termasuk Developer, QA Engineer, DevOps Engineer, Product Owner, dan AI Coding Assistant.

Apabila terjadi konflik antara preferensi individu dan Golden Rules, maka Golden Rules selalu menjadi prioritas.

---

# 14.2 Business Rules First

Business Rules adalah prioritas tertinggi.

Seluruh implementasi harus mengikuti.

☑ Business Rules

☑ ERP Blueprint

☑ Project Conventions

☑ Architecture Decisions

Tidak ada implementasi teknis yang boleh mengubah aturan bisnis tanpa persetujuan.

---

# 14.3 Convention Over Preference

Gunakan standar proyek.

Jangan membuat standar sendiri.

Seluruh implementasi harus mengikuti.

☑ Naming Convention

☑ Folder Structure

☑ API Convention

☑ Database Convention

☑ Testing Convention

☑ Security Convention

---

# 14.4 Reuse Before Create

Sebelum membuat sesuatu yang baru.

Selalu periksa.

☑ Existing Module

☑ Existing Component

☑ Existing Service

☑ Existing Hook

☑ Existing Utility

Jangan membuat duplicate code.

---

# 14.5 Documentation Before Assumption

Jika informasi belum jelas.

Lakukan.

☑ Baca dokumentasi.

☑ Baca Business Rules.

☑ Baca Existing Code.

☑ Klarifikasi jika diperlukan.

Jangan membuat asumsi.

---

# 14.6 Testing Before Merge

Tidak ada perubahan yang boleh di-merge tanpa testing yang sesuai.

Minimal.

☑ Unit Test

☑ Integration Test

☑ API Test

☑ Regression Test (jika diperlukan)

---

# 14.7 Documentation Before Release

Perubahan implementasi harus diikuti pemeriksaan dokumentasi.

Periksa.

☑ Business Rules

☑ Data Dictionary

☑ API Standards

☑ User Manual

☑ Changelog

☑ Release Notes

---

# 14.8 Security by Default

Setiap fitur harus mempertimbangkan keamanan.

Minimal.

☑ Authentication

☑ Authorization

☑ Input Validation

☑ Secret Management

☑ Secure Logging

---

# 14.9 Performance by Design

Setiap implementasi harus mempertimbangkan performa.

Periksa.

☑ Query

☑ API

☑ Rendering

☑ Memory

☑ Background Process

☑ Scalability

---

# 14.10 Human Review Required

Seluruh perubahan penting harus melalui Human Review.

Minimal.

☑ Business Rule

☑ Security

☑ Architecture

☑ Performance

☑ Database

☑ Production Release

AI membantu implementasi, bukan menggantikan proses review.

---

# 14.11 Definition of Done

Task dianggap selesai apabila.

☑ Requirement selesai.

☑ Business Rule sesuai.

☑ Build berhasil.

☑ Testing berhasil.

☑ Dokumentasi diperbarui.

☑ Code Review selesai.

☑ Tidak ada Critical Issue.

---

# 14.12 Never Do

Seluruh anggota tim dilarang.

❌ Mengubah Business Rule tanpa persetujuan.

❌ Mengubah Database tanpa Migration.

❌ Mengubah API Contract tanpa analisis.

❌ Menghapus Testing.

❌ Menghapus Dokumentasi.

❌ Menyimpan Secret di Repository.

❌ Push langsung ke Main Branch.

❌ Merge saat CI gagal.

---

# 14.13 Always Do

Seluruh anggota tim wajib.

✅ Mengikuti dokumentasi proyek.

✅ Menggunakan Existing Pattern.

✅ Membuat Testing.

✅ Memperbarui Dokumentasi.

✅ Menjalankan Code Review.

✅ Menjaga konsistensi proyek.

---

# 14.14 Project Constitution

Seluruh proyek mengikuti konstitusi berikut.

1. Business Rule adalah sumber kebenaran utama.
2. Dokumentasi lebih penting daripada asumsi.
3. Konsistensi lebih penting daripada preferensi pribadi.
4. Reuse lebih baik daripada membuat ulang.
5. Testing adalah bagian dari implementasi.
6. Dokumentasi adalah bagian dari Definition of Done.
7. Security bukan fitur tambahan.
8. Performance harus dipertimbangkan sejak desain.
9. AI adalah alat bantu, bukan pengambil keputusan.
10. Kualitas lebih penting daripada kecepatan.

---

# 14.15 Decision Priority

Seluruh keputusan mengikuti urutan berikut.

```text
Business Rules

↓

Architecture

↓

Project Conventions

↓

Coding Standards

↓

Implementation

↓

Optimization
```

Optimization tidak boleh mengorbankan Business Rule maupun Architecture.

---

# 14.16 Compliance Checklist

Sebelum Merge.

☐ Business Rule sesuai.

☐ Architecture sesuai.

☐ Project Convention dipatuhi.

☐ Testing berhasil.

☐ Security diperiksa.

☐ Performance diperiksa.

☐ Dokumentasi diperbarui.

☐ Code Review selesai.

☐ CI berhasil.

---

# 14.17 Quick Reference

| Rule | Status |
|------|--------|
| Business Rules | Highest Priority |
| Documentation | Required |
| Testing | Required |
| Security | Required |
| Performance | Required |
| Human Review | Required |
| CI/CD | Must Pass |
| AI | Assistant Only |

---

# 14.18 Golden Rules Summary

Seluruh pengembangan NIAHAIR ERP harus mengikuti prinsip berikut.

✓ Business Rule adalah prioritas utama.

✓ Dokumentasi selalu menjadi acuan.

✓ Gunakan standar proyek.

✓ Gunakan kembali implementasi yang sudah ada.

✓ Jangan membuat asumsi.

✓ Testing wajib sebelum Merge.

✓ Dokumentasi wajib sebelum Release.

✓ Security dan Performance harus dipertimbangkan sejak awal.

✓ Human Review tetap menjadi keputusan akhir.

✓ Kualitas lebih penting daripada kecepatan.

---

# 14.19 Chapter Summary

Golden Rules merupakan aturan tertinggi dalam proyek NIAHAIR ERP.

Seluruh anggota tim dan AI wajib mematuhi aturan ini pada setiap tahap pengembangan.

Dengan menerapkan Golden Rules secara konsisten, proyek akan tetap memiliki kualitas tinggi, mudah dipelihara, aman, dan mampu berkembang dalam jangka panjang tanpa kehilangan konsistensi engineering.

# CHAPTER 15 — PROJECT CHEAT SHEET

---

# 15.1 Purpose

Chapter ini merupakan ringkasan seluruh Project Conventions.

Gunakan sebagai referensi cepat sebelum memulai pekerjaan pada proyek NIAHAIR ERP.

---

# 15.2 Engineering Workflow

Seluruh pekerjaan mengikuti workflow berikut.

```text
Requirement

↓

Business Analysis

↓

Architecture Review

↓

Implementation

↓

Testing

↓

Documentation

↓

Code Review

↓

Merge

↓

Release

↓

Monitoring
```

Tidak ada tahapan yang boleh dilewati.

---

# 15.3 Project Priority

Apabila terjadi konflik.

Gunakan urutan berikut.

```text
Business Rules

↓

ERP Blueprint

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

↓

AI Development Guide

↓

Implementation
```

Dokumen dengan prioritas lebih tinggi selalu menjadi acuan.

---

# 15.4 Before Coding Checklist

Sebelum membuat kode.

☐ Requirement dipahami.

☐ Business Rule ditemukan.

☐ Existing Pattern diperiksa.

☐ Architecture dipahami.

☐ Tidak ada implementasi serupa.

☐ Impact Analysis selesai.

---

# 15.5 Backend Rules

☑ Business Logic di Service.

☑ Database melalui Repository.

☑ Gunakan DTO.

☑ Gunakan Validation.

☑ Gunakan Repository Pattern.

☑ Gunakan Transaction bila diperlukan.

---

# 15.6 Database Rules

☑ UUID sebagai Primary Key.

☑ Decimal untuk uang.

☑ Enum untuk Status.

☑ Gunakan Migration.

☑ Gunakan Foreign Key.

☑ Gunakan Index.

☑ Soft Delete bila sesuai.

---

# 15.7 API Rules

☑ RESTful Endpoint.

☑ DTO.

☑ Validation.

☑ Response Standard.

☑ Authentication.

☑ Authorization.

☑ Pagination.

☑ Swagger.

---

# 15.8 Frontend Rules

☑ Existing Component.

☑ Custom Hook.

☑ API Service.

☑ Responsive.

☑ Accessibility.

☑ Loading State.

☑ Error State.

☑ Empty State.

---

# 15.9 Git Rules

☑ Feature Branch.

☑ Conventional Commit.

☑ Pull Request.

☑ Code Review.

☑ CI/CD Pass.

☑ Merge.

---

# 15.10 Testing Rules

☑ Unit Test.

☑ Integration Test.

☑ API Test.

☑ Frontend Test.

☑ Regression Test.

☑ CI Pipeline.

---

# 15.11 Documentation Rules

Periksa apakah perlu memperbarui.

☑ Business Rules.

☑ Blueprint.

☑ Data Dictionary.

☑ API Standards.

☑ Swagger.

☑ User Manual.

☑ Changelog.

☑ Release Notes.

---

# 15.12 Security Rules

☑ JWT.

☑ Authorization.

☑ Validation.

☑ Environment Variable.

☑ HTTPS.

☑ Secure Logging.

☑ No Secret in Git.

---

# 15.13 Performance Rules

☑ Pagination.

☑ Index.

☑ Lazy Loading.

☑ Background Job.

☑ Cache.

☑ Timeout.

☑ Monitoring.

---

# 15.14 AI Rules

☑ AI mengikuti dokumentasi proyek.

☑ AI mengikuti Business Rules.

☑ AI membantu implementasi.

☑ AI tidak mengambil keputusan bisnis.

☑ Human Review tetap wajib.

---

# 15.15 Definition of Done

Task dianggap selesai apabila.

☑ Requirement selesai.

☑ Business Rule sesuai.

☑ Build berhasil.

☑ Testing berhasil.

☑ Dokumentasi diperbarui.

☑ Code Review selesai.

☑ CI berhasil.

☑ Tidak ada Critical Issue.

---

# 15.16 Project Constitution

Seluruh proyek mengikuti aturan berikut.

1. Business Rules First.
2. Convention Over Preference.
3. Reuse Before Create.
4. Documentation Before Assumption.
5. Testing Before Merge.
6. Documentation Before Release.
7. Security by Default.
8. Performance by Design.
9. Human Review Required.
10. Quality Over Speed.

---

# 15.17 Quick Decision Matrix

| Question | Answer |
|----------|--------|
| Business Logic? | Service |
| Database Access? | Repository |
| Database Change? | Migration |
| Money Type? | Decimal |
| API Endpoint? | RESTful |
| Validation? | DTO + Validation |
| UI? | Existing Component |
| API Call? | Service Layer |
| Bug Fix? | Add Regression Test |
| Documentation? | Always Check |
| Merge? | After Review & CI Pass |

---

# 15.18 Project Lifecycle

```text
Business Requirement

↓

Business Rules

↓

Architecture

↓

Implementation

↓

Testing

↓

Documentation

↓

Review

↓

Release

↓

Monitoring

↓

Continuous Improvement
```

Seluruh perubahan mengikuti lifecycle ini.

---

# 15.19 Core Values

Seluruh anggota tim wajib memegang nilai berikut.

✓ Business First.

✓ Consistency Over Preference.

✓ Simplicity Over Complexity.

✓ Reuse Before Create.

✓ Documentation as Code.

✓ Security by Default.

✓ Performance by Design.

✓ Test Before Release.

✓ Continuous Improvement.

✓ Long-Term Maintainability.

---

# 15.20 Chapter Summary

Project Conventions merupakan pedoman utama seluruh proses engineering pada NIAHAIR ERP.

Prinsip utama.

✓ Ikuti Business Rules.

✓ Ikuti Architecture.

✓ Ikuti Project Conventions.

✓ Gunakan Existing Pattern.

✓ Lakukan Testing.

✓ Perbarui Dokumentasi.

✓ Terapkan Security dan Performance sejak awal.

✓ Gunakan AI sebagai alat bantu, bukan pengambil keputusan.

✓ Selalu lakukan Code Review sebelum Merge.

✓ Utamakan kualitas, konsistensi, dan maintainability.

Dengan mengikuti Project Conventions ini, seluruh anggota tim—Developer, QA, DevOps, Product Owner, maupun AI Coding Assistant—akan bekerja menggunakan standar yang sama sehingga NIAHAIR ERP tetap konsisten, mudah dikembangkan, aman, dan siap berkembang menjadi sistem ERP enterprise dalam jangka panjang.

