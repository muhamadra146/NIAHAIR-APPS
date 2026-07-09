# API STANDARDS

Version : 1.0

Status : Living Document

Owner : Dani

Lead Architect : ChatGPT

Implementation : Claude Code

---

# CHAPTER 1 — INTRODUCTION

---

# 1.1 Purpose

API Standards mendefinisikan standar resmi pengembangan seluruh REST API pada NIAHAIR ERP.

Dokumen ini menjadi acuan utama bagi seluruh Backend Developer, Frontend Developer, Mobile Developer, QA Engineer, DevOps Engineer, System Integrator, serta AI Coding Assistant.

Seluruh endpoint yang dibuat harus mengikuti standar pada dokumen ini.

API Standards tidak mendefinisikan endpoint tertentu.

API Standards mendefinisikan bagaimana seluruh endpoint harus dirancang, diimplementasikan, didokumentasikan, diamankan, dan dipelihara.

---

# 1.2 Objectives

Dokumen ini memiliki tujuan.

- Menyeragamkan seluruh REST API.
- Mengurangi inkonsistensi implementasi.
- Mempermudah integrasi Frontend dan Backend.
- Mempermudah integrasi Accurate.
- Mempermudah pengujian.
- Mempermudah dokumentasi.
- Mempermudah maintenance.
- Menjadi kontrak resmi antar tim.

---

# 1.3 Scope

Standar ini berlaku untuk seluruh API.

Authentication.

Authorization.

Customer.

Employee.

Appointment.

Treatment.

Inventory.

Warehouse.

Sales.

Invoice.

Deposit.

Payment.

Production.

Reporting.

System.

Notification.

Media.

Audit.

Integration.

Future Module.

---

# 1.4 Audience

Dokumen ini digunakan oleh.

Software Architect.

Backend Developer.

Frontend Developer.

Mobile Developer.

QA Engineer.

DevOps Engineer.

Business Analyst.

System Integrator.

AI Coding Assistant.

---

# 1.5 API Philosophy

API NIAHAIR ERP mengikuti prinsip.

Simple.

Consistent.

Predictable.

Secure.

Scalable.

RESTful.

Business Driven.

Seluruh endpoint harus mudah dipahami tanpa membaca implementasi.

---

# 1.6 API Style

NIAHAIR ERP menggunakan.

REST API.

JSON.

HTTPS.

UTF-8.

Future.

WebSocket.

Webhook.

GraphQL (bila diperlukan).

REST tetap menjadi standar utama.

---

# 1.7 Single Source of Truth

Backend merupakan sumber kebenaran seluruh data.

Frontend tidak boleh menyimpan Business Rule.

Frontend hanya menampilkan data yang diberikan Backend.

Seluruh validasi bisnis dilakukan pada Backend.

---

# 1.8 Business Driven API

API dirancang berdasarkan proses bisnis.

Bukan berdasarkan tabel database.

Contoh.

Benar.

POST /appointments

POST /treatments/{id}/complete

POST /payments

Salah.

POST /appointment_table

POST /updateTreatmentStatus

---

# 1.9 Resource Oriented

Setiap endpoint merepresentasikan Resource.

Contoh.

Customer.

Appointment.

Treatment.

Invoice.

Inventory.

Employee.

Branch.

Warehouse.

Resource merupakan inti desain REST API.

---

# 1.10 Stateless

Seluruh Request bersifat Stateless.

Server tidak menyimpan Session antar Request.

Seluruh informasi Authentication dikirim pada setiap Request.

---

# 1.11 JSON Standard

Seluruh Request dan Response menggunakan.

application/json

Encoding.

UTF-8.

Response harus konsisten.

---

# 1.12 HTTPS Only

Seluruh API Production wajib menggunakan HTTPS.

HTTP tidak diperbolehkan.

---

# 1.13 UTC Standard

Seluruh DateTime disimpan menggunakan UTC.

Konversi Time Zone dilakukan pada Client.

Format menggunakan ISO 8601.

Contoh.

2026-07-05T08:30:00Z

---

# 1.14 API Base URL

Format umum.

Production.

/api/v1/

Contoh.

GET /api/v1/customers

GET /api/v1/appointments

GET /api/v1/invoices

Seluruh endpoint menggunakan prefix yang sama.

---

# 1.15 Versioning

Versi API ditentukan pada URL.

Contoh.

/api/v1

Future.

/api/v2

Perubahan Breaking Change dilakukan melalui Major Version baru.

---

# 1.16 Content Negotiation

Request.

Content-Type.

application/json

Response.

application/json

Media Upload menggunakan.

multipart/form-data

---

# 1.17 Time Standard

Database.

UTC.

Response.

ISO 8601.

Client bertanggung jawab melakukan konversi Time Zone.

---

# 1.18 Numeric Standard

Currency.

Decimal.

Quantity.

Decimal.

Percentage.

Decimal.

Identifier.

UUID.

Tidak menggunakan Float untuk nilai keuangan.

---

# 1.19 API Documentation

Seluruh endpoint wajib memiliki dokumentasi.

Purpose.

Request.

Response.

Validation.

Authentication.

Permission.

Error Response.

Example.

---

# 1.20 Development Principles

API harus.

Backward Compatible.

Testable.

Maintainable.

Observable.

Reusable.

---

# 1.21 Security First

Seluruh endpoint mempertimbangkan.

Authentication.

Authorization.

Validation.

Audit.

Logging.

Rate Limit.

Encryption.

Security merupakan bagian dari desain API.

---

# 1.22 Consistency

Seluruh endpoint mengikuti pola yang sama.

URL.

Response.

Pagination.

Validation.

Status Code.

Error Format.

Naming.

Tidak diperbolehkan membuat format khusus pada satu Module.

---

# 1.23 Integration Ready

Seluruh API harus siap untuk.

Frontend Web.

Mobile App.

Admin Portal.

Background Job.

Accurate Integration.

Webhook.

Future Public API.

---

# 1.24 Living Document

API Standards merupakan Living Document.

Seluruh perubahan standar harus melalui.

Architecture Review.

Technical Review.

Documentation Update.

---

# 1.25 Chapter Summary

API Standards merupakan kontrak resmi pengembangan Backend NIAHAIR ERP.

Seluruh API harus mengikuti prinsip.

✓ RESTful

✓ Consistent

✓ Secure

✓ Business Driven

✓ Scalable

✓ Predictable

✓ Easy to Maintain

Dokumen ini menjadi dasar seluruh endpoint yang akan dijelaskan pada dokumentasi implementasi API di masa mendatang.

# CHAPTER 2 — API ARCHITECTURE

---

# 2.1 Purpose

Chapter ini mendefinisikan arsitektur Backend API NIAHAIR ERP.

Arsitektur API dirancang agar.

- Modular
- Mudah dipelihara
- Mudah diuji
- Mudah dikembangkan
- Mendukung Multi Branch
- Mendukung Integrasi Accurate
- Mendukung Background Job
- Mendukung AI di masa depan

Seluruh implementasi Backend harus mengikuti arsitektur ini.

---

# 2.2 Architectural Principles

Backend mengikuti prinsip.

Business First.

Layer Separation.

Dependency Direction.

Single Responsibility.

High Cohesion.

Low Coupling.

Setiap Layer hanya memiliki satu tanggung jawab utama.

---

# 2.3 High Level Architecture

Arsitektur Backend.

```

Frontend

↓

REST API

↓

Controller

↓

Service

↓

Repository

↓

Prisma ORM

↓

PostgreSQL

↓

External Services

* Accurate
* Cloudinary
* Queue Worker
* Email
* WhatsApp
* Telegram

```

Seluruh komunikasi database dilakukan melalui Prisma.

Controller tidak boleh mengakses Database secara langsung.

---

# 2.4 Layer Responsibilities

Backend dibagi menjadi beberapa Layer.

Presentation Layer.

Business Layer.

Data Layer.

Infrastructure Layer.

Setiap Layer memiliki tanggung jawab yang jelas.

---

# 2.5 Presentation Layer

Presentation Layer terdiri dari.

Route.

Middleware.

Controller.

Validation.

Authentication.

Authorization.

Layer ini hanya menangani HTTP.

Tidak mengandung Business Logic.

---

# 2.6 Controller

Controller bertugas.

- menerima Request
- memvalidasi Request dasar
- memanggil Service
- mengembalikan Response

Controller tidak boleh.

- menghitung Commission
- menghitung Stock
- mengakses Prisma
- mengakses Accurate

Semua Business Logic berada di Service.

---

# 2.7 Business Layer

Business Layer terdiri dari.

Service.

Domain Logic.

Business Validation.

Workflow.

Calculation.

Seluruh aturan bisnis berada pada Layer ini.

---

# 2.8 Service

Service bertanggung jawab terhadap.

Business Rule.

Workflow.

Validation.

Transaction.

Integration.

Service dapat memanggil beberapa Repository sekaligus.

---

# 2.9 Repository Layer

Repository bertugas.

Membaca Database.

Menulis Database.

Query.

Pagination.

Filtering.

Repository tidak mengetahui HTTP.

Repository tidak mengetahui Response API.

---

# 2.10 Prisma Layer

Prisma merupakan Data Access Layer.

Seluruh Query Database dilakukan melalui Prisma.

Raw SQL hanya digunakan apabila benar-benar diperlukan.

---

# 2.11 Infrastructure Layer

Infrastructure terdiri dari.

Cloudinary.

Accurate.

Queue.

Storage.

Email.

WhatsApp.

Telegram.

Infrastructure tidak mengetahui Business Rule.

---

# 2.12 External Integration

Integrasi eksternal dipisahkan.

Accurate Service.

Cloudinary Service.

Notification Service.

Storage Service.

Queue Service.

Setiap Integration memiliki Service sendiri.

---

# 2.13 Background Job

Proses berat dijalankan melalui Queue.

Contoh.

Accurate Sync.

Generate Report.

Send WhatsApp.

Send Email.

Image Processing.

Import.

Export.

API tidak boleh menunggu proses berat selesai.

---

# 2.14 Transaction Management

Database Transaction menggunakan Prisma Transaction.

Semua proses berikut harus menggunakan Transaction.

Invoice.

Payment.

Deposit.

Inventory.

Production.

Treatment Completion.

Apabila salah satu proses gagal.

Seluruh Transaction harus Rollback.

---

# 2.15 Module Architecture

Setiap Module memiliki struktur yang sama.

```

customer/

customer.controller.ts

customer.service.ts

customer.repository.ts

customer.validation.ts

customer.routes.ts

customer.mapper.ts

customer.types.ts

```

Seluruh Module mengikuti pola yang sama.

---

# 2.16 Dependency Direction

Dependency mengikuti arah.

```

Controller

↓

Service

↓

Repository

↓

Prisma

```

Repository tidak boleh memanggil Controller.

Service tidak boleh memanggil Route.

---

# 2.17 Shared Components

Shared Component.

Logger.

Error Handler.

Response Builder.

Pagination Helper.

Validation Helper.

Date Helper.

Money Helper.

Digunakan oleh seluruh Module.

---

# 2.18 Business Transactions

Business Transaction dapat melibatkan banyak Module.

Contoh.

Treatment Complete.

↓

Material Usage.

↓

Inventory Movement.

↓

Commission.

↓

Invoice.

↓

Timeline.

↓

Accurate Queue.

Semua proses dikendalikan oleh Service.

---

# 2.19 Event Driven Ready

Future.

Backend siap menggunakan Event.

Contoh.

TreatmentCompleted.

↓

InventoryUpdated.

↓

CommissionCreated.

↓

InvoiceCreated.

↓

NotificationSent.

↓

CustomerTimelineUpdated.

---

# 2.20 Error Handling

Semua Error dilempar ke Global Error Handler.

Controller tidak menangani Error secara manual.

Format Error harus konsisten.

---

# 2.21 Logging

Logging dilakukan pada.

HTTP Request.

Database Error.

Business Error.

Integration.

Queue.

Audit.

Tidak menggunakan console.log pada Production.

---

# 2.22 Configuration

Configuration berasal dari.

Environment Variable.

Tidak boleh Hardcode.

Contoh.

Database URL.

JWT Secret.

Accurate Key.

Cloudinary.

SMTP.

---

# 2.23 Scalability

Arsitektur harus mendukung.

100+ Module.

1000+ Endpoint.

Jutaan Transaction.

Puluhan Branch.

Tanpa perubahan besar.

---

# 2.24 Future Evolution

Arsitektur siap berkembang menjadi.

Worker Service.

API Gateway.

Microservice.

AI Service.

Reporting Service.

Realtime Notification.

Tanpa mengubah Business Layer.

---

# 2.25 Chapter Summary

Backend NIAHAIR menggunakan arsitektur berlapis.

Presentation

↓

Business

↓

Repository

↓

Prisma

↓

Database

↓

External Services

Setiap Layer memiliki tanggung jawab yang jelas.

Business Rule selalu berada pada Service.

Database hanya diakses melalui Repository.

Seluruh Backend harus mengikuti arsitektur ini agar konsisten, mudah dipelihara, dan siap berkembang.

