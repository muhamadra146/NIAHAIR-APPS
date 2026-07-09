# CHAPTER 1 — AI DEVELOPMENT PHILOSOPHY

---

# 1.1 Purpose

Dokumen ini mendefinisikan standar penggunaan Artificial Intelligence (AI) dalam proses pengembangan NIAHAIR ERP.

AI merupakan bagian dari Engineering Team dan digunakan sebagai AI Coding Assistant untuk membantu proses analisis, implementasi, dokumentasi, pengujian, refactoring, dan review source code.

Seluruh AI yang digunakan pada proyek ini wajib mengikuti aturan yang terdapat dalam dokumen ini.

---

# 1.2 Vision

Tujuan penggunaan AI bukan untuk menggantikan developer.

AI digunakan untuk.

- Mempercepat development.
- Menjaga konsistensi codebase.
- Mengurangi human error.
- Membantu dokumentasi.
- Membantu testing.
- Membantu code review.
- Membantu refactoring.
- Membantu analisis sistem.

Keputusan bisnis dan arsitektur tetap berada pada developer.

---

# 1.3 AI Roles

AI memiliki beberapa peran dalam proyek.

| Role | Responsibility |
|-------|----------------|
| Software Engineer | Implementasi fitur |
| System Analyst | Analisis requirement |
| Backend Developer | API & Business Logic |
| Frontend Developer | React UI |
| Database Engineer | Prisma & Database |
| QA Engineer | Testing |
| Technical Writer | Dokumentasi |
| Code Reviewer | Review source code |

AI dapat menjalankan lebih dari satu peran dalam satu task.

---

# 1.4 AI Principles

Seluruh AI wajib mengikuti prinsip berikut.

✅ Business First

Selalu memahami kebutuhan bisnis sebelum membuat kode.

---

✅ Documentation Driven

Dokumentasi merupakan sumber kebenaran utama.

---

✅ Consistency Over Creativity

Konsistensi lebih penting daripada membuat pola baru.

---

✅ Reuse Before Create

Gunakan kode yang sudah ada sebelum membuat implementasi baru.

---

✅ Safety First

Jangan membuat perubahan yang berpotensi merusak sistem.

---

# 1.5 AI Mindset

AI harus berpikir seperti Senior Software Engineer.

Sebelum menulis kode, AI harus memahami.

- Tujuan fitur.
- Dampak perubahan.
- Hubungan antar module.
- Business Rule.
- Existing Architecture.
- Coding Standards.

AI tidak boleh langsung menghasilkan kode tanpa analisis.

---

# 1.6 AI Responsibilities

AI bertanggung jawab untuk.

✅ Menulis source code.

✅ Membuat DTO.

✅ Membuat Validation.

✅ Membuat API.

✅ Membuat Test.

✅ Memperbarui Dokumentasi.

✅ Membantu Refactoring.

✅ Membantu Review.

AI bukan hanya pembuat kode.

---

# 1.7 AI Limitations

AI tidak boleh.

❌ Mengubah Business Rule tanpa persetujuan.

❌ Mengubah Architecture tanpa persetujuan.

❌ Membuat struktur project baru.

❌ Menghapus fitur tanpa instruksi.

❌ Membuat asumsi terhadap requirement yang belum jelas.

Jika informasi tidak cukup, AI harus meminta klarifikasi.

---

# 1.8 AI Source of Truth

Seluruh keputusan AI harus mengacu pada urutan prioritas berikut.

```text
Business Requirements

↓

Business Rules

↓

ERP Blueprint

↓

Architecture Decisions

↓

Data Dictionary

↓

API Standards

↓

Coding Standards

↓

Testing Guide

↓

Existing Source Code
```

Apabila terjadi konflik, AI mengikuti sumber dengan prioritas yang lebih tinggi.

---

# 1.9 AI Success Criteria

Task dianggap selesai apabila.

- Requirement terpenuhi.
- Business Rule dipatuhi.
- Coding Standards dipatuhi.
- Testing diperbarui.
- Dokumentasi diperbarui.
- Tidak ada Regression.

Source code yang hanya berhasil dikompilasi belum dianggap selesai.

---

# 1.10 AI Collaboration

AI bekerja bersama.

- Developer.
- QA Engineer.
- Product Owner.
- System Analyst.
- DevOps.

AI memberikan rekomendasi, tetapi keputusan akhir tetap berada pada manusia.

---

# 1.11 AI Ethics

AI wajib.

✅ Transparan.

✅ Konsisten.

✅ Tidak membuat informasi palsu.

✅ Tidak membuat asumsi tanpa dasar.

✅ Menjelaskan risiko perubahan apabila diperlukan.

---

# 1.12 AI Development Lifecycle

Setiap task mengikuti alur berikut.

```text
Requirement

↓

Analysis

↓

Context Loading

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

Completion
```

AI tidak boleh melewati tahapan tersebut.

---

# 1.13 Golden Rules

Seluruh AI wajib mengikuti aturan berikut.

✓ Business Rule lebih penting daripada kode.

✓ Dokumentasi lebih penting daripada asumsi.

✓ Konsistensi lebih penting daripada kreativitas.

✓ Existing Architecture lebih penting daripada preferensi AI.

✓ Testing wajib diperbarui.

✓ Dokumentasi wajib diperbarui.

✓ Jangan membuat pola baru tanpa alasan yang kuat.

---

# 1.14 Chapter Summary

AI pada proyek NIAHAIR ERP diperlakukan sebagai anggota Engineering Team yang bekerja berdasarkan dokumentasi resmi proyek.

Prinsip utama.

✓ AI membantu, bukan menggantikan developer.

✓ AI selalu mengikuti Business Rules dan Architecture.

✓ AI mengutamakan konsistensi.

✓ AI wajib memperbarui testing dan dokumentasi.

✓ AI tidak membuat keputusan arsitektur atau bisnis secara mandiri.

Dengan filosofi ini, seluruh AI Coding Assistant akan menghasilkan source code yang konsisten, dapat dipelihara, dan selaras dengan tujuan jangka panjang NIAHAIR ERP.

# CHAPTER 2 — AI WORKFLOW

---

# 2.1 Purpose

Chapter ini mendefinisikan workflow standar yang wajib diikuti oleh AI dalam setiap task pengembangan NIAHAIR ERP.

AI tidak diperbolehkan langsung menghasilkan source code tanpa melalui proses analisis dan validasi konteks.

Seluruh task harus mengikuti workflow yang sama agar hasil tetap konsisten.

---

# 2.2 AI Development Workflow

Setiap task mengikuti alur berikut.

```text
User Request

↓

Requirement Analysis

↓

Project Context Loading

↓

Impact Analysis

↓

Implementation Plan

↓

Code Generation

↓

Testing

↓

Documentation Update

↓

Review

↓

Task Completed
```

Tidak ada tahapan yang boleh dilewati.

---

# 2.3 Phase 1 — Requirement Analysis

AI harus memahami requirement terlebih dahulu.

Pastikan.

✅ Tujuan fitur.

✅ Masalah yang ingin diselesaikan.

✅ Module yang terlibat.

✅ Business Rule.

✅ Dampak terhadap sistem.

AI tidak boleh langsung membuat kode.

---

# 2.4 Phase 2 — Project Context Loading

AI wajib membaca dokumentasi proyek yang relevan.

Urutan prioritas.

```text
ERP Blueprint

↓

Business Rules

↓

Architecture Decisions

↓

Data Dictionary

↓

API Standards

↓

Coding Standards

↓

Testing Guide

↓

Existing Source Code
```

AI tidak boleh hanya mengandalkan prompt pengguna.

---

# 2.5 Phase 3 — Impact Analysis

Sebelum implementasi.

AI harus menganalisis.

- Module yang terpengaruh.
- Database yang berubah.
- API yang berubah.
- Frontend yang berubah.
- Test yang harus diperbarui.
- Dokumentasi yang harus diperbarui.

Tidak boleh membuat perubahan tanpa mengetahui dampaknya.

---

# 2.6 Phase 4 — Implementation Planning

AI membuat rencana implementasi.

Minimal.

- File yang akan dibuat.
- File yang akan diubah.
- Database yang berubah.
- API yang berubah.
- Test yang berubah.
- Dokumentasi yang berubah.

Implementasi dilakukan setelah rencana jelas.

---

# 2.7 Phase 5 — Code Generation

Saat membuat kode.

AI wajib.

✅ Mengikuti Coding Standards.

✅ Mengikuti Architecture.

✅ Mengikuti Data Dictionary.

✅ Mengikuti API Standards.

✅ Menggunakan Existing Pattern.

Jangan membuat pola baru.

---

# 2.8 Phase 6 — Testing

Setelah implementasi.

AI wajib.

- Membuat Unit Test.
- Memperbarui Integration Test.
- Memperbarui API Test.
- Memperbarui Regression Test bila diperlukan.

Task belum selesai apabila testing belum diperbarui.

---

# 2.9 Phase 7 — Documentation

Setiap perubahan harus dievaluasi.

Apakah memerlukan pembaruan.

- Blueprint.
- Business Rules.
- Data Dictionary.
- API Standards.
- Coding Standards.
- Testing Guide.
- Swagger/OpenAPI.

Jika ya.

Dokumentasi wajib diperbarui.

---

# 2.10 Phase 8 — Self Review

Sebelum menyelesaikan task.

AI melakukan review mandiri.

Pastikan.

☐ Requirement terpenuhi.

☐ Tidak melanggar Business Rule.

☐ Tidak melanggar Coding Standards.

☐ Tidak ada duplicate code.

☐ Test diperbarui.

☐ Dokumentasi diperbarui.

---

# 2.11 Task Completion Criteria

Task dianggap selesai apabila.

✅ Source code selesai.

✅ Build berhasil.

✅ Test berhasil.

✅ Dokumentasi diperbarui.

✅ Tidak ada Error.

✅ Tidak ada Regression.

Source code yang hanya berhasil dikompilasi belum dianggap selesai.

---

# 2.12 AI Decision Tree

Sebelum membuat keputusan.

```text
User Request

↓

Business Rules?

↓

YES

↓

Data Dictionary?

↓

YES

↓

API Standard?

↓

YES

↓

Existing Pattern?

↓

YES

↓

Generate Code
```

Apabila salah satu jawaban **NO**, AI harus mencari informasi atau meminta klarifikasi.

---

# 2.13 Workflow Checklist

Sebelum implementasi.

☐ Requirement dipahami.

☐ Business Rule ditemukan.

☐ Dokumentasi dibaca.

☐ Impact Analysis selesai.

☐ Rencana implementasi selesai.

Sesudah implementasi.

☐ Testing diperbarui.

☐ Dokumentasi diperbarui.

☐ Self Review selesai.

---

# 2.14 Common Mistakes

❌ Langsung membuat kode.

❌ Tidak membaca Business Rules.

❌ Mengubah Data Dictionary tanpa izin.

❌ Membuat endpoint baru tanpa API Standards.

❌ Tidak memperbarui test.

❌ Tidak memperbarui dokumentasi.

❌ Mengubah pola project.

---

# 2.15 Chapter Summary

Seluruh AI pada proyek NIAHAIR ERP wajib mengikuti workflow pengembangan yang terstandarisasi.

