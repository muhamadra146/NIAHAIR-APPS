# ERD.md
> Source of truth: prisma/schema.prisma
> Last updated: June 2026

---

# MASTER DATA

## branches

PK: id

Fields:
- code (unique)
- name
- address
- city
- province
- phone
- isActive

Relations:
- branch has many employeeBranchHistories
- branch has many employeeBranches
- branch has many itemPrices
- branch has many warehouses
- branch has many invoices
- branch has many appointments
- branch has many treatmentSessions
- branch has many branchCommissionRules

---

## user_roles

PK: id

Fields:
- code (unique)
- name
- isActive

Relations:
- userRole has many users

---

## users

PK: id

FK:
- userRoleId → user_roles
- employeeId (nullable, unique) → employees

Fields:
- name
- email (unique)
- passwordHash
- isActive

Note: users has NO direct branchId. Branch access is controlled via employee → employeeBranches.

---

## employee_roles

PK: id

Fields:
- code (unique)
- name
- isActive

Relations:
- employeeRole has many employees

---

## employees

PK: id

FK:
- roleId → employee_roles

Fields:
- employeeCode (unique)
- name
- phone
- email (unique, nullable)
- hireDate
- birthDate
- address
- emergencyContact
- commissionEnabled (default: true)
- isActive

Note: employees has NO direct branchId. Branch assignment is via employee_branches junction table.

Relations:
- employee has one role (EmployeeRole)
- employee has many branchHistories (EmployeeBranchHistory)
- employee has many employeeBranches (EmployeeBranch)
- employee has one user (optional)
- employee has many appointmentStaffs
- employee has many treatmentAssignments
- employee has many commissionRules
- employee has many commissions
- employee has many attendances
- employee has many schedules
- employee has many leaves
- employee has many branchCommissionRules

---

## employee_branch_histories

PK: id

FK:
- employeeId → employees
- branchId → branches

Fields:
- startDate
- endDate (nullable)
- createdAt

---

## employee_branches

PK: id

FK:
- employeeId → employees
- branchId → branches

Fields:
- isPrimary (default: false)
- isActive (default: true)
- createdAt
- updatedAt

Constraints:
- unique(employeeId, branchId)

Purpose: Controls which branches an employee can access/operate in.

---

# MEMBERSHIP

## memberships

PK: id

Fields:
- name
- price (Decimal 18,2)
- durationDays
- discountType (PERCENTAGE | FIXED_AMOUNT)
- discountValue (Decimal 18,2)

Relations:
- membership has many customerMemberships
- membership has many customers (active membership ref)
- membership has many membershipHistories

---

## customer_memberships

PK: id

FK:
- customerId → customers
- membershipId → memberships

Fields:
- startDate
- endDate
- status (ACTIVE | EXPIRED | CANCELLED)
- createdAt
- updatedAt

---

## membership_histories

PK: id

FK:
- customerId → customers
- membershipId → memberships

Fields:
- startDate
- endDate
- createdBy (String?, not FK)
- createdAt

---

# CUSTOMERS

## customers

PK: id

FK:
- membershipId (nullable) → memberships

Fields:
- accurateCustomerId (Int?, unique)
- customerNo (unique, nullable)
- name
- mobilePhone
- email
- address
- city
- province
- birthDate
- gender (MALE | FEMALE, nullable)
- notes
- lastVisitAt
- isActive
- syncSource (LOCAL | ACCURATE, default: LOCAL)
- syncStatus (PENDING | SYNCED | FAILED, default: PENDING)
- syncError
- lastSyncAttemptAt
- lastSyncAt
- createdAt
- updatedAt

Note: Customer has NO whatsapp field in schema.

Relations:
- customer has many customerMemberships
- customer has many membershipHistories
- customer has many appointments
- customer has many invoices
- customer has many treatmentSessions
- customer has many customerNotes

---

## customer_notes

PK: id

FK:
- customerId → customers

Fields:
- note
- createdBy (String?, NOT a FK to employees — stores name/id as string only)
- createdAt

Note: No employee_id FK. Notes cannot be deleted (soft-delete not applicable — no isActive field).

