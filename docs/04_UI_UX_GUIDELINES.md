# UI / UX GUIDELINES

Version : 1.0

Status : Living Document

Owner : Dani

Lead Architect : ChatGPT

Implementation : Claude Code

---

# CHAPTER 1 — DESIGN PHILOSOPHY

---

# 1.1 Purpose

Dokumen ini menjadi standar resmi seluruh User Interface dan User Experience pada NIAHAIR ERP.

Semua halaman, komponen, interaksi, dan workflow harus mengikuti guideline ini.

Tujuan utama.

- Konsistensi
- Kecepatan penggunaan
- Kemudahan belajar
- Efisiensi operasional
- Skalabilitas UI

UI bukan sekadar tampilan.

UI merupakan alat kerja.

---

# 1.2 Design Principles

Seluruh desain mengikuti prinsip berikut.

1.

Simple.

2.

Consistent.

3.

Fast.

4.

Predictable.

5.

Readable.

6.

Business First.

---

# 1.3 ERP First

NIAHAIR bukan Website.

NIAHAIR bukan Landing Page.

NIAHAIR adalah ERP.

Prioritas desain.

✓ Productivity

✓ Speed

✓ Data Density

✓ Keyboard Friendly

Bukan.

Animation.

Fancy Design.

Glassmorphism.

---

# 1.4 Business Before Beauty

Keputusan desain selalu berdasarkan kebutuhan operasional.

Contoh.

Tabel besar lebih baik daripada Card apabila User harus bekerja cepat.

---

# 1.5 One Action One Purpose

Satu tombol.

Satu fungsi.

Tidak boleh ada tombol yang memiliki perilaku berbeda tergantung kondisi tersembunyi.

---

# 1.6 Predictability

User harus dapat menebak.

Apa yang akan terjadi.

Sebelum mengklik tombol.

Tidak boleh ada kejutan.

---

# 1.7 Minimize Click

Target.

Task umum selesai.

≤ 3 klik.

Contoh.

Cari Customer.

↓

Klik.

↓

Appointment.

↓

Selesai.

---

# 1.8 Data First

Informasi lebih penting daripada dekorasi.

Whitespace secukupnya.

Data tetap menjadi fokus utama.

---

# 1.9 Desktop First

Mayoritas pengguna menggunakan.

Laptop.

Desktop.

Tablet.

Mobile hanya sebagai pendukung.

---

# 1.10 Responsive

Walaupun Desktop First.

Semua halaman tetap dapat digunakan pada Tablet dan Mobile.

Tidak boleh ada fitur yang hilang.

---

# 1.11 Familiar UX

Gunakan pola yang sudah dikenal.

Search di kiri atas.

Filter di dekat Search.

Pagination di bawah.

Save di kanan bawah.

Cancel di kiri.

---

# 1.12 Consistency

Button.

Dialog.

Input.

Badge.

Table.

Card.

Selalu memiliki tampilan yang sama.

Tidak boleh membuat variasi tanpa alasan.

---

# 1.13 Progressive Disclosure

Informasi kompleks ditampilkan bertahap.

Contoh.

Customer.

↓

Overview.

↓

History.

↓

Finance.

↓

Timeline.

↓

Photos.

---

# 1.14 Don't Hide Important Information

Data penting selalu terlihat.

Contoh.

Appointment Status.

Invoice Status.

Inventory Qty.

Payment Status.

Tidak boleh disembunyikan dalam Tooltip.

---

# 1.15 Color Has Meaning

Warna tidak digunakan hanya untuk estetika.

Hijau.

Success.

Merah.

Danger.

Amber.

Warning.

Blue.

Information.

Gray.

Inactive.

Makna warna harus konsisten di seluruh aplikasi.

---

# 1.16 Icon Supports Text

Icon membantu mengenali fungsi.

Icon tidak boleh menggantikan Text.

Kecuali Action yang sudah sangat umum.

Contoh.

Edit.

Delete.

View.

---

# 1.17 Readability

Gunakan ukuran huruf yang nyaman.

Prioritas.

Judul.

Subjudul.

Isi.

Caption.

Kontras harus tinggi.

---

# 1.18 Accessibility

Seluruh UI harus dapat digunakan menggunakan Keyboard.

Focus State wajib terlihat.

Tidak boleh mengandalkan warna saja.

---

# 1.19 Confirmation

Aksi yang berbahaya.

Delete.

Void.

Refund.

Adjustment.

Harus memiliki Confirmation Dialog.

---

# 1.20 Undo Better Than Confirm

Jika memungkinkan.

Lebih baik menyediakan Undo daripada terlalu banyak Dialog konfirmasi.

Namun untuk transaksi finansial tetap wajib konfirmasi.

---

# 1.21 Error Recovery

Error harus membantu User.

Bukan menyalahkan User.

Contoh.

"Stok tidak mencukupi."

Lebih baik daripada.

"Inventory Validation Failed."

---

# 1.22 Empty State

Halaman kosong harus memberikan arahan.

Contoh.

Belum ada Appointment hari ini.

↓

Buat Appointment Baru.

---

# 1.23 Loading State

Loading tidak boleh membuat Layout bergeser.

Gunakan Skeleton.

Bukan Spinner untuk seluruh halaman.

---

# 1.24 Success Feedback

Setelah aksi berhasil.

User harus mendapatkan Feedback.

Contoh.

Toast.

Success Banner.

Badge berubah.

---

# 1.25 Living Design System

Seluruh perubahan UI harus memperbarui.

Design Guideline.

Component Library.

Design Token.

Dokumen ini merupakan Living Document.

---

# CHAPTER 1 SUMMARY

Design Philosophy NIAHAIR ERP berfokus pada.

- Productivity First
- Business First
- Desktop First
- Data First
- Consistency
- Predictability
- Scalability

UI bukan tujuan akhir.

UI adalah alat kerja untuk membantu operasional perusahaan berjalan lebih cepat, lebih akurat, dan lebih nyaman.

# CHAPTER 2 — VISUAL LANGUAGE

---

# 2.1 Purpose

Visual Language mendefinisikan identitas visual NIAHAIR ERP.

Seluruh halaman harus menggunakan bahasa visual yang sama sehingga pengguna dapat berpindah antar modul tanpa harus belajar ulang.

Visual Language mencakup.

- Color
- Typography
- Spacing
- Border Radius
- Elevation
- Iconography
- Shadows
- Density

Visual Language bukan hanya estetika.

Visual Language membantu pengguna mengenali informasi lebih cepat.

---

# 2.2 Design Personality

NIAHAIR ERP menggunakan karakter desain.

Professional.

Modern.

Clean.

Efficient.

Enterprise.

Bukan.

Playful.

Glassmorphism.

Heavy Animation.

Neumorphism.

---

# 2.3 Color Philosophy

Warna memiliki fungsi.

Bukan dekorasi.

Setiap warna hanya memiliki satu arti utama.

Contoh.

Primary.

Brand.

Success.

Berhasil.

Danger.

Kesalahan.

Warning.

Perlu perhatian.

Info.

Informasi.

Neutral.

Konten.

---

# 2.4 Primary Color

Primary Color digunakan untuk.

Primary Button.

Active Tab.

Selected Row.

Focused Input.

Link.

Primary Action.

Primary Color tidak digunakan sebagai Background halaman.

---

# 2.5 Semantic Colors

Semantic Color harus konsisten.

Success.

Hijau.

Warning.

Amber.

Danger.

Merah.

Information.

Biru.

Inactive.

Abu-Abu.

Tidak boleh menggunakan warna berbeda untuk arti yang sama.

---

# 2.6 Background Colors

Gunakan maksimal tiga tingkat Background.

Level 1.

Page Background.

Level 2.

Card Background.

Level 3.

Highlighted Section.

Hindari penggunaan banyak variasi abu-abu.

---

# 2.7 Surface

Semua informasi berada di atas Surface.

Contoh.

Card.

Dialog.

Drawer.

Popover.

Surface harus memiliki kontras yang cukup terhadap Background.

---

# 2.8 Typography Philosophy

Typography harus mudah dibaca.

Prioritas.

Readability.

Bukan dekorasi.

Gunakan maksimal.

1 Font Family.

2 Weight utama.

Regular.

Semibold.

Bold hanya digunakan pada Judul penting.

---

# 2.9 Typography Scale

Gunakan skala yang konsisten.

Display.

Page Title.

Section Title.

Card Title.

Body.

Caption.

Helper Text.

Jangan menggunakan ukuran font acak.

---

# 2.10 Font Weight

Regular.

Body.

Medium.

Label.

Semibold.

Heading.

Bold.

Statistik penting.

---

# 2.11 Line Height

Line Height mengikuti.

120%.

Heading.

150%.

Body.

Tidak terlalu rapat.

Tidak terlalu renggang.

---

# 2.12 White Space

White Space digunakan untuk meningkatkan keterbacaan.

Bukan membuat halaman kosong.

Prioritas.

Grouping.

Hierarchy.

Scanning.

---

# 2.13 Layout Grid

Gunakan Grid yang konsisten.

8-point Grid System.

Spacing.

8.

16.

24.

32.

40.

48.

64.

Tidak menggunakan angka acak.

---

# 2.14 Border Radius

Radius digunakan secara konsisten.

Small.

Input.

Medium.

Card.

Large.

Dialog.

Tidak menggunakan Radius berbeda pada komponen sejenis.

---

# 2.15 Elevation

Shadow menunjukkan hirarki.

Level 0.

Background.

Level 1.

Card.

Level 2.

Dropdown.

Popover.

Level 3.

Dialog.

Semakin tinggi Elevation.

Semakin kuat Shadow.

---

# 2.16 Borders

Border digunakan untuk.

Input.

Table.

Card.

Divider.

Gunakan Border tipis.

Hindari Border tebal.

---

# 2.17 Icon Style

Gunakan satu keluarga Icon.

Semua Icon memiliki.

Stroke.

Ukuran.

Proporsi.

Yang sama.

---

# 2.18 Icon Size

Standar.

16 px.

Inline.

20 px.

Default.

24 px.

Action.

32 px.

Hero.

Tidak menggunakan ukuran acak.

---

# 2.19 Illustration

Illustration hanya digunakan untuk.

Empty State.

Onboarding.

Error Page.

Tidak digunakan pada halaman operasional.

---

# 2.20 Data Density

ERP menggunakan Medium Density.

Informasi lebih padat dibanding Website.

Namun tetap mudah dibaca.

---

# 2.21 Visual Hierarchy

Hierarchy dibentuk menggunakan.

Ukuran.

Weight.

Spacing.

Color.

Bukan menggunakan banyak warna.

---

# 2.22 Contrast

Kontras harus memenuhi standar Accessibility.

Teks selalu lebih penting daripada dekorasi.

---

# 2.23 Focus State

Seluruh komponen interaktif memiliki Focus State.

Keyboard User harus mengetahui posisi Focus.

---

# 2.24 Motion Philosophy

Animasi bersifat fungsional.

Animasi membantu memahami perubahan.

Bukan untuk hiburan.

---

# 2.25 Visual Consistency

Semua halaman.

Customer.

Appointment.

Inventory.

Treatment.

Finance.

Payroll.

Menggunakan Visual Language yang sama.

Tidak boleh membuat variasi desain per Module.

---

# CHAPTER 2 SUMMARY

Visual Language menjadi identitas resmi NIAHAIR ERP.

Seluruh desain mengikuti prinsip.

- Consistent Color
- Consistent Typography
- Consistent Spacing
- Consistent Elevation
- Consistent Icons
- Consistent Hierarchy

Visual Language harus membuat pengguna merasa seluruh ERP merupakan satu produk yang utuh, bukan kumpulan halaman yang dibuat secara terpisah.

# CHAPTER 3 — LAYOUT SYSTEM

---

# 3.1 Purpose

Layout System mendefinisikan struktur seluruh halaman pada NIAHAIR ERP.

Layout harus konsisten agar pengguna dapat berpindah antar modul tanpa harus mempelajari ulang posisi komponen.

Layout bukan dekorasi.

Layout adalah fondasi produktivitas pengguna.

---

# 3.2 Layout Principles

Seluruh Layout mengikuti prinsip.