# CHAPTER 3 — REST RESOURCE DESIGN

---

# 3.1 Purpose

Chapter ini mendefinisikan standar desain Resource REST API pada NIAHAIR ERP.

Seluruh endpoint harus merepresentasikan Resource bisnis.

API tidak dirancang berdasarkan tabel database maupun nama fungsi.

API dirancang berdasarkan Domain Bisnis.

---

# 3.2 REST Philosophy

REST API dibangun berdasarkan konsep Resource.

Resource merupakan representasi objek bisnis.

Contoh Resource.

Customer.

Appointment.

Treatment.

Invoice.

Payment.

Inventory.

Warehouse.

Employee.

Production.

Branch.

Service.

Resource merupakan inti desain API.

---

# 3.3 Resource Naming

Nama Resource menggunakan.

Plural.

Lowercase.

Kebab tidak digunakan.

Snake Case tidak digunakan.

Contoh.

customers

appointments

treatments

employees

branches

warehouses

inventory

payments

production-orders

---

# 3.4 URI Principles

URI harus sederhana.

URI tidak mengandung kata kerja.

Benar.

GET /customers

POST /customers

PATCH /customers/{id}

Salah.

GET /getCustomers

POST /createCustomer

PATCH /updateCustomer

DELETE /deleteCustomer

---

# 3.5 Collection Resource

Collection digunakan untuk membaca banyak data.

Contoh.

GET /customers

GET /appointments

GET /employees

GET /inventory

GET /payments

Collection dapat menggunakan.

Pagination.

Search.

Sorting.

Filtering.

---

# 3.6 Single Resource

Single Resource digunakan membaca satu data.

Contoh.

GET /customers/{id}

GET /appointments/{id}

GET /inventory/{id}

GET /payments/{id}

Response hanya satu Resource.

---

# 3.7 Nested Resource

Nested Resource digunakan apabila Resource memiliki hubungan yang kuat.

Contoh.

GET /customers/{id}/appointments

GET /customers/{id}/treatments

GET /customers/{id}/media

GET /customers/{id}/timeline

GET /appointments/{id}/services

GET /appointments/{id}/employees

GET /treatments/{id}/media

GET /treatments/{id}/notes

Nested Resource tidak boleh terlalu dalam.

---

# 3.8 Maximum URI Depth

Maksimal.

3 Level.

Benar.

/customers/{id}/appointments

Salah.

/customers/{id}/appointments/{id}/services/{id}

Apabila terlalu kompleks.

Gunakan endpoint baru.

---

# 3.9 Resource Identifier

Seluruh Resource menggunakan UUID.

Contoh.

GET /customers/550e8400-e29b

Business Number tidak digunakan pada URI.

---

# 3.10 Resource Relationship

Relationship mengikuti Domain.

Customer

↓

Appointment

↓

Treatment

↓

Invoice

↓

Payment

Relationship harus konsisten dengan Business Flow.

---

# 3.11 Domain Separation

Endpoint dipisahkan berdasarkan Domain.

Customer.

Appointment.

Treatment.

Inventory.

Finance.

Production.

System.

Tidak mencampur Domain.

---

# 3.12 Custom Action

Action khusus diperbolehkan apabila tidak dapat direpresentasikan sebagai CRUD.

Contoh.

POST /appointments/{id}/check-in

POST /treatments/{id}/start

POST /treatments/{id}/complete

POST /invoices/{id}/void

POST /payments/{id}/refund

Action menggunakan kata kerja.

---

# 3.13 Workflow Endpoint

Workflow mengikuti Business Process.

Appointment.

↓

Check In.

↓

Treatment.

↓

Complete.

↓

Invoice.

↓

Payment.

Endpoint mengikuti urutan Workflow.

---

# 3.14 Resource State

Status Resource diubah menggunakan Action.

Contoh.

POST /appointments/{id}/confirm

POST /appointments/{id}/cancel

POST /appointments/{id}/no-show

Tidak menggunakan.

PATCH status secara bebas.

---

# 3.15 Read vs Write

Endpoint Read.

GET.

Endpoint Write.

POST.

PATCH.

DELETE.

Read tidak mengubah data.

---

# 3.16 Bulk Operations

Bulk menggunakan endpoint khusus.

POST /customers/bulk-import

POST /inventory/bulk-adjustment

POST /payments/bulk-confirm

GET tidak digunakan untuk Bulk Update.

---

# 3.17 Search Endpoint

Search tetap menggunakan Resource.

GET /customers?search=dani

GET /inventory?search=keratin

Tidak membuat.

GET /searchCustomer

---

# 3.18 Report Endpoint

Report dipisahkan.

GET /reports/sales

GET /reports/customers

GET /reports/inventory

Report bukan bagian Resource utama.

---

# 3.19 Dashboard Endpoint

Dashboard menggunakan Domain sendiri.

GET /dashboard

GET /dashboard/sales

GET /dashboard/production

Dashboard bukan Resource CRUD.

---

# 3.20 Media Endpoint

Media dipisahkan.

GET /media/{id}

POST /media

DELETE /media/{id}

Resource lain hanya menyimpan relasi.

---

# 3.21 Notification Endpoint

Notification.

GET /notifications

PATCH /notifications/{id}/read

POST /notifications/read-all

---

# 3.22 Authentication Endpoint

Authentication dipisahkan.

POST /auth/login

POST /auth/logout

POST /auth/refresh

POST /auth/change-password

POST /auth/forgot-password

---

# 3.23 Integration Endpoint

Endpoint Integrasi.

POST /integrations/accurate/sync

GET /integrations/accurate/status

POST /integrations/accurate/retry

Dipisahkan dari Domain Bisnis.

---

# 3.24 URL Stability

URI tidak boleh berubah setelah Production.

Perubahan URI dilakukan melalui Version baru.

---

# 3.25 Future Resource

Future.

AI.

GET /ai/customer-insight

POST /ai/treatment-recommendation

GET /ai/forecast

Resource AI tetap mengikuti standar REST.

---

# CHAPTER 3 SUMMARY

Seluruh REST API NIAHAIR ERP mengikuti prinsip.

✓ Resource Oriented

✓ Business Driven

✓ Consistent URI

✓ Predictable Endpoint

✓ Stateless

✓ Domain Separation

✓ Workflow Friendly

Endpoint dirancang berdasarkan proses bisnis, bukan struktur database maupun implementasi internal sehingga API tetap mudah dipahami, mudah digunakan, dan siap berkembang.

# CHAPTER 4 — ENDPOINT NAMING CONVENTION

---

# 4.1 Purpose

Chapter ini mendefinisikan standar penamaan seluruh endpoint REST API pada NIAHAIR ERP.

Standar ini memastikan seluruh endpoint memiliki pola yang konsisten, mudah dipahami, mudah dipelihara, dan mudah digunakan oleh Frontend, Mobile Application, Integrasi Eksternal, maupun AI Coding Assistant.

Seluruh endpoint wajib mengikuti aturan pada chapter ini.

---

# 4.2 Naming Principles

Seluruh endpoint harus memenuhi prinsip.

Consistent.

Predictable.

Readable.

RESTful.

Business Driven.

Singkat namun jelas.

---

# 4.3 Base URL

Seluruh endpoint menggunakan Base URL.

```
/api/v1
```

Contoh.

```
/api/v1/customers

/api/v1/appointments

/api/v1/invoices
```

Tidak diperbolehkan membuat endpoint di luar Base URL.

---

# 4.4 Resource Naming

Nama Resource menggunakan.

Plural.

Lowercase.

Hyphen apabila terdiri dari lebih dari satu kata.

Contoh.

```
customers

appointments

employees

payments

invoices

inventory

inventory-movements

production-orders

service-materials
```

---

# 4.5 Case Convention

Endpoint menggunakan.

lowercase.

Tidak menggunakan Camel Case.

Tidak menggunakan Pascal Case.

Tidak menggunakan snake_case.

Benar.

```
/customers

/customer-media

/customer-timeline
```

Salah.

```
/Customers

/customerMedia

/customer_media
```

---

# 4.6 URI Convention

URI hanya berisi.

Resource.

Identifier.

Sub Resource.

Action (apabila diperlukan).

Tidak berisi nama tabel.

Tidak berisi nama function.

---

# 4.7 Resource Examples

Benar.

```
GET /customers

POST /customers

GET /customers/{id}

PATCH /customers/{id}

DELETE /customers/{id}
```

Salah.

```
GET /getCustomer

POST /createCustomer

PATCH /updateCustomer

DELETE /deleteCustomer
```

---

# 4.8 Sub Resource

Sub Resource digunakan apabila memiliki hubungan langsung.

Contoh.

```
GET /customers/{id}/appointments

GET /customers/{id}/media

GET /customers/{id}/timeline

GET /customers/{id}/treatments

GET /appointments/{id}/services

GET /appointments/{id}/employees

GET /treatments/{id}/media
```

---

# 4.9 Resource Identifier

Identifier menggunakan UUID.

Contoh.

```
GET /customers/{customerId}

GET /appointments/{appointmentId}

GET /employees/{employeeId}
```

Business Number tidak digunakan sebagai URI.

---

# 4.10 Action Endpoint

Action digunakan apabila bukan CRUD.

Format.

```
POST /resource/{id}/action
```

Contoh.

```
POST /appointments/{id}/confirm

POST /appointments/{id}/check-in

POST /appointments/{id}/cancel

POST /appointments/{id}/no-show

POST /treatments/{id}/start

POST /treatments/{id}/complete

POST /payments/{id}/refund

POST /invoices/{id}/void
```

---

# 4.11 Bulk Endpoint

Operasi massal menggunakan endpoint khusus.

Contoh.

```
POST /customers/bulk-import

POST /customers/bulk-export

POST /inventory/bulk-adjustment

POST /inventory/bulk-update

POST /employees/bulk-assign
```

---

# 4.12 Search Endpoint

Search tidak memiliki endpoint sendiri.

Search menggunakan Query Parameter.

Benar.

```
GET /customers?search=dani

GET /inventory?search=keratin
```

Salah.

```
GET /searchCustomer

GET /findInventory
```

---

# 4.13 Filter Endpoint

Filtering menggunakan Query Parameter.

Contoh.

```
GET /customers?membership=gold

GET /appointments?status=BOOKED

GET /inventory?warehouseId=1

GET /employees?branchId=2
```

---

# 4.14 Sorting Endpoint

Sorting menggunakan Query Parameter.

Contoh.

```
GET /customers?sort=name

GET /customers?sort=-createdAt

GET /inventory?sort=itemName

GET /appointments?sort=startTime
```

Awalan "-" menunjukkan urutan menurun (descending).

---

# 4.15 Pagination Endpoint

Pagination menggunakan Query Parameter.

Contoh.

```
GET /customers?page=1&pageSize=20

GET /appointments?page=2&pageSize=50
```

---

# 4.16 Include Endpoint

Relationship dimuat menggunakan parameter include.

Contoh.

```
GET /customers/{id}?include=membership

GET /customers/{id}?include=appointments

GET /customers/{id}?include=treatments

GET /appointments/{id}?include=services,employees

GET /treatments/{id}?include=media,assignments
```

---

# 4.17 Field Selection

Pemilihan field menggunakan parameter fields.

Contoh.

```
GET /customers?fields=id,fullName,phone

GET /inventory?fields=itemName,qtyOnHand

GET /employees?fields=id,fullName,position
```

---

# 4.18 Dashboard Endpoint

Dashboard memiliki Domain sendiri.

```
GET /dashboard

GET /dashboard/sales

GET /dashboard/customer

GET /dashboard/production

GET /dashboard/inventory
```

Dashboard bukan Resource CRUD.

---

# 4.19 Report Endpoint

Report dipisahkan dari Resource utama.

Contoh.

```
GET /reports/sales

GET /reports/customer

GET /reports/inventory

GET /reports/payroll

GET /reports/production
```

---

# 4.20 Authentication Endpoint

Authentication dipisahkan.

```
POST /auth/login

POST /auth/logout

POST /auth/refresh

POST /auth/change-password

POST /auth/forgot-password

POST /auth/reset-password
```

---

# 4.21 Integration Endpoint

Integrasi eksternal dipisahkan.

```
POST /integrations/accurate/sync

GET /integrations/accurate/status

POST /integrations/accurate/retry

POST /integrations/cloudinary/upload
```

---

# 4.22 System Endpoint

Endpoint sistem.

```
GET /system/settings

PATCH /system/settings

GET /system/health

GET /system/version
```

---

# 4.23 Reserved Words

Tidak menggunakan.

```
new

update

create

delete

insert

save

do

execute

run
```

Sebagai bagian dari URI Resource.

---

# 4.24 URL Stability

Endpoint Production tidak boleh berubah.

Perubahan dilakukan melalui API Version baru.

```
/api/v1

↓

/api/v2
```

---

# 4.25 Chapter Summary

Seluruh endpoint NIAHAIR ERP mengikuti standar.

✓ Lowercase

✓ Plural Resource

✓ RESTful URI

✓ UUID Identifier

✓ Query Parameter untuk Search, Filter, Sort, Pagination