---

# ITEM MASTER

## item_categories

PK: id

Fields:
- accurateCategoryId (Int?, unique)
- name
- isActive
- createdAt
- updatedAt

Relations:
- category has many items

---

## units

PK: id

Fields:
- accurateUnitId (Int?, unique)
- name
- isActive
- lastSyncAt
- createdAt
- updatedAt

Relations:
- unit used by many itemUnits
- unit used by many itemPrices
- unit used by many serviceMaterials
- unit used by many materialUsageItems
- unit used by many invoiceItems
- unit used by many treatmentItems

---

## items

PK: id

FK:
- categoryId (nullable) → item_categories
- defaultUnitId (nullable) → units
- commissionCategoryId (nullable) → commission_categories

Fields:
- accurateItemId (Int?, unique)
- itemCode (unique)
- name
- itemType (INVENTORY | SERVICE)
- isActive
- lastSyncAt
- createdAt
- updatedAt

Relations:
- item has many itemUnits
- item has many itemPrices
- item has many inventories (only INVENTORY type)
- item has many stockMovements
- item has many stockTransferItems
- item has many appointmentServices
- item has many invoiceItems
- item has many commissions (as serviceItem)
- item has many treatmentItems
- item has many serviceMaterials (as serviceItem)
- item has many serviceMaterials (as materialItem)
- item has many materialUsageItems

---

## item_units

PK: id

FK:
- itemId → items
- unitId → units

Fields:
- conversionFactor (Decimal 18,6)
- isDefault (default: false)
- createdAt
- updatedAt

Constraints:
- unique(itemId, unitId)

---

## item_prices

PK: id

FK:
- itemId → items
- unitId → units
- branchId (nullable) → branches

Fields:
- sellingPrice (Decimal 18,2)
- costPrice (Decimal 18,2, nullable)
- effectiveDate
- isActive
- createdAt
- updatedAt

---

# INVENTORY

## warehouses

PK: id

FK:
- branchId (nullable, unique) → branches

Fields:
- accurateWarehouseId (Int?, unique)
- name
- isActive
- lastSyncAt
- createdAt
- updatedAt

Relations:
- warehouse has many inventories
- warehouse has many stockMovements
- warehouse has many transferOuts (StockTransfer as source)
- warehouse has many transferIns (StockTransfer as destination)

---

## inventories

PK: id

FK:
- warehouseId → warehouses
- itemId → items

Fields:
- availableQty (Decimal 18,6)
- reservedQty (Decimal 18,6)
- minimumQty (Decimal 18,6)
- lastSyncAt
- createdAt
- updatedAt

Constraints:
- unique(warehouseId, itemId)

---

## stock_movements

PK: id

FK:
- warehouseId → warehouses
- itemId → items
- invoiceItemId (nullable) → invoice_items

Fields:
- type (IN | OUT | ADJUSTMENT | TRANSFER_IN | TRANSFER_OUT)
- qty (Decimal 18,6)
- balanceBefore (Decimal 18,6)
- balanceAfter (Decimal 18,6)
- referenceType (String?, e.g. "INVOICE", "TRANSFER")
- referenceId (String?, ID of the reference record)
- notes
- createdAt

Constraints:
- unique(referenceType, referenceId, invoiceItemId)

---

## stock_transfers

PK: id

FK:
- sourceWarehouseId → warehouses
- destinationWarehouseId → warehouses

Fields:
- transferNo (unique)
- status (PENDING | IN_TRANSIT | RECEIVED | CANCELLED)
- notes
- transferDate
- createdBy (String?, not FK)
- createdAt
- updatedAt

Relations:
- stockTransfer has many items (StockTransferItem)

Note: Status enum is PENDING → IN_TRANSIT → RECEIVED → CANCELLED.
NOT: DRAFT/SENT. ERD.md previously had wrong enum values.

---

## stock_transfer_items

PK: id

FK:
- transferId → stock_transfers
- itemId → items

Fields:
- qty (Decimal 18,6)
- createdAt

---

# SERVICE MATERIALS (BOM)

## service_materials

PK: id

