# BUSINESS_FLOW.md
> Aligned to prisma/schema.prisma
> Last updated: June 2026

---

# 1. Customer Flow

## Customer Create From Website

User
↓
Input Customer Data
↓
Save Customer (syncSource: LOCAL, syncStatus: PENDING)
↓
Create SyncQueue (entityType: CUSTOMER, direction: APP_TO_ACCURATE)
↓
Background Worker picks up queue
↓
Call Accurate API → create customer
↓
Save accurateCustomerId to customer
↓
Update syncStatus: SYNCED

## Customer Sync From Accurate

Accurate Webhook / Scheduled Pull
↓
Create SyncQueue (direction: ACCURATE_TO_APP)
↓
Worker processes queue
↓
Upsert Customer in local DB (match by accurateCustomerId)
↓
Update lastSyncAt

---

# 2. Booking Flow

Customer
↓
Select Branch
↓
Select Service(s) → AppointmentService
↓
Select Date & Time
↓
Validate Staff Schedule (no overlap on same date/time)
↓
Assign Staff → AppointmentStaff (isPrimary for lead stylist)
↓
Input Deposit / DP (Optional) → Deposit (status: PENDING)
↓
Create Appointment (status: BOOKED)
↓
Create AppointmentStatusHistory (null → BOOKED)

## Appointment Status Flow

BOOKED
↓
CONFIRMED (staff confirmed)
↓
CHECK_IN (customer arrives)
↓
IN_PROGRESS (treatment started)
↓
COMPLETED (treatment done)

Or:

BOOKED / CONFIRMED
↓
CANCELLED

Or:

BOOKED / CONFIRMED
↓
NO_SHOW

Each transition creates AppointmentStatusHistory record.

---

# 3. Treatment Flow

Appointment reaches CHECK_IN or IN_PROGRESS
↓
Create TreatmentSession (linked to appointment, customer, branch)
↓
Create TreatmentItems (one per service, with priceSnapshot + conversionSnapshot)
↓
Create TreatmentAssignments per TreatmentItem
  - Each assignment: employee + workQty
  - Multiple employees can be assigned to one TreatmentItem
↓
Treatment Completed
↓
Update TreatmentSession.completedAt
↓
Upload Before/After Photos → TreatmentMedia (mediaType: BEFORE | AFTER)
↓
Save treatment notes on TreatmentSession

---

# 4. POS Flow

Customer
↓
Select Items (INVENTORY) and/or Services (SERVICE)
↓
Apply Membership Discount
  - Check customer.membershipId → active CustomerMembership
  - Apply discountType (PERCENTAGE | FIXED_AMOUNT) to eligible items
↓
Generate Invoice
  - status: DRAFT → UNPAID
  - subtotal, totalDiscount, grandTotal, outstandingAmount calculated
↓
Record Payments → Payment records
↓
Update Invoice paidAmount and outstandingAmount
↓
Invoice Status:
  - paidAmount = 0 → UNPAID
  - 0 < paidAmount < grandTotal → PARTIAL
  - paidAmount >= grandTotal → PAID
↓
On PAID: trigger post-payment processing (see flows 6, 7, 12)

---

# 5. Deposit Flow

Appointment Created
↓
Customer pays DP
↓
Create Deposit (appointmentId, paymentMethodId, amount, status: PAID)

When Invoice is Created from Appointment
↓
Invoice grandTotal = full service amount
↓
Apply deposit(s) via InvoiceDeposit (amountApplied)
↓
Invoice.totalDeposit = sum of applied deposits
↓
Invoice.outstandingAmount = grandTotal - totalDeposit - paidAmount (from payments)
↓
Invoice status: UNPAID / PARTIAL / PAID

When Customer Pays Remainder
↓
Create Payment record
↓
Update Invoice paidAmount + outstandingAmount
↓
Deposit status updated: PAID → PARTIAL_USED / USED

Sync To Accurate:
  - Invoice syncs at full grandTotal
  - DP recorded as payment in Accurate separately

---

# 6. Service Material Flow (Stock Deduction from Treatment)

Invoice reaches PAID status
↓
For each TreatmentSession linked to Invoice
↓
For each TreatmentItem in TreatmentSession
↓
Read ServiceMaterials for that service item (BOM)
↓
Create MaterialUsage (linked to TreatmentItem)
↓
For each material:
  - Create MaterialUsageItem (materialItemId, unitId, qty)
  - Get Warehouse for branch
  - Create StockMovement (type: OUT, referenceType: "MATERIAL_USAGE")
  - Update Inventory.availableQty
↓
Stock deducted per branch warehouse

---

# 7. Product Sales Flow

Product (itemType: INVENTORY) added to Invoice
↓
Invoice PAID
↓
For each InvoiceItem with itemType = INVENTORY:
  - Get Warehouse for branch
  - Create StockMovement (type: OUT, referenceType: "INVOICE", referenceId: invoiceId)
  - Update Inventory.availableQty

---

# 8. Membership Flow

Customer Purchases Membership
↓
Create CustomerMembership (status: ACTIVE, startDate, endDate = startDate + durationDays)
↓
Create MembershipHistory record
↓
Update Customer.membershipId

