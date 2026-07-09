# 08_CODING_STANDARDS.md

# CHAPTER 1 — INTRODUCTION

---

# 1.1 Purpose

Dokumen ini mendefinisikan standar penulisan kode (Coding Standards) untuk seluruh project NIAHAIR ERP.

Seluruh Backend, Frontend, Database, API, Integration, Testing, maupun AI Generated Code wajib mengikuti aturan pada dokumen ini.

Tujuan utama Coding Standards adalah memastikan seluruh source code memiliki kualitas yang konsisten, mudah dipahami, mudah dipelihara, serta dapat dikembangkan oleh banyak developer tanpa menghasilkan gaya implementasi yang berbeda.

---

# 1.2 Objectives

Coding Standards dibuat untuk:

- Menyamakan gaya penulisan kode.
- Mengurangi technical debt.
- Mempermudah code review.
- Mempermudah onboarding developer baru.
- Memastikan hasil AI Coding konsisten.
- Mengurangi bug akibat implementasi yang berbeda.
- Mempermudah refactoring.
- Menjaga kualitas project dalam jangka panjang.

---

# 1.3 Scope

Dokumen ini berlaku untuk seluruh project NIAHAIR ERP.

Meliputi:

- Backend
- Frontend
- Database
- Prisma
- REST API
- Queue Worker
- Integration
- Testing
- Utility
- Shared Library
- AI Generated Code

---

# 1.4 General Principles

Seluruh source code mengikuti prinsip berikut.

✅ Readability First

Kode harus mudah dibaca dibanding sekadar pendek.

---

✅ Consistency

Seluruh module harus menggunakan pola implementasi yang sama.

---

✅ Simplicity

Pilih solusi yang paling sederhana selama memenuhi kebutuhan bisnis.

---

✅ Reusability

Gunakan komponen yang dapat digunakan kembali.

Hindari copy-paste.

---

✅ Maintainability

Kode harus mudah dimodifikasi tanpa merusak module lain.

---

✅ Scalability

Struktur kode harus mendukung penambahan fitur baru.

---

✅ Testability

Business Logic harus mudah diuji.

---

# 1.5 Engineering Rules

Seluruh developer wajib mengikuti aturan berikut.

✅ Ikuti Business Rules.

✅ Ikuti Architecture Decisions.

✅ Ikuti API Standards.

✅ Ikuti Data Dictionary.

✅ Ikuti UI/UX Guidelines.

✅ Ikuti Development Roadmap.

Tidak diperbolehkan membuat implementasi yang bertentangan dengan dokumen tersebut.

---

# 1.6 Coding Philosophy

Dalam project NIAHAIR ERP.

Business Rule lebih penting daripada Framework.

Architecture lebih penting daripada shortcut.

Konsistensi lebih penting daripada preferensi pribadi.

Kode yang mudah dipahami lebih baik daripada kode yang terlalu kompleks.

---

# 1.7 Golden Rules

Seluruh developer dan AI wajib mengikuti aturan berikut.

✅ Selalu gunakan struktur project yang telah ditentukan.

✅ Jangan membuat pola baru tanpa alasan yang jelas.

✅ Jangan melakukan duplikasi Business Logic.

✅ Jangan melakukan Hardcode.

✅ Jangan mengakses Database dari Controller.

✅ Jangan melewati Validation.

✅ Jangan melewati Authorization.

✅ Selalu buat code yang mudah dibaca.

---

# 1.8 Coding Checklist

Sebelum menyelesaikan pekerjaan, pastikan:

☐ Mengikuti Naming Convention

☐ Mengikuti Folder Structure

☐ Tidak ada duplicate code

☐ Tidak ada hardcoded value

☐ Tidak ada unused code

☐ Validation sudah dibuat

☐ Error handling sudah dibuat

☐ Logging sudah sesuai

☐ Documentation diperbarui

☐ Test berhasil dijalankan

---

# 1.9 Success Criteria

Coding Standards dianggap berhasil apabila.

- Seluruh module memiliki struktur yang sama.
- Source code mudah dipahami developer baru.
- AI menghasilkan kode yang konsisten.
- Code Review menjadi lebih cepat.
- Refactoring dapat dilakukan tanpa perubahan besar.
- Technical Debt dapat diminimalkan.

---

# 1.10 Chapter Summary

Coding Standards merupakan standar resmi penulisan source code pada NIAHAIR ERP.

Seluruh implementasi harus mengikuti prinsip.

✓ Readable

✓ Consistent

✓ Simple

✓ Reusable

✓ Maintainable

✓ Scalable

✓ Testable

Dokumen ini menjadi acuan utama seluruh developer dan AI Coding Assistant dalam menghasilkan source code yang berkualitas, konsisten, dan siap digunakan pada lingkungan production.

# CHAPTER 2 — GENERAL RULES

---

# 2.1 Core Principles

Seluruh source code NIAHAIR ERP wajib mengikuti prinsip berikut.

✅ Readability over Cleverness

Kode harus mudah dipahami dibanding terlihat pintar.

---

✅ Consistency over Preference

Ikuti standar project, bukan gaya pribadi.

---

✅ Business First

Business Rule selalu lebih penting daripada Framework.

---

✅ Simplicity First

Pilih solusi paling sederhana yang memenuhi kebutuhan.

---

✅ Reuse Before Create

Cari apakah komponen sudah tersedia sebelum membuat yang baru.

---

✅ Security by Default

Seluruh implementasi harus aman sejak awal.

---

## 2.2 General Rules

Developer dan AI wajib mengikuti aturan berikut.

| Rule | Status |
|-------|--------|
| Gunakan TypeScript Strict Mode | ✅ Wajib |
| Gunakan Async/Await | ✅ Wajib |
| Gunakan Dependency Injection bila diperlukan | ✅ Wajib |
| Hindari Hardcode | ✅ Wajib |
| Gunakan Environment Variable | ✅ Wajib |
| Selalu gunakan UUID sebagai Primary Key | ✅ Wajib |
| Ikuti Folder Structure | ✅ Wajib |
| Ikuti Naming Convention | ✅ Wajib |

---

# 2.3 What You MUST Do

Developer wajib.

✅ Menulis kode yang mudah dibaca.

✅ Menggunakan struktur folder resmi.

✅ Menggunakan Repository Pattern.

✅ Memisahkan Business Logic dari Controller.

✅ Memvalidasi seluruh input.

✅ Menangani seluruh error.

✅ Membuat Logging.

✅ Membuat Unit Test untuk Business Logic.

✅ Memperbarui dokumentasi apabila ada perubahan.

---

# 2.4 What You MUST NOT Do

Developer tidak boleh.

❌ Menulis Business Logic di Controller.

❌ Mengakses Prisma langsung dari Controller.

❌ Hardcode API Key.

❌ Hardcode Password.

❌ Menulis Query SQL tanpa alasan.

❌ Copy Paste Business Logic.

❌ Menggunakan Magic Number.

❌ Menggunakan Magic String.

❌ Mengabaikan Error.

❌ Menonaktifkan Validation.

---

# 2.5 Clean Code Rules

Seluruh kode harus mengikuti aturan berikut.

Gunakan nama yang jelas.

Pisahkan fungsi sesuai tanggung jawab.

Hindari fungsi yang terlalu panjang.

Hindari Nested Condition yang berlebihan.

Gunakan Early Return.

Kurangi Duplikasi.

Gunakan Helper bila diperlukan.

---

Contoh.

❌ Buruk

```ts
if(a){
    if(b){
        if(c){

        }
    }
}
```

✅ Baik

```ts
if (!a) return;
if (!b) return;
if (!c) return;

// Business Logic
```

---

# 2.6 SOLID Guidelines

Gunakan prinsip SOLID.

- Single Responsibility
- Open / Closed
- Liskov Substitution
- Interface Segregation
- Dependency Inversion

Tidak perlu memaksakan SOLID apabila membuat kode menjadi lebih rumit.

---

# 2.7 DRY Principle

Don't Repeat Yourself.

Business Logic hanya ditulis satu kali.

Gunakan.

- Shared Service
- Utility
- Helper
- Base Class
- Reusable Component

Hindari copy-paste.

---

# 2.8 KISS Principle

Keep It Simple.

Lebih baik.

```ts
if (customer.isActive)
```

daripada.

```ts
if(customer.status==="ACTIVE")
```

apabila enum atau properti boolean memang sudah tersedia.

---

# 2.9 YAGNI Principle

You Aren't Gonna Need It.

Jangan membuat fitur yang belum dibutuhkan.

Jangan membuat Generic Class hanya karena mungkin dipakai nanti.

Bangun sesuai kebutuhan saat ini.

---

# 2.10 Performance Rules

Utamakan.

- Readability
- Correctness

Optimasi performa dilakukan apabila memang dibutuhkan dan telah diukur.

Jangan mengorbankan keterbacaan hanya demi optimasi yang tidak signifikan.

---

# 2.11 Security Rules

Selalu.

✅ Validasi Input.

✅ Escape Output bila diperlukan.

✅ Gunakan HTTPS.

✅ Gunakan Environment Variable.

✅ Gunakan Permission.

✅ Gunakan Authentication.

Jangan pernah mempercayai input dari Client.

---

# 2.12 AI Coding Rules

Seluruh AI Generated Code harus.

Mengikuti Coding Standards.

Mengikuti Folder Structure.

Mengikuti Naming Convention.

Mengikuti Business Rules.

Mengikuti API Standards.

AI tidak boleh membuat struktur baru tanpa persetujuan.

---

# 2.13 Checklist

Sebelum commit.

☐ Readable

☐ Simple

☐ Tidak Hardcode

☐ Validation ada

☐ Error Handling ada

☐ Logging ada

☐ Tidak Duplicate

☐ Documentation diperbarui

☐ Test berhasil

---

# 2.14 Best Practices

Selalu.

✅ Gunakan Const.

✅ Gunakan Enum.

✅ Gunakan Helper.

✅ Gunakan Async.

✅ Gunakan Type yang jelas.

✅ Gunakan Return lebih awal.

Hindari.

❌ Function 300 baris.

❌ Nested if berlebihan.

❌ Variable satu huruf.

❌ Anonymous Magic Value.

---

# 2.15 Chapter Summary

Seluruh source code NIAHAIR ERP harus mengikuti prinsip.

✓ Readability

✓ Consistency

✓ Simplicity

✓ Security

✓ Maintainability

✓ Reusability

✓ Scalability

✓ Testability

