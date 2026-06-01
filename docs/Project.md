# PROJECT.md

# Salon ERP & CRM System

## Project Overview

Salon ERP adalah sistem manajemen salon terintegrasi yang mendukung operasional multi cabang, POS, CRM pelanggan, booking treatment, inventory, attendance karyawan, komisi stylist, dan integrasi Accurate Online.

Sistem dibangun untuk menggantikan penggunaan Airtable dan menjadi pusat operasional bisnis salon.

## Goals

* Mengelola customer salon secara terpusat
* Mengelola booking treatment
* Mengelola transaksi POS
* Mengelola stok produk dan bahan treatment
* Mengelola multi cabang
* Mengelola jadwal stylist
* Mengelola kehadiran karyawan
* Mengelola membership pelanggan
* Mengelola komisi stylist
* Integrasi otomatis dengan Accurate Online
* Menyediakan dashboard owner dan manager

## Technology Stack

Frontend:

* React
* Vite
* Tailwind CSS
* TanStack Table
* TanStack Query

Backend:

* Node.js
* Express.js

Database:

* PostgreSQL

ORM:

* Prisma

Authentication:

* JWT

Storage:

* Object Storage untuk foto before/after

## User Roles

SUPER_ADMIN
OWNER
MANAGER
CASHIER
FINANCE
STAFF

## employe Roles

STYLIST
ASSISTANT
COLORIST
CUSTOMER_SERVICE
MANAGER

## Main Modules

### Master Data

* Branch
* Customer
* Product
* Service
* Employee

### Booking

* Appointment
* Appointment Service
* Stylist Assignment
* Booking Deposit

### POS

* Invoice
* Payment
* Discount
* Voucher

### CRM

* Membership
* Treatment History
* Customer Notes
* Before & After Gallery

### Inventory

* Stock Per Branch
* Stock Movement
* Stock Transfer

### HR

* Employee
* Attendance
* Work Schedule
* Leave
* Day Off

### Commission

* Commission Rules
* Commission Transactions

### Accurate Integration

* Customer Sync
* Product Sync
* Invoice Sync
* Payment Settlement

### Dashboard

* Revenue
* Sales
* Customer
* Inventory
* Branch Performance

## Accurate Integration Strategy

Accurate menjadi source of truth untuk:

* Customer
* Product
* Inventory Accounting
* Financial Accounting

Website menjadi source of truth untuk:

* Booking
* CRM
* Membership
* Attendance
* Stylist Schedule
* Commission
* POS Operations

Invoice yang dibuat di website akan otomatis disinkronkan ke Accurate.
