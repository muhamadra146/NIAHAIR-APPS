-- Kasbon (LOAN) dan Penggajian (PAYROLL) sudah di-enqueue ke Accurate oleh
-- loan.service & payroll.service, tetapi nilai enum belum ada → insert sync_queue gagal (500).
ALTER TYPE "SyncEntityType" ADD VALUE IF NOT EXISTS 'LOAN';
ALTER TYPE "SyncEntityType" ADD VALUE IF NOT EXISTS 'PAYROLL';