Consistency.

Predictability.

Hierarchy.

Efficiency.

Responsiveness.

---

# 3.3 Standard Page Structure

Setiap halaman menggunakan struktur berikut.

```
App Shell

↓

Top Navigation

↓

Sidebar

↓

Page Header

↓

Toolbar

↓

Main Content

↓

Footer (Optional)
```

Tidak diperbolehkan membuat struktur halaman yang berbeda tanpa alasan bisnis.

---

# 3.4 App Shell

App Shell merupakan container utama aplikasi.

App Shell terdiri dari.

Sidebar.

Topbar.

Content Area.

Dialog Layer.

Notification Layer.

Seluruh halaman menggunakan App Shell yang sama.

---

# 3.5 Sidebar

Sidebar berfungsi sebagai navigasi utama.

Sidebar harus.

Collapse.

Expand.

Remember State.

Scroll secara independen.

Tidak ikut scroll bersama Content.

---

# 3.6 Top Navigation

Top Navigation berisi.

Company.

Search.

Notification.

Profile.

Branch Selector.

Quick Actions (Future).

Top Navigation selalu berada pada posisi tetap.

---

# 3.7 Content Container

Content berada pada container utama.

Gunakan padding yang konsisten.

Jangan memenuhi seluruh layar tanpa margin.

---

# 3.8 Page Header

Setiap halaman memiliki Header.

Header terdiri dari.

Title.

Description (Optional).

Primary Action.

Secondary Action.

Breadcrumb (Optional).

---

# 3.9 Toolbar

Toolbar berada tepat di bawah Header.

Toolbar berisi.

Search.

Filter.

Sort.

View Option.

Export.

Bulk Action.

Toolbar tidak digunakan untuk informasi.

---

# 3.10 Content Area

Content merupakan area kerja utama.

Content menggunakan.

Grid.

Card.

Table.

Form.

Kanban.

Chart.

Sesuai kebutuhan bisnis.

---

# 3.11 Footer

Footer hanya digunakan bila diperlukan.

Contoh.

Pagination.

Summary.

Grand Total.

Footer tidak digunakan untuk navigasi utama.

---

# 3.12 Grid System

Gunakan Grid yang konsisten.

Desktop.

12 Columns.

Tablet.

8 Columns.

Mobile.

4 Columns.

Seluruh Layout mengikuti Grid ini.

---

# 3.13 Container Width

Gunakan Max Width yang konsisten.

Small.

Medium.

Large.

Full Width.

Dashboard menggunakan Full Width.

Form menggunakan Medium Width.

---

# 3.14 Page Spacing

Spacing antar Section konsisten.

Gunakan Design Token.

Tidak menggunakan margin acak.

---

# 3.15 Card Layout

Card digunakan untuk.

Summary.

Statistics.

Dashboard.

Customer Info.

Card bukan pengganti Table.

---

# 3.16 Split Layout

Beberapa halaman menggunakan Split Layout.

Contoh.

Customer 360.

Treatment Workspace.

Appointment Detail.

Master Detail.

Layout.

```
Left Panel

↓

Right Detail
```

---

# 3.17 Master Detail Layout

Gunakan Master Detail apabila.

List.

↓

Detail.

↓

Edit.

Contoh.

Customer.

Inventory.

Employee.

---

# 3.18 Workspace Layout

Workspace digunakan untuk proses operasional.

Contoh.

Treatment.

Production.

Inventory Adjustment.

Workspace memprioritaskan efisiensi.

---

# 3.19 Dashboard Layout

Dashboard terdiri dari.

Summary Cards.

Charts.

Activity.

Quick Actions.

Recent Items.

Dashboard bukan halaman transaksi.

---

# 3.20 Table Layout

Table memenuhi area Content.

Toolbar berada di atas.

Pagination berada di bawah.

Summary berada di Footer.

---

# 3.21 Form Layout

Form menggunakan maksimal dua kolom.

Desktop.

2 Columns.

Tablet.

1–2 Columns.

Mobile.

1 Column.

---

# 3.22 Dialog Layout

Dialog digunakan untuk.

Create.

Edit.

Confirmation.

Dialog tidak digunakan untuk proses panjang.

---

# 3.23 Drawer Layout

Drawer digunakan untuk.

Quick View.

Quick Edit.

Filter.

Detail Ringan.

Drawer bukan pengganti halaman Detail.

---

# 3.24 Full Page Workflow

Gunakan halaman penuh apabila proses kompleks.

Contoh.

Treatment.

Production.

Payroll.

Inventory Adjustment.

---

# 3.25 Sticky Header

Header.

Toolbar.

Table Header.

Dapat menggunakan Sticky Position.

Agar User tidak kehilangan konteks.

---

# 3.26 Sticky Action

Action utama.

Save.

Complete.

Submit.

Tetap terlihat ketika Form panjang.

---

# 3.27 Scroll Behavior

Sidebar.

Content.

Table.

Dialog.

Scroll secara independen.

Hindari Nested Scroll lebih dari dua level.

---

# 3.28 Empty Layout

Halaman kosong tetap memiliki.

Title.

Description.

CTA.

Illustration.

---

# 3.29 Loading Layout

Gunakan Skeleton.

Layout tidak boleh bergeser saat Loading selesai.

---

# 3.30 Responsive Layout

Desktop merupakan prioritas.

Tablet tetap nyaman.

Mobile tetap dapat digunakan.

Tidak ada fitur yang hilang pada Mobile.

---

# CHAPTER 3 SUMMARY

Layout System menjadi fondasi seluruh halaman NIAHAIR ERP.

Seluruh halaman harus menggunakan struktur yang sama.

App Shell.

↓

Page Header.

↓

Toolbar.

↓

Content.

↓

Footer.

Layout yang konsisten mengurangi beban belajar pengguna dan meningkatkan produktivitas operasional.

# CHAPTER 4 — COMPONENT STANDARDS

---

# 4.1 Purpose

Component Standards mendefinisikan seluruh komponen yang digunakan pada NIAHAIR ERP.

Tujuannya adalah.

- Konsistensi
- Reusability
- Predictability
- Accessibility
- Maintainability

Seluruh halaman harus menggunakan Component Library resmi.

Tidak diperbolehkan membuat komponen baru apabila fungsi yang sama sudah tersedia.

---

# 4.2 Component Principles

Semua Component harus.

Reusable.

Composable.

Accessible.

Responsive.

Themeable.

Business Friendly.

---

# 4.3 Component Hierarchy

Component dibagi menjadi empat level.

Primitive

↓

Base Component

↓

Business Component

↓

Page

Contoh.

Button

↓

IconButton

↓

AppointmentActionButton

↓

Appointment Detail Page

---

# 4.4 Primitive Components

Primitive merupakan komponen paling dasar.

Contoh.

Button.

Input.

Checkbox.

Radio.

Switch.

Textarea.

Select.

Badge.

Avatar.

Icon.

Divider.

Primitive tidak memiliki Business Logic.

---

# 4.5 Business Components

Business Component merupakan gabungan beberapa Primitive.

Contoh.

Customer Card.

Appointment Card.

Inventory Card.

Treatment Timeline.

Invoice Summary.

Staff Assignment.

Business Component boleh memiliki Business Logic ringan.

---

# 4.6 Button

Button merupakan Action utama.

Variant.

Primary.

Secondary.

Outline.

Ghost.

Danger.

Link.

Ukuran.

Small.

Medium.

Large.

Button tidak boleh memiliki lebih dari satu fungsi.

---

# 4.7 Icon Button

Gunakan hanya untuk Action yang sangat umum.

Contoh.

Edit.

Delete.

Refresh.

Download.

View.

Action penting tetap menggunakan Text.

---

# 4.8 Input

Input memiliki standar.

Label.

Placeholder.

Helper Text.

Error Message.

Required Indicator.

Semua Input menggunakan ukuran yang sama.

---

# 4.9 Textarea

Textarea digunakan untuk.

Notes.

Description.

Instructions.

Tidak digunakan untuk Input pendek.

---

# 4.10 Select

Select digunakan apabila pilihan sedikit.

Searchable Select digunakan apabila pilihan banyak.

Contoh.

Customer.

Employee.

Supplier.

---

# 4.11 Date Picker

Gunakan Date Picker standar.

Tanggal.

Tanggal + Jam.

Range.

Tidak menggunakan Input Text Manual.

---

# 4.12 Checkbox

Checkbox digunakan untuk Multiple Selection.

Bukan On/Off.

---

# 4.13 Switch

Switch digunakan untuk.

Enable.

Disable.

Active.

Inactive.

Switch tidak digunakan sebagai Confirmation.

---

# 4.14 Radio Button

Radio digunakan apabila User hanya dapat memilih satu pilihan.

---

# 4.15 Badge

Badge menunjukkan Status.

Contoh.

Booked.

Completed.

Paid.

Pending.

Cancelled.

Badge tidak digunakan sebagai tombol.

---

# 4.16 Chip

Chip digunakan untuk.

Tag.

Category.

Label.

Employee.

Service.

Chip dapat dihapus apabila bersifat editable.

---

# 4.17 Avatar

Avatar digunakan untuk.

Customer.

Employee.

User.

Jika foto tidak tersedia.

Gunakan Initial.

---

# 4.18 Card

Card digunakan untuk.

Summary.

Dashboard.

Customer Overview.

Quick Information.

Card bukan pengganti Table.

---

# 4.19 Table

Table merupakan komponen utama ERP.

Seluruh List Data menggunakan Table.

Table harus mendukung.

Sorting.

Filtering.

Pagination.

Search.

Column Visibility.

Bulk Selection.

Export.

Sticky Header.

---

# 4.20 Empty State

Empty State terdiri dari.

Illustration.

Title.

Description.

Primary Action.

Tidak boleh hanya menampilkan.

"No Data".

---

# 4.21 Loading State

Loading menggunakan.

Skeleton.

Button Loading.

Table Skeleton.

Card Skeleton.

Spinner hanya digunakan untuk proses singkat.

---

# 4.22 Dialog

Dialog digunakan untuk.

Confirmation.

Create.

Edit.

Delete.

Dialog tidak digunakan untuk Workflow panjang.

---

# 4.23 Drawer

Drawer digunakan untuk.

Quick Detail.

Quick Edit.

Filter.

Preview.

Drawer tidak menggantikan halaman Detail.

---

# 4.24 Tooltip

Tooltip digunakan untuk.

Penjelasan singkat.

Tooltip tidak boleh berisi informasi penting.

---

# 4.25 Popover

Popover digunakan untuk.

Quick Action.

Quick Menu.

Quick Filter.

Popover tidak digunakan untuk Form besar.

---

# 4.26 Toast

Toast digunakan untuk Feedback.

Success.

Warning.

Info.

Error.

Toast tidak digunakan untuk Error kritikal.

---

# 4.27 Alert

Alert digunakan untuk informasi penting.

Contoh.

Inventory Minus.

Payment Failed.

Treatment belum memiliki Staff.

Alert tetap terlihat sampai masalah diselesaikan.

---

# 4.28 Progress

Gunakan Progress apabila proses membutuhkan waktu lama.

Contoh.

Import.

Export.

Sync.

Upload.

---

# 4.29 Tabs

Tabs digunakan untuk membagi informasi.

Contoh.

Customer 360.

Overview.

Appointments.

Treatments.

Invoices.

Payments.

Timeline.

Tabs tidak digunakan untuk Navigation utama.

---

# 4.30 Accordion

Accordion digunakan apabila informasi bersifat opsional.

Jangan menyembunyikan informasi penting di dalam Accordion.

---

# 4.31 Timeline

Timeline digunakan untuk.

Customer Activity.

Appointment History.

Treatment Progress.

Inventory History.

Urutan selalu kronologis.

---

# 4.32 Statistic Card

Statistic Card digunakan pada Dashboard.

Maksimal menampilkan.

Value.

Label.

Trend.

Icon.

Tidak memasukkan terlalu banyak informasi.

---

# 4.33 Search

Search harus selalu mudah ditemukan.

Shortcut.

Ctrl + K (Future).

Search tidak disembunyikan.

---

# 4.34 Filter

