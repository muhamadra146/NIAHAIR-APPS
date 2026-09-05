-- ============================================================
-- RBAC Data Migration — NIAHAIR ERP
-- Role System Overhaul: tambah role baru, rename STAFF → STAFF_OPERASIONAL
-- ============================================================
-- PENTING: Jalankan di staging dulu sebelum production.
-- Setelah migration, semua user STAFF/THERAPIST harus re-login.
-- ============================================================

-- Step 1: Insert role baru
INSERT INTO user_roles (id, code, name, created_at, updated_at)
SELECT
  gen_random_uuid(), 'STAFF_OPERASIONAL', 'Staff Operasional', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM user_roles WHERE code = 'STAFF_OPERASIONAL');

INSERT INTO user_roles (id, code, name, created_at, updated_at)
SELECT
  gen_random_uuid(), 'INVENTORY', 'Inventory / Gudang', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM user_roles WHERE code = 'INVENTORY');

INSERT INTO user_roles (id, code, name, created_at, updated_at)
SELECT
  gen_random_uuid(), 'OFFICE', 'Office', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM user_roles WHERE code = 'OFFICE');

INSERT INTO user_roles (id, code, name, created_at, updated_at)
SELECT
  gen_random_uuid(), 'FINANCE', 'Finance', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM user_roles WHERE code = 'FINANCE');

-- Step 2: Migrate STAFF users → STAFF_OPERASIONAL
UPDATE users
SET user_role_id = (SELECT id FROM user_roles WHERE code = 'STAFF_OPERASIONAL')
WHERE user_role_id = (SELECT id FROM user_roles WHERE code = 'STAFF');

-- Step 3: Migrate THERAPIST users → STAFF_OPERASIONAL
UPDATE users
SET user_role_id = (SELECT id FROM user_roles WHERE code = 'STAFF_OPERASIONAL')
WHERE user_role_id = (SELECT id FROM user_roles WHERE code = 'THERAPIST');

-- Step 4: Migrate ADMIN users → OFFICE (atau tentukan manual per user jika diperlukan)
-- Uncomment baris berikut jika ADMIN users harus pindah ke OFFICE:
-- UPDATE users
-- SET user_role_id = (SELECT id FROM user_roles WHERE code = 'OFFICE')
-- WHERE user_role_id = (SELECT id FROM user_roles WHERE code = 'ADMIN');

-- Step 5: Hapus role lama (SETELAH verifikasi tidak ada user yang masih pakai role ini)
-- Uncomment setelah verifikasi:
-- DELETE FROM user_roles WHERE code IN ('ADMIN', 'STAFF', 'THERAPIST');

-- ============================================================
-- Verifikasi setelah migration:
-- SELECT code, name, COUNT(u.id) as user_count
-- FROM user_roles ur
-- LEFT JOIN users u ON u.user_role_id = ur.id
-- GROUP BY ur.id, code, name
-- ORDER BY user_count DESC;
-- ============================================================