Aturan pada chapter ini berlaku untuk seluruh Backend, Frontend, Database, API, Integration, dan AI Generated Code tanpa pengecualian.

# CHAPTER 3 — PROJECT STRUCTURE STANDARDS

---

# 3.1 Goals

Seluruh project NIAHAIR ERP harus memiliki struktur folder yang konsisten.

Tujuan:

- Mempermudah navigasi project.
- Mengurangi kebingungan developer.
- Memudahkan onboarding.
- Memudahkan AI memahami project.
- Mencegah duplicate structure.

---

# 3.2 Project Structure

Project dipisahkan menjadi beberapa aplikasi.

```text
niahair-erp/

├── backend/
├── frontend/
├── shared/
├── docs/
├── scripts/
├── docker/
└── .github/
```

---

# 3.3 Backend Structure

```text
backend/

src/

├── config/
├── modules/
├── shared/
├── middleware/
├── routes/
├── utils/
├── types/
├── constants/
├── jobs/
├── integrations/
└── server.ts
```

Jangan membuat folder baru tanpa alasan yang jelas.

---

# 3.4 Module Structure

Seluruh Business Module menggunakan struktur yang sama.

```text
customer/

├── controller/
├── service/
├── repository/
├── dto/
├── validator/
├── mapper/
├── route/
├── types/
├── constants/
├── docs/
└── tests/
```

Semua module wajib mengikuti struktur ini.

---

# 3.5 Shared Folder

Folder `shared` hanya berisi kode yang digunakan oleh lebih dari satu module.

Contoh.

```text
shared/

├── response/
├── pagination/
├── logger/
├── validator/
├── errors/
├── middleware/
├── helpers/
├── constants/
└── types/
```

---

# 3.6 Configuration

Semua konfigurasi berada di.

```text
config/

├── database.ts
├── jwt.ts
├── env.ts
├── logger.ts
├── queue.ts
├── cloudinary.ts
└── accurate.ts
```

❌ Jangan hardcode konfigurasi di dalam module.

---

# 3.7 Integration Structure

Setiap provider memiliki folder sendiri.

```text
integrations/

├── accurate/
├── cloudinary/
├── email/
├── whatsapp/
├── telegram/
└── storage/
```

Jangan mencampur implementasi provider.

---

# 3.8 Job Structure

Background process dipisahkan.

```text
jobs/

├── sync/
├── scheduler/
├── notification/
├── cleanup/
└── report/
```

Business Logic tetap berada di Service.

---

# 3.9 Frontend Structure

```text
frontend/

src/

├── app/
├── pages/
├── modules/
├── components/
├── layouts/
├── hooks/
├── services/
├── store/
├── routes/
├── assets/
├── styles/
├── utils/
└── types/
```

---

# 3.10 Frontend Module Structure

Setiap module Frontend.

```text
customer/

├── pages/
├── components/
├── hooks/
├── services/
├── types/
├── validation/
└── constants/
```

---

# 3.11 File Placement Rules

| Jenis File | Lokasi |
|------------|--------|
| Controller | controller/ |
| Service | service/ |
| Repository | repository/ |
| DTO | dto/ |
| Validator | validator/ |
| Route | route/ |
| Mapper | mapper/ |
| Test | tests/ |
| Constant | constants/ |

---

# 3.12 What You MUST Do

✅ Gunakan struktur folder resmi.

✅ Pisahkan setiap Business Module.

✅ Simpan Shared Code di folder shared.

✅ Gunakan folder sesuai tanggung jawabnya.

---

# 3.13 What You MUST NOT Do

❌ Jangan membuat folder misc.

❌ Jangan membuat folder utils di setiap module.

❌ Jangan menyimpan Business Logic di routes.

❌ Jangan mencampur Controller dan Service.

❌ Jangan menyimpan konfigurasi di dalam module.

---

# 3.14 Best Practices

✅ Semua module memiliki struktur yang sama.

✅ Semua folder menggunakan lowercase.

✅ Gunakan singular untuk nama module.

✅ Pisahkan Shared Code.

✅ Maksimalkan reusable component.

---

# 3.15 Checklist

Sebelum membuat module baru.

☐ Struktur folder sesuai standar.

☐ Tidak membuat folder baru tanpa kebutuhan.

☐ Shared code tidak diduplikasi.

☐ Semua file berada pada lokasi yang benar.

☐ Module mengikuti template project.

---

# 3.16 Good Example

```text
customer/

├── controller
├── service
├── repository
├── dto
├── validator
├── mapper
├── route
├── tests
└── docs
```

✔ Mudah dipahami.

✔ Konsisten.

✔ Mudah dikembangkan.

---

# 3.17 Bad Example

```text
customer/

├── api/
├── helper/
├── utils/
├── logic/
├── controller2/
├── misc/
└── temp/
```

✘ Tidak konsisten.

✘ Sulit dicari.

✘ Sulit dipelihara.

---

# 3.18 Chapter Summary

Standar struktur project NIAHAIR ERP memastikan seluruh source code memiliki organisasi yang konsisten.

Prinsip utama.

✓ One Module, One Structure

✓ Shared Code di Shared Folder

✓ Separation of Concerns

✓ Consistent Folder Naming

✓ Easy Navigation

Dengan struktur yang seragam, developer maupun AI dapat menemukan, memahami, dan mengembangkan kode lebih cepat tanpa perlu mempelajari pola yang berbeda pada setiap module.

# CHAPTER 4 — NAMING CONVENTIONS

---

# 4.1 Goals

Seluruh nama pada project NIAHAIR ERP harus konsisten.

Tujuan.

- Mudah dibaca.
- Mudah dicari.
- Mudah dipahami AI.
- Konsisten di seluruh project.
- Mengurangi ambiguitas.

---

# 4.2 General Rules

Selalu gunakan nama yang deskriptif.

Gunakan Bahasa Inggris.

Gunakan istilah bisnis yang konsisten dengan Data Dictionary.

Hindari singkatan yang tidak umum.

---

## ✅ Good

```ts
customer

appointment

payment

warehouse

productionOrder
```

## ❌ Bad

```ts
cust

appt

pay

wh

prod
```

---

# 4.3 File Naming

Gunakan **kebab-case**.

## ✅ Good

```text
customer.controller.ts

customer.service.ts

customer.repository.ts

customer.dto.ts

customer.validator.ts

payment.service.ts
```

## ❌ Bad

```text
CustomerService.ts

customerService.ts

Customer_Service.ts

customer-service.TS
```

---

# 4.4 Folder Naming

Gunakan.

- lowercase
- singular
- kebab-case bila lebih dari satu kata

## ✅ Good

```text
customer

appointment

production-order

payment-method
```

## ❌ Bad

```text
Customers

ProductionOrder

customerModule

Customer
```

---

# 4.5 Variable Naming

Gunakan **camelCase**.

## ✅ Good

```ts
customer

customerId

paymentAmount

totalCommission

stockQuantity
```

## ❌ Bad

```ts
Customer

customer_id

Cust

x

data1

abc
```

Nama variable harus menjelaskan isi data.

---

# 4.6 Function Naming

Gunakan.

Verb + Object

## ✅ Good

```ts
createCustomer()

updateCustomer()

deleteCustomer()

findCustomerById()

calculateCommission()

generateInvoice()

assignEmployee()
```

## ❌ Bad

```ts
customer()

run()

doProcess()

save()

execute()

test()
```

---

# 4.7 Boolean Naming

Selalu diawali.

```
is

has

can

should
```

## ✅ Good

```ts
isActive

isDeleted

hasPermission

hasStock

canEdit

shouldSync
```

## ❌ Bad

```ts
active

deleted

permission

sync
```

---

# 4.8 Constant Naming

Gunakan.

UPPER_SNAKE_CASE

## ✅ Good

```ts
MAX_UPLOAD_SIZE

DEFAULT_PAGE_SIZE

JWT_EXPIRES_IN

MAX_RETRY

API_TIMEOUT
```

## ❌ Bad

```ts
MaxUpload

maxUpload

defaultPage

jwtExpires
```

---

# 4.9 Enum Naming

Nama Enum.

PascalCase.

Isi Enum.

UPPER_SNAKE_CASE

## ✅ Good

```ts
enum AppointmentStatus {

BOOKED,

CHECK_IN,

IN_PROGRESS,

COMPLETED,

CANCELLED

}
```

---

# 4.10 Interface Naming

Gunakan PascalCase.

Tidak perlu prefix I.

## ✅ Good

```ts
Customer

CreateCustomerRequest

UpdateCustomerRequest

ApiResponse
```

## ❌ Bad

```ts
ICustomer

ICreateCustomer

IResponse
```

---

# 4.11 Class Naming

Gunakan PascalCase.

## ✅ Good

```ts
CustomerService

CustomerRepository

PaymentService

AppointmentValidator
```

## ❌ Bad

```ts
customerService

serviceCustomer

customer_service
```

---

# 4.12 Database Naming

Table.

snake_case.

Plural.

## ✅ Good

```text
customers

appointments

payments

production_orders
```

Kolom.

snake_case.

## ✅ Good

```text
customer_id

created_at

updated_at

deleted_at

payment_status
```

---

# 4.13 API Naming

Gunakan.

Plural.

Kebab Case.

## ✅ Good

```text
/api/customers

/api/appointments

/api/payment-methods

/api/production-orders
```

## ❌ Bad

```text
/api/customerList

/api/GetCustomer

/api/payment_method

/api/Customer
```

---

# 4.14 Route Parameter

Gunakan.

```
:id
```

## ✅ Good

```text
/customers/:id

/payments/:id

/invoices/:id
```

---

# 4.15 DTO Naming

Gunakan suffix.

```
Request

Response

Dto
```

## ✅ Good

```ts
CreateCustomerRequest

UpdateCustomerRequest

CustomerResponse

PaymentDto
```

---

# 4.16 Test Naming

Gunakan.

```
*.spec.ts
```

atau

```
*.test.ts
```

## Contoh.

```text
customer.service.spec.ts

payment.repository.spec.ts
```

---

# 4.17 Environment Variable

Gunakan.

UPPER_SNAKE_CASE.

## ✅ Good

```text
DATABASE_URL

JWT_SECRET

CLOUDINARY_API_KEY

ACCURATE_CLIENT_ID

REDIS_HOST
```

---

# 4.18 Git Branch Naming

Gunakan.

```text
feature/customer-module

feature/payment

feature/appointment

fix/login

hotfix/payment-bug

refactor/customer-service

docs/api-standard

chore/update-eslint
```