Filter selalu berada dekat Search.

Filter aktif harus terlihat.

User harus mengetahui Filter yang sedang digunakan.

---

# 4.35 Pagination

Pagination berada di bawah Table.

User dapat memilih.

Page Size.

Current Page.

Total Records.

---

# 4.36 Action Menu

Action sekunder ditempatkan pada.

More Menu.

(⋮)

Action utama tetap terlihat.

---

# 4.37 Confirmation Dialog

Action berbahaya wajib memiliki Confirmation.

Delete.

Void.

Refund.

Inventory Adjustment.

Payroll Close.

---

# 4.38 Component Naming

Gunakan nama yang konsisten.

CustomerCard.

InvoiceTable.

TreatmentTimeline.

InventoryBadge.

Bukan.

Card1.

Card2.

TableNew.

---

# 4.39 Component Documentation

Seluruh Component memiliki.

Purpose.

Props.

Example.

Accessibility.

Usage.

---

# 4.40 Component Evolution

Component baru hanya boleh dibuat apabila.

Belum tersedia.

Memiliki kebutuhan bisnis yang jelas.

Tidak menduplikasi Component yang sudah ada.

---

# CHAPTER 4 SUMMARY

Seluruh UI NIAHAIR ERP dibangun menggunakan Component Library resmi.

Prinsip utama.

- Reusable
- Consistent
- Accessible
- Predictable
- Business First

Component adalah fondasi seluruh antarmuka ERP dan harus digunakan secara konsisten di setiap modul.

# CHAPTER 5 — FORM GUIDELINES

---

# 5.1 Purpose

Form merupakan media utama pengguna untuk membuat, mengubah, dan memperbarui data pada NIAHAIR ERP.

Seluruh Form harus mengikuti standar yang sama agar pengguna dapat bekerja dengan cepat, akurat, dan konsisten.

Form bukan sekadar kumpulan Input.

Form merupakan representasi Business Process.

---

# 5.2 Form Principles

Seluruh Form mengikuti prinsip.

Consistency.

Readability.

Validation.

Accessibility.

Efficiency.

---

# 5.3 Form Structure

Setiap Form memiliki struktur.

Page Title

↓

Description (Optional)

↓

Form Section

↓

Input Group

↓

Action Bar

---

# 5.4 Form Width

Gunakan lebar yang sesuai.

Small.

Configuration.

Medium.

Master Data.

Large.

Complex Form.

Full Width.

Workspace.

Jangan membuat Form terlalu lebar.

---

# 5.5 Form Section

Form panjang dibagi menjadi beberapa Section.

Contoh.

Customer.

General Information.

↓

Contact.

↓

Membership.

↓

Notes.

Section membantu User memahami struktur data.

---

# 5.6 Field Order

Urutan Field mengikuti cara berpikir pengguna.

Contoh.

Customer Name

↓

Phone

↓

Email

↓

Address

↓

Notes

Bukan berdasarkan urutan database.

---

# 5.7 Label

Seluruh Input memiliki Label.

Label berada di atas Input.

Label harus singkat.

Jelas.

Tidak menggunakan singkatan yang tidak umum.

---

# 5.8 Required Field

Field wajib memiliki indikator.

*

Indikator harus konsisten.

Jangan menggunakan warna saja.

---

# 5.9 Optional Field

Field opsional tidak perlu diberi tanda.

Cukup tampil normal.

---

# 5.10 Placeholder

Placeholder memberikan contoh.

Bukan penjelasan.

Benar.

081234567890

Salah.

Masukkan nomor telepon Anda.

---

# 5.11 Helper Text

Helper Text digunakan apabila diperlukan.

Contoh.

Password minimal 8 karakter.

Helper Text berada di bawah Input.

---

# 5.12 Validation

Validation dilakukan.

Frontend.

↓

Backend.

Frontend membantu User.

Backend menjaga Business Rule.

---

# 5.13 Error Message

Error harus spesifik.

Benar.

Nomor telepon sudah digunakan.

Salah.

Validation Failed.

---

# 5.14 Real-Time Validation

Validation sederhana dilakukan saat mengetik.

Contoh.

Email.

Phone.

Required.

Business Validation tetap dilakukan saat Submit.

---

# 5.15 Disabled Field

Field Disabled digunakan apabila.

Tidak dapat diubah.

Tetapi tetap perlu dilihat.

---

# 5.16 Read Only

Read Only berbeda dengan Disabled.

Read Only tetap dapat dipilih dan disalin.

---

# 5.17 Auto Focus

Field pertama mendapatkan Focus otomatis.

Kecuali apabila proses bisnis menentukan field lain.

---

# 5.18 Keyboard Navigation

User dapat berpindah menggunakan.

Tab.

Shift + Tab.

Enter (bila sesuai).

Tidak boleh memaksa penggunaan Mouse.

---

# 5.19 Default Value

Default Value hanya digunakan apabila.

Sebagian besar transaksi menggunakan nilai yang sama.

---

# 5.20 Auto Complete

Gunakan Auto Complete untuk.

Customer.

Employee.

Supplier.

Service.

Item.

Jangan memaksa User memilih dari daftar panjang.

---

# 5.21 Searchable Select

Gunakan Searchable Select apabila pilihan lebih dari 20 data.

---

# 5.22 Date Picker

Seluruh tanggal menggunakan Date Picker.

Tidak menggunakan Input Text.

---

# 5.23 Number Input

Number Input memiliki.

Format.

Separator.

Decimal sesuai kebutuhan.

Tidak menerima karakter selain angka.

---

# 5.24 Currency Input

Currency menggunakan format mata uang.

Nilai tetap disimpan sebagai Decimal.

---

# 5.25 Phone Number

Phone Number menggunakan format nasional.

Backend melakukan normalisasi.

---

# 5.26 Address

Address menggunakan Textarea.

Bukan Input satu baris.

---

# 5.27 Notes

Notes selalu berada di bagian akhir Form.

---

# 5.28 Upload

Upload menampilkan.

Preview.

Progress.

Ukuran file.

Tipe file.

Error apabila gagal.

---

# 5.29 Save Button

Primary Action selalu berada di kanan bawah.

Label.

Save.

Create.

Update.

Complete.

---

# 5.30 Cancel Button

Cancel berada di kiri Primary Action.

Cancel tidak menggunakan warna merah.

---

# 5.31 Delete Button

Delete dipisahkan dari Save.

Menggunakan Danger Variant.

---

# 5.32 Confirmation

Delete.

Void.

Complete.

Refund.

Inventory Adjustment.

Payroll Close.

Harus memiliki Confirmation Dialog.

---

# 5.33 Unsaved Changes

Apabila User keluar.

↓

Ada perubahan.

↓

Tampilkan Warning.

---

# 5.34 Auto Save

Future.

Auto Save hanya digunakan pada.

Notes.

Draft.

Long Form.

Tidak digunakan pada transaksi finansial.

---

# 5.35 Form Loading

Gunakan Skeleton.

Input tidak meloncat setelah data selesai dimuat.

---

# 5.36 Submit Loading

Saat Submit.

Button berubah menjadi Loading.

User tidak dapat Submit dua kali.

---

# 5.37 Success Feedback

Setelah berhasil.

Tampilkan.

Toast.

↓

Redirect (bila perlu).

↓

Refresh Data.

---

# 5.38 Form Accessibility

Semua Field memiliki.

Label.

Focus State.

Keyboard Navigation.

ARIA Label bila diperlukan.

---

# 5.39 Form Documentation

Seluruh Form kompleks memiliki dokumentasi.

Business Purpose.

Field.

Validation.

Workflow.

---

# 5.40 Form Evolution

Form baru harus mengikuti Guideline ini.

Tidak boleh membuat pola baru tanpa persetujuan Design System.

---

# CHAPTER 5 SUMMARY

Seluruh Form pada NIAHAIR ERP harus mengikuti standar yang sama.

Prinsip utama.

- Mudah dipahami.
- Cepat diisi.
- Konsisten.
- Aman.
- Terintegrasi dengan Business Rule.

Form yang baik mengurangi kesalahan input, mempercepat operasional, dan meningkatkan kualitas data di seluruh ERP.

# CHAPTER 6 — TABLE & DATA GRID GUIDELINES

---

# 6.1 Purpose

Table merupakan komponen utama pada NIAHAIR ERP.

Sebagian besar aktivitas pengguna dilakukan melalui Table.

Contoh.

Customer.

Employee.

Inventory.

Invoice.

Payment.

Production.

Purchase.

Payroll.

Table harus cepat.

Mudah dipahami.

Mudah dicari.

Mudah difilter.

Mudah dipindai.

---

# 6.2 Table Principles

Seluruh Table mengikuti prinsip.

Consistency.

Scanability.

Performance.

Accessibility.

Predictability.

---

# 6.3 Standard Table Layout

Urutan standar.

Page Header

↓

Toolbar

↓

Data Table

↓

Pagination

↓

Summary (Optional)

Tidak boleh mengubah urutan ini.

---

# 6.4 Toolbar

Toolbar selalu berada di atas Table.

Toolbar berisi.

Search.

Filter.

Sort.

Column.

Export.

Bulk Action.

Refresh.

Action utama berada di kanan.

---

# 6.5 Search

Search selalu berada di kiri.

Search melakukan.

Debounce.

Placeholder.

```
Cari Customer...
Cari Invoice...
Cari Barang...
```

Search tidak boleh disembunyikan.

---

# 6.6 Filter

Filter berada di sebelah Search.

Filter aktif selalu terlihat.

Contoh.

```
Status : Paid

Branch : Jakarta

Month : June
```

User harus mengetahui Filter yang sedang digunakan.

---

# 6.7 Sorting

Sorting dilakukan melalui Header.

Gunakan icon.

▲

▼

Sorting hanya satu kolom.

Kecuali kebutuhan khusus.

---

# 6.8 Column Order

Urutan.

Selection.

↓

Primary Information.

↓

Secondary Information.

↓

Status.

↓

Date.

↓

Action.

Kolom Action selalu paling kanan.

---

# 6.9 Sticky Header

Header Table menggunakan Sticky.

User tidak kehilangan nama kolom ketika Scroll.

---

# 6.10 Sticky Action Column

Action Column tetap terlihat.

Terutama pada Table yang memiliki banyak kolom.

---

# 6.11 Row Height

Gunakan tiga Density.

Compact.

Default.

Comfortable.

Default digunakan pada sebagian besar halaman.

---

# 6.12 Zebra Stripe

Tidak wajib.

Gunakan hanya apabila Table sangat panjang.

---

# 6.13 Row Hover

Hover hanya memberikan Highlight ringan.

Tidak mengubah warna secara drastis.

---

# 6.14 Row Click

Apabila Row dapat dibuka.

Seluruh Row dapat diklik.

Tidak hanya tombol kecil.

---

# 6.15 Selection

Gunakan Checkbox.

Single.

Multiple.

Select All.

Selection harus konsisten.

---

# 6.16 Bulk Action

Bulk Action muncul hanya ketika ada Row yang dipilih.

Contoh.

Delete.

Export.

Assign.

Move Branch.

---

# 6.17 Empty Table

Empty State terdiri dari.

Illustration.

Title.

Description.

Primary Action.

Tidak hanya.

"No Data".

---

# 6.18 Loading

Gunakan Skeleton Row.

Jangan Spinner besar.

Layout tidak boleh berubah.

---

# 6.19 Pagination

Pagination berada di bawah.

Menampilkan.

Current Page.

Total Page.

Page Size.

Total Record.

---

# 6.20 Infinite Scroll

Tidak digunakan.

Kecuali.

Timeline.

Activity Feed.

Notification.

---

# 6.21 Responsive Table

Desktop.

Gunakan Table.

Tablet.

Table atau Card.

Mobile.

Card Layout.

Bukan Scroll Horizontal panjang.

---

# 6.22 Column Visibility

User dapat.

Hide.

Show.

Reorder.

Kolom.

Preferensi disimpan.

---

# 6.23 Frozen Column

Kolom utama dapat di-Freeeze.

Contoh.

Customer Name.

Item Name.

Invoice Number.

---

# 6.24 Status Display

Status menggunakan Badge.