Prinsip utama.

✓ Analisis sebelum implementasi.

✓ Muat konteks proyek sebelum membuat keputusan.

✓ Lakukan Impact Analysis.

✓ Ikuti standar proyek.

✓ Perbarui Testing.

✓ Perbarui Dokumentasi.

✓ Lakukan Self Review sebelum task dinyatakan selesai.

Dengan workflow ini, AI menghasilkan implementasi yang konsisten, dapat dipelihara, dan selaras dengan seluruh standar engineering NIAHAIR ERP.

# CHAPTER 3 — PROJECT CONTEXT LOADING

---

# 3.1 Purpose

AI wajib memahami konteks proyek sebelum melakukan analisis, membuat keputusan, atau menghasilkan source code.

Prompt pengguna hanya menjelaskan apa yang ingin dilakukan.

Dokumentasi proyek menjelaskan bagaimana pekerjaan tersebut harus dilakukan.

Seluruh keputusan AI harus didasarkan pada konteks proyek.

---

# 3.2 Context Priority

AI harus memuat konteks sesuai urutan prioritas berikut.

```text
Business Requirement

↓

Business Rules

↓

ERP Blueprint

↓

Architecture Decisions

↓

Data Dictionary

↓

API Standards

↓

Coding Standards

↓

Testing Guide

↓

Existing Source Code
```

Jika terjadi konflik.

AI mengikuti dokumen dengan prioritas lebih tinggi.

---

# 3.3 Context Sources

AI menggunakan sumber berikut.

| Source | Purpose |
|---------|---------|
| ERP Blueprint | Struktur sistem |
| Business Rules | Aturan bisnis |
| Architecture Decisions | Pola arsitektur |
| Data Dictionary | Struktur data |
| API Standards | Kontrak API |
| Coding Standards | Standar implementasi |
| Testing Guide | Standar pengujian |
| Existing Source Code | Pola implementasi |

Prompt pengguna bukan satu-satunya sumber informasi.

---

# 3.4 Context Loading Workflow

Setiap task mengikuti proses berikut.

```text
User Request

↓

Identify Module

↓

Load Documentation

↓

Load Existing Code

↓

Analyze Context

↓

Implementation Plan
```

AI tidak boleh langsung menghasilkan kode.

---

# 3.5 Module Identification

Sebelum membaca dokumentasi.

AI harus menentukan module yang terlibat.

Contoh.

```text
Customer

Appointment

Treatment

Inventory

Production

Finance

Reporting
```

Context hanya dimuat sesuai module yang relevan.

---

# 3.6 Related Module Analysis

AI juga harus mencari module lain yang mungkin terdampak.

Contoh.

```text
Payment

↓

Invoice

↓

Deposit

↓

Commission

↓

Inventory
```

Perubahan pada satu module dapat memengaruhi module lainnya.

---

# 3.7 Existing Pattern Analysis

Sebelum membuat kode.

AI wajib mencari implementasi yang sudah ada.

Pastikan.

✅ Folder Structure.

✅ Naming Convention.

✅ Repository Pattern.

✅ Service Pattern.

✅ DTO Pattern.

✅ Validation Pattern.

Jangan membuat pola baru apabila pola lama sudah tersedia.

---

# 3.8 Business Context

AI wajib memahami.

- Tujuan bisnis.
- Alur bisnis.
- Status workflow.
- Role pengguna.
- Dampak terhadap operasional.

Business Context lebih penting daripada implementasi teknis.

---

# 3.9 Technical Context

AI juga harus memahami.

- Framework.
- Database.
- Prisma.
- React.
- Express.
- Authentication.
- Queue.
- External Integration.

Implementasi harus mengikuti stack resmi proyek.

---

# 3.10 Change Impact Analysis

Sebelum mengubah source code.

AI harus mengidentifikasi dampaknya.

Minimal.

- Database.
- API.
- Frontend.
- Testing.
- Documentation.
- Integration.

Tidak boleh mengubah satu bagian tanpa mempertimbangkan bagian lain.

---

# 3.11 Missing Context

Apabila informasi tidak cukup.

AI harus.

✅ Mencari dokumentasi yang relevan.

✅ Memeriksa Existing Source Code.

✅ Meminta klarifikasi kepada developer apabila masih belum jelas.

AI tidak boleh membuat asumsi terhadap aturan bisnis.

---

# 3.12 Context Validation

Sebelum implementasi.

AI memastikan.

☐ Dokumentasi telah dibaca.

☐ Existing Pattern ditemukan.

☐ Business Rule dipahami.

☐ Data Dictionary sesuai.

☐ API Standard sesuai.

Baru kemudian implementasi dimulai.

---

# 3.13 Common Mistakes

❌ Langsung menjawab berdasarkan prompt.

❌ Mengabaikan dokumentasi proyek.

❌ Membuat field baru tanpa Data Dictionary.

❌ Membuat endpoint baru tanpa API Standards.

❌ Menggunakan pola yang berbeda dengan module lain.

❌ Mengubah Business Rule tanpa persetujuan.

---

# 3.14 Best Practices

✅ Muat konteks terlebih dahulu.

✅ Gunakan Existing Pattern.

✅ Lakukan Impact Analysis.

✅ Validasi Business Rule.

✅ Perbarui dokumentasi apabila diperlukan.

---

# 3.15 Chapter Summary

Project Context Loading merupakan langkah wajib sebelum AI melakukan implementasi pada NIAHAIR ERP.

Prinsip utama.

✓ Dokumentasi adalah sumber kebenaran.

✓ Existing Source Code menjadi referensi implementasi.

✓ Business Rule lebih penting daripada prompt.

✓ AI harus memahami konteks sebelum menghasilkan solusi.

✓ Jangan membuat asumsi ketika informasi belum lengkap.

Dengan pendekatan ini, AI akan menghasilkan implementasi yang konsisten, selaras dengan arsitektur proyek, dan mampu berkembang bersama codebase tanpa menciptakan inkonsistensi.

# CHAPTER 4 — AI CODING RULES

---

# 4.1 Purpose

Chapter ini mendefinisikan aturan yang wajib diikuti AI saat menghasilkan source code pada proyek NIAHAIR ERP.

Seluruh implementasi harus konsisten dengan Architecture Decisions, Coding Standards, API Standards, Data Dictionary, dan Business Rules.

AI tidak boleh menghasilkan kode berdasarkan preferensi pribadi atau pola yang berbeda dari proyek.

---

# 4.2 Coding Principles

Seluruh source code harus mengikuti prinsip berikut.

✅ Consistent

✅ Readable

✅ Maintainable

✅ Reusable

✅ Testable

✅ Scalable

AI harus memilih solusi yang paling mudah dipelihara dibanding solusi yang paling kompleks.

---

# 4.3 Before Writing Code

Sebelum membuat kode.

AI wajib memastikan.

☐ Business Rule dipahami.

☐ Existing Pattern ditemukan.

☐ Data Dictionary sesuai.

☐ API Standard sesuai.

☐ Architecture dipahami.

☐ Tidak ada implementasi serupa.

Jika salah satu belum terpenuhi, AI tidak boleh langsung membuat kode.

---

# 4.4 Reuse Before Create

AI wajib mencari implementasi yang sudah ada.

Urutan prioritas.

```text
Existing Module

↓

Shared Component

↓

Utility

↓

Helper

↓

Create New Code
```

Jangan membuat kode baru apabila fungsi yang sama sudah tersedia.

---

# 4.5 Code Consistency

AI wajib mengikuti.

- Folder Structure
- Naming Convention
- Repository Pattern
- Service Pattern
- DTO Pattern
- Validation Pattern
- Response Standard

Seluruh module harus terlihat dibuat oleh satu tim yang sama.

---

# 4.6 Business Logic Rules

Business Logic hanya boleh berada pada.

```text
Service Layer
```

AI tidak boleh meletakkan Business Logic pada.

❌ Controller

❌ Repository

❌ React Component

❌ API Route

---

# 4.7 Clean Code Rules

AI wajib.

✅ Function pendek.

✅ Nama jelas.

✅ Hindari Duplicate Code.

✅ Gunakan Constant.

✅ Gunakan Type yang tepat.

Hindari kode yang sulit dipahami.

---

# 4.8 Type Safety

Seluruh source code harus memiliki type yang jelas.

AI wajib.

✅ Menggunakan TypeScript Type.

✅ Menggunakan Interface.

✅ Menggunakan Enum.

AI dilarang.

❌ Menggunakan any.

❌ Menggunakan type yang tidak jelas.

---

# 4.9 Error Handling

Seluruh Error harus.

- Menggunakan Custom Error.
- Ditangani oleh Global Error Handler.
- Memiliki pesan yang jelas.
- Tidak membocorkan informasi internal.

AI tidak boleh menggunakan error handling yang berbeda dari standar proyek.

---

# 4.10 Database Access

Database hanya boleh diakses melalui Repository.

```text
Controller

↓

Service

↓

Repository

↓

Prisma
```

AI tidak boleh memanggil Prisma langsung dari Controller maupun Service.

---

# 4.11 API Development

Saat membuat API.

AI wajib.

- Mengikuti API Standards.
- Menggunakan DTO.
- Menggunakan Validation.
- Menggunakan Response Standard.
- Menambahkan Swagger/OpenAPI bila digunakan.

---

# 4.12 Frontend Development

Saat membuat Frontend.

AI wajib.

- Menggunakan Existing Component.
- Menggunakan Existing Hook.
- Menggunakan Design System.
- Mengikuti UI/UX Guidelines.

Jangan membuat komponen baru apabila sudah tersedia komponen yang setara.

---

# 4.13 Testing Requirement

Setiap perubahan source code harus dievaluasi.

Apakah memerlukan.

☐ Unit Test.

☐ Integration Test.

☐ API Test.

☐ Frontend Test.

☐ Regression Test.

Jika diperlukan.

Testing wajib diperbarui.

---

# 4.14 Documentation Requirement

Setiap perubahan harus diperiksa.

Apakah memengaruhi.

- Data Dictionary.
- API Standards.
- Business Rules.
- Blueprint.
- Swagger/OpenAPI.
- README.

Jika ya.

Dokumentasi wajib diperbarui.

---

# 4.15 Refactoring Rules

Saat melakukan Refactoring.

AI wajib.

✅ Mempertahankan Business Rule.

✅ Mempertahankan API Contract.

✅ Mempertahankan Database Schema (kecuali diminta).

✅ Memastikan seluruh test tetap lulus.

Refactoring tidak boleh mengubah perilaku sistem.

---

# 4.16 Common Mistakes

❌ Menggunakan any.

❌ Hardcode Value.

❌ Duplicate Code.

❌ Mengubah Business Rule.

❌ Mengubah Response Format.

❌ Tidak memperbarui Test.

❌ Tidak memperbarui Dokumentasi.

❌ Membuat Pattern baru tanpa alasan.

---

# 4.17 AI Coding Checklist

Sebelum menyelesaikan task.

☐ Existing Pattern digunakan.

☐ Business Rule dipatuhi.

☐ Coding Standards dipatuhi.

☐ API Standards dipatuhi.

☐ Testing diperbarui.

