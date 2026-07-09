# 09_TESTING_GUIDE.md

# CHAPTER 1 — INTRODUCTION

---

# 1.1 Purpose

Dokumen ini mendefinisikan standar pengujian (Testing Standards) untuk seluruh NIAHAIR ERP.

Testing bertujuan memastikan setiap perubahan source code memenuhi Business Rules, tidak menyebabkan regresi, dan siap digunakan pada lingkungan Production.

Dokumen ini berlaku untuk seluruh Backend, Frontend, Database, API, Integration, Queue Worker, dan AI Generated Code.

---

# 1.2 Objectives

Testing dilakukan untuk.

- Memastikan Business Rule berjalan dengan benar.
- Mencegah Regression.
- Menemukan Bug sejak awal.
- Menjaga kualitas source code.
- Mendukung Continuous Integration.
- Mempermudah Refactoring.
- Memastikan sistem stabil sebelum Release.

---

# 1.3 Scope

Dokumen ini mencakup.

- Unit Testing
- Integration Testing
- API Testing
- Frontend Testing
- Database Testing
- Queue Testing
- External Integration Testing
- End-to-End Testing
- Performance Testing
- Security Testing
- Regression Testing
- Test Automation

---

# 1.4 Testing Principles

Seluruh Testing mengikuti prinsip.

✅ Business Driven

Testing harus memverifikasi perilaku bisnis, bukan hanya implementasi teknis.

---

✅ Repeatable

Test harus memberikan hasil yang sama setiap kali dijalankan.

---

✅ Independent

Satu test tidak boleh bergantung pada test lain.

---

✅ Automated

Testing dilakukan secara otomatis sebanyak mungkin.

---

✅ Fast

Unit Test harus selesai dalam waktu singkat.

---

✅ Reliable

Test tidak boleh bersifat acak (flaky).

---

# 1.5 Testing Pyramid

Prioritas testing mengikuti konsep Testing Pyramid.

```text
                End-to-End
                    ▲
             Integration Test
                    ▲
               Unit Test
```

Sebagian besar pengujian harus berada pada Unit Test.

---

# 1.6 Testing Workflow

Seluruh perubahan mengikuti alur berikut.

```text
Development

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

Merge

↓

Deployment
```

Tidak ada perubahan yang langsung masuk ke Production tanpa melalui proses testing.

---

# 1.7 Testing Responsibilities

| Role | Responsibility |
|------|----------------|
| Developer | Unit Test, Integration Test |
| QA | Functional Test, Regression Test |
| DevOps | CI Testing |
| Product Owner | User Acceptance Test |
| AI Coding Assistant | Membuat dan memperbarui test sesuai perubahan kode |

---

# 1.8 Success Criteria

Testing dianggap berhasil apabila.

- Seluruh test lulus.
- Tidak ada Critical Bug.
- Business Rule tervalidasi.
- Regression tidak ditemukan.
- Coverage memenuhi target.
- Sistem siap dirilis.

---

# 1.9 Testing Checklist

Sebelum Pull Request.

☐ Unit Test dibuat.

☐ Integration Test diperbarui.

☐ API Test diperbarui.

☐ Seluruh test lulus.

☐ Tidak ada flaky test.

☐ Dokumentasi diperbarui bila diperlukan.

---

# 1.10 Chapter Summary

Testing merupakan bagian wajib dari proses pengembangan NIAHAIR ERP.

Seluruh perubahan source code harus divalidasi melalui proses testing yang terstandarisasi sebelum dapat digabungkan ke branch utama.

Dokumen ini menjadi acuan resmi seluruh aktivitas pengujian pada proyek.

# CHAPTER 2 — TESTING STRATEGY

---

# 2.1 Goals

Testing pada NIAHAIR ERP bertujuan memastikan bahwa setiap fitur bekerja sesuai Business Rules, aman digunakan, dan tidak menyebabkan regresi pada sistem.

Testing merupakan bagian dari proses development, bukan aktivitas yang dilakukan setelah development selesai.

---

# 2.2 Testing Philosophy

Seluruh testing mengikuti prinsip berikut.

✅ Test Early

Testing dilakukan sejak awal pengembangan.

---

✅ Test Continuously

Testing dilakukan setiap ada perubahan source code.

---

✅ Test Business Behavior

Fokus pada perilaku sistem, bukan detail implementasi.

---

✅ Automate Whenever Possible

Prioritaskan testing otomatis dibanding manual.

---

✅ Prevent Regression

Setiap bug yang diperbaiki harus memiliki test agar tidak muncul kembali.

---

# 2.3 Testing Levels

NIAHAIR ERP menggunakan beberapa tingkat pengujian.

| Level | Purpose |
|--------|---------|
| Unit Test | Menguji satu fungsi atau class |
| Integration Test | Menguji komunikasi antar layer |
| API Test | Menguji REST API |
| Frontend Test | Menguji komponen dan halaman |
| End-to-End Test | Menguji alur bisnis lengkap |
| Performance Test | Menguji performa sistem |
| Security Test | Menguji keamanan aplikasi |
| Regression Test | Memastikan fitur lama tetap berjalan |

---

# 2.4 Testing Pyramid

Prioritas testing mengikuti Testing Pyramid.

```text
                E2E
                 ▲
          Integration Test
                 ▲
            Unit Test
```

Sebagian besar test harus berada pada Unit Test karena lebih cepat, stabil, dan mudah dipelihara.

---

# 2.5 What Should Be Tested

Seluruh fitur penting wajib diuji.

Minimal meliputi.

- Business Logic
- API Endpoint
- Database Operation
- Validation
- Authentication
- Authorization
- Integration
- Error Handling
- Calculation
- Reporting

---

# 2.6 Test Environment

Gunakan environment khusus untuk testing.

Pisahkan dari.

- Development
- Staging
- Production

Jangan pernah menjalankan test pada database Production.

---

# 2.7 Test Data

Gunakan data yang konsisten.

✅ Factory

✅ Fixture

✅ Seeder

Hindari menggunakan data Production secara langsung.

---

# 2.8 Test Execution

Testing dijalankan pada kondisi berikut.

✅ Sebelum Pull Request.

✅ Setelah perubahan Business Rule.

✅ Setelah Refactoring.

✅ Sebelum Release.

✅ Setelah Bug Fix.

---

# 2.9 Exit Criteria

Perubahan dianggap siap apabila.

- Seluruh test lulus.
- Tidak ada Critical Bug.
- Tidak ada test yang gagal.
- Build berhasil.
- Coverage memenuhi target.

---

# 2.10 Bug Verification

Setiap bug yang diperbaiki harus.

- Direproduksi.
- Diperbaiki.
- Ditambahkan test baru.
- Diverifikasi kembali.

Bug tidak dianggap selesai tanpa test yang mencegah regresi.

---

# 2.11 Risk-Based Testing

Prioritaskan testing pada area yang memiliki risiko tinggi.

Contoh.

- Payment
- Inventory
- Production
- Authentication
- Accurate Integration
- Stock Calculation
- Commission Calculation

Semakin tinggi risiko, semakin tinggi prioritas pengujiannya.

---

# 2.12 Shift Left Testing

Testing dilakukan sedini mungkin.

```text
Requirement

↓

Development

↓

Unit Test

↓

Integration Test

↓

Review

↓

Release
```

Bug yang ditemukan lebih awal lebih murah untuk diperbaiki.

---

# 2.13 Testing Metrics

Pantau metrik berikut.

| Metric | Target |
|---------|--------|
| Unit Test Pass Rate | 100% |
| Integration Test Pass Rate | 100% |
| API Test Pass Rate | 100% |
| Critical Bug | 0 |
| Build Success | 100% |
| Flaky Test | 0 |

Coverage dipantau, tetapi tidak menjadi satu-satunya indikator kualitas.

---

# 2.14 Checklist

Sebelum melanjutkan ke tahap berikutnya.

☐ Business Rule telah diuji.

☐ Test menggunakan data yang valid.

☐ Test dapat dijalankan berulang.

☐ Tidak bergantung pada test lain.

☐ Environment testing terpisah.

☐ Seluruh test berhasil.

---

# 2.15 Chapter Summary

Strategi testing NIAHAIR ERP berfokus pada pengujian perilaku bisnis secara berlapis.

Prinsip utama.

✓ Test Early

✓ Test Continuously

✓ Business Driven Testing

✓ Automation First

✓ Risk-Based Testing

✓ Regression Prevention

Dengan strategi ini, kualitas sistem dapat dijaga sejak awal pengembangan hingga proses deployment, sehingga setiap perubahan memiliki tingkat kepercayaan yang tinggi sebelum digunakan pada lingkungan Production.

# CHAPTER 3 — UNIT TESTING

---

# 3.1 Goals

Unit Test bertujuan menguji satu unit kode secara terisolasi tanpa bergantung pada komponen lain.

Unit yang diuji dapat berupa.

- Service
- Helper
- Utility
- Calculator
- Validator
- Mapper

Unit Test harus berjalan cepat, stabil, dan mudah dipelihara.

---

# 3.2 Testing Scope

Unit Test wajib dibuat untuk.

| Component | Required |
|-----------|----------|
| Service | ✅ |
| Helper | ✅ |
| Utility | ✅ |
| Mapper | ✅ |
| Validator | ✅ |
| Calculator | ✅ |

Repository dan API diuji melalui Integration Test.

---

# 3.3 Unit Test Rules

Setiap Unit Test harus.