✓ Action Endpoint hanya untuk Business Workflow

✓ URL Stabil

Dengan standar ini seluruh API memiliki pola yang konsisten sehingga mudah dipahami, mudah didokumentasikan, dan mudah dikembangkan pada masa mendatang.

# CHAPTER 5 — HTTP METHODS

---

# 5.1 Purpose

Chapter ini mendefinisikan standar penggunaan HTTP Method pada seluruh REST API NIAHAIR ERP.

Setiap HTTP Method memiliki arti yang spesifik.

Penggunaan Method yang benar akan membuat API lebih konsisten, mudah dipahami, dan kompatibel dengan berbagai Client, Framework, serta Integrasi Eksternal.

Seluruh endpoint wajib mengikuti standar pada chapter ini.

---

# 5.2 Supported HTTP Methods

NIAHAIR ERP menggunakan HTTP Method berikut.

GET

POST

PATCH

PUT

DELETE

OPTIONS

HEAD

Method lain tidak digunakan.

---

# 5.3 GET

GET digunakan untuk membaca Resource.

GET tidak boleh mengubah data.

GET harus bersifat Read Only.

Contoh.

```
GET /customers

GET /customers/{id}

GET /appointments

GET /inventory

GET /reports/sales
```

GET aman dipanggil berulang kali.

---

# 5.4 POST

POST digunakan untuk.

Membuat Resource baru.

Menjalankan Business Action.

Upload File.

Contoh.

```
POST /customers

POST /appointments

POST /payments

POST /media
```

Business Action.

```
POST /appointments/{id}/confirm

POST /appointments/{id}/check-in

POST /treatments/{id}/start

POST /treatments/{id}/complete

POST /payments/{id}/refund

POST /invoices/{id}/void
```

---

# 5.5 PATCH

PATCH digunakan untuk mengubah sebagian Field.

PATCH merupakan Method utama Update pada NIAHAIR ERP.

Contoh.

```
PATCH /customers/{id}

PATCH /employees/{id}

PATCH /system/settings
```

PATCH hanya mengirim Field yang berubah.

Contoh.

```json
{
    "phone": "081234567890"
}
```

---

# 5.6 PUT

PUT digunakan untuk mengganti seluruh Resource.

PUT jarang digunakan.

PUT hanya dipakai apabila seluruh Resource dikirim ulang.

Contoh.

```
PUT /system/settings
```

Frontend wajib mengirim seluruh data Resource.

---

# 5.7 DELETE

DELETE digunakan untuk Soft Delete.

DELETE tidak menghapus data secara permanen.

Contoh.

```
DELETE /customers/{id}

DELETE /employees/{id}

DELETE /services/{id}
```

Database menggunakan.

deletedAt

deletedBy

isActive

---

# 5.8 OPTIONS

OPTIONS digunakan untuk.

CORS.

Preflight Request.

Framework menangani OPTIONS secara otomatis.

---

# 5.9 HEAD

HEAD digunakan untuk.

Health Check.

Existence Check.

Monitoring.

HEAD tidak mengembalikan Response Body.

---

# 5.10 Idempotency

Method yang Idempotent.

GET

PUT

DELETE

HEAD

OPTIONS

PATCH tergantung implementasi.

POST tidak bersifat Idempotent.

---

# 5.11 Safe Methods

Method yang aman.

GET

HEAD

OPTIONS

Safe Method tidak boleh mengubah data.

---

# 5.12 Non Safe Methods

Method berikut dapat mengubah data.

POST

PATCH

PUT

DELETE

Method ini memerlukan Authentication.

---

# 5.13 Business Workflow

Workflow menggunakan POST.

Contoh.

```
POST /appointments/{id}/confirm

POST /appointments/{id}/check-in

POST /appointments/{id}/cancel

POST /appointments/{id}/no-show

POST /treatments/{id}/start

POST /treatments/{id}/complete

POST /production-orders/{id}/release

POST /production-orders/{id}/complete
```

---

# 5.14 Bulk Operations

Operasi massal menggunakan POST.

Contoh.

```
POST /customers/bulk-import

POST /inventory/bulk-adjustment

POST /employees/bulk-update

POST /payments/bulk-confirm
```

---

# 5.15 Upload Operations

Upload selalu menggunakan POST.

Contoh.

```
POST /media

POST /customers/{id}/media

POST /treatments/{id}/media
```

Content Type.

```
multipart/form-data
```

---

# 5.16 Download Operations

Download menggunakan GET.

Contoh.

```
GET /reports/sales/export

GET /media/{id}

GET /invoice/{id}/pdf
```

---

# 5.17 Search Operations

Search menggunakan GET.

Contoh.

```
GET /customers?search=dani

GET /inventory?search=keratin

GET /employees?search=andi
```

Search tidak memiliki Method khusus.

---

# 5.18 Filter Operations

Filter menggunakan GET.

Contoh.

```
GET /appointments?status=BOOKED

GET /customers?membership=gold

GET /inventory?warehouseId=1
```

---

# 5.19 Sorting Operations

Sorting menggunakan GET.

Contoh.

```
GET /customers?sort=name

GET /customers?sort=-createdAt

GET /inventory?sort=itemName
```

---

# 5.20 Pagination

Pagination menggunakan GET.

Contoh.

```
GET /customers?page=1&pageSize=20

GET /appointments?page=2&pageSize=50
```

---

# 5.21 Authentication

Login menggunakan POST.

```
POST /auth/login
```

Logout.

```
POST /auth/logout
```

Refresh Token.

```
POST /auth/refresh
```

Forgot Password.

```
POST /auth/forgot-password
```

Reset Password.

```
POST /auth/reset-password
```

---

# 5.22 Accurate Integration

Seluruh proses sinkronisasi menggunakan POST.

Contoh.

```
POST /integrations/accurate/sync

POST /integrations/accurate/retry

POST /integrations/accurate/customer-sync

POST /integrations/accurate/item-sync
```

Status sinkronisasi menggunakan GET.

```
GET /integrations/accurate/status
```

---

# 5.23 Error Handling

Method yang tidak didukung mengembalikan.

HTTP 405

Method Not Allowed.

Server harus memberikan daftar Method yang diizinkan melalui Header Allow apabila memungkinkan.

---

# 5.24 Best Practices

Gunakan Method sesuai semantik HTTP.

Jangan menggunakan POST untuk seluruh endpoint.

Gunakan PATCH untuk perubahan sebagian Field.

Gunakan GET hanya untuk membaca.

Gunakan DELETE untuk Soft Delete.

Gunakan POST untuk Workflow bisnis.

---

# 5.25 Chapter Summary

Seluruh HTTP Method pada NIAHAIR ERP mengikuti standar.

✓ GET untuk Read

✓ POST untuk Create dan Business Action

✓ PATCH untuk Partial Update

✓ PUT untuk Replace Resource

✓ DELETE untuk Soft Delete

✓ OPTIONS untuk CORS

✓ HEAD untuk Monitoring

Dengan penggunaan HTTP Method yang konsisten, API menjadi lebih mudah dipahami, lebih aman, kompatibel dengan standar REST, serta lebih mudah digunakan oleh Frontend, Mobile Application, Background Worker, dan Integrasi Eksternal.

# CHAPTER 6 — REQUEST STANDARDS

---

# 6.1 Purpose

Chapter ini mendefinisikan standar Request yang digunakan oleh seluruh REST API NIAHAIR ERP.

Seluruh Request harus memiliki struktur yang konsisten agar mudah dipahami, mudah divalidasi, mudah diuji, dan mudah diintegrasikan dengan berbagai Client.

Standar ini berlaku untuk seluruh Module.

---

# 6.2 Request Principles

Seluruh Request mengikuti prinsip.

Consistent.

Predictable.

Validated.

Minimal.

Secure.

Business Driven.

Tidak diperbolehkan membuat format Request yang berbeda pada setiap Module.

---

# 6.3 HTTP Headers

Seluruh Request menggunakan Header berikut.

Required.

```
Content-Type: application/json

Accept: application/json

Authorization: Bearer <JWT Token>
```

Optional.

```
Accept-Language

X-Request-ID

X-Client-Version

X-Timezone
```

---

# 6.4 Content Type

Default.

```
application/json
```

Upload File.

```
multipart/form-data
```

Download.

```
application/octet-stream
```

---

# 6.5 JSON Encoding

Seluruh Request menggunakan.

UTF-8

JSON Object.

Tidak menggunakan XML.

Tidak menggunakan Form URL Encoded kecuali OAuth atau integrasi pihak ketiga.

---

# 6.6 JSON Naming Convention

Seluruh Property menggunakan.

camelCase

Contoh.

```
customerId

branchId

appointmentDate

paymentMethodId

commissionAmount
```

Tidak menggunakan.

```
customer_id

CustomerID

CUSTOMER_ID
```

---

# 6.7 UUID Standard

Seluruh Primary Key dikirim menggunakan UUID.

Contoh.

```json
{
    "customerId": "550e8400-e29b-41d4-a716-446655440000"
}
```

Business Number tidak digunakan sebagai Identifier utama pada Request.

---

# 6.8 Date Format

Seluruh Date menggunakan ISO 8601.

Contoh.

```json
{
    "appointmentDate":"2026-08-10T09:30:00Z"
}
```

Timezone selalu UTC.

---

# 6.9 Decimal Standard

Nilai Decimal menggunakan Number.

Contoh.

```json
{
    "quantity":2.5,
    "sellingPrice":450000,
    "discountPercentage":15.5
}
```

Tidak menggunakan String.

---

# 6.10 Boolean Standard

Boolean menggunakan.

true

false

Contoh.

```json
{
    "isActive":true,
    "isPrimary":false
}
```

Tidak menggunakan.

```
1

0

YES

NO

Y

N
```

---

# 6.11 Create Request

Create menggunakan POST.

Contoh.

POST /customers

```json
{
    "fullName":"Dani",
    "phone":"081234567890",
    "email":"dani@email.com",
    "membershipId":"uuid"
}
```

Client tidak mengirim.

id

createdAt

updatedAt

---

# 6.12 Update Request

Update menggunakan PATCH.

Hanya Field yang berubah dikirim.

Contoh.

PATCH /customers/{id}

```json
{
    "phone":"081999999999"
}
```

Tidak mengirim seluruh Object.

---

# 6.13 Bulk Request

Bulk menggunakan Array.

Contoh.

```json
{
    "items":[
        {
            "itemId":"uuid",
            "quantity":10
        },
        {
            "itemId":"uuid",
            "quantity":5
        }
    ]
}
```

---

# 6.14 Search Parameters

Search menggunakan Query Parameter.

```
GET /customers?search=dani
```

Backend menentukan Field yang dicari.

---

# 6.15 Filter Parameters

Filtering menggunakan Query Parameter.

Contoh.

```
?branchId=

?status=

?membershipId=

?employeeId=
```

Semua Filter bersifat Optional.

---

# 6.16 Sorting Parameters

Sorting menggunakan.

sort

Contoh.

```
?sort=name

?sort=-createdAt

?sort=appointmentDate
```

Awalan "-" berarti Descending.

---

# 6.17 Pagination Parameters

Pagination menggunakan.

page

pageSize

Contoh.

```
?page=1&pageSize=20
```

Default.

page = 1

pageSize = 20

Maximum.

pageSize = 100

---

# 6.18 Include Parameters

Relationship dimuat menggunakan.

include

Contoh.

```
?include=appointments

?include=treatments

?include=membership

?include=media
```

Multiple.

```
?include=appointments,treatments,membership
```

---

# 6.19 Field Selection

Field dipilih menggunakan.

fields

Contoh.

```
?fields=id,fullName,phone
```

Backend hanya mengirim Field yang diminta.

---

# 6.20 File Upload Request

Upload menggunakan.

multipart/form-data

Contoh.

```
POST /media
```

Form Data.

```
file

ownerType

ownerId

mediaType
```

---

# 6.21 Batch Operations

Batch menggunakan satu Request.

Contoh.

```
POST /inventory/bulk-adjustment
```

```json
{
    "adjustments":[]
}
```

---

# 6.22 Workflow Request

Workflow menggunakan Body yang minimal.

Contoh.

```
POST /appointments/{id}/cancel
```

```json
{
    "reason":"Customer requested cancellation."
}
```

---

# 6.23 Idempotency

Untuk Request yang berpotensi diproses lebih dari sekali (misalnya Payment, Refund, atau sinkronisasi Accurate), Client harus mengirim Header.

```
Idempotency-Key
```

Server harus memastikan Request dengan Key yang sama tidak diproses dua kali.

---

# 6.24 Validation Rules

Seluruh Request divalidasi.

Required Field.

UUID Format.

Email Format.

Phone Format.

Decimal Range.

Business Rule.

Validasi dilakukan sebelum Business Logic dijalankan.

---

# 6.25 Forbidden Fields

Client tidak boleh mengirim Field berikut kecuali endpoint memang mengizinkannya.

```
id

createdAt

updatedAt

deletedAt

createdBy

updatedBy

deletedBy

accurateId

syncStatus
```

Seluruh Field tersebut dikelola oleh Backend.

