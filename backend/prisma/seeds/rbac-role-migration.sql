-- ============================================================
-- RBAC Role Migration — NIAHAIR ERP
-- Tanggal: 2026-09-24
-- Jalankan di psql / database client langsung
-- ============================================================

-- ── Step 1: Lihat role yang sudah ada ────────────────────────
-- SELECT id, code, name, "isActive" FROM user_roles ORDER BY "createdAt";

-- ── Step 2: Insert 4 role baru jika belum ada ─────────────────
INSERT INTO user_roles (id, code, name, "isActive", "createdAt", "updatedAt")
SELECT
  gen_random_uuid(), 'STAFF_OPERASIONAL', 'Staff Operasional', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM user_roles WHERE code = 'STAFF_OPERASIONAL');

INSERT INTO user_roles (id, code, name, "isActive", "createdAt", "updatedAt")
SELECT
  gen_random_uuid(), 'INVENTORY', 'Inventory / Gudang', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM user_roles WHERE code = 'INVENTORY');

INSERT INTO user_roles (id, code, name, "isActive", "createdAt", "updatedAt")
SELECT
  gen_random_uuid(), 'OFFICE', 'Office', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM user_roles WHERE code = 'OFFICE');

INSERT INTO user_roles (id, code, name, "isActive", "createdAt", "updatedAt")
SELECT
  gen_random_uuid(), 'FINANCE', 'Finance', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM user_roles WHERE code = 'FINANCE');

-- ── Step 3: Migrate user STAFF → STAFF_OPERASIONAL ──────────
-- PENTING: Setelah ini, semua user dengan roleCode=STAFF di JWT-nya harus re-login.
UPDATE users
SET "userRoleId" = (SELECT id FROM user_roles WHERE code = 'STAFF_OPERASIONAL'),
    "updatedAt"  = NOW()
WHERE "userRoleId" IN (SELECT id FROM user_roles WHERE code = 'STAFF');

-- ── Step 4: Migrate user THERAPIST → STAFF_OPERASIONAL ──────
UPDATE users
SET "userRoleId" = (SELECT id FROM user_roles WHERE code = 'STAFF_OPERASIONAL'),
    "updatedAt"  = NOW()
WHERE "userRoleId" IN (SELECT id FROM user_roles WHERE code = 'THERAPIST');

-- ── Step 5: Nonaktifkan role lama (jangan hapus dulu — verify dulu) ──
UPDATE user_roles
SET "isActive" = false, "updatedAt" = NOW()
WHERE code IN ('STAFF', 'THERAPIST', 'ADMIN');

-- ── Step 6: Verifikasi ──────────────────────────────────────
-- SELECT ur.code, ur."isActive", COUNT(u.id) AS user_count
-- FROM user_roles ur
-- LEFT JOIN users u ON u."userRoleId" = ur.id
-- GROUP BY ur.id, ur.code, ur."isActive"
-- ORDER BY ur."isActive" DESC, ur.code;

-- ── Step 7 (opsional, setelah verifikasi): Hapus role lama ──
-- DELETE FROM user_roles WHERE code IN ('STAFF', 'THERAPIST', 'ADMIN') AND "isActive" = false;

-- ============================================================
-- CATATAN PENTING:
-- 1. Semua user dengan token JWT lama (roleCode=STAFF/THERAPIST) harus logout & login ulang
-- 2. employee_roles adalah tabel terpisah — tidak perlu diubah (hanya untuk role employee, bukan user login)
-- 3. Jalankan Step 7 (DELETE) hanya setelah konfirmasi semua user sudah re-login
-- ============================================================