When Invoice Created
↓
Check active CustomerMembership for customer
↓
If active: apply Membership.discountType + discountValue
↓
Record discount in InvoiceItem.discount and Invoice.totalDiscount

When Membership Renewed
↓
Set old CustomerMembership status: EXPIRED
↓
Create new CustomerMembership (status: ACTIVE)
↓
Create MembershipHistory record
↓
Update Customer.membershipId to new membership

---

# 9. Stock Transfer Flow

User creates transfer request
↓
Create StockTransfer (status: PENDING)
↓
Create StockTransferItems

Status: PENDING
↓
Dispatch confirmed
↓
Status: IN_TRANSIT
↓
Destination branch receives
↓
Status: RECEIVED
↓
On RECEIVED:
  - Create StockMovement (type: TRANSFER_OUT) for source warehouse
  - Update source Inventory.availableQty (reduce)
  - Create StockMovement (type: TRANSFER_IN) for destination warehouse
  - Update destination Inventory.availableQty (increase)

Or:

Status: PENDING / IN_TRANSIT
↓
CANCELLED (no stock movement created)

Note: No manager approval step — any authorized user can progress transfer status.

---

# 10. Attendance Flow

Employee Check In
↓
Create or update Attendance record for attendanceDate
↓
Save checkInAt (UTC)
↓
Save checkInLatitude + checkInLongitude (GPS)

Employee Check Out
↓
Update same Attendance record
↓
Save checkOutAt (UTC)
↓
Save checkOutLatitude + checkOutLongitude (GPS)

One Attendance record per employee per day.

---

# 11. Leave Flow

Employee Submits Leave
↓
Create Leave (status: PENDING)

Manager Reviews
↓
APPROVED: update status, approvedBy (String), approvedAt
↓
REJECTED: update status, approvedBy, approvedAt

On APPROVED:
↓
Optionally create EmployeeSchedule entries (scheduleType: LEAVE) for leave period

---

# 12. Commission Flow

Invoice reaches PAID status
↓
Get TreatmentSessions linked to Invoice
↓
For each TreatmentSession → TreatmentItems
↓
For each TreatmentItem → TreatmentAssignments
↓
For each TreatmentAssignment:
  - Get Employee
  - Get serviceItem from TreatmentItem
  - Get serviceItem.commissionCategoryId
  - Find active CommissionRule for (employeeId + commissionCategoryId)
    matching effectiveDate <= invoiceDate <= endDate
  - If no rule found: skip or use default
  - Calculate:
    - workRatio = assignment.workQty / sum(all workQty for same TreatmentItem)
    - baseAmount = invoiceItem price * workRatio (AFTER_DISCOUNT or BEFORE_DISCOUNT per rule)
    - commissionAmount = baseAmount * commissionValue (PERCENTAGE) OR fixed commissionValue (FIXED_AMOUNT)
  - Snapshot all values
  - Create Commission (status: PENDING)

Manager Review
↓
Commission status: PENDING → APPROVED or REJECTED

Finance Pays
↓
Commission status: APPROVED → PAID
↓
Update paidBy (String), paidAt

Note: commissionRule is per employee + commissionCategory (NOT per employee + service item).
Items are assigned to categories, and rules are defined at the category level.
There is NO separate branch_commissions table. Branch-level commissions
(for Manager/CS roles) use BranchCommissionRule and are calculated at the service layer.

---

# 13. Accurate Sync Flow

## Customer (Bidirectional)

Website → Accurate:
  Website creates/updates customer
  → SyncQueue (direction: APP_TO_ACCURATE, status: PENDING)
  → Worker → Accurate API
  → Save accurateCustomerId
  → SyncQueue status: SUCCESS

Accurate → Website:
  SyncQueue (direction: ACCURATE_TO_APP)
  → Worker → fetch from Accurate
  → Upsert local customer

## Product / Unit / Category Sync (Accurate → Website only)
  Accurate is source of truth for items
  → SyncQueue (direction: ACCURATE_TO_APP)
  → Worker syncs Item, Unit, ItemCategory, ItemPrice

## Invoice Sync (Website → Accurate)
  Invoice created on website
  → SyncQueue (direction: APP_TO_ACCURATE)
  → Worker → POST to Accurate
  → Save accurateInvoiceId + accurateInvoiceNumber
  → Update Invoice.lastSyncAt

## Payment Sync (Website → Accurate)
  Payment created on website
  → SyncQueue (direction: APP_TO_ACCURATE)
  → Worker → POST receipt to Accurate
  → Save accurateReceiptId + accurateReceiptNumber

## On Failure
  SyncQueue status: FAILED
  retryCount incremented
  SyncLog records full request + response payload
  Retry job re-queues FAILED items up to max retry limit

---

# 14. Audit Log Flow

Any of these actions:
- Create / Update / Delete (soft) on key entities
- Payment recorded
- Commission approved/paid
- Appointment status changed
- Invoice status changed
↓
Create AuditLog:
  - userId (String, from JWT context)
  - module (e.g. "INVOICE", "CUSTOMER", "COMMISSION")
  - action (e.g. "CREATE", "UPDATE", "STATUS_CHANGE", "PAYMENT")
  - recordId (ID of affected record)
  - oldData (Json snapshot before change)
  - newData (Json snapshot after change)
  - ipAddress
  - createdAt