---

# 6.26 Empty Values

Gunakan.

```
null
```

Untuk nilai yang memang tidak ada.

Jangan menggunakan.

```
""

"NULL"

"N/A"

"-"
```

Sebagai pengganti Null.

---

# 6.27 Large Requests

Request maksimal mengikuti konfigurasi Server.

Sebagai standar awal.

JSON.

10 MB.

Multipart Upload.

50 MB.

Nilai ini dapat berubah sesuai kebutuhan infrastruktur.

---

# 6.28 Request Logging

Setiap Request dicatat.

Method.

URL.

Execution Time.

Authenticated User.

IP Address.

Request ID.

Sensitive Data tidak boleh dicatat dalam Log.

---

# 6.29 Security

Backend tidak mempercayai Request dari Client.

Seluruh Input harus.

Divalidasi.

Disanitasi.

Diotorisasi.

Client tidak boleh menentukan Business Rule.

---

# 6.30 Chapter Summary

Seluruh Request pada NIAHAIR ERP mengikuti standar.

✓ JSON UTF-8

✓ camelCase

✓ UUID

✓ ISO 8601

✓ Query Parameter untuk Search, Filter, Sort, Pagination

✓ multipart/form-data untuk Upload

✓ PATCH untuk Update

✓ Idempotency untuk transaksi kritis

✓ Validasi di Backend

Dengan standar ini seluruh Client, baik Web, Mobile, maupun Integrasi Eksternal, akan menggunakan format Request yang konsisten, aman, dan mudah dipelihara.

# CHAPTER 7 — RESPONSE STANDARDS

---

# 7.1 Purpose

Chapter ini mendefinisikan standar Response yang digunakan oleh seluruh REST API NIAHAIR ERP.

Seluruh endpoint harus mengembalikan Response dengan struktur yang konsisten agar mudah digunakan oleh Frontend, Mobile Application, Integrasi Eksternal, dan AI Coding Assistant.

Response yang konsisten akan mengurangi kompleksitas implementasi Client serta mempermudah debugging, testing, dan dokumentasi.

---

# 7.2 Response Principles

Seluruh Response mengikuti prinsip.

Consistent.

Predictable.

Minimal.

Readable.

RESTful.

Business Friendly.

Tidak diperbolehkan membuat format Response yang berbeda pada setiap Module.

---

# 7.3 Standard Response Structure

Seluruh Response memiliki struktur berikut.

```json
{
    "success": true,
    "message": "",
    "data": {},
    "meta": {}
}
```

Field.

success

message

data

meta

selalu tersedia.

---

# 7.4 Success Response

Contoh.

```json
{
    "success": true,
    "message": "Customer created successfully.",
    "data": {
        "id":"uuid",
        "customerNo":"CUS-000001"
    },
    "meta": null
}
```

---

# 7.5 List Response

Response Collection.

```json
{
    "success": true,
    "message":"Success",
    "data":[
        {},
        {},
        {}
    ],
    "meta":{
        "page":1,
        "pageSize":20,
        "totalItems":523,
        "totalPages":27
    }
}
```

---

# 7.6 Empty Response

Apabila data kosong.

```json
{
    "success": true,
    "message":"No data found.",
    "data":[],
    "meta":{
        "page":1,
        "pageSize":20,
        "totalItems":0,
        "totalPages":0
    }
}
```

Response tetap menggunakan HTTP 200.

---

# 7.7 Single Resource Response

Contoh.

```json
{
    "success":true,
    "message":"Success",
    "data":{
        "id":"uuid",
        "fullName":"Dani"
    },
    "meta":null
}
```

---

# 7.8 Create Response

POST.

```json
{
    "success":true,
    "message":"Customer created successfully.",
    "data":{
        "id":"uuid"
    },
    "meta":null
}
```

HTTP Status.

201 Created.

---

# 7.9 Update Response

PATCH.

```json
{
    "success":true,
    "message":"Customer updated successfully.",
    "data":{
        "id":"uuid"
    },
    "meta":null
}
```

---

# 7.10 Delete Response

DELETE.

```json
{
    "success":true,
    "message":"Customer deleted successfully.",
    "data":null,
    "meta":null
}
```

Karena menggunakan Soft Delete.

---

# 7.11 Workflow Response

Contoh.

Treatment Complete.

```json
{
    "success":true,
    "message":"Treatment completed successfully.",
    "data":{
        "treatmentId":"uuid",
        "invoiceId":"uuid"
    },
    "meta":null
}
```

---

# 7.12 Bulk Response

```json
{
    "success":true,
    "message":"Bulk operation completed.",
    "data":{
        "successCount":95,
        "failedCount":5
    },
    "meta":null
}
```

---

# 7.13 Upload Response

```json
{
    "success":true,
    "message":"File uploaded successfully.",
    "data":{
        "id":"uuid",
        "url":"..."
    },
    "meta":null
}
```

---

# 7.14 Download Response

Download File menggunakan Binary Stream.

Tidak menggunakan JSON.

Contoh.

PDF.

Excel.

CSV.

Image.

---

# 7.15 Pagination Meta

Field Meta.

```json
{
    "page":1,
    "pageSize":20,
    "totalItems":500,
    "totalPages":25,
    "hasNextPage":true,
    "hasPreviousPage":false
}
```

---

# 7.16 Error Response

Seluruh Error menggunakan format.

```json
{
    "success":false,
    "message":"Validation failed.",
    "errors":[]
}
```

Tidak menggunakan format berbeda.

---

# 7.17 Validation Error

```json
{
    "success":false,
    "message":"Validation failed.",
    "errors":[
        {
            "field":"phone",
            "message":"Phone is required."
        },
        {
            "field":"email",
            "message":"Invalid email."
        }
    ]
}
```

---

# 7.18 Authentication Error

```json
{
    "success":false,
    "message":"Authentication failed.",
    "errors":[]
}
```

HTTP.

401.

---

# 7.19 Authorization Error

```json
{
    "success":false,
    "message":"Permission denied.",
    "errors":[]
}
```

HTTP.

403.

---

# 7.20 Not Found Response

```json
{
    "success":false,
    "message":"Customer not found.",
    "errors":[]
}
```

HTTP.

404.

---

# 7.21 Business Error

Contoh.

Stock tidak cukup.

```json
{
    "success":false,
    "message":"Insufficient stock.",
    "errors":[]
}
```

---

# 7.22 Accurate Sync Error

```json
{
    "success":false,
    "message":"Accurate synchronization failed.",
    "errors":[
        {
            "provider":"Accurate",
            "message":"Customer already exists."
        }
    ]
}
```

---

# 7.23 Internal Server Error

```json
{
    "success":false,
    "message":"Internal server error.",
    "errors":[]
}
```

Detail Error tidak dikirim ke Client.

---

# 7.24 Response Metadata

Meta digunakan untuk.

Pagination.

Execution Time.

Request ID.

API Version.

Contoh.

```json
{
    "requestId":"abc123",
    "executionTime":45,
    "apiVersion":"v1"
}
```

---

# 7.25 Null Handling

Gunakan.

null

Apabila Object tidak ada.

Gunakan.

[]

Apabila Collection kosong.

---

# 7.26 Decimal Response

Decimal dikirim sebagai Number.

Contoh.

```json
{
    "totalAmount":250000,
    "remainingAmount":50000
}
```

---

# 7.27 Date Response

Seluruh Date menggunakan ISO 8601.

```json
{
    "createdAt":"2026-07-05T08:30:00Z"
}
```

---

# 7.28 UUID Response

Seluruh Identifier menggunakan UUID.

```json
{
    "id":"550e8400-e29b-41d4-a716-446655440000"
}
```

---

# 7.29 Sensitive Data

Response tidak boleh mengirim.

Password.

Refresh Token.

JWT Secret.

API Secret.

Internal Note.

Encrypted Value.

Database Internal ID.

Field sensitif hanya dikirim apabila benar-benar diperlukan dan pengguna memiliki izin.

---

# 7.30 Chapter Summary

Seluruh Response API NIAHAIR ERP mengikuti standar.

✓ Success Flag

✓ Message

✓ Data

✓ Meta

✓ Consistent Error Format

✓ Pagination Metadata

✓ ISO 8601

✓ UUID

✓ Decimal Number

✓ No Sensitive Information

Dengan standar ini seluruh Client akan menerima Response yang seragam sehingga implementasi Frontend, Mobile Application, Integrasi, dan AI menjadi jauh lebih sederhana dan konsisten.

# CHAPTER 8 — AUTHENTICATION & AUTHORIZATION

---

# 8.1 Purpose

Chapter ini mendefinisikan standar Authentication dan Authorization pada seluruh REST API NIAHAIR ERP.

Tujuan utama modul ini adalah memastikan hanya pengguna yang sah dapat mengakses sistem dan setiap pengguna hanya dapat mengakses Resource sesuai hak aksesnya.

Authentication dan Authorization merupakan lapisan keamanan utama seluruh ERP.

---

# 8.2 Security Principles

Seluruh API mengikuti prinsip.

Authentication First.

Least Privilege.

Role Based Access Control.

Defense In Depth.

Secure By Default.

Audit Everything.

Never Trust Client.

---

# 8.3 Authentication Flow

Alur Authentication.

```

User

↓

Login

↓

Credential Validation

↓

JWT Access Token

↓

Refresh Token

↓

Authenticated Request

↓

Logout

```

Seluruh Request setelah Login menggunakan Access Token.

---

# 8.4 Authentication Method

NIAHAIR ERP menggunakan.

JWT Access Token.

JWT Refresh Token.

HTTPS.

Bearer Authentication.

Session Database.

Future.

Multi Factor Authentication.

---

# 8.5 Login Endpoint

```
POST /auth/login
```

Request.

```json
{
    "email":"admin@niahair.com",
    "password":"********"
}
```

Response.

Access Token.

Refresh Token.

Expired Time.

User Profile.

Permission.

---

# 8.6 Access Token

Access Token.

JWT.

Short Lifetime.

Stateless.

Digunakan untuk seluruh API.

Disimpan pada Client secara aman.

---

# 8.7 Refresh Token

Refresh Token digunakan untuk memperoleh Access Token baru.

Refresh Token memiliki masa berlaku lebih lama.

Refresh Token dapat dicabut kapan saja.

Refresh Token tidak digunakan untuk mengakses Business API.

---

# 8.8 Authorization Header

Seluruh Request yang membutuhkan Login menggunakan Header.

```
Authorization: Bearer <access_token>
```

Tanpa Header tersebut.

Server mengembalikan.

HTTP 401.

---

# 8.9 User Identity

Setelah Authentication berhasil.

Backend mengetahui.

User ID.

Employee ID.

Role.

Branch.

Permission.

Data tersebut digunakan selama Request diproses.

---

# 8.10 Role Based Access Control

Authorization menggunakan RBAC.

Relationship.

Role

↓

Permission

↓

User

Permission tidak diberikan langsung kepada User.

---

# 8.11 Permission Structure

Permission menggunakan format.

```
resource.action
```

Contoh.

```
customer.read

customer.create

customer.update

customer.delete

appointment.read

appointment.check_in

appointment.cancel

inventory.adjust

payment.refund

production.release
```

---

# 8.12 Module Permission

Permission dibagi berdasarkan Module.

Customer.

Appointment.

Treatment.

Inventory.

Production.

Finance.

Employee.

Reporting.

System.

Integration.

---

# 8.13 Branch Authorization

User hanya dapat mengakses Branch yang menjadi hak aksesnya.

Contoh.

Branch Jakarta.

↓

Tidak dapat mengubah data Branch Bandung.

Kecuali memiliki Permission Global.

---

# 8.14 Super Administrator

SUPER_ADMIN memiliki akses ke seluruh Module.

Role ini hanya digunakan oleh System Administrator.

Tidak digunakan untuk operasional harian.

---

# 8.15 Authentication Middleware

Seluruh Request melewati Authentication Middleware.

Middleware bertugas.

Memvalidasi JWT.

Memeriksa Expired Token.

Mengambil User.

Mengambil Permission.

Menambahkan User Context ke Request.

---

# 8.16 Authorization Middleware

Authorization dilakukan setelah Authentication berhasil.

Middleware memeriksa.

Role.

Permission.

Branch Access.

Status User.

Request ditolak apabila Permission tidak sesuai.

---

# 8.17 Public Endpoint

Endpoint berikut tidak memerlukan Authentication.

```
POST /auth/login

POST /auth/forgot-password

POST /auth/reset-password

GET /system/health
```

Endpoint lain memerlukan Authentication.

---

# 8.18 Protected Endpoint

Seluruh Business API merupakan Protected Endpoint.

Contoh.

```
/customers

/appointments

/treatments

/inventory

/payments

/invoices

/production-orders
```

---

# 8.19 Token Expiration

Access Token.

15–30 menit.

Refresh Token.

7–30 hari.

Nilai akhir ditentukan melalui Environment Configuration.

---

# 8.20 Logout

Logout.

```
POST /auth/logout
```

Logout menghapus Refresh Token.

Access Token akan berakhir secara otomatis.

---

