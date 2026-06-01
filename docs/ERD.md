# ERD.md

# MASTER DATA

## branches

PK:

* id

Fields:

* code
* name
* address
* phone
* is_active

---

## user_roles

PK:

* id

Fields:

* code
* name
* is_active

---

## users

PK:

* id

FK:

* branch_id
* user_role_id
* employee_id (nullable)

Fields:

* name
* email
* password_hash
* is_active

## employees

PK:

* id

FK:

* branch_id
* role_id

Fields:

* employee_code

* name

* phone

* email

* hire_date

* birth_date

* address

* emergency_contact

* commission_enabled

* is_active

* created_at
* updated_at

Constraints:

* employee_code harus unik

Relasi:

* employee memiliki satu role

* employee memiliki banyak attendance

* employee memiliki banyak schedule

* employee memiliki banyak leave

* employee memiliki banyak commission_rule

* employee memiliki banyak commission

---

## employee_role
PK:
* id

Fields:

* code
* name

* is_active

* created_at
* updated_at

---

## employee_branch_histories

PK:
* id

FK:
* employee_id
* branch_id

Fields:

* start_date
* end_date

* created_at

## customers

PK:
* id

Fields:

* accurate_customer_id
* customer_no
* name
* mobile_phone
* whatsapp
* email
* address
* city
* province
* birth_date
* gender
* membership_id
* notes
* last_visit_at
* is_active
* last_sync_at
* created_at
* updated_at

Relasi:

* customer memiliki banyak appointment
* customer memiliki banyak invoice
* customer memiliki banyak catatan customer
* customer memiliki banyak sesi treatment
* customer memiliki banyak riwayat membership
* customer memiliki satu membership aktif

---

# MEMBERSHIP

## memberships

PK:

* id

Fields:

* name
* price
* duration_days
* discount_type
* discount_value

---

## customer_memberships

PK:

* id

FK:

* customer_id
* membership_id

Fields:

* start_date
* end_date
* status

---

## membership_histories

PK:

* id

FK:

* customer_id
* membership_id

Fields:

* start_date
* end_date
* created_by

---

# CUSTOMER CRM

## customer_notes

PK:

* id

FK:

* customer_id
* employee_id

Fields:

* note

---

## treatment_sessions

PK:

* id

FK:

* customer_id
* employee_id
* invoice_id
* appointment_id
* service_item_id

Fields:

* treatment_date
* notes

---

## treatment_media

PK:

* id

FK:

* treatment_session_id

Fields:

* media_type

* file_url

* notes

* created_at

Enum:

* media_type

  * BEFORE
  * AFTER

# ITEM MASTER
## items

## item_categories

item_categories

PK: id

Fields:

accurate_category_id
nama
status_aktif
dibuat_pada
diperbarui_pada

Relasi:

kategori memiliki banyak item

---

## units

PK:

id

Fields:

accurate_unit_id
nama
dibuat_pada
diperbarui_pada

Constraints:

* accurate_unit_id harus unik

Relasi:

unit digunakan oleh banyak item_units
unit digunakan oleh banyak item_prices

---

## items

PK:

* id

FK:

* category_id
* default_unit_id

Fields:

* accurate_item_id
* item_code

* nama

* item_type

  Nilai:
  - INVENTORY
  - SERVICE

* status_aktif

* terakhir_sinkronisasi

* dibuat_pada
* diperbarui_pada

Constraints:

* accurate_item_id harus unik
* item_code harus unik

Relasi:

* item memiliki satu kategori

* item memiliki satu unit default

* item memiliki banyak item_units

* item memiliki banyak item_prices

* item memiliki banyak inventory

* item dapat digunakan sebagai service_material

* item dapat digunakan pada invoice_item

---

## item_units

PK:

id

FK:

item_id
unit_id

Fields:

conversion_factor
is_default
dibuat_pada
diperbarui_pada

Constraints:

* kombinasi item_id + unit_id harus unik

