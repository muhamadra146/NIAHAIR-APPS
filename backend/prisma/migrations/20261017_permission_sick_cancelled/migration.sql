-- Status "Dibatalkan" untuk izin & sakit (G3-19) — izin user 2026-10-17
ALTER TYPE "PermissionStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';
ALTER TYPE "SickLeaveStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';
