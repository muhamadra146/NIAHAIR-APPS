-- Migration: add follow-up, chat, repair fields to complaints
-- Generated: 2026-08-15

ALTER TABLE "complaints"
  ADD COLUMN IF NOT EXISTS "followUpDate"    TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "chatNotes"       TEXT,
  ADD COLUMN IF NOT EXISTS "repairDate"      TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "repairNotes"     TEXT,
  ADD COLUMN IF NOT EXISTS "repairStaff"     TEXT,
  ADD COLUMN IF NOT EXISTS "repairAssistant" TEXT;
