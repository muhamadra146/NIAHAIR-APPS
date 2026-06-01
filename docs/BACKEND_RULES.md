# BACKEND RULES

Project:
NIA Hair ERP System

Stack:

- Node.js
- Express.js
- PostgreSQL
- Prisma ORM
- JWT Authentication


# IMPORTANT RULE

DO NOT MODIFY:

- prisma/schema.prisma
- database structure
- table name
- field name
- relation
- enum

Database design is LOCKED.


# Architecture Pattern

Every module MUST follow:

modules/{module}

Example:

customer/

customer.route.js
customer.controller.js
customer.service.js
customer.repository.js
customer.validation.js


Flow:

Request
↓
Route
↓
Validation
↓
Controller
↓
Service
↓
Repository
↓
Prisma
↓
PostgreSQL


# Controller Rules

Controller only:

- receive request
- call service
- return response

Controller MUST NOT:

- access Prisma directly
- contain business logic


BAD:

const customers =
await prisma.customer.findMany()


GOOD:

const customers =
await customerService.findAll()


# Service Rules

Service contains:

- business logic
- validation logic
- transaction handling


Example:

Create Invoice:

Service:
- check customer
- calculate discount
- check membership
- create invoice
- create sync queue


# Repository Rules

Only repository can access Prisma.


Example:

customer.repository.js

findById()
create()
update()


# Response Format

All API responses:

Success:

{
    "success": true,
    "message": "",
    "data": {}
}


Error:

{
    "success": false,
    "message": "",
    "error": {}
}


# Error Handling

Do not use:

try catch everywhere


Use:

Global Error Handler


# Authentication

Use:

JWT Access Token

Role based permission


User roles:

SUPER_ADMIN
OWNER
MANAGER
CS
STYLIST
ASSISTANT
COLORIST
FINANCE


# Accurate Integration Rules


NEVER call Accurate directly from controller.


Correct flow:


Website
↓
Service
↓
Sync Queue
↓
Background Worker
↓
Accurate API


Example:

Create Customer:

1. Save local customer

2. Create SyncQueue:

entityType:
CUSTOMER

direction:
APP_TO_ACCURATE

status:
PENDING


3. Worker sync to Accurate



# Transaction Rules

Use Prisma transaction for:

- invoice
- payment
- inventory
- commission


Example:

await prisma.$transaction()


# Inventory Rules


SERVICE item:

NO inventory


INVENTORY item:

has stock


Stock changes ONLY through:

StockMovement


Never directly update inventory without movement.


# Invoice Rules


Invoice created locally first.


Flow:

Create Invoice
↓
Payment
↓
Invoice Paid
↓
Generate:

- Material Usage
- Stock Movement
- Commission
- Accurate Sync


# Treatment Rules


Treatment supports:

- Multiple services
- Multiple staff
- Before photo
- After photo
- Material usage


# Commission Rules


Commission calculated after invoice PAID.


Never calculate from current rule.


Always snapshot:

- percentage
- amount
- employee


# Coding Standard


Use:

async await

No callback


Use:

camelCase Javascript


Database:

snake_case handled by Prisma @@map


# Security

Required:

helmet
cors
jwt
bcrypt


Never expose:

password
token
secret


# Logging

Important actions:

create
update
delete
payment
commission

must create AuditLog

# Prisma Rules

Prisma schema is generated and migrated.

DO NOT run:

prisma migrate reset

without permission.


Allowed:

prisma generate
prisma migrate dev


# Soft Delete Rules

Do not delete important transaction data.

Use:

is_active = false

For:

customer
employee
item


# Date Rule

All DateTime stored UTC.

Frontend handles timezone.


# Money Rule

Never use Javascript Number for money calculation.

Use Decimal.

# Accurate API Rules

DO NOT modify:

- accurate.client.js
- accurate.signature.js

All Accurate requests MUST use:

accurateRequest()

Never use fetch() directly outside Accurate module.

Accurate sync must use:

Database
↓
Sync Queue
↓
Worker
↓
accurate.client.js
↓
Accurate API