Booked.

Completed.

Paid.

Cancelled.

Void.

Status tidak menggunakan Text biasa.

---

# 6.25 Numeric Alignment

Angka rata kanan.

Text rata kiri.

Tanggal rata kiri.

Currency rata kanan.

---

# 6.26 Currency Format

Currency selalu menggunakan format resmi.

```
Rp 1.250.000
```

Tidak menggunakan.

1250000

---

# 6.27 Date Format

Gunakan format yang konsisten.

```
28 Jun 2026

28 Jun 2026
14:30
```

---

# 6.28 Action Column

Action utama.

View.

Edit.

Action sekunder.

More Menu.

(⋮)

---

# 6.29 Export

Table mendukung.

Excel.

CSV.

PDF (Future).

Export mengikuti Filter aktif.

---

# 6.30 Refresh

Refresh berada pada Toolbar.

Tidak melakukan Refresh seluruh halaman.

---

# 6.31 Column Resize

Future.

User dapat mengubah lebar kolom.

---

# 6.32 Keyboard Navigation

Gunakan.

Arrow.

Tab.

Enter.

Space.

Apabila memungkinkan.

---

# 6.33 Accessibility

Header memiliki Scope.

Table dapat dibaca Screen Reader.

Kontras memenuhi standar.

---

# 6.34 Performance

Table besar menggunakan.

Pagination.

Virtual Scroll (jika diperlukan).

Lazy Render.

---

# 6.35 Data Density

ERP menggunakan Medium Density.

Tidak terlalu rapat.

Tidak terlalu longgar.

---

# 6.36 Summary Row

Summary digunakan apabila.

Grand Total.

Total Qty.

Total Payment.

Summary selalu berada di bawah.

---

# 6.37 Color Usage

Warna hanya digunakan untuk.

Status.

Warning.

Selection.

Hover.

Tidak mewarnai seluruh baris tanpa alasan.

---

# 6.38 Table Documentation

Seluruh Business Table memiliki.

Purpose.

Columns.

Filters.

Sorting.

Actions.

---

# 6.39 Standard Data Grid

Semua halaman menggunakan satu DataGrid Component.

Tidak membuat implementasi Table baru.

---

# 6.40 Table Evolution

Perubahan Table harus dilakukan pada Component Library.

Bukan pada setiap halaman.

---

# CHAPTER 6 SUMMARY

Table merupakan komponen utama NIAHAIR ERP.

Semua Table mengikuti standar.

- Search
- Filter
- Sort
- Pagination
- Export
- Selection
- Bulk Action
- Responsive
- Accessibility

Konsistensi Data Grid mempercepat operasional dan mengurangi waktu belajar pengguna.

# CHAPTER 7 — DASHBOARD & WORKSPACE GUIDELINES

---

# 7.1 Purpose

Dashboard dan Workspace memiliki tujuan yang berbeda.

Dashboard digunakan untuk.

Melihat.

Memantau.

Menganalisis.

Mengambil keputusan.

Workspace digunakan untuk.

Bekerja.

Memproses transaksi.

Menyelesaikan tugas.

Mengubah data.

Keduanya tidak boleh memiliki tujuan yang sama.

---

# 7.2 Dashboard Philosophy

Dashboard menjawab pertanyaan.

"Apa yang sedang terjadi?"

Workspace menjawab pertanyaan.

"Apa yang harus saya kerjakan?"

---

# 7.3 Dashboard Principles

Dashboard harus.

Cepat dipahami.

Sedikit klik.

Ringkas.

Berbasis KPI.

Tidak menjadi halaman transaksi.

---

# 7.4 Workspace Principles

Workspace harus.

Cepat.

Minim klik.

Data padat.

Keyboard Friendly.

Tidak dipenuhi grafik.

---

# 7.5 Dashboard Structure

Urutan Dashboard.

Page Header

↓

Date / Branch Selector

↓

KPI Cards

↓

Charts

↓

Recent Activity

↓

Quick Actions

↓

Alerts

↓

Recent Transactions

---

# 7.6 Workspace Structure

Urutan Workspace.

Header

↓

Toolbar

↓

Working Area

↓

Detail Panel

↓

Action Bar

Workspace memprioritaskan efisiensi dibanding estetika.

---

# 7.7 KPI Cards

KPI Card hanya menampilkan.

Title.

Value.

Trend.

Comparison.

Icon.

Tidak lebih dari lima informasi.

---

# 7.8 Charts

Chart digunakan untuk.

Trend.

Perbandingan.

Distribusi.

Bukan untuk menampilkan angka mentah.

---

# 7.9 Dashboard Filters

Filter Dashboard.

Branch.

Tanggal.

Employee.

Category.

Semua Widget mengikuti Filter yang sama.

---

# 7.10 Widget

Dashboard terdiri dari Widget.

Widget bersifat independen.

Setiap Widget dapat dimuat sendiri.

Jika satu Widget gagal.

Dashboard tetap berjalan.

---

# 7.11 Quick Actions

Quick Action merupakan shortcut.

Contoh.

Tambah Customer.

Booking Baru.

Invoice Baru.

Terima Pembayaran.

Quick Action tidak lebih dari 8 tombol.

---

# 7.12 Alert Panel

Alert digunakan untuk.

Appointment hari ini.

Inventory hampir habis.

Invoice Overdue.

Payroll belum diproses.

Sinkronisasi gagal.

Alert selalu ditempatkan di bagian atas Dashboard.

---

# 7.13 Recent Activity

Activity menampilkan histori terbaru.

Appointment.

Treatment.

Payment.

Inventory.

Activity bersifat kronologis.

---

# 7.14 Dashboard Density

Dashboard tidak boleh terlalu padat.

Gunakan maksimal.

4 KPI per baris.

2 Chart per baris.

---

# 7.15 Workspace Density

Workspace menggunakan Medium hingga High Density.

Prioritas.

Informasi.

Kecepatan.

Efisiensi.

---

# 7.16 Master Detail Workspace

Workspace kompleks menggunakan pola.

List.

↓

Detail.

↓

Action.

Contoh.

Customer 360.

Inventory.

Treatment.

---

# 7.17 Multi Panel Layout

Workspace dapat menggunakan.

Left Panel.

Center Panel.

Right Panel.

Namun maksimal tiga panel.

---

# 7.18 Context Preservation

Saat berpindah Detail.

Filter.

Scroll.

Selection.

Tetap dipertahankan selama memungkinkan.

---

# 7.19 Sticky Actions

Action penting selalu terlihat.

Contoh.

Save.

Complete Treatment.

Create Invoice.

Receive Payment.

---

# 7.20 Workspace Status

Status proses harus selalu terlihat.

Booked.

Checked In.

In Progress.

Completed.

Cancelled.

Tidak boleh disembunyikan.

---

# 7.21 Dashboard Refresh

Dashboard menggunakan Auto Refresh.

Interval dapat dikonfigurasi.

User tetap dapat melakukan Manual Refresh.

---

# 7.22 Real-Time Data

Data yang memerlukan Real-Time.

Daily Board.

Treatment Active.

Queue.

Menggunakan Auto Refresh atau WebSocket (Future).

Dashboard analitik tidak memerlukan Real-Time.

---

# 7.23 Dashboard Performance

Dashboard harus selesai dimuat.

Target.

Kurang dari 2 detik.

Widget dimuat secara paralel.

---

# 7.24 Empty Dashboard

Jika belum ada data.

Dashboard tetap memberikan.

Ringkasan.

Panduan.

CTA.

---

# 7.25 Workspace Validation

Workspace tidak boleh mengizinkan proses yang melanggar Business Rules.

Contoh.

Complete Treatment tanpa Staff.

Invoice tanpa Customer.

Inventory Minus.

---

# 7.26 Workspace Navigation

User dapat berpindah antar data tanpa kembali ke halaman List.

Contoh.

Customer.

↓

Next.

↓

Previous.

---

# 7.27 Split View

Gunakan Split View apabila User membutuhkan.

List.

↓

Preview.

↓

Edit.

Tidak membuka banyak halaman.

---

# 7.28 Dashboard Personalization

Future.

User dapat mengatur.

Widget.

Urutan.

Ukuran.

Dashboard pribadi.

---

# 7.29 Workspace Documentation

Workspace kompleks harus memiliki.

Workflow.

Shortcut.

Business Rule.

Validation.

---

# 7.30 Dashboard & Workspace Evolution

Dashboard digunakan untuk Monitoring.

Workspace digunakan untuk Operasional.

Keduanya berkembang secara independen.

Tidak saling menggantikan.

---

# CHAPTER 7 SUMMARY

Dashboard dan Workspace memiliki tanggung jawab yang berbeda.

Dashboard berfungsi untuk.

- Monitoring
- Analytics
- KPI
- Insight

Workspace berfungsi untuk.

- Operasional
- Transaksi
- Editing
- Penyelesaian pekerjaan

Seluruh modul NIAHAIR ERP harus memilih salah satu pola tersebut agar antarmuka tetap konsisten dan produktif.

# CHAPTER 8 — INTERACTION GUIDELINES

---

# 8.1 Purpose

Interaction Guidelines mendefinisikan bagaimana pengguna berinteraksi dengan seluruh antarmuka NIAHAIR ERP.

Interaction meliputi.

- Mouse
- Keyboard
- Touch
- Feedback
- Navigation
- Confirmation
- Loading
- Animation

Interaction harus membantu pengguna bekerja lebih cepat.

Bukan memperlambat pekerjaan.

---

# 8.2 Interaction Principles

Seluruh Interaction mengikuti prinsip.

Fast.

Predictable.

Consistent.

Minimal.

Forgiving.

---

# 8.3 Click Behavior

Satu klik.

↓

Satu aksi.

Double Click tidak digunakan kecuali benar-benar diperlukan.

---

# 8.4 Hover

Hover digunakan untuk.

Highlight.

Tooltip.

Preview ringan.

Hover tidak boleh menjadi satu-satunya cara mengakses informasi penting.

---

# 8.5 Focus

Seluruh komponen memiliki Focus State.

Focus harus terlihat jelas.

Keyboard User harus mengetahui posisi saat ini.

---

# 8.6 Active State

Button.

Menu.

Tab.

Card.

Memiliki Active State yang konsisten.

---

# 8.7 Disabled State

Disabled berarti.

Tidak dapat digunakan.

Alasan Disabled sebaiknya dapat diketahui User.

Contoh.

Tooltip.

---

# 8.8 Success Feedback

Setelah aksi berhasil.

Berikan Feedback.

Contoh.

Toast.

Badge berubah.

Status berubah.

Redirect bila diperlukan.

---

# 8.9 Error Feedback

Error harus menjelaskan.

Apa yang salah.

Mengapa.

Bagaimana memperbaikinya.

---

# 8.10 Warning Feedback

Warning digunakan apabila.

Aksi masih dapat dilanjutkan.

Namun memiliki risiko.

Contoh.

Inventory hampir habis.

---

# 8.11 Confirmation

Confirmation hanya digunakan pada aksi yang sulit dibatalkan.

Contoh.

Delete.

Void.

Refund.

Payroll Close.

Inventory Adjustment.

---

# 8.12 Undo

Apabila memungkinkan.

Gunakan Undo.

Lebih baik daripada Confirmation.

Namun transaksi finansial tetap menggunakan Confirmation.

---

# 8.13 Keyboard First

ERP mendukung Keyboard.

Shortcut.

Tab.

Enter.

Esc.

Arrow.

Space.

Ctrl.

---

# 8.14 Standard Keyboard Shortcuts

Shortcut standar.

Ctrl + S.

Save.

Ctrl + F.

Search.

Ctrl + K.

Global Search.

Esc.

Close Dialog.

Enter.

Submit.

Tab.

Next Field.

Shift + Tab.

Previous Field.

---

# 8.15 Search Interaction

Search menggunakan Debounce.

Search Result muncul cepat.

Search dapat dibersihkan dengan satu klik.

---

# 8.16 Filter Interaction

Filter aktif selalu terlihat.

Reset Filter cukup satu tombol.

---

# 8.17 Selection

Checkbox.

Shift Select (Future).

Select All.

Selection selalu terlihat.

---