FK:
- serviceItemId → items (itemType = SERVICE)
- materialItemId → items (itemType = INVENTORY)
- unitId → units

Fields:
- qty (Decimal 18,6)
- isActive
- createdAt
- updatedAt

Constraints:
- unique(serviceItemId, materialItemId)

---

## material_usages

PK: id

FK:
- treatmentItemId → treatment_items

Fields:
- processedAt
- createdAt

Note: FK is treatmentItemId, NOT treatmentSessionId+serviceItemId as some older docs stated.

Relations:
- materialUsage has many usageItems (MaterialUsageItem)

---

## material_usage_items

PK: id

FK:
- materialUsageId → material_usages
- materialItemId → items
- unitId → units

Fields:
- stockMovementId (String?, not a FK — reference only)
- qty (Decimal 18,6)
- createdAt

---

# APPOINTMENT / BOOKING

## appointments

PK: id

FK:
- customerId → customers
- branchId → branches

Fields:
- bookingNo (unique)
- bookingDate
- visitDate
- startTime
- endTime
- status (BOOKED | CONFIRMED | CHECK_IN | IN_PROGRESS | COMPLETED | CANCELLED | NO_SHOW)
- notes
- estimatedTotal (Decimal 18,2, nullable)
- createdAt
- updatedAt

Relations:
- appointment has many services (AppointmentService)
- appointment has many staffs (AppointmentStaff)
- appointment has many deposits
- appointment has many invoices
- appointment has many statusHistories
- appointment has many treatmentSessions

---

## appointment_services

PK: id

FK:
- appointmentId → appointments
- serviceItemId → items

Fields:
- durationMinutes
- qty (Decimal 18,2)
- price (Decimal 18,2)
- notes
- createdAt
- updatedAt

---

## appointment_staffs

PK: id

FK:
- appointmentId → appointments
- employeeId → employees

Fields:
- isPrimary (default: false)
- createdAt

Constraints:
- unique(appointmentId, employeeId)

Note: There is NO role field (STYLIST/ASSISTANT/COLORIST) on this model.
Staff role is determined by employee.roleId → employee_roles.

---

## deposits

PK: id

FK:
- appointmentId → appointments
- paymentMethodId → payment_methods

Fields:
- amount (Decimal 18,2)
- status (PENDING | PAID | PARTIAL_USED | USED | REFUNDED | CANCELLED)
- paidAt (nullable)
- accurateInvoiceId (Int?, unique)
- accurateInvoiceNumber (nullable)
- lastSyncAt (nullable)
- notes
- createdAt
- updatedAt

Relations:
- deposit has many invoiceDeposits

Note: Deposit status enum has 6 values: PENDING, PAID, PARTIAL_USED, USED, REFUNDED, CANCELLED.
Older docs were missing PARTIAL_USED and USED.

---

## appointment_status_histories

PK: id

FK:
- appointmentId → appointments

Fields:
- oldStatus (AppointmentStatus?, nullable)
- newStatus (AppointmentStatus)
- notes
- createdBy (String?, not FK)
- createdAt

---

# INVOICE & PAYMENT

## payment_methods

PK: id

Fields:
- accuratePaymentMethodId (Int?, nullable)
- code (unique)
- name
- isActive
- createdAt
- updatedAt

---

## invoices

PK: id

FK:
- customerId → customers
- branchId → branches
- appointmentId (nullable) → appointments

Fields:
- accurateInvoiceId (Int?, unique)
- accurateInvoiceNumber (nullable)
- invoiceNo (unique)
- invoiceDate
- subtotal (Decimal 18,2)
- totalDiscount (Decimal 18,2, default: 0)
- totalDeposit (Decimal 18,2, default: 0)
- totalTax (Decimal 18,2, default: 0)
- grandTotal (Decimal 18,2)
- paidAmount (Decimal 18,2, default: 0)
- outstandingAmount (Decimal 18,2)
- status (DRAFT | UNPAID | PARTIAL | PAID | CANCELLED)
- notes
- lastSyncAt
- createdAt
- updatedAt

Relations:
- invoice has many invoiceItems
- invoice has many payments
- invoice has many invoiceDeposits
- invoice has many statusHistories
- invoice has many treatmentSessions
- invoice has many commissions