Relasi:

item memiliki banyak satuan

Contoh:

PCS = 1
BOX = 25
BOX BESAR = 50
BOX SUPER = 100
box container = 1000

---


## item_prices

PK:

id

FK:
- item_id
- unit_id
- branch_id

Fields:

harga_jual
tanggal_efektif
status_aktif
dibuat_pada
diperbarui_pada

Constraints:

* kombinasi item_id + unit_id + branch_id harus unik
* hanya boleh ada satu harga aktif
* untuk kombinasi:
* item_id + unit_id + branch_id

Relasi:

item memiliki banyak harga

Contoh:

barang A

pcs = 1.276.500
box = 1.831.500
box besar = 2.386.500
box super = 2.997.000
box container = 3.496.500


---


# INVENTORY

## warehouses

PK:

* id

FK:

* branch_id

Fields:

* accurate_warehouse_id

* kode

* nama

* status_aktif

* terakhir_sinkronisasi

* dibuat_pada

* diperbarui_pada

Constraints:

* accurate_warehouse_id harus unik
* branch_id harus unik

Relasi:

* warehouse dimiliki satu cabang

* warehouse memiliki banyak inventory

* warehouse memiliki banyak stock_movements

* warehouse memiliki banyak stock_transfers_keluar

* warehouse memiliki banyak stock_transfers_masuk

---

## inventories

PK:

* id

FK:

* warehouse_id
* item_id

Fields:

* qty_tersedia

* qty_dipesan

* qty_minimum

* terakhir_sinkronisasi

* dibuat_pada

* diperbarui_pada

Constraints:

* kombinasi warehouse_id + item_id harus unik

Relasi:

* inventory dimiliki satu warehouse

* inventory dimiliki satu item

---

## stock_movements

PK:

* id

FK:

* warehouse_id
* item_id

Fields:

* tipe

* qty

* saldo_sebelum

* saldo_sesudah

* referensi_tipe

* referensi_id

* catatan

* dibuat_pada

Enum:

* tipe

  * IN
  * OUT
  * ADJUSTMENT
  * TRANSFER_IN
  * TRANSFER_OUT

Relasi:

* stock movement dimiliki satu warehouse

* stock movement dimiliki satu item

---

## stock_transfers

PK:

* id

FK:

* warehouse_asal_id
* warehouse_tujuan_id

Fields:

* nomor_transfer

* status

* catatan

* tanggal_transfer

* dibuat_oleh

* dibuat_pada

* diperbarui_pada

Enum:

* status

  * DRAFT
  * SENT
  * RECEIVED
  * CANCELLED

Relasi:

* transfer memiliki banyak stock_transfer_items

---

## stock_transfer_items

PK:

* id

FK:

* transfer_id
* item_id

Fields:

* qty

* dibuat_pada

Relasi:

* transfer memiliki banyak item

* item dapat muncul di banyak transfer

# SERVICE MATERIALS (BOM)

## service_materials

PK:

* id

FK:

* service_item_id
* material_item_id
* unit_id

Fields:

* qty

* status_aktif

* dibuat_pada

* diperbarui_pada

Constraints:

* kombinasi service_item_id + material_item_id harus unik

Relasi:

* service memiliki banyak bahan baku

* bahan baku dapat digunakan oleh banyak service

Contoh:

Keratin Premium

* Keratin Liquid 50 ml
* Shampoo 20 ml
* Serum 10 ml

Hair Botox

* Botox Cream 40 ml
* Shampoo 20 ml

---

## material_usages

PK:

* id

FK:

* treatment_session_id
* service_item_id

Fields:

* diproses_pada

* dibuat_pada

Relasi:

* material usage dimiliki satu treatment session

* material usage memiliki banyak material_usage_items

## material_usage_items

PK:

* id

FK:

* material_usage_id
* material_item_id
* stock_movement_id

Fields:

* qty

* unit_id

* dibuat_pada