# 8.18 Drag and Drop

Drag & Drop hanya digunakan apabila benar-benar meningkatkan produktivitas.

Contoh.

Daily Board.

Production Queue.

Tidak digunakan pada Form.

---

# 8.19 Resize

Future.

Table Column.

Drawer.

Sidebar.

Dapat diubah ukurannya.

---

# 8.20 Inline Editing

Gunakan Inline Editing hanya untuk data sederhana.

Contoh.

Notes.

Priority.

Status.

Tidak untuk transaksi kompleks.

---

# 8.21 Auto Save

Auto Save hanya digunakan pada.

Draft.

Notes.

Description.

Tidak digunakan pada.

Invoice.

Payment.

Payroll.

---

# 8.22 Loading Interaction

Loading tidak boleh memblokir seluruh halaman apabila tidak diperlukan.

Gunakan.

Skeleton.

Inline Loading.

Button Loading.

---

# 8.23 Skeleton

Skeleton mengikuti bentuk konten asli.

Layout tidak berubah setelah data selesai dimuat.

---

# 8.24 Progress

Progress digunakan pada.

Import.

Export.

Upload.

Sync.

Production.

User mengetahui estimasi proses.

---

# 8.25 Toast

Toast muncul.

Kanan atas.

Menghilang otomatis.

Tidak menutupi informasi penting.

---

# 8.26 Modal

Modal harus mudah ditutup.

Esc.

Cancel.

Close Button.

Klik di luar bila aman.

---

# 8.27 Drawer

Drawer mempertahankan konteks halaman.

User tidak kehilangan posisi.

---

# 8.28 Navigation

Back selalu kembali ke konteks sebelumnya.

Bukan selalu ke Dashboard.

---

# 8.29 Breadcrumb

Gunakan Breadcrumb pada halaman bertingkat.

Contoh.

Customer.

↓

Appointment.

↓

Treatment.

---

# 8.30 Context Preservation

Filter.

Search.

Pagination.

Scroll.

Selection.

Dipertahankan ketika kembali ke halaman sebelumnya.

---

# 8.31 Multi Step Workflow

Gunakan Wizard apabila proses terdiri dari beberapa langkah.

Contoh.

Import Data.

Production.

Setup.

---

# 8.32 Notification

Notification tidak boleh mengganggu pekerjaan.

Prioritas.

Critical.

Warning.

Info.

Success.

---

# 8.33 Sound

Future.

Sound hanya digunakan untuk.

Antrian.

Appointment.

Emergency Alert.

Tidak digunakan pada setiap aksi.

---

# 8.34 Animation

Animasi maksimal.

200 ms.

Animasi membantu memahami perubahan.

Bukan dekorasi.

---

# 8.35 Transition

Gunakan Transition yang konsisten.

Fade.

Slide.

Scale ringan.

---

# 8.36 Refresh

Refresh Data.

Tidak me-reset.

Search.

Filter.

Pagination.

---

# 8.37 Retry

Apabila proses gagal.

User dapat Retry tanpa mengulang seluruh proses.

---

# 8.38 Offline Behavior

Future.

Apabila koneksi terputus.

User mendapatkan informasi yang jelas.

Data Draft tetap tersimpan.

---

# 8.39 Accessibility Interaction

Seluruh Interaction dapat dilakukan menggunakan Keyboard.

Hover bukan satu-satunya cara mengakses fitur.

---

# 8.40 Interaction Evolution

Seluruh pola Interaction baru harus mengikuti Guideline ini.

Tidak membuat perilaku baru tanpa alasan bisnis.

---

# CHAPTER 8 SUMMARY

Seluruh Interaction pada NIAHAIR ERP mengikuti prinsip.

- Fast
- Predictable
- Consistent
- Keyboard Friendly
- Accessible
- Recoverable

Interaction yang baik mengurangi kesalahan, mempercepat pekerjaan, dan membuat ERP nyaman digunakan sepanjang hari.

# CHAPTER 9 — RESPONSIVE & ADAPTIVE DESIGN

---

# 9.1 Purpose

Responsive Design memastikan seluruh modul NIAHAIR ERP dapat digunakan pada berbagai ukuran layar tanpa mengubah Business Workflow.

Target utama.

Desktop.

Laptop.

Tablet.

Mobile.

Desktop tetap menjadi prioritas utama.

---

# 9.2 Responsive Philosophy

NIAHAIR merupakan ERP.

Bukan Mobile App.

Prioritas.

Desktop First.

↓

Tablet.

↓

Mobile.

Seluruh Business Process dirancang terlebih dahulu untuk Desktop.

---

# 9.3 Breakpoints

Gunakan breakpoint yang konsisten.

```
Mobile

< 640 px

Tablet

640 - 1023 px

Laptop

1024 - 1439 px

Desktop

≥ 1440 px
```

Tidak menggunakan breakpoint acak.

---

# 9.4 Desktop Layout

Desktop menggunakan.

Sidebar.

Top Navigation.

Toolbar.

Multi Column.

Split Panel.

Desktop merupakan pengalaman utama.

---

# 9.5 Tablet Layout

Tablet mempertahankan seluruh fitur.

Namun Layout dapat berubah.

2 Column.

↓

1 Column.

Sidebar dapat Collapse.

---

# 9.6 Mobile Layout

Mobile tetap mendukung seluruh Business Rule.

Namun Layout disederhanakan.

Card.

Accordion.

Bottom Sheet.

Tidak menghilangkan fitur penting.

---

# 9.7 Progressive Adaptation

Layout berubah secara bertahap.

Tidak mengganti seluruh halaman.

User tetap mengenali struktur aplikasi.

---

# 9.8 Sidebar

Desktop.

Expanded.

Tablet.

Collapsed.

Mobile.

Hidden.

Drawer Navigation.

---

# 9.9 Toolbar

Desktop.

Semua Action terlihat.

Tablet.

Action sekunder dipindahkan.

Mobile.

Overflow Menu.

---

# 9.10 Table

Desktop.

Table penuh.

Tablet.

Table atau Compact Table.

Mobile.

Card List.

Business Rule tetap sama.

---

# 9.11 Dashboard

Desktop.

Grid.

Tablet.

2 Column.

Mobile.

1 Column.

Widget tetap sama.

---

# 9.12 Form

Desktop.

2 Column.

Tablet.

1–2 Column.

Mobile.

1 Column.

Label tetap berada di atas Input.

---

# 9.13 Dialog

Desktop.

Centered Dialog.

Tablet.

Medium Dialog.

Mobile.

Bottom Sheet atau Full Screen Dialog.

---

# 9.14 Drawer

Desktop.

Side Drawer.

Tablet.

Overlay Drawer.

Mobile.

Bottom Sheet.

---

# 9.15 Navigation

Desktop.

Sidebar.

Tablet.

Collapsed Sidebar.

Mobile.

Drawer Navigation.

---

# 9.16 Typography

Typography tetap menggunakan Design Token.

Tidak membuat ukuran font berbeda untuk setiap Device.

---

# 9.17 Touch Target

Seluruh komponen pada Tablet dan Mobile.

Minimal.

44 × 44 px.

---

# 9.18 Spacing

Spacing mengikuti Design Token.

Mobile menggunakan spacing lebih rapat.

Namun tetap nyaman disentuh.

---

# 9.19 Images

Image menyesuaikan ukuran layar.

Tidak melakukan Stretch.

Gunakan Lazy Loading.

---

# 9.20 Customer 360

Desktop.

3 Panel.

Tablet.

2 Panel.

Mobile.

Tab Navigation.

---

# 9.21 Daily Board

Desktop.

Kanban penuh.

Tablet.

Compact Kanban.

Mobile.

Status Tab.

Card List.

---

# 9.22 Treatment Workspace

Desktop.

Split View.

Tablet.

Vertical Stack.

Mobile.

Section per Tab.

---

# 9.23 Inventory

Desktop.

Data Grid.

Tablet.

Compact Grid.

Mobile.

Card List.

---

# 9.24 Dashboard Cards

Jumlah Card.

Desktop.

4–6.

Tablet.

2–3.

Mobile.

1.

---

# 9.25 Charts

Chart tetap tersedia.

Mobile menggunakan tinggi lebih kecil.

Tidak menghilangkan informasi.

---

# 9.26 Floating Action Button

Future.

FAB hanya digunakan pada Mobile.

Tidak digunakan pada Desktop.

---

# 9.27 Sticky Action

Save.

Complete.

Submit.

Tetap terlihat pada layar kecil.

---

# 9.28 Orientation

Landscape.

Diprioritaskan.

Portrait tetap didukung.

---

# 9.29 Keyboard

Desktop menggunakan Keyboard Shortcut.

Tablet dan Mobile mengutamakan Touch.

---

# 9.30 Performance

Responsive tidak boleh menambah beban.

Gunakan.

Lazy Loading.

Code Splitting.

Responsive Image.

---

# 9.31 Adaptive Components

Component dapat berubah.

Table.

↓

Card.

Dialog.

↓

Bottom Sheet.

Sidebar.

↓

Drawer.

Business Logic tetap sama.

---

# 9.32 Accessibility

Responsive tetap memenuhi.

Keyboard.

Contrast.

Touch Target.

Screen Reader.

---

# 9.33 Testing

Semua halaman diuji pada.

Desktop.

Laptop.

Tablet.

Mobile.

Landscape.

Portrait.

---

# 9.34 Device Support

Target utama.

Windows.

macOS.

Android.

iPadOS.

iOS.

Browser modern.

---

# 9.35 Responsive Documentation

Setiap halaman kompleks memiliki dokumentasi.

Desktop Layout.

Tablet Layout.

Mobile Layout.

---

# 9.36 Future Device

Future.

Foldable Device.

Large Tablet.

Touch Screen POS.

Dual Screen.

---

# 9.37 Responsive Principle

Business Workflow tidak berubah.

Yang berubah hanya Layout.

---

# 9.38 Adaptive Navigation

Navigation selalu mudah dijangkau.

Tidak lebih dari dua langkah menuju halaman utama.

---

# 9.39 Responsive Evolution

Perubahan Responsive mengikuti Guideline ini.

Tidak membuat Layout baru tanpa alasan bisnis.

---

# 9.40 Responsive Summary

NIAHAIR menggunakan filosofi.

Desktop First.

Responsive Always.

Adaptive Layout.

Business Workflow Consistency.

Seluruh modul harus tetap mudah digunakan pada berbagai perangkat tanpa mengubah perilaku bisnis.

---

# CHAPTER 9 SUMMARY

Responsive Design memastikan seluruh ERP bekerja pada berbagai ukuran layar.

Prinsip utama.

✓ Desktop First

✓ Responsive Always

✓ Business Workflow Consistent

✓ Adaptive Components

✓ Mobile Friendly

✓ Tablet Ready

✓ Future Device Ready

Layout boleh berubah.

Business Rule tidak boleh berubah.

# CHAPTER 10 — ACCESSIBILITY & INCLUSIVE DESIGN

---

# 10.1 Purpose

Accessibility memastikan seluruh pengguna dapat menggunakan NIAHAIR ERP dengan nyaman, efisien, dan aman.

Accessibility bukan hanya untuk penyandang disabilitas.

Accessibility meningkatkan produktivitas seluruh pengguna.

---

# 10.2 Accessibility Principles

Seluruh antarmuka mengikuti prinsip.

Perceivable.

Operable.

Understandable.

Robust.

Mengacu pada WCAG 2.2 AA sebagai target minimum.

---

# 10.3 Keyboard First

Seluruh fitur ERP harus dapat digunakan menggunakan Keyboard.

User tidak boleh dipaksa menggunakan Mouse.

---

# 10.4 Focus Indicator

Semua komponen interaktif memiliki Focus Indicator yang jelas.

Focus tidak boleh dihilangkan menggunakan CSS.

---

# 10.5 Tab Order

Urutan Tab mengikuti urutan visual.

Tidak boleh meloncat secara acak.

---

# 10.6 Keyboard Shortcut

Shortcut standar.

Ctrl + K.

Global Search.

Ctrl + S.

Save.

Esc.

Close Dialog.

Tab.

Next Field.

Shift + Tab.

