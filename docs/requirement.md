# REQUIREMENTS.md

# Customer Management

## Multi Staff Assignment

Satu treatment dapat dikerjakan oleh lebih dari satu karyawan.

Contoh:

Pasang Rambut 120 Helai

Stylist A = 70 Helai
Stylist B = 50 Helai

Komisi dihitung berdasarkan porsi pekerjaan masing-masing.

## Customer Source

Customer dapat dibuat dari:
- Accurate Online
- Website

Jika customer dibuat dari website:
1. Customer dibuat di website
2. Customer otomatis dibuat ke Accurate
3. Accurate ID disimpan ke database website

Jika customer dibuat di Accurate:
1. Customer disinkronkan ke website

## Customer Information

Customer memiliki:

* Nama
* Nomor Customer
* Telepon
* Email
* Alamat
* Tanggal Lahir
* Membership
* Riwayat Treatment
* Catatan Customer

## Customer Branch

Customer dapat melakukan booking dan transaksi di cabang manapun.

Customer tidak terikat ke satu cabang tertentu.

Branch memiliki:

- Code
- Name
- Address
- Phone
- Status Active

## Customer Treatment History

Setiap treatment harus tersimpan sebagai riwayat.

Riwayat berisi:

* Tanggal
* Cabang
* Stylist
* Service
* Invoice
* Catatan

## Customer Gallery

Setiap treatment dapat memiliki:

* Foto Before
* Foto After

Foto disimpan berdasarkan sesi treatment.

Satu customer dapat memiliki banyak sesi treatment.

# Customer Notes

Customer dapat memiliki banyak catatan.

Catatan dapat dibuat oleh:

- Stylist
- Manager

Catatan tidak boleh dihapus.

# Membership

## Membership Rules

Customer hanya dapat memiliki satu membership aktif.

Membership memiliki:

* Nama Membership
* Harga
* Masa Berlaku
* diskon

Membership dapat memberikan:

- Diskon Persentase
- Diskon Nominal
- Benefit Lain

Membership discount diterapkan otomatis saat invoice dibuat.

## Membership Expiration

Membership memiliki tanggal mulai dan tanggal berakhir.

Membership dapat diperpanjang.

# Membership History

Semua perubahan membership harus memiliki histori.

Histori mencatat:

- Membership Lama
- Membership Baru
- Tanggal Mulai
- Tanggal Berakhir
- User

# Product Management

Product & Service Management
Item Source

Semua item berasal dari Accurate Online.

Website tidak membuat item secara manual.

Item akan disinkronkan secara otomatis dari Accurate.

Item Types

Item dapat berupa:

INVENTORY
SERVICE

Contoh INVENTORY:

Keratin Liquid
Shampoo
Hair Serum
Hair Mask

Contoh SERVICE:

Keratin Premium
Hair Botox
Smoothing
Hair Coloring
Item Information

Inventory hanya dapat dibuat untuk item dengan itemType = INVENTORY.

Item dengan itemType = SERVICE tidak memiliki stok dan tidak boleh muncul pada tabel inventories.

Setiap item yang disinkronkan dari Accurate harus menyimpan:

Accurate Item ID
Item Code
Item Name
Item Type
Category
Brand
Default Unit
Selling Price
Cost Price
Status Active
Unit Management

Satuan mengikuti data dari Accurate.

Website harus menyimpan:

Unit
item_units
conversion_factor

Contoh:

Keratin Liquid

Default Unit:

ml

Unit Conversion:

1000 ml = 1 Liter
1 Liter = 1 Botol

Contoh:

Shampoo

Default Unit:

Botol

Unit Conversion:

12 Botol = 1 Dus
Item Sync

Item yang diubah di Accurate harus diperbarui di Website melalui proses sinkronisasi.

Customer dan transaksi tidak boleh mengubah data item yang berasal dari Accurate.

Service Materials (BOM)
Service Material

Service dapat memiliki daftar bahan baku yang digunakan.

Daftar bahan baku dibuat dan dikelola di Website.

Contoh:

Service:
Keratin Premium

Materials:

Keratin Liquid 50 ml
Clarifying Shampoo 20 ml
Hair Serum 10 ml
Service Material Rules

Satu service dapat memiliki banyak bahan baku.

Satu bahan baku dapat digunakan oleh banyak service.

Semua bahan baku harus berasal dari item INVENTORY yang disinkronkan dari Accurate.

Automatic Stock Deduction

Saat service selesai:

Sistem harus:

- Membaca daftar bahan baku service
- Mengurangi stok bahan baku
- Membuat stock movement
- Menyimpan histori pengurangan stok

Stock movement dapat berasal dari:

Service Usage
Product Sale
Stock Adjustment
Stock Transfer
Purchase
Return
Inventory Source

Stok yang digunakan website berasal dari data item Accurate yang telah disinkronkan ke database lokal.

Website tidak membaca stok langsung ke Accurate pada setiap transaksi.

# Treatment Session

Setiap treatment menghasilkan satu treatment session.

Treatment session menyimpan:

- Customer
- Stylist
- Service
- Invoice
- Notes
- Before Photo
- After Photo

## Stock Deduction

Saat service selesai:

stok bahan baku harus berkurang otomatis.