---

# 4.19 Naming Checklist

Sebelum commit.

☐ File menggunakan kebab-case.

☐ Folder menggunakan lowercase.

☐ Variable menggunakan camelCase.

☐ Function menggunakan Verb + Object.

☐ Boolean diawali is/has/can.

☐ Constant menggunakan UPPER_SNAKE_CASE.

☐ Class menggunakan PascalCase.

☐ API menggunakan plural.

☐ Database menggunakan snake_case.

---

# 4.20 Quick Reference

| Item | Standard | Example |
|-------|----------|---------|
| Folder | lowercase | customer |
| File | kebab-case | customer.service.ts |
| Variable | camelCase | customerId |
| Function | verb + object | createCustomer |
| Class | PascalCase | CustomerService |
| Enum | PascalCase | AppointmentStatus |
| Enum Value | UPPER_SNAKE_CASE | IN_PROGRESS |
| Constant | UPPER_SNAKE_CASE | MAX_UPLOAD_SIZE |
| Database Table | snake_case plural | customers |
| Database Column | snake_case | customer_id |
| API | plural kebab-case | /payment-methods |
| Env | UPPER_SNAKE_CASE | DATABASE_URL |

---

# 4.21 Chapter Summary

Seluruh penamaan pada NIAHAIR ERP harus mengikuti standar yang konsisten.

Prinsip utama.

✓ Deskriptif.

✓ Konsisten.

✓ Mudah dicari.

✓ Mudah dipahami.

✓ Mengikuti standar TypeScript dan REST API.

Naming Convention bukan preferensi pribadi, tetapi standar resmi proyek yang wajib diikuti oleh seluruh developer dan AI Coding Assistant.


# CHAPTER 5 — BACKEND CODING STANDARDS

---

# 5.1 Goals

Seluruh Backend NIAHAIR ERP harus memiliki struktur, pola implementasi, dan kualitas yang konsisten.

Backend harus:

- Mudah dipahami.
- Mudah diuji.
- Mudah dikembangkan.
- Mudah dipelihara.
- Mudah digunakan oleh AI.

---

# 5.2 Backend Architecture

Seluruh request mengikuti alur berikut.

```

Request

↓

Route

↓

Controller

↓

Validation

↓

Service

↓

Repository

↓

Prisma

↓

Database

↓

Response

```

Business Logic hanya berada di Service.

---

# 5.3 Layer Responsibility

| Layer | Responsibility |
|--------|----------------|
| Route | Mapping endpoint |
| Controller | Request & Response |
| Validation | Validasi input |
| Service | Business Logic |
| Repository | Database |
| Prisma | ORM |
| Database | Data Storage |

Setiap layer hanya memiliki satu tanggung jawab.

---

# 5.4 Controller Rules

Controller bertugas untuk.

✅ Menerima Request.

✅ Memanggil Validation.

✅ Memanggil Service.

✅ Mengembalikan Response.

Controller tidak boleh.

❌ Mengakses Prisma.

❌ Menulis Business Logic.

❌ Mengelola Transaction.

❌ Mengakses Database.

---

### Good

```ts
const customer = await customerService.create(request);

return success(customer);
```

### Bad

```ts
await prisma.customer.create(...);
```

---

# 5.5 Service Rules

Service adalah pusat Business Logic.

Service bertugas.

✅ Business Rule.

✅ Transaction.

✅ Calling Repository.

✅ Calling External Service.

✅ Data Processing.

Service tidak boleh.

❌ Return HTTP Response.

❌ Mengakses Express Request.

❌ Mengakses Express Response.

---

### Good

```ts
await customerRepository.create(data);

await auditService.log(...);

return customer;
```

---

# 5.6 Repository Rules

Repository hanya berhubungan dengan Database.

Repository bertugas.

✅ CRUD.

✅ Query.

✅ Pagination.

✅ Transaction Helper.

Repository tidak boleh.

❌ Business Logic.

❌ Validation.

❌ Permission.

❌ HTTP Response.

---

### Good

```ts
return prisma.customer.findUnique(...)
```

---

# 5.7 Validation Rules

Semua input wajib divalidasi.

Validasi dilakukan sebelum Service dipanggil.

Validasi meliputi.

- Required.
- Type.
- Length.
- Enum.
- Format.
- Business Constraint (bila sederhana).

---

# 5.8 DTO Rules

Semua Request menggunakan DTO.

Semua Response menggunakan DTO.

DTO tidak boleh berisi Business Logic.

DTO hanya digunakan untuk transfer data.

---

# 5.9 Transaction Rules

Transaction hanya dilakukan di Service.

Contoh.

```ts
await prisma.$transaction(async(tx)=>{

...

})
```

Jangan membuat Transaction di Repository.

---

# 5.10 Dependency Rules

Dependency hanya boleh mengalir ke bawah.

```

Controller

↓

Service

↓

Repository

↓

Prisma

```

Repository tidak boleh memanggil Service.

Controller tidak boleh memanggil Repository.

---

# 5.11 Async Rules

Seluruh operasi I/O menggunakan async/await.

Jangan menggunakan.

❌ Callback.

❌ Promise Chain.

---

### Good

```ts
await customerRepository.create(...)
```

---

# 5.12 Shared Code Rules

Gunakan Shared apabila kode digunakan oleh lebih dari satu Module.

Contoh.

- Logger.
- Pagination.
- Response.
- Error.
- Validator.
- Constants.

Jangan menduplikasi kode.

---

# 5.13 Configuration Rules

Configuration hanya berasal dari.

```
.env

config/
```

Jangan melakukan Hardcode.

---

# 5.14 Error Handling Rules

Gunakan Custom Error.

Seluruh Error diproses oleh Global Error Handler.

Jangan.

```ts
return res.status(500)
```

di dalam Service.

---

# 5.15 Logging Rules

Logging dilakukan pada.

- Login.
- Payment.
- Inventory.
- Production.
- Integration.
- Error.

Jangan menggunakan `console.log()` pada Production Code.

Gunakan Logger resmi project.

---

# 5.16 Performance Rules

Gunakan.

✅ Pagination.

✅ Select Field.

✅ Include seperlunya.

✅ Index Database.

Hindari.

❌ N+1 Query.

❌ Query berulang.

❌ Select *.

---

# 5.17 Security Rules

Backend wajib.

✅ Authentication.

✅ Authorization.

✅ Validation.

✅ Sanitization.

✅ Audit.

Jangan mempercayai data dari Client.

---

# 5.18 Checklist

Sebelum Pull Request.

☐ Controller tanpa Business Logic.

☐ Service berisi Business Logic.

☐ Repository hanya Database.

☐ Validation lengkap.

☐ DTO digunakan.

☐ Transaction di Service.

☐ Error Handling benar.

☐ Logger digunakan.

☐ Tidak ada Hardcode.

☐ Test berhasil.

---

# 5.19 Backend Flow Example

```

POST /customers

↓

Route

↓

CustomerController

↓

CreateCustomerValidator

↓

CustomerService

↓

CustomerRepository

↓

Prisma

↓

Database

↓

CustomerResponse

```

---

# 5.20 Quick Reference

| Layer | Allowed | Not Allowed |
|--------|---------|-------------|
| Route | Register Endpoint | Business Logic |
| Controller | Request, Response | Prisma |
| Validation | Validate Input | Database |
| Service | Business Logic | HTTP Response |
| Repository | Database Query | Business Logic |
| DTO | Transfer Data | Validation Logic |
| Prisma | ORM | Business Logic |

---

# 5.21 Chapter Summary

Seluruh Backend NIAHAIR ERP mengikuti arsitektur berlapis (Layered Architecture) dengan pemisahan tanggung jawab yang jelas.

Prinsip utama.

✓ Controller hanya menangani Request dan Response.

✓ Service menjadi pusat Business Logic.

✓ Repository hanya berinteraksi dengan Database.

✓ Validation dilakukan sebelum Business Logic.

✓ Transaction dikelola di Service.

✓ Error Handling terpusat.

✓ Logging konsisten.

✓ Tidak ada Hardcode.

Dengan standar ini, Backend menjadi konsisten, mudah diuji, mudah dipelihara, dan siap dikembangkan oleh banyak developer maupun AI Coding Assistant.

# CHAPTER 6 — FRONTEND CODING STANDARDS

---

# 6.1 Goals

Seluruh Frontend NIAHAIR ERP harus memiliki struktur, pola implementasi, dan kualitas yang konsisten.

Frontend harus.

- Mudah dipahami.
- Mudah dipelihara.
- Mudah dikembangkan.
- Konsisten antar module.
- Mudah digunakan kembali.

---

# 6.2 Frontend Architecture

Seluruh halaman mengikuti alur berikut.

```

Route

↓

Page

↓

Component

↓

Hook

↓

Service (API)

↓

Backend API

```

Business Logic tidak boleh ditulis langsung di dalam Page.

---

# 6.3 Layer Responsibility

| Layer | Responsibility |
|--------|----------------|
| Route | Routing |
| Page | Layout & Page Logic |
| Component | UI |
| Hook | State & Business Logic |
| Service | API Communication |
| Backend | Business Logic |

Setiap layer hanya memiliki satu tanggung jawab.

---

# 6.4 Module Structure

Seluruh module menggunakan struktur yang sama.

```text
customer/

├── pages/
├── components/
├── hooks/
├── services/
├── validation/
├── types/
├── constants/
├── assets/
└── tests/
```

Jangan membuat struktur baru tanpa alasan.

---

# 6.5 Page Rules

Page bertugas.

✅ Menampilkan Layout.

✅ Mengatur Page State.

✅ Menggabungkan Component.

Page tidak boleh.

❌ Memanggil API langsung.

❌ Menulis Business Logic.

❌ Menulis Query.

---

### Good

```tsx
<CustomerTable />
<CustomerFilter />
<CustomerForm />
```

---

### Bad

```tsx
fetch(...)

axios.get(...)

Business Logic
```

---

# 6.6 Component Rules

Component harus.

✅ Reusable.

✅ Kecil.

✅ Mudah diuji.

Component tidak boleh.

❌ Memanggil API.

❌ Menulis Business Logic yang kompleks.

❌ Mengubah Global State secara langsung.

---

# 6.7 Hook Rules

Custom Hook digunakan untuk.

✅ Fetch Data.

✅ State Management.

✅ Form Logic.

✅ Reusable Logic.

Contoh.