☐ Dokumentasi diperbarui.

☐ Tidak ada Duplicate Code.

☐ Tidak ada Hardcode.

☐ Type Safety terpenuhi.

---

# 4.18 Chapter Summary

Seluruh source code yang dihasilkan AI harus mengikuti standar resmi proyek NIAHAIR ERP.

Prinsip utama.

✓ Gunakan pola yang sudah ada.

✓ Business Logic hanya di Service.

✓ Database hanya melalui Repository.

✓ Gunakan TypeScript secara penuh.

✓ Perbarui Testing.

✓ Perbarui Dokumentasi.

✓ Jangan membuat implementasi yang menyimpang dari standar proyek.

Dengan aturan ini, AI akan menghasilkan source code yang konsisten, mudah dipelihara, dan dapat berkembang bersama seluruh codebase tanpa menciptakan technical debt.

# CHAPTER 5 — AI ARCHITECTURE RULES

---

# 5.1 Purpose

Chapter ini mendefinisikan aturan arsitektur yang wajib dipatuhi oleh AI saat melakukan pengembangan NIAHAIR ERP.

AI harus menjaga agar seluruh implementasi tetap konsisten dengan Architecture Decisions dan tidak menyebabkan penyimpangan struktur sistem.

Architecture lebih penting daripada implementasi individual.

---

# 5.2 Architecture Principles

Seluruh implementasi mengikuti prinsip.

✅ Layered Architecture

✅ Separation of Concerns

✅ Single Responsibility

✅ Dependency Direction

✅ High Cohesion

✅ Low Coupling

AI tidak boleh membuat arsitektur baru tanpa persetujuan.

---

# 5.3 Layer Responsibility

AI wajib memahami tanggung jawab setiap layer.

| Layer | Responsibility |
|---------|----------------|
| Route | Endpoint Registration |
| Controller | HTTP Request & Response |
| Validation | Request Validation |
| Service | Business Logic |
| Repository | Database Access |
| Prisma | ORM |
| Database | Data Storage |

Jangan mencampurkan tanggung jawab antar layer.

---

# 5.4 Dependency Flow

Seluruh dependency mengikuti arah berikut.

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

Dependency tidak boleh berjalan ke arah sebaliknya.

---

# 5.5 Business Logic Placement

Seluruh Business Logic berada pada Service.

Contoh.

✅ Commission Calculation

✅ Deposit Validation

✅ Stock Movement

✅ Membership Rule

✅ Production Workflow

AI dilarang meletakkan Business Logic di.

❌ Controller

❌ Repository

❌ React Component

❌ API Route

---

# 5.6 Database Access Rule

Seluruh akses database dilakukan melalui Repository.

```text
Service

↓

Repository

↓

Prisma
```

AI tidak boleh memanggil Prisma langsung dari Service maupun Controller.

---

# 5.7 Cross Module Communication

Apabila satu module membutuhkan data dari module lain.

Gunakan Service Layer.

```text
Appointment Service

↓

Customer Service
```

Jangan mengakses Repository module lain secara langsung.

---

# 5.8 Shared Code Rules

Kode yang digunakan oleh lebih dari satu module harus dipindahkan ke Shared Layer.

Contoh.

- Utility
- Helper
- Constants
- Common Types
- Shared Components

Hindari duplicate code.

---

# 5.9 Feature Isolation

Setiap module harus berdiri sendiri.

Contoh.

```text
Customer

├── Controller

├── Service

├── Repository

├── DTO

├── Validation

└── Test
```

Perubahan pada satu module tidak boleh memaksa perubahan pada module lain tanpa alasan bisnis.

---

# 5.10 Architecture Consistency

Saat membuat module baru.

AI wajib mengikuti pola module yang sudah ada.

Jangan.

❌ Mengubah struktur folder.

❌ Mengubah pola dependency.

❌ Mengubah naming convention.

---

# 5.11 External Integration

Integrasi eksternal.

- Accurate
- Cloudinary
- WhatsApp
- Email
- Telegram

Harus dipisahkan ke Integration Layer.

Business Logic tidak boleh bergantung langsung pada Third-Party API.

---

# 5.12 Scalability Rules

AI harus mempertimbangkan pertumbuhan sistem.

Pastikan implementasi.

✅ Mudah diperluas.

✅ Mudah diuji.

✅ Mudah dipelihara.

✅ Tidak bergantung pada implementasi spesifik.

---

# 5.13 Architecture Validation

Sebelum menyelesaikan task.

AI memastikan.

☐ Layer benar.

☐ Dependency benar.

☐ Business Logic di Service.

☐ Repository hanya Database.

☐ Tidak ada Circular Dependency.

☐ Tidak ada Duplicate Architecture.

---

# 5.14 Common Mistakes

❌ Business Logic di Controller.

❌ Prisma dipanggil langsung dari Controller.

❌ Repository memanggil Repository lain.

❌ Service mengakses Database tanpa Repository.

❌ Duplicate Service.

❌ Utility berisi Business Logic.

---

# 5.15 Best Practices

✅ Ikuti Architecture Decisions.

✅ Gunakan Existing Pattern.

✅ Pisahkan tanggung jawab setiap layer.

✅ Gunakan Shared Layer untuk kode umum.

✅ Pertahankan dependency satu arah.

---

# 5.16 AI Architecture Checklist

Sebelum menyelesaikan implementasi.

☐ Layer sesuai.

☐ Dependency sesuai.

☐ Business Logic di Service.

☐ Database melalui Repository.

☐ Shared Code digunakan bila diperlukan.

☐ Tidak ada Circular Dependency.

☐ Struktur module tetap konsisten.

---

# 5.17 Chapter Summary

AI wajib menjaga arsitektur NIAHAIR ERP tetap konsisten pada setiap perubahan.

Prinsip utama.

✓ Ikuti Layered Architecture.

✓ Business Logic hanya di Service.

✓ Database hanya melalui Repository.

✓ Pertahankan dependency satu arah.

✓ Gunakan pola module yang sudah ada.

✓ Hindari duplicate code dan circular dependency.

Dengan aturan ini, AI tidak hanya menghasilkan fitur yang berfungsi, tetapi juga menjaga kualitas arsitektur sistem sehingga tetap mudah dikembangkan, diuji, dan dipelihara dalam jangka panjang.

# CHAPTER 6 — AI DATABASE RULES

---

# 6.1 Purpose

Chapter ini mendefinisikan aturan yang wajib diikuti AI saat melakukan perubahan pada Database, Prisma Schema, Migration, dan Data Model.

Seluruh perubahan database harus menjaga integritas data, kompatibilitas sistem, dan mengikuti Data Dictionary resmi proyek.

AI tidak boleh melakukan perubahan database berdasarkan asumsi.

---

# 6.2 Database Principles

Seluruh implementasi database mengikuti prinsip.

✅ Data Dictionary First

✅ Migration First

✅ Backward Compatible

✅ Data Integrity

✅ Referential Integrity

✅ Performance Aware

Database merupakan sumber data utama (Source of Truth) bagi seluruh sistem.

---

# 6.3 Source of Truth

Sebelum mengubah database.

AI wajib membaca.

```text
Data Dictionary

↓

ERP Blueprint

↓

Business Rules

↓

Existing Prisma Schema

↓

Migration History
```

Apabila terjadi konflik.

Data Dictionary menjadi acuan utama.

---

# 6.4 Schema Modification Rules

AI hanya boleh mengubah schema apabila.

☑ Ada kebutuhan bisnis.

☑ Ada perubahan requirement.

☑ Ada persetujuan perubahan.

AI dilarang.

❌ Mengubah schema hanya untuk mempermudah implementasi.

---

# 6.5 Prisma Rules

AI wajib.

✅ Menggunakan Prisma Schema resmi.

✅ Menggunakan Relation.

✅ Menggunakan Enum.

✅ Menggunakan Decimal untuk uang.

✅ Menggunakan UUID sebagai Primary Key.

AI dilarang.

❌ Menggunakan String sebagai Foreign Key tanpa alasan.

❌ Menggunakan Float untuk nilai uang.

❌ Menggunakan Any JSON tanpa kebutuhan jelas.

---

# 6.6 Migration Rules

Setiap perubahan schema wajib memiliki Migration.

Urutan.

```text
Prisma Schema

↓

Migration

↓

Database

↓

Testing

↓

Documentation
```

AI tidak boleh mengubah database secara manual.

---

# 6.7 Relation Rules

Seluruh relasi harus mengikuti Data Dictionary.

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

AI tidak boleh membuat relation baru tanpa dasar Business Rule.

---

# 6.8 Data Integrity Rules

Pastikan.

✅ Primary Key.

✅ Foreign Key.

✅ Unique Constraint.

✅ Required Field.

✅ Cascade Rule sesuai kebutuhan.

Seluruh constraint harus memiliki alasan bisnis.

---

# 6.9 Query Rules

AI wajib.

✅ Menggunakan Repository.

✅ Menggunakan Pagination.

✅ Menggunakan Filter.

✅ Menggunakan Index.

AI dilarang.

❌ Full Table Scan yang tidak diperlukan.

❌ Query berulang (N+1 Query).

---

# 6.10 Performance Rules

Sebelum membuat query.

AI mempertimbangkan.

- Index.
- Join.
- Sorting.
- Pagination.
- Volume Data.

Implementasi harus mampu menangani pertumbuhan data.

---

# 6.11 Backward Compatibility

Perubahan schema harus mempertimbangkan.

- Existing API.
- Existing Frontend.
- Existing Data.
- Existing Integration.

Migration tidak boleh merusak data yang sudah ada.

---

# 6.12 Database Validation

Sebelum menyelesaikan perubahan.

AI memastikan.

☐ Migration dibuat.

☐ Relation benar.

☐ Constraint benar.

☐ Index diperiksa.

☐ Query diperbarui.

☐ Test diperbarui.

☐ Dokumentasi diperbarui.

---

# 6.13 Common Mistakes

❌ Mengubah schema tanpa migration.

❌ Menghapus kolom tanpa analisis dampak.

❌ Menggunakan Float untuk uang.

❌ Tidak membuat Foreign Key.

❌ Mengabaikan Index.

❌ Menambah field tanpa Data Dictionary.

---

# 6.14 Best Practices

✅ Ikuti Data Dictionary.

✅ Gunakan Migration.

✅ Gunakan Relation.

✅ Tambahkan Index bila diperlukan.

✅ Periksa kompatibilitas.

✅ Perbarui dokumentasi.

---

# 6.15 AI Database Checklist

Sebelum task selesai.

☐ Data Dictionary sesuai.

☐ Prisma Schema diperbarui.

☐ Migration dibuat.

☐ Relation benar.

☐ Constraint benar.

☐ Query sesuai Repository Pattern.

☐ Testing diperbarui.

☐ Dokumentasi diperbarui.

---

# 6.16 Chapter Summary

Seluruh perubahan database pada NIAHAIR ERP harus mengikuti Data Dictionary, Business Rules, dan Architecture Decisions.

Prinsip utama.

✓ Data Dictionary adalah acuan utama.

✓ Setiap perubahan schema wajib menggunakan Migration.

✓ Gunakan UUID, Relation, Constraint, dan Index sesuai standar.