# 8.21 Password Policy

Password minimal.

8 karakter.

Disarankan.

Huruf besar.

Huruf kecil.

Angka.

Karakter khusus.

Password disimpan menggunakan Password Hash.

Tidak pernah disimpan dalam bentuk Plain Text.

---

# 8.22 Failed Login

Apabila Login gagal.

Server mengembalikan.

HTTP 401.

Percobaan Login dicatat pada Audit Log.

Future.

Account Lockout.

Rate Limiting.

CAPTCHA.

---

# 8.23 Password Reset

Reset Password menggunakan Token sementara.

Token memiliki masa berlaku.

Token hanya dapat digunakan satu kali.

---

# 8.24 Audit

Seluruh aktivitas Authentication dicatat.

Login.

Logout.

Refresh Token.

Password Changed.

Password Reset.

Permission Changed.

Failed Login.

---

# 8.25 API Security

Seluruh Endpoint wajib.

HTTPS.

JWT.

Authorization.

Validation.

Audit.

Rate Limit.

Tidak ada Endpoint Business yang dapat diakses secara anonim.

---

# 8.26 Permission Checking

Permission diperiksa pada Backend.

Frontend tidak menentukan hak akses.

Frontend hanya menggunakan informasi Permission untuk menampilkan atau menyembunyikan komponen antarmuka.

---

# 8.27 Multi Device

Future.

Satu User dapat Login pada beberapa Device.

Setiap Device memiliki Session sendiri.

Session dapat dicabut secara individual.

---

# 8.28 Integration Authentication

Integrasi Accurate.

Webhook.

Background Worker.

Menggunakan API Credential atau Service Account.

Tidak menggunakan Login User biasa.

---

# 8.29 Security Best Practices

Gunakan HTTPS.

Hash Password.

Validasi JWT.

Rotasi Secret secara berkala.

Cabut Refresh Token yang dicurigai.

Gunakan Audit Log.

Jangan pernah menyimpan Password pada Client.

---

# 8.30 Chapter Summary

Authentication dan Authorization pada NIAHAIR ERP mengikuti standar.

✓ JWT Access Token

✓ Refresh Token

✓ Bearer Authentication

✓ Role Based Access Control

✓ Permission Based Authorization

✓ Branch Authorization

✓ Audit Log

✓ Secure Password

✓ Protected Business API

Dengan standar ini seluruh API memiliki mekanisme keamanan yang konsisten, aman, dan siap berkembang untuk mendukung Multi Branch, Integrasi Eksternal, Mobile Application, serta fitur keamanan lanjutan seperti Multi Factor Authentication.

# CHAPTER 9 — PAGINATION, FILTERING, SEARCHING & SORTING

---

# 9.1 Purpose

Chapter ini mendefinisikan standar Pagination, Filtering, Searching, dan Sorting pada seluruh REST API NIAHAIR ERP.

Standar ini memastikan seluruh endpoint Collection memiliki perilaku yang konsisten, mudah digunakan, serta mampu menangani data dalam jumlah besar.

Seluruh endpoint yang mengembalikan Collection wajib mengikuti standar ini.

---

# 9.2 General Principles

Seluruh Collection API harus mendukung.

Pagination.

Searching.

Filtering.

Sorting.

Field Selection.

Relationship Include.

Tidak diperbolehkan membuat implementasi berbeda pada setiap Module.

---

# 9.3 Collection Endpoint

Collection Endpoint.

Contoh.

GET /customers

GET /employees

GET /appointments

GET /inventory

GET /payments

GET /production-orders

Seluruh endpoint Collection mengikuti aturan yang sama.

---

# 9.4 Pagination Standard

Pagination menggunakan Query Parameter.

page

pageSize

Contoh.

```

GET /customers?page=1&pageSize=20

```

---

# 9.5 Default Pagination

Apabila Client tidak mengirim parameter.

Default.

page = 1

pageSize = 20

---

# 9.6 Maximum Page Size

Untuk menjaga performa.

Maximum.

pageSize = 100

Apabila Client mengirim nilai lebih besar.

Backend mengembalikan maksimum yang diizinkan.

---

# 9.7 Pagination Response

Response.

```json
{
    "meta":{
        "page":1,
        "pageSize":20,
        "totalItems":1523,
        "totalPages":77,
        "hasNextPage":true,
        "hasPreviousPage":false
    }
}
```

Meta wajib dikirim.

---

# 9.8 Searching

Searching menggunakan Query Parameter.

```
?search=
```

Contoh.

```
GET /customers?search=dani

GET /inventory?search=keratin

GET /employees?search=andi
```

---

# 9.9 Search Scope

Search dilakukan pada Field utama.

Customer.

customerNo.

fullName.

phone.

email.

Inventory.

itemCode.

itemName.

barcode.

Employee.

employeeCode.

fullName.

email.

---

# 9.10 Search Behavior

Search bersifat.

Case Insensitive.

Partial Match.

Trim White Space.

Backend menentukan Field yang digunakan.

---

# 9.11 Filtering

Filtering menggunakan Query Parameter.

Contoh.

```
?branchId=

?status=

?employeeId=

?membershipId=

?warehouseId=
```

Semua Filter bersifat Optional.

---

# 9.12 Multiple Filter

Contoh.

```
GET /appointments?branchId=...&status=BOOKED

GET /customers?membershipId=...&isActive=true

GET /inventory?warehouseId=...&categoryId=...
```

Backend menggabungkan Filter menggunakan operator AND.

---

# 9.13 Multi Value Filter

Nilai lebih dari satu dikirim menggunakan koma.

Contoh.

```
?status=BOOKED,CONFIRMED

?branchId=1,2,3

?paymentMethod=CASH,QRIS
```

---

# 9.14 Date Range Filter

Menggunakan.

from

to

Contoh.

```
GET /payments?from=2026-01-01&to=2026-01-31

GET /appointments?from=2026-07-01&to=2026-07-31
```

Format tanggal mengikuti ISO 8601.

---

# 9.15 Numeric Filter

Contoh.

```
?minPrice=100000

?maxPrice=500000

?minStock=20

?maxStock=100
```

---

# 9.16 Boolean Filter

Boolean.

```
?isActive=true

?isPrimary=false
```

Menggunakan true atau false.

---

# 9.17 Enum Filter

Contoh.

```
?status=PAID

?status=BOOKED

?movementType=TRANSFER_OUT
```

Nilai Enum harus sesuai Data Dictionary.

---

# 9.18 Sorting

Sorting menggunakan.

sort

Contoh.

```
?sort=name

?sort=-createdAt

?sort=appointmentDate
```

Awalan "-" menunjukkan Descending.

---

# 9.19 Multiple Sorting

Sorting lebih dari satu Field.

```
?sort=branchName,-createdAt
```

Prioritas mengikuti urutan.

---

# 9.20 Default Sorting

Apabila tidak ada Sorting.

Default.

```
createdAt DESC
```

Dapat disesuaikan pada masing-masing Resource.

---

# 9.21 Include

Relationship dimuat menggunakan.

include

Contoh.

```
GET /customers/{id}?include=membership

GET /appointments/{id}?include=services

GET /treatments/{id}?include=media,assignments

GET /invoices/{id}?include=payments
```

---

# 9.22 Nested Include

Nested Include maksimal dua tingkat.

Contoh.

```
include=appointments.services

include=treatments.media

include=payments.paymentMethod
```

Nested lebih dari dua tingkat tidak diperbolehkan.

---

# 9.23 Field Selection

Field dipilih menggunakan.

fields

Contoh.

```
?fields=id,fullName,phone

?fields=itemName,qtyAvailable
```

Backend hanya mengirim Field yang diminta.

---

# 9.24 Combined Example

Contoh lengkap.

```
GET /customers

?page=2

&pageSize=20

&search=dani

&branchId=...

&membershipId=...

&sort=-createdAt

&fields=id,fullName,phone

&include=membership
```

Seluruh Parameter dapat digunakan bersamaan.

---

# 9.25 Performance Rules

Searching wajib menggunakan Index apabila memungkinkan.

Sorting pada Field yang tidak memiliki Index harus dihindari.

Pagination selalu dilakukan di Database.

Filtering dilakukan sebelum Pagination.

---

# 9.26 Database Rules

Pagination.

OFFSET.

LIMIT.

Searching.

ILIKE.

Filtering.

WHERE.

Sorting.

ORDER BY.

Implementasi mengikuti Prisma.

---

# 9.27 Large Dataset

Endpoint yang memiliki lebih dari.

100.000 Record.

Harus mendukung optimasi Query.

Future.

Cursor Pagination.

---

# 9.28 Export Exception

Endpoint Export.

Excel.

CSV.

PDF.

Tidak menggunakan Pagination.

Namun tetap menggunakan Search, Filter, dan Sorting yang sama dengan tampilan data.

---

# 9.29 Validation

Backend memvalidasi.

page >= 1

pageSize >= 1

pageSize <= 100

sort Field valid.

include valid.

fields valid.

Filter valid.

---

# 9.30 Chapter Summary

Seluruh Collection API pada NIAHAIR ERP mengikuti standar.

✓ Pagination

✓ Search

✓ Filter

✓ Sorting

✓ Include

✓ Field Selection

✓ Date Range

✓ Enum Filter

✓ Multi Filter

✓ Performance Optimization

Dengan standar ini seluruh endpoint Collection memiliki perilaku yang konsisten, mudah digunakan oleh Frontend dan Mobile Application, serta mampu menangani data dalam jumlah besar dengan performa yang tetap optimal.

# CHAPTER 10 — VALIDATION & ERROR HANDLING

---

# 10.1 Purpose

Chapter ini mendefinisikan standar Validation dan Error Handling pada seluruh REST API NIAHAIR ERP.

Tujuan utama chapter ini adalah memastikan seluruh Request divalidasi secara konsisten dan seluruh Error dikembalikan dalam format yang seragam.

Validation dan Error Handling merupakan bagian penting untuk menjaga kualitas data, keamanan sistem, dan pengalaman pengguna.

---

# 10.2 Validation Principles

Seluruh Request harus mengikuti prinsip.

Validate Early.

Fail Fast.

Business Driven.

Consistent.

Predictable.

Secure.

Backend tidak pernah mempercayai data dari Client.

---

# 10.3 Validation Layers

Validation dilakukan pada beberapa lapisan.

Client Validation.

↓

Request Validation.

↓

Business Validation.

↓

Database Constraint.

Semua lapisan saling melengkapi.

Tidak boleh hanya mengandalkan Frontend.

---

# 10.4 Request Validation

Request Validation meliputi.

Required Field.

UUID Format.

Date Format.

Decimal Format.

Boolean.

Enum.

Array.

Object.

Validation dilakukan sebelum Business Logic dijalankan.

---

# 10.5 Business Validation

Business Validation memastikan aturan bisnis terpenuhi.

Contoh.

Customer harus aktif.

Stock harus cukup.

Appointment tidak boleh bentrok.

Invoice tidak boleh dibayar dua kali.

Deposit tidak boleh negatif.

Business Validation berada pada Service Layer.

---

# 10.6 Database Validation

Database tetap memiliki Constraint.

Primary Key.

Unique.

Foreign Key.

Check Constraint.

Database merupakan lapisan validasi terakhir.

---

# 10.7 Validation Response

Seluruh Validation Error menggunakan format.

```json
{
    "success": false,
    "message": "Validation failed.",
    "errors": [
        {
            "code": "VALIDATION_REQUIRED",
            "field": "phone",
            "message": "Phone is required."
        }
    ]
}
```

---

# 10.8 Required Validation

Field wajib.

Contoh.

```json
{
    "code":"VALIDATION_REQUIRED",
    "field":"customerId",
    "message":"Customer is required."
}
```

---

# 10.9 Format Validation

Contoh.

Email.

Phone.

UUID.

Date.

Decimal.

```json
{
    "code":"VALIDATION_INVALID_FORMAT",
    "field":"email",
    "message":"Invalid email format."
}
```

---

# 10.10 Enum Validation

Enum harus sesuai Data Dictionary.

```json
{
    "code":"VALIDATION_INVALID_ENUM",
    "field":"status",
    "message":"Invalid status value."
}
```

---

# 10.11 Unique Validation

Contoh.

Customer Number.

Phone.

Email.

Item Code.

```json
{
    "code":"RESOURCE_ALREADY_EXISTS",
    "field":"phone",
    "message":"Phone already exists."
}
```

---

# 10.12 Resource Not Found

```json
{
    "success":false,
    "message":"Customer not found.",
    "errors":[
        {
            "code":"RESOURCE_NOT_FOUND"
        }
    ]
}
```

HTTP.

404.

---

# 10.13 Authentication Error

```json
{
    "success":false,
    "message":"Authentication failed.",
    "errors":[
        {
            "code":"AUTHENTICATION_FAILED"
        }
    ]
}
```

HTTP.

401.

---

# 10.14 Authorization Error

```json
{
    "success":false,
    "message":"Permission denied.",
    "errors":[
        {
            "code":"PERMISSION_DENIED"
        }
    ]
}
```

HTTP.

403.

---