Relasi:

* usage memiliki banyak bahan yang dipakai

* setiap penggunaan menghasilkan stock movement


# APPOINTMENT / BOOKING

## appointments

PK:

* id

FK:

* customer_id
* branch_id

Fields:

* nomor_booking

* tanggal_booking

* tanggal_kunjungan

* jam_mulai

* jam_selesai

* status

* catatan

* total_estimasi

* dibuat_pada

* diperbarui_pada

Enum:

* status

  * BOOKED
  * CONFIRMED
  * CHECK_IN
  * IN_PROGRESS
  * COMPLETED
  * CANCELLED
  * NO_SHOW

Constraints:

* nomor_booking harus unik
* Staff tidak boleh overlap
* pada tanggal dan jam yang sama.

Relasi:

appointment memiliki satu customer

appointment memiliki satu cabang

appointment memiliki banyak appointment_services

appointment memiliki banyak appointment_staffs

appointment memiliki banyak deposits

appointment memiliki banyak appointment_status_histories

appointment dapat menghasilkan invoice

---

## appointment_staffs

PK:

* id

FK:

* appointment_id
* employee_id

Fields:

* is_primary

* created_at

Constraints:

kombinasi appointment_id + employee_id harus unik

Enum:

* role

  * STYLIST
  * ASSISTANT
  * COLORIST

Relasi:

* appointment memiliki banyak staff

* employee dapat menangani banyak appointment

## appointment_services

PK:

PK:

* id

FK:

* appointment_id

* service_item_id

Fields:

* durasi_menit

* qty

* harga

* catatan

* dibuat_pada

* diperbarui_pada

Relasi:

* appointment memiliki banyak service

* service dapat digunakan pada banyak appointment

Contoh:

Booking A

* Keratin Premium
* Hair Spa

---

## deposits

PK:

* id

FK:

* appointment_id

Fields:

* jumlah

* metode_pembayaran

* status

* dibayar_pada

* catatan

* dibuat_pada

* diperbarui_pada

Enum:

* status

  * PENDING
  * PAID
  * REFUNDED
  * CANCELLED

Relasi:

* appointment memiliki banyak deposit

Catatan:

Deposit menjadi bagian dari pembayaran invoice.

---

## appointment_status_histories

PK:

* id

FK:

* appointment_id

Fields:

* status_lama

* status_baru

* catatan

* dibuat_oleh

* dibuat_pada

Relasi:

* appointment memiliki banyak riwayat status

# INVOICE & PAYMENT

## payment_methods

PK:

* id

Fields:

* code

* name

* is_active

* created_at

* updated_at

Contoh:

* CASH
* TRANSFER
* QRIS
* DEBIT
* CREDIT_CARD

---

## invoices

PK:

* id

FK:

* customer_id
* branch_id
* appointment_id

Fields:

* accurate_invoice_id

* accurate_invoice_number

* invoice_no

* invoice_date

* subtotal

* total_discount

* total_deposit

* total_tax

* grand_total

* paid_amount

* outstanding_amount

* status

* notes

* last_sync_at

* created_at

* updated_at

Enum:

* status

  * DRAFT
  * UNPAID
  * PARTIAL
  * PAID
  * CANCELLED

Constraints:

* invoice_no harus unik

* accurate_invoice_id harus unik

Relasi:

* invoice dimiliki satu customer

* invoice dimiliki satu cabang

* invoice berasal dari satu appointment

* invoice memiliki banyak invoice_items

* invoice memiliki banyak payments

* invoice memiliki banyak invoice_status_histories

---

## invoice_items

PK:

* id

FK:

* invoice_id

* item_id

* unit_id

Fields:

* accurate_invoice_detail_id

* qty

* price

* discount

* subtotal

* notes

* created_at

* updated_at

Relasi:

* invoice memiliki banyak item

* item dapat muncul pada banyak invoice

Catatan:

Item dapat berupa:

