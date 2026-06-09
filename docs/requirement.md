# REQUIREMENTS.md
> Aligned to prisma/schema.prisma
> Last updated: June 2026

---

# Customer Management

## Multi Staff Assignment

One TreatmentItem can be handled by more than one employee via TreatmentAssignment.

Example:

Hair Extension — 120 strands total

Stylist A = 70 strands (workQty: 70)
Stylist B = 50 strands (workQty: 50)

Commission is calculated based on each employee's workQty proportion (workRatio).

## Customer Source

Customers can be created from:
- Website (syncSource: LOCAL)
- Accurate Online (syncSource: ACCURATE)

If created from website:
1. Customer saved locally (syncStatus: PENDING)
2. SyncQueue created (direction: APP_TO_ACCURATE)
3. Worker syncs to Accurate
4. accurateCustomerId saved back to customer record
5. syncStatus updated to SYNCED

If created from Accurate:
1. SyncQueue created (direction: ACCURATE_TO_APP)
2. Worker upserts customer locally

## Customer Information

Customer stores:
- name
- customerNo
- mobilePhone
- email
- address, city, province
- birthDate
- gender (MALE | FEMALE)
- membershipId (active membership reference)
- notes
- lastVisitAt
- syncSource, syncStatus, syncError, lastSyncAt

Note: No separate whatsapp field. mobilePhone is the single phone contact field.

## Customer Branch

Customers are NOT tied to a specific branch.

A customer can book and transact at any branch.

## Customer Treatment History

Every treatment session is stored as a TreatmentSession record.

History includes:
- Date (createdAt / completedAt)
- Branch (branchId)
- Staff (via TreatmentAssignments → employees)
- Services (TreatmentItems → items)
- Invoice (invoiceId)
- Notes

## Customer Gallery

Each TreatmentSession can have multiple TreatmentMedia records.

Media types: BEFORE, AFTER

Files stored in Object Storage. Only fileUrl stored in database.

## Customer Notes

Customer can have many CustomerNote records.

Notes are created with createdBy (stored as String, e.g. user ID or name — not a FK to employees).

Notes cannot be deleted. No soft-delete on customer_notes.

---

# Membership

## Membership Rules

A customer can only have one active membership at a time.
Active membership is referenced via customer.membershipId.
Membership status tracked in CustomerMembership (ACTIVE | EXPIRED | CANCELLED).

Membership has:
- name
- price
- durationDays
- discountType (PERCENTAGE | FIXED_AMOUNT)
- discountValue

Membership discount is applied automatically when an invoice is created
if the customer has an active CustomerMembership.

## Membership Expiration

CustomerMembership has startDate and endDate.

When membership expires: status → EXPIRED.
When renewed: old status → EXPIRED, new CustomerMembership created (status: ACTIVE).
Customer.membershipId updated to new membership.

## Membership History

All membership changes recorded in MembershipHistory:
- customerId
- membershipId
- startDate
- endDate
- createdBy (String)
- createdAt

---

# Product Management

## Item Source

All items originate from Accurate Online.

Website does NOT create items manually.

Items are synced automatically from Accurate via SyncQueue worker.

## Item Types

Items can be:
- INVENTORY (physical products with stock)
- SERVICE (treatments, no stock tracking)

Example INVENTORY: Keratin Liquid, Shampoo, Hair Serum, Hair Mask
Example SERVICE: Keratin Premium, Hair Botox, Smoothing, Hair Coloring

Inventory records (inventories table) are only created for items where itemType = INVENTORY.
SERVICE items must NOT appear in the inventories table.

## Item Information

Each synced item stores:
- accurateItemId (from Accurate)
- itemCode (unique)
- name
- itemType (INVENTORY | SERVICE)
- categoryId → ItemCategory
- defaultUnitId → Unit
- commissionCategoryId → CommissionCategory (for commission rule lookup)
- isActive
- lastSyncAt

## Unit Management

Units follow Accurate data and are stored in the units table.

ItemUnit records store per-item unit conversions with conversionFactor.

Example:
- Keratin Liquid default unit: ml
- 1000 ml = 1 Liter (conversionFactor: 1000)

## Item Sync

Items modified in Accurate are updated locally via sync worker.

Customer and transaction records must NOT modify item master data.

---

# Service Materials (BOM)

## Service Material Definition

Service materials are defined on the website (not synced from Accurate).

Each SERVICE item can have a list of INVENTORY items as materials (ServiceMaterial).

Example:
Service: Keratin Premium
Materials:
- Keratin Liquid — 50 ml
- Clarifying Shampoo — 20 ml
- Hair Serum — 10 ml

## Service Material Rules

- One service can have many materials
- One material can be used by many services
- unique(serviceItemId, materialItemId) constraint enforced
- All materials must be INVENTORY items

