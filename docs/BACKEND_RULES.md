# BACKEND RULES

Project:
NIA Hair ERP System

Stack:
- Node.js
- Express.js
- PostgreSQL
- Prisma ORM
- JWT Authentication

---

# IMPORTANT RULE

DO NOT MODIFY:
- prisma/schema.prisma
- database structure
- table name
- field name
- relation
- enum

Database design is LOCKED.

---

# Architecture Pattern

Every module MUST follow:

```
modules/{module}/
  {module}.route.js
  {module}.controller.js
  {module}.service.js
  {module}.repository.js
  {module}.validation.js
```

Flow:

```
Request
↓
Route
↓
Validation (validation.js)
↓
Controller (controller.js)
↓
Service (service.js)
↓
Repository (repository.js)
↓
Prisma
↓
PostgreSQL
```

---

# Controller Rules

Controller only:
- Receives request
- Calls service
- Returns response

Controller MUST NOT:
- Access Prisma directly
- Contain business logic

BAD:
```js
const customers = await prisma.customer.findMany()
```

GOOD:
```js
const customers = await customerService.findAll()
```

---

# Service Rules

Service contains:
- Business logic
- Validation logic
- Transaction handling

Example — Create Invoice:
- Check customer exists
- Check active membership → apply discount
- Calculate totals (subtotal, discount, grandTotal, outstandingAmount)
- Create Invoice + InvoiceItems in transaction
- Create InvoiceStatusHistory
- Create SyncQueue for Accurate
- Create AuditLog

---

# Repository Rules

Only repository files may access Prisma.

Example: `customer.repository.js`
```js
findById(id)
findAll(filters)
create(data)
update(id, data)
```

---

# Response Format

Success:
```json
{
  "success": true,
  "message": "",
  "data": {}
}
```

Error:
```json
{
  "success": false,
  "message": "",
  "error": {}
}
```

---

# Error Handling

Do NOT use try/catch scattered everywhere.

Use a centralized Global Error Handler middleware.

Service layer throws typed errors. Controller passes them up. Global handler catches and formats response.

---

# Authentication

Use JWT Access Token.

Role-based permission middleware applied per route.

## User Roles (UserRole.code in user_roles table)

| Code        | Access Level               |
|-------------|----------------------------|
| SUPER_ADMIN | Everything                 |
| OWNER       | All reports                |
| MANAGER     | Branch ops + approvals     |
| CS          | Booking, POS, customer     |
| STYLIST     | Schedule, treatment, attendance |
| ASSISTANT   | Schedule, treatment, attendance |
| COLORIST    | Schedule, treatment, attendance |
| FINANCE     | Commission payout, reports |

Note: These are UserRole codes — separate from EmployeeRole (STYLIST, ASSISTANT, COLORIST, CUSTOMER_SERVICE, MANAGER in employee_roles table).

---

# Accurate Integration Rules

NEVER call Accurate directly from a controller or service.

Correct flow:
```
Service
↓
Create SyncQueue (status: PENDING)
↓
Background Worker picks up queue
↓
accurate.client.js
↓
Accurate API
```

DO NOT modify:
- `accurate.client.js`
- `accurate.signature.js`

All Accurate requests MUST use `accurateRequest()`.

Never use `fetch()` directly outside the Accurate module.

---

# Transaction Rules

Use `prisma.$transaction()` for operations that touch multiple tables atomically:
- Invoice creation (invoice + items + status history + sync queue)
- Payment recording (payment + invoice update + deposit update)
- Inventory changes (movement + inventory update)
- Commission creation (commission records + status)
- Stock transfer receive (movements + inventory updates for both warehouses)

---

# Inventory Rules

SERVICE items: NO inventory records, NO stock movements.

INVENTORY items: have stock tracked in `inventories` table.

Stock ONLY changes through `StockMovement` records.

Never directly update `Inventory.availableQty` without creating a corresponding StockMovement first.

StockMovement types: IN, OUT, ADJUSTMENT, TRANSFER_IN, TRANSFER_OUT

---

# Invoice Rules

Invoice is created locally first, then synced to Accurate.

Post-payment triggers (on Invoice status → PAID):
1. Generate MaterialUsage + MaterialUsageItems (for SERVICE items with BOM)
2. Generate StockMovements (OUT for INVENTORY items sold)
3. Calculate and create Commission records
4. Create SyncQueue for Accurate invoice sync
5. Create AuditLog

---

# Treatment Rules

Treatment supports:
- Multiple TreatmentItems (services) per session
- Multiple TreatmentAssignments (staff + workQty) per TreatmentItem
- Before/After photos (TreatmentMedia)
- Material usage auto-deduction from BOM (ServiceMaterial)

---

# Commission Rules

Commission calculated ONLY after invoice reaches PAID status.

Commission lookup: employee + commissionCategoryId (from item.commissionCategoryId)
NOT per employee + service item directly.

Always snapshot at commission creation time:
- commissionType
- commissionValue
- commissionBase
- baseAmount
- commissionAmount
- workQty, workRatio

Never recalculate historical commissions from current rules.

---

# Coding Standards

Use async/await. No callbacks.

Use camelCase for JavaScript variables and functions.

Database column snake_case is handled by Prisma `@@map` and field mapping.

---

# Security

Required middleware:
- `helmet`
- `cors`
- `jwt` verification
- `bcrypt` for password hashing

Never expose:
- passwordHash
- accessToken / refreshToken
- any secret key

---

# Logging

The following actions MUST create an AuditLog:
- create / update / soft-delete (isActive = false) on: Customer, Employee, Item, Membership
- Invoice created / status changed
- Payment recorded
- Commission approved / paid / rejected
- Appointment status changed
- Stock adjustment

---

# Prisma Rules

Schema is locked. No manual schema edits.

Allowed commands:
```
prisma generate
prisma migrate dev
```

DO NOT run without permission:
```
prisma migrate reset
```

---

# Soft Delete Rules

Do NOT hard-delete important transactional or master data.

Use `isActive = false` for:
- Customer
- Employee
- Item
- Membership
- CommissionRule
- ItemPrice

Transaction records (Invoice, Payment, Commission, StockMovement) are never deleted.

---

# Date Rule

All DateTime values stored as UTC.

Frontend is responsible for timezone conversion and display.

---

# Money Rule

Never use JavaScript `Number` for monetary calculations.

Use `Decimal` (via Prisma's Decimal type or `decimal.js` library).

All price/amount fields in schema are `Decimal(18,2)`.

---

# Accurate API Rules

DO NOT modify:
- `accurate.client.js`
- `accurate.signature.js`

All Accurate requests MUST go through `accurateRequest()`.

Never use `fetch()` directly outside the Accurate module.

Accurate sync flow:
```
Database (local)
↓
SyncQueue
↓
Background Worker
↓
accurate.client.js
↓
Accurate API
```