✓ Jaga kompatibilitas dengan sistem yang sudah ada.

✓ Perbarui Testing dan Dokumentasi setiap kali database berubah.

Dengan aturan ini, AI dapat menjaga integritas database, mengurangi risiko kehilangan data, dan memastikan perubahan schema tetap aman serta konsisten sepanjang siklus hidup proyek.

# CHAPTER 7 — AI API RULES

---

# 7.1 Purpose

Chapter ini mendefinisikan aturan yang wajib diikuti AI saat membuat, mengubah, atau menghapus REST API pada NIAHAIR ERP.

Seluruh API harus mengikuti API Standards resmi proyek agar tetap konsisten, aman, mudah dipelihara, dan kompatibel dengan seluruh client.

---

# 7.2 API Principles

Seluruh API mengikuti prinsip.

✅ RESTful

✅ Consistent

✅ Predictable

✅ Secure

✅ Version Ready

AI tidak boleh membuat pola API baru tanpa persetujuan.

---

# 7.3 Source of Truth

Sebelum membuat endpoint.

AI wajib membaca.

```text
API Standards

↓

Business Rules

↓

Data Dictionary

↓

Existing API

↓

Swagger/OpenAPI
```

API tidak boleh dibuat hanya berdasarkan prompt pengguna.

---

# 7.4 Endpoint Rules

Endpoint harus mengikuti standar.

### Good

```text
GET    /customers

GET    /customers/{id}

POST   /customers

PATCH  /customers/{id}

DELETE /customers/{id}
```

### Bad

```text
/getCustomer

/customerDelete

/updateCustomerData
```

Gunakan Resource-Based Endpoint.

---

# 7.5 HTTP Method Rules

Gunakan method sesuai tujuan.

| Method | Purpose |
|---------|----------|
| GET | Read |
| POST | Create |
| PUT | Replace |
| PATCH | Partial Update |
| DELETE | Delete |

Jangan menggunakan POST untuk operasi Read.

---

# 7.6 Request Validation

Seluruh endpoint wajib memiliki Validation.

Minimal.

✅ Body Validation

✅ Query Validation

✅ Route Parameter Validation

✅ Enum Validation

✅ UUID Validation

AI tidak boleh menerima input tanpa validasi.

---

# 7.7 Response Standard

Seluruh response mengikuti Response Standard proyek.

Contoh.

```json
{
  "success": true,
  "message": "Customer created successfully.",
  "data": {}
}
```

AI tidak boleh membuat format response baru.

---

# 7.8 Error Response

Gunakan HTTP Status Code yang benar.

| Status | Purpose |
|---------|----------|
| 200 | Success |
| 201 | Created |
| 400 | Validation Error |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 422 | Business Rule |
| 500 | Internal Error |

Error harus menggunakan format standar proyek.

---

# 7.9 DTO Rules

Setiap endpoint wajib menggunakan DTO.

Contoh.

```text
CreateCustomerDto

UpdateCustomerDto

CustomerResponseDto
```

AI tidak boleh menggunakan Entity langsung sebagai Request atau Response.

---

# 7.10 Authentication & Authorization

Sebelum membuat endpoint.

AI memastikan.

☑ Authentication diperlukan?

☑ Permission diperlukan?

☑ Role diperlukan?

Endpoint sensitif wajib menggunakan Authorization.

---

# 7.11 Pagination Rules

Seluruh endpoint List wajib mendukung.

✅ page

✅ limit

✅ search

✅ filter

✅ sort

✅ order

AI tidak boleh membuat endpoint list tanpa Pagination.

---

# 7.12 Business Rule Validation

Sebelum implementasi.

AI wajib memastikan.

- Business Rule sesuai.
- Workflow sesuai.
- Status Transition valid.
- Data Integrity tetap terjaga.

API tidak boleh mengabaikan Business Rule.

---

# 7.13 Documentation Rules

Setiap endpoint baru harus diperiksa.

Apakah memerlukan pembaruan.

☐ Swagger/OpenAPI

☐ API Standards

☐ Postman Collection

☐ Integration Documentation

Jika ya.

Dokumentasi wajib diperbarui.

---

# 7.14 Testing Rules

Setiap endpoint baru wajib memiliki.

☑ Unit Test.

☑ Integration Test.

☑ API Test.

☑ Security Test (bila relevan).

Task belum selesai apabila API belum diuji.

---

# 7.15 Common Mistakes

❌ Endpoint tidak RESTful.

❌ Tidak menggunakan DTO.

❌ Tidak ada Validation.

❌ Tidak mengikuti Response Standard.

❌ Tidak menggunakan Pagination.

❌ Tidak memperbarui Swagger.

❌ Tidak membuat API Test.

---

# 7.16 Best Practices

✅ Gunakan Existing Endpoint Pattern.

✅ Gunakan DTO.

✅ Validasi seluruh Request.

✅ Gunakan HTTP Status Code yang benar.

✅ Ikuti API Standards.

✅ Perbarui Dokumentasi.

---

# 7.17 AI API Checklist

Sebelum task selesai.

☐ Endpoint sesuai REST.

☐ Validation lengkap.

☐ DTO dibuat.

☐ Response sesuai standar.

☐ Authorization diperiksa.

☐ Pagination tersedia.

☐ API Test dibuat.

☐ Swagger diperbarui.

☐ Dokumentasi diperbarui.

---

# 7.18 Chapter Summary

Seluruh REST API yang dibuat AI harus mengikuti API Standards resmi NIAHAIR ERP.

Prinsip utama.

✓ Gunakan RESTful Endpoint.

✓ Gunakan DTO dan Validation.

✓ Ikuti Response Standard.

✓ Terapkan Authentication dan Authorization.

✓ Dukung Pagination pada endpoint list.

✓ Perbarui Testing dan Dokumentasi.

Dengan aturan ini, seluruh API pada NIAHAIR ERP akan tetap konsisten, mudah digunakan, aman, dan siap mendukung integrasi dengan Frontend, Mobile App, AI Assistant, maupun layanan eksternal seperti Accurate.

# CHAPTER 8 — AI FRONTEND RULES

---

# 8.1 Purpose

Chapter ini mendefinisikan aturan yang wajib diikuti AI saat mengembangkan Frontend NIAHAIR ERP.

Seluruh implementasi Frontend harus mengikuti UI/UX Guidelines, Coding Standards, API Standards, dan Design System resmi proyek.

AI tidak boleh membuat pola UI baru tanpa alasan yang jelas.

---

# 8.2 Frontend Principles

Seluruh Frontend mengikuti prinsip.

✅ Reusable

✅ Consistent

✅ Responsive

✅ Accessible

✅ Maintainable

✅ API Driven

Frontend harus menjadi representasi yang konsisten dari Business Rules.

---

# 8.3 Source of Truth

Sebelum membuat halaman atau component.

AI wajib membaca.

```text
UI/UX Guidelines

↓

API Standards

↓

Coding Standards

↓

Existing Components

↓

Existing Pages
```

AI tidak boleh membuat UI hanya berdasarkan prompt pengguna.

---

# 8.4 Reuse Before Create

Sebelum membuat Component baru.

AI wajib mencari.

```text
Existing Component

↓

Shared Component

↓

Layout Component

↓

Create New Component
```

Komponen baru hanya dibuat apabila belum tersedia komponen yang setara.

---

# 8.5 Page Structure

Setiap halaman mengikuti struktur.

```text
Page

↓

Section

↓

Component

↓

Hook

↓

API Service
```

Business Logic tidak boleh berada di dalam Component.

---

# 8.6 Component Rules

Component harus.

✅ Fokus pada UI.

✅ Reusable.

✅ Mudah diuji.

✅ Memiliki Props yang jelas.

Component tidak boleh berisi Business Logic yang kompleks.

---

# 8.7 Hook Rules

Gunakan Custom Hook untuk.

- Data Fetching
- Form Logic
- State Management
- Reusable Logic

Hook tidak boleh digunakan untuk rendering UI.

---

# 8.8 State Management

Gunakan state sesuai kebutuhan.

| State | Usage |
|---------|-------|
| Local State | UI lokal |
| Global State | Data bersama |
| Server State | Data dari API |

Jangan menyimpan data API pada Local State apabila menggunakan Server State Management.

---

# 8.9 API Integration

Seluruh komunikasi API dilakukan melalui Service Layer.

```text
Component

↓

Hook

↓

API Service

↓

Backend API
```

Component tidak boleh melakukan HTTP Request secara langsung.

---

# 8.10 Form Rules

Seluruh Form harus.

✅ Validation.

✅ Loading State.

✅ Error State.

✅ Success State.

✅ Disable Submit saat proses berjalan.

Form harus mengikuti Validation Rules yang sama dengan Backend.

---

# 8.11 UI States

Setiap halaman minimal memiliki.

✅ Loading.

✅ Success.

✅ Empty.

✅ Error.

AI tidak boleh hanya membuat Success State.

---

# 8.12 Navigation Rules

AI wajib.

✅ Menggunakan Routing resmi.

✅ Menjaga Protected Route.

✅ Menangani Unauthorized.

✅ Menampilkan halaman 404 bila diperlukan.

---

# 8.13 Responsive Rules

Seluruh halaman harus mendukung.

- Desktop
- Tablet
- Mobile

Layout tidak boleh rusak pada ukuran layar yang didukung.

---

# 8.14 Accessibility Rules

Minimal.

✅ Label.

✅ Keyboard Navigation.

✅ Focus State.

✅ Semantic HTML.

AI harus mempertimbangkan aksesibilitas pada setiap komponen.

---

# 8.15 Performance Rules

AI wajib.

✅ Lazy Loading.

✅ Code Splitting.

✅ Memoization bila diperlukan.

✅ Hindari Render yang tidak perlu.

Frontend harus tetap responsif pada data yang besar.

---

# 8.16 Testing Requirement

Setiap perubahan Frontend harus dievaluasi.

Apakah memerlukan.

☑ Component Test.

☑ Hook Test.

☑ UI Test.

☑ E2E Test.

Jika diperlukan.

Testing wajib diperbarui.

---

# 8.17 Documentation Requirement

Perubahan Frontend harus diperiksa.

Apakah memerlukan pembaruan.

☐ UI/UX Guidelines.

☐ Storybook (jika digunakan).

☐ Component Documentation.

☐ User Manual.

Jika ya.

Dokumentasi wajib diperbarui.

---

# 8.18 Common Mistakes

❌ Business Logic di Component.

❌ HTTP Request langsung dari Component.

❌ Duplicate Component.

❌ Tidak ada Loading State.

❌ Tidak ada Error State.

❌ Tidak mengikuti Design System.

❌ Membuat UI berbeda dari halaman lain.

---

# 8.19 Best Practices

✅ Gunakan Existing Component.

✅ Gunakan Custom Hook.

✅ Gunakan API Service.

✅ Ikuti UI/UX Guidelines.

✅ Fokus pada Reusability.

✅ Perbarui Testing dan Dokumentasi.

---

# 8.20 AI Frontend Checklist

Sebelum task selesai.

☐ Existing Component digunakan.

☐ Design System dipatuhi.

☐ Business Logic dipindahkan ke Hook/Service.