## Automatic Stock Deduction

Triggered when Invoice reaches PAID status.

Flow:
1. Get TreatmentSessions linked to Invoice
2. For each TreatmentItem in each session
3. Read ServiceMaterials for that service
4. Create MaterialUsage (linked to TreatmentItem)
5. For each material: create MaterialUsageItem + StockMovement (OUT) + update Inventory

---

# Treatment Session

Each treatment generates one TreatmentSession.

TreatmentSession stores:
- customerId
- appointmentId (optional — walk-in sessions have no appointment)
- invoiceId (optional — linked when invoice is created)
- branchId
- startedAt, completedAt
- notes

TreatmentItems (services performed) are children of TreatmentSession.

TreatmentAssignments (staff + workQty) are children of TreatmentItem.

Media (before/after photos) stored as TreatmentMedia records.

---

# Booking System

## Appointment

Appointment stores:
- customerId
- branchId
- bookingNo (auto-generated, unique)
- bookingDate (when booking was made)
- visitDate, startTime, endTime
- status
- estimatedTotal
- notes

## Appointment Status

BOOKED → CONFIRMED → CHECK_IN → IN_PROGRESS → COMPLETED

Or: any active status → CANCELLED
Or: any active status → NO_SHOW

Each status transition recorded in AppointmentStatusHistory.

## Staff Assignment

Multiple staff can be assigned per appointment via AppointmentStaff.

One staff is marked isPrimary = true (lead stylist).

There is no role field on AppointmentStaff. Staff role is derived from
employee.roleId → EmployeeRole (STYLIST, ASSISTANT, COLORIST, etc).

Staff schedule overlap validation must be performed before creating AppointmentStaff.
An employee cannot have two appointments at the same date/time.

## Booking Deposit

Deposit is optional at booking time.

Deposit (status: PAID) is applied to Invoice via InvoiceDeposit when invoice is created.

Invoice grandTotal = full service amount (not reduced by deposit at Accurate level).

Deposit is recorded as a separate payment in Accurate.

Example:
- Total Invoice: Rp 1.000.000
- Deposit Applied: Rp 300.000 (totalDeposit on invoice)
- Outstanding: Rp 700.000
- Accurate Invoice: Rp 1.000.000 (full amount)
- DP synced as separate payment to Accurate

---

# Media Storage

Before/After photos stored in Object Storage (S3-compatible).

Only fileUrl stored in TreatmentMedia.database

One TreatmentSession can have multiple media items (multiple BEFORE, multiple AFTER).

---

# POS

## Invoice

Invoice created on website first, then synced to Accurate.

Invoice statuses: DRAFT → UNPAID → PARTIAL → PAID → CANCELLED

Cancelled invoice must:
- Reverse StockMovements (create offsetting movements)
- Cancel associated Commissions (status → REJECTED)
- Handle Payment reversals
- Update InvoiceStatusHistory

## Invoice Items

Invoice can contain any combination of INVENTORY and SERVICE items.

Each InvoiceItem stores: qty, price, discount, subtotal, unitId.

## Discount

Discount applied at InvoiceItem level (item.discount field).

Invoice.totalDiscount = sum of all item discounts.

Can be:
- Fixed amount (FIXED_AMOUNT)
- Percentage (calculated and stored as fixed amount on item)

## Payment Methods

Available methods: CASH, TRANSFER, QRIS, DEBIT, CREDIT_CARD (managed in PaymentMethod table).

Multiple payments per invoice are supported (partial payments).

---

# Multi Branch

## Branch

System supports multi-branch operations.

## Stock

Each branch has its own Warehouse with separate Inventory records.

Stock movements are always tied to a specific warehouse.

## Stock Transfer

Transfer stock between branches.

Transfer statuses: PENDING → IN_TRANSIT → RECEIVED → CANCELLED

StockMovements (TRANSFER_OUT + TRANSFER_IN) are created only when status reaches RECEIVED.

No manager approval required to progress transfer status.
Any authorized user can update transfer status.

Transfer records:
- sourceWarehouseId
- destinationWarehouseId
- transferNo (unique)
- transferDate
- createdBy (String)
- StockTransferItems (item + qty per line)

---

# Employee

## Employee Data

Employee stores:
- employeeCode (unique)
- roleId → EmployeeRole (STYLIST, ASSISTANT, COLORIST, CUSTOMER_SERVICE, MANAGER)
- name, phone, email, address
- hireDate, birthDate
- emergencyContact
- commissionEnabled
- isActive

Employee branch access controlled via EmployeeBranch (not a direct branchId on employee).

## User Account

An employee may optionally have a linked User account (User.employeeId).

User role (UserRole) is separate from EmployeeRole.