Previous Field.

Enter.

Submit.

Shortcut tidak boleh bertabrakan.

---

# 10.7 Screen Reader

Seluruh komponen penting memiliki.

Accessible Name.

Accessible Description.

ARIA Label bila diperlukan.

---

# 10.8 Color Independence

Informasi tidak boleh disampaikan hanya menggunakan warna.

Contoh.

Status Error.

Harus memiliki.

Icon.

Text.

Color.

---

# 10.9 Contrast Ratio

Seluruh teks memenuhi kontras minimum WCAG AA.

Background dan Foreground harus mudah dibaca.

---

# 10.10 Font Size

Body Text minimal.

16 px.

Caption.

14 px.

Tidak menggunakan ukuran terlalu kecil.

---

# 10.11 Click Target

Seluruh tombol memiliki ukuran minimum.

44 × 44 px.

Terutama pada Tablet dan Mobile.

---

# 10.12 Form Accessibility

Seluruh Input memiliki.

Label.

Error Message.

Helper Text.

Required Indicator.

Tidak menggunakan Placeholder sebagai Label.

---

# 10.13 Error Accessibility

Error dibacakan oleh Screen Reader.

Field Error mendapatkan Focus.

---

# 10.14 Dialog Accessibility

Dialog memiliki.

Title.

Description.

Focus Trap.

Esc untuk menutup.

Focus kembali ke elemen sebelumnya setelah Dialog ditutup.

---

# 10.15 Table Accessibility

Header menggunakan.

scope="col"

Table dapat dibaca Screen Reader.

Sorting diumumkan.

---

# 10.16 Icon Accessibility

Icon dekoratif.

aria-hidden="true"

Icon penting.

Memiliki Accessible Label.

---

# 10.17 Loading Accessibility

Loading diumumkan.

User mengetahui bahwa sistem sedang bekerja.

---

# 10.18 Toast Accessibility

Toast penting menggunakan.

aria-live.

Tidak menghilang terlalu cepat.

---

# 10.19 Motion Accessibility

User dapat mengurangi Animation.

Mengikuti.

prefers-reduced-motion.

---

# 10.20 Flashing Content

Tidak boleh menggunakan animasi berkedip.

---

# 10.21 Zoom

ERP tetap dapat digunakan hingga.

200%.

Tanpa kehilangan fungsi.

---

# 10.22 Responsive Accessibility

Tablet dan Mobile tetap memenuhi seluruh standar Accessibility.

---

# 10.23 Empty State

Empty State mudah dipahami.

Menggunakan.

Title.

Description.

Action.

---

# 10.24 Confirmation Dialog

Dialog menggunakan bahasa sederhana.

Menjelaskan dampak aksi.

---

# 10.25 Language

Gunakan bahasa yang jelas.

Tidak menggunakan istilah teknis apabila tidak diperlukan.

---

# 10.26 Reading Order

Urutan membaca mengikuti Layout visual.

---

# 10.27 Shortcut Documentation

Keyboard Shortcut dapat dilihat melalui.

Help.

Shortcut Dialog.

---

# 10.28 Accessibility Testing

Seluruh halaman diuji.

Keyboard.

Screen Reader.

Contrast.

Zoom.

Focus.

---

# 10.29 Inclusive Design

ERP dirancang untuk.

Junior Staff.

Senior Staff.

Owner.

Manager.

Kasir.

Warehouse.

Tidak bergantung pada kemampuan teknis pengguna.

---

# 10.30 Accessibility Evolution

Seluruh komponen baru wajib memenuhi Guideline Accessibility.

Tidak boleh mengurangi tingkat aksesibilitas yang sudah ada.

---

# CHAPTER 10 SUMMARY

Accessibility merupakan bagian dari kualitas produk.

Prinsip utama.

✓ Keyboard First

✓ Focus Visible

✓ Screen Reader Ready

✓ High Contrast

✓ Touch Friendly

✓ Inclusive Design

✓ WCAG AA

ERP yang baik harus dapat digunakan oleh semua orang tanpa mengurangi produktivitas.

# CHAPTER 11 — MOTION & ANIMATION GUIDELINES

---

# 11.1 Purpose

Motion digunakan untuk membantu pengguna memahami perubahan antarmuka.

Motion bukan dekorasi.

Motion harus memiliki tujuan yang jelas.

Setiap animasi harus membantu pengguna memahami.

- perubahan data
- perpindahan halaman
- feedback aksi
- perubahan status
- loading

---

# 11.2 Motion Principles

Seluruh Motion mengikuti prinsip.

Fast.

Subtle.

Meaningful.

Consistent.

Accessible.

Motion tidak boleh mengganggu pekerjaan pengguna.

---

# 11.3 Animation Philosophy

Prioritas.

Business.

↓

Information.

↓

Motion.

Motion tidak boleh menjadi fokus utama.

---

# 11.4 Duration

Gunakan durasi yang konsisten.

Micro Interaction.

100 ms.

Default.

150 ms.

Dialog.

200 ms.

Drawer.

250 ms.

Page Transition.

300 ms.

Tidak menggunakan animasi lebih dari.

300 ms.

---

# 11.5 Easing

Gunakan easing yang konsisten.

Ease Out.

Untuk Opening.

Ease In.

Untuk Closing.

Ease In Out.

Untuk perubahan kecil.

---

# 11.6 Page Transition

Perpindahan halaman menggunakan.

Fade.

atau.

Subtle Slide.

Tidak menggunakan animasi kompleks.

---

# 11.7 Dialog Animation

Dialog.

Fade.

↓

Scale.

Dialog muncul dari tengah.

Tidak memantul.

---

# 11.8 Drawer Animation

Drawer muncul dari samping.

Tidak Fade penuh.

Background menggunakan Overlay ringan.

---

# 11.9 Toast Animation

Toast.

Fade.

↓

Slide.

Durasi singkat.

Tidak mengganggu pekerjaan.

---

# 11.10 Tooltip Animation

Tooltip muncul.

Fade.

100 ms.

Tidak memiliki animasi besar.

---

# 11.11 Popover Animation

Popover.

Fade.

↓

Scale kecil.

Tidak memantul.

---

# 11.12 Accordion

Accordion menggunakan Height Animation.

Konten tidak meloncat.

---

# 11.13 Tabs

Perpindahan Tab menggunakan.

Fade ringan.

Tidak menggunakan Slide panjang.

---

# 11.14 Table Loading

Loading menggunakan Skeleton.

Tidak Fade seluruh Table.

---

# 11.15 Card Loading

Card menggunakan Skeleton.

Ukuran sama dengan Card asli.

---

# 11.16 Button Loading

Button berubah menjadi Loading.

Ukuran Button tetap.

Tidak berubah posisi.

---

# 11.17 Save Feedback

Setelah Save.

Button kembali normal.

↓

Toast.

↓

Data diperbarui.

Tidak menggunakan animasi besar.

---

# 11.18 Status Change

Perubahan Status.

Booked.

↓

Checked In.

↓

Completed.

Menggunakan perubahan Badge.

Tidak menggunakan animasi mencolok.

---

# 11.19 Number Animation

Statistik Dashboard boleh menggunakan Count Up ringan.

Durasi maksimal.

500 ms.

---

# 11.20 Chart Animation

Chart hanya dianimasikan saat pertama dimuat.

Tidak setiap Refresh.

---

# 11.21 Hover Animation

Hover maksimal.

100 ms.

Gunakan perubahan.

Background.

Border.

Shadow.

Tidak menggunakan Zoom besar.

---

# 11.22 Button Animation

Button menggunakan.

Background Transition.

Shadow.

Tidak menggunakan Bounce.

---

# 11.23 Drag & Drop

Drag menggunakan.

Opacity.

Shadow.

Placeholder.

Tidak menggunakan animasi kompleks.

---

# 11.24 Sidebar

Expand.

Collapse.

200 ms.

Posisi ikon tetap stabil.

---

# 11.25 Skeleton

Skeleton mengikuti bentuk konten.

Tidak menggunakan Spinner besar.

---

# 11.26 Empty State

Empty State tidak menggunakan animasi.

Fokus pada CTA.

---

# 11.27 Notification

Notification muncul.

Fade.

↓

Slide.

Tidak menutupi pekerjaan User.

---

# 11.28 Error Animation

Field Error menggunakan.

Border.

↓

Message.

Tidak menggunakan Shake Animation.

---

# 11.29 Success Animation

Success cukup menggunakan.

Toast.

Badge.

Icon.

Tidak menggunakan Confetti.

---

# 11.30 Delete Animation

Delete menggunakan.

Fade Out.

Tidak menggunakan Explosion Effect.

---

# 11.31 Refresh Animation

Refresh hanya pada Widget yang berubah.

Tidak me-refresh seluruh halaman.

---

# 11.32 Reduced Motion

Hormati preferensi sistem.

prefers-reduced-motion.

Animasi dapat dikurangi.

---

# 11.33 GPU Friendly

Gunakan.

Transform.

Opacity.

Hindari animasi.

Width.

Height.

Margin.

Apabila memungkinkan.

---

# 11.34 Performance

Motion tidak boleh menyebabkan.

Frame Drop.

Layout Shift.

Input Lag.

Target.

60 FPS.

---

# 11.35 Motion Consistency

Semua komponen menggunakan.

Duration.

Easing.

Direction.

Yang sama.

---

# 11.36 Motion Hierarchy

Semakin penting komponen.

Semakin jelas Motion.

Background tidak dianimasikan.

---

# 11.37 Business Workflow

Motion tidak boleh memperlambat proses bisnis.

User yang bekerja sepanjang hari harus tetap nyaman.

---

# 11.38 Motion Testing

Seluruh animasi diuji.

Desktop.

Tablet.

Mobile.

Reduced Motion.

---

# 11.39 Future Motion

Future.

Micro Interaction Library.

Shared Animation Token.

View Transition API.

---

# 11.40 Motion Evolution

Seluruh animasi baru mengikuti Guideline ini.

Tidak membuat animasi hanya demi estetika.

---

# CHAPTER 11 SUMMARY

Motion pada NIAHAIR ERP berfungsi untuk.

✓ Memberikan Feedback

✓ Menjaga Konteks

✓ Menjelaskan Perubahan

✓ Meningkatkan Kejelasan

Bukan untuk hiburan.

Motion yang baik hampir tidak disadari pengguna, tetapi membuat aplikasi terasa lebih cepat, lebih halus, dan lebih profesional.

# CHAPTER 12 — DESIGN TOKENS & THEMING

---

# 12.1 Purpose

Design Token merupakan sumber tunggal seluruh nilai visual pada NIAHAIR ERP.

Seluruh komponen harus menggunakan Design Token.

Tidak diperbolehkan menggunakan nilai visual secara langsung.

Design Token memastikan.

- Konsistensi
- Maintainability
- Rebranding
- Dark Mode
- White Label
- Scalability

---

# 12.2 Design Token Philosophy

Design Token adalah bahasa visual aplikasi.

Developer tidak berpikir.

"padding 13"

Tetapi berpikir.

"spacing-md"

---

# 12.3 Token Categories

Token dibagi menjadi.

Color.

Spacing.

Radius.

Shadow.

Typography.

Motion.

Border.

Z-Index.

Opacity.

Breakpoint.

---

# 12.4 Color Token

Gunakan nama semantik.

Benar.

Primary.

Success.

Danger.

Warning.

Surface.

Background.

Border.

Muted.

Salah.

Blue500.

Red700.

Gray300.

Business Component tidak boleh mengetahui warna asli.

---

# 12.5 Background Token

Gunakan token.

background

surface

surface-muted

surface-hover

surface-selected

Jangan menggunakan Hex Color secara langsung.

---

# 12.6 Text Token

Text menggunakan.

text-primary

text-secondary

text-muted

text-danger

text-success

---

# 12.7 Border Token

Gunakan.

border

border-muted

border-focus

border-danger

---

# 12.8 Spacing Token

Seluruh spacing mengikuti skala.

```
xs

sm

md

lg

xl

2xl

3xl
```

Tidak menggunakan angka acak.

---

# 12.9 Spacing Scale

Contoh implementasi.