# 10.15 Business Rule Error

Contoh.

Stock tidak cukup.

```json
{
    "success":false,
    "message":"Insufficient stock.",
    "errors":[
        {
            "code":"INSUFFICIENT_STOCK"
        }
    ]
}
```

---

# 10.16 Conflict Error

Contoh.

Appointment bentrok.

```json
{
    "success":false,
    "message":"Appointment schedule conflict.",
    "errors":[
        {
            "code":"APPOINTMENT_CONFLICT"
        }
    ]
}
```

HTTP.

409.

---

# 10.17 Accurate Integration Error

```json
{
    "success":false,
    "message":"Accurate synchronization failed.",
    "errors":[
        {
            "code":"ACCURATE_SYNC_FAILED"
        }
    ]
}
```

---

# 10.18 Queue Error

```json
{
    "success":false,
    "message":"Queue processing failed.",
    "errors":[
        {
            "code":"QUEUE_PROCESS_FAILED"
        }
    ]
}
```

---

# 10.19 File Upload Error

```json
{
    "success":false,
    "message":"Invalid file type.",
    "errors":[
        {
            "code":"INVALID_FILE_TYPE"
        }
    ]
}
```

---

# 10.20 Internal Server Error

```json
{
    "success":false,
    "message":"Internal server error.",
    "errors":[
        {
            "code":"INTERNAL_SERVER_ERROR"
        }
    ]
}
```

Stack Trace tidak pernah dikirim ke Client.

---

# 10.21 HTTP Status Mapping

HTTP Status yang digunakan.

200 OK

201 Created

204 No Content

400 Bad Request

401 Unauthorized

403 Forbidden

404 Not Found

405 Method Not Allowed

409 Conflict

413 Payload Too Large

415 Unsupported Media Type

422 Unprocessable Entity

429 Too Many Requests

500 Internal Server Error

503 Service Unavailable

Status lain digunakan hanya apabila benar-benar diperlukan.

---

# 10.22 Global Error Handler

Seluruh Error ditangani oleh Global Error Handler.

Controller tidak melakukan try-catch untuk membangun Response Error.

Global Error Handler bertanggung jawab membuat Response yang konsisten.

---

# 10.23 Logging

Seluruh Error dicatat.

Request ID.

User ID.

Endpoint.

HTTP Method.

Execution Time.

Stack Trace.

IP Address.

Sensitive Data tidak dicatat.

---

# 10.24 Error Code Standard

Format.

```
MODULE_ERROR_NAME
```

Contoh.

```
CUSTOMER_NOT_FOUND

CUSTOMER_ALREADY_EXISTS

APPOINTMENT_CONFLICT

PAYMENT_ALREADY_PAID

INSUFFICIENT_STOCK

INVALID_FILE_TYPE

ACCURATE_SYNC_FAILED

QUEUE_PROCESS_FAILED
```

Error Code harus unik.

---

# 10.25 Exception Mapping

Exception dipetakan menjadi Error Code.

Validation Exception.

↓

VALIDATION_REQUIRED.

Business Exception.

↓

BUSINESS_RULE_FAILED.

Database Exception.

↓

DATABASE_ERROR.

Integration Exception.

↓

INTEGRATION_ERROR.

---

# 10.26 Retry Strategy

Retry hanya dilakukan pada Error yang bersifat sementara.

Contoh.

Queue.

Webhook.

Accurate.

SMTP.

Cloudinary.

Validation Error tidak boleh di-Retry otomatis.

---

# 10.27 Sensitive Information

Response Error tidak boleh mengandung.

Password.

JWT.

Refresh Token.

SQL Query.

Stack Trace.

Connection String.

Secret Key.

---

# 10.28 Validation Library

Seluruh Request Validation menggunakan satu Library yang konsisten di seluruh Backend.

Schema Validation harus dipisahkan dari Business Logic.

---

# 10.29 Monitoring

Seluruh Error dikirim ke sistem Monitoring.

Error Rate.

HTTP Status.

Response Time.

Top Error.

Queue Failure.

Accurate Failure.

Monitoring digunakan untuk menjaga stabilitas Production.

---

# 10.30 Chapter Summary

Seluruh Validation dan Error Handling pada NIAHAIR ERP mengikuti standar.

✓ Multi Layer Validation

✓ Global Error Handler

✓ Consistent Error Response

✓ Standard Error Code

✓ Business Validation

✓ Secure Error Message

✓ Structured Logging

✓ Monitoring Ready

Dengan standar ini seluruh API memberikan Error yang konsisten, mudah dipahami, aman, serta mudah dianalisis oleh Frontend, Mobile Application, QA Engineer, DevOps, maupun AI Coding Assistant.

# CHAPTER 11 — FILE UPLOAD & MEDIA STANDARDS

---

# 11.1 Purpose

Chapter ini mendefinisikan standar pengelolaan File dan Media pada seluruh REST API NIAHAIR ERP.

Media meliputi.

Customer Photo.

Employee Photo.

Treatment Before Photo.

Treatment After Photo.

Product Image.

Service Image.

Attachment.

Document.

Future Video.

Seluruh Media harus dikelola secara konsisten, aman, dan mudah ditelusuri.

---

# 11.2 Supported Media Types

Media yang didukung.

Image.

PDF.

Document.

Spreadsheet.

Future.

Video.

Audio.

Media Type harus tervalidasi sebelum disimpan.

---

# 11.3 Storage Architecture

Seluruh File disimpan pada Object Storage.

Backend hanya menyimpan Metadata.

```
Client

↓

REST API

↓

Media Service

↓

Cloudinary

↓

Metadata Database
```

Database tidak menyimpan File Binary.

---

# 11.4 Upload Endpoint

Upload menggunakan endpoint.

```
POST /media
```

Media bersifat Generic.

Resource lain hanya membuat Relationship terhadap Media.

---

# 11.5 Upload Content Type

Upload menggunakan.

```
multipart/form-data
```

Bukan JSON.

---

# 11.6 Upload Request

Multipart Field.

```
file

ownerType

ownerId

mediaType

description
```

Contoh.

ownerType.

```
CUSTOMER

EMPLOYEE

TREATMENT

SERVICE

PRODUCT
```

---

# 11.7 Media Metadata

Setiap Media memiliki Metadata.

id

storageProvider

storageKey

publicUrl

thumbnailUrl

mimeType

fileName

originalFileName

fileSize

width

height

ownerType

ownerId

uploadedBy

createdAt

---

# 11.8 Media Ownership

Media selalu dimiliki oleh Resource.

Contoh.

Customer.

↓

Customer Photo.

Treatment.

↓

Before Photo.

↓

After Photo.

Employee.

↓

Profile Photo.

Media tidak berdiri sendiri secara bisnis.

---

# 11.9 Supported Image Format

Image.

JPEG.

PNG.

WEBP.

Future.

HEIC.

AVIF.

Format lain ditolak.

---

# 11.10 Supported Document Format

Document.

PDF.

DOCX.

XLSX.

CSV.

Format executable tidak diperbolehkan.

---

# 11.11 File Size Limit

Default.

Image.

10 MB.

Document.

25 MB.

Future.

Video.

100 MB.

Nilai dapat diubah melalui Configuration.

---

# 11.12 Image Optimization

Image otomatis.

Resize.

Compress.

Generate Thumbnail.

Strip Metadata apabila diperlukan.

Optimasi dilakukan sebelum disimpan.

---

# 11.13 Thumbnail

Image menghasilkan Thumbnail otomatis.

Thumbnail digunakan untuk.

Gallery.

List View.

Customer360.

Treatment History.

---

# 11.14 Image Naming

Nama File disimpan menggunakan UUID.

Contoh.

```
0f92e6d5.webp
```

Nama asli tetap disimpan sebagai Metadata.

---

# 11.15 Folder Structure

Cloudinary menggunakan Folder.

```
customers/

employees/

treatments/

products/

services/

documents/
```

Folder mengikuti Resource.

---

# 11.16 Before & After

Treatment dapat memiliki.

Before.

After.

Gallery.

Progress.

Media Type.

```
BEFORE

AFTER

PROGRESS
```

---

# 11.17 Multiple Upload

Satu Request dapat mengunggah beberapa File.

Contoh.

Treatment Gallery.

Customer Document.

Product Gallery.

---

# 11.18 Media Retrieval

Mengambil Media.

```
GET /media/{id}
```

Mengambil Media milik Customer.

```
GET /customers/{id}/media
```

Mengambil Media Treatment.

```
GET /treatments/{id}/media
```

---

# 11.19 Media Delete

Delete menggunakan.

```
DELETE /media/{id}
```

Delete menghapus.

Metadata.

↓

Cloudinary.

Apabila Media masih digunakan Resource lain.

Delete ditolak.

---

# 11.20 Security Validation

Backend memvalidasi.

MIME Type.

Extension.

Maximum Size.

Virus Scan (Future).

Permission.

Ownership.

---

# 11.21 Image Access

Media mengikuti Authorization.

Customer Photo.

Hanya Staff yang memiliki Permission.

Employee Photo.

HR.

Manager.

Owner.

Treatment Photo.

Staff terkait.

Manager.

Owner.

---

# 11.22 Temporary Upload

Future.

Upload dapat menggunakan Temporary Storage.

File yang tidak digunakan akan dibersihkan otomatis.

---

# 11.23 Media Response

Response.

```json
{
    "success": true,
    "message": "File uploaded successfully.",
    "data": {
        "id": "uuid",
        "publicUrl": "...",
        "thumbnailUrl": "...",
        "mimeType": "image/jpeg",
        "fileSize": 512000
    },
    "meta": null
}
```

---

# 11.24 Media Lifecycle

Media mengikuti siklus.

Upload.

↓

Validation.

↓

Optimization.

↓

Cloudinary.

↓

Metadata Database.

↓

Relationship.

↓

Usage.

↓

Delete.

---

# 11.25 Audit

Seluruh aktivitas dicatat.

Upload.

Delete.

Replace.

Download.

Permission Denied.

Audit digunakan untuk keamanan dan pelacakan.

---

# 11.26 Future Features

Future.

Video Upload.

Image Annotation.

OCR.

AI Face Blur.

Automatic Watermark.

Version History.

Image Comparison.

Duplicate Detection.

CDN Optimization.

Offline Upload.

---

# 11.27 Best Practices

Gunakan UUID sebagai nama File.

Simpan Metadata di Database.

Jangan menyimpan Binary di Database.

Gunakan Thumbnail untuk List.

Validasi seluruh Upload.

Gunakan HTTPS.

Batasi ukuran File.

---

# 11.28 Error Handling

Contoh Error.

INVALID_FILE_TYPE.

FILE_TOO_LARGE.

UPLOAD_FAILED.

MEDIA_NOT_FOUND.

UNSUPPORTED_MEDIA.

MEDIA_IN_USE.

---

# 11.29 Integration

Media Service terintegrasi dengan.

Cloudinary.

Customer.

Treatment.

Employee.

Service.

Product.

Future.

AI Image Analysis.

---

# 11.30 Chapter Summary

Seluruh Media pada NIAHAIR ERP mengikuti standar.

✓ Object Storage

✓ Metadata Database

✓ UUID File Name

✓ Cloudinary

✓ Thumbnail

✓ Multiple Upload

✓ Before & After

✓ Permission Based Access

✓ Audit Log

✓ Secure Upload

Dengan standar ini seluruh pengelolaan Media menjadi konsisten, aman, mudah diperluas, dan siap mendukung kebutuhan operasional salon maupun manufaktur NIAHAIR.

# CHAPTER 12 — INTEGRATION API STANDARDS

---

# 12.1 Purpose

Chapter ini mendefinisikan standar integrasi antara NIAHAIR ERP dengan sistem eksternal.

Tujuan utama Integration API adalah memastikan seluruh proses sinkronisasi berjalan secara konsisten, aman, dapat dipantau, serta mudah dipulihkan apabila terjadi kegagalan.

Standar ini berlaku untuk seluruh integrasi saat ini maupun integrasi yang akan datang.

---

# 12.2 Integration Principles

Seluruh integrasi mengikuti prinsip.

Loose Coupling.

Idempotent.

Retryable.

Observable.

Secure.

Asynchronous First.

Audit Ready.

Business Driven.

---

# 12.3 Supported Integration

Saat ini sistem mendukung integrasi dengan.

Accurate Online.

Cloudinary.

SMTP.

WhatsApp.

Telegram.

Future.

Payment Gateway.

Google Calendar.

Marketplace.

AI Service.

---

# 12.4 Integration Architecture

Seluruh komunikasi mengikuti arsitektur.

```
ERP

↓

Application Service

↓

Integration Service

↓

Queue

↓

External API

↓

Response

↓

Sync Status
```

Business Module tidak memanggil External API secara langsung.

---

# 12.5 Integration Service

Setiap Provider memiliki Service tersendiri.

Contoh.

AccurateService.

CloudinaryService.

WhatsappService.

TelegramService.

EmailService.

Service tidak saling bergantung.

---

# 12.6 Queue First Strategy

Operasi yang memerlukan waktu lama dijalankan melalui Queue.

