# DATA DICTIONARY

Version : 1.0

Status : Living Document

Owner : Dani

Lead Architect : ChatGPT

Implementation : Claude Code

---

# CHAPTER 1 — INTRODUCTION

---

# 1.1 Purpose

Dokumen ini merupakan referensi resmi seluruh struktur data pada NIAHAIR ERP.

Data Dictionary mendefinisikan arti bisnis dari setiap Model, Field, Enum, Relationship, Constraint, dan Metadata yang terdapat pada database.

Dokumen ini menjadi sumber utama bagi.

- Software Architect
- Backend Developer
- Frontend Developer
- QA Engineer
- Business Analyst
- DevOps
- AI Assistant
- Integrasi Sistem

Data Dictionary tidak menjelaskan cara implementasi.

Data Dictionary menjelaskan arti setiap data.

---

# 1.2 Objectives

Tujuan Data Dictionary.

- Menjadi dokumentasi resmi database.
- Menghindari perbedaan interpretasi antar developer.
- Menjelaskan hubungan antar model.
- Menjadi acuan integrasi dengan sistem eksternal.
- Memudahkan maintenance.
- Memudahkan onboarding developer baru.

---

# 1.3 Scope

Dokumen ini mencakup seluruh model pada database NIAHAIR ERP.

Termasuk.

Master Data.

Transaction.

Inventory.

Production.

CRM.

Appointment.

Treatment.

Finance.

Authentication.

Audit.

System Configuration.

Media.

Reporting.

Integration.

Future Module.

---

# 1.4 Source of Truth

Seluruh struktur database berasal dari.

schema.prisma

Dokumen ini merupakan dokumentasi bisnis dari schema tersebut.

Apabila terjadi perbedaan.

Schema Prisma merupakan implementasi.

Data Dictionary merupakan referensi bisnis.

Keduanya harus selalu sinkron.

---

# 1.5 Audience

Dokumen ini digunakan oleh.

Software Architect.

Backend Developer.

Frontend Developer.

QA Engineer.

Business Analyst.

Project Manager.

System Integrator.

Future AI Agent.

---

# 1.6 What is a Model

Model merupakan representasi satu entitas bisnis.

Contoh.

Customer.

Employee.

Appointment.

Inventory.

Invoice.

Payment.

Treatment.

Satu Model biasanya direpresentasikan sebagai satu Table pada database.

---

# 1.7 What is a Field

Field merupakan atribut dari sebuah Model.

Contoh.

Customer.

- id
- customerNo
- name
- phone
- email

Setiap Field memiliki arti bisnis yang jelas.

---

# 1.8 What is an Enum

Enum merupakan daftar nilai tetap yang diperbolehkan.

Contoh.

AppointmentStatus.

BOOKED

CONFIRMED

CHECK_IN

IN_PROGRESS

COMPLETED

CANCELLED

NO_SHOW

Enum digunakan untuk menjaga konsistensi data.

---

# 1.9 What is a Relationship

Relationship menjelaskan hubungan antar Model.

Jenis Relationship.

One to One.

One to Many.

Many to Many.

Semua Relationship harus memiliki tujuan bisnis.

---

# 1.10 Primary Key

Setiap Model memiliki Primary Key.

Standar.

UUID.

Primary Key tidak boleh berubah.

Primary Key tidak memiliki arti bisnis.

---

# 1.11 Business Identifier

Selain Primary Key.

Beberapa Model memiliki Business Identifier.

Contoh.

Customer Number.

Invoice Number.

Payment Number.

Appointment Number.

Business Identifier dapat dibaca manusia.

---

# 1.12 Foreign Key

Foreign Key digunakan untuk menghubungkan Model.

Foreign Key selalu menunjuk ke Primary Key.

Foreign Key harus menjaga Referential Integrity.

---

# 1.13 Audit Fields

Sebagian besar Model memiliki Audit Field.

createdAt

updatedAt

createdBy

updatedBy

deletedAt (bila menggunakan Soft Delete)

Audit Field tidak digunakan untuk proses bisnis.

Namun digunakan untuk pelacakan.

---

# 1.14 Soft Delete

Master Data menggunakan Soft Delete.

Data tidak langsung dihapus.

Status dapat berupa.

Active.

Inactive.

Deleted.

Riwayat transaksi tetap dipertahankan.

---

# 1.15 Data Ownership

Setiap Model memiliki Business Owner.

Contoh.

Customer.

Reception.

Employee.

HR.

Inventory.

Warehouse.

Invoice.

Finance.

Ownership membantu menentukan Business Rule.

---

# 1.16 Lifecycle

Setiap Model memiliki siklus hidup.

Contoh.

Appointment.

BOOKED

↓

CONFIRMED

↓

CHECK_IN

↓

IN_PROGRESS

↓

COMPLETED

atau.

↓

CANCELLED

Lifecycle dijelaskan pada setiap Model.

---

# 1.17 Integration

Beberapa Model memiliki integrasi eksternal.

Contoh.

Customer.

↓

Accurate.

Inventory.

↓

Accurate.

Invoice.

↓

Accurate.

Payment.

↓

Accurate.

Integrasi dijelaskan pada masing-masing Model.

---

# 1.18 Data Classification

Data dibagi menjadi.

Master Data.

Reference Data.

Transaction Data.

Configuration Data.

Audit Data.

Media Data.

Integration Data.

Classification membantu menentukan strategi penyimpanan.

---

# 1.19 Naming Convention

Seluruh penamaan mengikuti standar.

Model.

PascalCase.

Field.

camelCase.

Enum.

PascalCase.

Enum Value.

UPPER_SNAKE_CASE.

Table.

snake_case.

Tidak menggunakan singkatan yang tidak jelas.

---

# 1.20 Living Document

Data Dictionary merupakan Living Document.

Setiap perubahan Schema.

↓

Harus memperbarui.

Data Dictionary.

Business Rules.

Architecture Decision.

Blueprint.

Keempat dokumen tersebut harus selalu konsisten.

---

# 1.21 Reading Guide

Setiap Model akan dijelaskan menggunakan struktur yang sama.

1. Purpose

2. Business Description

3. Ownership

4. Used By

5. Primary Key

6. Business Identifier

7. Fields

8. Relationships

9. Business Rules

10. Validation

11. Lifecycle

12. Integration

13. Audit

14. Future Plan

Dengan struktur yang konsisten, seluruh Model dapat dipahami dengan cepat.

---

# 1.22 Data Consistency

Data hanya boleh memiliki satu sumber kebenaran.

Contoh.

Customer Name berasal dari Customer.

Employee Name berasal dari Employee.

Harga Item berasal dari Item Price.

Tidak diperbolehkan menduplikasi data tanpa alasan bisnis yang jelas.

---

# 1.23 Documentation Standard

Seluruh Model harus memiliki dokumentasi.

Tidak ada Model yang tidak memiliki penjelasan.

Setiap perubahan Model wajib memperbarui Data Dictionary.

---

# 1.24 Future Evolution

Data Dictionary akan terus berkembang mengikuti perkembangan NIAHAIR ERP.

Penambahan Model baru harus mengikuti format dokumentasi yang sama.

Dokumen ini menjadi referensi resmi jangka panjang.

---

# CHAPTER 1 SUMMARY

Data Dictionary merupakan dokumentasi resmi seluruh struktur data NIAHAIR ERP.

Dokumen ini menjelaskan arti bisnis setiap Model, Field, Enum, dan Relationship.

Seluruh developer, QA, Business Analyst, dan AI Assistant harus menggunakan Data Dictionary sebagai referensi utama sebelum melakukan perubahan pada database.

Data Dictionary selalu mengikuti schema Prisma dan merupakan bagian dari dokumentasi arsitektur enterprise NIAHAIR ERP.

# CHAPTER 2 — DATA STANDARDS & NAMING CONVENTIONS

---

# 2.1 Purpose

Chapter ini mendefinisikan standar penamaan seluruh struktur data pada NIAHAIR ERP.

Standar ini berlaku untuk.

- Model
- Field
- Enum
- Table
- Relation
- Index
- Constraint
- API Payload
- Integration

Tujuannya adalah menjaga konsistensi seluruh sistem.

---

# 2.2 General Principles

Penamaan harus.

Singkat.

Jelas.

Konsisten.

Tidak ambigu.

Menggunakan Bahasa Inggris.

Nama harus menggambarkan arti bisnis.

Bukan implementasi teknis.

---

# 2.3 Language Standard

Seluruh nama Model dan Field menggunakan Bahasa Inggris.

Contoh.

Customer.

Employee.

Appointment.

Treatment.

Inventory.

Invoice.

Payment.

Tidak menggunakan Bahasa Indonesia.

---

# 2.4 Model Naming

Model menggunakan.

PascalCase.

Contoh.

Customer

CustomerMembership

TreatmentSession

InventoryMovement

PayrollPeriod

Tidak menggunakan.

customer

CUSTOMER

customer_model

---

# 2.5 Table Naming

Nama tabel menggunakan.

snake_case.

Contoh.

customers

appointments

treatment_sessions

inventory_movements

payment_transactions

Seluruh tabel menggunakan bentuk jamak.

---

# 2.6 Field Naming

Field menggunakan.

camelCase.

Contoh.

customerName

phoneNumber

createdAt

updatedAt

branchId

Tidak menggunakan.

customer_name

CustomerName

Customer_Name

---

# 2.7 Enum Naming

Nama Enum menggunakan.

PascalCase.

Contoh.

AppointmentStatus

InventoryMovementType

PaymentMethodType

EmployeeRole

---

# 2.8 Enum Value

Isi Enum menggunakan.

UPPER_SNAKE_CASE.

Contoh.

BOOKED

CHECK_IN

IN_PROGRESS

COMPLETED

TRANSFER_OUT

PAYMENT_PENDING

---

# 2.9 Relation Naming

Nama Relation mengikuti nama Model.

Contoh.

customer

employee

branch

appointment

inventory

Tidak menggunakan.

customerData

employeeInfo

inventoryObject

---

# 2.10 Foreign Key Naming

Foreign Key selalu.

namaModel + Id

Contoh.

customerId

employeeId

branchId

warehouseId

inventoryId

Tidak menggunakan.

custId

emp

warehouse_fk

---

# 2.11 Primary Key

Semua Model menggunakan.

id

Sebagai Primary Key.

Tidak menggunakan.

customerId

employeePk

invoiceKey

---

# 2.12 Business Identifier

Nomor bisnis memiliki format.

xxxNo

Contoh.

customerNo

invoiceNo

paymentNo

appointmentNo

purchaseNo

productionNo

---

# 2.13 Boolean Naming

Boolean selalu diawali.

is

has

can

should

allow

Contoh.

isActive

isLocked

hasPhoto

canRefund

shouldSync

---

# 2.14 Date Field Naming

Tanggal menggunakan akhiran.

At

Untuk Timestamp.

createdAt

updatedAt

deletedAt

completedAt

approvedAt

Gunakan.

Date.

Untuk tanggal tanpa waktu.

birthDate

joiningDate

invoiceDate

---

# 2.15 Time Field Naming

Gunakan.

Time.

Untuk waktu tanpa tanggal.

startTime

endTime

breakTime

---

# 2.16 Quantity Naming

Seluruh Quantity diawali.

qty

Contoh.

qtyOnHand

qtyReserved

qtyAvailable

qtyCompleted

qtyReturned

Tidak menggunakan.

stockQty

jumlahBarang

---

# 2.17 Price Naming

Harga menggunakan.

price

Cost menggunakan.

cost

Contoh.

sellingPrice

purchasePrice

averageCost

unitCost

---

# 2.18 Amount Naming

Nilai transaksi menggunakan.

amount

Contoh.

totalAmount

paidAmount

discountAmount

taxAmount

remainingAmount

---

# 2.19 Percentage Naming

Persentase menggunakan.

Percentage

Rate

Contoh.

discountPercentage

commissionRate

taxRate

---

# 2.20 Status Naming

Status selalu menggunakan.

status

Contoh.

appointmentStatus

invoiceStatus

paymentStatus

productionStatus

---

# 2.21 Type Naming

Jenis menggunakan.

Type

Contoh.

customerType

paymentType

movementType

mediaType

---

# 2.22 Code Naming

Kode menggunakan.

Code

Contoh.

itemCode

branchCode

employeeCode

warehouseCode

---

# 2.23 Reference Naming

Reference menggunakan.

referenceId

referenceNo

referenceType

Tidak membuat variasi lain.

---

# 2.24 Metadata Fields

Metadata standar.

createdAt

updatedAt

createdBy

updatedBy

deletedAt

deletedBy

---