```
xs

4

sm

8

md

16

lg

24

xl

32

2xl

40

3xl

48
```

---

# 12.10 Radius Token

Radius menggunakan.

```
none

sm

md

lg

xl

full
```

Tidak menggunakan.

11 px.

13 px.

17 px.

---

# 12.11 Shadow Token

Shadow.

none

xs

sm

md

lg

xl

Dialog.

Popover.

Dropdown.

Menggunakan token.

---

# 12.12 Typography Token

Gunakan token.

display

heading-1

heading-2

heading-3

body

caption

label

---

# 12.13 Font Weight

Gunakan.

regular

medium

semibold

bold

---

# 12.14 Line Height

Gunakan.

tight

normal

relaxed

---

# 12.15 Icon Size

Gunakan.

```
16

20

24

32
```

Tidak menggunakan ukuran acak.

---

# 12.16 Z Index

Gunakan.

base

sticky

dropdown

popover

modal

toast

tooltip

Tidak menggunakan.

999999.

---

# 12.17 Motion Token

Gunakan.

instant

fast

normal

medium

slow

---

# 12.18 Transition Token

Gunakan.

fade

slide

scale

---

# 12.19 Breakpoint Token

Gunakan.

mobile

tablet

laptop

desktop

wide

---

# 12.20 Grid Token

Desktop.

12 Column.

Tablet.

8 Column.

Mobile.

4 Column.

---

# 12.21 Opacity

Gunakan.

disabled

hover

overlay

selected

---

# 12.22 Theme

Theme terdiri dari.

Light.

Dark (Future).

Semua Component menggunakan Theme.

---

# 12.23 Brand Independence

Component tidak mengetahui Brand Color.

Component hanya mengetahui.

Primary.

Danger.

Warning.

Success.

---

# 12.24 White Label Ready

Future.

Design Token memungkinkan.

Logo.

Color.

Typography.

Diubah tanpa mengubah Component.

---

# 12.25 CSS Variables

Semua Token diekspor menjadi CSS Variables.

Contoh.

```
--color-primary

--spacing-md

--radius-lg
```

---

# 12.26 Tailwind Mapping

Seluruh Token dipetakan ke Tailwind Theme.

Developer menggunakan.

```
bg-primary

text-muted

rounded-lg

shadow-md
```

Bukan.

```
bg-blue-500

text-gray-600
```

---

# 12.27 Figma Token

Future.

Token yang sama digunakan pada.

Figma.

Frontend.

Storybook.

---

# 12.28 Token Naming

Penamaan harus.

Singkat.

Konsisten.

Semantik.

---

# 12.29 Token Versioning

Perubahan Token mengikuti Version.

Breaking Change harus didokumentasikan.

---

# 12.30 Design System Ownership

Design Token dimiliki oleh.

Design System.

Bukan oleh Module.

Customer.

Inventory.

Treatment.

Tidak boleh membuat Token sendiri.

---

# 12.31 Component Theme

Semua Component membaca Theme.

Button.

Input.

Badge.

Dialog.

Table.

Tidak memiliki warna sendiri.

---

# 12.32 Theme Switching

Future.

User dapat memilih.

Light.

Dark.

System.

Tanpa Refresh.

---

# 12.33 Token Documentation

Setiap Token memiliki.

Purpose.

Usage.

Example.

Related Component.

---

# 12.34 Design Review

Perubahan Token wajib melalui.

Design Review.

Architecture Review.

---

# 12.35 Token Evolution

Token dapat bertambah.

Namun tidak boleh mengubah makna Token lama.

---

# CHAPTER 12 SUMMARY

Design Token merupakan fondasi visual NIAHAIR ERP.

Seluruh UI harus dibangun menggunakan Token.

Tidak menggunakan nilai visual secara langsung.

Prinsip utama.

✓ Semantic

✓ Reusable

✓ Themeable

✓ Maintainable

✓ Brand Independent

✓ White Label Ready

Design Token memastikan seluruh ERP memiliki identitas visual yang konsisten dan mudah dikembangkan di masa depan.

# CHAPTER 13 — ICONOGRAPHY, ILLUSTRATION & BRANDING

---

# 13.1 Purpose

Dokumen ini mendefinisikan standar penggunaan Icon, Illustration, Image, Avatar, dan Branding pada seluruh NIAHAIR ERP.

Tujuannya adalah menjaga identitas visual yang konsisten di seluruh aplikasi.

Seluruh modul harus menggunakan standar yang sama.

---

# 13.2 Design Philosophy

Visual Asset digunakan untuk membantu pengguna memahami informasi.

Visual bukan dekorasi.

Prioritas.

Information.

↓

Icon.

↓

Illustration.

↓

Image.

---

# 13.3 Icon Library

Seluruh ERP menggunakan satu Icon Library.

Standar.

Lucide React.

Tidak diperbolehkan mencampur.

Heroicons.

Material Icons.

Font Awesome.

Bootstrap Icons.

Kecuali memiliki alasan yang sangat kuat.

---

# 13.4 Icon Style

Seluruh Icon harus memiliki gaya yang sama.

Outline.

Rounded Join.

Consistent Stroke.

Tidak mencampur Outline dan Filled.

---

# 13.5 Icon Size

Gunakan ukuran resmi.

```
XS

16px

SM

20px

MD

24px

LG

32px

XL

48px
```

Tidak menggunakan ukuran acak.

---

# 13.6 Icon Color

Icon mengikuti Semantic Color.

Primary.

Muted.

Success.

Warning.

Danger.

Info.

Tidak menggunakan warna dekoratif.

---

# 13.7 Icon Usage

Icon membantu memahami Action.

Contoh.

Edit.

Delete.

View.

Download.

Upload.

Print.

Refresh.

Icon bukan pengganti Text.

---

# 13.8 Icon Position

Pada Button.

Icon berada di kiri.

Pada Table Action.

Icon dapat berdiri sendiri.

Pada Menu.

Icon berada di kiri Label.

---

# 13.9 Action Icons

Action standar.

View.

Edit.

Delete.

Copy.

Download.

Upload.

Share.

Refresh.

Seluruh aplikasi menggunakan Icon yang sama.

---

# 13.10 Navigation Icons

Sidebar menggunakan Icon yang konsisten.

Dashboard.

Customer.

Appointment.

Treatment.

Inventory.

Finance.

Payroll.

Settings.

Tidak mengganti Icon tanpa alasan.

---

# 13.11 Status Icons

Gunakan Icon khusus.

Success.

Warning.

Error.

Information.

Pending.

Cancelled.

Void.

---

# 13.12 Avatar

Avatar digunakan untuk.

Customer.

Employee.

User.

Jika foto tidak tersedia.

Gunakan Initial.

---

# 13.13 Avatar Colors

Warna Avatar dihasilkan secara konsisten.

Nama yang sama menghasilkan warna yang sama.

Tidak berubah setiap Refresh.

---

# 13.14 Company Logo

Logo hanya muncul pada.

Login.

Sidebar.

Print.

PDF.

Invoice.

Tidak menggunakan Logo secara berlebihan.

---

# 13.15 Brand Identity

Seluruh Branding mengikuti.

Logo.

Color.

Typography.

Spacing.

Tidak membuat Branding berbeda pada setiap Module.

---

# 13.16 Illustration

Illustration hanya digunakan pada.

Empty State.

Error Page.

Onboarding.

Help.

Tidak digunakan pada halaman operasional.

---

# 13.17 Illustration Style

Illustration memiliki gaya yang konsisten.

Flat.

Minimal.

Modern.

Professional.

Tidak menggunakan Illustration kartun.

---

# 13.18 Empty State Illustration

Setiap Empty State memiliki.

Illustration.

Title.

Description.

Primary Action.

---

# 13.19 Error Illustration

Halaman Error memiliki.

Illustration.

Error Title.

Description.

Retry Button.

Back Button.

---

# 13.20 Success Illustration

Success Illustration hanya digunakan.

Wizard.

Onboarding.

Import selesai.

Tidak digunakan pada transaksi harian.

---

# 13.21 Images

Image digunakan untuk.

Treatment Before After.

Customer Photo.

Employee Photo.

Product.

Media Gallery.

Tidak sebagai dekorasi.

---

# 13.22 Image Ratio

Gunakan Aspect Ratio yang konsisten.

1:1

4:3

16:9

Tidak Stretch.

---

# 13.23 Image Placeholder

Image yang belum tersedia menggunakan Placeholder standar.

Bukan kotak kosong.

---

# 13.24 Image Preview

Klik Image membuka Preview.

Zoom.

Next.

Previous.

Download (sesuai Permission).

---

# 13.25 Image Upload

Upload menampilkan.

Preview.

Progress.

Error.

Ukuran File.

---

# 13.26 File Icons

Gunakan Icon berdasarkan tipe file.

PDF.

Excel.

Image.

ZIP.

Video.

Word.

---

# 13.27 Notification Icons

Notification memiliki Icon sesuai tipe.

Success.

Warning.

Info.

Danger.

---

# 13.28 KPI Icons

Dashboard KPI menggunakan Icon sederhana.

Tidak lebih dari satu Icon per Card.

---

# 13.29 Decorative Icons

Icon dekoratif diminimalkan.

ERP memprioritaskan informasi.

---

# 13.30 Accessibility

Icon penting memiliki.

Accessible Label.

Icon dekoratif menggunakan.

aria-hidden="true".

---

# 13.31 Print Branding

Invoice.

Receipt.

Report.

PDF.

Menggunakan Logo resmi.

Tidak menggunakan Background dekoratif.

---

# 13.32 White Label Ready

Future.

Logo.

Color.

Favicon.

Login Background.

Dapat diganti melalui Theme.

---

# 13.33 Multi Company Branding

Future.

Setiap Company dapat memiliki.

Logo.

Primary Color.

Invoice Header.

Tanpa mengubah Component.

---

# 13.34 Asset Optimization

Semua Asset dioptimalkan.

SVG untuk Icon.

WebP untuk Image.

PNG hanya bila diperlukan.

---

# 13.35 CDN

Semua Media berasal dari.

Cloudinary.

atau Object Storage resmi.

Tidak menyimpan file pada Source Code.

---

# 13.36 Naming Convention

Gunakan nama yang jelas.

customer-placeholder.svg

invoice-success.svg

inventory-empty.svg

Tidak menggunakan.

image1.png

icon-new.svg

---

# 13.37 Versioning

Asset penting memiliki Version.

Logo baru tidak menghapus Logo lama.

---

# 13.38 Documentation

Seluruh Asset memiliki dokumentasi.

Purpose.

Usage.

Location.

---

# 13.39 Future

Future.

Animated SVG.

Lottie.

Brand Theme.

White Label.

---

# 13.40 Chapter Summary

Visual Identity NIAHAIR ERP dibangun melalui.

✓ Icon yang konsisten

✓ Illustration yang sederhana

✓ Branding yang profesional

✓ Asset yang ringan

✓ Semantic Icon

✓ White Label Ready

Seluruh Visual Asset harus membantu pengguna bekerja lebih cepat, bukan mengalihkan perhatian dari informasi utama.

# CHAPTER 14 — UI GOVERNANCE & DESIGN SYSTEM EVOLUTION

---

# 14.1 Purpose

UI Governance memastikan seluruh antarmuka NIAHAIR ERP berkembang secara konsisten seiring bertambahnya modul, fitur, dan jumlah developer.

Setiap perubahan UI harus mengikuti Design System resmi.

Tidak diperbolehkan membuat pola baru tanpa proses review.

---

# 14.2 Design System Philosophy

Design System merupakan produk.

Bukan sekadar kumpulan Component.

Design System dimiliki bersama oleh.

Product.

UI/UX.

Frontend.

Architecture.

---

# 14.3 Single Source of Truth

Seluruh standar UI berasal dari.

Design Token.

Component Library.

UI Guideline.

Business Rule.

Tidak boleh membuat standar baru pada masing-masing Module.

---

# 14.4 UI Ownership

Setiap perubahan UI harus memiliki Owner.

Contoh.

Design System Owner.

↓

Review.

↓

Approve.

↓

Release.

---

# 14.5 Component Ownership

Setiap Component memiliki Owner.

Contoh.