Contoh.

Customer Sync.

Item Sync.

Invoice Sync.

Payment Sync.

Image Upload.

Email.

WhatsApp.

API tidak menunggu proses selesai.

---

# 12.7 Sync Status

Seluruh proses sinkronisasi memiliki Status.

PENDING.

PROCESSING.

SUCCESS.

FAILED.

CANCELLED.

RETRYING.

Status wajib disimpan pada Database.

---

# 12.8 External Identifier

Seluruh data yang berasal dari sistem eksternal memiliki External Identifier.

Contoh.

accurateCustomerId.

accurateItemId.

accurateInvoiceId.

accuratePaymentId.

External ID tidak boleh digunakan sebagai Primary Key internal.

---

# 12.9 Idempotency

Seluruh transaksi penting menggunakan Idempotency.

Contoh.

Customer Sync.

Invoice Sync.

Payment Sync.

Refund.

Retry Request dengan Idempotency Key yang sama tidak boleh menghasilkan transaksi ganda.

---

# 12.10 Retry Policy

Retry dilakukan hanya pada Error sementara.

Contoh.

Network Timeout.

HTTP 502.

HTTP 503.

HTTP 504.

Retry tidak dilakukan pada.

Validation Error.

Authentication Error.

Business Rule Error.

---

# 12.11 Retry Strategy

Strategi Retry menggunakan Exponential Backoff.

Contoh.

Retry 1.

5 detik.

Retry 2.

30 detik.

Retry 3.

2 menit.

Retry 4.

10 menit.

Maximum Retry ditentukan melalui Configuration.

---

# 12.12 Timeout

Setiap Integration memiliki Timeout.

Default.

30 detik.

Request yang melebihi Timeout dianggap gagal.

---

# 12.13 Error Mapping

Error Provider dipetakan menjadi Error Internal.

Contoh.

Accurate 401.

↓

AUTHENTICATION_FAILED.

Accurate 429.

↓

RATE_LIMIT_EXCEEDED.

Accurate 500.

↓

PROVIDER_INTERNAL_ERROR.

Frontend tidak menerima Error mentah dari Provider.

---

# 12.14 Webhook

Webhook digunakan apabila Provider mendukung Callback.

Webhook harus.

Authenticated.

Validated.

Logged.

Idempotent.

---

# 12.15 Webhook Security

Webhook menggunakan.

Signature Validation.

Timestamp Validation.

Replay Protection.

IP Allow List (apabila tersedia).

---

# 12.16 Sync Direction

Sinkronisasi dapat bersifat.

Outbound.

ERP → Provider.

Inbound.

Provider → ERP.

Bi-directional.

Arah sinkronisasi harus terdokumentasi.

---

# 12.17 Sync Logging

Setiap proses sinkronisasi mencatat.

Request.

Response.

Status.

Execution Time.

Retry Count.

Request ID.

Provider Reference.

---

# 12.18 Integration Monitoring

Monitoring meliputi.

Sync Success Rate.

Sync Failure Rate.

Retry Count.

Average Response Time.

Queue Length.

Provider Availability.

---

# 12.19 Rate Limiting

Apabila Provider memiliki Rate Limit.

Backend wajib.

Throttle Request.

Queue Request.

Retry otomatis apabila memungkinkan.

Tidak melakukan Request secara paralel tanpa kontrol.

---

# 12.20 Circuit Breaker

Apabila Provider gagal secara berulang.

Integration masuk ke Mode Circuit Breaker.

Request baru ditahan sementara.

Retry dilakukan setelah Cooldown.

---

# 12.21 Accurate Integration

Integrasi Accurate digunakan untuk.

Customer.

Item.

Invoice.

Payment.

Warehouse.

Branch.

Sync dilakukan melalui Accurate Service.

Business Module tidak mengakses API Accurate secara langsung.

---

# 12.22 Queue Processing

Queue mencatat.

Job ID.

Status.

Retry Count.

Started At.

Completed At.

Error Message.

Queue dapat diulang tanpa menghasilkan duplikasi.

---

# 12.23 Partial Failure

Apabila sebagian proses gagal.

Status transaksi utama tetap dipertahankan.

Contoh.

Invoice berhasil dibuat.

↓

Sync Accurate gagal.

↓

Invoice tetap valid.

↓

Status Sync menjadi FAILED.

↓

Queue melakukan Retry.

---

# 12.24 Security

Credential Provider.

Encrypted.

Tidak dikirim ke Frontend.

Tidak dicatat pada Log.

Tidak Hardcode.

---

# 12.25 Environment

Setiap Environment menggunakan Credential berbeda.

Development.

Staging.

Production.

Credential tidak boleh digunakan silang.

---

# 12.26 Integration Testing

Seluruh Integration harus memiliki.

Unit Test.

Mock Test.

Retry Test.

Timeout Test.

Failure Test.

---

# 12.27 Version Compatibility

Perubahan API Provider harus dimonitor.

Apabila Provider merilis versi baru.

Compatibility harus diuji sebelum Production.

---

# 12.28 Future Integration

Future.

Payment Gateway.

Marketplace.

Shipping.

Accounting.

AI Recommendation.

BI Platform.

Integrasi baru mengikuti standar yang sama.

---

# 12.29 Best Practices

Gunakan Queue.

Gunakan Retry.

Gunakan Idempotency.

Gunakan Timeout.

Gunakan Circuit Breaker.

Simpan External ID.

Catat seluruh aktivitas.

Pisahkan Business Logic dari Integration.

---

# 12.30 Chapter Summary

Seluruh integrasi NIAHAIR ERP mengikuti standar.

✓ Queue First

✓ Retry Strategy

✓ Sync Status

✓ External Identifier

✓ Idempotency

✓ Webhook Security

✓ Circuit Breaker

✓ Timeout

✓ Monitoring

✓ Audit Log

Dengan standar ini seluruh integrasi menjadi lebih andal, mudah dipantau, mudah dipulihkan ketika terjadi kegagalan, dan siap berkembang untuk mendukung berbagai layanan eksternal di masa mendatang.

# CHAPTER 13 — PERFORMANCE & SECURITY

---

# 13.1 Purpose

Chapter ini mendefinisikan standar Performance dan Security pada seluruh REST API NIAHAIR ERP.

Tujuan utama chapter ini adalah memastikan seluruh API memiliki performa tinggi, aman digunakan, serta mampu menangani pertumbuhan jumlah pengguna, transaksi, dan integrasi eksternal tanpa mengorbankan stabilitas sistem.

Standar ini berlaku untuk seluruh Backend Service.

---

# 13.2 Design Principles

Seluruh API mengikuti prinsip.

Performance First.

Security By Default.

Least Privilege.

Fail Secure.

Scalable.

Observable.

Reliable.

Maintainable.

---

# 13.3 Performance Goals

Target performa.

API Response.

≤ 500 ms.

Authentication.

≤ 300 ms.

Search.

≤ 1000 ms.

Dashboard.

≤ 2000 ms.

Large Report.

Background Process.

Target dapat berubah sesuai kebutuhan bisnis.

---

# 13.4 Database Performance

Seluruh Query harus.

Menggunakan Index.

Menggunakan Pagination.

Menggunakan Filter.

Menggunakan Sorting.

Menghindari Full Table Scan.

Database Query harus dioptimalkan sebelum Production.

---

# 13.5 N+1 Query Prevention

Backend harus menghindari N+1 Query.

Gunakan.

Include.

Select.

Join.

Batch Query.

Prisma Relation.

Tidak melakukan Query berulang di dalam Loop.

---

# 13.6 Response Payload

Response hanya mengirim Field yang diperlukan.

Gunakan.

fields

include

select

Payload yang kecil menghasilkan Response yang lebih cepat.

---

# 13.7 Pagination

Collection wajib menggunakan Pagination.

Tidak diperbolehkan mengirim seluruh Data.

Maximum.

100 Record.

per Request.

---

# 13.8 Database Transaction

Gunakan Transaction hanya apabila diperlukan.

Transaction tidak boleh terlalu panjang.

Transaction tidak boleh memanggil External API.

---

# 13.9 Background Processing

Proses berat dijalankan melalui Queue.

Contoh.

Accurate Sync.

Send Email.

Send WhatsApp.

Generate Report.

Image Processing.

Import.

Export.

---

# 13.10 Caching

Future.

Backend dapat menggunakan Cache.

Contoh.

Reference Data.

Settings.

Permission.

Master Data.

Dashboard.

Cache tidak digunakan untuk Transaction aktif.

---

# 13.11 Compression

Response menggunakan Compression.

Contoh.

Gzip.

Brotli.

Compression diaktifkan pada Production.

---

# 13.12 Rate Limiting

Seluruh Public Endpoint memiliki Rate Limit.

Contoh.

Login.

Forgot Password.

Reset Password.

Webhook.

Rate Limit ditentukan melalui Configuration.

---

# 13.13 HTTPS

Seluruh komunikasi menggunakan HTTPS.

HTTP tidak diperbolehkan pada Production.

TLS menjadi standar komunikasi.

---

# 13.14 JWT Security

JWT harus.

Signed.

Verified.

Expired.

Short Lifetime.

Tidak disimpan dalam Database.

Refresh Token dipisahkan.

---

# 13.15 Password Security

Password.

Hash.

Salt.

Tidak pernah disimpan sebagai Plain Text.

Algoritma Password Hash harus mengikuti Best Practice industri.

---

# 13.16 Secret Management

Secret berasal dari.

Environment Variable.

Secret Manager (Future).

Tidak Hardcode.

Tidak dikirim ke Frontend.

---

# 13.17 SQL Injection

Seluruh Query menggunakan Prisma ORM.

Raw SQL hanya digunakan apabila benar-benar diperlukan.

Input tidak boleh digabungkan langsung ke Query.

---

# 13.18 XSS Protection

Seluruh Input divalidasi.

Seluruh Output di-escape sesuai kebutuhan.

Frontend tetap bertanggung jawab melakukan sanitasi tampilan.

---

# 13.19 CSRF

API menggunakan JWT Bearer Token.

CSRF Protection diterapkan apabila menggunakan Cookie Authentication.

---

# 13.20 CORS

Origin yang diizinkan dikonfigurasi.

Development.

Staging.

Production.

Tidak menggunakan.

Access-Control-Allow-Origin: *

Pada Production.

---

# 13.21 File Upload Security

Validasi.

MIME Type.

Extension.

Maximum Size.

Permission.

Ownership.

Future.

Virus Scan.

---

# 13.22 Authorization

Setiap Request memeriksa.

Authentication.

Permission.

Branch Access.

Business Policy.

Tidak ada Resource yang diakses tanpa Authorization.

---

# 13.23 Sensitive Data

Response tidak boleh mengandung.

Password.

JWT Secret.

Refresh Token.

API Secret.

Database Password.

Internal Connection String.

---

# 13.24 Logging

Logging mencatat.

Request ID.

Method.

URL.

Status Code.

Execution Time.

User ID.

Branch ID.

IP Address.

Sensitive Data tidak dicatat.

---

# 13.25 Monitoring

Monitoring meliputi.

API Response Time.

CPU.

Memory.

Database.

Queue.

Accurate Sync.

Webhook.

Error Rate.

Monitoring wajib aktif pada Production.

---

# 13.26 Health Check

Health Endpoint.

```
GET /system/health
```

Memeriksa.

Application.

Database.

Queue.

Storage.

Integration.

Health Check digunakan oleh Monitoring System.

---

# 13.27 Security Headers

Backend menggunakan Security Header.

Contoh.

Content-Security-Policy.

X-Content-Type-Options.

Referrer-Policy.

X-Frame-Options.

Permissions-Policy.

Header mengikuti Best Practice keamanan web.

---

# 13.28 Audit Security

Seluruh aktivitas penting dicatat.

Login.

Logout.

Permission Change.

Role Change.

Delete.

Payment.

Refund.

Inventory Adjustment.

Audit tidak boleh dimatikan.

---

# 13.29 Disaster Recovery

Future.

Backup Database.

Restore Procedure.

Queue Recovery.

Cloud Storage Backup.

Recovery Plan.

Business Continuity.

---

# 13.30 Chapter Summary

Seluruh API NIAHAIR ERP mengikuti standar.

✓ HTTPS

✓ JWT

✓ RBAC

✓ Pagination

✓ Query Optimization

✓ Queue

✓ Compression

✓ Monitoring

✓ Logging

✓ Audit

✓ Secure Secret Management

✓ Performance Optimization

Dengan standar ini Backend NIAHAIR ERP siap digunakan pada lingkungan Production, mampu menangani pertumbuhan data dan pengguna, serta memiliki tingkat keamanan dan performa yang sesuai untuk sistem ERP berskala enterprise.

# CHAPTER 14 — API VERSIONING

---

# 14.1 Purpose

Chapter ini mendefinisikan standar Versioning seluruh REST API pada NIAHAIR ERP.

Versioning memastikan API dapat berkembang tanpa merusak kompatibilitas dengan Client yang sudah menggunakan versi sebelumnya.

Seluruh perubahan yang bersifat Breaking Change harus mengikuti aturan Versioning pada chapter ini.

