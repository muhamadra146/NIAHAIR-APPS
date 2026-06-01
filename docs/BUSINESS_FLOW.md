# BUSINESS_FLOW.md

# 1. Customer Flow

## Customer Create From Website

User
↓
Input Customer
↓
Save Customer
↓
Create Customer To Accurate
↓
Save Accurate ID
↓
Customer Active

## Customer Sync From Accurate

Accurate
↓
Sync Queue
↓
Website Database
↓
Customer Updated

---

# 2. Booking Flow

Customer
↓
Pilih Cabang
↓
Pilih Service
↓
Pilih Tanggal
↓
Pilih Jam
↓
Validasi Jadwal Staff
↓
Pilih Staff
↓
Input DP (Optional)
↓
Create Appointment
↓
Status = BOOKED

## Appointment Confirmation

BOOKED
↓
CONFIRMED
↓
CHECK_IN
↓
IN_PROGRESS
↓
COMPLETED

Atau

BOOKED
↓
CANCELLED

Atau

BOOKED
↓
NO_SHOW

---

# 3. Treatment Flow

Customer Check In
↓
Treatment Dimulai
↓
Assign Stylist
↓
Assign Assistant
↓
Assign Colorist
↓
Input Work Qty
↓
Treatment Selesai
↓
Create Treatment Session
↓
Upload Before Photo
↓
Upload After Photo
↓
Save Treatment Notes
↓
Treatment History Updated

---

# 4. POS Flow

Customer
↓
Select Product
↓
Select Service
↓
Apply Membership Discount
↓
Apply Voucher
↓
Generate Invoice
↓
Payment
↓
Invoice Paid

---

# 5. Deposit Flow

Booking
↓
DP Dibayar
↓
Save Deposit

Total Invoice
↓
Kurangi Deposit
↓
Hitung Outstanding Amount
↓
Invoice Status

UNPAID
atau
PARTIAL
atau
PAID

Sync To Accurate

Invoice Full Amount
↓
DP Payment
↓
Final Payment

---

# 6. Service Material Flow

Treatment Selesai
↓
Create Treatment Session
↓
Get Service Materials
↓
Generate Material Usage
↓
Create Material Usage Items
↓
Create Stock Movement
↓
Update Inventory


# 7. Product Sales Flow

Product Sold
↓
Create Invoice Item
↓
Reduce Inventory
↓
Create Stock Movement

---

# 8. Membership Flow

Customer Purchase Membership
↓
Membership Active
↓
Set Start Date
↓
Set End Date

Saat Invoice Dibuat

Check Membership
↓
Apply Membership Discount
↓
Generate Invoice

Saat Membership Diperpanjang

Membership History Created

---

# 9. Stock Transfer Flow

Branch A
↓
Create Transfer
↓
Status = PENDING
↓
Status = IN_TRANSIT
↓
Status = RECEIVED

Saat RECEIVED

Branch A Stock Reduced
↓
Branch B Stock Added
↓
Stock Movement Created

---

# 10. Attendance Flow

Employee
↓
Check In
↓
Capture GPS
↓
Save Attendance

Employee
↓
Check Out
↓
Capture GPS
↓
Save Attendance

---

# 11. Leave Flow

Employee
↓
Submit Leave Request
↓
Status = PENDING

Manager
↓
Approve

Status = APPROVED

Atau

Manager
↓
Reject

Status = REJECTED

---

# 12. Commission Flow

Invoice PAID
↓
Get Treatment Session
↓
Get Treatment Assignments
↓
Get Commission Rules
↓
Calculate Commission
↓
Create Commission
↓
Status = PENDING

Manager Review
↓
APPROVED

Finance
↓
PAID

---

# 13. Accurate Sync Flow

Customer Sync
Accurate
↓
Queue
↓
Website

Product Sync
Accurate
↓
Queue
↓
Website

Invoice Sync
Website
↓
Queue
↓
Accurate

Payment Sync
Website
↓
Queue
↓
Accurate

Jika Gagal

FAILED
↓
Retry Queue
↓
SUCCESS

---

# 14. Audit Flow

User Action
↓
Create Audit Log

Audit Log Menyimpan

* User
* Module
* Action
* Record
* Timestamp

```
```