✅ Menguji satu fungsi.

✅ Menguji satu perilaku.

✅ Tidak bergantung pada Database.

✅ Tidak bergantung pada API.

✅ Tidak bergantung pada test lain.

---

# 3.4 What Should Be Tested

Minimal menguji.

- Success Case
- Validation
- Business Rule
- Error Case
- Edge Case

---

# 3.5 Test Structure

Gunakan pola AAA.

```text
Arrange

↓

Act

↓

Assert
```

---

### Example

```ts
// Arrange
const customer = customerFactory.build();

// Act
const result = await customerService.create(customer);

// Assert
expect(result.name).toBe(customer.name);
```

---

# 3.6 Mock Rules

Mock hanya digunakan untuk dependency.

Contoh.

✅ Repository

✅ Email Service

✅ Cloudinary

✅ Accurate API

Jangan Mock Business Logic.

---

# 3.7 Test Naming

Gunakan format.

```text
should_<expected_result>_when_<condition>
```

### Good

```text
should_create_customer_when_data_is_valid

should_throw_error_when_customer_not_found

should_calculate_commission_correctly
```

### Bad

```text
customer test

test create

case1
```

---

# 3.8 Assertions

Setiap test wajib memiliki assertion yang jelas.

### Good

```ts
expect(result.success).toBe(true);

expect(result.customerId).toBeDefined();
```

### Bad

```ts
await customerService.create(data);
```

Tanpa assertion.

---

# 3.9 Factory & Fixture

Gunakan Factory untuk membuat object.

### Good

```ts
const customer = customerFactory.build();
```

Gunakan Fixture apabila membutuhkan data tetap.

Jangan membuat object yang sama berulang kali.

---

# 3.10 Business Rule Testing

Seluruh Business Rule penting wajib diuji.

Contoh.

- Commission Calculation.

- Stock Calculation.

- Membership Discount.

- Deposit Usage.

- Inventory Adjustment.

- Appointment Conflict.

---

# 3.11 Edge Case Testing

Minimal uji.

- Empty Data.

- Null.

- Undefined.

- Duplicate Data.

- Maximum Value.

- Minimum Value.

- Invalid Enum.

---

# 3.12 Error Testing

Pastikan Error yang benar dilempar.

### Example

```ts
await expect(

customerService.findById(id)

).rejects.toThrow(NotFoundError);
```

---

# 3.13 Coverage Target

Target minimum.

| Component | Coverage |
|-----------|----------|
| Service | ≥90% |
| Helper | ≥90% |
| Utility | ≥90% |
| Validator | ≥90% |
| Mapper | ≥80% |

Coverage tinggi tidak menjamin kualitas, tetapi membantu menemukan area yang belum diuji.

---

# 3.14 Common Mistakes

❌ Menguji banyak fungsi dalam satu test.

❌ Bergantung pada Database.

❌ Bergantung pada Internet.

❌ Hardcoded Test Data.

❌ Tidak ada Assertion.

❌ Test terlalu panjang.

---

# 3.15 Best Practices

✅ Satu test untuk satu perilaku.

✅ Gunakan Factory.

✅ Gunakan Mock seperlunya.

✅ Gunakan nama test yang jelas.

✅ Gunakan AAA Pattern.

✅ Test harus independen.

---

# 3.16 Checklist

Sebelum Pull Request.

☐ Unit Test dibuat.

☐ AAA Pattern digunakan.

☐ Mock sesuai kebutuhan.

☐ Assertion lengkap.

☐ Business Rule diuji.

☐ Error Case diuji.

☐ Edge Case diuji.

☐ Coverage memenuhi target.

---

# 3.17 Quick Reference

| Item | Standard |
|------|----------|
| Pattern | Arrange – Act – Assert |
| Database | Tidak digunakan |
| API | Tidak digunakan |
| Mock | Dependency saja |
| Naming | should_when |
| Assertion | Wajib |
| Coverage | ≥90% Service |

---

# 3.18 Chapter Summary

Unit Test merupakan fondasi utama strategi testing NIAHAIR ERP.

Prinsip utama.

✓ Menguji satu unit kode secara terisolasi.

✓ Menggunakan pola Arrange–Act–Assert.

✓ Mock hanya untuk dependency.

✓ Menguji Success, Error, dan Edge Case.

✓ Fokus pada Business Rule.

✓ Mudah dijalankan dan mudah dipelihara.

Dengan standar ini, Business Logic dapat divalidasi secara cepat dan konsisten sebelum digabungkan ke sistem yang lebih besar.

# CHAPTER 4 — INTEGRATION TESTING

---

# 4.1 Goals

Integration Test bertujuan memastikan komunikasi antar komponen berjalan dengan benar.

Integration Test memverifikasi bahwa seluruh layer aplikasi dapat bekerja sebagai satu kesatuan.

---

# 4.2 Testing Scope

Integration Test wajib menguji interaksi antar layer.

| Component | Required |
|-----------|----------|
| Controller → Service | ✅ |
| Service → Repository | ✅ |
| Repository → Database | ✅ |
| Transaction | ✅ |
| Prisma Query | ✅ |

---

# 4.3 Integration Flow

Seluruh Integration Test mengikuti alur berikut.

```text
Controller

↓

Service

↓

Repository

↓

Prisma

↓

Test Database
```

Seluruh layer dijalankan secara nyata.

---

# 4.4 What Should Be Tested

Minimal menguji.

- Create Data
- Read Data
- Update Data
- Delete Data
- Transaction
- Database Constraint
- Business Flow
- Error Handling

---

# 4.5 Test Database

Gunakan database khusus untuk testing.

Contoh.

```text
Production Database

×

Development Database

×

Testing Database

✓
```

Jangan menggunakan database Production.

---

# 4.6 Test Data

Gunakan.

✅ Factory

✅ Seeder

✅ Fixture

Data harus dapat dibuat dan dihapus secara otomatis.

---

# 4.7 Database Cleanup

Setiap test harus membersihkan data.

Contoh.

```text
Before Test

↓

Seed Data

↓

Run Test

↓

Cleanup Database
```

Test tidak boleh memengaruhi test berikutnya.

---

# 4.8 Transaction Testing

Seluruh transaction penting wajib diuji.

Contoh.

- Create Invoice
- Apply Deposit
- Update Stock
- Production Order
- Payment

Pastikan rollback berjalan apabila terjadi error.

---

# 4.9 Constraint Testing

Uji seluruh constraint database.

Contoh.

- UNIQUE
- FOREIGN KEY
- NOT NULL
- CHECK Constraint

Pastikan database menolak data yang tidak valid.

---

# 4.10 Repository Testing

Repository harus diuji terhadap database nyata.

Minimal.

- CRUD
- Pagination
- Filtering
- Sorting
- Search

Jangan menggunakan mock database.

---

# 4.11 Business Flow Testing

Uji alur yang melibatkan beberapa layer.

Contoh.

```text
Create Customer

↓

Create Appointment

↓

Check In

↓

Treatment

↓

Invoice

↓

Payment
```

Pastikan seluruh proses berjalan tanpa error.

---

# 4.12 Error Handling

Pastikan seluruh error diproses dengan benar.

Contoh.

- Duplicate Data
- Missing Foreign Key
- Invalid Transaction
- Constraint Violation

---

# 4.13 Performance

Integration Test harus.

- Stabil.
- Konsisten.
- Tidak terlalu lambat.

Optimalkan setup dan cleanup agar waktu pengujian tetap efisien.

---

# 4.14 Best Practices

✅ Gunakan database khusus testing.

✅ Jalankan migration sebelum test.

✅ Bersihkan data setelah test.

✅ Gunakan Factory.

✅ Uji transaction.

---

# 4.15 Common Mistakes

❌ Menggunakan Production Database.

❌ Test bergantung pada urutan eksekusi.

❌ Tidak membersihkan data.

❌ Mock seluruh Repository.

❌ Menguji terlalu banyak skenario dalam satu test.

---

# 4.16 Checklist

Sebelum Pull Request.

☐ Test Database digunakan.

☐ Migration berhasil.

☐ Seeder tersedia.

☐ Cleanup berjalan.

☐ Transaction diuji.

☐ Constraint diuji.

☐ Seluruh Integration Test lulus.

---

# 4.17 Quick Reference

| Item | Standard |
|------|----------|
| Database | Testing Database |
| ORM | Prisma |
| CRUD | Wajib |
| Transaction | Wajib |
| Constraint | Wajib |
| Cleanup | Setelah setiap test |
| Factory | Digunakan |

---

# 4.18 Chapter Summary

Integration Test memastikan seluruh layer aplikasi bekerja dengan baik sebagai satu kesatuan.

Prinsip utama.

✓ Gunakan database khusus testing.

✓ Uji komunikasi antar layer.

✓ Uji transaction dan constraint.

✓ Bersihkan data setelah test.

✓ Fokus pada Business Flow yang nyata.

Dengan standar ini, integrasi antar komponen dapat divalidasi sebelum sistem diuji melalui API maupun End-to-End Testing.

# CHAPTER 5 — API TESTING

---

# 5.1 Goals

API Testing bertujuan memastikan seluruh REST API bekerja sesuai spesifikasi pada API Standards.

Testing mencakup.

- Request
- Response
- Validation
- Authentication
- Authorization
- Business Rule
- Error Handling

---

# 5.2 Testing Scope

Seluruh endpoint wajib diuji.