# 2.25 Audit Naming

Audit menggunakan.

createdByEmployeeId

updatedByEmployeeId

approvedByEmployeeId

closedByEmployeeId

---

# 2.26 File Naming

Media menggunakan.

fileName

fileSize

mimeType

storageKey

publicUrl

thumbnailUrl

---

# 2.27 Integration Naming

Integrasi menggunakan Prefix.

accurateCustomerId

accurateSyncStatus

accurateLastSync

cloudinaryPublicId

---

# 2.28 Index Naming

Gunakan format.

idx_table_column

Contoh.

idx_customer_name

idx_invoice_date

idx_inventory_item

---

# 2.29 Unique Constraint

Gunakan format.

uq_table_column

Contoh.

uq_customer_no

uq_employee_email

---

# 2.30 Foreign Key Constraint

Gunakan format.

fk_child_parent

Contoh.

fk_invoice_customer

fk_payment_invoice

---

# 2.31 Many-to-Many Table

Gunakan nama gabungan.

role_permissions

employee_roles

service_materials

---

# 2.32 Pivot Model

Pivot tetap menggunakan.

PascalCase.

Contoh.

RolePermission

ServiceMaterial

EmployeeBranch

---

# 2.33 Enum Documentation

Setiap Enum memiliki.

Purpose.

Values.

Business Rules.

Usage.

---

# 2.34 Reserved Words

Tidak menggunakan.

user

order

group

table

index

key

Sebagai nama tabel atau field.

Gunakan nama yang lebih spesifik.

---

# 2.35 Abbreviation

Hindari singkatan.

Gunakan.

quantity

Bukan.

qty (kecuali Prefix resmi).

Gunakan.

telephone.

Bukan.

tel.

Gunakan.

customer.

Bukan.

cust.

---

# 2.36 Singular vs Plural

Model.

Singular.

Customer.

Table.

Plural.

customers.

Collection.

Plural.

customers.

Object.

Singular.

customer.

---

# 2.37 API Naming

JSON Payload menggunakan.

camelCase.

Tidak menggunakan.

snake_case.

---

# 2.38 Documentation Standard

Seluruh Field memiliki.

Purpose.

Data Type.

Nullable.

Business Meaning.

Validation.

---

# 2.39 Evolution Policy

Standar Naming tidak boleh berubah tanpa.

Architecture Review.

Migration Plan.

Breaking Change Analysis.

---

# 2.40 Chapter Summary

Seluruh struktur data NIAHAIR ERP mengikuti standar yang konsisten.

Model.

PascalCase.

Table.

snake_case.

Field.

camelCase.

Enum.

PascalCase.

Enum Value.

UPPER_SNAKE_CASE.

Dengan standar ini seluruh database akan tetap konsisten meskipun berkembang menjadi ratusan Model dan ribuan Field.

# CHAPTER 3 — SHARED MODELS & COMMON ENUMS

---

# 3.1 Purpose

Chapter ini menjelaskan seluruh struktur data yang digunakan bersama oleh banyak Module.

Shared Model tidak mewakili proses bisnis tertentu.

Namun menjadi fondasi bagi seluruh sistem.

Perubahan pada Shared Model akan memengaruhi banyak Module.

---

# 3.2 Shared Components

Shared Components terdiri dari.

Enums.

Reference Models.

Audit Fields.

Media.

Metadata.

Permission.

Configuration.

---

# 3.3 Common Enums

Enum digunakan untuk menjaga konsistensi data.

Seluruh Enum bersifat terbatas.

Nilai Enum tidak boleh berubah tanpa Migration.

Enum tidak boleh digunakan untuk data yang dapat berubah setiap saat.

---

# 3.4 Enum Documentation Standard

Setiap Enum wajib memiliki.

Purpose.

Used By.

Values.

Business Rules.

Future Plan.

Contoh.

AppointmentStatus.

Purpose.

Menentukan status Appointment.

Used By.

Appointment.

Treatment.

Daily Board.

---

# 3.5 Status Enum

Status Enum digunakan untuk menunjukkan Lifecycle.

Contoh.

AppointmentStatus.

InvoiceStatus.

PaymentStatus.

InventoryMovementType.

TreatmentStatus.

ProductionStatus.

Status harus mengikuti Business Workflow.

---

# 3.6 Type Enum

Type Enum digunakan untuk klasifikasi.

Contoh.

CustomerType.

EmployeeType.

PaymentType.

MediaType.

MovementType.

Type bukan Status.

Type bersifat tetap.

Status berubah selama Lifecycle.

---

# 3.7 Reference Enum

Reference Enum digunakan untuk hubungan lintas Module.

Contoh.

InventoryReferenceType.

InventorySourceModule.

TimelineType.

MediaOwnerType.

NotificationType.

---

# 3.8 Metadata Enum

Metadata Enum digunakan untuk konfigurasi sistem.

Contoh.

ThemeMode.

Language.

NotificationChannel.

CurrencyFormat.

DateFormat.

---

# 3.9 Audit Fields

Sebagian besar Model memiliki Field berikut.

createdAt.

updatedAt.

createdByEmployeeId.

updatedByEmployeeId.

Audit Field digunakan untuk pelacakan perubahan.

---

# 3.10 Soft Delete Fields

Master Data menggunakan Soft Delete.

Field.

deletedAt.

deletedByEmployeeId.

isActive.

Data tidak langsung dihapus.

---

# 3.11 Synchronization Fields

Model yang terintegrasi memiliki.

accurateId.

lastSyncAt.

syncStatus.

syncError.

Field ini digunakan untuk integrasi.

Bukan Business Rule.

---

# 3.12 Media Fields

Seluruh Media mengikuti standar.

storageProvider.

storageKey.

publicUrl.

thumbnailUrl.

mimeType.

fileSize.

width.

height.

---

# 3.13 Address Structure

Seluruh alamat mengikuti struktur yang sama.

Address.

City.

Province.

PostalCode.

Country.

Tidak menggunakan satu Field Address panjang untuk seluruh informasi.

---

# 3.14 Contact Structure

Kontak menggunakan standar.

phone.

mobilePhone.

email.

website.

whatsapp.

Gunakan Field yang jelas.

---

# 3.15 Money Structure

Nilai uang menggunakan.

Decimal.

Tidak menggunakan Float.

Currency dipisahkan dari Amount.

---

# 3.16 Quantity Structure

Seluruh Quantity menggunakan.

Decimal(18,6).

Contoh.

qtyOnHand.

qtyReserved.

qtyAvailable.

weight.

length.

Volume.

---

# 3.17 Percentage Structure

Persentase menggunakan.

Decimal.

Rentang.

0–100.

Tidak menggunakan Integer.

---

# 3.18 Date Structure

Gunakan.

DateTime.

Untuk Timestamp.

Date.

Untuk tanggal.

Time.

Untuk jam.

Gunakan UTC pada database.

Konversi Time Zone dilakukan di aplikasi.

---

# 3.19 Document Number

Nomor dokumen memiliki format.

PREFIX

↓

YEAR

↓

MONTH

↓

RUNNING NUMBER.

Contoh.

INV-202607-000001

APP-202607-000125

PAY-202607-000056

---

# 3.20 UUID Standard

Seluruh Primary Key menggunakan UUID.

UUID tidak memiliki arti bisnis.

Nomor Dokumen digunakan sebagai identitas operasional.

---

# 3.21 Branch Ownership

Seluruh Transaction memiliki Branch.

Master Data dapat bersifat Global atau Branch.

Branch Ownership dijelaskan pada setiap Model.

---

# 3.22 Employee Ownership

Seluruh transaksi mencatat Employee yang membuat.

Approval juga menggunakan Employee.

Bukan User.

---

# 3.23 Company Ownership

Future.

Multi Company.

Setiap Master dan Transaction dapat dimiliki oleh Company.

---

# 3.24 Configuration Models

Configuration bersifat Global.

Contoh.

System Setting.

Working Hour.

Tax Configuration.

Commission Configuration.

Configuration tidak digunakan sebagai Transaction.

---

# 3.25 Timeline Standard

Timeline memiliki struktur.

Type.

Reference.

Description.

CreatedAt.

CreatedBy.

Timeline digunakan lintas Module.

---

# 3.26 Notification Standard

Notification memiliki.

Recipient.

Title.

Body.

Channel.

Status.

SentAt.

ReadAt.

---

# 3.27 File Attachment Standard

Attachment memiliki.

Owner Type.

Owner Id.

Storage Key.

Original File Name.

Size.

Mime Type.

Semua Module menggunakan struktur yang sama.

---

# 3.28 Integration Metadata

Integrasi menyimpan.

External System.

External Id.

Last Sync.

Sync Status.

Sync Error.

Retry Count.

---

# 3.29 Reference Data

Reference Data digunakan bersama.

Contoh.

Country.

Province.

Currency.

Language.

Unit.

Category.

Role.

Permission.

Reference Data jarang berubah.

---

# 3.30 Shared Model Evolution

Seluruh Shared Model harus menjaga Backward Compatibility.

Perubahan dilakukan melalui Migration.

Tidak mengubah arti Field yang sudah digunakan.

---

# CHAPTER 3 SUMMARY

Shared Models merupakan fondasi seluruh database NIAHAIR ERP.

Seluruh Module menggunakan struktur yang sama untuk.

✓ Audit

✓ Media

✓ Address

✓ Contact

✓ Money

✓ Quantity

✓ Date

✓ Timeline

✓ Notification

✓ Integration

Dengan fondasi yang konsisten, seluruh Model bisnis dapat dibangun dengan pola yang seragam dan mudah dipelihara.

# CHAPTER 4 — REFERENCE DATA

---

# 4.1 Purpose

Reference Data merupakan data yang relatif stabil dan digunakan oleh banyak Module.

Reference Data bukan Transaction.

Reference Data menjadi dasar validasi Business Rule.

Perubahan pada Reference Data harus dilakukan secara hati-hati karena dapat memengaruhi banyak transaksi.

---

# 4.2 Characteristics

Reference Data memiliki karakteristik.

- Jarang berubah
- Digunakan lintas Module
- Memiliki relasi tinggi
- Tidak memiliki Lifecycle kompleks
- Tidak menghasilkan transaksi

---

# 4.3 Business Rules

Reference Data.

✓ Dapat dinonaktifkan

✓ Tidak boleh dihapus apabila masih digunakan

✓ Dapat ditambah

✓ Perubahan harus melalui Administrator

---

# 4.4 Shared Models

Reference Module terdiri dari.

Role

Permission

Unit

ItemCategory

ServiceCategory

PaymentMethod

Tax

Membership

WorkingHour

Holiday

SystemSetting

NotificationTemplate

MediaCategory

Future Reference Models.

Country

Province

City

Currency

Language

---

# 4.5 Model Documentation Template

Seluruh Reference Model mengikuti format.

Purpose

Business Owner

Used By

Primary Key

Fields

Relationships

Business Rules

Validation

Future Plan

---

# 4.6 Model : Role

Purpose

Menyimpan daftar Role yang digunakan untuk Authorization.

Business Owner

System Administrator.

Used By

Authentication.

Authorization.

Employee.

Permission.

Primary Key

id

Unique

name

code

Fields

id

UUID.

name

Nama Role.

Contoh.

SUPER_ADMIN.

MANAGER.

RECEPTION.

WAREHOUSE.

FINANCE.

description

Penjelasan Role.

isActive

Status Role.

createdAt

updatedAt

Relationships

Role

↓

RolePermission

(1:N)

Role

↓

Employee

(1:N)

Business Rules

Role tidak boleh dihapus apabila masih digunakan Employee.

Role dapat dinonaktifkan.

SUPER_ADMIN tidak boleh dihapus.

---

# 4.7 Model : Permission

Purpose

Daftar seluruh Permission pada sistem.

Business Owner

System Administrator.

Used By

RolePermission.

Authorization.

Fields

id

module

action

name

description

Relationships

Permission

↓

RolePermission

Business Rules

Permission bersifat Global.

Permission tidak boleh dibuat secara dinamis.

---

# 4.8 Model : RolePermission

Purpose

Menghubungkan Role dengan Permission.

Relationship

Role

↓

Permission

(M:N)

Business Rules

Satu Permission dapat dimiliki banyak Role.

Satu Role memiliki banyak Permission.

Duplicate tidak diperbolehkan.

Unique Constraint.

roleId

permissionId

---

# 4.9 Model : Unit

Purpose

Menyimpan seluruh satuan barang.

Contoh.

PCS.

BOX.

PACK.

GRAM.

KG.

LITER.

ML.

Used By

Item.

Inventory.

Production.

Purchase.

