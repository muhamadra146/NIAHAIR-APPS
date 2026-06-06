-- Phase 10G.2B: User Identity Cleanup
-- User becomes authentication-only; Employee is the human identity.
-- Every User must have an Employee. Users without one get one auto-created.
-- User.name is removed — use employee.name for display.

-- ── Step 1: Ensure OWNER EmployeeRole exists ─────────────────────────
INSERT INTO "employee_roles" (id, code, name, "isActive", "createdAt", "updatedAt")
VALUES (gen_random_uuid()::text, 'OWNER', 'Owner', true, NOW(), NOW())
ON CONFLICT (code) DO NOTHING;

-- ── Step 2: Seed Employee for every User that has no employeeId ───────
-- Uses User.name (available here, dropped in Step 4) as the Employee.name.
DO $$
DECLARE
  owner_role_id TEXT;
  u             RECORD;
  new_emp_id    TEXT;
  emp_code      TEXT;
BEGIN
  SELECT id INTO owner_role_id FROM "employee_roles" WHERE code = 'OWNER';

  FOR u IN
    SELECT id, email, name FROM "users" WHERE "employeeId" IS NULL
  LOOP
    new_emp_id := gen_random_uuid()::text;
    emp_code   := 'EMP-' || upper(substring(u.email FROM 1 FOR 6)) || '-' || substring(u.id FROM 1 FOR 6);

    INSERT INTO "employees" (
      id, "roleId", "employeeCode", name,
      "commissionEnabled", "isActive", "createdAt", "updatedAt"
    ) VALUES (
      new_emp_id,
      owner_role_id,
      emp_code,
      COALESCE(NULLIF(trim(u.name), ''), 'Admin'),
      false,
      true,
      NOW(),
      NOW()
    );

    UPDATE "users" SET "employeeId" = new_emp_id WHERE id = u.id;

    RAISE NOTICE 'Created Employee % for user %', emp_code, u.email;
  END LOOP;
END $$;

-- ── Step 3: Drop FK (will be re-added as NOT NULL) ────────────────────
ALTER TABLE "users" DROP CONSTRAINT "users_employeeId_fkey";

-- ── Step 4: Drop User.name, enforce employeeId NOT NULL ───────────────
ALTER TABLE "users"
  DROP COLUMN "name",
  ALTER COLUMN "employeeId" SET NOT NULL;

-- ── Step 5: Restore FK with RESTRICT (employeeId is now a hard link) ──
ALTER TABLE "users"
  ADD CONSTRAINT "users_employeeId_fkey"
  FOREIGN KEY ("employeeId") REFERENCES "employees"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
