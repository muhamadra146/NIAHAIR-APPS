# PROJECT.md
> Aligned to prisma/schema.prisma
> Last updated: June 2026

---

# Salon ERP & CRM System

## Project Overview

NIA Hair ERP is an integrated salon management system supporting multi-branch operations, POS, customer CRM, treatment booking, inventory, employee attendance, stylist commissions, and Accurate Online accounting integration.

The system is built to replace Airtable and become the central operational hub for the salon business.

## Goals

- Manage salon customers centrally
- Manage treatment bookings
- Manage POS transactions
- Manage product stock and treatment materials
- Manage multi-branch operations
- Manage stylist schedules
- Manage employee attendance
- Manage customer memberships
- Manage stylist commissions
- Auto-integrate with Accurate Online
- Provide owner and manager dashboards

## Technology Stack

### Frontend
- React
- Vite
- Tailwind CSS
- TanStack Table
- TanStack Query

### Backend
- Node.js
- Express.js
- PostgreSQL
- Prisma ORM
- JWT Authentication

### Storage
- Object Storage (S3-compatible) for before/after photos

---

## User Roles (System Access — UserRole table)

| Code        | Description                      |
|-------------|----------------------------------|
| SUPER_ADMIN | Full system access               |
| OWNER       | All reports, read-only ops       |
| MANAGER     | Branch ops, approve commissions  |
| CS          | Customer service, booking, POS   |
| STYLIST     | Schedule, attendance, treatment  |
| ASSISTANT   | Schedule, attendance, treatment  |
| COLORIST    | Schedule, attendance, treatment  |
| FINANCE     | Commission payout, financial reports |

User roles are stored in the `user_roles` table (UserRole model).

---

## Employee Roles (Operational Assignment — EmployeeRole table)

| Code             | Description                    |
|------------------|--------------------------------|
| STYLIST          | Lead hair stylist              |
| ASSISTANT        | Treatment assistant            |
| COLORIST         | Hair coloring specialist       |
| CUSTOMER_SERVICE | Front desk / booking           |
| MANAGER          | Branch manager                 |

Employee roles are stored in the `employee_roles` table (EmployeeRole model).

Note: User roles and Employee roles are separate concepts.
A STYLIST employee may have a STYLIST user role to log into the system.
A CS employee has the CS user role.

---

## Main Modules

### Master Data
- Branch (multi-branch support)
- Customer (with Accurate sync)
- Item (INVENTORY + SERVICE, synced from Accurate)
- Unit & Unit Conversion
- Item Pricing (per branch, per unit)
- Employee & Employee Roles
- Payment Methods
- Commission Categories

### Booking
- Appointment
- Appointment Services (multi-service per booking)
- Appointment Staff Assignment (multi-staff, isPrimary flag)
- Booking Deposit (DP)
- Appointment Status History

### Treatment
- Treatment Session
- Treatment Items (services performed)
- Treatment Assignments (staff + workQty per service)
- Before/After Media Upload
- Material Usage (BOM auto-deduction)

### POS
- Invoice
- Invoice Items (INVENTORY + SERVICE)
- Discount
- Deposit Application
- Payment (multi-payment per invoice)
- Invoice Status History

### CRM
- Customer Membership (ACTIVE / EXPIRED / CANCELLED)
- Membership History
- Customer Notes
- Treatment History (via TreatmentSession)
- Before & After Gallery (via TreatmentMedia)

### Inventory
- Warehouse (one per branch)
- Inventory per Warehouse
- Stock Movements (IN, OUT, ADJUSTMENT, TRANSFER_IN, TRANSFER_OUT)
- Stock Transfers (PENDING → IN_TRANSIT → RECEIVED → CANCELLED)
- Service Materials / BOM (per service item)
- Material Usage (auto-deducted on invoice paid)

### HR
- Employee Management
- Employee Branch Access (EmployeeBranch)
- Employee Branch History
- Attendance (GPS check-in/check-out)
- Work Schedule (WORK / OFF / LEAVE)
- Leave Requests (PENDING → APPROVED / REJECTED)

### Commission
- Commission Categories
- Commission Rules (per employee + category, date-ranged)
- Commission Transactions (with full snapshot)
- Branch Commission Rules (per employee + branch)
- Commission Approval & Payout

### Accurate Integration
- Customer Sync (bidirectional)
- Item/Unit/Category Sync (Accurate → Website)
- Invoice Sync (Website → Accurate)
- Payment/Receipt Sync (Website → Accurate)
- Deposit Sync
- SyncQueue + SyncLog infrastructure
- AccurateCredential management
- AccurateMapping (local ID ↔ Accurate ID)

### System
- Settings (key/value store)
- Audit Logs
- Background Jobs
- Webhook Logs
- Sync Queue & Sync Logs

### Dashboard
- Revenue (daily, monthly, per branch)
- Sales by service / product
- Customer metrics
- Inventory / low stock alerts
- Branch performance
- Commission reports

---

## Accurate Integration Strategy

**Accurate is source of truth for:**
- Customers (bidirectional sync)
- Products / Items / Units / Categories
- Inventory Accounting
- Financial Accounting / GL

**Website is source of truth for:**
- Bookings & Appointments
- Treatment Sessions
- CRM (notes, gallery, treatment history)
- Membership
- Attendance & Schedules
- Commission Calculations
- POS Operations (invoices created here first)

Invoices created on website → automatically synced to Accurate.
Payments created on website → synced to Accurate as receipts.

All sync operations go through SyncQueue → Background Worker → Accurate API.
Direct Accurate API calls from controllers are prohibited.
