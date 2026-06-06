/**
 * seed-employee-branches.js
 *
 * Employee.branchId no longer exists — EmployeeBranch is seeded
 * automatically by migration 20260605_warehouse_tracking_employee_branch_cleanup.
 *
 * This script now serves as a diagnostic tool: it lists all employees
 * and their current EmployeeBranch assignments so you can verify the
 * migration seeded correctly.
 *
 * Usage:
 *   node backend/scripts/seed-employee-branches.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const prisma = require("../src/config/prisma");

async function main() {
  const employees = await prisma.employee.findMany({
    select: {
      id:           true,
      name:         true,
      employeeCode: true,
      employeeBranches: {
        select: {
          branchId:  true,
          isPrimary: true,
          isActive:  true,
          branch:    { select: { code: true, name: true } },
        },
      },
    },
    orderBy: { employeeCode: "asc" },
  });

  console.log(`\nEmployee branch assignments (${employees.length} employees):\n`);

  let missing = 0;
  for (const emp of employees) {
    const branches = emp.employeeBranches;
    if (branches.length === 0) {
      console.log(`  [${emp.employeeCode}] ${emp.name} — NO BRANCHES ASSIGNED`);
      missing++;
    } else {
      for (const eb of branches) {
        const tag = eb.isPrimary ? "(primary)" : "";
        const status = eb.isActive ? "active" : "inactive";
        console.log(`  [${emp.employeeCode}] ${emp.name} → ${eb.branch.code} ${tag} [${status}]`);
      }
    }
  }

  if (missing > 0) {
    console.log(`\n⚠  ${missing} employee(s) have no branch assignment.`);
    console.log(`   Assign them via POST /employee-branches or manually insert into employee_branches.`);
  } else {
    console.log(`\n✓ All employees have at least one branch assignment.`);
  }
}

main()
  .catch((err) => {
    console.error("Script failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