| Endpoint | Required |
|----------|----------|
| GET | ✅ |
| POST | ✅ |
| PUT | ✅ |
| PATCH | ✅ |
| DELETE | ✅ |

---

# 5.3 API Testing Flow

Seluruh API Testing mengikuti alur.

```text
HTTP Request

↓

Middleware

↓

Controller

↓

Service

↓

Repository

↓

Database

↓

HTTP Response
```

---

# 5.4 What Should Be Tested

Minimal setiap endpoint menguji.

✅ Success Response

✅ Validation Error

✅ Authentication

✅ Authorization

✅ Business Rule

✅ Database Update

✅ Error Response

---

# 5.5 Request Testing

Pastikan request sesuai spesifikasi.

Uji.

- Request Body
- Query Parameter
- Route Parameter
- Header
- Content Type

---

# 5.6 Response Testing

Pastikan response sesuai standar.

Periksa.

- HTTP Status
- Response Body
- Response Format
- Data Type
- Response Time

Contoh.

```json
{
  "success": true,
  "message": "Customer created successfully.",
  "data": {}
}
```

---

# 5.7 Authentication Testing

Minimal menguji.

✅ Valid JWT

✅ Invalid JWT

✅ Expired JWT

✅ Missing JWT

Endpoint yang membutuhkan autentikasi harus menolak request tanpa token yang valid.

---

# 5.8 Authorization Testing

Pastikan Role & Permission bekerja.

Contoh.

- Admin
- Manager
- Stylist
- Cashier
- Warehouse

User tanpa permission harus menerima HTTP 403.

---

# 5.9 Validation Testing

Uji seluruh validasi.

Contoh.

- Required Field
- Invalid Email
- Invalid UUID
- Invalid Enum
- Invalid Date
- Maximum Length
- Minimum Length

---

# 5.10 Business Rule Testing

Pastikan aturan bisnis berjalan.

Contoh.

- Customer tidak boleh duplikat.

- Deposit tidak boleh digunakan dua kali.

- Stock tidak boleh minus.

- Appointment tidak boleh bentrok.

---

# 5.11 CRUD Testing

Seluruh modul minimal memiliki pengujian.

```text
Create

↓

Read

↓

Update

↓

Delete
```

Pastikan seluruh operasi berhasil sesuai aturan bisnis.

---

# 5.12 Pagination & Filtering

Endpoint list wajib diuji.

- page
- limit
- search
- filter
- sort
- order

Pastikan hasil sesuai parameter yang diberikan.

---

# 5.13 Error Testing

Pastikan API mengembalikan error yang benar.

Minimal.

| Error | HTTP |
|--------|------|
| Validation | 400 |
| Unauthorized | 401 |
| Forbidden | 403 |
| Not Found | 404 |
| Conflict | 409 |
| Business Rule | 422 |
| Internal Error | 500 |

---

# 5.14 Performance Testing

Pastikan endpoint.

- Stabil.
- Konsisten.
- Memenuhi target response time.

Target awal.

- GET < 300 ms
- POST < 500 ms

Target dapat berubah sesuai kebutuhan sistem.

---

# 5.15 Best Practices

✅ Uji endpoint secara independen.

✅ Gunakan Test Database.

✅ Gunakan Factory.

✅ Uji Success dan Failure.

✅ Verifikasi perubahan database.

---

# 5.16 Common Mistakes

❌ Hanya menguji Success Case.

❌ Tidak menguji Authorization.

❌ Tidak menguji Validation.

❌ Tidak memverifikasi perubahan data.

❌ Bergantung pada data Production.

---

# 5.17 Checklist

Sebelum Pull Request.

☐ Semua endpoint diuji.

☐ Success Case diuji.

☐ Error Case diuji.

☐ Authentication diuji.

☐ Authorization diuji.

☐ CRUD lengkap.

☐ Pagination diuji.

☐ Response sesuai API Standards.

---

# 5.18 Quick Reference

| Area | Required |
|------|----------|
| GET | ✅ |
| POST | ✅ |
| PUT | ✅ |
| PATCH | ✅ |
| DELETE | ✅ |
| Authentication | ✅ |
| Authorization | ✅ |
| Validation | ✅ |
| Business Rule | ✅ |
| Pagination | ✅ |

---

# 5.19 Chapter Summary

API Testing memastikan seluruh endpoint NIAHAIR ERP memenuhi kontrak API yang telah ditetapkan.

Prinsip utama.

✓ Uji seluruh HTTP Method.

✓ Uji Authentication dan Authorization.

✓ Uji Validation dan Business Rule.

✓ Verifikasi perubahan data.

✓ Pastikan format Response konsisten.

✓ Uji Success maupun Error Case.

Dengan standar ini, seluruh REST API tetap stabil, konsisten, dan aman digunakan oleh Frontend, Mobile App, AI Assistant, maupun sistem integrasi seperti Accurate.

# CHAPTER 6 — FRONTEND TESTING

---

# 6.1 Goals

Frontend Testing bertujuan memastikan seluruh antarmuka pengguna bekerja dengan benar, konsisten, dan memberikan pengalaman pengguna yang baik.

Testing mencakup.

- Component
- Page
- Hook
- Form
- Navigation
- User Interaction
- State Management

---

# 6.2 Testing Scope

Seluruh fitur Frontend wajib diuji.

| Component | Required |
|-----------|----------|
| Component | ✅ |
| Page | ✅ |
| Hook | ✅ |
| Form | ✅ |
| Navigation | ✅ |
| State | ✅ |

---

# 6.3 Frontend Testing Flow

Seluruh Frontend Testing mengikuti alur.

```text
Component

↓

Hook

↓

Service (Mock API)

↓

Render

↓

User Interaction

↓

Assertion
```

---

# 6.4 What Should Be Tested

Minimal menguji.

✅ Component Rendering

✅ User Interaction

✅ Form Validation

✅ State Update

✅ Navigation

✅ Error State

✅ Loading State

✅ Empty State

---

# 6.5 Component Testing

Setiap reusable component wajib diuji.

Contoh.

- Button
- Input
- Table
- Modal
- Dialog
- Badge
- Card

Pastikan component dirender dengan benar.

---

# 6.6 Hook Testing

Custom Hook wajib diuji.

Contoh.

```text
useCustomer()

useAppointment()

useInventory()

usePayment()
```

Pastikan.

- State berubah sesuai.
- Loading bekerja.
- Error bekerja.

---

# 6.7 Form Testing

Seluruh Form harus diuji.

Minimal.

- Required Field
- Invalid Input
- Submit Success
- Submit Error
- Disabled Button saat Loading

---

# 6.8 User Interaction

Uji interaksi pengguna.

Contoh.

- Click Button
- Input Text
- Select Option
- Upload File
- Open Modal
- Close Modal

Pastikan UI berubah sesuai aksi pengguna.

---

# 6.9 State Management

Pastikan perubahan state berjalan dengan benar.

Contoh.

- Local State
- Global State
- Server State

State tidak boleh berubah secara tidak terduga.

---

# 6.10 Navigation Testing

Uji navigasi.

Minimal.

- Route benar.
- Redirect benar.
- Protected Route.
- 404 Page.

---

# 6.11 API Mocking

Frontend Test menggunakan Mock API.

Jangan memanggil Backend secara langsung.

Mock hanya digunakan untuk komunikasi API.

Business Logic tetap diuji sesuai perilaku yang diharapkan.

---

# 6.12 UI States

Seluruh halaman wajib diuji pada kondisi.

✅ Loading

✅ Success

✅ Empty

✅ Error

Tidak boleh hanya menguji Success State.

---

# 6.13 Accessibility Testing

Minimal menguji.

- Keyboard Navigation
- Label
- Focus
- Semantic HTML

Komponen harus tetap dapat digunakan tanpa mouse.

---

# 6.14 Responsive Testing

Pastikan halaman bekerja pada.

- Desktop
- Tablet
- Mobile

Layout tidak boleh rusak pada ukuran layar yang didukung.

---

# 6.15 Best Practices

✅ Uji perilaku pengguna.

✅ Gunakan Mock API.

✅ Gunakan Testing Library.

✅ Hindari menguji implementasi internal.

✅ Fokus pada hasil yang dilihat pengguna.

---

# 6.16 Common Mistakes

❌ Menguji implementasi internal.

❌ Bergantung pada Backend.

❌ Tidak menguji Error State.

❌ Tidak menguji Loading State.

❌ Menggunakan data Production.

---

# 6.17 Checklist

Sebelum Pull Request.

☐ Component diuji.

☐ Hook diuji.

☐ Form diuji.

☐ Loading diuji.

☐ Error diuji.

☐ Empty State diuji.

☐ Responsive diperiksa.

☐ Accessibility diperiksa.

---

# 6.18 Quick Reference

| Area | Required |
|------|----------|
| Component | ✅ |
| Hook | ✅ |
| Form | ✅ |
| Navigation | ✅ |
| Loading State | ✅ |
| Error State | ✅ |
| Empty State | ✅ |
| Responsive | ✅ |
| Accessibility | ✅ |

---

# 6.19 Chapter Summary

Frontend Testing memastikan seluruh antarmuka NIAHAIR ERP bekerja sesuai harapan pengguna.

Prinsip utama.

✓ Uji Component dan Hook.

✓ Gunakan Mock API.

✓ Uji User Interaction.

✓ Uji Loading, Error, dan Empty State.

✓ Pastikan Responsive dan Accessibility.

✓ Fokus pada perilaku pengguna, bukan implementasi internal.