```tsx
useCustomer()

useAppointment()

usePayment()
```

Hook tidak boleh menghasilkan tampilan UI.

---

# 6.8 Service Rules

Service hanya berisi komunikasi API.

Contoh.

```ts
customerService.getAll()

customerService.create()

customerService.update()

customerService.delete()
```

Service tidak boleh.

❌ Menampilkan Toast.

❌ Mengubah UI.

❌ Menyimpan State.

---

# 6.9 State Management

Gunakan.

- Local State → data lokal.
- Global State → data yang digunakan banyak halaman.
- Server State → data dari API.

Jangan menyimpan seluruh data pada Global State.

---

# 6.10 Form Rules

Seluruh Form harus memiliki.

✅ Validation.

✅ Loading State.

✅ Error State.

✅ Success Feedback.

✅ Disabled Submit saat Loading.

---

# 6.11 API Rules

Seluruh request menggunakan Service.

Contoh.

```tsx
const customers = await customerService.getAll();
```

Jangan.

```tsx
axios.get(...)
```

langsung di Component atau Page.

---

# 6.12 UI Rules

Gunakan Design System.

Seluruh Button.

Input.

Table.

Modal.

Dialog.

Badge.

Card.

Harus berasal dari komponen resmi project.

Jangan membuat komponen yang sudah tersedia.

---

# 6.13 Styling Rules

Gunakan.

✅ Design Token.

✅ Theme.

✅ Utility Class sesuai standar project.

Hindari.

❌ Inline Style.

❌ Hardcoded Color.

❌ Hardcoded Font Size.

---

# 6.14 Performance Rules

Gunakan.

✅ Lazy Loading.

✅ Memoization bila diperlukan.

✅ Pagination.

✅ Debounce Search.

✅ Virtual List untuk data besar.

Hindari render yang tidak perlu.

---

# 6.15 Accessibility Rules

Seluruh halaman harus.

✅ Keyboard Navigation.

✅ Label yang jelas.

✅ Focus State.

✅ Semantic HTML.

✅ Alt Text untuk gambar.

---

# 6.16 Error Handling

Seluruh halaman harus memiliki.

Loading State.

Empty State.

Error State.

Retry Action.

Jangan menampilkan halaman kosong ketika terjadi Error.

---

# 6.17 Frontend Checklist

Sebelum Pull Request.

☐ Menggunakan Module Structure.

☐ Tidak ada API Call di Page.

☐ Tidak ada Business Logic di Component.

☐ Validation selesai.

☐ Responsive.

☐ Accessibility.

☐ Loading State.

☐ Error State.

☐ Test berhasil.

---

# 6.18 Good Example

```text
Customer Page

↓

CustomerTable

↓

CustomerForm

↓

useCustomer()

↓

customerService

↓

API
```

Business Logic berada di Hook.

API berada di Service.

UI berada di Component.

---

# 6.19 Bad Example

```text
CustomerPage

↓

axios

↓

Business Logic

↓

Validation

↓

Toast

↓

Rendering
```

Semua logic berada di satu file.

Sulit dipelihara.

---

# 6.20 Quick Reference

| Layer | Allowed | Not Allowed |
|--------|---------|-------------|
| Route | Routing | API Call |
| Page | Layout | Business Logic |
| Component | UI | API Call |
| Hook | State & Reusable Logic | Rendering UI |
| Service | API Request | UI Logic |
| Validation | Form Validation | API Request |

---

# 6.21 Chapter Summary

Seluruh Frontend NIAHAIR ERP mengikuti arsitektur modular dengan pemisahan tanggung jawab yang jelas.

Prinsip utama.

✓ Page hanya mengatur Layout.

✓ Component hanya menangani UI.

✓ Hook menangani State dan reusable logic.

✓ Service hanya berkomunikasi dengan API.

✓ Design System digunakan secara konsisten.

✓ Seluruh halaman memiliki Loading, Empty, dan Error State.

Dengan standar ini, Frontend menjadi lebih konsisten, mudah diuji, mudah dipelihara, dan siap berkembang seiring bertambahnya module tanpa menghasilkan struktur yang berbeda-beda.

# CHAPTER 7 — DATABASE & PRISMA STANDARDS

---

# 7.1 Goals

Seluruh Database dan Prisma Schema harus memiliki struktur yang konsisten, mudah dipelihara, dan mendukung pertumbuhan sistem.

Standar ini berlaku untuk seluruh Model, Migration, Relation, Index, dan Query.

---

# 7.2 Database Principles

Seluruh database mengikuti prinsip berikut.

✅ Data Integrity

✅ Normalization

✅ Consistent Naming

✅ Referential Integrity

✅ Performance First

✅ Backward Compatible Migration

---

# 7.3 Table Naming

Gunakan.

- snake_case
- plural

### ✅ Good

```text
customers

appointments

payments

production_orders
```

### ❌ Bad

```text
Customer

customerData

paymentTable

ProductionOrder
```

---

# 7.4 Column Naming

Gunakan.

snake_case.

### ✅ Good

```text
customer_id

created_at

updated_at

deleted_at

branch_id

invoice_number
```

### ❌ Bad

```text
CustomerId

customerID

CreatedDate

invoiceNo
```

---

# 7.5 Primary Key

Seluruh tabel menggunakan.

UUID.

### Standard

```text
id UUID PRIMARY KEY
```

Jangan menggunakan auto increment.

---

# 7.6 Standard Columns

Seluruh tabel wajib memiliki.

```text
id

created_at

updated_at
```

Jika mendukung Soft Delete.

Tambahkan.

```text
deleted_at
```

Jika memerlukan Audit.

Tambahkan.

```text
created_by

updated_by

deleted_by
```

---

# 7.7 Foreign Key

Gunakan nama.

```
<nama_tabel>_id
```

### Good

```text
customer_id

branch_id

warehouse_id

appointment_id
```

---

# 7.8 Prisma Model Naming

Gunakan.

PascalCase.

### Good

```prisma
model Customer

model Appointment

model ProductionOrder
```

### Bad

```prisma
model customer

model customer_table
```

---

# 7.9 Prisma Field Naming

Gunakan.

camelCase.

### Good

```prisma
customerId

createdAt

updatedAt

deletedAt
```

---

# 7.10 Enum Rules

Nama Enum.

PascalCase.

Value Enum.

UPPER_SNAKE_CASE.

### Good

```prisma
enum AppointmentStatus {

BOOKED

CHECK_IN

IN_PROGRESS

COMPLETED

CANCELLED

}
```

---

# 7.11 Relation Rules

Gunakan relation yang jelas.

### Good

```prisma
customer Customer @relation(...)
```

Hindari relation yang ambigu.

---

# 7.12 Decimal Rules

Gunakan Decimal untuk.

- Money
- Price
- Cost
- Commission
- Tax

Jangan gunakan Float.

---

# 7.13 Date Rules

Gunakan.

DateTime.

Simpan dalam UTC.

Konversi ke Local Time pada Frontend.

---

# 7.14 Boolean Rules

Gunakan Boolean untuk status sederhana.

### Good

```text
isActive

isDeleted

hasCommission
```

Jangan menggunakan.

```text
status = 1
```

untuk nilai boolean.

---

# 7.15 Migration Rules

Setiap perubahan schema wajib melalui Migration.

Jangan mengubah Database secara manual.

Migration harus.

✅ Reproducible

✅ Versioned

✅ Tested

---

# 7.16 Index Rules

Tambahkan Index pada.

- Foreign Key
- Search Field
- Frequently Filtered Field

Contoh.

```text
customer_id

branch_id

appointment_date

invoice_number
```

---

# 7.17 Query Rules

Gunakan.

✅ Pagination.

✅ Select seperlunya.

✅ Include seperlunya.

Hindari.

❌ Select *

❌ Query berulang

❌ N+1 Query

---

# 7.18 Seed Rules

Seed hanya digunakan untuk data awal.

Contoh.

- Role
- Permission
- Branch
- Warehouse
- Membership
- Payment Method

Seed harus bersifat idempotent.

---

# 7.19 Checklist

Sebelum Migration.

☐ Table menggunakan plural.

☐ Column menggunakan snake_case.

☐ Model menggunakan PascalCase.

☐ Field menggunakan camelCase.

☐ UUID digunakan.

☐ Standard Column tersedia.

☐ Foreign Key benar.

☐ Index ditambahkan.

☐ Migration dibuat.

☐ Seed diperbarui bila diperlukan.

---

# 7.20 Quick Reference

| Item | Standard |
|-------|----------|
| Table | snake_case plural |
| Column | snake_case |
| Model | PascalCase |
| Field | camelCase |
| UUID | Wajib |
| Money | Decimal |
| Date | DateTime UTC |
| Enum | PascalCase |
| Enum Value | UPPER_SNAKE_CASE |
| Migration | Prisma Migration |

---

# 7.21 Chapter Summary

Seluruh Database dan Prisma pada NIAHAIR ERP mengikuti standar yang konsisten.

Prinsip utama.

✓ UUID sebagai Primary Key.

✓ Table menggunakan snake_case plural.

✓ Model menggunakan PascalCase.

✓ Decimal untuk nilai uang.

✓ Migration melalui Prisma.

✓ Index untuk performa.

✓ Query dioptimalkan.

Dengan standar ini, struktur database akan tetap konsisten, aman, dan mudah dikembangkan seiring bertambahnya module dan volume data.

# CHAPTER 8 — API IMPLEMENTATION STANDARDS

---

# 8.1 Goals

Seluruh implementasi REST API pada NIAHAIR ERP harus memiliki struktur, perilaku, dan kualitas yang konsisten.

Standar ini mengatur implementasi endpoint, bukan desain API.

---

# 8.2 API Flow

Seluruh endpoint mengikuti alur berikut.

```

Client

↓

Route

↓

Controller

↓

Validation

↓

Service

↓

Repository

↓

Database

↓

Response

```

Tidak diperbolehkan melewati salah satu layer.

---

# 8.3 Route Rules

Route hanya bertugas.

✅ Mendaftarkan endpoint.

✅ Menambahkan middleware.

✅ Menambahkan permission.

Route tidak boleh.

❌ Business Logic.

❌ Database Query.

❌ Validation.

---

### Good

```ts
router.post(
    "/",
    authenticate,
    authorize("customer.create"),
    validate(createCustomerSchema),
    customerController.create
);
```

---

# 8.4 Controller Rules

Controller bertugas.

✅ Membaca Request.

✅ Memanggil Service.