Fields

id

name

symbol

description

Relationships

Unit

↓

Item

Business Rules

Unit tidak boleh dihapus apabila digunakan Item.

---

# 4.10 Model : ItemCategory

Purpose

Kategori Inventory.

Contoh.

Hair Extension.

Chemical.

Packaging.

Equipment.

Accessory.

Used By

Item.

Inventory.

Report.

---

# 4.11 Model : ServiceCategory

Purpose

Kategori Service Salon.

Contoh.

Hair Treatment.

Coloring.

Keratin.

Hair Spa.

Hair Cut.

Used By

Service.

Appointment.

Treatment.

Report.

---

# 4.12 Model : PaymentMethod

Purpose

Daftar metode pembayaran.

Contoh.

Cash.

Debit.

Credit Card.

Transfer.

QRIS.

E-Wallet.

Used By

Payment.

Invoice.

POS.

Business Rules

Payment Method dapat dinonaktifkan.

Tidak boleh dihapus apabila sudah pernah digunakan.

---

# 4.13 Model : Tax

Purpose

Menyimpan konfigurasi Pajak.

Used By

Invoice.

Purchase.

Finance.

Fields

Tax Name.

Rate.

Is Active.

Business Rules

Rate menggunakan Decimal.

Tidak boleh menggunakan Float.

---

# 4.14 Model : Membership

Purpose

Daftar Membership Customer.

Contoh.

Regular.

Silver.

Gold.

Platinum.

Used By

Customer.

Customer360.

Promotion.

Business Rules

Customer hanya boleh memiliki satu Membership aktif.

---

# 4.15 Model : WorkingHour

Purpose

Jam operasional perusahaan.

Digunakan untuk.

Appointment.

Employee Schedule.

Booking.

Business Rules

Tidak boleh overlap.

---

# 4.16 Model : Holiday

Purpose

Hari libur perusahaan.

Used By

Schedule.

Appointment.

Payroll.

Business Rules

Digunakan untuk validasi Booking.

---

# 4.17 Model : NotificationTemplate

Purpose

Template Notification.

Digunakan oleh.

Email.

WhatsApp.

Telegram.

Future Push Notification.

---

# 4.18 Model : SystemSetting

Purpose

Konfigurasi Global ERP.

Contoh.

Company Name.

Timezone.

Currency.

Default Tax.

Booking Rules.

Invoice Prefix.

Inventory Rules.

Business Rules

Perubahan dicatat pada Audit Log.

---

# 4.19 Future Reference Models

Country

Province

City

Currency

Language

Exchange Rate

Business Calendar

Reference Data ini disiapkan untuk ekspansi Multi Country.

---

# 4.20 Chapter Summary

Reference Data merupakan fondasi seluruh ERP.

Reference Data.

✓ Jarang berubah

✓ Digunakan banyak Module

✓ Tidak menghasilkan transaksi

✓ Memiliki referensi tinggi

Seluruh Transaction bergantung pada konsistensi Reference Data.

Perubahan pada Reference Data harus dilakukan secara terkontrol melalui Administrator.

# CHAPTER 5 — ORGANIZATION STRUCTURE

---

# 5.1 Purpose

Organization Structure mendefinisikan struktur perusahaan yang digunakan oleh seluruh modul pada NIAHAIR ERP.

Organization menjadi dasar.

- Data Ownership
- Permission
- Inventory
- Finance
- Reporting
- Scheduling
- Production

Seluruh transaksi harus berada di dalam struktur organisasi yang jelas.

---

# 5.2 Organization Hierarchy

Hierarki organisasi.

Company

↓

Branch

↓

Warehouse

↓

Employee

↓

Transaction

Seluruh transaksi harus mengetahui lokasi operasionalnya.

---

# 5.3 Model Documentation Standard

Seluruh Organization Model mengikuti struktur.

Purpose

Business Owner

Used By

Primary Key

Fields

Relationships

Business Rules

Validation

Future Plan

---

# 5.4 Model : Company

Purpose

Menyimpan data perusahaan.

Saat ini NIAHAIR menggunakan satu Company.

Model ini disiapkan untuk mendukung Multi Company pada masa depan.

Business Owner

Owner.

System Administrator.

Used By

Branch.

Employee.

Finance.

Reporting.

Fields

id

companyCode

companyName

legalName

taxNumber

phone

email

website

address

city

province

postalCode

country

logoUrl

timezone

currencyCode

isActive

createdAt

updatedAt

Relationships

Company

↓

Branch

(1:N)

Company

↓

Employee

(1:N)

Business Rules

Company tidak boleh dihapus apabila memiliki Branch.

Company dapat dinonaktifkan.

---

# 5.5 Model : Branch

Purpose

Menyimpan seluruh cabang operasional.

Contoh.

Jakarta.

Bandung.

Surabaya.

Business Owner

Branch Manager.

Used By

Appointment.

Treatment.

Employee.

Inventory.

Invoice.

Payment.

Production.

Dashboard.

Fields

id

branchCode

branchName

companyId

phone

email

address

city

province

postalCode

timezone

isHeadOffice

isActive

createdAt

updatedAt

Relationships

Branch

↓

Warehouse

(1:N)

Branch

↓

Employee

(1:N)

Branch

↓

Appointment

(1:N)

Branch

↓

Invoice

(1:N)

Branch

↓

Payment

(1:N)

Business Rules

Branch dapat dinonaktifkan.

Branch tidak boleh dihapus apabila memiliki transaksi.

Satu transaksi hanya dimiliki satu Branch.

---

# 5.6 Model : Warehouse

Purpose

Menyimpan gudang penyimpanan inventory.

Warehouse dapat berada di dalam Branch.

Contoh.

Gudang Utama.

Gudang Produksi.

Gudang Salon.

Gudang Retur.

Business Owner

Warehouse Manager.

Used By

Inventory.

Stock Movement.

Production.

Purchase.

Transfer.

Fields

id

warehouseCode

warehouseName

branchId

description

isDefault

isActive

createdAt

updatedAt

Relationships

Warehouse

↓

Inventory

Warehouse

↓

InventoryMovement

Warehouse

↓

Production

Business Rules

Satu Branch dapat memiliki banyak Warehouse.

Hanya satu Warehouse Default per Branch.

Warehouse tidak boleh dihapus apabila masih memiliki Stock.

---

# 5.7 Model : BranchSetting

Purpose

Menyimpan konfigurasi khusus setiap Branch.

Contoh.

Jam Operasional.

Booking Rules.

Invoice Prefix.

Receipt Footer.

Tax Configuration.

Fields

id

branchId

bookingInterval

bookingStartHour

bookingEndHour

defaultWarehouseId

invoicePrefix

receiptFooter

createdAt

updatedAt

Relationships

Branch

↓

BranchSetting

(1:1)

Business Rules

Satu Branch hanya memiliki satu konfigurasi.

---

# 5.8 Branch Ownership

Seluruh transaksi memiliki Branch.

Contoh.

Appointment.

Treatment.

Invoice.

Payment.

Inventory.

Production.

Branch digunakan untuk.

Permission.

Reporting.

Dashboard.

Audit.

---

# 5.9 Warehouse Ownership

Inventory selalu dimiliki Warehouse.

Stock tidak langsung dimiliki Branch.

Branch mengetahui Warehouse.

Warehouse mengetahui Stock.

---

# 5.10 Branch Transfer

Transfer Inventory dilakukan.

Warehouse

↓

Warehouse

Transfer antar Branch dilakukan melalui Warehouse.

Seluruh Transfer menghasilkan Inventory Movement.

---

# 5.11 Default Warehouse

Setiap Branch memiliki.

Satu Default Warehouse.

Default Warehouse digunakan oleh.

POS.

Treatment.

Invoice.

Stock Deduction.

---

# 5.12 Timezone

Company memiliki Default Timezone.

Branch dapat menggunakan Timezone berbeda.

Seluruh Timestamp disimpan dalam UTC.

---

# 5.13 Business Rules

Organization mengikuti aturan.

Company

↓

Branch

↓

Warehouse

↓

Transaction

Tidak ada transaksi tanpa Branch.

Tidak ada Inventory tanpa Warehouse.

---

# 5.14 Validation

Branch Code unik.

Warehouse Code unik dalam satu Company.

Company Code unik.

Nama Branch boleh sama pada Company berbeda (Future).

---

# 5.15 Audit

Seluruh perubahan Organization dicatat.

Created.

Updated.

Activated.

Deactivated.

Audit Log.

---

# 5.16 Future Plan

Future.

Multi Company.

Multi Country.

Regional Warehouse.

Warehouse Zone.

Bin Location.

Shelf Management.

Geo Location.

---

# 5.17 Chapter Summary

Organization Structure merupakan fondasi operasional NIAHAIR ERP.

Seluruh transaksi berada dalam struktur.

Company

↓

Branch

↓

Warehouse

↓

Transaction

Dengan struktur ini.

✓ Permission menjadi lebih mudah.

✓ Reporting lebih akurat.

✓ Inventory lebih jelas.

✓ Finance dapat dipisahkan per Branch.

✓ ERP siap berkembang menjadi Multi Company dan Multi Branch.

# CHAPTER 6 — CUSTOMER MODULE

---

# 6.1 Purpose

Customer Module merupakan pusat seluruh aktivitas pelanggan pada NIAHAIR ERP.

Seluruh layanan salon, treatment, invoice, pembayaran, membership, media, dan histori pelanggan berpusat pada Customer.

Customer merupakan Master Data.

Customer bukan Transaction.

---

# 6.2 Business Objectives

Customer digunakan untuk.

- Booking Appointment
- Treatment History
- Customer 360
- Invoice
- Payment
- Deposit
- Membership
- Marketing
- Loyalty (Future)
- Accurate Integration

---

# 6.3 Customer Lifecycle

Customer mengikuti siklus.

Lead (Future)

↓

Customer Created

↓

Active Customer

↓

Returning Customer

↓

VIP Customer (Membership)

↓

Inactive Customer

Customer tidak pernah benar-benar dihapus.

---

# 6.4 Model Documentation Standard

Seluruh Model Customer mengikuti struktur.

Purpose

Business Owner

Used By

Primary Key

Fields

Relationships

Business Rules

Validation

Lifecycle

Integration

Future Plan

---

# 6.5 Model : Customer

Purpose

Menyimpan data utama pelanggan.

Business Owner

Reception.

Customer Service.

Marketing.

Used By

Appointment.

Treatment.

Invoice.

Payment.

Deposit.

Customer360.

Membership.

Media.

Timeline.

Primary Key

id

Business Identifier

customerNo

Unique

customerNo

accurateCustomerId

Fields

id

customerNo

accurateCustomerId

fullName

phone

whatsapp

email

birthDate

gender

address

city

province

postalCode

notes

membershipId

lastVisitAt

isActive

createdAt

updatedAt

Relationships

Customer

↓

Appointment

(1:N)

Customer

↓

TreatmentSession

(1:N)

Customer

↓

Invoice

(1:N)

Customer

↓

Payment

(1:N)

Customer

↓

Deposit

(1:N)

Customer

↓

CustomerMedia

(1:N)

Customer

↓

CustomerTimeline

(1:N)

Customer

↓

CustomerMembershipHistory

(1:N)

Business Rules

Customer Number unik.

Nomor Telepon sebaiknya unik.

Customer tidak boleh dihapus apabila memiliki transaksi.

Customer dapat dinonaktifkan.

---

# 6.6 Model : CustomerNote

Purpose

Menyimpan catatan internal mengenai Customer.

Catatan hanya dapat dilihat oleh Staff.

Used By

Customer360.

Reception.

Treatment.

Fields

customerId

employeeId

note

createdAt

Business Rules

Customer dapat memiliki banyak Note.

Note tidak terlihat oleh Customer.

---

# 6.7 Model : CustomerMedia

Purpose

Menyimpan seluruh media Customer.

Contoh.

Before Hair.

After Hair.

Profile.

Consent Form.

Reference Photo.

Fields

customerId

mediaType

storageProvider

storageKey

publicUrl

thumbnailUrl

mimeType

fileSize

uploadedByEmployeeId

createdAt

Relationships

Customer

↓

CustomerMedia

Business Rules

Media tidak boleh dihapus apabila digunakan Treatment.

Media mengikuti Permission.

---

# 6.8 Model : CustomerTimeline

Purpose

Menyimpan seluruh aktivitas Customer.

Timeline menjadi dasar Customer360.

Contoh Event.

Customer Created.

Appointment Created.

Treatment Completed.

Invoice Paid.

Deposit Added.

Membership Changed.

Fields

customerId

timelineType

referenceType