Dengan standar ini, Frontend NIAHAIR ERP tetap stabil, mudah dipelihara, dan memberikan pengalaman pengguna yang konsisten di seluruh modul.

# CHAPTER 7 — END-TO-END (E2E) TESTING

---

# 7.1 Goals

End-to-End (E2E) Testing bertujuan memastikan seluruh alur bisnis berjalan dengan benar dari sudut pandang pengguna.

E2E Testing memverifikasi bahwa seluruh komponen sistem bekerja bersama sebagai satu kesatuan.

---

# 7.2 Testing Scope

E2E Testing digunakan untuk menguji.

| Area | Required |
|------|----------|
| Business Flow | ✅ |
| Multi Module Process | ✅ |
| User Journey | ✅ |
| Authentication Flow | ✅ |
| Integration Flow | ✅ |

---

# 7.3 E2E Testing Flow

Seluruh E2E Test mengikuti alur berikut.

```text
User Action

↓

Frontend

↓

Backend API

↓

Business Logic

↓

Database

↓

Response

↓

UI Verification
```

Pengujian dilakukan seperti pengguna menggunakan aplikasi secara nyata.

---

# 7.4 What Should Be Tested

Minimal menguji.

✅ Login

✅ Customer Management

✅ Appointment

✅ Check In

✅ Treatment

✅ Invoice

✅ Payment

✅ Inventory Update

✅ Logout

---

# 7.5 Business Flow Testing

Setiap proses bisnis utama wajib memiliki E2E Test.

Contoh.

```text
Customer

↓

Appointment

↓

Check In

↓

Treatment

↓

Invoice

↓

Payment
```

Pastikan seluruh proses selesai tanpa error.

---

# 7.6 User Journey

Uji perjalanan pengguna sesuai Role.

Contoh.

### Customer Service

```text
Login

↓

Create Customer

↓

Create Appointment

↓

Logout
```

---

### Stylist

```text
Login

↓

Check In

↓

Treatment

↓

Complete Treatment

↓

Logout
```

---

### Cashier

```text
Login

↓

Create Invoice

↓

Receive Payment

↓

Print Invoice

↓

Logout
```

---

# 7.7 Cross Module Testing

Pastikan komunikasi antar module berjalan.

Contoh.

```text
Appointment

↓

Treatment

↓

Invoice

↓

Payment

↓

Inventory
```

---

# 7.8 Authentication Testing

Uji.

- Login berhasil.
- Login gagal.
- Session Expired.
- Logout.
- Protected Route.

---

# 7.9 Permission Testing

Pastikan setiap Role hanya dapat mengakses fitur sesuai hak akses.

Contoh.

- Admin
- Manager
- Cashier
- Stylist
- Warehouse

---

# 7.10 UI Verification

Pastikan.

✅ Data tampil benar.

✅ Tombol aktif.

✅ Dialog muncul.

✅ Toast muncul.

✅ Redirect benar.

---

# 7.11 Database Verification

Setelah Business Flow selesai.

Pastikan.

- Data tersimpan.
- Stock berubah.
- Status berubah.
- Audit Log dibuat.

---

# 7.12 Test Environment

Gunakan.

- Testing Database
- Testing API
- Testing Frontend

Jangan menjalankan E2E Test pada Production.

---

# 7.13 Best Practices

✅ Fokus pada alur bisnis utama.

✅ Gunakan data khusus testing.

✅ Reset data setelah test.

✅ Verifikasi UI dan Database.

✅ Jalankan E2E sebelum Release.

---

# 7.14 Common Mistakes

❌ Menguji setiap detail UI.

❌ Mengulang seluruh Unit Test.

❌ Bergantung pada data Production.

❌ Menjalankan terlalu banyak skenario yang sama.

---

# 7.15 Checklist

Sebelum Release.

☐ Login berhasil.

☐ Customer Flow berhasil.

☐ Appointment berhasil.

☐ Treatment berhasil.

☐ Payment berhasil.

☐ Inventory diperbarui.

☐ Logout berhasil.

☐ Seluruh E2E Test lulus.

---

# 7.16 Quick Reference

| Business Flow | Required |
|--------------|----------|
| Login | ✅ |
| Customer | ✅ |
| Appointment | ✅ |
| Treatment | ✅ |
| Invoice | ✅ |
| Payment | ✅ |
| Inventory Update | ✅ |
| Logout | ✅ |

---

# 7.17 Chapter Summary

End-to-End Testing memastikan seluruh proses bisnis NIAHAIR ERP berjalan dari awal hingga akhir sesuai perilaku pengguna.

Prinsip utama.

✓ Uji alur bisnis lengkap.

✓ Uji komunikasi antar modul.

✓ Uji berdasarkan peran pengguna.

✓ Verifikasi UI dan Database.

✓ Jalankan sebelum Release.

Dengan standar ini, seluruh proses bisnis dapat divalidasi secara menyeluruh sehingga risiko kegagalan pada lingkungan Production dapat diminimalkan.

# CHAPTER 8 — DATABASE & MIGRATION TESTING

---

# 8.1 Goals

Database & Migration Testing bertujuan memastikan struktur database, migration, dan integritas data tetap konsisten setelah setiap perubahan.

Testing dilakukan sebelum deployment ke lingkungan Production.

---

# 8.2 Testing Scope

Seluruh perubahan database wajib diuji.

| Area | Required |
|------|----------|
| Migration | ✅ |
| Rollback | ✅ |
| Constraint | ✅ |
| Index | ✅ |
| Relation | ✅ |
| Seed Data | ✅ |

---

# 8.3 Database Testing Flow

Seluruh pengujian mengikuti alur.

```text
Migration

↓

Seed Data

↓

Run Test

↓

Verify Data

↓

Rollback (Jika diperlukan)
```

---

# 8.4 Migration Testing

Setiap Migration wajib diuji.

Pastikan.

✅ Migration berhasil dijalankan.

✅ Tidak ada data yang hilang.

✅ Tidak ada konflik schema.

✅ Schema sesuai Prisma.

Migration tidak boleh dijalankan langsung di Production tanpa pengujian.

---

# 8.5 Rollback Testing

Apabila migration mendukung rollback.

Pastikan.

- Rollback berhasil.
- Schema kembali ke kondisi sebelumnya.
- Data tetap konsisten.

Rollback harus diuji pada environment testing.

---

# 8.6 Constraint Testing

Pastikan seluruh constraint bekerja.

Minimal.

- PRIMARY KEY
- FOREIGN KEY
- UNIQUE
- NOT NULL
- CHECK (jika digunakan)

Database harus menolak data yang melanggar constraint.

---

# 8.7 Relation Testing

Uji seluruh relasi antar tabel.

Contoh.

- Customer → Appointment
- Invoice → Payment
- Warehouse → Inventory
- Production → Material Usage

Pastikan Foreign Key berjalan sesuai desain.

---

# 8.8 Seed Testing

Pastikan seluruh seed berhasil dibuat.

Minimal.

- Role
- Permission
- Branch
- Warehouse
- Membership
- Payment Method

Seed harus dapat dijalankan berulang tanpa menghasilkan data duplikat.

---

# 8.9 Data Integrity Testing

Pastikan integritas data tetap terjaga.

Contoh.

- Tidak ada orphan record.
- Tidak ada duplicate key.
- Tidak ada foreign key yang rusak.

---

# 8.10 Query Verification

Pastikan query menghasilkan data yang benar.

Uji.

- CRUD
- Filtering
- Sorting
- Pagination
- Aggregate

---

# 8.11 Performance Verification

Pastikan perubahan schema tidak menurunkan performa.

Periksa.

- Index digunakan.
- Query tetap efisien.
- Tidak terjadi Full Table Scan yang tidak diperlukan.

---

# 8.12 Backup Verification

Sebelum Migration besar.

Pastikan.

✅ Backup berhasil.

✅ Restore berhasil.

Backup harus dapat dipulihkan apabila migration gagal.

---

# 8.13 Best Practices

✅ Gunakan database testing.

✅ Jalankan migration otomatis.

✅ Verifikasi schema setelah migration.

✅ Gunakan transaction bila memungkinkan.

✅ Backup sebelum migration besar.

---

# 8.14 Common Mistakes

❌ Mengubah schema langsung di Production.

❌ Tidak menguji rollback.

❌ Tidak memperbarui seed.

❌ Menghapus data tanpa backup.

❌ Mengabaikan perubahan index.

---

# 8.15 Checklist

Sebelum Deployment.

☐ Migration berhasil.

☐ Rollback diuji.

☐ Constraint diuji.

☐ Relation diuji.

☐ Seed berhasil.

☐ Backup tersedia.

☐ Query diverifikasi.

☐ Tidak ada data yang hilang.

---

# 8.16 Quick Reference

| Area | Required |
|------|----------|
| Migration | ✅ |
| Rollback | ✅ |
| Constraint | ✅ |
| Relation | ✅ |
| Seed | ✅ |
| Backup | ✅ |
| Restore | ✅ |
| Query Verification | ✅ |

---

# 8.17 Chapter Summary

Database & Migration Testing memastikan struktur database tetap aman dan konsisten setelah setiap perubahan.

Prinsip utama.

✓ Uji seluruh Migration.

✓ Verifikasi Rollback.

✓ Pastikan Constraint dan Relation berjalan.

✓ Gunakan Backup sebelum perubahan besar.

✓ Verifikasi Query dan Integritas Data.