---

# 14.2 Versioning Principles

Seluruh API mengikuti prinsip.

Backward Compatible.

Predictable.

Stable.

Documented.

Incremental.

Breaking changes tidak diperbolehkan pada versi yang sudah dirilis.

---

# 14.3 Versioning Strategy

NIAHAIR ERP menggunakan URI Versioning.

Format.

```
/api/v1
```

Contoh.

```
GET /api/v1/customers

GET /api/v1/appointments

POST /api/v1/payments
```

Seluruh endpoint wajib menggunakan prefix versi.

---

# 14.4 Current Version

Versi Production saat ini.

```
v1
```

Seluruh pengembangan dilakukan pada versi aktif.

---

# 14.5 Future Version

Apabila terdapat Breaking Change.

Versi baru dibuat.

Contoh.

```
/api/v2/customers

/api/v2/invoices
```

Versi lama tetap tersedia selama masa transisi.

---

# 14.6 Breaking Change

Perubahan berikut dianggap Breaking Change.

Menghapus Endpoint.

Menghapus Field Response.

Mengubah Tipe Data.

Mengubah Struktur Response.

Mengubah Authentication.

Mengubah URL.

Mengubah Business Behavior.

Breaking Change wajib menggunakan Major Version baru.

---

# 14.7 Non Breaking Change

Perubahan berikut tidak memerlukan Version baru.

Menambah Endpoint.

Menambah Optional Field.

Menambah Filter.

Menambah Sorting.

Optimasi Query.

Perbaikan Bug.

Peningkatan Performa.

---

# 14.8 Deprecation Policy

Endpoint lama dapat diberi status.

Deprecated.

Endpoint Deprecated.

Masih dapat digunakan.

Masih didukung.

Memiliki batas waktu penghentian.

---

# 14.9 Deprecation Announcement

Endpoint Deprecated harus diumumkan melalui.

API Documentation.

Release Notes.

Developer Notification.

Tanggal penghentian harus diinformasikan dengan jelas.

---

# 14.10 Sunset Policy

Endpoint Deprecated memiliki Sunset Date.

Contoh.

```
Deprecated.

2027-01-01

↓

Removed.

2027-07-01
```

Client memiliki waktu migrasi yang cukup.

---

# 14.11 Backward Compatibility

Perubahan Minor tidak boleh merusak Client lama.

Contoh.

Field baru ditambahkan sebagai Optional.

Response lama tetap valid.

---

# 14.12 Response Version

Response Metadata dapat menyertakan versi API.

Contoh.

```json
{
    "meta":{
        "apiVersion":"v1"
    }
}
```

Versi memudahkan proses debugging.

---

# 14.13 Documentation

Setiap versi memiliki dokumentasi sendiri.

Contoh.

API v1.

API v2.

Dokumentasi tidak boleh dicampur.

---

# 14.14 Migration Guide

Setiap perubahan Major wajib memiliki Migration Guide.

Migration Guide menjelaskan.

Perubahan Endpoint.

Perubahan Request.

Perubahan Response.

Perubahan Authentication.

Contoh migrasi harus disediakan.

---

# 14.15 Endpoint Lifecycle

Siklus Endpoint.

Draft.

↓

Development.

↓

Testing.

↓

Production.

↓

Deprecated.

↓

Sunset.

↓

Removed.

Status Endpoint harus terdokumentasi.

---

# 14.16 Version Compatibility

Client bebas menggunakan versi yang didukung.

Backend wajib menangani setiap versi sesuai kontraknya.

Perubahan pada satu versi tidak boleh memengaruhi versi lain.

---

# 14.17 Integration Compatibility

Integrasi eksternal.

Accurate.

Cloudinary.

Webhook.

Background Worker.

Harus tetap kompatibel dengan versi API yang digunakan.

---

# 14.18 Database Independence

Version API tidak bergantung pada struktur Database.

Perubahan Schema tidak selalu berarti perubahan versi API.

Mapping dilakukan pada Service Layer.

---

# 14.19 Testing

Setiap versi API harus memiliki.

Unit Test.

Integration Test.

Regression Test.

Backward Compatibility Test.

---

# 14.20 Release Process

Rilis versi baru melalui tahapan.

Development.

↓

Internal Testing.

↓

QA.

↓

Staging.

↓

Production.

Tidak diperbolehkan langsung merilis ke Production.

---

# 14.21 Version Support

Backend hanya mendukung versi yang masih aktif.

Versi yang telah melewati Sunset tidak lagi menerima pembaruan.

---

# 14.22 Semantic Versioning

Internal Backend mengikuti Semantic Versioning.

Major.

Minor.

Patch.

Contoh.

```
1.0.0

1.1.0

1.1.3

2.0.0
```

Versi API dan versi aplikasi dapat berbeda.

---

# 14.23 Monitoring

Monitoring dilakukan berdasarkan versi API.

Contoh.

Traffic per versi.

Error Rate.

Response Time.

Endpoint Usage.

Data digunakan untuk menentukan waktu penghentian versi lama.

---

# 14.24 Best Practices

Gunakan URI Versioning.

Hindari Breaking Change.

Dokumentasikan seluruh perubahan.

Sediakan Migration Guide.

Pertahankan Backward Compatibility selama masa transisi.

---

# 14.25 Chapter Summary

Seluruh REST API NIAHAIR ERP mengikuti standar Versioning.

✓ URI Versioning

✓ Backward Compatibility

✓ Breaking Change Policy

✓ Deprecation Policy

✓ Sunset Policy

✓ Migration Guide

✓ Semantic Versioning

✓ Version Monitoring

Dengan standar ini API dapat berkembang secara aman tanpa mengganggu aplikasi Web, Mobile, maupun Integrasi Eksternal yang telah menggunakan versi sebelumnya.

# CHAPTER 15 — API GOVERNANCE

---

# 15.1 Purpose

Chapter ini mendefinisikan tata kelola (Governance) seluruh REST API pada NIAHAIR ERP.

Tujuan utama API Governance adalah menjaga konsistensi, kualitas, keamanan, stabilitas, dan keberlanjutan pengembangan API selama siklus hidup sistem.

Seluruh perubahan API wajib mengikuti aturan pada chapter ini.

---

# 15.2 Governance Principles

Seluruh API mengikuti prinsip.

Consistency.

Maintainability.

Security.

Documentation First.

Backward Compatibility.

Business Driven.

Review Before Release.

Automation.

---

# 15.3 API Lifecycle

Setiap API memiliki siklus hidup.

Business Requirement.

↓

API Design.

↓

Architecture Review.

↓

Development.

↓

Unit Testing.

↓

Integration Testing.

↓

Documentation.

↓

Staging.

↓

Production.

↓

Maintenance.

↓

Deprecation.

↓

Removal.

Seluruh tahapan wajib terdokumentasi.

---

# 15.4 API Ownership

Setiap Module memiliki Business Owner dan Technical Owner.

Business Owner.

Bertanggung jawab terhadap kebutuhan bisnis.

Technical Owner.

Bertanggung jawab terhadap implementasi teknis.

Tidak diperbolehkan membuat API tanpa Owner.

---

# 15.5 Design Review

Sebelum dikembangkan.

API harus melalui Design Review.

Review meliputi.

Business Flow.

REST Design.

Security.

Performance.

Naming.

Validation.

Authorization.

Response Format.

---

# 15.6 Documentation First

Dokumentasi dibuat sebelum implementasi.

Dokumentasi minimal berisi.

Purpose.

Endpoint.

Authentication.

Permission.

Request.

Response.

Validation.

Error Code.

Example.

---

# 15.7 API Contract

API merupakan kontrak resmi antara Backend dan Client.

Setelah Production.

Request.

Response.

Behavior.

Tidak boleh berubah tanpa proses Versioning.

---

# 15.8 Coding Standards

Implementasi API wajib mengikuti.

Architecture Decisions.

Coding Standards.

Data Dictionary.

Business Rules.

UI/UX Guidelines.

API Standards.

Seluruh dokumen harus tetap sinkron.

---

# 15.9 OpenAPI Specification

Seluruh endpoint harus terdokumentasi menggunakan OpenAPI.

Minimal.

Summary.

Description.

Request.

Response.

Security.

Error Response.

Example.

Dokumentasi OpenAPI menjadi referensi resmi API.

---

# 15.10 API Review Checklist

Setiap API diperiksa.

RESTful.

Authentication.

Authorization.

Validation.

Error Handling.

Pagination.

Logging.

Audit.

Performance.

Testing.

Tidak boleh melewati Review Checklist.

---

# 15.11 Testing Requirements

Minimal memiliki.

Unit Test.

Integration Test.

Permission Test.

Validation Test.

Error Test.

Regression Test.

Testing merupakan syarat sebelum Production.

---

# 15.12 Security Review

Review keamanan meliputi.

Authentication.

Authorization.

JWT.

Secret.

SQL Injection.

XSS.

Rate Limit.

Sensitive Data.

Logging.

---

# 15.13 Performance Review

Review performa meliputi.

Execution Time.

Database Query.

N+1 Query.

Index.

Payload Size.

Pagination.

Caching.

Queue.

---

# 15.14 Release Management

Release dilakukan melalui.

Development.

↓

QA.

↓

Staging.

↓

Production.

Release langsung ke Production tidak diperbolehkan.

---

# 15.15 Breaking Change Policy

Breaking Change harus.

Architecture Review.

Documentation Update.

Migration Guide.

Major Version.

Release Note.

Breaking Change tidak boleh dilakukan secara langsung.

---

# 15.16 Deprecation Policy

API Deprecated.

Masih dapat digunakan.

Memiliki Sunset Date.

Tidak menerima Feature baru.

Developer harus diberi waktu migrasi.

---

# 15.17 Change Management

Seluruh perubahan dicatat.

Tanggal.

Developer.

Reason.

Version.

Impact.

Reference.

Riwayat perubahan wajib tersedia.

---

# 15.18 Monitoring

API Production dipantau.

Availability.

Response Time.

Error Rate.

Traffic.

Queue.

Accurate Sync.

Monitoring digunakan sebagai dasar Continuous Improvement.

---

# 15.19 Audit

Seluruh aktivitas penting dicatat.

API Release.

Permission Change.

Authentication.

Webhook.

Integration.

Production Deployment.

Audit tidak boleh dihapus.

---

# 15.20 API Quality Metrics

Indikator kualitas API.

Availability.

Error Rate.

Average Response Time.

Success Rate.

Retry Rate.

Coverage Test.

Security Issue.

Target ditentukan oleh Tim Pengembang.

---

# 15.21 Continuous Improvement

API ditinjau secara berkala.

Business Rule.

Security.

Performance.

Documentation.

Testing.

Standar dapat berkembang mengikuti kebutuhan bisnis.

---

# 15.22 Developer Responsibilities

Backend Developer.

Mengikuti seluruh API Standards.

Frontend Developer.

Menggunakan API sesuai kontrak.

QA Engineer.

Memastikan seluruh endpoint memenuhi standar.

DevOps.

Menjaga Deployment dan Monitoring.

Software Architect.

Menyetujui perubahan Architecture.

---

# 15.23 Compliance

Seluruh API wajib mematuhi.

Business Rules.

Architecture Decisions.

Data Dictionary.

Security Standards.

Coding Standards.

API yang tidak memenuhi standar tidak boleh dirilis.

---

# 15.24 Living Document

API Standards merupakan Living Document.

Perubahan dilakukan melalui.

Architecture Review.

Technical Discussion.

Documentation Update.

Approval.

Seluruh perubahan harus memiliki alasan yang jelas.

---

# 15.25 Final Summary

06_API_STANDARDS.md merupakan standar resmi pengembangan seluruh REST API pada NIAHAIR ERP.

Dokumen ini mendefinisikan.

✓ API Architecture

✓ REST Resource Design

✓ Endpoint Naming

✓ HTTP Methods

✓ Request Standards

✓ Response Standards

✓ Authentication

✓ Authorization

✓ Pagination

✓ Filtering

✓ Validation

✓ Error Handling

✓ File Upload

✓ Integration

✓ Performance

✓ Security

✓ Versioning

✓ API Governance

Seluruh REST API NIAHAIR ERP wajib mengikuti standar pada dokumen ini agar seluruh sistem memiliki perilaku yang konsisten, aman, mudah dipelihara, serta siap berkembang menjadi ERP enterprise berskala besar.

---

# API STANDARDS SUMMARY

06_API_STANDARDS.md merupakan dokumen acuan resmi seluruh komunikasi antara Backend, Frontend, Mobile Application, Background Worker, dan Integrasi Eksternal.

Dokumen ini menjadi dasar implementasi.

✓ Express API

✓ Prisma ORM

✓ PostgreSQL

✓ JWT Authentication

✓ Cloudinary

✓ Accurate Integration

✓ Queue Worker

✓ Multi Branch

✓ Future AI Services

Seluruh endpoint yang dikembangkan harus mematuhi standar pada dokumen ini sehingga seluruh sistem tetap konsisten, terdokumentasi, dan mudah dikembangkan pada masa mendatang.