✅ Mengembalikan Response.

Controller tidak boleh.

❌ Prisma Query.

❌ Business Logic.

❌ Transaction.

---

### Good

```ts
const customer = await customerService.create(req.body);

return success(res, customer);
```

---

# 8.5 Request Validation

Seluruh Request wajib divalidasi.

Minimal.

- Required
- Type
- Enum
- Length
- Format
- Range

Validation dilakukan sebelum Controller dipanggil.

---

# 8.6 Response Rules

Gunakan Response Builder resmi.

### Success

```json
{
  "success": true,
  "message": "Customer created successfully.",
  "data": {}
}
```

### Error

```json
{
  "success": false,
  "message": "Validation failed.",
  "errors": []
}
```

Jangan membuat format response yang berbeda.

---

# 8.7 HTTP Status Code

Gunakan status code yang sesuai.

| Action | Status |
|---------|--------|
| GET | 200 |
| POST | 201 |
| PUT | 200 |
| PATCH | 200 |
| DELETE | 200 |
| Validation Error | 400 |
| Unauthorized | 401 |
| Forbidden | 403 |
| Not Found | 404 |
| Conflict | 409 |
| Server Error | 500 |

---

# 8.8 Pagination Rules

Endpoint List wajib mendukung.

✅ page

✅ limit

✅ search

✅ sort

✅ order

Contoh.

```text
GET /customers?page=1&limit=20&search=dani
```

---

# 8.9 Filtering Rules

Gunakan Query Parameter.

### Good

```text
GET /customers?branchId=1

GET /appointments?status=BOOKED

GET /payments?paymentMethod=CASH
```

Jangan menggunakan Request Body pada GET.

---

# 8.10 Sorting Rules

Gunakan.

```text
sort

order
```

Contoh.

```text
?sort=createdAt&order=desc
```

---

# 8.11 Versioning Rules

Seluruh endpoint menggunakan versioning.

Contoh.

```text
/api/v1/customers

/api/v1/payments
```

Perubahan breaking change menggunakan versi baru.

---

# 8.12 File Upload Rules

Upload dilakukan melalui endpoint khusus.

Contoh.

```text
POST /api/v1/media
```

Jangan mencampur upload file dengan endpoint bisnis jika tidak diperlukan.

---

# 8.13 Error Handling

Gunakan Global Error Handler.

Jangan.

```ts
try {

}catch(e){

return res.status(...)
}
```

di setiap Controller.

---

# 8.14 Documentation Rules

Seluruh endpoint wajib memiliki.

✅ Summary

✅ Description

✅ Request

✅ Response

✅ Example

✅ Error Response

OpenAPI wajib diperbarui.

---

# 8.15 Security Rules

Seluruh endpoint.

✅ Authentication.

✅ Authorization.

✅ Validation.

✅ Rate Limit (endpoint sensitif).

Input tidak boleh langsung dipercaya.

---

# 8.16 Checklist

Sebelum membuat endpoint.

☐ Route dibuat.

☐ Validation selesai.

☐ Controller bersih.

☐ Service selesai.

☐ Repository selesai.

☐ Response sesuai standar.

☐ Error Handling sesuai.

☐ Swagger diperbarui.

☐ Test dibuat.

---

# 8.17 Good Example

```text
Route

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

Database

↓

Response
```

✔ Setiap layer memiliki tanggung jawab yang jelas.

---

# 8.18 Bad Example

```text
Route

↓

Controller

↓

Prisma

↓

Database
```

✘ Tidak ada Validation.

✘ Tidak ada Service.

✘ Sulit diuji.

✘ Sulit dipelihara.

---

# 8.19 Quick Reference

| Layer | Responsibility |
|---------|----------------|
| Route | Register Endpoint |
| Validation | Validate Request |
| Controller | Request & Response |
| Service | Business Logic |
| Repository | Database |
| Response Builder | Response Format |
| Error Handler | Error Response |

---

# 8.20 Chapter Summary

Seluruh implementasi REST API pada NIAHAIR ERP harus mengikuti pola yang konsisten.

Prinsip utama.

✓ Route hanya mendaftarkan endpoint.

✓ Validation dilakukan sebelum Controller.

✓ Controller hanya menangani Request dan Response.

✓ Service menjadi pusat Business Logic.

✓ Repository hanya berinteraksi dengan Database.

✓ Response menggunakan format yang seragam.

✓ Error ditangani secara global.

✓ Dokumentasi OpenAPI selalu diperbarui.

Dengan standar ini, seluruh endpoint memiliki struktur implementasi yang seragam sehingga lebih mudah dikembangkan, diuji, dipelihara, dan dipahami oleh developer maupun AI Coding Assistant.

# CHAPTER 9 — ERROR HANDLING STANDARDS

---

# 9.1 Goals

Seluruh Error pada NIAHAIR ERP harus ditangani secara konsisten.

Error harus.

- Mudah dipahami.
- Mudah dilacak.
- Aman.
- Konsisten.
- Tidak membocorkan informasi sensitif.

---

# 9.2 Error Principles

Seluruh Error mengikuti prinsip.

✅ Consistent

✅ Predictable

✅ Traceable

✅ Secure

✅ User Friendly

---

# 9.3 Error Flow

Seluruh Error mengikuti alur.

```

Application

↓

Throw Custom Error

↓

Global Error Handler

↓

Logger

↓

API Response

```

Tidak diperbolehkan menangani Error secara manual di setiap Controller.

---

# 9.4 Error Categories

Gunakan kategori Error berikut.

| Category | HTTP |
|----------|------|
| Validation Error | 400 |
| Authentication Error | 401 |
| Authorization Error | 403 |
| Not Found Error | 404 |
| Conflict Error | 409 |
| Business Error | 422 |
| Internal Error | 500 |

---

# 9.5 Custom Error

Gunakan Custom Error.

### Good

```ts
throw new NotFoundError("Customer not found");
```

```ts
throw new ValidationError("Invalid phone number");
```

```ts
throw new ConflictError("Customer already exists");
```

---

### Bad

```ts
throw new Error("Something wrong");
```

---

# 9.6 Controller Rules

Controller tidak boleh.

❌ try/catch untuk seluruh endpoint.

❌ return res.status(...)

Controller cukup memanggil Service.

### Good

```ts
const customer = await customerService.create(data);

return success(res, customer);
```

---

# 9.7 Service Rules

Service boleh melempar Error.

Contoh.

```ts
if (!customer) {

throw new NotFoundError(
    "Customer not found"
);

}
```

Service tidak boleh.

❌ Mengembalikan HTTP Status.

---

# 9.8 Repository Rules

Repository hanya melempar Error Database.

Business Error dibuat di Service.

---

# 9.9 Global Error Handler

Semua Error diproses di satu tempat.

Contoh.

```ts
app.use(globalErrorHandler);
```

Global Error Handler bertugas.

- Mapping Error.
- Logging.
- Response.
- Monitoring.

---

# 9.10 Error Response

Format Error selalu sama.

```json
{
  "success": false,
  "message": "Customer not found.",
  "code": "CUSTOMER_NOT_FOUND",
  "errors": []
}
```

Jangan membuat format Error berbeda.

---

# 9.11 Validation Error

Gunakan format.

```json
{
  "field": "phone",
  "message": "Phone number is invalid."
}
```

Jangan mengirim stack trace.

---

# 9.12 Database Error

Database Error tidak boleh dikirim langsung ke Client.

### Bad

```json
{
  "message":"duplicate key value violates..."
}
```

### Good

```json
{
  "message":"Customer already exists."
}
```

---

# 9.13 Logging Rules

Semua Error.

✅ Dicatat Logger.

✅ Memiliki Timestamp.

✅ Memiliki Request ID.

✅ Memiliki User ID bila tersedia.

---

# 9.14 Sensitive Information

Jangan pernah mengirim.

❌ Stack Trace

❌ SQL Query

❌ Password

❌ JWT

❌ Secret

❌ API Key

ke Client.

---

# 9.15 Retry Rules

Retry hanya digunakan untuk.

- External API.
- Queue.
- Email.
- Notification.

Retry tidak digunakan untuk Validation Error.

---

# 9.16 Async Error

Gunakan async/await.

Jangan.

```ts
promise.then(...).catch(...)
```

Gunakan.

```ts
await ...
```

---

# 9.17 Checklist

Sebelum Pull Request.

☐ Menggunakan Custom Error.

☐ Tidak ada Error generic.

☐ Global Error Handler digunakan.

☐ Tidak membocorkan Stack Trace.

☐ Error dicatat Logger.

☐ Response sesuai standar.

---

# 9.18 Good Example

```ts
if (!customer) {

throw new NotFoundError(
    "Customer not found"
);

}
```

✔ Mudah dipahami.

✔ Mudah ditangani.

✔ Konsisten.

---

# 9.19 Bad Example

```ts
throw new Error("Error");
```

atau

```ts
return res.status(500).json(...)
```

di Service.

✘ Tidak konsisten.

✘ Sulit dipelihara.

---

# 9.20 Quick Reference

| Layer | Error Responsibility |
|---------|----------------------|
| Controller | Tidak menangani Error |
| Service | Throw Business Error |
| Repository | Throw Database Error |
| Global Handler | Mapping & Response |
| Logger | Menyimpan Log |

---

# 9.21 Chapter Summary

Seluruh Error pada NIAHAIR ERP harus mengikuti standar yang sama.

Prinsip utama.

✓ Gunakan Custom Error.

✓ Gunakan Global Error Handler.

✓ Jangan membocorkan informasi sensitif.

✓ Gunakan format Response yang konsisten.

✓ Catat seluruh Error pada Logger.

✓ Pisahkan Business Error dan Database Error.

Dengan standar ini, proses penanganan Error menjadi konsisten, aman, mudah dipelihara, dan memudahkan debugging maupun monitoring pada lingkungan Production.

# CHAPTER 10 — LOGGING STANDARDS

---

# 10.1 Goals

Seluruh aktivitas penting pada NIAHAIR ERP harus dicatat menggunakan sistem Logging yang konsisten.

Logging digunakan untuk.

- Debugging
- Monitoring
- Audit
- Security
- Performance Analysis
- Troubleshooting

---

# 10.2 Logging Principles

Seluruh Logging mengikuti prinsip.

✅ Consistent

✅ Structured

✅ Searchable

✅ Traceable

✅ Secure

Logging bukan pengganti Audit Log.

---

# 10.3 What Must Be Logged

Aktivitas berikut wajib dicatat.