---

# Authorization

## User Roles (for system access)

- SUPER_ADMIN
- OWNER
- MANAGER
- CS
- STYLIST
- ASSISTANT
- COLORIST
- FINANCE

(Managed in user_roles table via UserRole.code)

## Employee Roles (for operational assignment)

- STYLIST
- ASSISTANT
- COLORIST
- CUSTOMER_SERVICE
- MANAGER

(Managed in employee_roles table via EmployeeRole.code)

## Permissions

Role-based permission enforced in middleware.

Example:
- CS: Create Invoice, View Customer
- STYLIST: View Schedule, View Customer History, Check In Attendance
- MANAGER: Manage Booking, Manage Employee, Approve Commission
- OWNER: View All Reports
- FINANCE: Pay Commission, View Financial Reports

---

# Attendance

Attendance uses GPS (latitude/longitude) for check-in and check-out.

One Attendance record per employee per attendanceDate.

Records:
- checkInAt (UTC DateTime)
- checkOutAt (UTC DateTime)
- checkInLatitude, checkInLongitude
- checkOutLatitude, checkOutLongitude
- notes

---

# Schedule

## Work Schedule

EmployeeSchedule has one record per employee per date (unique constraint).

scheduleType: WORK | OFF | LEAVE

Appointment booking must validate that assigned staff has scheduleType = WORK
(or no schedule conflict) for the appointment date/time.

## Staff Overlap Validation

Before creating AppointmentStaff, system must check that the employee
has no other IN_PROGRESS or CONFIRMED appointments overlapping the same time window.

---

# Leave

Employee submits Leave request (status: PENDING).

Manager approves (APPROVED) or rejects (REJECTED).

Approved leave can optionally generate EmployeeSchedule entries with scheduleType = LEAVE.

Leave records: employeeId, startDate, endDate, reason, status, approvedBy (String), approvedAt.

---

# Commission

## Commission Calculation

Commission is calculated AFTER invoice reaches PAID status.

Commission rule is defined per: employee + commissionCategory (NOT per employee + service item).

Items are grouped into CommissionCategories. Each item has a commissionCategoryId.

CommissionRule fields:
- commissionType: PERCENTAGE | FIXED_AMOUNT
- commissionValue: rate or fixed amount
- commissionBase: BEFORE_DISCOUNT | AFTER_DISCOUNT
- effectiveDate, endDate (date-ranged rules)

Multi-staff commission:
- workRatio = employee's workQty / total workQty for that TreatmentItem
- baseAmount = invoiceItem price (adjusted per commissionBase) × workRatio
- commissionAmount = baseAmount × commissionValue (for PERCENTAGE)

## Commission Snapshot

When commission is created, all values are snapshotted:
- commissionType
- commissionValue
- commissionBase
- baseAmount
- commissionAmount
- workQty, workRatio

Changing a CommissionRule after the fact does NOT change historical commissions.

## Commission Status

PENDING → APPROVED → PAID

Or: PENDING / APPROVED → REJECTED

## Branch-Level Commission (Manager / CS)

BranchCommissionRule stores per-employee + per-branch commission configuration
(commissionType, commissionValue, effectiveDate).

This is used for Manager and CS roles who earn commission based on branch revenue.

Calculation is handled at the service/application layer — there is no
separate branch_commissions table in the database.

---

# Audit Log

AuditLog must be created for:
- create, update, soft-delete on: Customer, Employee, Item, Invoice, Payment, Commission
- Appointment status changes
- Invoice status changes
- Commission approval/payment
- Stock adjustments

AuditLog stores:
- userId (String from JWT context)
- module
- action
- recordId
- oldData (JSON snapshot)
- newData (JSON snapshot)
- ipAddress
- createdAt

---

# Accurate Integration

## Sync Queue

All Accurate sync operations go through SyncQueue.

SyncQueue fields: entityType, entityId, direction, status, retryCount, payload, response, errorMessage.

Status flow: PENDING → PROCESSING → SUCCESS / FAILED

System must retry FAILED items. Max retry configurable.

SyncLog records full request/response payloads for debugging.

## Customer Sync

Bidirectional. Website ↔ Accurate.

## Product Sync

Accurate → Website only. Accurate is source of truth for items.

## Invoice Sync

Website → Accurate. Invoice created locally first, then queued for Accurate.

## Payment Settlement

Payment created locally → queued → synced to Accurate as receipt.

---

# Dashboard

Dashboard displays:
- Daily / Monthly Revenue
- Revenue per Branch
- Top Services
- Top Products
- New Customers
- Active Memberships
- Low Stock alerts (Inventory.availableQty < minimumQty)
- Commission by Stylist (pending + approved + paid)
- Attendance summary