referenceId

title

description

createdByEmployeeId

createdAt

Business Rules

Timeline bersifat Immutable.

Tidak boleh diubah.

Tidak boleh dihapus.

---

# 6.9 Model : CustomerMembershipHistory

Purpose

Menyimpan riwayat perubahan Membership Customer.

Fields

customerId

oldMembershipId

newMembershipId

effectiveDate

changedByEmployeeId

reason

Business Rules

Riwayat Membership tidak boleh diubah.

---

# 6.10 Customer Ownership

Customer bersifat Global.

Customer dapat melakukan transaksi pada Branch mana pun.

Customer tidak dimiliki oleh satu Branch.

Branch hanya menyimpan histori transaksi.

---

# 6.11 Customer Identity

Identitas utama Customer.

Customer Number.

Phone.

WhatsApp.

Email.

Accurate Customer ID.

Customer Number digunakan sebagai Business Identifier.

UUID digunakan sebagai Primary Key.

---

# 6.12 Contact Information

Customer dapat memiliki.

Phone.

WhatsApp.

Email.

Address.

Data kontak harus tervalidasi.

---

# 6.13 Membership

Satu Customer hanya memiliki.

Satu Membership aktif.

Riwayat Membership disimpan terpisah.

---

# 6.14 Customer Status

Status Customer.

Active.

Inactive.

Blacklisted (Future).

Deleted menggunakan Soft Delete.

---

# 6.15 Customer Validation

Validasi.

Full Name wajib.

Phone wajib.

Customer Number unik.

Email opsional.

Birth Date opsional.

Gender opsional.

---

# 6.16 Customer Merge

Future.

Apabila ditemukan Customer Duplicate.

Administrator dapat melakukan Merge.

Riwayat transaksi tetap dipertahankan.

---

# 6.17 Customer Duplicate

Sistem dapat mendeteksi Duplicate berdasarkan.

Phone.

WhatsApp.

Email.

Nama + Tanggal Lahir.

Duplicate tidak langsung digabung.

---

# 6.18 Customer Privacy

Data Customer mengikuti kebijakan privasi.

Nomor Telepon.

Alamat.

Email.

Tidak boleh diakses tanpa Permission.

---

# 6.19 Customer Integration

Customer terintegrasi dengan Accurate.

Field.

accurateCustomerId

lastSyncAt

syncStatus

syncError

Sinkronisasi dilakukan melalui Backend.

---

# 6.20 Customer Search

Customer dapat dicari berdasarkan.

Customer Number.

Nama.

Phone.

WhatsApp.

Email.

Accurate ID.

Pencarian menggunakan Full Text Search apabila tersedia.

---

# 6.21 Customer 360

Customer360 merupakan agregasi data.

Profile.

Appointments.

Treatments.

Invoices.

Payments.

Deposits.

Membership.

Timeline.

Media.

Notes.

Customer360 tidak menyimpan data baru.

Customer360 hanya membaca data dari berbagai Model.

---

# 6.22 Customer Reporting

Report.

Customer Baru.

Customer Aktif.

Customer Tidak Aktif.

Customer Returning.

Top Customer.

Customer Lifetime Value (Future).

---

# 6.23 Audit

Seluruh perubahan Customer dicatat.

Created.

Updated.

Activated.

Deactivated.

Membership Changed.

Accurate Sync.

---

# 6.24 Future Plan

Future.

Customer Tags.

Marketing Segment.

Loyalty Point.

Referral Program.

Campaign.

Birthday Reminder.

Customer Satisfaction.

AI Customer Insight.

---

# 6.25 Chapter Summary

Customer merupakan Master Data utama dalam NIAHAIR ERP.

Seluruh aktivitas pelanggan berpusat pada Customer.

Customer menjadi dasar bagi.

✓ Appointment

✓ Treatment

✓ Invoice

✓ Payment

✓ Deposit

✓ Membership

✓ Customer360

✓ Marketing

✓ Reporting

✓ Accurate Integration

Seluruh transaksi pelanggan harus selalu memiliki referensi ke satu Customer yang valid.

# CHAPTER 7 — EMPLOYEE MODULE

---

# 7.1 Purpose

Employee Module menyimpan seluruh informasi mengenai karyawan yang bekerja di NIAHAIR.

Employee bukan hanya akun login.

Employee merupakan representasi sumber daya manusia yang terlibat dalam seluruh aktivitas operasional perusahaan.

Employee menjadi dasar.

- Authentication
- Authorization
- Appointment
- Treatment
- Inventory
- Production
- Payroll
- Commission
- Attendance
- Audit Log

---

# 7.2 Business Objectives

Employee digunakan untuk.

- Login ERP
- Penjadwalan kerja
- Booking Stylist
- Treatment Assignment
- Commission
- Payroll
- Attendance
- Audit
- Reporting

---

# 7.3 Employee Lifecycle

Employee mengikuti siklus.

Recruitment (Future)

↓

Active

↓

Probation (Future)

↓

Permanent

↓

Leave (Future)

↓

Resigned

↓

Inactive

Employee tidak boleh dihapus apabila memiliki transaksi.

---

# 7.4 Model Documentation Standard

Seluruh Model Employee mengikuti struktur.

Purpose

Business Owner

Used By

Primary Key

Fields

Relationships

Business Rules

Validation

Lifecycle

Future Plan

---

# 7.5 Model : Employee

Purpose

Menyimpan data utama seluruh karyawan.

Business Owner

HR.

Owner.

Manager.

Used By

Appointment.

Treatment.

Inventory.

Invoice.

Payment.

Production.

Payroll.

Commission.

Authentication.

Primary Key

id

Business Identifier

employeeCode

Unique

employeeCode

email

Fields

id

employeeCode

fullName

nickname

phone

email

gender

birthDate

joinDate

positionId

branchId

roleId

photoUrl

isActive

createdAt

updatedAt

Relationships

Employee

↓

Appointment

Employee

↓

TreatmentSession

Employee

↓

TreatmentAssignment

Employee

↓

Invoice

Employee

↓

Payment

Employee

↓

Commission

Employee

↓

Attendance

Employee

↓

Payroll

Employee

↓

AuditLog

Business Rules

Employee Code unik.

Email unik.

Employee tidak boleh dihapus apabila memiliki transaksi.

Employee dapat dipindahkan Branch.

---

# 7.6 Model : EmployeePosition

Purpose

Menyimpan jabatan karyawan.

Contoh.

Reception.

Stylist.

Senior Stylist.

Assistant.

Colorist.

Cashier.

Warehouse Staff.

Production Staff.

Manager.

Owner.

Fields

id

positionCode

positionName

description

isActive

Relationships

EmployeePosition

↓

Employee

Business Rules

Position dapat digunakan banyak Employee.

---

# 7.7 Model : EmployeeBranch

Purpose

Menghubungkan Employee dengan Branch.

Digunakan apabila Employee bekerja di lebih dari satu Branch.

Relationship

Employee

↓

Branch

(M:N)

Business Rules

Satu Employee memiliki satu Primary Branch.

Branch tambahan bersifat opsional.

---

# 7.8 Model : EmployeeSchedule

Purpose

Menyimpan jadwal kerja Employee.

Digunakan oleh.

Appointment.

Booking.

Treatment.

Fields

employeeId

workingDate

startTime

endTime

shift

status

Business Rules

Schedule tidak boleh overlap.

---

# 7.9 Model : Attendance

Purpose

Menyimpan kehadiran Employee.

Fields

employeeId

checkInAt

checkOutAt

workingHours

lateMinutes

status

Business Rules

Attendance digunakan oleh Payroll.

---

# 7.10 Model : Commission

Purpose

Menyimpan hasil komisi Employee.

Komisi dihitung berdasarkan transaksi Treatment.

Fields

employeeId

treatmentSessionId

invoiceId

commissionRuleId

commissionAmount

status

Business Rules

Komisi tidak boleh dihitung dua kali.

Komisi mengikuti Rule yang berlaku saat transaksi.

---

# 7.11 Model : CommissionRule

Purpose

Menyimpan aturan perhitungan komisi.

Fields

employeePositionId

serviceId

commissionType

commissionRate

fixedAmount

effectiveDate

Business Rules

Rule memiliki riwayat.

Rule lama tidak dihapus.

---

# 7.12 Model : Payroll

Purpose

Menyimpan hasil Payroll Employee.

Fields

employeeId

period

basicSalary

commission

bonus

deduction

totalSalary

status

Business Rules

Payroll bersifat Immutable setelah disetujui.

---

# 7.13 Employee Ownership

Employee dimiliki Company.

Employee memiliki Primary Branch.

Employee dapat bekerja di Branch lain apabila diizinkan.

---

# 7.14 Employee Authentication

Employee dapat memiliki Account Login.

Authentication dipisahkan dari data Employee.

Employee tetap dapat ada walaupun belum memiliki akun.

---

# 7.15 Employee Permission

Permission berasal dari.

Role.

↓

Permission.

Employee tidak memiliki Permission langsung.

Kecuali Override (Future).

---

# 7.16 Employee Assignment

Treatment dapat memiliki beberapa Employee.

Contoh.

Stylist.

Assistant.

Colorist.

Setiap Assignment memiliki Role berbeda.

---

# 7.17 Employee Validation

Validasi.

Employee Code wajib.

Nama wajib.

Branch wajib.

Position wajib.

Role wajib.

Email opsional sesuai kebijakan perusahaan.

---

# 7.18 Employee Status

Status.

Active.

Inactive.

On Leave.

Resigned.

Suspended (Future).

---

# 7.19 Employee Reporting

Report.

Employee Performance.

Commission.

Attendance.

Payroll.

Treatment Count.

Sales Contribution.

Working Hours.

---

# 7.20 Employee Audit

Seluruh perubahan Employee dicatat.

Position Changed.

Role Changed.

Branch Changed.

Schedule Changed.

Status Changed.

---

# 7.21 Employee Integration

Future.

Fingerprint.

Face Recognition.

Payroll Software.

HRIS.

Google Calendar.

Microsoft 365.

---

# 7.22 Employee Privacy

Data Employee dilindungi.

Nomor Telepon.

Alamat.

Tanggal Lahir.

Gaji.

Payroll.

Permission menentukan siapa yang dapat melihat data sensitif.

---

# 7.23 Future Plan

Future.

Skill Matrix.

Certification.

Training History.

Performance Review.

Leave Management.

Recruitment.

Employee Document.

Emergency Contact.

AI Scheduling.

---

# 7.24 Chapter Summary

Employee merupakan pusat seluruh aktivitas operasional NIAHAIR ERP.

Employee menjadi dasar bagi.

✓ Authentication

✓ Authorization

✓ Appointment

✓ Treatment

✓ Inventory

✓ Production

✓ Payroll

✓ Commission

✓ Attendance

✓ Audit

Seluruh transaksi yang dilakukan oleh pengguna sistem harus dapat ditelusuri kembali ke satu Employee yang valid.

# CHAPTER 8 — APPOINTMENT MODULE

---

# 8.1 Purpose

Appointment Module mengelola seluruh proses pemesanan layanan pelanggan sebelum Treatment dilakukan.

Appointment merupakan titik awal operasional salon.

Seluruh proses Treatment, Invoice, dan Payment berasal dari Appointment yang valid.

---

# 8.2 Business Objectives

Appointment digunakan untuk.

- Booking Customer
- Reservasi Jadwal
- Reservasi Stylist
- Reservasi Service
- Queue Management
- Daily Board
- Check In
- Treatment Preparation

---

# 8.3 Appointment Lifecycle

Appointment mengikuti siklus.

BOOKED

↓

CONFIRMED

↓

CHECK_IN

↓

IN_PROGRESS

↓

COMPLETED

atau

↓

CANCELLED

atau

↓

NO_SHOW

Setiap perubahan status dicatat pada Timeline.

---

# 8.4 Model Documentation Standard

Seluruh Model Appointment mengikuti struktur.

Purpose

Business Owner

Used By

Primary Key

Fields

Relationships

Business Rules

Validation

Lifecycle

Future Plan

---

# 8.5 Model : Appointment

Purpose

Menyimpan data reservasi pelanggan.

Business Owner

Reception.

Customer Service.

Used By

Treatment.

Invoice.

Deposit.

Daily Board.

Customer360.

Primary Key

id

Business Identifier

appointmentNo

Unique

appointmentNo

Fields

id

appointmentNo

customerId

branchId

appointmentDate

startTime

endTime

status

source

notes

checkedInAt

completedAt

createdByEmployeeId

createdAt

updatedAt

Relationships

Appointment

↓

Customer

(N:1)

Appointment

↓