Button.

Input.

Table.

Dialog.

DataGrid.

Chart.

Perubahan dilakukan melalui Pull Request.

---

# 14.6 New Component Policy

Component baru hanya dibuat apabila.

Belum ada Component yang memenuhi kebutuhan.

Perubahan harus melalui Architecture Review.

---

# 14.7 Component Modification

Perubahan Component harus menjaga.

Backward Compatibility.

Perubahan besar harus melalui Versioning.

---

# 14.8 Design Review

Seluruh halaman baru harus melalui Design Review.

Checklist.

Layout.

Spacing.

Accessibility.

Responsive.

Consistency.

---

# 14.9 UX Review

Workflow baru harus melalui UX Review.

Fokus.

Jumlah Klik.

Kecepatan.

Business Flow.

Keyboard Navigation.

---

# 14.10 Accessibility Review

Seluruh Component baru harus memenuhi.

WCAG AA.

Keyboard Navigation.

Focus.

Screen Reader.

---

# 14.11 Responsive Review

Semua halaman diuji pada.

Desktop.

Tablet.

Mobile.

Landscape.

Portrait.

---

# 14.12 Performance Review

Halaman baru tidak boleh menyebabkan.

Layout Shift.

Slow Rendering.

Memory Leak.

Render berlebihan.

---

# 14.13 Visual Regression

Perubahan UI harus dibandingkan dengan versi sebelumnya.

Visual Regression digunakan untuk mendeteksi perubahan yang tidak disengaja.

---

# 14.14 Design Token Governance

Seluruh Token hanya boleh diubah melalui.

Architecture Review.

Perubahan Token tidak boleh dilakukan pada Feature Module.

---

# 14.15 Icon Governance

Icon baru harus berasal dari Library resmi.

Tidak boleh mencampur berbagai Icon Pack.

---

# 14.16 Theme Governance

Theme.

Light.

Dark.

White Label.

Menggunakan Design Token yang sama.

Tidak membuat Theme baru di Module tertentu.

---

# 14.17 Naming Convention

Seluruh Component mengikuti Naming Convention.

Contoh.

CustomerCard.

InventoryTable.

TreatmentTimeline.

Tidak menggunakan.

ComponentNew.

Card2.

FinalButton.

---

# 14.18 Documentation

Component baru wajib memiliki.

Purpose.

Props.

Example.

Accessibility.

Usage.

---

# 14.19 Storybook (Future)

Seluruh Component akan didokumentasikan menggunakan Storybook.

Storybook menjadi referensi resmi UI.

---

# 14.20 Figma Synchronization

Future.

Figma menggunakan Design Token yang sama dengan Frontend.

Perubahan Design mengikuti proses sinkronisasi.

---

# 14.21 Versioning

Design System memiliki Version.

Major.

Minor.

Patch.

Breaking Change hanya dilakukan pada Major Version.

---

# 14.22 Deprecation Policy

Component lama tidak langsung dihapus.

Status.

Deprecated.

↓

Migration.

↓

Removal.

Developer diberikan waktu migrasi.

---

# 14.23 Migration Guide

Setiap Breaking Change memiliki.

Migration Guide.

Contoh.

Button v1.

↓

Button v2.

---

# 14.24 Design Debt

Technical Debt pada UI dicatat.

Tidak diperbolehkan menumpuk perubahan kecil tanpa rencana perbaikan.

---

# 14.25 Future Technologies

Design System harus siap terhadap.

Dark Mode.

White Label.

Multi Company.

AI Workspace.

Touch Screen POS.

PWA.

Desktop App.

---

# 14.26 AI Assisted UI

Future.

AI dapat membantu menghasilkan Layout.

Namun seluruh hasil tetap mengikuti Design System.

AI tidak menjadi sumber standar desain.

---

# 14.27 Multi Brand Support

Future.

Branding.

Logo.

Primary Color.

Typography.

Dapat diganti tanpa mengubah Component.

---

# 14.28 Enterprise Scale

Design System harus mampu mendukung.

100+ Module.

500+ Halaman.

1000+ Component Instance.

Tanpa kehilangan konsistensi.

---

# 14.29 Continuous Improvement

UI Guideline merupakan Living Document.

Review dilakukan secara berkala.

Perubahan mengikuti kebutuhan bisnis.

Bukan tren desain.

---

# 14.30 Design System Evolution

Seluruh evolusi UI mengikuti prinsip.

Business First.

Consistency.

Accessibility.

Performance.

Maintainability.

Scalability.

---

# CHAPTER 14 SUMMARY

Design System bukan proyek sekali selesai.

Design System merupakan fondasi jangka panjang bagi seluruh NIAHAIR ERP.

Prinsip utama.

✓ Single Source of Truth

✓ Component Governance

✓ Design Review

✓ Accessibility Review

✓ Versioning

✓ Documentation

✓ Continuous Improvement

Tujuan akhirnya adalah memastikan seluruh modul NIAHAIR ERP memiliki pengalaman pengguna yang konsisten, profesional, dan mudah dipelihara meskipun aplikasi berkembang selama bertahun-tahun.

# CHAPTER 15 — UI QUALITY STANDARDS & DEFINITION OF DONE

---

# 15.1 Purpose

Chapter ini mendefinisikan standar kualitas minimum yang harus dipenuhi sebelum sebuah halaman, komponen, atau fitur dianggap selesai.

Seluruh implementasi Frontend harus memenuhi standar ini.

Feature yang belum memenuhi Definition of Done (DoD) tidak boleh dianggap selesai.

---

# 15.2 Definition of Done

Sebuah Feature dianggap selesai apabila memenuhi.

✓ Business Rule

✓ UI Guideline

✓ Responsive

✓ Accessibility

✓ Performance

✓ Security

✓ Documentation

✓ Code Review

✓ QA Testing

---

# 15.3 Business Validation

Seluruh Business Rule telah diterapkan.

Validation tidak hanya berada di Frontend.

Backend tetap menjadi sumber kebenaran.

---

# 15.4 UI Consistency

Halaman menggunakan.

Design Token.

Component Library.

Spacing.

Typography.

Color.

Layout.

Yang sesuai standar.

---

# 15.5 Component Reuse

Tidak membuat Component baru apabila sudah tersedia.

Reuse selalu menjadi prioritas.

---

# 15.6 Responsive Checklist

Halaman telah diuji pada.

Desktop.

Laptop.

Tablet.

Mobile.

Landscape.

Portrait.

Tidak ada fitur yang hilang.

---

# 15.7 Accessibility Checklist

Halaman memenuhi.

Keyboard Navigation.

Focus State.

Screen Reader.

Contrast.

Touch Target.

WCAG AA.

---

# 15.8 Loading State

Seluruh proses memiliki Loading State.

Page.

Table.

Form.

Button.

Dialog.

Upload.

Tidak ada halaman kosong saat proses berlangsung.

---

# 15.9 Empty State

Seluruh halaman memiliki Empty State.

Title.

Description.

Primary Action.

Illustration bila diperlukan.

---

# 15.10 Error State

Seluruh Error memiliki.

Message.

Solution.

Retry.

Business Error menggunakan bahasa yang mudah dipahami.

---

# 15.11 Success Feedback

Seluruh Action penting memberikan Feedback.

Toast.

Status.

Badge.

Redirect.

Tidak ada aksi yang berhasil tanpa Feedback.

---

# 15.12 Confirmation

Action berbahaya memiliki Confirmation.

Delete.

Void.

Refund.

Adjustment.

Payroll Close.

Branch Delete.

---

# 15.13 Navigation

Navigation konsisten.

Breadcrumb.

Back.

Sidebar.

Tabs.

User tidak kehilangan konteks.

---

# 15.14 Table Quality

Table memiliki.

Search.

Filter.

Pagination.

Sorting.

Loading.

Empty State.

Bulk Action bila diperlukan.

---

# 15.15 Form Quality

Form memiliki.

Label.

Validation.

Helper Text.

Error Message.

Submit Loading.

Unsaved Changes Warning.

---

# 15.16 Dashboard Quality

Dashboard memiliki.

KPI.

Chart.

Recent Activity.

Quick Action.

Loading.

Refresh.

Tidak menampilkan data yang tidak relevan.

---

# 15.17 Workspace Quality

Workspace.

Cepat.

Minim klik.

Status jelas.

Business Rule lengkap.

Keyboard Friendly.

---

# 15.18 Performance

Target.

Initial Load.

< 2 detik.

API.

< 300 ms.

Interaction.

< 100 ms.

Tidak ada render yang tidak perlu.

---

# 15.19 Animation

Animasi.

Subtle.

Cepat.

Konsisten.

Tidak mengganggu produktivitas.

---

# 15.20 Security

Permission telah diuji.

Role.

Branch.

Employee.

Tidak ada informasi sensitif yang bocor.

---

# 15.21 Internationalization Ready

Future.

Seluruh Text menggunakan Resource.

Bukan Hardcoded String.

---

# 15.22 Print Ready

Halaman yang mendukung Print memiliki Layout khusus.

Invoice.

Receipt.

Report.

---

# 15.23 Export Ready

Export.

Excel.

CSV.

PDF (Future).

Mengikuti Filter aktif.

---

# 15.24 Offline Ready

Future.

Halaman memberikan informasi apabila koneksi terputus.

Draft tetap aman.

---

# 15.25 Browser Compatibility

Minimal mendukung.

Chrome.

Edge.

Safari.

Firefox.

Versi modern.

---

# 15.26 Code Quality

Frontend.

ESLint.

Prettier.

TypeScript.

Tidak ada Warning.

Tidak ada Error.

---

# 15.27 Testing

Minimal.

Unit Test untuk Utility.

Integration Test untuk Business Component.

E2E Test untuk Workflow utama (Future).

---

# 15.28 Documentation

Feature memiliki dokumentasi.

Business Purpose.

Workflow.

API.

State.

Component.

---

# 15.29 Review Process

Setiap Pull Request melewati.

Business Review.

↓

UX Review.

↓

Frontend Review.

↓

Backend Review (jika perlu).

↓

QA Review.

↓

Merge.

---

# 15.30 Quality Metrics

Target kualitas.

Bug Critical.

0.

TypeScript Error.

0.

ESLint Error.

0.

Accessibility Error.

0.

Broken Link.

0.

Console Error.

0.

---

# 15.31 UX Metrics

Target UX.

Task Success Rate.

≥ 95%.

Error Rate.

< 2%.

Average Click.

≤ 3.

Average Search Time.

< 10 detik.

---

# 15.32 Maintainability

Tidak ada Duplicate Component.

Tidak ada Hardcoded Value.

Tidak ada Inline Business Logic.

---

# 15.33 Technical Debt

Technical Debt harus dicatat.

Tidak boleh disembunyikan.

Setiap Debt memiliki.

Priority.

Owner.

Target penyelesaian.

---

# 15.34 Continuous Improvement

UI Guideline dievaluasi secara berkala.

Masukan dari pengguna menjadi dasar perbaikan.

---

# 15.35 Final Definition of Done Checklist

Sebelum Merge.

□ Business Rule sesuai

□ API selesai

□ UI sesuai Design System

□ Responsive

□ Accessibility

□ Loading State

□ Empty State

□ Error State

□ Success Feedback

□ Validation

□ Permission

□ Responsive Test

□ Browser Test

□ Performance Check

□ Documentation diperbarui

□ Code Review selesai

□ QA selesai

□ Tidak ada TypeScript Error

□ Tidak ada ESLint Error

□ Tidak ada Console Error

---

# CHAPTER 15 SUMMARY

UI/UX Quality Standards merupakan gerbang terakhir sebelum sebuah fitur dirilis.

Tidak ada fitur yang dianggap selesai hanya karena dapat berjalan.

Fitur harus memenuhi standar kualitas.

✓ Business Correct

✓ UI Consistent

✓ UX Efficient

✓ Accessible

✓ Responsive

✓ Performant

✓ Secure

✓ Maintainable

Tujuan akhir NIAHAIR ERP adalah menghasilkan aplikasi yang tidak hanya lengkap secara fitur, tetapi juga konsisten, cepat, mudah digunakan, dan siap berkembang dalam jangka panjang.