Dengan standar ini, perubahan schema dapat dilakukan dengan aman tanpa mengganggu data maupun operasional sistem.

# CHAPTER 9 — EXTERNAL INTEGRATION TESTING

---

# 9.1 Goals

External Integration Testing bertujuan memastikan seluruh layanan pihak ketiga (Third-Party Services) dapat berkomunikasi dengan NIAHAIR ERP secara stabil, aman, dan sesuai spesifikasi.

Testing dilakukan untuk memverifikasi komunikasi, autentikasi, penanganan error, dan mekanisme retry.

---

# 9.2 Testing Scope

Seluruh layanan eksternal wajib diuji.

| Integration | Required |
|------------|----------|
| Accurate Online | ✅ |
| Cloudinary | ✅ |
| Email SMTP | ✅ |
| WhatsApp API | ✅ |
| Telegram Bot | ✅ |
| AI Service | ✅ (Future) |
| Storage Service | ✅ |

---

# 9.3 Integration Testing Flow

Seluruh pengujian mengikuti alur.

```text
Application

↓

Integration Service

↓

External API

↓

Response

↓

Validation

↓

Logging
```

---

# 9.4 Connection Testing

Pastikan koneksi ke layanan eksternal berhasil.

Minimal.

✅ Authentication.

✅ Authorization.

✅ Connectivity.

✅ Timeout.

---

# 9.5 Authentication Testing

Uji autentikasi layanan eksternal.

Contoh.

- API Key
- OAuth
- Access Token
- Refresh Token

Pastikan kredensial yang tidak valid menghasilkan error yang benar.

---

# 9.6 Request Testing

Pastikan request sesuai dokumentasi provider.

Periksa.

- HTTP Method
- Endpoint
- Header
- Payload
- Content Type

---

# 9.7 Response Testing

Pastikan response diproses dengan benar.

Verifikasi.

- HTTP Status
- Response Schema
- Data Mapping
- Error Mapping

---

# 9.8 Retry Testing

Layanan yang mendukung retry wajib diuji.

Contoh.

- Accurate Sync
- Email
- WhatsApp
- Telegram

Pastikan retry berhenti setelah mencapai batas maksimum.

---

# 9.9 Timeout Testing

Pastikan aplikasi menangani timeout dengan benar.

Verifikasi.

- Request Timeout
- Connection Timeout
- Retry
- Error Response

Aplikasi tidak boleh menunggu tanpa batas.

---

# 9.10 Failure Testing

Simulasikan kegagalan layanan.

Contoh.

- API tidak tersedia.
- Token kadaluarsa.
- Internet terputus.
- HTTP 500.
- HTTP 429.

Pastikan aplikasi tetap stabil.

---

# 9.11 Data Synchronization Testing

Untuk integrasi sinkronisasi.

Pastikan.

- Data berhasil dikirim.
- Data berhasil diterima.
- Tidak ada duplikasi.
- Tidak ada data yang hilang.

---

# 9.12 Queue Testing

Integrasi asynchronous wajib diuji.

Contoh.

```text
Application

↓

Queue

↓

Worker

↓

External API

↓

Success / Retry / Failed
```

Pastikan Queue berjalan sesuai desain.

---

# 9.13 Logging Verification

Seluruh komunikasi eksternal wajib dicatat.

Minimal.

- Provider
- Endpoint
- Request ID
- Status
- Response Time
- Retry Count

Jangan mencatat API Key atau Secret.

---

# 9.14 Best Practices

✅ Gunakan Sandbox Environment bila tersedia.

✅ Mock layanan eksternal pada Unit Test.

✅ Gunakan layanan nyata pada Integration Test.

✅ Verifikasi Retry.

✅ Verifikasi Logging.

---

# 9.15 Common Mistakes

❌ Menguji menggunakan Production API.

❌ Tidak menguji Timeout.

❌ Tidak menguji Retry.

❌ Tidak memverifikasi Response Mapping.

❌ Menyimpan Secret di source code.

---

# 9.16 Checklist

Sebelum Release.

☐ Authentication diuji.

☐ Request diverifikasi.

☐ Response diverifikasi.

☐ Retry diuji.

☐ Timeout diuji.

☐ Logging diverifikasi.

☐ Queue diuji.

☐ Sinkronisasi data berhasil.

---

# 9.17 Quick Reference

| Area | Required |
|------|----------|
| Authentication | ✅ |
| Request | ✅ |
| Response | ✅ |
| Retry | ✅ |
| Timeout | ✅ |
| Queue | ✅ |
| Logging | ✅ |
| Data Sync | ✅ |

---

# 9.18 Chapter Summary

External Integration Testing memastikan seluruh layanan pihak ketiga dapat berintegrasi dengan NIAHAIR ERP secara stabil dan aman.

Prinsip utama.

✓ Uji Authentication.

✓ Uji Request dan Response.

✓ Uji Retry dan Timeout.

✓ Uji Sinkronisasi Data.

✓ Verifikasi Logging.

✓ Pastikan aplikasi tetap stabil ketika layanan eksternal mengalami gangguan.

Dengan standar ini, integrasi dengan layanan seperti Accurate Online, Cloudinary, WhatsApp, Email, dan Telegram dapat berjalan secara konsisten tanpa mengganggu operasional bisnis.

# CHAPTER 10 — PERFORMANCE TESTING

---

# 10.1 Goals

Performance Testing bertujuan memastikan NIAHAIR ERP tetap cepat, stabil, dan mampu menangani beban kerja sesuai kebutuhan bisnis.

Testing dilakukan untuk mengukur performa sistem sebelum digunakan pada lingkungan Production.

---

# 10.2 Testing Scope

Performance Testing mencakup.

| Area | Required |
|------|----------|
| REST API | ✅ |
| Database Query | ✅ |
| Frontend Rendering | ✅ |
| File Upload | ✅ |
| Queue Worker | ✅ |
| External Integration | ✅ |

---

# 10.3 Performance Testing Types

Jenis pengujian yang digunakan.

| Type | Purpose |
|------|---------|
| Load Test | Beban normal |
| Stress Test | Melebihi kapasitas |
| Spike Test | Lonjakan trafik mendadak |
| Endurance Test | Beban dalam waktu lama |
| Scalability Test | Kemampuan bertambah sesuai beban |

---

# 10.4 API Performance

Minimal uji.

- Response Time
- Throughput
- Concurrent Requests
- Error Rate

Target awal.

| Endpoint | Target |
|----------|--------|
| GET | < 300 ms |
| POST | < 500 ms |
| PUT/PATCH | < 500 ms |
| DELETE | < 300 ms |

Target dapat disesuaikan berdasarkan kompleksitas endpoint.

---

# 10.5 Database Performance

Pastikan.

✅ Query menggunakan Index.

✅ Tidak ada N+1 Query.

✅ Pagination digunakan.

✅ Query berat dioptimalkan.

Pantau waktu eksekusi query yang sering digunakan.

---

# 10.6 Frontend Performance

Uji.

- Initial Load
- Page Navigation
- Table Rendering
- Form Submission
- Lazy Loading

Pastikan pengalaman pengguna tetap responsif.

---

# 10.7 Concurrent User Testing

Simulasikan banyak pengguna.

Contoh.

- 10 User
- 50 User
- 100 User
- 500 User

Verifikasi bahwa sistem tetap stabil sesuai kapasitas yang direncanakan.

---

# 10.8 Queue Performance

Uji Queue Worker.

Pastikan.

- Job diproses tepat waktu.
- Tidak ada job hilang.
- Retry berjalan.
- Worker tetap stabil.

---

# 10.9 File Upload Performance

Uji.

- Upload kecil.
- Upload besar.
- Banyak file sekaligus.

Pastikan proses upload tetap stabil dan sesuai batas yang ditentukan.

---

# 10.10 External Integration Performance

Uji waktu respons layanan eksternal.

Contoh.

- Accurate
- Cloudinary
- WhatsApp
- Email

Pastikan timeout dan retry bekerja sesuai konfigurasi.

---

# 10.11 Resource Monitoring

Selama pengujian, pantau.

- CPU
- Memory
- Disk I/O
- Network
- Database Connection

Identifikasi bottleneck sebelum deployment.

---

# 10.12 Success Criteria

Performance Test dianggap berhasil apabila.

- Response Time memenuhi target.
- Error Rate berada dalam batas yang diterima.
- Tidak terjadi crash.
- Resource Usage tetap stabil.
- Tidak ada memory leak yang terdeteksi.

---

# 10.13 Best Practices

✅ Gunakan data yang realistis.

✅ Gunakan environment yang mendekati Production.

✅ Jalankan test berulang.

✅ Catat seluruh hasil pengujian.

✅ Bandingkan hasil antar versi aplikasi.

---

# 10.14 Common Mistakes

❌ Menguji dengan data terlalu sedikit.

❌ Tidak memantau penggunaan resource.

❌ Menguji di lingkungan Production.

❌ Mengabaikan bottleneck database.

❌ Tidak mendokumentasikan hasil.

---

# 10.15 Checklist

Sebelum Release.

☐ API memenuhi target response time.

☐ Query database telah dioptimalkan.

☐ Frontend tetap responsif.

☐ Queue berjalan stabil.

☐ Resource Usage normal.

☐ Tidak ditemukan memory leak.

☐ Hasil pengujian didokumentasikan.

---

# 10.16 Quick Reference