* INVENTORY
* SERVICE

---

## payments

PK:

* id

FK:

* invoice_id

* payment_method_id

Fields:

* payment_no

* amount

* payment_date

* reference_no

* notes

* created_at

* updated_at

Constraints:

* payment_no harus unik

Relasi:

* invoice memiliki banyak pembayaran

* payment menggunakan satu metode pembayaran

Contoh:

Invoice Rp1.500.000

Pembayaran 1
QRIS
Rp500.000

Pembayaran 2
Cash
Rp1.000.000

Status Invoice:
PAID

---

## invoice_status_histories

PK:

* id

FK:

* invoice_id

Fields:

* old_status

* new_status

* notes

* created_by

* created_at

Relasi:

* invoice memiliki banyak riwayat status

Contoh:

DRAFT
→ UNPAID

UNPAID
→ PARTIAL

PARTIAL
→ PAID

# ATTENDANCE

## attendances

PK:

* id

FK:

* employee_id

Fields:

* check_in
* check_out
* latitude
* longitude

---

# SCHEDULE

## employee_schedules

PK:

* id

FK:

* employee_id

Fields:

* work_date
* start_time
* end_time

---

## leaves

PK:

* id

FK:

* employee_id

Fields:

* start_date
* end_date
* reason
* status
* approver_id

---

# COMMISSION

## commission_rules

PK:

* id

FK:

* employee_id
* service_item_id

Fields:

* commission_type

* commission_value

* effective_date

* end_date

* is_active

* created_at
* updated_at

Enum:

* commission_type

  * PERCENTAGE
  * FIXED_AMOUNT

Constraints:

* kombinasi employee_id + service_item_id + effective_date harus unik

Relasi:

* karyawan memiliki banyak aturan komisi

* service memiliki banyak aturan komisi

## commissions

PK:

* id

FK:

* employee_id

* invoice_id

* invoice_item_id

* treatment_assignment_id

* commission_rule_id

Fields:

* service_amount

* work_qty

* work_ratio

* commission_type

* commission_value

* commission_amount

* status

* calculated_at

* paid_at

* created_at

* updated_at

Enum:

* status

  * PENDING
  * APPROVED
  * PAID
  * CANCELLED

Relasi:

* komisi dimiliki satu karyawan

* komisi berasal dari satu invoice item

* komisi berasal dari satu assignment pekerjaan

Contoh:

Color

Harga:
Rp1.000.000

Colorist A

5%

Komisi:
Rp50.000

---

Pasang Rambut

Harga:
Rp5.000.000

Stylist A

70 / 120 Helai

3%

Komisi:
Rp87.500

---

Stylist B

50 / 120 Helai

5%

Komisi:
Rp104.167

---

## branch_commission_rules

PK:

* id

FK:

* branch_id

Fields:

* role

* commission_percent

* effective_date

* is_active

* created_at

* updated_at

Enum:

* role

  * MANAGER
  * CUSTOMER_SERVICE

Relasi:

* cabang memiliki banyak aturan komisi global

Contoh:

Manager = 1%

Customer Service = 0.5%

Berdasarkan omzet cabang.

---

## branch_commissions

PK:

* id

FK:

* employee_id

* branch_id

Fields:

* period_month

* period_year

* attendance_days

* branch_revenue

* commission_percent

* commission_amount

* status

* calculated_at

* paid_at

* created_at

* updated_at

Enum:

* status

  * PENDING
  * APPROVED
  * PAID
  * CANCELLED

Relasi:

* komisi global dimiliki satu karyawan

* komisi dihitung berdasarkan omzet cabang

Catatan:

Komisi hanya dihitung jika karyawan hadir pada periode tersebut.

# ACCURATE

## sync_queues

PK:

* id

Fields:

* module
* status
* payload
* retry_count

---

# AUDIT

## audit_logs

PK:

* id

FK:

* user_id

Fields:

* module
* action
* record_id
* created_at

```
```