Branch

(N:1)

Appointment

↓

AppointmentService

(1:N)

Appointment

↓

AppointmentEmployee

(1:N)

Appointment

↓

TreatmentSession

(1:1)

Appointment

↓

Deposit

(0..1)

Business Rules

Appointment harus memiliki Customer.

Appointment harus memiliki minimal satu Service.

Appointment hanya dimiliki satu Branch.

Appointment Number unik.

---

# 8.6 Model : AppointmentService

Purpose

Menyimpan daftar layanan yang dipilih Customer.

Fields

appointmentId

serviceId

estimatedDuration

estimatedPrice

notes

displayOrder

Relationships

Appointment

↓

AppointmentService

↓

Service

Business Rules

Satu Appointment dapat memiliki banyak Service.

Urutan Service disimpan menggunakan displayOrder.

---

# 8.7 Model : AppointmentEmployee

Purpose

Menentukan Employee yang ditugaskan pada Appointment.

Fields

appointmentId

employeeId

assignmentRole

isPrimary

createdAt

Relationships

Appointment

↓

AppointmentEmployee

↓

Employee

Business Rules

Appointment dapat memiliki beberapa Employee.

Harus ada satu Employee utama apabila Appointment sudah dikonfirmasi.

---

# 8.8 Model : AppointmentTimeline

Purpose

Menyimpan histori perubahan Appointment.

Contoh.

Booked.

Confirmed.

Rescheduled.

Checked In.

Cancelled.

Completed.

Fields

appointmentId

timelineType

description

createdByEmployeeId

createdAt

Business Rules

Timeline bersifat Immutable.

Tidak boleh diubah.

---

# 8.9 Appointment Ownership

Appointment dimiliki oleh Branch.

Customer dapat melakukan Booking pada Branch mana pun.

Appointment tidak dapat berpindah Branch setelah Check In.

---

# 8.10 Appointment Scheduling

Appointment memiliki.

Tanggal.

Jam Mulai.

Jam Selesai.

Estimasi Durasi.

Jadwal tidak boleh bentrok dengan Appointment lain pada Employee yang sama.

---

# 8.11 Appointment Status

Status resmi.

BOOKED

CONFIRMED

CHECK_IN

IN_PROGRESS

COMPLETED

CANCELLED

NO_SHOW

Status mengikuti Business Rule.

Tidak boleh melompat status.

---

# 8.12 Appointment Validation

Validasi.

Customer wajib.

Branch wajib.

Tanggal wajib.

Jam wajib.

Minimal satu Service.

Status valid.

Employee tidak boleh memiliki jadwal bentrok.

---

# 8.13 Appointment Reschedule

Appointment dapat dijadwalkan ulang apabila.

Belum Check In.

Riwayat perubahan tetap disimpan.

Perubahan dicatat pada Timeline.

---

# 8.14 Appointment Cancellation

Appointment dapat dibatalkan.

Alasan pembatalan wajib dicatat.

Status berubah menjadi.

CANCELLED.

Appointment tidak dihapus.

---

# 8.15 No Show

Apabila Customer tidak hadir.

Status berubah menjadi.

NO_SHOW.

Data tetap disimpan untuk analisis.

---

# 8.16 Deposit Integration

Appointment dapat memiliki Deposit.

Deposit bersifat opsional.

Deposit akan diterapkan pada Invoice setelah Treatment selesai.

---

# 8.17 Treatment Integration

Appointment menghasilkan satu Treatment Session.

Treatment tidak boleh dibuat tanpa Appointment.

Relationship.

Appointment

↓

Treatment Session

(1:1)

---

# 8.18 Daily Board Integration

Daily Board membaca Appointment berdasarkan.

Tanggal.

Branch.

Status.

Employee.

Appointment merupakan sumber utama Daily Board.

---

# 8.19 Customer360 Integration

Customer360 menampilkan.

Riwayat Appointment.

Status.

Pembatalan.

No Show.

Reschedule.

---

# 8.20 Notification Integration

Appointment dapat mengirim notifikasi.

Booking.

Reminder.

Reschedule.

Cancellation.

Future.

WhatsApp.

Email.

Push Notification.

---

# 8.21 Reporting

Report.

Appointment Harian.

Appointment Bulanan.

Cancellation Rate.

No Show Rate.

Booking Source.

Top Service.

Top Stylist.

---

# 8.22 Audit

Seluruh perubahan Appointment dicatat.

Status.

Schedule.

Employee.

Service.

Cancellation.

Check In.

Completion.

---

# 8.23 Future Plan

Future.

Online Booking.

Google Calendar Sync.

Recurring Appointment.

Waiting List.

AI Schedule Optimization.

Customer Self Booking.

Automatic Reminder.

Queue Prediction.

---

# 8.24 Chapter Summary

Appointment merupakan awal dari seluruh proses operasional salon.

Appointment menjadi dasar bagi.

✓ Daily Board

✓ Treatment

✓ Deposit

✓ Invoice

✓ Payment

✓ Customer360

✓ Reporting

✓ Notification

Seluruh proses pelayanan pelanggan harus dimulai dari satu Appointment yang valid dan terdokumentasi dengan baik.

# CHAPTER 9 — TREATMENT MODULE

---

# 9.1 Purpose

Treatment Module mengelola seluruh proses pelaksanaan layanan salon setelah Customer melakukan Check In.

Treatment merupakan pusat aktivitas operasional salon.

Seluruh penggunaan material, assignment Staff, dokumentasi Before & After, Commission, dan Invoice berasal dari Treatment.

---

# 9.2 Business Objectives

Treatment digunakan untuk.

- Melaksanakan layanan
- Mengelola Staff Assignment
- Mengelola Before & After Photo
- Mencatat Treatment Notes
- Mengurangi Material Inventory
- Menghitung Commission
- Membuat Treatment History
- Membentuk Customer360

---

# 9.3 Treatment Lifecycle

Treatment mengikuti siklus.

READY

↓

STARTED

↓

IN_PROGRESS

↓

WAITING (Optional)

↓

COMPLETED

atau

↓

CANCELLED

Setiap perubahan Status dicatat pada Timeline.

---

# 9.4 Model Documentation Standard

Seluruh Model Treatment mengikuti struktur.

Purpose

Business Owner

Used By

Primary Key

Fields

Relationships

Business Rules

Validation

Lifecycle

Future Plan

---

# 9.5 Model : TreatmentSession

Purpose

Menyimpan satu sesi Treatment Customer.

Business Owner

Stylist.

Reception.

Manager.

Used By

Invoice.

Commission.

Inventory.

Customer360.

Reporting.

Primary Key

id

Business Identifier

treatmentNo

Unique

treatmentNo

Fields

id

treatmentNo

appointmentId

customerId

branchId

status

startedAt

completedAt

durationMinutes

chairNumber

notes

createdByEmployeeId

createdAt

updatedAt

Relationships

TreatmentSession

↓

Appointment

(1:1)

TreatmentSession

↓

Customer

(N:1)

TreatmentSession

↓

TreatmentItem

(1:N)

TreatmentSession

↓

TreatmentAssignment

(1:N)

TreatmentSession

↓

TreatmentMedia

(1:N)

TreatmentSession

↓

TreatmentTimeline

(1:N)

TreatmentSession

↓

MaterialUsage

(1:N)

TreatmentSession

↓

Invoice

(1:1)

Business Rules

Treatment harus berasal dari Appointment.

Treatment tidak boleh dibuat manual.

Treatment hanya dapat diselesaikan apabila memiliki minimal satu Staff.

---

# 9.6 Model : TreatmentItem

Purpose

Menyimpan seluruh Service yang dikerjakan pada satu Treatment.

Fields

treatmentSessionId

serviceId

price

duration

discountAmount

notes

displayOrder

Relationships

TreatmentSession

↓

TreatmentItem

↓

Service

Business Rules

Satu Treatment memiliki satu atau lebih Service.

---

# 9.7 Model : TreatmentAssignment

Purpose

Menyimpan Staff yang mengerjakan Treatment.

Fields

treatmentSessionId

employeeId

assignmentRole

workPercentage

commissionAmount

isPrimary

Relationships

TreatmentSession

↓

TreatmentAssignment

↓

Employee

Business Rules

Satu Treatment dapat memiliki banyak Staff.

Minimal satu Primary Stylist.

Assignment tidak boleh duplikat.

---

# 9.8 Model : TreatmentMedia

Purpose

Menyimpan seluruh media Treatment.

Contoh.

Before.

After.

Progress.

Reference.

Fields

treatmentSessionId

mediaType

storageProvider

storageKey

publicUrl

thumbnailUrl

uploadedByEmployeeId

createdAt

Business Rules

Before Photo diambil sebelum Treatment dimulai.

After Photo diambil setelah Treatment selesai.

Media mengikuti Permission.

---

# 9.9 Model : TreatmentTimeline

Purpose

Menyimpan seluruh histori Treatment.

Contoh.

Treatment Started.

Staff Assigned.

Photo Uploaded.

Treatment Completed.

Fields

treatmentSessionId

timelineType

description

createdByEmployeeId

createdAt

Business Rules

Timeline bersifat Immutable.

---

# 9.10 Model : TreatmentNote

Purpose

Menyimpan catatan teknis selama Treatment.

Fields

treatmentSessionId

employeeId

note

createdAt

Business Rules

Customer tidak dapat melihat Internal Note.

---

# 9.11 Model : MaterialUsage

Purpose

Menyimpan penggunaan Inventory selama Treatment.

Fields

treatmentSessionId

inventoryItemId

quantity

unitId

warehouseId

movementId

Relationships

TreatmentSession

↓

MaterialUsage

↓

InventoryMovement

Business Rules

Material Usage menghasilkan Inventory Movement.

Stock langsung berkurang setelah Treatment selesai.

---

# 9.12 Treatment Ownership

Treatment dimiliki Branch.

Treatment hanya dilakukan pada satu Branch.

---

# 9.13 Treatment Status

Status resmi.

READY

STARTED

IN_PROGRESS

WAITING

COMPLETED

CANCELLED

Status mengikuti Workflow.

Tidak boleh melompat.

---

# 9.14 Staff Assignment

Assignment dapat terdiri dari.

Primary Stylist.

Assistant.

Colorist.

Junior Stylist.

Setiap Assignment memiliki Commission sendiri.

---

# 9.15 Material Consumption

Material mengikuti Service Recipe.

Contoh.

Keratin Premium.

↓

Keratin Liquid.

↓

Hair Serum.

↓

Clarifying Shampoo.

↓

Hair Mask.

Material otomatis digunakan berdasarkan Service.

---

# 9.16 Inventory Integration

Treatment menghasilkan.

Material Usage.

↓

Inventory Movement.

↓

Stock Update.

Inventory tidak boleh berubah secara manual melalui Treatment.

---

# 9.17 Commission Integration

Commission dihitung berdasarkan.

Treatment Assignment.

↓

Commission Rule.

↓

Invoice Paid.

Commission tidak dihitung sebelum Invoice valid.

---

# 9.18 Invoice Integration

Treatment menghasilkan satu Invoice.

Relationship.

Treatment

↓

Invoice

(1:1)

Invoice dibuat setelah Treatment selesai.

---

# 9.19 Customer360 Integration

Treatment menampilkan.

Service.

Staff.

Duration.

Photo.

Material.

Invoice.

Notes.

Timeline.

---

# 9.20 Reporting

Report.

Treatment Count.

Top Service.

Top Stylist.

Average Duration.

Material Consumption.

Commission.

Revenue.

Customer Return Rate.

---

# 9.21 Validation

Treatment harus memiliki.

Customer.

Appointment.

Minimal satu Service.

Minimal satu Staff.

Status valid.

---

# 9.22 Audit

Seluruh perubahan dicatat.

Status.

Assignment.

Material.

Media.

Notes.

Completion.

---

# 9.23 Future Plan

Future.

AI Hair Analysis.

Treatment Recommendation.

Automatic Before/After Comparison.

Video Documentation.

Treatment Checklist.

Voice Note.

Smart Material Prediction.

Chair Management.

---

# 9.24 Chapter Summary

Treatment merupakan pusat operasional salon.

Treatment menjadi penghubung antara.

✓ Appointment

✓ Customer

✓ Employee

✓ Inventory

✓ Commission

✓ Invoice

✓ Payment

✓ Customer360

✓ Reporting

Seluruh aktivitas pelayanan pelanggan harus terdokumentasi melalui Treatment sehingga riwayat layanan, penggunaan material, performa Staff, dan transaksi keuangan dapat ditelusuri secara lengkap.

# CHAPTER 9 — TREATMENT MODULE