| Area | Required |
|------|----------|
| Load Test | ✅ |
| Stress Test | ✅ |
| Spike Test | ✅ |
| Endurance Test | ✅ |
| API Response | ✅ |
| Database Query | ✅ |
| Queue | ✅ |
| Resource Monitoring | ✅ |

---

# 10.17 Chapter Summary

Performance Testing memastikan NIAHAIR ERP mampu menangani beban operasional dengan stabil dan efisien.

Prinsip utama.

✓ Uji performa API.

✓ Uji performa Database.

✓ Uji beban pengguna.

✓ Pantau penggunaan resource.

✓ Dokumentasikan hasil pengujian.

✓ Optimalkan bottleneck sebelum Release.

Dengan standar ini, sistem dapat mempertahankan performa yang baik seiring bertambahnya jumlah pengguna, transaksi, dan volume data.

# CHAPTER 11 — SECURITY TESTING

---

# 11.1 Goals

Security Testing bertujuan memastikan NIAHAIR ERP terlindungi dari ancaman keamanan yang umum dan menjaga kerahasiaan, integritas, serta ketersediaan data.

Testing dilakukan secara berkala sebelum Release dan setelah perubahan yang memengaruhi keamanan.

---

# 11.2 Testing Scope

Seluruh area berikut wajib diuji.

| Area | Required |
|------|----------|
| Authentication | ✅ |
| Authorization | ✅ |
| Input Validation | ✅ |
| File Upload | ✅ |
| Session Management | ✅ |
| API Security | ✅ |
| Database Security | ✅ |
| Secret Management | ✅ |

---

# 11.3 Security Principles

Seluruh Security Testing mengikuti prinsip.

✅ Least Privilege

✅ Defense in Depth

✅ Zero Trust

✅ Secure by Default

✅ Fail Securely

---

# 11.4 Authentication Testing

Minimal menguji.

- Login berhasil
- Password salah
- User tidak aktif
- Token Expired
- Invalid Token
- Logout
- Refresh Token

Pastikan hanya pengguna yang sah dapat mengakses sistem.

---

# 11.5 Authorization Testing

Pastikan setiap Role hanya dapat mengakses fitur sesuai hak akses.

Contoh.

- Owner
- Manager
- Admin
- Cashier
- Stylist
- Warehouse

User tidak boleh mengakses endpoint di luar hak aksesnya.

---

# 11.6 Input Validation Testing

Uji seluruh input terhadap serangan umum.

Minimal.

- SQL Injection
- XSS
- Command Injection
- HTML Injection
- Invalid JSON
- Oversized Payload

Pastikan seluruh input divalidasi dan disanitasi.

---

# 11.7 API Security Testing

Seluruh endpoint diuji.

Minimal.

- Authentication
- Authorization
- Rate Limit
- CORS
- HTTP Method
- Invalid Request
- Error Response

API tidak boleh membocorkan informasi internal.

---

# 11.8 File Upload Testing

Pastikan upload file aman.

Minimal.

- MIME Type
- File Size
- File Extension
- Virus Scan (jika diterapkan)
- Duplicate File

File berbahaya harus ditolak.

---

# 11.9 Session Testing

Uji.

- Session Expired
- Logout
- Token Revocation
- Concurrent Login
- Idle Timeout

Session harus dikelola dengan aman.

---

# 11.10 Secret Management

Pastikan.

✅ Secret berada di Environment Variable.

✅ Tidak ada Secret di Repository.

✅ Tidak ada API Key di Source Code.

Lakukan pemeriksaan sebelum Release.

---

# 11.11 Database Security

Verifikasi.

- SQL Injection Protection
- Database Permission
- Encrypted Connection
- Backup Security

Database tidak boleh dapat diakses secara langsung tanpa otorisasi.

---

# 11.12 Dependency Security

Periksa dependency yang digunakan.

Pastikan.

- Tidak ada package dengan kerentanan kritis.
- Dependency diperbarui secara berkala.
- Lisensi sesuai kebijakan proyek.

---

# 11.13 Logging Verification

Pastikan log.

✅ Tidak menyimpan Password.

✅ Tidak menyimpan Token.

✅ Tidak menyimpan Secret.

✅ Tidak menyimpan Data Sensitif yang tidak diperlukan.

---

# 11.14 Security Regression

Setiap bug keamanan yang diperbaiki wajib memiliki test agar tidak muncul kembali.

Contoh.

- SQL Injection
- Broken Access Control
- Token Bypass
- XSS

---

# 11.15 Best Practices

✅ Gunakan HTTPS.

✅ Gunakan JWT yang aman.

✅ Validasi seluruh input.

✅ Gunakan Rate Limiting.

✅ Gunakan Permission Check.

✅ Audit seluruh endpoint sensitif.

---

# 11.16 Common Mistakes

❌ Hardcoded Secret.

❌ Tidak memvalidasi input.

❌ Tidak memeriksa Role.

❌ Menampilkan Stack Trace.

❌ Mengirim data sensitif ke Client.

❌ Menggunakan dependency yang rentan.

---

# 11.17 Checklist

Sebelum Release.

☐ Authentication diuji.

☐ Authorization diuji.

☐ SQL Injection diuji.

☐ XSS diuji.

☐ Upload File diuji.

☐ Secret diperiksa.

☐ Dependency Scan berhasil.

☐ Tidak ada data sensitif di log.

---

# 11.18 Quick Reference

| Area | Required |
|------|----------|
| Authentication | ✅ |
| Authorization | ✅ |
| Input Validation | ✅ |
| SQL Injection | ✅ |
| XSS | ✅ |
| File Upload | ✅ |
| Session | ✅ |
| Dependency Scan | ✅ |

---

# 11.19 Chapter Summary

Security Testing memastikan NIAHAIR ERP terlindungi dari ancaman keamanan yang umum dan memenuhi standar pengembangan aplikasi yang aman.

Prinsip utama.

✓ Uji Authentication dan Authorization.

✓ Validasi seluruh input.

✓ Lindungi API dan Database.

✓ Kelola Secret dengan aman.

✓ Audit dependency secara berkala.

✓ Pastikan bug keamanan tidak muncul kembali melalui Security Regression Test.

Dengan standar ini, NIAHAIR ERP memiliki lapisan pengamanan yang kuat untuk melindungi data pelanggan, transaksi bisnis, dan integrasi dengan layanan eksternal seperti Accurate.

# CHAPTER 12 — REGRESSION TESTING

---

# 12.1 Goals

Regression Testing bertujuan memastikan perubahan pada source code tidak merusak fitur yang sebelumnya telah berjalan dengan benar.

Regression Testing wajib dilakukan sebelum setiap Release.

---

# 12.2 Testing Scope

Regression Testing mencakup seluruh fitur utama.

| Module | Required |
|----------|----------|
| Authentication | ✅ |
| Customer | ✅ |
| Appointment | ✅ |
| Treatment | ✅ |
| Invoice | ✅ |
| Payment | ✅ |
| Inventory | ✅ |
| Production | ✅ |
| Accurate Integration | ✅ |

---

# 12.3 Regression Strategy

Setiap perubahan kode harus dievaluasi dampaknya.

```text
Code Change

↓

Impact Analysis

↓

Regression Test

↓

Verification

↓

Release
```

Semakin besar perubahan, semakin luas Regression Test yang harus dijalankan.

---

# 12.4 Regression Levels

| Level | Description |
|---------|-------------|
| Module Regression | Satu module |
| Feature Regression | Satu fitur |
| Cross Module Regression | Antar module |
| Full Regression | Seluruh sistem |

---

# 12.5 Module Regression

Dilakukan apabila perubahan hanya memengaruhi satu module.

Contoh.

Customer Module.

Uji.

- Create Customer
- Update Customer
- Delete Customer
- Search Customer

---

# 12.6 Cross Module Regression

Dilakukan apabila perubahan memengaruhi lebih dari satu module.

Contoh.

```text
Customer

↓

Appointment

↓

Treatment

↓

Invoice

↓

Payment
```

Pastikan seluruh alur tetap berjalan.

---

# 12.7 Full Regression

Dilakukan sebelum.

- Major Release
- Production Deployment
- Database Migration Besar
- Perubahan Architecture

Seluruh business flow wajib diuji kembali.

---

# 12.8 Business Critical Regression

Prioritaskan fitur dengan risiko tinggi.

Contoh.

- Login
- Payment
- Deposit
- Inventory
- Production
- Accurate Sync
- Commission Calculation

Fitur kritikal wajib diuji pada setiap Release.

---

# 12.9 Bug Regression

Setiap bug yang diperbaiki wajib memiliki Regression Test.

Alur.

```text
Bug Found

↓

Fix

↓

New Test

↓

Regression Suite
```

Bug tidak dianggap selesai tanpa test yang mencegah kemunculannya kembali.

---

# 12.10 Smoke Test

Sebelum menjalankan Full Regression.

Minimal uji.

- Login
- Dashboard
- Customer
- Appointment
- Invoice
- Payment

Smoke Test memastikan sistem layak untuk pengujian lebih lanjut.

---

# 12.11 Regression Frequency

Regression Test dijalankan.

✅ Sebelum Release.

✅ Setelah Refactoring besar.

✅ Setelah perubahan Business Rule.

✅ Setelah Migration Database.

✅ Setelah perubahan Integrasi Eksternal.

---

# 12.12 Automation

Regression Test diprioritaskan untuk otomatisasi.

Minimal.

- Unit Test
- Integration Test
- API Test
- E2E Test

Manual Testing hanya dilakukan untuk skenario yang sulit diotomatisasi.