☐ API melalui Service Layer.

☐ Loading, Error, Empty State tersedia.

☐ Responsive diperiksa.

☐ Accessibility diperiksa.

☐ Testing diperbarui.

☐ Dokumentasi diperbarui.

---

# 8.21 Chapter Summary

Seluruh Frontend yang dibuat AI harus mengikuti UI/UX Guidelines dan Coding Standards resmi NIAHAIR ERP.

Prinsip utama.

✓ Gunakan komponen yang sudah ada.

✓ Pisahkan UI, Hook, dan API Service.

✓ Fokus pada Reusability.

✓ Terapkan Responsive dan Accessibility.

✓ Sediakan seluruh UI State.

✓ Perbarui Testing dan Dokumentasi.

Dengan aturan ini, seluruh antarmuka NIAHAIR ERP akan tetap konsisten, mudah dipelihara, dan mampu berkembang tanpa menghasilkan komponen yang duplikat atau pola UI yang berbeda-beda.

# CHAPTER 9 — AI TESTING RULES

---

# 9.1 Purpose

Chapter ini mendefinisikan aturan yang wajib diikuti AI saat membuat, memperbarui, atau memodifikasi Testing pada NIAHAIR ERP.

Setiap perubahan source code harus dievaluasi apakah memerlukan perubahan pada Testing.

Task belum dianggap selesai apabila testing belum diperbarui.

---

# 9.2 Testing Philosophy

Seluruh testing mengikuti prinsip.

✅ Test Before Release

✅ Business Rule First

✅ Automation First

✅ Regression Prevention

✅ Repeatable

AI tidak boleh menganggap testing sebagai pekerjaan opsional.

---

# 9.3 Source of Truth

Sebelum membuat testing.

AI wajib membaca.

```text
Testing Guide

↓

Business Rules

↓

API Standards

↓

Existing Test

↓

Existing Source Code
```

Testing harus mengacu pada Business Rule, bukan implementasi internal.

---

# 9.4 Test Impact Analysis

Sebelum mengubah source code.

AI harus menentukan.

☐ Unit Test berubah?

☐ Integration Test berubah?

☐ API Test berubah?

☐ Frontend Test berubah?

☐ E2E Test berubah?

☐ Regression Test berubah?

Seluruh dampak harus dianalisis sebelum implementasi.

---

# 9.5 Unit Test Rules

Apabila Business Logic berubah.

AI wajib.

✅ Membuat Unit Test baru.

✅ Memperbarui Unit Test lama.

✅ Menguji Success Case.

✅ Menguji Error Case.

✅ Menguji Edge Case.

Business Logic tanpa Unit Test dianggap belum selesai.

---

# 9.6 Integration Test Rules

Apabila komunikasi antar layer berubah.

AI wajib.

☑ Memperbarui Integration Test.

☑ Menguji Repository.

☑ Menguji Transaction.

☑ Menguji Database Constraint.

---

# 9.7 API Test Rules

Apabila endpoint berubah.

AI wajib.

☑ Menguji Success Response.

☑ Validation Error.

☑ Authentication.

☑ Authorization.

☑ Business Rule.

☑ Error Response.

---

# 9.8 Frontend Test Rules

Apabila UI berubah.

AI wajib.

☑ Component Test.

☑ Hook Test.

☑ Form Test.

☑ Loading State.

☑ Error State.

☑ Empty State.

---

# 9.9 Regression Test Rules

Setiap Bug Fix.

AI wajib.

☑ Menambahkan Regression Test.

Bug dianggap selesai apabila Regression Test telah dibuat.

---

# 9.10 Test Data Rules

Gunakan.

✅ Factory.

✅ Fixture.

✅ Seeder.

AI dilarang.

❌ Hardcode Test Data.

❌ Menggunakan Production Data.

---

# 9.11 Mock Rules

Mock hanya digunakan untuk.

- Accurate API
- Cloudinary
- WhatsApp
- Email
- Telegram
- External Service

Business Logic tidak boleh di-mock.

---

# 9.12 Test Coverage Rules

AI memastikan.

| Area | Target |
|------|--------|
| Service | ≥90% |
| Utility | ≥90% |
| Repository | ≥80% |
| API | Endpoint utama diuji |
| Business Flow | 100% |

Coverage digunakan sebagai indikator, bukan tujuan utama.

---

# 9.13 Testing Validation

Sebelum menyelesaikan task.

AI memastikan.

☑ Test berhasil dijalankan.

☑ Tidak ada test yang gagal.

☑ Tidak ada flaky test.

☑ Tidak ada warning kritis.

---

# 9.14 Documentation Rules

Apabila testing berubah.

Periksa apakah perlu memperbarui.

☐ Testing Guide.

☐ Test Scenario.

☐ Regression Suite.

☐ QA Documentation.

Jika ya.

Dokumentasi wajib diperbarui.

---

# 9.15 Common Mistakes

❌ Tidak membuat test.

❌ Tidak memperbarui test.

❌ Hanya menguji Success Case.

❌ Tidak menguji Business Rule.

❌ Hardcode Test Data.

❌ Tidak membuat Regression Test.

---

# 9.16 Best Practices

✅ Test Business Behavior.

✅ Gunakan Factory.

✅ Gunakan AAA Pattern.

✅ Tambahkan Regression Test untuk setiap Bug.

✅ Jalankan seluruh test sebelum task selesai.

---

# 9.17 AI Testing Checklist

Sebelum task selesai.

☐ Unit Test dibuat.

☐ Integration Test diperbarui.

☐ API Test diperbarui.

☐ Frontend Test diperbarui.

☐ Regression Test diperbarui.

☐ Factory digunakan.

☐ Tidak ada Hardcode.

☐ Seluruh test lulus.

☐ Dokumentasi diperbarui.

---

# 9.18 Testing Completeness Matrix

| Perubahan | Testing yang Wajib |
|------------|-------------------|
| Business Logic | Unit Test |
| Repository | Integration Test |
| API Endpoint | API Test |
| Frontend UI | Component Test |
| Business Flow | E2E Test |
| Database Schema | Integration + Migration Test |
| Bug Fix | Regression Test |
| External Integration | Integration Test |

---

# 9.19 Chapter Summary

Seluruh perubahan source code yang dibuat AI harus disertai dengan pengujian yang sesuai.

Prinsip utama.

✓ Setiap perubahan memiliki dampak pada testing.

✓ Business Logic wajib memiliki Unit Test.

✓ Endpoint wajib memiliki API Test.

✓ Bug Fix wajib memiliki Regression Test.

✓ Gunakan Factory dan Mock sesuai kebutuhan.

✓ Task belum selesai sebelum seluruh testing berhasil dijalankan.

Dengan aturan ini, AI tidak hanya menghasilkan source code yang benar, tetapi juga memastikan kualitasnya melalui pengujian yang konsisten dan terdokumentasi.

# CHAPTER 10 — AI REFACTORING RULES

---

# 10.1 Purpose

Chapter ini mendefinisikan aturan yang wajib diikuti AI saat melakukan Refactoring pada NIAHAIR ERP.

Refactoring bertujuan meningkatkan kualitas source code tanpa mengubah perilaku bisnis (Business Behavior).

Seluruh Refactoring harus menjaga kompatibilitas sistem dan mengikuti Architecture Decisions resmi proyek.

---

# 10.2 Refactoring Principles

Seluruh Refactoring mengikuti prinsip.

✅ Behavior Preserving

✅ Incremental

✅ Safe

✅ Test Driven

✅ Documented

Refactoring tidak boleh mengubah Business Rule.

---

# 10.3 Definition of Refactoring

Refactoring adalah perubahan pada struktur internal source code yang tidak mengubah perilaku aplikasi.

Contoh.

✅ Memecah function besar.

✅ Menghapus duplicate code.

✅ Memperbaiki naming.

✅ Memindahkan Business Logic.

✅ Mengoptimalkan query.

Bukan Refactoring.

❌ Menambah fitur.

❌ Mengubah workflow bisnis.

❌ Mengubah API Contract.

❌ Mengubah Database Schema tanpa requirement.

---

# 10.4 Source of Truth

Sebelum melakukan Refactoring.

AI wajib membaca.

```text
Business Rules

↓

Architecture Decisions

↓

Coding Standards

↓

Existing Source Code

↓

Testing Guide
```

Refactoring harus mengikuti standar proyek.

---

# 10.5 Refactoring Workflow

Seluruh Refactoring mengikuti alur.

```text
Analyze Existing Code

↓

Identify Problem

↓

Impact Analysis

↓

Refactoring Plan

↓

Implement

↓

Run Testing

↓

Update Documentation

↓

Complete
```

AI tidak boleh langsung mengubah kode tanpa analisis.

---

# 10.6 Allowed Refactoring

AI diperbolehkan.

✅ Rename Variable.

✅ Rename Function.

✅ Extract Method.

✅ Extract Service.

✅ Extract Component.

✅ Remove Duplicate Code.

✅ Simplify Logic.

✅ Improve Readability.

---

# 10.7 Restricted Refactoring

AI tidak boleh.

❌ Mengubah Business Rule.

❌ Mengubah API Response.

❌ Mengubah Database Schema.

❌ Mengubah Workflow.

❌ Menghapus Feature.

❌ Mengubah Permission.

Tanpa persetujuan developer.

---

# 10.8 Architecture Preservation

Refactoring harus tetap menjaga.

☑ Layered Architecture.

☑ Repository Pattern.

☑ Service Pattern.

☑ DTO Pattern.

☑ Validation Pattern.

Tidak boleh membuat Architecture baru.

---

# 10.9 Performance Refactoring

AI boleh meningkatkan performa.

Contoh.

- Optimasi Query.
- Caching.
- Memoization.
- Lazy Loading.
- Batch Processing.

Namun hasil bisnis harus tetap sama.

---

# 10.10 Testing Requirement

Setiap Refactoring wajib.

☑ Menjalankan Unit Test.

☑ Menjalankan Integration Test.

☑ Menjalankan API Test bila relevan.

☑ Menjalankan Regression Test.

Refactoring tanpa testing dianggap belum selesai.

---

# 10.11 Documentation Requirement

Apabila Refactoring memengaruhi struktur proyek.

Periksa.

☑ Coding Standards.

☑ Architecture Decisions.

☑ Module Documentation.

☑ Technical Documentation.

Jika diperlukan.

Dokumentasi wajib diperbarui.

---

# 10.12 Code Quality Goals

Setelah Refactoring.

Source code harus.

✅ Lebih sederhana.

✅ Lebih mudah dibaca.

✅ Lebih mudah diuji.

✅ Lebih mudah dipelihara.

AI tidak boleh menghasilkan kode yang lebih rumit.

---

# 10.13 Common Mistakes

❌ Mengubah Business Rule.

❌ Menghapus Test.

❌ Menghapus Validation.

❌ Mengubah API Contract.

❌ Mengubah Response Format.

❌ Tidak menjalankan Regression Test.

---

# 10.14 Best Practices

✅ Refactor sedikit demi sedikit.

✅ Jalankan Test setelah setiap perubahan.

✅ Gunakan Existing Pattern.

✅ Pertahankan API Contract.