---

# 9.1 Purpose

Treatment Module mengelola seluruh proses pelaksanaan layanan salon setelah Customer melakukan Check In.

Treatment merupakan pusat aktivitas operasional salon.

Seluruh penggunaan material, assignment Staff, dokumentasi Before & After, Commission, dan Invoice berasal dari Treatment.

---

# 9.2 Business Objectives

Treatment digunakan untuk.

- Melaksanakan layanan
- Mengelola Staff Assignment
- Mengelola Before & After Photo
- Mencatat Treatment Notes
- Mengurangi Material Inventory
- Menghitung Commission
- Membuat Treatment History
- Membentuk Customer360

---

# 9.3 Treatment Lifecycle

Treatment mengikuti siklus.

READY

↓

STARTED

↓

IN_PROGRESS

↓

WAITING (Optional)

↓

COMPLETED

atau

↓

CANCELLED

Setiap perubahan Status dicatat pada Timeline.

---

# 9.4 Model Documentation Standard

Seluruh Model Treatment mengikuti struktur.

Purpose

Business Owner

Used By

Primary Key

Fields

Relationships

Business Rules

Validation

Lifecycle

Future Plan

---

# 9.5 Model : TreatmentSession

Purpose

Menyimpan satu sesi Treatment Customer.

Business Owner

Stylist.

Reception.

Manager.

Used By

Invoice.

Commission.

Inventory.

Customer360.

Reporting.

Primary Key

id

Business Identifier

treatmentNo

Unique

treatmentNo

Fields

id

treatmentNo

appointmentId

customerId

branchId

status

startedAt

completedAt

durationMinutes

chairNumber

notes

createdByEmployeeId

createdAt

updatedAt

Relationships

TreatmentSession

↓

Appointment

(1:1)

TreatmentSession

↓

Customer

(N:1)

TreatmentSession

↓

TreatmentItem

(1:N)

TreatmentSession

↓

TreatmentAssignment

(1:N)

TreatmentSession

↓

TreatmentMedia

(1:N)

TreatmentSession

↓

TreatmentTimeline

(1:N)

TreatmentSession

↓

MaterialUsage

(1:N)

TreatmentSession

↓

Invoice

(1:1)

Business Rules

Treatment harus berasal dari Appointment.

Treatment tidak boleh dibuat manual.

Treatment hanya dapat diselesaikan apabila memiliki minimal satu Staff.

---

# 9.6 Model : TreatmentItem

Purpose

Menyimpan seluruh Service yang dikerjakan pada satu Treatment.

Fields

treatmentSessionId

serviceId

price

duration

discountAmount

notes

displayOrder

Relationships

TreatmentSession

↓

TreatmentItem

↓

Service

Business Rules

Satu Treatment memiliki satu atau lebih Service.

---

# 9.7 Model : TreatmentAssignment

Purpose

Menyimpan Staff yang mengerjakan Treatment.

Fields

treatmentSessionId

employeeId

assignmentRole

workPercentage

commissionAmount

isPrimary

Relationships

TreatmentSession

↓

TreatmentAssignment

↓

Employee

Business Rules

Satu Treatment dapat memiliki banyak Staff.

Minimal satu Primary Stylist.

Assignment tidak boleh duplikat.

---

# 9.8 Model : TreatmentMedia

Purpose

Menyimpan seluruh media Treatment.

Contoh.

Before.

After.

Progress.

Reference.

Fields

treatmentSessionId

mediaType

storageProvider

storageKey

publicUrl

thumbnailUrl

uploadedByEmployeeId

createdAt

Business Rules

Before Photo diambil sebelum Treatment dimulai.

After Photo diambil setelah Treatment selesai.

Media mengikuti Permission.

---

# 9.9 Model : TreatmentTimeline

Purpose

Menyimpan seluruh histori Treatment.

Contoh.

Treatment Started.

Staff Assigned.

Photo Uploaded.

Treatment Completed.

Fields

treatmentSessionId

timelineType

description

createdByEmployeeId

createdAt

Business Rules

Timeline bersifat Immutable.

---

# 9.10 Model : TreatmentNote

Purpose

Menyimpan catatan teknis selama Treatment.

Fields

treatmentSessionId

employeeId

note

createdAt

Business Rules

Customer tidak dapat melihat Internal Note.

---

# 9.11 Model : MaterialUsage

Purpose

Menyimpan penggunaan Inventory selama Treatment.

Fields

treatmentSessionId

inventoryItemId

quantity

unitId

warehouseId

movementId

Relationships

TreatmentSession

↓

MaterialUsage

↓

InventoryMovement

Business Rules

Material Usage menghasilkan Inventory Movement.

Stock langsung berkurang setelah Treatment selesai.

---

# 9.12 Treatment Ownership

Treatment dimiliki Branch.

Treatment hanya dilakukan pada satu Branch.

---

# 9.13 Treatment Status

Status resmi.

READY

STARTED

IN_PROGRESS

WAITING

COMPLETED

CANCELLED

Status mengikuti Workflow.

Tidak boleh melompat.

---

# 9.14 Staff Assignment

Assignment dapat terdiri dari.

Primary Stylist.

Assistant.

Colorist.

Junior Stylist.

Setiap Assignment memiliki Commission sendiri.

---

# 9.15 Material Consumption

Material mengikuti Service Recipe.

Contoh.

Keratin Premium.

↓

Keratin Liquid.

↓

Hair Serum.

↓

Clarifying Shampoo.

↓

Hair Mask.

Material otomatis digunakan berdasarkan Service.

---

# 9.16 Inventory Integration

Treatment menghasilkan.

Material Usage.

↓

Inventory Movement.

↓

Stock Update.

Inventory tidak boleh berubah secara manual melalui Treatment.

---

# 9.17 Commission Integration

Commission dihitung berdasarkan.

Treatment Assignment.

↓

Commission Rule.

↓

Invoice Paid.

Commission tidak dihitung sebelum Invoice valid.

---

# 9.18 Invoice Integration

Treatment menghasilkan satu Invoice.

Relationship.

Treatment

↓

Invoice

(1:1)

Invoice dibuat setelah Treatment selesai.

---

# 9.19 Customer360 Integration

Treatment menampilkan.

Service.

Staff.

Duration.

Photo.

Material.

Invoice.

Notes.

Timeline.

---

# 9.20 Reporting

Report.

Treatment Count.

Top Service.

Top Stylist.

Average Duration.

Material Consumption.

Commission.

Revenue.

Customer Return Rate.

---

# 9.21 Validation

Treatment harus memiliki.

Customer.

Appointment.

Minimal satu Service.

Minimal satu Staff.

Status valid.

---

# 9.22 Audit

Seluruh perubahan dicatat.

Status.

Assignment.

Material.

Media.

Notes.

Completion.

---

# 9.23 Future Plan

Future.

AI Hair Analysis.

Treatment Recommendation.

Automatic Before/After Comparison.

Video Documentation.

Treatment Checklist.

Voice Note.

Smart Material Prediction.

Chair Management.

---

# 9.24 Chapter Summary

Treatment merupakan pusat operasional salon.

Treatment menjadi penghubung antara.

✓ Appointment

✓ Customer

✓ Employee

✓ Inventory

✓ Commission

✓ Invoice

✓ Payment

✓ Customer360

✓ Reporting

Seluruh aktivitas pelayanan pelanggan harus terdokumentasi melalui Treatment sehingga riwayat layanan, penggunaan material, performa Staff, dan transaksi keuangan dapat ditelusuri secara lengkap.

# CHAPTER 11 — SALES & FINANCIAL TRANSACTION MODULE

---

# 11.1 Purpose

Sales & Financial Transaction Module mengelola seluruh transaksi penjualan layanan dan produk pada NIAHAIR ERP.

Modul ini menjadi sumber resmi seluruh transaksi keuangan operasional.

Seluruh transaksi harus dapat ditelusuri mulai dari Appointment hingga Payment.

---

# 11.2 Business Objectives

Modul ini digunakan untuk.

- Invoice
- Deposit
- Payment
- Refund
- Sales
- Accurate Integration
- Financial Reporting
- Customer History

---

# 11.3 Financial Workflow

Workflow resmi.

Appointment

↓

Treatment

↓

Invoice

↓

Deposit Applied (Optional)

↓

Payment

↓

Invoice Paid

↓

Accounting Sync

Invoice merupakan pusat transaksi.

Payment tidak boleh ada tanpa Invoice.

---

# 11.4 Model Documentation Standard

Seluruh Model mengikuti struktur.

Purpose

Business Owner

Used By

Primary Key

Fields

Relationships

Business Rules

Validation

Lifecycle

Future Plan

---

# 11.5 Model : Invoice

Purpose

Menyimpan tagihan Customer.

Business Owner

Cashier.

Finance.

Used By

Treatment.

Payment.

Deposit.

Customer360.

Accurate.

Primary Key

id

Business Identifier

invoiceNo

Unique

invoiceNo

accurateInvoiceId

Fields

id

invoiceNo

customerId

appointmentId

treatmentSessionId

branchId

invoiceDate

subtotalAmount

discountAmount

taxAmount

depositAppliedAmount

totalAmount

remainingAmount

status

notes

createdByEmployeeId

createdAt

updatedAt

Relationships

Invoice

↓

InvoiceItem

(1:N)

Invoice

↓

Payment

(1:N)

Invoice

↓

DepositApplication

(1:N)

Invoice

↓

TreatmentSession

(1:1)

Business Rules

Invoice Number unik.

Invoice tidak boleh dihapus setelah diposting.

Invoice hanya berasal dari Treatment.

---

# 11.6 Model : InvoiceItem

Purpose

Menyimpan detail Item dan Service pada Invoice.

Fields

invoiceId

itemId

serviceId

description

quantity

unitPrice

discountAmount

subtotal

Relationships

Invoice

↓

InvoiceItem

Business Rules

Invoice memiliki minimal satu Item.

Harga disimpan sebagai snapshot.

---

# 11.7 Model : Deposit

Purpose

Menyimpan uang muka Customer.

Fields

depositNo

customerId

branchId

amount

remainingAmount

status

receivedDate

expiredAt

Relationships

Customer

↓

Deposit

Deposit

↓

DepositApplication

Business Rules

Deposit dapat digunakan beberapa kali.

Remaining Amount tidak boleh negatif.

---

# 11.8 Model : DepositApplication

Purpose

Menyimpan penggunaan Deposit pada Invoice.

Fields

depositId

invoiceId

appliedAmount

createdAt

Relationships

Deposit

↓

Invoice

Business Rules

Jumlah penggunaan tidak boleh melebihi Remaining Amount.

---

# 11.9 Model : Payment

Purpose

Menyimpan pembayaran Invoice.

Fields

paymentNo

invoiceId

paymentMethodId

paymentDate

paidAmount

referenceNumber

notes

status

createdByEmployeeId

Relationships

Invoice

↓

Payment

Business Rules

Satu Invoice dapat memiliki banyak Payment.

Pembayaran tidak boleh melebihi Remaining Amount.

---

# 11.10 Payment Methods

Payment Method berasal dari Reference Data.

Contoh.

Cash.

Transfer.

QRIS.

Debit.

Credit Card.

E-Wallet.

---

# 11.11 Payment Status

Status resmi.

PENDING

PARTIALLY_PAID

PAID

FAILED

REFUNDED

VOID

Status Invoice dihitung berdasarkan Payment.

---

# 11.12 Refund

Purpose

Mengembalikan pembayaran Customer.

Business Rules

Refund tidak menghapus Payment.

Refund menghasilkan transaksi baru.

Audit wajib disimpan.

---

# 11.13 Invoice Status

Status resmi.

DRAFT

POSTED

PARTIALLY_PAID

PAID

VOID

CANCELLED

Status berubah otomatis berdasarkan Payment.

---

# 11.14 Sales Ownership

Seluruh Invoice dimiliki Branch.

Cash Flow dihitung per Branch.

Reporting dapat digabung per Company.

---

# 11.15 Financial Validation

Validasi.

Customer wajib.

Branch wajib.

Invoice memiliki minimal satu Detail.

Payment tidak boleh melebihi sisa tagihan.

Deposit tidak boleh negatif.

---

# 11.16 Accurate Integration

Invoice.

↓

Accurate Sales Invoice.

Payment.

↓

Accurate Payment.

Customer.

↓

Accurate Customer.

Item.

↓

Accurate Item.

Status Sync dicatat.

---

# 11.17 Customer360 Integration

Customer360 menampilkan.

Invoice.

Deposit.

Payment.

Outstanding.

Lifetime Spending.

---

# 11.18 Reporting

Report.