---

## invoice_items

PK: id

FK:
- invoiceId → invoices
- itemId → items
- unitId → units

Fields:
- accurateInvoiceDetailId (Int?, nullable)
- qty (Decimal 18,2)
- price (Decimal 18,2)
- discount (Decimal 18,2, default: 0)
- subtotal (Decimal 18,2)
- notes
- createdAt
- updatedAt

Relations:
- invoiceItem has many commissions
- invoiceItem has many stockMovements

---

## payments

PK: id

FK:
- invoiceId → invoices
- paymentMethodId → payment_methods

Fields:
- paymentNo (unique)
- amount (Decimal 18,2)
- paymentDate
- referenceNo (nullable)
- notes
- accurateReceiptId (Int?, unique)
- accurateReceiptNumber (nullable)
- lastSyncAt
- createdAt
- updatedAt

---

## invoice_deposits

PK: id

FK:
- invoiceId → invoices
- depositId → deposits

Fields:
- amountApplied (Decimal 18,2)
- createdAt

Constraints:
- unique(invoiceId, depositId)

---

## invoice_status_histories

PK: id

FK:
- invoiceId → invoices

Fields:
- oldStatus (InvoiceStatus?, nullable)
- newStatus (InvoiceStatus)
- notes
- createdBy (String?, not FK)
- createdAt

---

# COMMISSION

## commission_categories

PK: id

Fields:
- code (unique)
- name
- isActive
- createdAt
- updatedAt

Relations:
- commissionCategory has many items (items.commissionCategoryId)
- commissionCategory has many commissionRules

---

## commission_rules

PK: id

FK:
- employeeId → employees
- commissionCategoryId → commission_categories

Fields:
- commissionType (PERCENTAGE | FIXED_AMOUNT)
- commissionValue (Decimal 18,2)
- commissionBase (BEFORE_DISCOUNT | AFTER_DISCOUNT, default: AFTER_DISCOUNT)
- effectiveDate
- endDate (nullable)
- isActive
- createdAt
- updatedAt

Constraints:
- unique(employeeId, commissionCategoryId, effectiveDate)

Note: CommissionRule is per employee + commissionCATEGORY, NOT per employee + service item.
Items are grouped into commission categories. This is a key design decision.

---

## commissions

PK: id

FK:
- invoiceId → invoices
- invoiceItemId (nullable) → invoice_items
- treatmentAssignmentId → treatment_assignments (unique)
- employeeId → employees
- serviceItemId → items
- commissionRuleId (nullable) → commission_rules

Fields:
- workQty (Decimal 18,2, nullable)
- workRatio (Decimal 18,6, nullable)
- commissionType (PERCENTAGE | FIXED_AMOUNT)
- commissionValue (Decimal 18,2)
- commissionBase (BEFORE_DISCOUNT | AFTER_DISCOUNT)
- baseAmount (Decimal 18,2)
- commissionAmount (Decimal 18,2)
- status (PENDING | APPROVED | REJECTED | PAID)
- approvedBy (String?, not FK)
- approvedAt (nullable)
- paidBy (String?, not FK)
- paidAt (nullable)
- notes
- createdAt

Constraints:
- unique(treatmentAssignmentId) — one commission per treatment assignment

Note: CommissionStatus has 4 values: PENDING, APPROVED, REJECTED, PAID.
Older docs were missing REJECTED.

---

## treatment_assignments

PK: id

FK:
- treatmentItemId → treatment_items
- employeeId → employees

Fields:
- workQty (Decimal 18,2)
- notes
- createdAt

Relations:
- treatmentAssignment has many commissions

---

## branch_commission_rules

PK: id

FK:
- branchId → branches
- employeeId → employees

Fields:
- commissionType (PERCENTAGE | FIXED_AMOUNT)
- commissionValue (Decimal 18,2)
- effectiveDate
- endDate (nullable)
- isActive
- createdAt

Note: BranchCommissionRule is per employee+branch, NOT per role.
There is NO separate branch_commissions aggregate table in the schema.
Branch-level commission calculation must be done at application layer.