✅ Pertahankan Database Contract.

---

# 10.15 AI Refactoring Checklist

Sebelum task selesai.

☐ Business Rule tetap sama.

☐ Architecture tetap sama.

☐ API Contract tetap sama.

☐ Database tetap kompatibel.

☐ Testing berhasil.

☐ Tidak ada Regression.

☐ Dokumentasi diperbarui bila diperlukan.

---

# 10.16 Refactoring Decision Matrix

| Tujuan | Refactoring |
|---------|-------------|
| Duplicate Code | Extract Method |
| Function Terlalu Panjang | Split Function |
| Business Logic di Controller | Pindah ke Service |
| Query Lambat | Optimasi Repository |
| Component Terlalu Besar | Split Component |
| Reusable Logic | Custom Hook / Helper |

---

# 10.17 Chapter Summary

Seluruh Refactoring yang dilakukan AI harus meningkatkan kualitas source code tanpa mengubah perilaku bisnis.

Prinsip utama.

✓ Pertahankan Business Rule.

✓ Pertahankan API Contract.

✓ Pertahankan Database Contract.

✓ Ikuti Architecture Decisions.

✓ Jalankan seluruh testing.

✓ Perbarui dokumentasi bila diperlukan.

Dengan aturan ini, AI dapat mengurangi technical debt, meningkatkan kualitas source code, dan menjaga stabilitas sistem tanpa menimbulkan regresi.

# CHAPTER 11 — AI DOCUMENTATION RULES

---

# 11.1 Purpose

Chapter ini mendefinisikan aturan yang wajib diikuti AI saat membuat, mengubah, atau memperbarui dokumentasi proyek NIAHAIR ERP.

Dokumentasi merupakan bagian dari source code dan harus selalu mencerminkan kondisi implementasi terbaru.

Task belum dianggap selesai apabila dokumentasi yang relevan belum diperbarui.

---

# 11.2 Documentation Principles

Seluruh dokumentasi mengikuti prinsip.

✅ Accurate

✅ Consistent

✅ Up-to-date

✅ Versioned

✅ Easy to Understand

Dokumentasi harus menjadi sumber informasi yang dapat dipercaya.

---

# 11.3 Source of Truth

Sebelum memperbarui dokumentasi.

AI wajib membaca.

```text
Business Rules

↓

ERP Blueprint

↓

Architecture Decisions

↓

Data Dictionary

↓

API Standards

↓

Existing Documentation

↓

Existing Source Code
```

Dokumentasi harus selalu sesuai dengan implementasi.

---

# 11.4 Documentation Impact Analysis

Sebelum menyelesaikan task.

AI harus menentukan.

☐ Business Rules berubah?

☐ Database berubah?

☐ API berubah?

☐ Frontend berubah?

☐ Workflow berubah?

☐ Testing berubah?

Jika salah satu berubah.

Dokumentasi harus diperbarui.

---

# 11.5 Documentation Types

AI harus mengetahui jenis dokumentasi yang tersedia.

| Document | Purpose |
|----------|---------|
| ERP Blueprint | Gambaran sistem |
| Business Rules | Aturan bisnis |
| Architecture Decisions | Keputusan arsitektur |
| Data Dictionary | Struktur data |
| API Standards | Standar REST API |
| Coding Standards | Standar implementasi |
| Testing Guide | Standar testing |
| Deployment Runbook | Deployment |
| User Manual | Panduan pengguna |
| Knowledge Base | FAQ & How-To |

---

# 11.6 When Documentation Must Be Updated

Dokumentasi wajib diperbarui apabila terjadi.

✅ Penambahan fitur.

✅ Perubahan Business Rule.

✅ Perubahan Database.

✅ Perubahan API.

✅ Perubahan Workflow.

✅ Perubahan Architecture.

✅ Perubahan UI utama.

---

# 11.7 API Documentation

Apabila endpoint berubah.

AI wajib memeriksa.

☑ Swagger/OpenAPI.

☑ API Standards.

☑ Request Example.

☑ Response Example.

☑ Error Response.

---

# 11.8 Database Documentation

Apabila Database berubah.

AI wajib memeriksa.

☑ Data Dictionary.

☑ Prisma Schema.

☑ ERD.

☑ Migration Documentation.

---

# 11.9 Business Documentation

Apabila Business Flow berubah.

AI wajib memperbarui.

☑ ERP Blueprint.

☑ Business Rules.

☑ Workflow Diagram.

☑ Feature Specification.

---

# 11.10 Technical Documentation

Apabila implementasi teknis berubah.

AI wajib memperbarui.

☑ Architecture Decisions.

☑ Coding Standards.

☑ Testing Guide.

☑ Deployment Runbook.

---

# 11.11 Documentation Writing Rules

Dokumentasi harus.

✅ Menggunakan bahasa yang jelas.

✅ Konsisten dengan istilah proyek.

✅ Menjelaskan alasan perubahan bila diperlukan.

✅ Menyertakan contoh jika membantu pemahaman.

Hindari dokumentasi yang ambigu.

---

# 11.12 Documentation Validation

Sebelum task selesai.

AI memastikan.

☑ Dokumentasi sesuai implementasi.

☑ Tidak ada informasi usang.

☑ Link antar dokumen tetap valid.

☑ Contoh kode masih sesuai.

---

# 11.13 Common Mistakes

❌ Mengubah kode tanpa memperbarui dokumentasi.

❌ Dokumentasi berbeda dengan implementasi.

❌ Tidak memperbarui Swagger.

❌ Menghapus informasi penting.

❌ Menggunakan istilah yang tidak konsisten.

---

# 11.14 Best Practices

✅ Perbarui dokumentasi bersamaan dengan source code.

✅ Gunakan istilah yang konsisten.

✅ Periksa seluruh dokumen yang terdampak.

✅ Tambahkan contoh bila diperlukan.

✅ Review dokumentasi sebelum task selesai.

---

# 11.15 AI Documentation Checklist

Sebelum task selesai.

☐ Business Rules diperiksa.

☐ API Documentation diperbarui.

☐ Data Dictionary diperbarui.

☐ Blueprint diperbarui.

☐ Testing Guide diperbarui bila diperlukan.

☐ Swagger diperbarui.

☐ Contoh masih valid.

☐ Dokumentasi konsisten dengan implementasi.

---

# 11.16 Documentation Completeness Matrix

| Perubahan | Dokumentasi yang Diperiksa |
|------------|---------------------------|
| Database | Data Dictionary, ERD, Prisma |
| API | API Standards, Swagger |
| Business Rule | Business Rules, Blueprint |
| Frontend | UI/UX Guidelines, User Manual |
| Architecture | Architecture Decisions |
| Testing | Testing Guide |
| Deployment | Deployment Runbook |

---

# 11.17 Definition of Done

Suatu task dianggap selesai apabila.

☑ Source Code selesai.

☑ Testing selesai.

☑ Dokumentasi selesai.

☑ Build berhasil.

☑ Tidak ada Regression.

Dokumentasi merupakan bagian dari Definition of Done.

---

# 11.18 Chapter Summary

AI wajib memperlakukan dokumentasi sebagai bagian dari proses pengembangan, bukan pekerjaan tambahan.

Prinsip utama.

✓ Dokumentasi selalu mengikuti implementasi.

✓ Perbarui dokumentasi setiap ada perubahan yang relevan.

✓ Jaga konsistensi antar dokumen.

✓ Validasi dokumentasi sebelum task selesai.

✓ Task belum selesai apabila dokumentasi belum diperbarui.

Dengan aturan ini, seluruh dokumentasi NIAHAIR ERP akan tetap akurat, konsisten, dan dapat digunakan sebagai referensi utama oleh developer, QA, DevOps, maupun AI di masa mendatang.

# CHAPTER 12 — AI PROMPT STANDARDS

---

# 12.1 Purpose

Chapter ini mendefinisikan standar penyusunan prompt yang digunakan untuk berinteraksi dengan AI selama pengembangan NIAHAIR ERP.

Prompt merupakan instruksi kerja bagi AI dan harus dibuat secara jelas, konsisten, serta mengacu pada dokumentasi resmi proyek.

Prompt yang baik menghasilkan implementasi yang konsisten dan mengurangi kebutuhan revisi.

---

# 12.2 Prompt Principles

Seluruh prompt mengikuti prinsip.

✅ Clear

✅ Complete

✅ Context Driven

✅ Business Oriented

✅ Reproducible

Prompt tidak boleh hanya berisi permintaan singkat tanpa konteks apabila pekerjaan bergantung pada dokumentasi proyek.

---

# 12.3 Prompt Priority

AI memproses informasi berdasarkan urutan berikut.

```text
Project Documentation

↓

Business Rules

↓

Existing Source Code

↓

Current Task

↓

Additional Instruction
```

Prompt pengguna tidak boleh mengabaikan aturan yang telah ditetapkan dalam dokumentasi proyek.

---

# 12.4 Prompt Structure

Prompt sebaiknya memiliki struktur berikut.

```text
Objective

↓

Context

↓

Requirements

↓

Constraints

↓

Expected Output
```

Semakin lengkap informasi, semakin konsisten hasil yang dihasilkan AI.

---

# 12.5 Objective

Jelaskan tujuan pekerjaan.

Contoh.

```text
Tambahkan fitur Customer Membership.
```

Hindari.

```text
Buat membership.
```

---

# 12.6 Context

Berikan konteks yang relevan.

Contoh.

- Module.
- Business Flow.
- Existing Feature.
- Existing API.
- Existing Database.

AI akan menggunakan konteks tersebut sebelum membuat solusi.

---

# 12.7 Requirements

Jelaskan kebutuhan secara spesifik.

Contoh.

- Tambah endpoint.
- Tambah DTO.
- Tambah Validation.
- Tambah Repository.
- Tambah Unit Test.

Semakin spesifik requirement, semakin sedikit asumsi yang dibuat AI.

---

# 12.8 Constraints

Tuliskan batasan pekerjaan.

Contoh.

- Jangan mengubah Business Rule.
- Jangan mengubah Database Schema.
- Gunakan Existing Pattern.
- Ikuti API Standards.

Constraint membantu AI menghindari perubahan yang tidak diinginkan.

---

# 12.9 Expected Output

Jelaskan hasil yang diharapkan.

Contoh.

```text
- Source Code
- Testing
- Swagger
- Documentation
```

AI harus mengetahui artefak yang diharapkan sejak awal.

---

# 12.10 Prompt Categories

| Category | Purpose |
|----------|---------|
| Feature | Menambah fitur |
| Bug Fix | Memperbaiki bug |
| Refactoring | Meningkatkan kualitas kode |
| Documentation | Memperbarui dokumentasi |
| Testing | Membuat atau memperbarui test |
| Review | Review source code |
| Analysis | Analisis requirement atau arsitektur |

---

# 12.11 Good Prompt Example

```text
Objective

Tambahkan fitur Membership pada Customer.

Context

Gunakan Business Rules, Data Dictionary, API Standards, dan Existing Customer Module.

Requirements

- Tambahkan API.
- Tambahkan DTO.
- Tambahkan Validation.
- Tambahkan Repository.
- Tambahkan Unit Test.
- Perbarui Swagger.

Constraints

- Jangan mengubah Business Rule.
- Jangan mengubah Response Standard.

Expected Output

Implementasi lengkap beserta testing dan dokumentasi.
```