✅ Login

✅ Logout

✅ API Request

✅ API Error

✅ Payment

✅ Inventory Movement

✅ Production

✅ Accurate Sync

✅ Queue Job

✅ Background Process

✅ System Error

---

# 10.4 What Must NOT Be Logged

Jangan pernah mencatat.

❌ Password

❌ JWT Token

❌ API Secret

❌ Credit Card

❌ OTP

❌ Session Token

❌ Private Key

❌ Refresh Token

---

# 10.5 Log Levels

Gunakan level berikut.

| Level | Digunakan Untuk |
|---------|----------------|
| DEBUG | Debug lokal |
| INFO | Aktivitas normal |
| WARN | Kondisi tidak normal |
| ERROR | Error aplikasi |
| FATAL | Error yang menyebabkan aplikasi berhenti |

---

# 10.6 Log Structure

Setiap log minimal memiliki.

- Timestamp
- Log Level
- Request ID
- User ID (jika ada)
- Module
- Action
- Message

Contoh.

```json
{
  "timestamp":"2026-07-01T10:00:00Z",
  "level":"INFO",
  "module":"Customer",
  "action":"CREATE",
  "userId":"...",
  "requestId":"...",
  "message":"Customer created successfully."
}
```

---

# 10.7 Request Logging

Seluruh Request dicatat.

Minimal.

- Method
- URL
- Response Time
- Status Code
- IP Address
- User ID

---

# 10.8 Error Logging

Setiap Error wajib dicatat.

Minimal.

- Error Code
- Error Message
- Module
- Stack Trace (Internal Only)
- Request ID

Stack Trace tidak boleh dikirim ke Client.

---

# 10.9 Business Logging

Aktivitas bisnis penting wajib dicatat.

Contoh.

- Customer dibuat.
- Appointment dibatalkan.
- Payment diterima.
- Refund diproses.
- Stock dipindahkan.
- Production selesai.

---

# 10.10 Integration Logging

Seluruh komunikasi eksternal wajib dicatat.

Contoh.

- Accurate API
- Cloudinary
- Email
- WhatsApp
- Telegram

Minimal mencatat.

- Provider
- Endpoint
- Status
- Response Time
- Retry Count

---

# 10.11 Queue Logging

Queue Worker mencatat.

- Job ID
- Queue Name
- Started At
- Finished At
- Duration
- Result

---

# 10.12 Performance Logging

Catat operasi yang lambat.

Contoh.

- API > 1 detik
- Database Query > 500 ms
- Queue > 30 detik

---

# 10.13 Logging Rules

Gunakan Logger resmi project.

Contoh.

```ts
logger.info("Customer created.");
```

Jangan menggunakan.

```ts
console.log(...)
```

pada Production.

---

# 10.14 Context Rules

Selalu sertakan konteks.

Contoh.

```ts
logger.info({
    module: "Customer",
    action: "CREATE",
    customerId,
    userId
});
```

---

# 10.15 Log Retention

Log disimpan sesuai kebijakan.

- Debug → 7 hari
- Info → 30 hari
- Warning → 90 hari
- Error → 180 hari
- Audit → Sesuai kebijakan bisnis

Periode retensi dapat disesuaikan dengan kebutuhan operasional dan regulasi yang berlaku.

---

# 10.16 Checklist

Sebelum Pull Request.

☐ Tidak ada console.log()

☐ Logger digunakan.

☐ Error dicatat.

☐ Aktivitas bisnis penting dicatat.

☐ Tidak ada data sensitif di log.

☐ Format log sesuai standar.

---

# 10.17 Good Example

```ts
logger.info({
    module: "Customer",
    action: "CREATE",
    customerId,
    userId,
    message: "Customer created successfully."
});
```

✔ Terstruktur.

✔ Mudah dicari.

✔ Aman.

---

# 10.18 Bad Example

```ts
console.log(customer);
```

atau

```ts
console.log("error");
```

✘ Tidak terstruktur.

✘ Sulit dianalisis.

✘ Tidak cocok untuk Production.

---

# 10.19 Quick Reference

| Activity | Log |
|----------|-----|
| Login | ✅ |
| Logout | ✅ |
| Create Data | ✅ |
| Update Data | ✅ |
| Delete Data | ✅ |
| Payment | ✅ |
| Inventory | ✅ |
| Production | ✅ |
| API Error | ✅ |
| Queue | ✅ |

---

# 10.20 Chapter Summary

Seluruh Logging pada NIAHAIR ERP harus mengikuti standar yang konsisten.

Prinsip utama.

✓ Gunakan Structured Logging.

✓ Gunakan Logger resmi project.

✓ Jangan gunakan console.log() di Production.

✓ Catat aktivitas bisnis penting.

✓ Jangan mencatat data sensitif.

✓ Sertakan konteks pada setiap log.

Dengan standar ini, proses debugging, monitoring, audit, dan analisis sistem menjadi lebih mudah serta mendukung operasional Production yang stabil.

# CHAPTER 11 — VALIDATION STANDARDS

---

# 11.1 Goals

Seluruh input pada NIAHAIR ERP wajib divalidasi sebelum diproses oleh Business Logic.

Validation bertujuan untuk.

- Menjaga kualitas data.
- Mencegah data tidak valid masuk ke database.
- Meningkatkan keamanan aplikasi.
- Memberikan pesan error yang konsisten.

---

# 11.2 Validation Principles

Seluruh Validation mengikuti prinsip.

✅ Validate Early

✅ Consistent

✅ Reusable

✅ Secure

✅ User Friendly

---

# 11.3 Validation Flow

Seluruh Request mengikuti alur berikut.

```

Client

↓

Validation

↓

Controller

↓

Service

↓

Repository

↓

Database

```

Business Logic hanya dijalankan apabila Validation berhasil.

---

# 11.4 What Must Be Validated

Seluruh input wajib divalidasi.

Minimal.

- Required Field
- Data Type
- String Length
- Number Range
- Enum
- Date Format
- UUID Format
- Email Format
- Phone Number Format

---

# 11.5 Validation Layers

| Layer | Responsibility |
|--------|----------------|
| Client | UX Validation |
| API Validation | Request Validation |
| Service | Business Validation |
| Database | Constraint Validation |

Validation tidak hanya dilakukan di Frontend.

---

# 11.6 Request Validation

Seluruh Request Body.

Query Parameter.

Route Parameter.

Headers.

Harus divalidasi.

Contoh.

```ts
POST /customers

name

phone

email
```

Semuanya harus memiliki aturan validasi.

---

# 11.7 Business Validation

Business Validation dilakukan di Service.

Contoh.

✅ Customer belum terdaftar.

✅ Appointment tidak bentrok.

✅ Stock mencukupi.

✅ Deposit belum digunakan.

Business Validation tidak dilakukan di DTO.

---

# 11.8 Database Validation

Gunakan Constraint Database.

Contoh.

- UNIQUE
- FOREIGN KEY
- NOT NULL
- CHECK (bila diperlukan)

Database adalah lapisan pertahanan terakhir.

---

# 11.9 Validation Messages

Pesan harus jelas.

### ✅ Good

```text
Phone number is invalid.
```

```text
Customer already exists.
```

### ❌ Bad

```text
Invalid input.
```

```text
Validation failed.
```

---

# 11.10 Validation Rules

Gunakan Validator resmi project.

Jangan membuat validasi manual berulang.

Gunakan reusable schema.

---

# 11.11 Input Sanitization

Seluruh input harus dibersihkan bila diperlukan.

Contoh.

- Trim whitespace.
- Normalisasi email menjadi lowercase.
- Hilangkan karakter yang tidak diperlukan.
- Validasi format nomor telepon.

Sanitization tidak boleh mengubah makna data bisnis.

---

# 11.12 File Validation

Upload file wajib divalidasi.

Minimal.

- Tipe file.
- Ukuran file.
- Jumlah file.
- MIME Type.

Jangan hanya mengandalkan ekstensi file.

---

# 11.13 Validation Response

Format Error mengikuti standar API.

```json
{
  "success": false,
  "message": "Validation failed.",
  "errors": [
    {
      "field": "email",
      "message": "Email is invalid."
    }
  ]
}
```

---

# 11.14 Validation Rules Checklist

Sebelum Pull Request.

☐ Request Body divalidasi.

☐ Query divalidasi.

☐ Route Parameter divalidasi.

☐ Business Rule divalidasi.

☐ Database Constraint tersedia.

☐ Error Message jelas.

☐ Response sesuai standar.

---

# 11.15 Good Example

```ts
createCustomerSchema = {

name: required,

email: email(),

phone: phone(),

branchId: uuid()

}
```

✔ Mudah digunakan kembali.

✔ Konsisten.

✔ Mudah diuji.

---

# 11.16 Bad Example

```ts
if(!req.body.name){

...

}

if(req.body.email){

...

}

if(req.body.phone){

...

}
```

✘ Sulit dipelihara.

✘ Tidak dapat digunakan kembali.

✘ Tidak konsisten.

---

# 11.17 Quick Reference

| Validation | Required |
|------------|----------|
| Request Body | ✅ |
| Query Parameter | ✅ |
| Route Parameter | ✅ |
| UUID | ✅ |
| Email | ✅ |
| Phone | ✅ |
| Business Rule | ✅ |
| File Upload | ✅ |

---

# 11.18 Best Practices

✅ Gunakan schema validation.

✅ Gunakan validator yang dapat digunakan kembali.

✅ Pisahkan Request Validation dan Business Validation.

✅ Berikan pesan error yang spesifik.

✅ Sanitasi input sebelum diproses.

---

# 11.19 Common Mistakes

❌ Validasi hanya di Frontend.

❌ Validasi di Controller dengan `if` manual.

❌ Tidak memvalidasi Query Parameter.

❌ Tidak memvalidasi Route Parameter.

❌ Menaruh Business Rule di DTO.

❌ Mengirim pesan error yang terlalu umum.

---

# 11.20 Chapter Summary

Seluruh Validation pada NIAHAIR ERP harus mengikuti standar yang konsisten.

Prinsip utama.

✓ Validasi dilakukan sebelum Business Logic.

✓ Gunakan schema validation.

✓ Pisahkan Request Validation dan Business Validation.

✓ Gunakan Database Constraint sebagai perlindungan terakhir.

✓ Berikan pesan error yang jelas dan konsisten.

Dengan standar ini, kualitas data tetap terjaga, keamanan aplikasi meningkat, dan seluruh modul menggunakan mekanisme validasi yang seragam.