---

# ATTENDANCE & HR

## attendances

PK: id

FK:
- employeeId → employees

Fields:
- attendanceDate
- checkInAt (nullable)
- checkOutAt (nullable)
- checkInLatitude (Decimal 10,7, nullable)
- checkInLongitude (Decimal 10,7, nullable)
- checkOutLatitude (Decimal 10,7, nullable)
- checkOutLongitude (Decimal 10,7, nullable)
- notes
- createdAt
- updatedAt

---

## employee_schedules

PK: id

FK:
- employeeId → employees

Fields:
- scheduleDate
- startTime (nullable)
- endTime (nullable)
- scheduleType (WORK | OFF | LEAVE)
- notes
- createdAt
- updatedAt

Constraints:
- unique(employeeId, scheduleDate)

---

## leaves

PK: id

FK:
- employeeId → employees

Fields:
- startDate
- endDate
- reason (nullable)
- status (PENDING | APPROVED | REJECTED)
- approvedBy (String?, not FK)
- approvedAt (nullable)
- createdAt
- updatedAt

---

# TREATMENT

## treatment_sessions

PK: id

FK:
- appointmentId (nullable) → appointments
- customerId → customers
- invoiceId (nullable) → invoices
- branchId → branches

Fields:
- startedAt (nullable)
- completedAt (nullable)
- notes
- createdAt
- updatedAt

Relations:
- treatmentSession has many treatmentItems
- treatmentSession has many media (TreatmentMedia)

---

## treatment_items

PK: id

FK:
- treatmentSessionId → treatment_sessions
- itemId → items
- unitId → units

Fields:
- qty (Decimal 18,2)
- priceSnapshot (Decimal 18,2)
- conversionSnapshot (Decimal 18,6)
- notes
- createdAt
- updatedAt

Relations:
- treatmentItem has many assignments (TreatmentAssignment)
- treatmentItem has many materialUsages

---

## treatment_media

PK: id

FK:
- treatmentSessionId → treatment_sessions

Fields:
- mediaType (BEFORE | AFTER)
- fileUrl
- notes
- createdAt

---

# SYSTEM & AUDIT

## audit_logs

PK: id

Fields:
- userId (String?, not FK)
- module
- action
- recordId (nullable)
- oldData (Json?, nullable)
- newData (Json?, nullable)
- ipAddress (nullable)
- createdAt

---

## settings

PK: id

Fields:
- key (unique)
- value
- description (nullable)
- createdAt
- updatedAt

---

# ACCURATE INTEGRATION

## sync_queues

PK: id

Fields:
- entityType
- entityId
- direction (ACCURATE_TO_APP | APP_TO_ACCURATE)
- status (PENDING | PROCESSING | SUCCESS | FAILED)
- retryCount (default: 0)
- payload (Json?, nullable)
- response (Json?, nullable)
- errorMessage (nullable)
- processedAt (nullable)
- createdAt

---

## sync_logs

PK: id

Fields:
- queueId (String?, not FK)
- entityType
- entityId (nullable)
- requestPayload (Json?, nullable)
- responsePayload (Json?, nullable)
- status (PENDING | PROCESSING | SUCCESS | FAILED)
- errorMessage (nullable)
- createdAt

---

## accurate_credentials

PK: id

Fields:
- sessionId (nullable)
- databaseId (nullable)
- accessToken (nullable)
- refreshToken (nullable)
- expiredAt (nullable)
- createdAt
- updatedAt

---

## accurate_mappings

PK: id

Fields:
- entityType
- localId
- accurateId (Int)
- lastSyncAt (nullable)
- createdAt

Constraints:
- unique(entityType, localId)

---

## background_jobs

PK: id

Fields:
- jobName
- status (PENDING | RUNNING | SUCCESS | FAILED)
- payload (Json?, nullable)
- startedAt (nullable)
- finishedAt (nullable)
- errorMessage (nullable)
- createdAt

---

## webhook_logs

PK: id

Fields:
- source
- event
- payload (Json?, nullable)
- processed (default: false)
- errorMessage (nullable)
- createdAt