---

# 12.13 Best Practices

✅ Jalankan Regression berdasarkan risiko.

✅ Otomatiskan sebanyak mungkin.

✅ Perbarui Regression Suite setelah fitur baru.

✅ Dokumentasikan hasil pengujian.

---

# 12.14 Common Mistakes

❌ Hanya menguji fitur yang diubah.

❌ Tidak menguji business flow terkait.

❌ Tidak menambahkan test setelah bug diperbaiki.

❌ Menjalankan Full Regression untuk perubahan kecil.

❌ Menggunakan data Production.

---

# 12.15 Checklist

Sebelum Release.

☐ Smoke Test berhasil.

☐ Regression Module berhasil.

☐ Regression Cross Module berhasil.

☐ Bug Regression berhasil.

☐ Business Critical Flow berhasil.

☐ Tidak ada Regression Failure.

---

# 12.16 Quick Reference

| Area | Required |
|------|----------|
| Module Regression | ✅ |
| Cross Module | ✅ |
| Full Regression | ✅ |
| Smoke Test | ✅ |
| Bug Regression | ✅ |
| Critical Flow | ✅ |

---

# 12.17 Regression Matrix

| Change Type | Regression Required |
|-------------|---------------------|
| UI Change | Module |
| API Change | Module + API |
| Business Rule | Cross Module |
| Database Migration | Full |
| Authentication | Full |
| Accurate Integration | Full |
| Payment | Full |
| Inventory | Full |

---

# 12.18 Chapter Summary

Regression Testing memastikan perubahan pada NIAHAIR ERP tidak menyebabkan kerusakan pada fitur yang telah ada.

Prinsip utama.

✓ Lakukan Impact Analysis sebelum testing.

✓ Prioritaskan Business Critical Flow.

✓ Tambahkan test untuk setiap bug yang diperbaiki.

✓ Otomatiskan Regression Test sebanyak mungkin.

✓ Jalankan Full Regression sebelum Major Release.

Dengan standar ini, setiap perubahan dapat dirilis dengan tingkat kepercayaan yang tinggi, sekaligus meminimalkan risiko gangguan pada operasional bisnis.

# CHAPTER 13 — TEST AUTOMATION & CONTINUOUS INTEGRATION

---

# 13.1 Goals

Test Automation bertujuan memastikan seluruh perubahan source code diuji secara otomatis dan konsisten.

Continuous Integration (CI) digunakan untuk memverifikasi kualitas aplikasi sebelum perubahan digabungkan ke branch utama.

---

# 13.2 Automation Principles

Seluruh proses otomatis mengikuti prinsip.

✅ Automated

✅ Repeatable

✅ Fast

✅ Reliable

✅ Consistent

Testing manual hanya dilakukan apabila automation tidak memungkinkan.

---

# 13.3 CI Pipeline

Setiap Pull Request mengikuti alur berikut.

```text
Push Code

↓

Install Dependencies

↓

Lint

↓

Build

↓

Unit Test

↓

Integration Test

↓

API Test

↓

Security Scan

↓

Result

↓

Pull Request Review
```

Apabila salah satu tahap gagal, pipeline dianggap gagal.

---

# 13.4 Automated Test Scope

CI minimal menjalankan.

| Test | Required |
|------|----------|
| Lint | ✅ |
| Build | ✅ |
| Unit Test | ✅ |
| Integration Test | ✅ |
| API Test | ✅ |
| Security Scan | ✅ |

Regression dan E2E Test dapat dijalankan pada pipeline khusus atau sebelum Release.

---

# 13.5 Pull Request Validation

Setiap Pull Request wajib memenuhi.

✅ Build berhasil.

✅ Seluruh test lulus.

✅ Tidak ada lint error.

✅ Security Scan berhasil.

Pull Request tidak boleh di-merge apabila pipeline gagal.

---

# 13.6 Build Verification

Pastikan.

- Build berhasil.
- Tidak ada TypeScript Error.
- Tidak ada Missing Dependency.
- Tidak ada Warning kritis yang memengaruhi kualitas.

---

# 13.7 Automated Code Quality

Pipeline memverifikasi.

- ESLint
- Formatter
- Type Check
- Dependency Check

Semua hasil harus memenuhi standar proyek.

---

# 13.8 Security Automation

CI wajib menjalankan.

- Dependency Vulnerability Scan.
- Secret Detection.
- License Check (bila diterapkan).

Build gagal apabila ditemukan kerentanan kritis.

---

# 13.9 Test Report

Setiap pipeline menghasilkan laporan.

Minimal.

- Build Status.
- Test Result.
- Coverage.
- Failed Test.
- Execution Time.

Laporan harus mudah diakses oleh developer.

---

# 13.10 Failure Handling

Apabila pipeline gagal.

1. Identifikasi penyebab.
2. Perbaiki source code.
3. Jalankan ulang pipeline.
4. Merge hanya setelah seluruh tahapan berhasil.

Jangan mengabaikan kegagalan pipeline.

---

# 13.11 Release Pipeline

Sebelum Release.

Minimal jalankan.

- Build.
- Unit Test.
- Integration Test.
- API Test.
- Regression Test.
- Security Test.

Release hanya dilakukan apabila seluruh proses berhasil.

---

# 13.12 Best Practices

✅ Jalankan test otomatis pada setiap Pull Request.

✅ Pastikan pipeline selesai dalam waktu yang wajar.

✅ Perbaiki pipeline yang gagal secepat mungkin.

✅ Simpan hasil testing sebagai artefak bila diperlukan.

---

# 13.13 Common Mistakes

❌ Merge ketika pipeline gagal.

❌ Menonaktifkan test sementara.

❌ Mengabaikan lint error.

❌ Tidak memonitor coverage.

❌ Menjalankan seluruh E2E Test pada setiap commit tanpa alasan.

---

# 13.14 Checklist

Sebelum Merge.

☐ Build berhasil.

☐ Lint berhasil.

☐ Unit Test lulus.

☐ Integration Test lulus.

☐ API Test lulus.

☐ Security Scan lulus.

☐ Coverage sesuai target.

☐ Pipeline berhasil.

---

# 13.15 Quick Reference

| Stage | Required |
|-------|----------|
| Install | ✅ |
| Build | ✅ |
| Lint | ✅ |
| Unit Test | ✅ |
| Integration Test | ✅ |
| API Test | ✅ |
| Security Scan | ✅ |
| Test Report | ✅ |

---

# 13.16 Pipeline Flow

```text
Developer

↓

Push

↓

CI Pipeline

├── Lint
├── Build
├── Unit Test
├── Integration Test
├── API Test
├── Security Scan

↓

Pull Request

↓

Code Review

↓

Merge
```

---

# 13.17 Chapter Summary

Test Automation dan Continuous Integration memastikan seluruh perubahan pada NIAHAIR ERP diverifikasi secara otomatis sebelum digabungkan ke branch utama.

Prinsip utama.

✓ Otomatiskan proses pengujian.

✓ Jalankan pipeline pada setiap Pull Request.

✓ Jangan merge apabila pipeline gagal.

✓ Sertakan Build, Testing, dan Security Scan dalam CI.

✓ Gunakan laporan hasil testing sebagai dasar evaluasi kualitas.

Dengan standar ini, kualitas source code dapat dijaga secara konsisten, risiko regresi berkurang, dan proses pengembangan menjadi lebih cepat serta lebih andal.

# CHAPTER 14 — RELEASE READINESS CHECKLIST

---

# 14.1 Goals

Release Readiness Checklist digunakan untuk memastikan NIAHAIR ERP siap dirilis ke lingkungan Production.

Seluruh persyaratan teknis, bisnis, keamanan, dan operasional harus terpenuhi sebelum Release.

---

# 14.2 Release Principles

Seluruh Release mengikuti prinsip.

✅ Stable

✅ Tested

✅ Secure

✅ Documented

✅ Recoverable

Release dilakukan hanya apabila seluruh checklist telah terpenuhi.

---

# 14.3 Development Checklist

Pastikan.

☐ Seluruh fitur selesai.

☐ Tidak ada TODO kritikal.

☐ Tidak ada Hardcode.

☐ Coding Standards dipatuhi.

☐ Dokumentasi diperbarui.

---

# 14.4 Testing Checklist

Pastikan.

☐ Unit Test lulus.

☐ Integration Test lulus.

☐ API Test lulus.

☐ Frontend Test lulus.

☐ E2E Test lulus.

☐ Regression Test lulus.

☐ Performance Test lulus.

☐ Security Test lulus.

---

# 14.5 Code Quality Checklist

Pastikan.

☐ Build berhasil.

☐ Lint berhasil.

☐ Type Check berhasil.

☐ Coverage memenuhi target.

☐ Tidak ada Critical Warning.

---

# 14.6 Database Checklist

Pastikan.

☐ Migration diuji.

☐ Rollback diuji.

☐ Backup tersedia.

☐ Seed diperbarui.

☐ Tidak ada perubahan schema yang belum didokumentasikan.

---

# 14.7 API Checklist

Pastikan.

☐ Endpoint sesuai API Standards.

☐ Swagger/OpenAPI diperbarui.

☐ Response Format konsisten.

☐ Error Response sesuai standar.

---

# 14.8 Security Checklist

Pastikan.

☐ Authentication diuji.

☐ Authorization diuji.

☐ Dependency Scan berhasil.

☐ Tidak ada Secret di Repository.

☐ Tidak ada Vulnerability kritis.