# CHAPTER 12 — TESTING STANDARDS

---

# 12.1 Goals

Seluruh source code pada NIAHAIR ERP harus dapat diuji secara konsisten.

Testing memastikan bahwa perubahan kode tidak merusak fitur yang sudah ada dan seluruh Business Rule berjalan sesuai harapan.

---

# 12.2 Testing Principles

Seluruh testing mengikuti prinsip.

✅ Testable

✅ Repeatable

✅ Independent

✅ Fast

✅ Maintainable

Setiap test harus dapat dijalankan secara terpisah tanpa bergantung pada test lain.

---

# 12.3 Testing Scope

Minimal testing dilakukan pada.

| Component | Required |
|------------|----------|
| Service | ✅ |
| Repository | ✅ |
| API Endpoint | ✅ |
| Utility | ✅ |
| Business Logic | ✅ |

Frontend mengikuti standar testing tersendiri pada `09_TESTING_GUIDE.md`.

---

# 12.4 Test Structure

Seluruh test mengikuti struktur.

```text
tests/

├── unit/
├── integration/
├── api/
├── fixtures/
├── factories/
└── helpers/
```

---

# 12.5 File Naming

Gunakan.

```text
*.spec.ts
```

atau

```text
*.test.ts
```

### ✅ Good

```text
customer.service.spec.ts

payment.repository.spec.ts

appointment.api.spec.ts
```

### ❌ Bad

```text
customerTest.ts

testCustomer.ts

testing.ts
```

---

# 12.6 Unit Test Rules

Unit Test hanya menguji satu komponen.

Gunakan Mock apabila diperlukan.

Jangan mengakses Database langsung.

### Contoh

```text
CustomerService

↓

Mock Repository

↓

Assertion
```

---

# 12.7 Integration Test Rules

Integration Test menguji komunikasi antar layer.

Contoh.

```text
Controller

↓

Service

↓

Repository

↓

Database
```

Gunakan Database khusus untuk testing.

---

# 12.8 API Test Rules

Seluruh endpoint utama harus memiliki API Test.

Minimal menguji.

- Success Response
- Validation Error
- Unauthorized
- Forbidden
- Not Found
- Business Error

---

# 12.9 Mock Rules

Gunakan Mock hanya untuk dependency eksternal.

Contoh.

✅ Email

✅ WhatsApp

✅ Cloudinary

✅ Accurate API

Jangan Mock Business Logic.

---

# 12.10 Test Data

Gunakan Factory atau Fixture.

Jangan Hardcode data berulang.

### Good

```ts
const customer = customerFactory.build();
```

### Bad

```ts
const customer = {

id:"1",

name:"John"

}
```

---

# 12.11 Assertion Rules

Setiap test minimal memiliki assertion yang jelas.

### Good

```ts
expect(result.success).toBe(true);
```

Jangan membuat test tanpa assertion.

---

# 12.12 Coverage

Target minimum.

| Layer | Coverage |
|--------|----------|
| Service | ≥90% |
| Repository | ≥80% |
| Utility | ≥90% |
| API | Endpoint utama wajib diuji |

Coverage digunakan sebagai indikator, bukan satu-satunya ukuran kualitas.

---

# 12.13 Best Practices

✅ Test satu perilaku dalam satu test.

✅ Gunakan nama test yang jelas.

✅ Pisahkan Arrange, Act, Assert.

✅ Gunakan Factory.

✅ Mock dependency eksternal.

---

# 12.14 Common Mistakes

❌ Test saling bergantung.

❌ Hardcode data.

❌ Tidak ada assertion.

❌ Test terlalu panjang.

❌ Mock seluruh aplikasi.

❌ Menguji banyak skenario dalam satu test.

---

# 12.15 Checklist

Sebelum Pull Request.

☐ Unit Test dibuat.

☐ Integration Test diperbarui.

☐ API Test berjalan.

☐ Factory digunakan.

☐ Tidak ada Hardcoded Test Data.

☐ Seluruh test lulus.

---

# 12.16 Quick Reference

| Rule | Standard |
|------|----------|
| File | `*.spec.ts` |
| Unit Test | Mock Repository |
| Integration | Test Database |
| API | Endpoint utama |
| Mock | External Service |
| Test Data | Factory / Fixture |
| Coverage | Service ≥90% |

---

# 12.17 Chapter Summary

Seluruh testing pada NIAHAIR ERP harus mengikuti standar yang konsisten.

Prinsip utama.

✓ Unit Test untuk Business Logic.

✓ Integration Test untuk komunikasi antar layer.

✓ API Test untuk endpoint.

✓ Gunakan Factory dan Fixture.

✓ Mock hanya untuk dependency eksternal.

✓ Setiap test harus independen, mudah dipahami, dan dapat dijalankan berulang.

Dengan standar ini, kualitas source code tetap terjaga dan perubahan pada satu module tidak menimbulkan regresi pada module lain.

# CHAPTER 13 — GIT WORKFLOW & BRANCH STRATEGY

---

# 13.1 Goals

Seluruh pengembangan NIAHAIR ERP harus menggunakan workflow Git yang konsisten.

Tujuan.

- Mempermudah kolaborasi.
- Mengurangi merge conflict.
- Memudahkan rollback.
- Menjaga riwayat perubahan.
- Mendukung proses Code Review.

---

# 13.2 Branch Strategy

Gunakan branch berikut.