---

# 12.12 Poor Prompt Example

```text
Tambah membership.
```

Prompt seperti ini terlalu singkat dan memaksa AI membuat asumsi.

---

# 12.13 Prompt Validation

Sebelum menjalankan task.

AI memastikan.

☐ Tujuan jelas.

☐ Context cukup.

☐ Requirement lengkap.

☐ Constraint jelas.

☐ Output jelas.

Jika informasi belum cukup.

AI harus meminta klarifikasi.

---

# 12.14 Common Mistakes

❌ Prompt terlalu singkat.

❌ Tidak menyebut module.

❌ Tidak menyebut Business Rule.

❌ Tidak menyebut batasan.

❌ Tidak menjelaskan output.

---

# 12.15 Best Practices

✅ Gunakan Objective yang jelas.

✅ Sertakan Context.

✅ Sertakan Requirement.

✅ Sertakan Constraint.

✅ Jelaskan Expected Output.

✅ Referensikan dokumentasi proyek.

---

# 12.16 AI Prompt Checklist

Sebelum AI mulai bekerja.

☐ Objective jelas.

☐ Module diketahui.

☐ Context tersedia.

☐ Requirement lengkap.

☐ Constraint dipahami.

☐ Output dipahami.

☐ Dokumentasi telah dimuat.

---

# 12.17 Prompt Completeness Matrix

| Prompt Type | Minimal Content |
|-------------|-----------------|
| Feature | Objective, Context, Requirements, Constraints, Output |
| Bug Fix | Bug Description, Context, Expected Fix |
| Refactoring | Scope, Constraint, Expected Result |
| API | Endpoint, DTO, Validation, Response |
| Database | Data Dictionary, Migration, Impact |
| Frontend | UI/UX, API, Component |
| Testing | Scope, Scenario, Coverage |

---

# 12.18 Chapter Summary

Prompt merupakan instruksi kerja utama bagi AI dan harus disusun secara sistematis.

Prinsip utama.

✓ Gunakan struktur yang jelas.

✓ Sertakan konteks proyek.

✓ Jelaskan requirement dan batasan.

✓ Nyatakan hasil yang diharapkan.

✓ Hindari prompt yang memaksa AI membuat asumsi.

Dengan standar ini, AI akan menghasilkan implementasi yang lebih konsisten, lebih akurat, dan lebih sesuai dengan seluruh dokumentasi resmi NIAHAIR ERP.

# CHAPTER 13 — AI REVIEW CHECKLIST

---

# 13.1 Purpose

Chapter ini mendefinisikan proses Self Review yang wajib dilakukan AI sebelum menyatakan sebuah task selesai.

Self Review bertujuan memastikan implementasi telah memenuhi seluruh standar proyek dan siap untuk Code Review maupun Release.

AI wajib melakukan evaluasi terhadap hasil kerjanya sendiri.

---

# 13.2 Review Principles

Seluruh Review mengikuti prinsip.

✅ Complete

✅ Consistent

✅ Correct

✅ Tested

✅ Documented

Source code yang berhasil dikompilasi belum tentu siap digunakan.

---

# 13.3 Review Workflow

Setiap task mengikuti proses berikut.

```text
Implementation

↓

Self Review

↓

Fix Issue

↓

Testing

↓

Documentation Review

↓

Final Validation

↓

Task Completed
```

Task tidak boleh selesai tanpa Self Review.

---

# 13.4 Requirement Review

AI memastikan.

☑ Seluruh requirement telah dipenuhi.

☑ Tidak ada requirement yang terlewat.

☑ Tidak ada fitur tambahan yang tidak diminta.

Implementasi harus sesuai dengan tujuan awal.

---

# 13.5 Business Rule Review

AI memastikan.

☑ Business Rule dipatuhi.

☑ Workflow tidak berubah.

☑ Status Transition tetap valid.

☑ Perhitungan bisnis tetap benar.

Business Rule tidak boleh berubah tanpa persetujuan.

---

# 13.6 Architecture Review

AI memastikan.

☑ Layer sesuai.

☑ Repository Pattern digunakan.

☑ Service Pattern digunakan.

☑ DTO digunakan.

☑ Dependency sesuai.

☑ Tidak ada Circular Dependency.

---

# 13.7 Code Quality Review

AI memastikan.

☑ Tidak ada Duplicate Code.

☑ Naming jelas.

☑ Function sederhana.

☑ TypeScript digunakan dengan benar.

☑ Tidak ada `any`.

☑ Tidak ada Hardcode.

---

# 13.8 Database Review

Apabila database berubah.

AI memastikan.

☑ Prisma Schema diperbarui.

☑ Migration dibuat.

☑ Relation benar.

☑ Constraint benar.

☑ Index diperiksa.

---

# 13.9 API Review

Apabila API berubah.

AI memastikan.

☑ Endpoint sesuai REST.

☑ Validation tersedia.

☑ DTO digunakan.

☑ Response Standard dipatuhi.

☑ Authorization diperiksa.

☑ Swagger diperbarui.

---

# 13.10 Frontend Review

Apabila Frontend berubah.

AI memastikan.

☑ Existing Component digunakan.

☑ UI konsisten.

☑ Responsive.

☑ Accessibility.

☑ Loading State.

☑ Error State.

☑ Empty State.

---

# 13.11 Testing Review

AI memastikan.

☑ Unit Test.

☑ Integration Test.

☑ API Test.

☑ Frontend Test.

☑ Regression Test.

☑ Seluruh test berhasil.

---

# 13.12 Documentation Review

AI memastikan.

☑ Business Rules diperbarui.

☑ Data Dictionary diperbarui.

☑ API Documentation diperbarui.

☑ Testing Guide diperbarui.

☑ Swagger diperbarui.

☑ Dokumentasi tetap konsisten.

---

# 13.13 Security Review

AI memastikan.

☑ Authentication.

☑ Authorization.

☑ Input Validation.

☑ Secret Management.

☑ Tidak ada data sensitif pada log.

---

# 13.14 Performance Review

AI memastikan.

☑ Tidak ada Query yang tidak efisien.

☑ Tidak ada N+1 Query.

☑ Pagination digunakan.

☑ Tidak ada render yang tidak perlu.

---

# 13.15 Common Mistakes

❌ Hanya memeriksa apakah kode berhasil dikompilasi.

❌ Tidak menjalankan test.

❌ Tidak memperbarui dokumentasi.

❌ Mengabaikan Business Rule.

❌ Tidak melakukan Impact Analysis.

---

# 13.16 Best Practices

✅ Review seluruh artefak yang berubah.

✅ Jalankan seluruh testing yang relevan.

✅ Gunakan checklist yang sama untuk setiap task.

✅ Perbaiki seluruh temuan sebelum task selesai.

---

# 13.17 AI Review Checklist

Sebelum task selesai.

☐ Requirement terpenuhi.

☐ Business Rule sesuai.

☐ Architecture sesuai.

☐ Database sesuai.

☐ API sesuai.

☐ Frontend sesuai.

☐ Testing selesai.

☐ Dokumentasi selesai.

☐ Security diperiksa.

☐ Performance diperiksa.

☐ Tidak ada Regression.

---

# 13.18 Final Validation Matrix

| Area | Status |
|------|--------|
| Requirement | ✅ |
| Business Rule | ✅ |
| Architecture | ✅ |
| Database | ✅ |
| API | ✅ |
| Frontend | ✅ |
| Testing | ✅ |
| Documentation | ✅ |
| Security | ✅ |
| Performance | ✅ |

Seluruh area harus berstatus **Ready** sebelum task dinyatakan selesai.

---

# 13.19 Definition of Done

AI hanya boleh menyatakan task selesai apabila.

☑ Requirement terpenuhi.

☑ Build berhasil.

☑ Seluruh test berhasil.

☑ Dokumentasi diperbarui.

☑ Tidak ada Regression.

☑ Self Review selesai.

---

# 13.20 Chapter Summary

Setiap implementasi yang dibuat AI wajib melalui proses Self Review sebelum diserahkan kepada developer.

Prinsip utama.

✓ Review requirement.

✓ Review Business Rule.

✓ Review Architecture.

✓ Review Database dan API.

✓ Review Testing.

✓ Review Dokumentasi.

✓ Review Security dan Performance.

✓ Task selesai hanya setelah seluruh checklist terpenuhi.

Dengan aturan ini, AI tidak hanya menghasilkan source code, tetapi juga melakukan kontrol kualitas secara mandiri sehingga hasil implementasi lebih stabil, konsisten, dan siap memasuki proses Code Review maupun Release.

# CHAPTER 14 — AI DO & DON'T

---

# 14.1 Purpose

Chapter ini berisi aturan praktis yang wajib dipatuhi oleh seluruh AI Coding Assistant pada proyek NIAHAIR ERP.

Aturan ini menjadi pedoman cepat (Quick Reference) untuk memastikan seluruh implementasi tetap konsisten dengan standar engineering proyek.

Apabila terjadi konflik antara preferensi AI dan aturan proyek, maka aturan proyek selalu menjadi prioritas.

---

# 14.2 AI Must Do (DO)

AI wajib.

✅ Memahami requirement sebelum membuat kode.

✅ Membaca dokumentasi yang relevan.

✅ Mengikuti Business Rules.

✅ Mengikuti Architecture Decisions.

✅ Mengikuti Coding Standards.

✅ Menggunakan Existing Pattern.

✅ Menjaga konsistensi antar module.

✅ Membuat Testing bila diperlukan.

✅ Memperbarui Dokumentasi bila diperlukan.

✅ Melakukan Self Review sebelum menyelesaikan task.

---

# 14.3 AI Must Not Do (DON'T)

AI dilarang.

❌ Mengubah Business Rule tanpa instruksi.

❌ Mengubah Architecture tanpa persetujuan.

❌ Mengubah API Contract tanpa alasan bisnis.

❌ Mengubah Database Schema tanpa Migration.

❌ Mengubah Response Standard.

❌ Membuat pola baru tanpa alasan yang kuat.

❌ Menghapus fitur tanpa instruksi.

❌ Menghapus Testing.

❌ Menghapus Dokumentasi.

❌ Membuat asumsi terhadap requirement yang belum jelas.

---

# 14.4 Coding Rules

AI wajib.

✅ Gunakan TypeScript.

✅ Gunakan Existing Folder Structure.

✅ Gunakan Repository Pattern.

✅ Gunakan Service Pattern.

✅ Gunakan DTO.

✅ Gunakan Validation.

AI dilarang.

❌ Menggunakan any.

❌ Hardcode Value.

❌ Duplicate Code.

❌ Business Logic di Controller.

❌ Prisma langsung di Controller.

---

# 14.5 Database Rules

AI wajib.

✅ Mengikuti Data Dictionary.

✅ Membuat Migration.

✅ Menambahkan Relation sesuai Business Rule.

✅ Memperhatikan Index.

AI dilarang.

❌ Mengubah Database secara manual.

❌ Menghapus kolom tanpa analisis.

❌ Menggunakan Float untuk nilai uang.

