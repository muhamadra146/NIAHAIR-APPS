'use strict';

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Mulai migrasi role...\n');

  // ── 1. Insert role baru (idempotent: skip jika sudah ada) ─────────────────
  const newRoles = [
    { code: 'STAFF_OPERASIONAL', name: 'Staff Operasional' },
    { code: 'INVENTORY',         name: 'Inventory / Gudang' },
    { code: 'OFFICE',            name: 'Office'            },
    { code: 'FINANCE',           name: 'Finance'           },
  ];

  for (const role of newRoles) {
    const existing = await prisma.userRole.findFirst({ where: { code: role.code } });
    if (existing) {
      console.log(`⏭️  ${role.code} sudah ada — skip`);
    } else {
      await prisma.userRole.create({ data: { code: role.code, name: role.name } });
      console.log(`✅ Berhasil insert role: ${role.code}`);
    }
  }

  // ── 2. Cek apakah ada user dengan role lama ───────────────────────────────
  const staffRole    = await prisma.userRole.findFirst({ where: { code: 'STAFF'    } });
  const therapistRole = await prisma.userRole.findFirst({ where: { code: 'THERAPIST'} });
  const staffOpRole  = await prisma.userRole.findFirst({ where: { code: 'STAFF_OPERASIONAL' } });

  if (staffOpRole) {
    if (staffRole) {
      const count = await prisma.user.count({ where: { userRoleId: staffRole.id } });
      if (count > 0) {
        await prisma.user.updateMany({
          where:  { userRoleId: staffRole.id },
          data:   { userRoleId: staffOpRole.id },
        });
        console.log(`\n✅ Migrasi ${count} user STAFF → STAFF_OPERASIONAL`);
      } else {
        console.log('\n⏭️  Tidak ada user STAFF yang perlu dimigrasi');
      }
    }

    if (therapistRole) {
      const count = await prisma.user.count({ where: { userRoleId: therapistRole.id } });
      if (count > 0) {
        await prisma.user.updateMany({
          where:  { userRoleId: therapistRole.id },
          data:   { userRoleId: staffOpRole.id },
        });
        console.log(`✅ Migrasi ${count} user THERAPIST → STAFF_OPERASIONAL`);
      } else {
        console.log('⏭️  Tidak ada user THERAPIST yang perlu dimigrasi');
      }
    }
  }

  // ── 3. Tampilkan semua role setelah migrasi ───────────────────────────────
  console.log('\n📋 Daftar role sekarang:');
  const allRoles = await prisma.userRole.findMany({ orderBy: { code: 'asc' } });
  for (const r of allRoles) {
    const userCount = await prisma.user.count({ where: { userRoleId: r.id } });
    console.log(`   ${r.code.padEnd(20)} "${r.name}" — ${userCount} user`);
  }

  console.log('\n✅ Migrasi selesai!');
  console.log('⚠️  User dengan role lama (STAFF/THERAPIST) harus re-login.\n');
}

main()
  .catch((e) => { console.error('❌ Error:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