Daily Sales.

Monthly Sales.

Revenue.

Outstanding Invoice.

Deposit Balance.

Payment Method.

Cash Flow.

Top Customer.

Average Transaction.

---

# 11.19 Audit

Seluruh perubahan dicatat.

Invoice Created.

Payment Received.

Deposit Applied.

Refund.

Void.

Accurate Sync.

---

# 11.20 Future Plan

Future.

Credit Note.

Gift Voucher.

Promotion Engine.

Installment Payment.

Split Bill.

Multi Currency.

E-Invoice.

Automatic Reminder.

Payment Gateway.

---

# 11.21 Chapter Summary

Sales & Financial Transaction Module menjadi pusat seluruh transaksi keuangan NIAHAIR ERP.

Modul ini menghubungkan.

✓ Customer

✓ Appointment

✓ Treatment

✓ Invoice

✓ Deposit

✓ Payment

✓ Accurate

✓ Finance

✓ Reporting

Seluruh transaksi keuangan harus dapat ditelusuri secara lengkap mulai dari layanan yang diberikan hingga pembayaran yang diterima.

# CHAPTER 12 — PRODUCTION MODULE

---

# 12.1 Purpose

Production Module mengelola seluruh proses manufaktur produk NIAHAIR mulai dari Raw Material hingga Finished Goods.

Production memastikan setiap proses memiliki jejak material, tenaga kerja, kualitas, dan biaya produksi yang dapat ditelusuri.

Seluruh hasil produksi menjadi Inventory Finished Goods.

---

# 12.2 Business Objectives

Production digunakan untuk.

- Production Planning
- Work Order
- Material Consumption
- Production Process
- Quality Control
- Finished Goods
- Inventory Integration
- Cost Tracking
- Reporting

---

# 12.3 Production Workflow

Workflow resmi.

Production Order

↓

Material Reservation

↓

Material Issue

↓

Production Process

↓

Quality Control

↓

Finished Goods

↓

Inventory Update

↓

Ready For Sales

---

# 12.4 Model Documentation Standard

Seluruh Model Production mengikuti struktur.

Purpose

Business Owner

Used By

Primary Key

Fields

Relationships

Business Rules

Validation

Lifecycle

Future Plan

---

# 12.5 Model : ProductionOrder

Purpose

Menyimpan Work Order produksi.

Business Owner

Production Manager.

Used By

Material Usage.

QC.

Inventory.

Reporting.

Primary Key

id

Business Identifier

productionNo

Unique

productionNo

Fields

id

productionNo

branchId

warehouseId

status

productionDate

plannedStartAt

plannedFinishAt

actualStartAt

actualFinishAt

notes

createdByEmployeeId

createdAt

updatedAt

Relationships

ProductionOrder

↓

ProductionItem

(1:N)

ProductionOrder

↓

ProductionMaterial

(1:N)

ProductionOrder

↓

ProductionEmployee

(1:N)

ProductionOrder

↓

ProductionQC

(1:N)

Business Rules

Production Number unik.

Production tidak boleh dihapus setelah dimulai.

---

# 12.6 Model : ProductionItem

Purpose

Menyimpan Finished Goods yang akan diproduksi.

Fields

productionOrderId

itemId

plannedQuantity

producedQuantity

unitId

Relationships

ProductionOrder

↓

ProductionItem

↓

Item

Business Rules

Satu Production Order dapat menghasilkan lebih dari satu Finished Goods.

---

# 12.7 Model : ProductionMaterial

Purpose

Menyimpan Material yang digunakan.

Fields

productionOrderId

itemId

warehouseId

plannedQuantity

actualQuantity

unitId

inventoryMovementId

Relationships

ProductionOrder

↓

ProductionMaterial

↓

InventoryMovement

Business Rules

Material menghasilkan Inventory Movement OUT.

---

# 12.8 Model : ProductionEmployee

Purpose

Menyimpan Staff yang terlibat dalam produksi.

Fields

productionOrderId

employeeId

role

workingHours

notes

Business Rules

Satu Production dapat memiliki banyak Employee.

---

# 12.9 Model : ProductionQC

Purpose

Menyimpan hasil Quality Control.

Fields

productionOrderId

qcEmployeeId

inspectionDate

status

notes

Relationships

ProductionOrder

↓

ProductionQC

Business Rules

QC wajib dilakukan sebelum Finished Goods diterima.

---

# 12.10 Model : ProductionTimeline

Purpose

Menyimpan seluruh aktivitas Production.

Contoh.

Production Started.

Material Issued.

QC Passed.

Finished.

Fields

productionOrderId

timelineType

description

createdByEmployeeId

createdAt

Business Rules

Timeline bersifat Immutable.

---

# 12.11 Production Status

Status resmi.

PLANNED

RELEASED

IN_PROGRESS

QC

COMPLETED

CANCELLED

Status mengikuti Workflow.

---

# 12.12 Material Consumption

Material berasal dari.

ProductionMaterial

↓

Inventory Movement OUT

↓

Inventory Balance

Material tidak boleh dikurangi secara manual.

---

# 12.13 Finished Goods

Setelah QC selesai.

Finished Goods menghasilkan.

Inventory Movement IN.

↓

Inventory bertambah.

---

# 12.14 Inventory Integration

Production menghasilkan.

Material OUT.

↓

Finished Goods IN.

Semua perubahan stok berasal dari Inventory Movement.

---

# 12.15 Quality Control

QC menentukan.

PASS

REWORK

REJECT

Barang gagal QC tidak menjadi Finished Goods.

---

# 12.16 Cost Tracking

Biaya produksi terdiri dari.

Material Cost.

Labor Cost.

Overhead Cost (Future).

Biaya dihitung pada saat Production selesai.

---

# 12.17 Reporting

Report.

Production Output.

Material Consumption.

Production Efficiency.

QC Result.

Yield.

Reject Rate.

Finished Goods.

---

# 12.18 Validation

Validasi.

Warehouse wajib.

Material cukup.

Finished Goods valid.

QC wajib sebelum selesai.

---

# 12.19 Audit

Seluruh perubahan dicatat.

Status.

Material.

QC.

Employee.

Finished Goods.

Inventory.

---

# 12.20 Future Plan

Future.

Bill of Materials (BOM).

Production Routing.

Operation Sequence.

Machine Management.

Capacity Planning.

Production Scheduling.

Batch Production.

Lot Tracking.

Serial Number.

Barcode.

MES Integration.

---

# 12.21 Chapter Summary

Production Module merupakan pusat proses manufaktur NIAHAIR.

Production menghubungkan.

✓ Inventory

✓ Warehouse

✓ Employee

✓ Quality Control

✓ Finished Goods

✓ Reporting

✓ Cost Tracking

Seluruh proses produksi harus terdokumentasi mulai dari penggunaan material hingga barang jadi sehingga biaya, kualitas, dan stok dapat ditelusuri secara lengkap.

# CHAPTER 13 — SYSTEM MODULE

---

# 13.1 Purpose

System Module mengelola seluruh komponen teknis yang mendukung operasional NIAHAIR ERP.

Module ini tidak menghasilkan transaksi bisnis.

Namun seluruh Module bisnis bergantung pada System Module.

---

# 13.2 Business Objectives

System Module digunakan untuk.

- Authentication
- Authorization
- User Management
- Audit Log
- Notification
- File Storage
- Configuration
- API Integration
- Background Job
- System Monitoring

---

# 13.3 System Architecture

System Module terdiri dari.

Authentication.

Authorization.

Settings.

Audit.

Notification.

Media.

Integration.

Logging.

Configuration.

---

# 13.4 Model Documentation Standard

Seluruh Model mengikuti struktur.

Purpose

Business Owner

Used By

Primary Key

Fields

Relationships

Business Rules

Validation

Future Plan

---

# 13.5 Model : User

Purpose

Menyimpan akun login ERP.

User berbeda dengan Employee.

Employee merupakan data SDM.

User merupakan akun sistem.

Business Owner

System Administrator.

Used By

Authentication.

Authorization.

Audit.

Fields

id

employeeId

username

email

passwordHash

roleId

lastLoginAt

lastLoginIp

isActive

createdAt

updatedAt

Relationships

User

↓

Employee

(1:1)

User

↓

Role

(N:1)

Business Rules

Satu Employee maksimal memiliki satu User.

Password disimpan dalam bentuk Hash.

---

# 13.6 Model : UserSession

Purpose

Menyimpan Session Login.

Fields

userId

refreshToken

deviceName

ipAddress

userAgent

expiredAt

createdAt

Business Rules

Logout menghapus Session.

Session memiliki masa berlaku.

---

# 13.7 Model : AuditLog

Purpose

Menyimpan seluruh aktivitas penting pengguna.

Fields

userId

employeeId

module

action

referenceType

referenceId

oldValue

newValue

ipAddress

userAgent

createdAt

Business Rules

Audit Log bersifat Immutable.

Tidak boleh diubah.

Tidak boleh dihapus.

---

# 13.8 Model : Notification

Purpose

Menyimpan Notification sistem.

Fields

recipientUserId

title

message

notificationType

channel

isRead

sentAt

readAt

Relationships

Notification

↓

User

Business Rules

Notification tidak dihapus.

Status berubah menjadi Read.

---

# 13.9 Model : FileStorage

Purpose

Menyimpan metadata seluruh file.

Fields

storageProvider

storageKey

publicUrl

thumbnailUrl

mimeType

fileName

fileSize

uploadedByUserId

createdAt

Business Rules

File fisik berada pada Object Storage.

Database hanya menyimpan metadata.

---

# 13.10 Model : SystemSetting

Purpose

Menyimpan konfigurasi Global ERP.

Fields

settingKey

settingValue

description

isPublic

updatedByUserId

updatedAt

Business Rules

Setting menggunakan Key Value.

Perubahan dicatat pada Audit Log.

---

# 13.11 Model : ApiCredential

Purpose

Menyimpan konfigurasi integrasi.

Contoh.

Accurate.

Cloudinary.

SMTP.

WhatsApp.

Telegram.

Fields

provider

clientId

encryptedSecret

status

lastSyncAt

Business Rules

Secret harus terenkripsi.

Tidak boleh ditampilkan kembali.

---

# 13.12 Model : BackgroundJob

Purpose

Menyimpan proses Background.

Contoh.

Sync Accurate.

Import.

Export.

Notification.

Fields

jobType

status

startedAt

completedAt

retryCount

errorMessage

Business Rules

Job gagal dapat di-Retry.

---

# 13.13 Model : WebhookLog

Purpose

Menyimpan seluruh Webhook masuk dan keluar.

Fields

provider

direction

eventType

payload

response

status

receivedAt

Business Rules

Webhook tidak dihapus.

Digunakan untuk Debugging.

---

# 13.14 Authentication

Authentication menggunakan.

JWT Access Token.

Refresh Token.

Session Management.

Future.

MFA.

---

# 13.15 Authorization

Authorization menggunakan.

Role.

↓

Permission.

↓

User.

Permission tidak diberikan langsung kepada User.

---

# 13.16 Notification Channels

Channel resmi.

In App.

Email.

WhatsApp.

Telegram.

Future.

Push Notification.

SMS.

---

# 13.17 File Storage

Storage resmi.

Cloudinary.

Future.

AWS S3.

Cloudflare R2.

Azure Blob.

---

# 13.18 Integration

Integrasi resmi.

Accurate.

Cloudinary.

WhatsApp.

Telegram.

SMTP.

Google Calendar.

Future.

Payment Gateway.

---

# 13.19 Security

Data sensitif.

Password.

API Secret.

Refresh Token.

Encryption Key.

Harus dienkripsi.

---

# 13.20 Logging

Log terdiri dari.

Application Log.

Audit Log.

Webhook Log.

Job Log.

Error Log.

---

# 13.21 Reporting

Report.

Login Activity.

Failed Login.

Audit History.

Notification Delivery.

Integration Status.

Job Status.

---

# 13.22 Validation

Validasi.

Username unik.

Email unik.

Secret terenkripsi.

Session valid.

Role wajib.

---

# 13.23 Audit

Seluruh perubahan dicatat.

User.

Role.

Permission.

Setting.

Integration.

Login.

Logout.

---

# 13.24 Future Plan

Future.

Single Sign On.

OAuth.

Google Login.

Microsoft Login.

Two Factor Authentication.

Device Management.

Security Dashboard.

API Rate Limit.

Feature Flag.

System Health Monitoring.

---

# 13.25 Chapter Summary

System Module merupakan fondasi teknis seluruh NIAHAIR ERP.

System Module mendukung.

✓ Authentication

✓ Authorization

✓ Audit