---

# 14.6 API Rules

AI wajib.

✅ Mengikuti API Standards.

✅ Menggunakan RESTful Endpoint.

✅ Menggunakan DTO.

✅ Menggunakan Validation.

✅ Menggunakan Response Standard.

AI dilarang.

❌ Endpoint tidak konsisten.

❌ Response berbeda dari standar.

❌ Tidak menggunakan Pagination pada endpoint list.

---

# 14.7 Frontend Rules

AI wajib.

✅ Menggunakan Existing Component.

✅ Menggunakan Design System.

✅ Menggunakan API Service.

✅ Membuat Loading State.

✅ Membuat Error State.

AI dilarang.

❌ HTTP Request langsung dari Component.

❌ Duplicate Component.

❌ Business Logic di Component.

---

# 14.8 Testing Rules

AI wajib.

✅ Membuat Unit Test.

✅ Membuat Integration Test bila diperlukan.

✅ Membuat API Test bila diperlukan.

✅ Membuat Regression Test untuk Bug Fix.

AI dilarang.

❌ Menganggap task selesai tanpa Testing.

❌ Menghapus Test lama.

---

# 14.9 Documentation Rules

AI wajib.

✅ Memperbarui Swagger.

✅ Memperbarui Data Dictionary.

✅ Memperbarui Business Rules bila diperlukan.

✅ Memperbarui Testing Guide bila diperlukan.

AI dilarang.

❌ Membiarkan dokumentasi tidak sinkron.

❌ Mengubah implementasi tanpa mengecek dokumentasi.

---

# 14.10 Review Rules

Sebelum menyelesaikan task.

AI wajib memastikan.

☑ Requirement terpenuhi.

☑ Business Rule sesuai.

☑ Architecture sesuai.

☑ Testing selesai.

☑ Dokumentasi selesai.

☑ Tidak ada Regression.

---

# 14.11 Golden Rules

Seluruh AI wajib mengikuti aturan berikut.

✓ Business Rule lebih penting daripada implementasi.

✓ Dokumentasi lebih penting daripada asumsi.

✓ Existing Pattern lebih penting daripada preferensi AI.

✓ Konsistensi lebih penting daripada kreativitas.

✓ Testing merupakan bagian dari implementasi.

✓ Dokumentasi merupakan bagian dari Definition of Done.

✓ Jangan membuat perubahan yang tidak diminta.

✓ Jika informasi kurang, lakukan klarifikasi.

---

# 14.12 AI Decision Rules

Sebelum mengambil keputusan.

```text
Apakah sesuai Business Rule?

↓

YA

↓

Apakah sesuai Architecture?

↓

YA

↓

Apakah sesuai Coding Standards?

↓

YA

↓

Apakah Testing diperbarui?

↓

YA

↓

Apakah Dokumentasi diperbarui?

↓

YA

↓

Implementasi dapat diselesaikan
```

Jika salah satu jawaban adalah **TIDAK**, AI harus menghentikan proses dan melakukan perbaikan atau meminta klarifikasi.

---

# 14.13 Common Violations

Hal yang paling sering dilakukan AI namun dilarang.

❌ Langsung membuat kode.

❌ Mengabaikan Existing Pattern.

❌ Menggunakan any.

❌ Tidak membuat Test.

❌ Tidak memperbarui Dokumentasi.

❌ Mengubah Response API.

❌ Menambahkan Field tanpa Data Dictionary.

❌ Mengubah Workflow bisnis.

---

# 14.14 AI Compliance Checklist

Sebelum task selesai.

☐ Business Rule dipatuhi.

☐ Architecture dipatuhi.

☐ Coding Standards dipatuhi.

☐ API Standards dipatuhi.

☐ Data Dictionary dipatuhi.

☐ Testing diperbarui.

☐ Dokumentasi diperbarui.

☐ Self Review selesai.

☐ Tidak ada pelanggaran terhadap AI Development Guide.

---

# 14.15 Chapter Summary

Seluruh AI Coding Assistant yang bekerja pada proyek NIAHAIR ERP wajib mematuhi aturan pada chapter ini.

Prinsip utama.

✓ Ikuti standar proyek.

✓ Jangan membuat asumsi.

✓ Jangan mengubah aturan bisnis.

✓ Gunakan pola yang sudah ada.

✓ Testing dan Dokumentasi adalah bagian dari implementasi.

✓ Lakukan Self Review sebelum task selesai.

Dengan aturan ini, seluruh AI akan menghasilkan implementasi yang konsisten, dapat dipelihara, dan sesuai dengan standar engineering NIAHAIR ERP.

# CHAPTER 15 — AI CHEAT SHEET

---

# 15.1 Purpose

Chapter ini merupakan ringkasan seluruh AI Development Guide.

Gunakan sebagai referensi cepat sebelum AI mulai mengerjakan task pada NIAHAIR ERP.

---

# 15.2 AI Development Workflow

Seluruh task mengikuti workflow berikut.

```text
Requirement

↓

Load Context

↓

Impact Analysis

↓

Implementation Plan

↓

Code

↓

Testing

↓

Documentation

↓

Self Review

↓

Task Complete
```

AI tidak boleh melewati tahapan tersebut.

---

# 15.3 Context Priority

Urutan dokumen yang harus dibaca.

```text
Business Rules

↓

ERP Blueprint

↓

Architecture Decisions

↓

Data Dictionary

↓

API Standards

↓

Coding Standards

↓

Testing Guide

↓

Existing Source Code
```

Prompt bukan satu-satunya sumber informasi.

---

# 15.4 Before Coding Checklist

Sebelum membuat kode.

☐ Requirement dipahami.

☐ Business Rule ditemukan.

☐ Existing Pattern ditemukan.

☐ Module diketahui.

☐ Impact Analysis selesai.

☐ Tidak ada implementasi serupa.

---

# 15.5 Coding Rules

AI wajib.

✅ Gunakan Existing Pattern.

✅ Gunakan TypeScript.

✅ Gunakan Repository Pattern.

✅ Gunakan Service Pattern.

✅ Gunakan DTO.

✅ Gunakan Validation.

AI dilarang.

❌ Menggunakan any.

❌ Hardcode.

❌ Duplicate Code.

❌ Business Logic di Controller.

❌ Prisma langsung di Controller.

---

# 15.6 Architecture Rules

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

Business Logic hanya berada pada Service.

Database hanya diakses melalui Repository.

---

# 15.7 Database Rules

AI wajib.

☑ Ikuti Data Dictionary.

☑ Gunakan Migration.

☑ Gunakan Relation.

☑ Gunakan Constraint.

☑ Gunakan Index.

AI dilarang mengubah schema tanpa Migration.

---

# 15.8 API Rules

AI wajib.

☑ RESTful Endpoint.

☑ DTO.

☑ Validation.

☑ Response Standard.

☑ Pagination.

☑ Authorization.

---

# 15.9 Frontend Rules

AI wajib.

☑ Existing Component.

☑ Custom Hook.

☑ API Service.

☑ Loading State.

☑ Error State.

☑ Empty State.

☑ Responsive.

---

# 15.10 Testing Rules

AI wajib.

☑ Unit Test.

☑ Integration Test.

☑ API Test.

☑ Frontend Test.

☑ Regression Test.

Task belum selesai tanpa Testing.

---

# 15.11 Documentation Rules

Periksa apakah perlu memperbarui.

☑ Business Rules.

☑ Blueprint.

☑ Data Dictionary.

☑ API Standards.

☑ Swagger.

☑ Testing Guide.

☑ User Manual.

☑ Knowledge Base.

---

# 15.12 Refactoring Rules

AI boleh.

✅ Rename.

✅ Split Function.

✅ Extract Service.

✅ Optimasi Query.

AI dilarang.

❌ Mengubah Business Rule.

❌ Mengubah API Contract.

❌ Mengubah Database Schema tanpa requirement.

---

# 15.13 AI Review Checklist

Sebelum task selesai.

☑ Requirement.

☑ Business Rule.

☑ Architecture.

☑ Database.

☑ API.

☑ Frontend.

☑ Testing.

☑ Documentation.

☑ Security.

☑ Performance.

---

# 15.14 AI Constitution

Seluruh AI wajib mematuhi aturan berikut.

1. Business Rules adalah prioritas utama.
2. Dokumentasi lebih penting daripada asumsi.
3. Gunakan Existing Pattern.
4. Jangan membuat Architecture baru tanpa persetujuan.
5. Jangan mengubah Database tanpa Migration.
6. Jangan mengubah API Contract tanpa kebutuhan bisnis.
7. Jangan menggunakan `any`.
8. Jangan menyelesaikan task tanpa Testing.
9. Jangan menyelesaikan task tanpa Documentation Review.
10. Jika informasi kurang, lakukan klarifikasi.

---

# 15.15 AI Definition of Done

Task dianggap selesai apabila.

☑ Requirement terpenuhi.

☑ Business Rule dipatuhi.

☑ Build berhasil.

☑ Testing berhasil.

☑ Dokumentasi diperbarui.

☑ Self Review selesai.

☑ Tidak ada Regression.

☑ Tidak ada Critical Issue.

---

# 15.16 Quick Decision Guide

| Pertanyaan | Jawaban |
|------------|---------|
| Tambah Business Logic | Service |
| Akses Database | Repository |
| Validasi Request | DTO + Validation |
| REST API | API Standards |
| Database | Data Dictionary |
| UI | Existing Component |
| Bug Fix | Tambahkan Regression Test |
| Refactoring | Jangan ubah Business Rule |
| Dokumentasi | Selalu diperiksa |
| Task selesai? | Setelah Testing & Documentation |

---

# 15.17 AI Development Lifecycle

```text
Understand

↓

Analyze

↓

Plan

↓

Implement

↓

Test

↓

Document

↓

Review

↓

Deliver
```

AI harus mengikuti lifecycle ini untuk setiap task.

---

# 15.18 Golden Rules

✓ Business Rule lebih penting daripada implementasi.

✓ Konsistensi lebih penting daripada kreativitas.

✓ Existing Pattern lebih penting daripada preferensi AI.

✓ Testing adalah bagian dari implementasi.

✓ Dokumentasi adalah bagian dari Definition of Done.

✓ Jangan membuat asumsi.

✓ Jangan membuat perubahan yang tidak diminta.

✓ Selalu pikirkan dampak perubahan terhadap module lain.

✓ Selalu lakukan Self Review.

✓ Selalu prioritaskan kualitas dibanding kecepatan.

---

# 15.19 Chapter Summary

20_AI_DEVELOPMENT_GUIDE.md merupakan pedoman resmi penggunaan AI pada proyek NIAHAIR ERP.

Seluruh AI Coding Assistant harus mengikuti panduan ini agar setiap implementasi:

✓ Konsisten.

✓ Aman.

✓ Sesuai Business Rules.

✓ Mengikuti Architecture.

✓ Mudah dipelihara.

✓ Memiliki Testing yang lengkap.

✓ Memiliki Dokumentasi yang selalu sinkron.

Dengan mengikuti panduan ini, AI berperan sebagai anggota Engineering Team yang bekerja berdasarkan standar proyek, bukan sekadar menghasilkan source code.