---

# 14.9 Infrastructure Checklist

Pastikan.

☐ Environment Variable lengkap.

☐ Storage tersedia.

☐ Redis berjalan.

☐ Database berjalan.

☐ Queue Worker aktif.

☐ Monitoring aktif.

---

# 14.10 Integration Checklist

Pastikan.

☐ Accurate Online.

☐ Cloudinary.

☐ Email.

☐ WhatsApp.

☐ Telegram.

Seluruh integrasi berhasil diuji.

---

# 14.11 Business Checklist

Pastikan Business Flow utama berjalan.

☐ Login.

☐ Customer.

☐ Appointment.

☐ Treatment.

☐ Invoice.

☐ Payment.

☐ Inventory.

☐ Production.

☐ Reporting.

---

# 14.12 Deployment Checklist

Sebelum Deploy.

☐ Backup Database.

☐ Migration siap.

☐ Rollback Plan tersedia.

☐ Release Note selesai.

☐ Tim mengetahui jadwal Release.

---

# 14.13 Post Release Verification

Setelah Deployment.

Pastikan.

☐ Aplikasi dapat diakses.

☐ Login berhasil.

☐ API berjalan.

☐ Database normal.

☐ Queue berjalan.

☐ Integrasi berhasil.

☐ Monitoring normal.

---

# 14.14 Rollback Criteria

Rollback dilakukan apabila.

- Critical Bug.
- Data Corruption.
- Migration gagal.
- Downtime berkepanjangan.
- Integrasi utama gagal.

Rollback harus mengikuti Deployment Runbook.

---

# 14.15 Release Approval

Release hanya dapat dilakukan apabila.

☐ Seluruh checklist selesai.

☐ Tidak ada Critical Issue.

☐ Product Owner menyetujui.

☐ Technical Lead menyetujui.

☐ CI Pipeline berhasil.

---

# 14.16 Release Readiness Matrix

| Area | Status |
|------|--------|
| Development | ✅ |
| Testing | ✅ |
| Code Quality | ✅ |
| Database | ✅ |
| API | ✅ |
| Security | ✅ |
| Infrastructure | ✅ |
| Integration | ✅ |
| Business Flow | ✅ |
| Deployment | ✅ |

Seluruh area harus berstatus **Ready** sebelum Release.

---

# 14.17 Chapter Summary

Release NIAHAIR ERP hanya dilakukan setelah seluruh aspek teknis dan bisnis telah diverifikasi.

Prinsip utama.

✓ Seluruh testing berhasil.

✓ Infrastruktur siap.

✓ Database aman.

✓ Integrasi berjalan.

✓ Rollback tersedia.

✓ Business Flow tervalidasi.

Dengan standar ini, setiap Release memiliki tingkat kepercayaan yang tinggi, risiko kegagalan Production dapat diminimalkan, dan proses deployment menjadi lebih aman serta terkontrol.

# CHAPTER 15 — TESTING CHEAT SHEET & BEST PRACTICES

---

# 15.1 Purpose

Chapter ini merupakan ringkasan seluruh Testing Guide NIAHAIR ERP.

Gunakan sebagai referensi cepat sebelum membuat test, melakukan Code Review, maupun sebelum Release.

---

# 15.2 Testing Pyramid

Prioritas testing.

```text
            End-to-End
                ▲
         Integration Test
                ▲
           Unit Test
```

Sebagian besar testing berada pada Unit Test.

---

# 15.3 Testing Matrix

| Test Type | Purpose | Required |
|-----------|---------|----------|
| Unit Test | Business Logic | ✅ |
| Integration Test | Antar Layer | ✅ |
| API Test | REST API | ✅ |
| Frontend Test | UI & Component | ✅ |
| End-to-End Test | Business Flow | ✅ |
| Database Test | Migration & Constraint | ✅ |
| Integration Test | Third Party Service | ✅ |
| Performance Test | Performance | ✅ |
| Security Test | Security | ✅ |
| Regression Test | Existing Feature | ✅ |

---

# 15.4 Unit Test Rules

✅ Test satu fungsi.

✅ Gunakan AAA Pattern.

✅ Mock dependency.

❌ Jangan akses Database.

❌ Jangan akses API.

---

# 15.5 Integration Test Rules

✅ Gunakan Test Database.

✅ Uji Repository.

✅ Uji Transaction.

✅ Uji Constraint.

❌ Jangan gunakan Production Database.

---

# 15.6 API Test Rules

✅ Success Response.

✅ Validation.

✅ Authentication.

✅ Authorization.

✅ Business Rule.

✅ Error Response.

---

# 15.7 Frontend Test Rules

✅ Component.

✅ Hook.

✅ Form.

✅ Loading.

✅ Error.

✅ Empty State.

---

# 15.8 E2E Test Rules

Uji hanya Business Flow utama.

Contoh.

```text
Customer

↓

Appointment

↓

Treatment

↓

Invoice

↓

Payment
```

Jangan menguji seluruh detail UI.

---

# 15.9 Database Test Rules

✅ Migration.

✅ Rollback.

✅ Constraint.

✅ Relation.

✅ Seed.

---

# 15.10 External Integration Rules

Pastikan.

✅ Authentication.

✅ Retry.

✅ Timeout.

✅ Data Mapping.

✅ Logging.

---

# 15.11 Performance Rules

Uji.

✅ API.

✅ Database.

✅ Queue.

✅ Upload.

✅ Concurrent User.

---

# 15.12 Security Rules

Pastikan.

✅ SQL Injection.

✅ XSS.

✅ Authentication.

✅ Authorization.

✅ Secret Management.

---

# 15.13 Regression Rules

Regression wajib.

- Setelah Bug Fix.
- Sebelum Release.
- Setelah Migration.
- Setelah Refactoring.
- Setelah perubahan Business Rule.

---

# 15.14 CI Pipeline

Minimal pipeline.

```text
Install

↓

Lint

↓

Build

↓

Unit Test

↓

Integration Test

↓

API Test

↓

Security Scan

↓

Pull Request
```

---

# 15.15 Release Checklist

Sebelum Release.

☐ Build berhasil.

☐ Unit Test lulus.

☐ Integration Test lulus.

☐ API Test lulus.

☐ E2E Test lulus.

☐ Regression Test lulus.

☐ Performance Test lulus.

☐ Security Test lulus.

☐ Backup tersedia.

☐ Rollback siap.

---

# 15.16 Coverage Target

| Area | Target |
|------|--------|
| Service | ≥90% |
| Utility | ≥90% |
| Repository | ≥80% |
| API | Endpoint utama wajib diuji |
| Business Flow | 100% |

Coverage digunakan sebagai indikator, bukan satu-satunya ukuran kualitas.

---

# 15.17 Testing Do & Don't

## ✅ Do

- Tulis test sejak awal pengembangan.
- Gunakan Factory dan Fixture.
- Gunakan Test Database.
- Mock dependency eksternal.
- Tambahkan test untuk setiap bug yang diperbaiki.
- Jalankan test sebelum Pull Request.

## ❌ Don't

- Menguji Production Database.
- Menggunakan data Production.
- Mengabaikan test yang gagal.
- Menonaktifkan test sementara.
- Hardcode Test Data.
- Merge ketika CI gagal.

---

# 15.18 AI Testing Checklist

Sebelum menerima kode dari AI.

☐ Unit Test dibuat.

☐ Integration Test diperbarui.

☐ API Test diperbarui.

☐ Business Rule diuji.

☐ Error Case diuji.

☐ Edge Case diuji.

☐ Coverage tidak menurun.

☐ Tidak ada flaky test.

☐ Seluruh test berhasil.

---

# 15.19 Golden Rules

Seluruh developer dan AI wajib mengikuti aturan berikut.

✓ Test Business Behavior, bukan implementasi.

✓ Unit Test lebih banyak daripada E2E Test.

✓ Semua bug harus memiliki Regression Test.

✓ Semua Business Rule penting harus diuji.

✓ Test harus independen.

✓ Test harus dapat dijalankan berulang.

✓ Automation lebih baik daripada Manual Testing.

✓ Jangan pernah mengabaikan test yang gagal.

✓ Jangan Release tanpa Regression Test.

✓ Jika ragu, buat test tambahan.

---

# 15.20 Quick Decision Guide

| Pertanyaan | Jawaban |
|------------|---------|
| Business Logic diuji dengan? | Unit Test |
| Repository diuji dengan? | Integration Test |
| REST API diuji dengan? | API Test |
| UI diuji dengan? | Frontend Test |
| Business Flow diuji dengan? | E2E Test |
| Migration diuji dengan? | Database Test |
| Accurate diuji dengan? | External Integration Test |
| Security diuji dengan? | Security Test |
| Release diuji dengan? | Regression Test |

---

# 15.21 Chapter Summary

09_TESTING_GUIDE.md merupakan standar resmi pengujian NIAHAIR ERP.

Seluruh developer, QA Engineer, DevOps, dan AI Coding Assistant wajib mengikuti panduan ini dalam setiap perubahan source code.

Dengan menerapkan standar testing yang konsisten, NIAHAIR ERP akan memiliki sistem yang:

✓ Stabil.

✓ Aman.

✓ Mudah dipelihara.

✓ Mudah dikembangkan.

✓ Siap untuk Continuous Integration.

✓ Siap untuk Production.

✓ Memiliki risiko regresi yang rendah.

✓ Mendukung pertumbuhan sistem dalam jangka panjang.