✓ Notification

✓ File Storage

✓ Configuration

✓ Integration

✓ Background Job

✓ Monitoring

Seluruh modul bisnis bergantung pada System Module untuk memastikan keamanan, integritas data, dan operasional sistem yang stabil.

# CHAPTER 14 — REPORTING & ANALYTICS MODULE

---

# 14.1 Purpose

Reporting & Analytics Module menyediakan seluruh laporan operasional, manajerial, dan strategis pada NIAHAIR ERP.

Module ini tidak menghasilkan transaksi.

Reporting hanya membaca data dari seluruh modul ERP.

Seluruh laporan harus menggunakan sumber data resmi dan tervalidasi.

---

# 14.2 Business Objectives

Reporting digunakan untuk.

- Operational Dashboard
- Management Dashboard
- KPI Monitoring
- Financial Report
- Customer Analytics
- Inventory Analytics
- Production Analytics
- Employee Performance
- Business Intelligence

---

# 14.3 Reporting Principles

Seluruh laporan mengikuti prinsip.

Single Source of Truth.

Realtime apabila memungkinkan.

Read Only.

Audit Friendly.

Filterable.

Exportable.

---

# 14.4 Data Sources

Reporting mengambil data dari.

Customer.

Appointment.

Treatment.

Inventory.

Invoice.

Payment.

Production.

Employee.

Audit Log.

Reporting tidak memiliki data sendiri.

---

# 14.5 Dashboard

Dashboard merupakan ringkasan informasi bisnis.

Dashboard terdiri dari.

Operational Dashboard.

Management Dashboard.

Executive Dashboard.

---

# 14.6 KPI

KPI merupakan indikator utama performa bisnis.

Contoh.

Today's Revenue.

Today's Appointment.

Treatment Completed.

Outstanding Invoice.

Low Stock.

Production Output.

Customer Growth.

---

# 14.7 Customer Reports

Laporan Customer.

Customer Baru.

Customer Aktif.

Returning Customer.

Inactive Customer.

Top Spending Customer.

Customer Lifetime Value.

Birthday Customer.

Membership Distribution.

---

# 14.8 Appointment Reports

Laporan Appointment.

Booking Harian.

Booking Bulanan.

No Show Rate.

Cancellation Rate.

Booking Source.

Appointment Trend.

Peak Hours.

---

# 14.9 Treatment Reports

Laporan Treatment.

Treatment Count.

Top Service.

Average Duration.

Treatment Revenue.

Before After Count.

Treatment Completion Rate.

---

# 14.10 Employee Reports

Laporan Employee.

Attendance.

Commission.

Payroll.

Treatment Count.

Revenue Contribution.

Productivity.

Working Hours.

---

# 14.11 Inventory Reports

Laporan Inventory.

Current Stock.

Low Stock.

Negative Stock.

Inventory Valuation.

Movement History.

Dead Stock.

Fast Moving.

Slow Moving.

Warehouse Stock.

---

# 14.12 Financial Reports

Laporan Finance.

Sales.

Revenue.

Invoice.

Outstanding.

Deposit Balance.

Payment Method.

Refund.

Cash Flow.

---

# 14.13 Production Reports

Laporan Production.

Production Output.

Material Consumption.

Yield.

Reject Rate.

QC Result.

Production Cost.

Efficiency.

---

# 14.14 Audit Reports

Audit Report.

User Activity.

Login History.

Data Changes.

Deleted Data.

Permission Changes.

Integration History.

---

# 14.15 Filters

Seluruh laporan minimal mendukung.

Date Range.

Branch.

Employee.

Customer.

Status.

Category.

Search.

---

# 14.16 Export

Seluruh laporan dapat diekspor.

Excel.

CSV.

PDF (Future).

Export mengikuti Filter aktif.

---

# 14.17 Drill Down

Seluruh KPI dapat dibuka menjadi Detail.

Contoh.

Revenue.

↓

Invoice.

↓

Invoice Detail.

---

# 14.18 Real Time

Dashboard utama menggunakan data Realtime apabila memungkinkan.

Report historis dapat menggunakan Cache.

---

# 14.19 Analytics

Analytics digunakan untuk.

Trend.

Growth.

Comparison.

Forecast (Future).

Business Insight.

---

# 14.20 Data Aggregation

Reporting menggunakan View atau Query khusus.

Tidak melakukan perhitungan kompleks di Frontend.

Perhitungan utama dilakukan di Backend.

---

# 14.21 Performance

Laporan harus mampu menangani data besar.

Gunakan.

Pagination.

Lazy Loading.

Server Side Filtering.

Server Side Sorting.

---

# 14.22 Security

Hak akses laporan mengikuti Role dan Permission.

Contoh.

Reception tidak dapat melihat Payroll.

Warehouse tidak dapat melihat Financial Report.

Owner dapat melihat seluruh laporan.

---

# 14.23 Report Ownership

Setiap laporan memiliki Business Owner.

Finance.

Warehouse.

Production.

HR.

Marketing.

Owner.

---

# 14.24 Future Analytics

Future.

AI Business Insight.

Sales Forecast.

Inventory Prediction.

Demand Forecast.

Production Forecast.

Customer Churn Prediction.

Recommendation Engine.

---

# 14.25 Chapter Summary

Reporting & Analytics merupakan lapisan analisis pada NIAHAIR ERP.

Module ini menggabungkan data dari.

✓ Customer

✓ Appointment

✓ Treatment

✓ Inventory

✓ Finance

✓ Production

✓ Employee

✓ Audit

✓ System

Seluruh laporan harus akurat, konsisten, cepat, dan dapat dipercaya sebagai dasar pengambilan keputusan bisnis.

# CHAPTER 15 — DATA GOVERNANCE & FUTURE EVOLUTION

---

# 15.1 Purpose

Chapter ini mendefinisikan tata kelola (Data Governance) seluruh struktur data NIAHAIR ERP.

Tujuan utama Data Governance adalah menjaga kualitas, konsistensi, keamanan, dan keberlanjutan database seiring pertumbuhan sistem.

Seluruh perubahan struktur database harus mengikuti aturan pada chapter ini.

---

# 15.2 Data Governance Principles

Seluruh data mengikuti prinsip.

Single Source of Truth.

Consistency.

Integrity.

Traceability.

Scalability.

Security.

Auditability.

Maintainability.

---

# 15.3 Single Source of Truth

Setiap informasi bisnis hanya memiliki satu sumber resmi.

Contoh.

Customer Name berasal dari Customer.

Employee Name berasal dari Employee.

Stock berasal dari Inventory.

Invoice Status berasal dari Invoice.

Tidak diperbolehkan menyimpan data yang sama pada banyak Model tanpa alasan bisnis.

---

# 15.4 Data Integrity

Seluruh Relationship harus menjaga Referential Integrity.

Foreign Key wajib tervalidasi.

Data yatim (Orphan Record) tidak diperbolehkan.

Penghapusan Parent harus mengikuti Business Rule.

---

# 15.5 Soft Delete Policy

Master Data menggunakan Soft Delete.

Data transaksi tidak dihapus.

Status dapat berubah menjadi.

Inactive.

Archived.

Deleted.

Riwayat transaksi harus tetap tersedia.

---

# 15.6 Immutable Transaction

Model berikut bersifat Immutable setelah diposting.

Invoice.

Payment.

Inventory Movement.

Production.

Audit Log.

Timeline.

Webhook Log.

Perubahan dilakukan melalui transaksi koreksi, bukan mengubah data asli.

---

# 15.7 Data Ownership

Setiap Model memiliki Business Owner.

Contoh.

Customer → Reception.

Employee → HR.

Inventory → Warehouse.

Invoice → Finance.

Production → Production Manager.

System → IT Administrator.

Business Owner bertanggung jawab atas kualitas data.

---

# 15.8 Data Validation

Validasi dilakukan pada beberapa lapisan.

Frontend.

Backend.

Database Constraint.

Business Rule.

Tidak bergantung pada satu lapisan saja.

---

# 15.9 Migration Policy

Perubahan Schema dilakukan menggunakan Migration.

Migration harus.

Reversible apabila memungkinkan.

Terdokumentasi.

Diuji sebelum Production.

Tidak boleh menghapus data tanpa persetujuan.

---

# 15.10 Backward Compatibility

Perubahan Schema harus mempertimbangkan kompatibilitas.

Field lama tidak langsung dihapus.

Gunakan proses.

Deprecated.

↓

Migration.

↓

Removal.

---

# 15.11 Versioning

Schema memiliki Version.

Major.

Minor.

Patch.

Breaking Change hanya dilakukan pada Major Version.

---

# 15.12 Documentation Policy

Setiap perubahan Schema harus memperbarui.

Blueprint.

Business Rules.

Architecture Decision.

Data Dictionary.

API Documentation.

Dokumentasi harus selalu sinkron.

---

# 15.13 Data Security

Data sensitif harus dilindungi.

Password.

Token.

API Secret.

Personal Information.

Payroll.

Encryption digunakan sesuai kebutuhan.

---

# 15.14 Audit Policy

Seluruh perubahan penting dicatat.

Created.

Updated.

Deleted.

Approved.

Posted.

Cancelled.

Audit Log tidak boleh diubah.

---

# 15.15 Data Retention

Data disimpan sesuai kebutuhan bisnis.

Master Data.

Selama masih digunakan.

Transaction.

Disimpan permanen.

Audit Log.

Disimpan sesuai kebijakan perusahaan.

---

# 15.16 Archiving Strategy

Data lama dapat dipindahkan ke Archive.

Archive tetap dapat diakses.

Archive tidak memengaruhi transaksi aktif.

---

# 15.17 Integration Governance

Seluruh integrasi eksternal harus memiliki.

External ID.

Sync Status.

Last Sync.

Retry Count.

Error Message.

Integration harus dapat dipantau.

---

# 15.18 Performance Strategy

Database harus mendukung.

Index.

Pagination.

Filtering.

Sorting.

Partitioning (Future).

Materialized View (Future).

---

# 15.19 Reporting Strategy

Reporting membaca.

Read Model.

Database View.

Reporting Service.

Bukan melakukan Join kompleks pada Frontend.

---

# 15.20 Multi Company Readiness

Database dirancang agar mendukung.

Multi Company.

Multi Branch.

Multi Warehouse.

Multi Currency (Future).

Tanpa perubahan besar pada struktur.

---

# 15.21 Scalability

Database harus mampu berkembang.

100+ Model.

500+ Relationship.

Jutaan transaksi.

Ratusan ribu Customer.

Puluhan cabang.

---

# 15.22 AI Readiness

Seluruh struktur data harus siap digunakan oleh AI.

Contoh.

Customer Recommendation.

Inventory Prediction.

Production Optimization.

Appointment Forecast.

Business Analytics.

---

# 15.23 Continuous Improvement

Data Dictionary merupakan Living Document.

Review dilakukan secara berkala.

Perubahan mengikuti kebutuhan bisnis.

Bukan tren teknologi.

---

# 15.24 Future Evolution

Pengembangan berikutnya dapat mencakup.

Data Warehouse.

Business Intelligence.

Machine Learning.

AI Assistant.

Event Sourcing.

CQRS.

Microservice.

Multi Region.

Offline Sync.

---

# 15.25 Final Summary

Data Dictionary merupakan dokumentasi resmi seluruh struktur data NIAHAIR ERP.

Dokumen ini menjadi acuan bagi.

✓ Software Architect

✓ Backend Developer

✓ Frontend Developer

✓ QA Engineer

✓ Business Analyst

✓ DevOps

✓ System Integrator

✓ AI Assistant

Seluruh perubahan struktur database harus mengikuti standar yang telah ditetapkan agar sistem tetap konsisten, aman, mudah dipelihara, dan siap berkembang menjadi ERP enterprise berskala besar.

---

# DATA DICTIONARY SUMMARY

05_DATA_DICTIONARY.md mendokumentasikan seluruh struktur data NIAHAIR ERP.

Dokumen ini mencakup.

✓ Data Standards

✓ Naming Convention

✓ Shared Models

✓ Reference Data

✓ Organization

✓ Customer

✓ Employee

✓ Appointment

✓ Treatment

✓ Inventory

✓ Sales & Finance

✓ Production

✓ System

✓ Reporting

✓ Data Governance

Data Dictionary menjadi referensi resmi untuk memahami arti bisnis setiap Model, Field, Enum, Relationship, Constraint, dan aturan penyimpanan data di dalam sistem.

Dokumen ini harus selalu diperbarui setiap kali terjadi perubahan pada schema database agar tetap menjadi Single Source of Truth bagi seluruh tim pengembang.