# Booking System

## Appointment

Booking memiliki:

* Customer
* Cabang
* Stylist
* Tanggal
* Jam Mulai
* Jam Selesai
* Service

## Appointment Status

* BOOKED
* CONFIRMED
* CHECK_IN
* IN_PROGRESS
* COMPLETED
* CANCELLED
* NO_SHOW

## Booking Deposit

Booking dapat memiliki DP.

DP dikelola oleh Website.

DP merupakan bagian dari pembayaran invoice.

Saat treatment selesai:

1. Website membuat invoice.
2. Invoice dikirim ke Accurate dengan nilai penuh.
3. DP dicatat sebagai pembayaran invoice.
4. Sisa pembayaran dicatat saat pelunasan.

Contoh:

Total Invoice: Rp1.000.000
DP: Rp300.000
Pelunasan: Rp700.000

Invoice Accurate tetap Rp1.000.000.

# Media Storage

Sistem menyimpan:

- Before Photo
- After Photo

File disimpan di Object Storage.

Database hanya menyimpan URL file.

# POS

## Invoice

Invoice dibuat dari website.

Invoice otomatis dikirim ke Accurate.

Invoice yang sudah dibuat dapat:

- Draft
- Paid
- Cancelled

Invoice yang dibatalkan harus:

- Membalik stock movement
- Membatalkan komisi
- Membatalkan payment

## Invoice Item

Invoice dapat berisi:

* INVENTORY
* SERVICE

Dalam satu invoice dapat terdapat lebih dari satu item.

## Discount

Diskon dapat berupa:

* Nominal
* Persentase

## Voucher

Voucher dapat berupa:

* Nominal
* Persentase

## Payment Method

* Cash
* Transfer
* QRIS
* Debit Card
* Credit Card

# Multi Branch

## Branch

Sistem mendukung multi cabang.

## Stock

Setiap cabang memiliki stok masing-masing.

## Transfer Stock

Transfer stok antar cabang harus didukung.

Transfer stok langsung diproses. tanpa perlu approval manager

Transfer harus mencatat:

* Cabang Asal
* Cabang Tujuan
* Produk
* Qty
* User

Transfer Status

- PENDING
- IN_TRANSIT
- RECEIVED
- CANCELLED

# Employee

## Employee Type

# Authorization

## Roles

- Super Admin
- Owner
- Manager
- Kasir
- Stylist

## Permissions

Permission diatur berdasarkan role.

Contoh:

Kasir:
- Create Invoice
- View Customer

Stylist:
- View Schedule
- View Customer History

Manager:
- Manage Booking
- Manage Employee

Owner:
- View All Reports

## Employee Data

* Nama
* Telepon
* Jabatan
* Cabang
* Status Aktif

# Attendance
Attendance menggunakan:
- GPS

Attendance menyimpan:

- Latitude
- Longitude
- Timestamp

## Check In

Karyawan dapat melakukan check in.

## Check Out

Karyawan dapat melakukan check out.

## Attendance Record

Attendance menyimpan:

* Tanggal
* Jam Masuk
* Jam Keluar

# Schedule

## Work Schedule

Stylist memiliki jadwal kerja.

Appointment tidak boleh overlap untuk stylist yang sama.

Sistem harus melakukan validasi jadwal sebelum booking dibuat.

## Day Off

Stylist memiliki hari libur.

# Leave

Stylist dapat mengajukan cuti.

Leave memiliki status:

- PENDING
- APPROVED
- REJECTED

Leave mencatat:

- Employee
- Start Date
- End Date
- Reason
- Approver

# Commission

## Commission Calculation

Komisi dapat berupa:

- Persentase dari nilai service
- Nominal tetap per service

Komisi ditentukan berdasarkan:

- Karyawan
- Service/Treatment

Setiap karyawan dapat memiliki aturan komisi yang berbeda untuk setiap service.

Contoh:

Stylist A

- Keratin = 4%
- Cutting = Rp150.000

Stylist B

- Keratin = 5%
- Cutting = Rp150.000

## Commission snapshot
Saat komisi dibuat, sistem menyimpan snapshot nilai komisi.

Perubahan rule komisi tidak mengubah komisi historis.

## Commission Status

* PENDING
* APPROVED
* PAID

# Audit Log

Sistem harus mencatat:

- User
- Action
- Module
- Record
- Timestamp

# Accurate Integration

# Sync Queue

Semua proses sinkronisasi Accurate menggunakan queue.

Status:

- PENDING
- PROCESSING
- SUCCESS
- FAILED

Sistem harus dapat retry jika sinkronisasi gagal.

## Customer Sync

Customer disinkronkan dari Accurate ke Website.

## Product Sync

Product disinkronkan dari Accurate ke Website.

## Invoice Sync

Invoice dibuat di Website.

Invoice otomatis dibuat di Accurate.

## Payment Settlement

Pembayaran invoice di Website harus tercermin di Accurate.

# Dashboard

Dashboard menampilkan:

* Omzet Harian
* Omzet Bulanan
* Penjualan per Cabang
* Service Terlaris
* Produk Terlaris
* Customer Baru
* Membership Aktif
* Stok Menipis
* Komisi Stylist