| Branch | Purpose |
|---------|---------|
| main | Production |
| develop | Development |
| feature/* | Fitur baru |
| fix/* | Bug Fix |
| hotfix/* | Perbaikan Production |
| refactor/* | Refactoring |
| docs/* | Dokumentasi |
| chore/* | Maintenance |

---

# 13.3 Branch Naming

Gunakan format.

```text
feature/customer-module

feature/appointment

feature/payment

fix/login-error

hotfix/payment-failure

refactor/customer-service

docs/api-standards

chore/update-eslint
```

---

# 13.4 Commit Convention

Gunakan Conventional Commits.

| Prefix | Purpose |
|---------|---------|
| feat | Fitur baru |
| fix | Bug |
| refactor | Refactoring |
| docs | Dokumentasi |
| test | Testing |
| chore | Maintenance |
| style | Formatting |
| perf | Performance |
| build | Build |
| ci | CI/CD |

---

### Good

```text
feat(customer): add customer import

fix(payment): prevent duplicate payment

docs(api): update payment endpoint

refactor(inventory): simplify stock service
```

---

### Bad

```text
update

fix

commit

new

testing

123
```

---

# 13.5 Branch Rules

Developer.

✅ Buat branch dari `develop`.

✅ Satu branch untuk satu pekerjaan.

✅ Hapus branch setelah merge.

Jangan commit langsung ke `main`.

---

# 13.6 Pull Request Rules

Setiap perubahan dilakukan melalui Pull Request.

PR wajib.

- Memiliki deskripsi.
- Menjelaskan perubahan.
- Menjelaskan alasan perubahan.
- Menyebut issue terkait (jika ada).

---

# 13.7 Merge Rules

Gunakan.

✅ Squash Merge.

atau.

✅ Rebase Merge.

Hindari Merge Commit yang tidak diperlukan.

---

# 13.8 Code Review Rules

Minimal satu reviewer.

Review meliputi.

- Business Rule.
- Architecture.
- Security.
- Performance.
- Testing.
- Documentation.

PR tidak boleh di-merge tanpa review.

---

# 13.9 Before Commit Checklist

Sebelum commit.

☐ Build berhasil.

☐ Lint berhasil.

☐ Test lulus.

☐ Tidak ada file sementara.

☐ Dokumentasi diperbarui bila diperlukan.

---

# 13.10 Before Merge Checklist

Sebelum merge.

☐ PR telah direview.

☐ Tidak ada konflik.

☐ CI berhasil.

☐ Testing berhasil.

☐ Approval diperoleh.

---

# 13.11 Protected Branch

Branch berikut harus diproteksi.

```text
main

develop
```

Tidak boleh melakukan force push.

Tidak boleh langsung commit.

---

# 13.12 Version Tag

Gunakan Semantic Versioning.

```text
v1.0.0

v1.1.0

v1.1.1
```

Format.

```
MAJOR.MINOR.PATCH
```

---

# 13.13 Best Practices

✅ Commit kecil dan fokus.

✅ Push secara berkala.

✅ Gunakan pesan commit yang jelas.

✅ Rebase branch yang tertinggal.

✅ Hapus branch yang sudah selesai.

---

# 13.14 Common Mistakes

❌ Commit banyak fitur sekaligus.

❌ Push langsung ke main.

❌ Pesan commit tidak jelas.

❌ Merge tanpa review.

❌ Menyimpan file sementara ke Git.

---

# 13.15 Checklist

Sebelum Push.

☐ Branch sesuai standar.

☐ Commit sesuai Conventional Commits.

☐ Test berhasil.

☐ Lint berhasil.

☐ Tidak ada konflik.

☐ PR siap dibuat.

---

# 13.16 Quick Reference

| Item | Standard |
|------|----------|
| Main Branch | main |
| Development Branch | develop |
| Feature | feature/* |
| Bug Fix | fix/* |
| Hotfix | hotfix/* |
| Commit | Conventional Commits |
| Merge | Squash / Rebase |
| Version | Semantic Versioning |

---

# 13.17 Chapter Summary

Seluruh pengembangan NIAHAIR ERP menggunakan Git Workflow yang konsisten.

Prinsip utama.

✓ Gunakan branch sesuai jenis pekerjaan.

✓ Gunakan Conventional Commits.

✓ Semua perubahan melalui Pull Request.

✓ Code Review wajib.

✓ Branch `main` dan `develop` diproteksi.

✓ Gunakan Semantic Versioning.

Dengan standar ini, riwayat perubahan menjadi lebih rapi, proses review lebih mudah, dan kolaborasi antar developer maupun AI dapat berjalan secara konsisten.

# CHAPTER 14 — CODE REVIEW STANDARDS

---

# 14.1 Goals

Seluruh perubahan source code pada NIAHAIR ERP wajib melalui Code Review sebelum di-merge.

Code Review bertujuan untuk.

- Menjaga kualitas kode.
- Memastikan kepatuhan terhadap Coding Standards.
- Mengurangi bug.
- Menjaga konsistensi arsitektur.
- Berbagi pengetahuan antar developer.

---

# 14.2 Review Principles

Seluruh Code Review mengikuti prinsip.

✅ Constructive

✅ Objective

✅ Consistent

✅ Respectful

✅ Business Oriented

Review berfokus pada kualitas kode, bukan pada individu.

---

# 14.3 Review Scope

Minimal review mencakup.

- Architecture
- Business Rules
- Security
- Performance
- Maintainability
- Readability
- Testing
- Documentation

---

# 14.4 Architecture Review

Pastikan.

✅ Mengikuti Layered Architecture.

✅ Controller tanpa Business Logic.

✅ Service sebagai pusat Business Logic.

✅ Repository hanya mengakses Database.

✅ Tidak ada dependency yang melanggar aturan.

---

# 14.5 Business Rule Review

Pastikan.

✅ Implementasi sesuai Business Rules.

✅ Tidak ada logika bisnis yang hilang.

✅ Tidak ada perubahan perilaku tanpa persetujuan.

---

# 14.6 Security Review

Pastikan.

✅ Input divalidasi.

✅ Permission diterapkan.

✅ Tidak ada Hardcoded Secret.

✅ Tidak ada SQL Injection.

✅ Tidak membocorkan data sensitif.

---

# 14.7 Performance Review

Pastikan.

✅ Pagination digunakan.

✅ Tidak ada N+1 Query.

✅ Query efisien.

✅ Tidak ada proses berat yang tidak diperlukan.

---

# 14.8 Code Quality Review

Pastikan.

✅ Nama jelas.

✅ Function pendek.

✅ Tidak ada duplicate code.

✅ Mudah dibaca.

✅ Mengikuti Naming Convention.

---

# 14.9 Testing Review

Pastikan.

✅ Unit Test tersedia.

✅ Integration Test diperbarui bila diperlukan.

✅ Test berhasil dijalankan.

✅ Tidak menurunkan coverage secara signifikan.

---

# 14.10 Documentation Review

Pastikan.

✅ API Documentation diperbarui.

✅ Data Dictionary diperbarui bila ada perubahan data.

✅ Dokumentasi lain diperbarui bila diperlukan.

---

# 14.11 Pull Request Checklist

Sebelum Approval.

☐ Build berhasil.

☐ Test berhasil.

☐ Tidak ada konflik.

☐ Dokumentasi diperbarui.

☐ Coding Standards dipatuhi.

☐ Business Rules dipatuhi.

☐ Security diperiksa.

---

# 14.12 Approval Rules

Pull Request dapat disetujui apabila.

- Tidak ada Critical Issue.
- Tidak ada Bug serius.
- Seluruh checklist terpenuhi.
- Reviewer memberikan persetujuan.

---

# 14.13 Common Review Comments

Contoh komentar yang baik.

✅ "Business Logic sebaiknya dipindahkan ke Service."

✅ "Gunakan Repository daripada Prisma langsung."

✅ "Tambahkan Validation untuk field ini."

✅ "Gunakan Constant daripada Hardcode."

Hindari komentar yang tidak memberikan solusi.

---

# 14.14 Common Mistakes

❌ Business Logic di Controller.

❌ Hardcoded Value.

❌ Tidak ada Validation.

❌ Tidak ada Test.

❌ Query tidak efisien.

❌ Dokumentasi tidak diperbarui.

---

# 14.15 Code Review Checklist

Sebelum Merge.

☐ Architecture sesuai.

☐ Business Rules sesuai.

☐ Security sesuai.

☐ Performance sesuai.

☐ Validation lengkap.

☐ Logging sesuai.

☐ Testing lulus.

☐ Dokumentasi diperbarui.

---

# 14.16 Quick Reference

| Area | Review |
|------|--------|
| Architecture | ✅ |
| Business Rules | ✅ |
| Security | ✅ |
| Performance | ✅ |
| Validation | ✅ |
| Logging | ✅ |
| Testing | ✅ |
| Documentation | ✅ |

---

# 14.17 Chapter Summary

Seluruh perubahan source code pada NIAHAIR ERP wajib melalui Code Review.

Prinsip utama.

✓ Fokus pada kualitas kode.

✓ Pastikan sesuai arsitektur.

✓ Pastikan sesuai Business Rules.

✓ Pastikan aman dan efisien.

✓ Pastikan dokumentasi dan testing selalu diperbarui.

Dengan standar ini, kualitas source code dapat dipertahankan secara konsisten, meminimalkan regresi, dan memastikan seluruh perubahan mengikuti standar resmi proyek.

# CHAPTER 15 — DEVELOPER CHEAT SHEET & BEST PRACTICES

---

# 15.1 Purpose

Chapter ini merupakan ringkasan seluruh Coding Standards NIAHAIR ERP.

Gunakan chapter ini sebagai referensi cepat saat melakukan development, code review, maupun AI-assisted coding.

---

# 15.2 Layer Responsibility

| Layer | Responsibility | Don't Do |
|--------|----------------|----------|
| Route | Register Endpoint | Business Logic |
| Controller | Request & Response | Database Query |
| Validation | Validate Input | Business Logic |
| Service | Business Logic | HTTP Response |
| Repository | Database Access | Business Logic |
| Prisma | ORM | Business Logic |
| Database | Data Storage | Application Logic |

---

# 15.3 Naming Cheat Sheet

| Item | Standard |
|------|----------|
| Folder | lowercase |
| File | kebab-case |
| Variable | camelCase |
| Function | verb + object |
| Class | PascalCase |
| Enum | PascalCase |
| Enum Value | UPPER_SNAKE_CASE |
| Constant | UPPER_SNAKE_CASE |
| Table | snake_case plural |
| Column | snake_case |
| API | plural kebab-case |

---

# 15.4 Backend Rules

✅ Controller hanya menerima Request dan mengembalikan Response.

✅ Service berisi seluruh Business Logic.

✅ Repository hanya mengakses Database.

✅ Validation dilakukan sebelum Service.

✅ Transaction hanya di Service.

❌ Jangan mengakses Prisma dari Controller.

❌ Jangan menaruh Business Logic di Repository.

---

# 15.5 Frontend Rules

✅ Page mengatur Layout.

✅ Component hanya menangani UI.

✅ Hook menangani State dan reusable logic.

✅ Service hanya melakukan API Call.

❌ Jangan memanggil API dari Component.

❌ Jangan menaruh Business Logic di Page.

---

# 15.6 Database Rules

✅ Gunakan UUID sebagai Primary Key.

✅ Gunakan Decimal untuk nilai uang.

✅ Gunakan Migration.

✅ Gunakan Index pada field yang sering digunakan.

❌ Jangan mengubah Database secara manual.

---

# 15.7 API Rules

✅ RESTful Endpoint.

✅ Response Format konsisten.

✅ Validation pada semua Request.

✅ Pagination untuk List Endpoint.

✅ Gunakan HTTP Status Code yang benar.

---

# 15.8 Error Handling Rules

✅ Gunakan Custom Error.

✅ Gunakan Global Error Handler.

✅ Log seluruh Error.

❌ Jangan mengirim Stack Trace ke Client.

---

# 15.9 Logging Rules

✅ Gunakan Structured Logging.

✅ Sertakan Request ID.

✅ Sertakan User ID bila tersedia.

❌ Jangan gunakan console.log() pada Production.

❌ Jangan mencatat data sensitif.

---

# 15.10 Validation Rules

✅ Validasi Request.

✅ Validasi Business Rule.

✅ Gunakan Database Constraint.

❌ Jangan hanya mengandalkan Frontend Validation.

---

# 15.11 Testing Rules

✅ Unit Test untuk Business Logic.

✅ Integration Test untuk komunikasi antar layer.

✅ API Test untuk endpoint utama.

✅ Gunakan Factory dan Fixture.

---

# 15.12 Git Rules

✅ Gunakan Conventional Commits.

✅ Gunakan Feature Branch.

✅ Pull Request wajib.

✅ Code Review wajib.

❌ Jangan commit langsung ke main.

---

# 15.13 Pull Request Checklist

Sebelum membuat Pull Request.

☐ Build berhasil.

☐ Test lulus.

☐ Lint lulus.

☐ Validation selesai.

☐ Logging sesuai.

☐ Error Handling sesuai.

☐ Dokumentasi diperbarui.

☐ Tidak ada Hardcode.

☐ Tidak ada Duplicate Code.

---

# 15.14 AI Coding Checklist

Sebelum menerima hasil AI.

☐ Mengikuti Folder Structure.

☐ Mengikuti Naming Convention.

☐ Mengikuti Layered Architecture.

☐ Menggunakan DTO.

☐ Menggunakan Validation.

☐ Menggunakan Repository Pattern.

☐ Menggunakan Response Standard.

☐ Tidak membuat pola baru.

☐ Tidak mengubah Business Rule tanpa persetujuan.

---

# 15.15 Golden Rules

Seluruh developer dan AI wajib mengikuti aturan berikut.

✓ Business Rule lebih penting daripada Framework.

✓ Konsistensi lebih penting daripada preferensi pribadi.

✓ Readability lebih penting daripada kode yang rumit.

✓ Security bukan fitur tambahan, tetapi bagian dari desain.

✓ Dokumentasi harus diperbarui setiap ada perubahan.

✓ Seluruh kode harus dapat diuji.

✓ Hindari duplikasi.

✓ Jangan melakukan Hardcode.

✓ Selalu pikirkan maintainability.

✓ Jika ragu, ikuti standar proyek.

---

# 15.16 Quick Decision Guide

| Pertanyaan | Jawaban |
|------------|---------|
| Business Logic di mana? | Service |
| Query Database di mana? | Repository |
| Validasi Request di mana? | Validator |
| API Call Frontend di mana? | Service |
| State Management di mana? | Hook / Store |
| Error ditangani di mana? | Global Error Handler |
| Logging menggunakan apa? | Project Logger |
| Migration bagaimana? | Prisma Migration |
| Commit bagaimana? | Conventional Commits |
| Review bagaimana? | Pull Request |

---

# 15.17 Chapter Summary

08_CODING_STANDARDS.md merupakan standar resmi pengembangan NIAHAIR ERP.

Seluruh developer dan AI Coding Assistant wajib mengikuti standar ini dalam setiap perubahan source code.

Dengan menerapkan standar yang konsisten, NIAHAIR ERP akan memiliki codebase yang:

✓ Mudah dipahami.

✓ Mudah diuji.

✓ Mudah dipelihara.

✓ Mudah dikembangkan.

✓ Aman.

✓ Konsisten.

✓ Siap berkembang menjadi sistem enterprise dalam jangka panjang.

